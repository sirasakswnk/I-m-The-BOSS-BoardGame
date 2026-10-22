import { describe, expect, it } from 'vitest';

import { movePawn } from '@/engine/validators';
import type { GameEvent } from '@/engine/types';

import { diceRollKey, findLatestDiceRoll, getPawnPath, getPawnWalk } from './diceRollUtils';

describe('getPawnPath', () => {
  it('walks one space per pip', () => {
    expect(getPawnPath(7, 4, [])).toEqual([8, 9, 10, 11]);
  });

  it('skips closed spaces without counting them', () => {
    expect(getPawnPath(2, 3, [3, 5])).toEqual([4, 6, 7]);
  });

  it('wraps from space 16 back to space 1 and can land where it started', () => {
    expect(getPawnPath(15, 3, [])).toEqual([16, 1, 2]);
    const closed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    expect(getPawnPath(16, 2, closed)).toEqual([16, 16]);
  });

  it('always ends where the engine moves the pawn', () => {
    const closed = [2, 9, 10, 16];
    for (let from = 1; from <= 16; from += 1) {
      if (closed.includes(from)) continue;
      for (let face = 1; face <= 6; face += 1) {
        const path = getPawnPath(from, face, closed);
        expect(path).toHaveLength(face);
        expect(path.at(-1)).toBe(movePawn(from, face, closed));
      }
    }
  });
});

describe('getPawnWalk', () => {
  it('numbers counted steps and marks closed spaces as skipped', () => {
    expect(getPawnWalk(2, 3, [3, 5])).toEqual([
      { kind: 'skip', space: 3 },
      { kind: 'step', space: 4, step: 1 },
      { kind: 'skip', space: 5 },
      { kind: 'step', space: 6, step: 2 },
      { kind: 'step', space: 7, step: 3 },
    ]);
  });

  it('returns nothing when every space is closed', () => {
    const all = Array.from({ length: 16 }, (_, index) => index + 1);
    expect(getPawnWalk(1, 4, all)).toEqual([]);
  });
});

describe('findLatestDiceRoll', () => {
  it('returns the newest roll and a stable key', () => {
    const log: GameEvent[] = [
      { type: 'diceRolled', at: 1, uid: 'p1', face: 2, from: 3, to: 5 },
      { type: 'cardsDrawn', at: 2, uid: 'p1', count: 3 },
      { type: 'diceRolled', at: 3, uid: 'p2', face: 6, from: 5, to: 11 },
      { type: 'turnStarted', at: 4, uid: 'p3', turnNumber: 3 },
    ];
    const latest = findLatestDiceRoll(log);
    expect(latest?.uid).toBe('p2');
    expect(diceRollKey(latest!)).toBe('3:p2:5:6');
    expect(findLatestDiceRoll([])).toBeNull();
  });
});
