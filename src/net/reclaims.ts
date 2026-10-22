import {
  get,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database';

import {
  isValidNickname,
  isValidRoomCode,
  normalizeNickname,
  normalizeRoomCode,
} from './roomCode';
import { asRoomError, RoomServiceError } from './rooms';
import type { SeatReclaimRequest, SeatReclaims } from './host/reclaim';
import { getFirebase } from './firebase';

function databaseForCode(codeInput: string) {
  const code = normalizeRoomCode(codeInput);
  if (!isValidRoomCode(code)) throw new RoomServiceError('INVALID_CODE');
  return { code, database: getFirebase().db };
}

/**
 * A new anonymous uid asks the host for an offline seat. Security rules only
 * accept this for a disconnected player while the room is playing.
 */
export async function requestSeatReclaim(
  codeInput: string,
  uid: string,
  oldUid: string,
  nicknameInput: string,
): Promise<void> {
  const nickname = normalizeNickname(nicknameInput);
  if (!isValidNickname(nickname)) throw new RoomServiceError('INVALID_NICKNAME');

  try {
    const { code, database } = databaseForCode(codeInput);
    const requestRef = ref(database, `rooms/${code}/reclaims/${uid}`);
    const existing = await get(requestRef);
    if (existing.exists()) return;

    await set(requestRef, {
      oldUid,
      name: nickname,
      requestedAt: serverTimestamp(),
    });
  } catch (error) {
    throw asRoomError(error);
  }
}

/** Cancels a pending reclaim, either by the guest or by the host. */
export async function cancelSeatReclaim(
  codeInput: string,
  uid: string,
  requestUid: string = uid,
): Promise<void> {
  try {
    const { code, database } = databaseForCode(codeInput);
    await remove(ref(database, `rooms/${code}/reclaims/${requestUid}`));
  } catch (error) {
    throw asRoomError(error);
  }
}

export interface SeatReclaimHandlers {
  onRequests: (requests: SeatReclaims) => void;
  onError: (error: RoomServiceError) => void;
}

/** Host-only subscription to all pending seat reclaims. */
export function subscribeSeatReclaims(
  codeInput: string,
  handlers: SeatReclaimHandlers,
): () => void {
  const { code, database } = databaseForCode(codeInput);
  return onValue(
    ref(database, `rooms/${code}/reclaims`),
    (snapshot) =>
      handlers.onRequests((snapshot.val() as SeatReclaims | null) ?? {}),
    (error) => handlers.onError(asRoomError(error)),
  );
}

export interface SeatReclaimRequestHandler {
  onRequest: (request: SeatReclaimRequest | null) => void;
  onError: (error: RoomServiceError) => void;
}

/** Reads the current guest's own request without exposing other requests. */
export function subscribeMySeatReclaim(
  codeInput: string,
  uid: string,
  handlers: SeatReclaimRequestHandler,
): () => void {
  const { code, database } = databaseForCode(codeInput);
  return onValue(
    ref(database, `rooms/${code}/reclaims/${uid}`),
    (snapshot) =>
      handlers.onRequest(
        snapshot.exists() ? (snapshot.val() as SeatReclaimRequest) : null,
      ),
    (error) => handlers.onError(asRoomError(error)),
  );
}
