import { describe, expect, it } from 'vitest';

import { finishGame, runEndCheck } from '../endgame';
import { randomInt } from '../rng';
import {
  getPlayer,
  lockAndResolve,
  ok,
  openDealAt,
  rejected,
  setHand,
  setTableInvestors,
  startGame,
} from './helpers';

function seedForFace(face: number): number {
  for (let seed = 1; seed < 100000; seed += 1) {
    if (randomInt(seed, 1, 6).value === face) return seed;
  }
  throw new Error(`No seed produces ${face}`);
}

describe('end check', () => {
  it('does nothing before the tenth deal', () => {
    const state = startGame(4, 130);
    state.dealsClosed = 9;
    const rng = state.rngState;
    expect(runEndCheck(state, 3000)).toEqual([]);
    expect(state.rngState).toBe(rng);
    expect(state.phase).not.toBe('gameOver');
  });

  it('tile 10 ends on a roll of 1', () => {
    const state = startGame(4, 131);
    state.dealsClosed = 10;
    state.rngState = seedForFace(1);
    const events = runEndCheck(state, 3000);
    expect(events.some((event) => event.type === 'endCheckRolled')).toBe(true);
    const roll = events.find((event) => event.type === 'endCheckRolled');
    if (roll?.type === 'endCheckRolled') {
      expect(roll.tileNumber).toBe(10);
      expect(roll.face).toBe(1);
      expect(roll.ends).toBe(true);
    }
    expect(events.some((event) => event.type === 'gameOver')).toBe(true);
    expect(state.phase).toBe('gameOver');
    expect(state.finalScores).not.toBeNull();
  });

  it('tile 10 continues on a roll above 1', () => {
    const state = startGame(4, 132);
    state.dealsClosed = 10;
    state.rngState = seedForFace(6);
    const events = runEndCheck(state, 3000);
    const roll = events.find((event) => event.type === 'endCheckRolled');
    if (roll?.type === 'endCheckRolled') {
      expect(roll.face).toBe(6);
      expect(roll.ends).toBe(false);
    }
    expect(state.phase).not.toBe('gameOver');
  });

  it('ends automatically after the fifteenth deal', () => {
    const state = startGame(4, 133);
    state.dealsClosed = 15;
    const events = runEndCheck(state, 3000);
    expect(events).toEqual([
      {
        type: 'gameOver',
        at: 3000,
        finalScores: expect.any(Object),
        winners: expect.any(Array),
      },
    ]);
    expect(state.phase).toBe('gameOver');
  });

  it('declares joint winners when money ties', () => {
    const state = startGame(3, 134);
    getPlayer(state, 'p1').money = 10;
    getPlayer(state, 'p2').money = 10;
    getPlayer(state, 'p3').money = 7;
    const events = finishGame(state, 3000);
    expect(state.finalScores).toEqual({ p1: 10, p2: 10, p3: 7 });
    const over = events.find((event) => event.type === 'gameOver');
    if (over?.type === 'gameOver') {
      expect(over.winners.sort()).toEqual(['p1', 'p2']);
    }
    expect(state.phase).toBe('gameOver');
    expect(state.deal).toBeNull();
    expect(state.window).toBeNull();
  });
});

describe('endgame integration', () => {
  function gameAtTenDeals(seed: number, face: number) {
    const state = startGame(4, seed);
    setTableInvestors(state, { p1: ['green', 'yellow'] });
    setHand(state, 'p1', []);
    state.dealsClosed = 9;
    state.rngState = seedForFace(face);
    const opened = openDealAt(state, 'p1', 8);
    expect(opened.deal?.tileNumber).toBe(10);
    return lockAndResolve(opened, 'p1', 5000);
  }

  it('resolves the tenth deal and ends the game when the end check succeeds', () => {
    const resolved = gameAtTenDeals(135, 1);
    expect(resolved.phase).toBe('gameOver');
    expect(resolved.finalScores).toEqual({ p1: 15, p2: 0, p3: 0, p4: 0 });
    expect(resolved.log.some((entry) => entry.type === 'endCheckRolled')).toBe(true);
    expect(resolved.log.some((entry) => entry.type === 'gameOver')).toBe(true);
  });

  it('keeps playing on a failed end check', () => {
    const resolved = gameAtTenDeals(136, 6);
    expect(resolved.phase).toBe('turnStart');
    expect(resolved.finalScores).toBeNull();
    expect(resolved.dealsClosed).toBe(10);
    expect(resolved.bossUid).toBe('p2');
  });

  it('rematches into a fresh game', () => {
    const finished = gameAtTenDeals(137, 1);
    const rematched = ok(finished, { type: 'REMATCH', uid: 'p2' }, 6000).state;
    expect(rematched.phase).toBe('setupPickStart');
    expect(rematched.dealsClosed).toBe(0);
    expect(rematched.closedSpaces).toEqual([]);
    expect(rematched.pawnSpace).toBe(0);
    expect(rematched.finalScores).toBeNull();
    expect(rematched.deal).toBeNull();
    expect(rematched.players).toHaveLength(4);
    for (const player of rematched.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.money).toBe(0);
    }
    expect(rematched.log[0]?.type).toBe('gameStarted');
  });

  it('rejects rematch before game over', () => {
    expect(rejected(startGame(3, 138), { type: 'REMATCH', uid: 'p1' }, 4000)).toBe(
      'WRONG_PHASE',
    );
  });
});
