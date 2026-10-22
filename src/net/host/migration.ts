import { ref, runTransaction, set } from 'firebase/database';

import type { RoomMeta, RoomPlayers } from '@/net/roomTypes';

import { getFirebase } from '../firebase';

/** Plan 8.4: wait ten seconds before a connected member takes over. */
export const HOST_MIGRATION_DELAY_MS = 10_000;

/** Lowest connected seat, excluding invalid or disconnected seats. */
export function findHostCandidate(players: RoomPlayers): string | null {
  const candidates = Object.entries(players)
    .filter(([, player]) => player.connected === true)
    .sort(
      (left, right) =>
        left[1].seat - right[1].seat ||
        (left[1].joinedAt ?? 0) - (right[1].joinedAt ?? 0) ||
        left[0].localeCompare(right[0]),
    );
  return candidates[0]?.[0] ?? null;
}

/**
 * Claims an abandoned host slot. The transaction on hostUid makes the write
 * atomic and the rules only permit it while hostConnected is false, so a host
 * that reconnects during the ten-second wait wins the race.
 */
export async function claimHost(
  code: string,
  uid: string,
  expectedHostUid: string,
): Promise<boolean> {
  const database = getFirebase().db;
  const hostConnectedRef = ref(database, `rooms/${code}/meta/hostConnected`);

  try {
    if (expectedHostUid === uid) {
      await set(hostConnectedRef, true);
      return true;
    }

    const result = await runTransaction(
      ref(database, `rooms/${code}/meta/hostUid`),
      (current) => (current === expectedHostUid ? uid : undefined),
      { applyLocally: false },
    );
    if (!result.committed) return false;

    await set(hostConnectedRef, true);
    return true;
  } catch {
    return false;
  }
}

export type HostMigrationStatus = 'online' | 'waiting' | 'claiming' | 'claimed';

export function isHostOffline(meta: RoomMeta | null): boolean {
  return Boolean(meta && meta.status !== 'finished' && meta.hostConnected === false);
}
