import { useEffect } from 'react';

import { useRoomStore } from '@/store/roomStore';

import { ensureAnonymousAuth } from './firebase';
import type { RoomErrorCode } from './roomTypes';

/**
 * Signs the browser in anonymously once and exposes the uid via the room
 * store. Firebase persists the session, so a refresh keeps the same seat.
 */
export function useAnonymousAuth(): {
  uid: string | null;
  ready: boolean;
  errorCode: RoomErrorCode | null;
} {
  const uid = useRoomStore((state) => state.uid);
  const ready = useRoomStore((state) => state.authReady);
  const errorCode = useRoomStore((state) => state.authErrorCode);
  const setAuth = useRoomStore((state) => state.setAuth);
  const setAuthError = useRoomStore((state) => state.setAuthError);

  useEffect(() => {
    if (uid || errorCode) return;

    let active = true;
    ensureAnonymousAuth()
      .then((user) => {
        if (active) setAuth(user.uid);
      })
      .catch(() => {
        if (active) setAuthError('AUTH_FAILED');
      });

    return () => {
      active = false;
    };
  }, [uid, errorCode, setAuth, setAuthError]);

  return { uid, ready, errorCode };
}
