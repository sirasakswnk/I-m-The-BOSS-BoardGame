import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { GameEvent } from '@/engine/types';

export type DiceRollEvent = Extract<GameEvent, { type: 'diceRolled' }>;

/**
 * Spaces the pawn lands on, one per counted step, while it walks clockwise
 * and skips closed spaces (plan.md 3.4). The last entry is the destination.
 */
export function getPawnPath(from: number, face: number, closedSpaces: readonly number[]): number[] {
  const spaceCount = DEAL_BOARD_SPACES.length;
  if (closedSpaces.length >= spaceCount) return [];

  const path: number[] = [];
  let position = from;
  while (path.length < face) {
    position = (position % spaceCount) + 1;
    if (!closedSpaces.includes(position)) path.push(position);
  }
  return path;
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
