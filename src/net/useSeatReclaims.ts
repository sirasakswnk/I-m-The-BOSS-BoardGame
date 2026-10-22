import { useEffect, useState } from 'react';

import type { SeatReclaimRequest, SeatReclaims } from './host/reclaim';
import { subscribeMySeatReclaim, subscribeSeatReclaims } from './reclaims';

const EMPTY_REQUESTS: SeatReclaims = {};

/** Host-side list of pending reclaim requests. */
export function useSeatReclaims(code: string, enabled: boolean): SeatReclaims {
  const [requests, setRequests] = useState<SeatReclaims>(EMPTY_REQUESTS);

  useEffect(() => {
    if (!enabled || !code) {
      setRequests(EMPTY_REQUESTS);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeSeatReclaims(code, {
        onRequests: (next) => {
          if (active) setRequests(next);
        },
        onError: () => undefined,
      });
    } catch {
      // The host can retry after reconnecting.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [code, enabled]);

  return requests;
}

/** The current guest's own reclaim request, if any. */
export function useMySeatReclaim(
  code: string,
  uid: string,
  enabled: boolean,
): SeatReclaimRequest | null {
  const [request, setRequest] = useState<SeatReclaimRequest | null>(null);

  useEffect(() => {
    if (!enabled || !code || !uid) {
      setRequest(null);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeMySeatReclaim(code, uid, {
        onRequest: (next) => {
          if (active) setRequest(next);
        },
        onError: () => undefined,
      });
    } catch {
      // A retry happens when the room subscription reconnects.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [code, uid, enabled]);

  return request;
}
