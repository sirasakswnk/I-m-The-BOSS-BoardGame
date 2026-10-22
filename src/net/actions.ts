import { push, ref, serverTimestamp, set } from 'firebase/database';

import type { GameAction } from '@/engine/types';

import { getFirebase } from './firebase';
import type { StoredActionType } from './gameTypes';
import { asRoomError } from './rooms';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A client intent: the room layer adds uid and the server timestamp. */
export type ActionIntent = DistributiveOmit<GameAction, 'uid' | 'ts'>;

async function pushAction(
  code: string,
  uid: string,
  type: StoredActionType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const database = getFirebase().db;
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );

    await set(push(ref(database, `rooms/${code}/actions`)), {
      uid,
      type,
      payload: cleanPayload,
      ts: serverTimestamp(),
    });
  } catch (error) {
    throw asRoomError(error);
  }
}

/**
 * Appends an action to rooms/{code}/actions. Every client, including the host,
 * goes through this path; only the host loop calls the engine (plan.md 4.1).
 */
export async function sendAction(
  code: string,
  uid: string,
  action: ActionIntent,
): Promise<void> {
  const { type, ...payload } = action;
  await pushAction(code, uid, type, payload);
}

export async function sendStartGame(code: string, uid: string): Promise<void> {
  await sendAction(code, uid, { type: 'START_GAME' });
}

/**
 * Host approval for a pending reclaim. The payload is validated again by the
 * host loop before any player data is moved.
 */
export async function sendSeatReclaim(
  code: string,
  uid: string,
  oldUid: string,
  newUid: string,
  name: string,
): Promise<void> {
  await pushAction(code, uid, 'RECLAIM_SEAT', { oldUid, newUid, name });
}
