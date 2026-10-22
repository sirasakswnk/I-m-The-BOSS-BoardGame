import type { RoomMeta, RoomPlayers } from './roomTypes';

export const ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * A stale room can be removed when it is over a day old and nobody is currently
 * connected. This keeps the Spark plan's 1 GB limit manageable without deleting
 * a game that is still being played (even if it is unusually long).
 */
export function shouldCleanupOldRoom(
  meta: Pick<RoomMeta, 'createdAt'>,
  players: RoomPlayers,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(meta.createdAt)) return false;
  if (now - meta.createdAt < ROOM_MAX_AGE_MS) return false;
  return !Object.values(players).some((player) => player.connected === true);
}
