import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { GameEvent } from '@/engine/types';

export type DiceRollEvent = Extract<GameEvent, { type: 'diceRolled' }>;

export type PawnWalkEntry =
  { kind: 'step'; space: number; step: number } | { kind: 'skip'; space: number };

/**
 * Every space the pawn passes while it walks clockwise: open spaces count as
 * steps, closed spaces are skipped without counting (plan.md 3.4).
 */
export function getPawnWalk(
  from: number,
  face: number,
  closedSpaces: readonly number[],
): PawnWalkEntry[] {
  const spaceCount = DEAL_BOARD_SPACES.length;
  if (closedSpaces.length >= spaceCount) return [];

  const walk: PawnWalkEntry[] = [];
  let steps = 0;
  let position = from;
  while (steps < face) {
    position = (position % spaceCount) + 1;
    if (closedSpaces.includes(position)) {
      walk.push({ kind: 'skip', space: position });
    } else {
      steps += 1;
      walk.push({ kind: 'step', space: position, step: steps });
    }
  }
  return walk;
}

/** Spaces the pawn lands on, one per pip. The last entry is the destination. */
export function getPawnPath(from: number, face: number, closedSpaces: readonly number[]): number[] {
  return getPawnWalk(from, face, closedSpaces)
    .filter((entry) => entry.kind === 'step')
    .map((entry) => entry.space);
}

/** What the board draws while a roll animation walks the pawn. */
export interface PawnWalkState {
  pawn: number;
  /** Increments on every step so the pawn can replay its hop. */
  hop: number;
  /** space -> step number for spaces the pawn has stepped on. */
  steps: Record<number, number>;
  /** Closed spaces the pawn jumped over. */
  skipped: number[];
  /** Destination, once the walk is finished. */
  landed: number | null;
}

export function findLatestDiceRoll(log: readonly GameEvent[]): DiceRollEvent | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index];
    if (event.type === 'diceRolled') return event;
  }
  return null;
}

export function diceRollKey(event: DiceRollEvent): string {
  return `${event.at}:${event.uid}:${event.from}:${event.face}`;
}
