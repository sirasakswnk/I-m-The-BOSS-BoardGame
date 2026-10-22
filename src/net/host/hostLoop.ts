import {
  get,
  onChildAdded,
  ref,
  runTransaction,
  update,
  type Database,
  type DataSnapshot,
} from 'firebase/database';

import { project } from '@/engine/project';
import { applyAction } from '@/engine/reducer';
import { createInitialState, type NewPlayer } from '@/engine/setup';
import { tick } from '@/engine/tick';
import type { FullGameState, GameAction, PublicState, RejectReason } from '@/engine/types';
import type { RoomMeta, RoomPlayers } from '@/net/roomTypes';

import { serverNow, startServerClockSync } from '../clock';
import { getFirebase } from '../firebase';
import { normalizeHostState } from '../gameState';
import type { StoredAction } from '../gameTypes';
import { prepareRematchState } from './rematch';

const TICK_INTERVAL_MS = 500;
const LOOP_STOP_DELAY_MS = 250;

const ACTION_TYPES: ReadonlySet<string> = new Set([
  'JOIN',
  'LEAVE',
  'START_GAME',
  'SET_START_SPACE',
  'ROLL_DICE',
  'OPEN_DEAL',
  'DRAW_CARDS',
  'SUBMIT_OFFER',
  'WITHDRAW_OFFER',
  'ACCEPT_OFFER',
  'UNACCEPT_OFFER',
  'BOSS_ADD_CLAN',
  'SET_EXCLUDED_COLORS',
  'LOCK_DEAL',
  'CANCEL_LOCK',
  'FAIL_DEAL',
  'PLAY_TRAVEL',
  'PLAY_RECRUITMENT',
  'PLAY_STOP',
  'PLAY_IM_THE_BOSS',
  'PASS_WINDOW',
  'DISCARD',
  'SKIP_DISCONNECTED_BOSS',
  'REMATCH',
  'REASSIGN_SEAT',
]);

const HOST_ONLY_ACTIONS: ReadonlySet<GameAction['type']> = new Set([
  'SKIP_DISCONNECTED_BOSS',
  'REMATCH',
  'REASSIGN_SEAT',
]);

interface HostLoopOptions {
  code: string;
  hostUid: string;
  onError?: (error: unknown) => void;
}

interface QueuedAction {
  id: string;
  raw: unknown;
  ts: number;
}

interface ActiveLoop {
  refs: number;
  stop: () => void;
  releaseTimer: number | null;
}

const activeLoops = new Map<string, ActiveLoop>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function actionUid(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  return typeof raw.uid === 'string' && raw.uid.length > 0 ? raw.uid : null;
}

function parseStoredAction(raw: unknown, fallbackNow: number): GameAction | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.uid !== 'string' || raw.uid.length === 0) return null;
  if (typeof raw.type !== 'string' || !ACTION_TYPES.has(raw.type)) return null;

  const payload = isRecord(raw.payload) ? raw.payload : {};
  const ts = typeof raw.ts === 'number' && Number.isFinite(raw.ts) ? raw.ts : fallbackNow;

  return {
    ...payload,
    type: raw.type,
    uid: raw.uid,
    ts,
  } as unknown as GameAction;
}

function randomSeed(): number {
  const buffer = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] >>> 0;
  }
  return Date.now() >>> 0;
}

