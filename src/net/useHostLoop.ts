import { useEffect } from 'react';

import { startHostLoop } from './host/hostLoop';

/**
 * Runs the authoritative host loop while this browser is the room host. The
 * loop deliberately stays mounted when meta.status changes from lobby to
 * playing; only losing host ownership or unmounting stops it.
 */
export function useHostLoop(
  code: string,
  uid: string | null,
  isHost: boolean,
): void {
  useEffect(() => {
    if (!code || !uid || !isHost) return;

    const stop = startHostLoop({
      code,
      hostUid: uid,
      onError: () => {
        // The host loop keeps state in RTDB; a later action or refresh retries.
      },
    });
    return stop;
  }, [code, uid, isHost]);
}
