import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';

import { ensureAnonymousAuth, getFirebase } from './firebase';
import {
  chooseFreeSeat,
  dedupeNickname,
  generateRoomCode,
  isValidNickname,
  isValidRoomCode,
  normalizeNickname,
  normalizeRoomCode,
} from './roomCode';
import { shouldCleanupOldRoom } from './roomCleanup';
import {
  ROOM_MAX_PLAYERS,
  type RoomErrorCode,
  type RoomMeta,
  type RoomPlayers,
  type RoomSnapshot,
} from './roomTypes';
import {
  clearLastRoomCode,
  getLastRoomCode,
} from './storage';

export class RoomServiceError extends Error {
  readonly code: RoomErrorCode;

  constructor(code: RoomErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RoomServiceError';
    this.code = code;
  }
}

function firebaseErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const value = (error as { code?: unknown }).code;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

export function asRoomError(
  error: unknown,
  fallback: RoomErrorCode = 'NETWORK_ERROR',
): RoomServiceError {
  if (error instanceof RoomServiceError) return error;

  const code = firebaseErrorCode(error);
  if (code.includes('PERMISSION_DENIED') || code.includes('permission-denied')) {
    return new RoomServiceError('PERMISSION_DENIED', code);
  }
  if (code.includes('operation-not-allowed') || code.includes('admin-restricted-operation')) {
    return new RoomServiceError('AUTH_FAILED', code);
  }
  if (code.includes('network')) {
    return new RoomServiceError('NETWORK_ERROR', code);
  }
  return new RoomServiceError(fallback, code || String(error));
}

function db(): Database {
  return getFirebase().db;
}

function metaRef(code: string) {
  return ref(db(), `rooms/${code}/meta`);
}

function playersRef(code: string) {
  return ref(db(), `rooms/${code}/players`);
}

function playerRef(code: string, uid: string) {
  return ref(db(), `rooms/${code}/players/${uid}`);
}

async function readRoom(code: string): Promise<RoomSnapshot | null> {
  const [metaSnapshot, playersSnapshot] = await Promise.all([
    get(metaRef(code)),
    get(playersRef(code)),
  ]);
  if (!metaSnapshot.exists()) return null;

  return {
    meta: metaSnapshot.val() as RoomMeta,
    players: (playersSnapshot.val() as RoomPlayers | null) ?? {},
  };
}

/**
 * Reads meta + players without subscribing. Used by the Home page for the
 * rejoin banner and the duplicate-name preview.
 */
export async function peekRoom(codeInput: string): Promise<RoomSnapshot | null> {
  const code = normalizeRoomCode(codeInput);
  if (!isValidRoomCode(code)) throw new RoomServiceError('INVALID_CODE');

  try {
    await ensureAnonymousAuth();
    return await readRoom(code);
  } catch (error) {
    throw asRoomError(error);
  }
}

async function registerPresence(
  code: string,
  uid: string,
  isHost: boolean,
  connected: boolean,
): Promise<void> {
  const database = db();
  const operations: Promise<void>[] = [
    onDisconnect(ref(database, `rooms/${code}/players/${uid}/connected`)).set(false),
    onDisconnect(ref(database, `rooms/${code}/players/${uid}/lastSeen`)).set(serverTimestamp()),
  ];
  if (isHost) {
    operations.push(
      onDisconnect(ref(database, `rooms/${code}/meta/hostConnected`)).set(false),
    );
  }
  await Promise.all(operations);

  await update(playerRef(code, uid), {
    connected,
    lastSeen: serverTimestamp(),
  });
  if (isHost) {
    await set(ref(database, `rooms/${code}/meta/hostConnected`), true);
  }
}

/** Marks the player online and registers onDisconnect handlers. */
export async function ensurePresence(code: string, uid: string): Promise<void> {
  try {
    const snapshot = await get(metaRef(code));
    const meta = snapshot.exists() ? (snapshot.val() as RoomMeta) : null;
    if (!meta) throw new RoomServiceError('ROOM_NOT_FOUND');
    await registerPresence(code, uid, meta.hostUid === uid, true);
  } catch (error) {
    throw asRoomError(error);
  }
}

/** Performs best-effort presence cleanup when the lobby screen unmounts. */
export async function markRoomOffline(code: string, uid: string): Promise<void> {
  const database = db();
  try {
    const snapshot = await get(metaRef(code));
    const meta = snapshot.exists() ? (snapshot.val() as RoomMeta) : null;
    if (!meta) return;

    const isHost = meta.hostUid === uid;
    await Promise.all([
      onDisconnect(ref(database, `rooms/${code}/players/${uid}/connected`)).cancel(),
      onDisconnect(ref(database, `rooms/${code}/players/${uid}/lastSeen`)).cancel(),
      ...(isHost
        ? [onDisconnect(ref(database, `rooms/${code}/meta/hostConnected`)).cancel()]
        : []),
    ]);
    await update(playerRef(code, uid), {
      connected: false,
      lastSeen: serverTimestamp(),
    });
    if (isHost) {
      await set(ref(database, `rooms/${code}/meta/hostConnected`), false);
    }
  } catch {
    // Presence is best-effort; a later rejoin updates it again.
  }
}

