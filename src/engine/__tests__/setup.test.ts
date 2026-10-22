import { describe, expect, it } from 'vitest';

import { FAMILY_INDEX, FAMILY_ORDER } from '../config/families';
import { STARTING_HAND_SIZE } from '../config/rules';
import { randomInt } from '../rng';
import { makeLobby, ok, rejected, startGame } from './helpers';

function minFamilyIndex(investors: readonly (typeof FAMILY_ORDER)[number][]): number {
  return Math.min(...investors.map((color) => FAMILY_INDEX[color]));
}

function expectedFirstSeat(seed: number, playerCount: number): number {
  const lobby = makeLobby(playerCount, seed);
  return randomInt(lobby.rngState, 0, playerCount - 1).value;
}

describe('setup', () => {
  it.each([3, 4, 5, 6])('deals investors and hands for %i players', (playerCount) => {
    const result = ok(
      makeLobby(playerCount, 12345),
      { type: 'START_GAME', uid: 'p1' },
      1000,
    );
    const started = result.state;

    expect(started.phase).toBe('turnStart');
    expect(started.turnNumber).toBe(1);
    expect(started.players).toHaveLength(playerCount);
    expect(started.dealsClosed).toBe(0);
    expect(started.pawnSpace).toBe(1);
    expect(started.closedSpaces).toEqual([]);
    expect(started.lastDice).toBeNull();

    const firstSeat = expectedFirstSeat(12345, playerCount);
    expect(started.bossUid).toBe(started.players[firstSeat]?.uid);
    expect(result.events.map((event) => event.type)).toEqual(['gameStarted', 'turnStarted']);
    expect(result.events[1]).toMatchObject({
      type: 'turnStarted',
      uid: started.bossUid,
      turnNumber: 1,
    });

    const perPlayer = playerCount === 3 ? 2 : 1;
    for (const player of started.players) {
      expect(player.investors).toHaveLength(perPlayer);
      expect(new Set(player.investors).size).toBe(perPlayer);
      expect(player.hand).toHaveLength(STARTING_HAND_SIZE);
      expect(player.money).toBe(0);
    }

    const allInvestors = [
      ...started.players.flatMap((player) => player.investors),
      ...started.unclaimedInvestors,
    ];
    expect(new Set(allInvestors).size).toBe(6);
    expect(allInvestors).toHaveLength(6);
    expect(started.unclaimedInvestors).toHaveLength(6 - playerCount * perPlayer);
    expect(started.deck).toHaveLength(98 - playerCount * STARTING_HAND_SIZE);
  });

  it('is deterministic for the same seed', () => {
    const a = ok(makeLobby(4, 77), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    const b = ok(makeLobby(4, 77), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    expect(a.bossUid).toBe(b.bossUid);
    expect(a.pawnSpace).toBe(b.pawnSpace);
    expect(a.turnNumber).toBe(b.turnNumber);
    expect(a.players.map((player) => player.investors)).toEqual(
      b.players.map((player) => player.investors),
    );
    expect(a.players.map((player) => player.hand.map((card) => card.id))).toEqual(
      b.players.map((player) => player.hand.map((card) => card.id)),
    );
    expect(a.unclaimedInvestors).toEqual(b.unclaimedInvestors);
  });

  it('rolls the first player uniformly from the seeded RNG, not investor order', () => {
    const firstPlayers = new Set<string>();
    let differsFromInvestorOrder = 0;

    for (let seed = 1; seed <= 80; seed += 1) {
      const started = ok(
        makeLobby(3, seed),
        { type: 'START_GAME', uid: 'p1' },
        1000,
      ).state;
      const first = started.players.find((player) => player.uid === started.bossUid);
      if (!first) throw new Error('first player missing');

      expect(first.uid).toBe(started.players[expectedFirstSeat(seed, 3)]?.uid);
      firstPlayers.add(first.uid);

      const best = Math.min(...started.players.map((player) => minFamilyIndex(player.investors)));
      if (minFamilyIndex(first.investors) !== best) differsFromInvestorOrder += 1;
    }

    expect(firstPlayers.size).toBe(3);
    expect(differsFromInvestorOrder).toBeGreaterThan(0);
  });

  it('requires 3..6 players', () => {
    expect(rejected(makeLobby(2, 1), { type: 'START_GAME', uid: 'p1' }, 1000)).toBe(
      'NOT_ENOUGH_PLAYERS',
    );
    const lobby = makeLobby(6, 1);
    expect(rejected(lobby, { type: 'JOIN', uid: 'p7', name: 'P7' }, 1000)).toBe('ROOM_FULL');
  });

  it('starts at space 1 with no window or deal, and the boss must roll first', () => {
    const started = startGame(3, 9);
    const boss = started.bossUid;
    if (!boss) throw new Error('no boss');

    expect(started.deal).toBeNull();
    expect(started.window).toBeNull();
    expect(started.phase).toBe('turnStart');
    expect(started.turnNumber).toBe(1);
    expect(started.pawnSpace).toBe(1);
    expect(started.lastDice).toBeNull();
    expect(rejected(started, { type: 'OPEN_DEAL', uid: boss }, 2000)).toBe('WRONG_PHASE');

    const rolled = ok(started, { type: 'ROLL_DICE', uid: boss }, 2000).state;
    expect(rolled.phase).toBe('afterMove');
    expect(rolled.pawnSpace).toBeGreaterThan(1);
  });
});
