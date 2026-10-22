import { HAND_LIMIT } from '@/engine/config/rules';
import type { GameEvent, Phase } from '@/engine/types';
import type { RoomPlayers } from '@/net/roomTypes';

export type EndCheckEvent = Extract<GameEvent, { type: 'endCheckRolled' }>;

interface LatestEvent<T> {
  event: T;
  index: number;
}

function findLatest<T extends GameEvent['type']>(
  log: readonly GameEvent[],
  type: T,
): LatestEvent<Extract<GameEvent, { type: T }>> | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index];
    if (event.type === type) {
      return {
        event: event as Extract<GameEvent, { type: T }>,
        index,
      };
    }
  }
  return null;
}

export function getDiscardNeed(handLength: number): number {
  return Math.max(0, handLength - HAND_LIMIT);
}

export function findLatestEndCheck(log: readonly GameEvent[]): LatestEvent<EndCheckEvent> | null {
  return findLatest(log, 'endCheckRolled');
}

/**
 * The die overlay should only play for the end check tied to the current
 * transition. Game-over rolls are tied by their shared `at` timestamp; a
 * failed roll is only interesting while it is still one of the last two log
 * entries, before the next turn produces more events.
 */
export function getEndCheckToShow(log: readonly GameEvent[], phase: Phase): EndCheckEvent | null {
  const latest = findLatestEndCheck(log);
  if (!latest) return null;

  if (phase === 'gameOver') {
    const gameOver = findLatest(log, 'gameOver');
    return gameOver?.event.at === latest.event.at ? latest.event : null;
  }

  return latest.index >= log.length - 2 ? latest.event : null;
}

export function endCheckKey(event: EndCheckEvent): string {
  return `${event.at}:${event.tileNumber}:${event.face}`;
}

export interface FinalScoreRow {
  uid: string;
  name: string;
  seat: number;
  score: number;
  rank: number;
  winner: boolean;
}

/** Builds stable seat-ordered rows and competition ranks (1, 1, 3 for ties). */
export function buildFinalScoreRows(
  finalScores: Record<string, number> | null,
  players: RoomPlayers,
): FinalScoreRow[] {
  if (!finalScores) return [];

  const rows = Object.entries(finalScores).map(([uid, score]) => ({
    uid,
    name: players[uid]?.name ?? uid,
    seat: players[uid]?.seat ?? Number.MAX_SAFE_INTEGER,
    score,
  }));
  if (rows.length === 0) return [];

  const best = Math.max(...rows.map((row) => row.score));

  return rows
    .sort((left, right) => left.seat - right.seat || left.uid.localeCompare(right.uid))
    .map((row) => ({
      ...row,
      rank: 1 + rows.filter((other) => other.score > row.score).length,
      winner: row.score === best,
    }));
}
