import type { FullGameState } from '@/engine/types';
import type { RoomPlayer } from '@/net/roomTypes';

export const RECLAIM_NAME_MAX_LENGTH = 16;

/** One guest request under `rooms/{code}/reclaims/{newUid}`. */
export interface SeatReclaimRequest {
  oldUid: string;
  name: string;
  requestedAt: number;
}

export type SeatReclaims = Record<string, SeatReclaimRequest>;

/**
 * Rebuilds the authoritative state with the old anonymous uid replaced by the
 * new one. UIDs appear in player records, offers, pending cards, logs and the
 * final score map, so a plain field-by-field copy is not enough.
 */
export function replaceUids<T>(value: T, oldUid: string, newUid: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => replaceUids(item, oldUid, newUid)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key === oldUid ? newUid : key] = replaceUids(item, oldUid, newUid);
    }
    return next as T;
  }
  return (value === oldUid ? newUid : value) as T;
}

/**
 * Moves a player and every reference to them from `oldUid` to `newUid`.
 * Returns null when the target is not a valid reclaim (the old player is gone
 * or the new uid already occupies a seat).
 */
export function migratePlayerUid(
  state: FullGameState,
  oldUid: string,
  newUid: string,
  name?: string,
): FullGameState | null {
  if (!oldUid || !newUid || oldUid === newUid) return null;
  if (!state.players.some((player) => player.uid === oldUid)) return null;
  if (state.players.some((player) => player.uid === newUid)) return null;

  const next = replaceUids(structuredClone(state), oldUid, newUid);
  const player = next.players.find((candidate) => candidate.uid === newUid);
  if (!player) return null;

  const cleaned = name?.trim();
  if (cleaned) player.name = cleaned.slice(0, RECLAIM_NAME_MAX_LENGTH);
  return next;
}

/** Finds the room player record that a new uid can ask to reclaim. */
export function findReclaimablePlayer(
  players: Record<string, RoomPlayer>,
  oldUid: string,
): RoomPlayer | null {
  const player = players[oldUid];
  if (!player || player.connected !== false) return null;
  return player;
}
