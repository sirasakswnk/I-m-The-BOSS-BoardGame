import { onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';

import type { PrivateState, PublicState, RejectReason } from '@/engine/types';

import { getFirebase } from './firebase';
import { normalizePrivateState, normalizePublicState } from './gameState';
import type { ActionRejection } from './gameTypes';
import { asRoomError } from './rooms';
import type { RoomErrorCode } from './roomTypes';

interface GameStateView {
  publicState: PublicState | null;
  privateState: PrivateState | null;
  loading: boolean;
  errorCode: RoomErrorCode | null;
}

const EMPTY_VIEW: GameStateView = {
  publicState: null,
  privateState: null,
  loading: false,
  errorCode: null,
};

/**
 * Subscribes to this player's public projection, their own private hand/money,
 * and (optionally) rejection feedback. Security rules enforce the privacy; the
 * UI never requests another player's private path.
 */
export function useGameState(
  code: string,
  uid: string | null,
  enabled: boolean,
): GameStateView {
  const [view, setView] = useState<GameStateView>(EMPTY_VIEW);

  useEffect(() => {
    if (!enabled || !uid || !code) {
      setView(EMPTY_VIEW);
      return;
    }

    let active = true;
    let publicLoaded = false;
    let privateLoaded = false;
    let publicState: PublicState | null = null;
    let privateState: PrivateState | null = null;

    setView({ ...EMPTY_VIEW, loading: true });

    function commit() {
      if (!active) return;
      setView({
        publicState,
        privateState,
        loading: !publicLoaded || !privateLoaded,
        errorCode: null,
      });
    }

    let unsubscribePublic: (() => void) | null = null;
    let unsubscribePrivate: (() => void) | null = null;

    try {
      const database = getFirebase().db;
      unsubscribePublic = onValue(
        ref(database, `rooms/${code}/public`),
        (snapshot) => {
          if (!active) return;
          publicLoaded = true;
          publicState = normalizePublicState(snapshot.val());
          commit();
        },
        (error) => {
          if (!active) return;
          setView({
            ...EMPTY_VIEW,
            errorCode: asRoomError(error).code,
          });
        },
      );
      unsubscribePrivate = onValue(
        ref(database, `rooms/${code}/private/${uid}`),
        (snapshot) => {
          if (!active) return;
          privateLoaded = true;
          privateState = normalizePrivateState(snapshot.val());
          commit();
        },
        (error) => {
          if (!active) return;
          setView({
            ...EMPTY_VIEW,
            errorCode: asRoomError(error).code,
          });
        },
      );
    } catch (error) {
      setView({ ...EMPTY_VIEW, errorCode: asRoomError(error).code });
    }

    return () => {
      active = false;
      unsubscribePublic?.();
      unsubscribePrivate?.();
    };
  }, [code, uid, enabled]);

  return view;
}

/** Shows host rejection feedback for this player's latest action. */
export function useActionFeedback(
  code: string,
  uid: string | null,
  enabled: boolean,
  onReject: (reason: RejectReason) => void,
): void {
  const callbackRef = useRef(onReject);
  const lastActionIdRef = useRef<string | null>(null);

  useEffect(() => {
    callbackRef.current = onReject;
  }, [onReject]);

  useEffect(() => {
    lastActionIdRef.current = null;
    if (!enabled || !uid || !code) return;

    let active = true;
    let unsubscribe: (() => void) | null = null;

    try {
      const database = getFirebase().db;
      unsubscribe = onValue(
        ref(database, `rooms/${code}/public/rejections/${uid}`),
        (snapshot) => {
          if (!active) return;
          const rejection = snapshot.val() as ActionRejection | null;
          if (!rejection || rejection.actionId === lastActionIdRef.current) return;
          lastActionIdRef.current = rejection.actionId;
          callbackRef.current(rejection.reason);
        },
        () => undefined,
      );
    } catch {
      // Rejection feedback is best-effort.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [code, uid, enabled]);
}