/**
 * Best-effort Spark-plan housekeeping: when a player starts a new room, remove
 * their previous room if it is over a day old and nobody is connected.
 */
async function cleanupPreviousRoom(
  database: Database,
  uid: string,
): Promise<void> {
  const code = getLastRoomCode();
  if (!code || !isValidRoomCode(code)) {
    if (code) clearLastRoomCode();
    return;
  }

  try {
    const [metaSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${code}/meta`)),
      get(ref(database, `rooms/${code}/players`)),
    ]);
    if (!metaSnapshot.exists()) {
      clearLastRoomCode();
      return;
    }

    const meta = metaSnapshot.val() as RoomMeta;
    const players = (playersSnapshot.val() as RoomPlayers | null) ?? {};
    const belongsToMe = meta.hostUid === uid || Boolean(players[uid]);
    if (!belongsToMe) {
      clearLastRoomCode();
      return;
    }
    if (!shouldCleanupOldRoom(meta, players)) return;

    await remove(ref(database, `rooms/${code}`));
    clearLastRoomCode();
  } catch {
    // Cleanup must never block creating a fresh room.
  }
}

/**
 * Creates a room and claims a random five-digit code with a transaction.
 * Retries on collisions, then writes the host's player record.
 */
export async function createRoom(rawNickname: string): Promise<{ code: string; name: string }> {
  const nickname = normalizeNickname(rawNickname);
  if (!isValidNickname(nickname)) throw new RoomServiceError('INVALID_NICKNAME');

  let uid: string;
  try {
    uid = (await ensureAnonymousAuth()).uid;
  } catch (error) {
    throw asRoomError(error, 'AUTH_FAILED');
  }

  const database = db();
  await cleanupPreviousRoom(database, uid);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateRoomCode();
    let committed: boolean;

    try {
      const result = await runTransaction(
        ref(database, `rooms/${code}/meta`),
        (current) => {
          if (current !== null) return undefined;
          return {
            hostUid: uid,
            hostConnected: true,
            status: 'lobby',
            schemaVersion: 1,
          };
        },
        { applyLocally: false },
      );
      committed = result.committed;
    } catch (error) {
      throw asRoomError(error);
    }

    if (!committed) continue;

    try {
      await update(ref(database), {
        [`rooms/${code}/meta/createdAt`]: serverTimestamp(),
        [`rooms/${code}/meta/hostConnected`]: true,
        [`rooms/${code}/players/${uid}`]: {
          name: nickname,
          seat: 0,
          connected: true,
          lastSeen: serverTimestamp(),
          joinedAt: serverTimestamp(),
        },
      });
      await ensurePresence(code, uid);
      return { code, name: nickname };
    } catch (error) {
      await remove(ref(database, `rooms/${code}`)).catch(() => undefined);
      throw asRoomError(error);
    }
  }

  throw new RoomServiceError('CODE_RETRY');
}

/**
 * Joins a lobby, appending a numeric suffix when the nickname is taken. If the
 * same anonymous uid is already a member, rejoining keeps the existing name.
 */
export async function joinRoom(
  codeInput: string,
  rawNickname: string,
): Promise<{ name: string; alreadyMember: boolean }> {
  const code = normalizeRoomCode(codeInput);
  if (!isValidRoomCode(code)) throw new RoomServiceError('INVALID_CODE');

  const nickname = normalizeNickname(rawNickname);
  if (!isValidNickname(nickname)) throw new RoomServiceError('INVALID_NICKNAME');

  let uid: string;
  try {
    uid = (await ensureAnonymousAuth()).uid;
  } catch (error) {
    throw asRoomError(error, 'AUTH_FAILED');
  }

  const snapshot = await readRoom(code).catch((error: unknown) => {
    throw asRoomError(error);
  });
  if (!snapshot) throw new RoomServiceError('ROOM_NOT_FOUND');
  if (snapshot.meta.status === 'finished') throw new RoomServiceError('ROOM_FINISHED');
  if (snapshot.meta.status !== 'lobby') throw new RoomServiceError('GAME_STARTED');

  const existing = snapshot.players[uid];
  if (existing) {
    await ensurePresence(code, uid);
    return { name: existing.name, alreadyMember: true };
  }

  if (Object.keys(snapshot.players).length >= ROOM_MAX_PLAYERS) {
    throw new RoomServiceError('ROOM_FULL');
  }
  const seat = chooseFreeSeat(snapshot.players);
  if (seat === null) throw new RoomServiceError('ROOM_FULL');

  const name = dedupeNickname(
    nickname,
    Object.values(snapshot.players).map((player) => player.name),
  );

  try {
    await set(playerRef(code, uid), {
      name,
      seat,
      connected: true,
      lastSeen: serverTimestamp(),
      joinedAt: serverTimestamp(),
    });
  } catch (error) {
    const after = await readRoom(code).catch(() => null);
    if (after?.meta.status === 'finished') throw new RoomServiceError('ROOM_FINISHED');
    if (after?.meta.status !== 'lobby') throw new RoomServiceError('GAME_STARTED');
    if (after && Object.keys(after.players).length >= ROOM_MAX_PLAYERS) {
      throw new RoomServiceError('ROOM_FULL');
    }
    throw asRoomError(error);
  }

  await ensurePresence(code, uid);
  return { name, alreadyMember: false };
}

/**
 * Leaves the lobby. The host transfers ownership to the lowest connected seat
 * (or deletes the room when it becomes empty).
 */
export async function leaveRoom(codeInput: string, uid: string): Promise<void> {
  const code = normalizeRoomCode(codeInput);
  if (!isValidRoomCode(code)) throw new RoomServiceError('INVALID_CODE');

  const snapshot = await readRoom(code).catch((error: unknown) => {
    throw asRoomError(error);
  });
  if (!snapshot) return;

  const isHost = snapshot.meta.hostUid === uid;
  const database = db();

  try {
    await Promise.all([
      onDisconnect(ref(database, `rooms/${code}/players/${uid}/connected`)).cancel(),
      onDisconnect(ref(database, `rooms/${code}/players/${uid}/lastSeen`)).cancel(),
      ...(isHost
        ? [onDisconnect(ref(database, `rooms/${code}/meta/hostConnected`)).cancel()]
        : []),
    ]);
  } catch {
    // The connection may already be gone; the player record is still removed.
  }

  if (isHost) {
    const remaining = Object.entries(snapshot.players).filter(([playerUid]) => playerUid !== uid);
    if (remaining.length === 0) {
      try {
        await remove(ref(database, `rooms/${code}`));
      } catch (error) {
        throw asRoomError(error);
      }
      return;
    }

    const nextHost = remaining.sort(
      (a, b) =>
        Number(b[1].connected) - Number(a[1].connected) ||
        a[1].seat - b[1].seat ||
        (a[1].joinedAt ?? 0) - (b[1].joinedAt ?? 0),
    )[0];
    try {
      await update(ref(database, `rooms/${code}/meta`), {
        hostUid: nextHost[0],
        hostConnected: false,
      });
    } catch (error) {
      throw asRoomError(error);
    }
  }

  try {
    await remove(playerRef(code, uid));
  } catch (error) {
    throw asRoomError(error);
  }
}

export interface RoomSubscriptionHandlers {
  onMeta: (meta: RoomMeta | null) => void;
  onPlayers: (players: RoomPlayers) => void;
  onError: (error: RoomServiceError) => void;
}

/** Subscribes to the public lobby paths only (never private or hostState). */
export function subscribeRoom(
  code: string,
  handlers: RoomSubscriptionHandlers,
): () => void {
  const database = db();
  const unsubscribeMeta = onValue(
    ref(database, `rooms/${code}/meta`),
    (snapshot) => handlers.onMeta(snapshot.exists() ? (snapshot.val() as RoomMeta) : null),
    (error) => handlers.onError(asRoomError(error)),
  );
  const unsubscribePlayers = onValue(
    ref(database, `rooms/${code}/players`),
    (snapshot) => handlers.onPlayers((snapshot.val() as RoomPlayers | null) ?? {}),
    (error) => handlers.onError(asRoomError(error)),
  );

  return () => {
    unsubscribeMeta();
    unsubscribePlayers();
  };
}

/** Resolves the "room X still waits for Y" banner state from plan.md 8.2. */
export async function findRejoinRoom(
  uid: string,
): Promise<{ code: string; name: string } | null> {
  const code = getLastRoomCode();
  if (!code) return null;
  if (!isValidRoomCode(code)) {
    clearLastRoomCode();
    return null;
  }

  try {
    const snapshot = await peekRoom(code);
    if (!snapshot || snapshot.meta.status === 'finished' || !snapshot.players[uid]) {
      clearLastRoomCode();
      return null;
    }
    return { code, name: snapshot.players[uid].name };
  } catch {
    return null;
  }
}

export function getRoomUrl(code: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const origin = `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
  return new URL(code, origin).toString();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
