import { onValue, ref } from 'firebase/database';

import { getFirebase } from './firebase';

let offsetMs = 0;
let unsubscribe: (() => void) | null = null;
let subscribers = 0;

/**
 * Keeps a local estimate of the Firebase server clock (plan.md 7.2). The
 * offset comes from RTDB's `.info/serverTimeOffset`, so actions and window
 * deadlines do not depend on the host machine's wall clock.
 */
export function startServerClockSync(): () => void {
  subscribers += 1;
  if (subscribers === 1) {
    const database = getFirebase().db;
    unsubscribe = onValue(
      ref(database, '.info/serverTimeOffset'),
      (snapshot) => {
        const value = snapshot.val();
        offsetMs = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      },
      () => {
        offsetMs = 0;
      },
    );
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0) {
      unsubscribe?.();
      unsubscribe = null;
    }
  };
}

/** Server time in milliseconds, adjusted by the latest RTDB offset. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
