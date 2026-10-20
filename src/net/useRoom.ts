import { useEffect } from 'react';

import { useRoomStore } from '@/store/roomStore';

import { isValidRoomCode, normalizeRoomCode } from './roomCode';
import { subscribeRoom } from './rooms';
import { useAnonymousAuth } from './useAnonymousAuth';

/**
 * Subscribes to meta + players for a room and mirrors the snapshot into the
 * room store. Private paths and hostState are never read here.
 */
export function useRoom(codeInput: string): {
  uid: string | null;
  authReady: boolean;
  authErrorCode: ReturnType<typeof useAnonymousAuth>['errorCode'];
  roomCode: string | null;
  meta: ReturnType<typeof useRoomStore.getState>['meta'];
  players: ReturnType<typeof useRoomStore.getState>['players'];
  loading: boolean;
  errorCode: ReturnType<typeof useRoomStore.getState>['roomErrorCode'];
} {
  const auth = useAnonymousAuth();
  const roomCode = useRoomStore((state) => state.roomCode);
  const meta = useRoomStore((state) => state.meta);
  const players = useRoomStore((state) => state.players);
  const loading = useRoomStore((state) => state.roomLoading);
  const errorCode = useRoomStore((state) => state.roomErrorCode);
  const beginRoom = useRoomStore((state) => state.beginRoom);
  const setMeta = useRoomStore((state) => state.setMeta);
  const setPlayers = useRoomStore((state) => state.setPlayers);
  const setRoomLoading = useRoomStore((state) => state.setRoomLoading);
  const setRoomError = useRoomStore((state) => state.setRoomError);

  useEffect(() => {
    const code = normalizeRoomCode(codeInput);
    if (!isValidRoomCode(code)) {
      beginRoom(code);
      setRoomError('INVALID_CODE');
      return;
    }

    if (!auth.uid) {
      beginRoom(code);
      return;
    }

    beginRoom(code);
    let active = true;
    let metaLoaded = false;
    let playersLoaded = false;

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeRoom(code, {
        onMeta: (nextMeta) => {
          if (!active) return;
          metaLoaded = true;
          setMeta(nextMeta);
          if (!nextMeta) {
            playersLoaded = true;
            setRoomLoading(false);
            return;
          }
          if (playersLoaded) setRoomLoading(false);
        },
        onPlayers: (nextPlayers) => {
          if (!active) return;
          playersLoaded = true;
          setPlayers(nextPlayers);
          if (metaLoaded) setRoomLoading(false);
        },
        onError: (error) => {
          if (!active) return;
          setRoomError(error.code);
          setRoomLoading(false);
        },
      });
    } catch {
      setRoomError('UNKNOWN');
      setRoomLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [
    auth.uid,
    codeInput,
    beginRoom,
    setMeta,
    setPlayers,
    setRoomLoading,
    setRoomError,
  ]);

  return {
    uid: auth.uid,
    authReady: auth.ready,
    authErrorCode: auth.errorCode,
    roomCode,
    meta,
    players,
    loading,
    errorCode,
  };
}