function sortLobbyPlayers(players: RoomPlayers): NewPlayer[] {
  return Object.entries(players)
    .sort(
      (a, b) =>
        (a[1].joinedAt ?? 0) - (b[1].joinedAt ?? 0) ||
        (a[1].seat ?? 0) - (b[1].seat ?? 0) ||
        a[0].localeCompare(b[0]),
    )
    .map(([uid, player]) => ({ uid, name: player.name }));
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function createHostLoop(options: HostLoopOptions): () => void {
  const database: Database = getFirebase().db;
  const root = ref(database, `rooms/${options.code}`);
  const metaRef = ref(database, `rooms/${options.code}/meta`);
  const hostStateRef = ref(database, `rooms/${options.code}/hostState`);

  const reportError = options.onError ?? (() => undefined);
  const stopClockSync = startServerClockSync();

  let stopped = false;
  let processing = false;
  let ticking = false;
  let cachedState: FullGameState | null = null;
  const queue: QueuedAction[] = [];

  async function readMeta(): Promise<RoomMeta | null> {
    const snapshot = await get(metaRef);
    return snapshot.exists() ? (snapshot.val() as RoomMeta) : null;
  }

  async function rejectAction(
    actionId: string,
    uid: string | null,
    reason: RejectReason,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const safeUid = uid && !uid.includes('/') ? uid : options.hostUid;
    await update(root, {
      [`actions/${actionId}`]: null,
      [`public/rejections/${safeUid}`]: {
        reason,
        actionId,
        at: serverNow(),
      },
      ...extra,
    });
  }

  function projectionUpdates(
    previous: FullGameState | null,
    next: FullGameState,
  ): Record<string, unknown> {
    const previousProjection = previous ? project(previous) : null;
    const nextProjection = project(next);
    const paths: Record<string, unknown> = { hostState: next };

    for (const key of Object.keys(nextProjection.public) as (keyof PublicState)[]) {
      const value = nextProjection.public[key];
      if (!previousProjection || !sameValue(previousProjection.public[key], value)) {
        paths[`public/${String(key)}`] = value;
      }
    }

    for (const [uid, privateState] of Object.entries(nextProjection.private)) {
      if (!previousProjection || !sameValue(previousProjection.private[uid], privateState)) {
        paths[`private/${uid}`] = privateState;
      }
    }

    if (previousProjection) {
      for (const uid of Object.keys(previousProjection.private)) {
        if (!(uid in nextProjection.private)) {
          paths[`private/${uid}`] = null;
        }
      }
    }

    return paths;
  }

  async function writeProjection(
    previous: FullGameState | null,
    next: FullGameState,
    actionId: string | null,
    markPlaying: boolean,
  ): Promise<void> {
    const paths = projectionUpdates(previous, next);
    if (markPlaying) paths['meta/status'] = 'playing';
    if (actionId) paths[`actions/${actionId}`] = null;
    await update(root, paths);
  }

  async function startGameAction(
    actionId: string,
    action: Extract<GameAction, { type: 'START_GAME' }>,
    meta: RoomMeta,
  ): Promise<void> {
    if (action.uid !== meta.hostUid) {
      await rejectAction(actionId, action.uid, 'INVALID_ACTION');
      return;
    }

    // Transition before reading players so lobby membership is frozen while the
    // opening state is built. Without this, a join/leave racing the start could
    // leave a player out of the game or put a ghost player at the table.
    const transition = await runTransaction(
      ref(database, `rooms/${options.code}/meta/status`),
      (current) => (current === 'lobby' ? 'playing' : undefined),
      { applyLocally: false },
    );

    if (!transition.committed) {
      await update(root, { [`actions/${actionId}`]: null });
      return;
    }

    let result;
    try {
      const playersSnapshot = await get(ref(database, `rooms/${options.code}/players`));
      const players = (playersSnapshot.val() as RoomPlayers | null) ?? {};
      const initial = createInitialState(randomSeed(), sortLobbyPlayers(players));
      result = applyAction(initial, action, serverNow());
    } catch {
      await rejectAction(actionId, action.uid, 'INVALID_ACTION', {
        'meta/status': 'lobby',
      });
      return;
    }

    if ('error' in result) {
      await rejectAction(actionId, action.uid, result.error, {
        'meta/status': 'lobby',
      });
      return;
    }

    try {
      await writeProjection(null, result.state, actionId, true);
      cachedState = result.state;
    } catch (error) {
      // Do not leave the room stuck in "playing" without a projection.
      await update(metaRef, { status: 'lobby' }).catch(() => undefined);
      throw error;
    }
  }

  async function gameAction(actionId: string, action: GameAction, meta: RoomMeta): Promise<void> {
    if (action.type === 'START_GAME') {
      await rejectAction(actionId, action.uid, 'WRONG_PHASE');
      return;
    }

    if (HOST_ONLY_ACTIONS.has(action.type) && action.uid !== meta.hostUid) {
      await rejectAction(actionId, action.uid, 'INVALID_ACTION');
      return;
    }

    const snapshot = await get(hostStateRef);
    const current = normalizeHostState(snapshot.val());
    if (!current) {
      await rejectAction(actionId, action.uid, 'WRONG_PHASE');
      return;
    }

    let nextState = current;
    let roomPlayers: RoomPlayers | null = null;
    let removedUids: string[] = [];
    if (action.type === 'REMATCH') {
      const playersSnapshot = await get(ref(database, `rooms/${options.code}/players`));
      roomPlayers = (playersSnapshot.val() as RoomPlayers | null) ?? {};
      const prepared = prepareRematchState(current, roomPlayers, action.uid);
      nextState = prepared.state;
      removedUids = prepared.removedUids;
    }

    let result;
    try {
      result = applyAction(nextState, action, serverNow());
    } catch {
      await rejectAction(actionId, action.uid, 'INVALID_ACTION');
      return;
    }

    if ('error' in result) {
      await rejectAction(actionId, action.uid, result.error);
      return;
    }

    await writeProjection(current, result.state, actionId, false);
    cachedState = result.state;

    if (action.type === 'REMATCH' && roomPlayers) {
      const updates: Record<string, unknown> = {};
      for (const uid of removedUids) {
        updates[`players/${uid}`] = null;
        updates[`private/${uid}`] = null;
      }
      for (const player of result.state.players) {
        const roomPlayer = roomPlayers[player.uid];
        if (roomPlayer && roomPlayer.seat !== player.seat) {
          updates[`players/${player.uid}/seat`] = player.seat;
        }
      }
      if (Object.keys(updates).length > 0) await update(root, updates);
    }
  }

  async function processAction(entry: QueuedAction): Promise<void> {
    const meta = await readMeta();
    if (!meta || meta.hostUid !== options.hostUid) return;

    const action = parseStoredAction(entry.raw, serverNow());
    if (!action) {
      await rejectAction(entry.id, actionUid(entry.raw), 'INVALID_ACTION');
      return;
    }

    if (meta.status === 'lobby') {
      if (action.type !== 'START_GAME') {
        await rejectAction(entry.id, action.uid, 'WRONG_PHASE');
        return;
      }
      await startGameAction(entry.id, action, meta);
      return;
    }

    if (meta.status !== 'playing') {
      await rejectAction(entry.id, action.uid, 'WRONG_PHASE');
      return;
    }

    await gameAction(entry.id, action, meta);
  }

  async function drain(): Promise<void> {
    if (stopped || processing) return;
    processing = true;
    try {
      while (!stopped && queue.length > 0) {
        queue.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
        const entry = queue.shift();
        if (!entry) break;
        try {
          await processAction(entry);
        } catch (error) {
          reportError(error);
          queue.unshift(entry);
          break;
        }
      }
    } finally {
      processing = false;
    }
  }

  async function hydrate(): Promise<void> {
    try {
      const meta = await readMeta();
      if (!meta || meta.hostUid !== options.hostUid || meta.status !== 'playing') {
        return;
      }
      const snapshot = await get(hostStateRef);
      cachedState = normalizeHostState(snapshot.val());
    } catch (error) {
      reportError(error);
    }
  }

  async function runTick(): Promise<void> {
    if (stopped || processing || ticking || !cachedState?.window) return;
    ticking = true;
    try {
      const now = serverNow();
      const result = tick(cachedState, now);
      if (result.state === cachedState) return;

      const previous = cachedState;
      await writeProjection(previous, result.state, null, false);
      cachedState = result.state;
    } catch (error) {
      reportError(error);
    } finally {
      ticking = false;
    }
  }

  const unsubscribe = onChildAdded(
    ref(database, `rooms/${options.code}/actions`),
    (snapshot: DataSnapshot) => {
      const id = snapshot.key;
      if (!id || stopped) return;
      const raw = snapshot.val() as StoredAction | null;
      const ts =
        raw && typeof raw.ts === 'number' && Number.isFinite(raw.ts) ? raw.ts : serverNow();
      queue.push({ id, raw, ts });
      void drain();
    },
    (error) => reportError(error),
  );

  const tickTimer = window.setInterval(() => {
    void runTick();
  }, TICK_INTERVAL_MS);

  void hydrate();

  return () => {
    stopped = true;
    unsubscribe();
    window.clearInterval(tickTimer);
    stopClockSync();
  };
}

/**
 * Starts the single host loop for a room. React StrictMode mounts effects
 * twice; a short stop delay lets the second mount reuse the same loop.
 */
export function startHostLoop(options: HostLoopOptions): () => void {
  const key = `${options.code}:${options.hostUid}`;
  const existing = activeLoops.get(key);
  if (existing) {
    if (existing.releaseTimer !== null) {
      window.clearTimeout(existing.releaseTimer);
      existing.releaseTimer = null;
    }
    existing.refs += 1;
    return () => releaseHostLoop(key, existing);
  }

  const entry: ActiveLoop = {
    refs: 1,
    stop: createHostLoop(options),
    releaseTimer: null,
  };
  activeLoops.set(key, entry);
  return () => releaseHostLoop(key, entry);
}

function releaseHostLoop(key: string, entry: ActiveLoop): void {
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0 || entry.releaseTimer !== null) return;

  entry.releaseTimer = window.setTimeout(() => {
    entry.releaseTimer = null;
    if (entry.refs > 0) return;
    if (activeLoops.get(key) === entry) activeLoops.delete(key);
    entry.stop();
  }, LOOP_STOP_DELAY_MS) as number;
}
