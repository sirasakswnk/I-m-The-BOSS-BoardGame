import { push, ref, serverTimestamp, set } from 'firebase/database';

import type { GameAction } from '@/engine/types';

import { getFirebase } from './firebase';
import { asRoomError } from './rooms';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A client intent: the room layer adds uid and the server timestamp. */
export type ActionIntent = DistributiveOmit<GameAction, 'uid' | 'ts'>;

/**
 * Appends an action to rooms/{code}/actions. Every client, including the host,
 * goes through this path; only the host loop calls the engine (plan.md 4.1).
 */
export async function sendAction(
  code: string,
  uid: string,
  action: ActionIntent,
): Promise<void> {
  try {
    const database = getFirebase().db;
    const { type, ...payload } = action;
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

export async function sendStartGame(code: string, uid: string): Promise<void> {
  await sendAction(code, uid, { type: 'START_GAME' });
}
