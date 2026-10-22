import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/engine/types';
import type { RoomPlayers } from '@/net/roomTypes';

import {
  buildFinalScoreRows,
  endCheckKey,
  findLatestEndCheck,
  getDiscardNeed,
  getEndCheckToShow,
} from './endgameUtils';

const endCheck = {
  type: 'endCheckRolled',
  at: 10_000,
  tileNumber: 12,
  face: 2,
  ends: true,
} satisfies GameEvent;

const failedCheck = {
  type: 'endCheckRolled',
  at: 20_000,
  tileNumber: 12,
  face: 6,
  ends: false,
} satisfies GameEvent;

const gameOver = {
  type: 'gameOver',
  at: 10_000,
  finalScores: { p1: 10, p2: 5 },
  winners: ['p1'],
} satisfies GameEvent;

const turnStarted = (at: number, turnNumber: number) =>
  ({ type: 'turnStarted', at, uid: 'p1', turnNumber }) satisfies GameEvent;

describe('endgame utils', () => {
  it('calculates the forced discard down to twelve cards', () => {
    expect(getDiscardNeed(12)).toBe(0);
    expect(getDiscardNeed(14)).toBe(2);
    expect(getDiscardNeed(9)).toBe(0);
  });

  it('finds the latest end check and builds a stable overlay key', () => {
    const log = [endCheck, failedCheck];
    const latest = findLatestEndCheck(log);
    expect(latest?.index).toBe(1);
    expect(latest?.event).toBe(failedCheck);
    expect(endCheckKey(endCheck)).toBe('10000:12:2');
  });

  it('shows the successful check tied to the game-over event', () => {
    expect(getEndCheckToShow([endCheck, gameOver], 'gameOver')).toBe(endCheck);
    expect(getEndCheckToShow([gameOver], 'gameOver')).toBeNull();
    expect(getEndCheckToShow([endCheck], 'turnStart')).toBe(endCheck);
  });

  it('hides a stale failed check once the next turn has moved on', () => {
    const log = [failedCheck, turnStarted(20_010, 1), turnStarted(20_020, 2)];
    expect(getEndCheckToShow(log, 'turnStart')).toBeNull();
  });

  it('ranks tied final scores with competition ranks', () => {
    const players: RoomPlayers = {
      p1: { name: 'หนึ่ง', seat: 0, connected: true, lastSeen: 1, joinedAt: 1 },
      p2: { name: 'สอง', seat: 1, connected: true, lastSeen: 1, joinedAt: 2 },
      p3: { name: 'สาม', seat: 2, connected: true, lastSeen: 1, joinedAt: 3 },
    };

    expect(
      buildFinalScoreRows({ p1: 42, p2: 42, p3: 25 }, players).map((row) => ({
        uid: row.uid,
        rank: row.rank,
        winner: row.winner,
      })),
    ).toEqual([
      { uid: 'p1', rank: 1, winner: true },
      { uid: 'p2', rank: 1, winner: true },
      { uid: 'p3', rank: 3, winner: false },
    ]);
    expect(buildFinalScoreRows(null, players)).toEqual([]);
  });
});
