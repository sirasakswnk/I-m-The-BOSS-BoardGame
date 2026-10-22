import { useEffect, useMemo, useState } from 'react';

import { th } from '@/i18n/th';
import { useUiStore } from '@/store/uiStore';

import {
  claimHost,
  findHostCandidate,
  HOST_MIGRATION_DELAY_MS,
  type HostMigrationStatus,
} from './host/migration';
import type { RoomMeta, RoomPlayers } from './roomTypes';

/**
 * Watches an abandoned host. Only the lowest connected seat attempts the
 * transaction after ten seconds; every other member stays on the waiting UI.
 */
export function useHostMigration(
  code: string,
  uid: string | null,
  meta: RoomMeta | null,
  players: RoomPlayers,
  enabled: boolean,
): HostMigrationStatus {
  const showToast = useUiStore((state) => state.showToast);
  const [status, setStatus] = useState<HostMigrationStatus>('online');
  const candidate = useMemo(() => findHostCandidate(players), [players]);

  useEffect(() => {
    if (
      !enabled ||
      !uid ||
      !meta ||
      meta.status === 'finished' ||
      meta.hostConnected !== false
    ) {
      setStatus('online');
      return;
    }

    if (candidate !== uid) {
      setStatus('waiting');
      return;
    }

    setStatus('waiting');
    let active = true;
    const timer = window.setTimeout(() => {
      setStatus('claiming');
      void claimHost(code, uid, meta.hostUid).then((claimed) => {
        if (!active) return;
        if (claimed) {
          setStatus('claimed');
          showToast(th.room.hostClaimed);
        } else {
          setStatus('waiting');
        }
      });
    }, HOST_MIGRATION_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    code,
    uid,
    meta,
    candidate,
    showToast,
  ]);

  return status;
}
