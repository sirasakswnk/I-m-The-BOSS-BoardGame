import { describe, expect, it } from 'vitest';

import { FAMILY_INDEX, FAMILY_ORDER } from '../config/families';
import { STARTING_HAND_SIZE } from '../config/rules';
import { makeLobby, ok, rejected, startGame } from './helpers';

function minFamilyIndex(investors: readonly (typeof FAMILY_ORDER)[number][]): number {
  return Math.min(...investors.map((color) => FAMILY_INDEX[color]));
}

describe('setup', () => {
  it.each([3, 4, 5, 6])('deals investors and hands for %i players', (playerCount) => {
    const started = ok(
      makeLobby(playerCount, 12345),
      { type: 'START_GAME', uid: 'p1' },
      1000,
    ).state;

    expect(started.phase).toBe('setupPickStart');
    expect(started.players).toHaveLength(playerCount);
    expect(started.dealsClosed).toBe(0);
    expect(started.pawnSpace).toBe(0);
    expect(started.closedSpaces).toEqual([]);

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

    const first = started.players.find((player) => player.uid === started.bossUid);
    if (!first) throw new Error('first player missing');
    const best = Math.min(...started.players.map((player) => minFamilyIndex(player.investors)));
    expect(minFamilyIndex(first.investors)).toBe(best);

    const sorted = [...started.players].sort((a, b) => a.seat - b.seat);
    const firstIndex = sorted.indexOf(first);
    const right = sorted[(firstIndex - 1 + sorted.length) % sorted.length];
    expect(started.startPickerUid).toBe(right.uid);
  });

  it('is deterministic for the same seed', () => {
    const a = ok(makeLobby(4, 77), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    const b = ok(makeLobby(4, 77), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    expect(a.players.map((player) => player.investors)).toEqual(
      b.players.map((player) => player.investors),
    );
    expect(a.players.map((player) => player.hand.map((card) => card.id))).toEqual(
      b.players.map((player) => player.hand.map((card) => card.id)),
    );
    expect(a.unclaimedInvestors).toEqual(b.unclaimedInvestors);
  });

  it('only the right-hand player picks the start space', () => {
    const started = ok(makeLobby(3, 5), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    const picker = started.startPickerUid;
    if (!picker) throw new Error('picker missing');
    const notPicker = started.players.find((player) => player.uid !== picker);
    if (!notPicker) throw new Error('second player missing');

    expect(rejected(started, { type: 'SET_START_SPACE', uid: notPicker.uid, space: 4 }, 2000)).toBe(
      'NOT_START_PICKER',
    );

    const picked = ok(
      started,
      { type: 'SET_START_SPACE', uid: picker, space: 4 },
      2000,
    ).state;
    expect(picked.phase).toBe('turnStart');
    expect(picked.pawnSpace).toBe(4);
    expect(picked.turnNumber).toBe(1);
    expect(picked.startPickerUid).toBeNull();
    expect(picked.bossUid).toBe(started.bossUid);
  });

  it('rejects invalid start spaces', () => {
    const started = ok(makeLobby(3, 5), { type: 'START_GAME', uid: 'p1' }, 1000).state;
    const picker = started.startPickerUid;
    if (!picker) throw new Error('picker missing');
    expect(rejected(started, { type: 'SET_START_SPACE', uid: picker, space: 0 }, 2000)).toBe(
      'INVALID_SPACE',
    );
    expect(rejected(started, { type: 'SET_START_SPACE', uid: picker, space: 17 }, 2000)).toBe(
      'INVALID_SPACE',
    );
  });

  it('requires 3..6 players', () => {
    expect(rejected(makeLobby(2, 1), { type: 'START_GAME', uid: 'p1' }, 1000)).toBe(
      'NOT_ENOUGH_PLAYERS',
    );
    const lobby = makeLobby(6, 1);
    expect(rejected(lobby, { type: 'JOIN', uid: 'p7', name: 'P7' }, 1000)).toBe('ROOM_FULL');
  });

  it('started game has no window and no deal', () => {
    const started = startGame(3, 9);
    expect(started.deal).toBeNull();
    expect(started.window).toBeNull();
    expect(started.phase).toBe('turnStart');
    expect(started.pawnSpace).toBe(1);
  });
});
