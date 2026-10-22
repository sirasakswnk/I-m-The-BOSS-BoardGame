import { describe, expect, it } from 'vitest';

import { HAND_LIMIT } from '../config/rules';
import { movePawn } from '../validators';
import { randomInt } from '../rng';
import {
  arrangeTurn,
  getPlayer,
  makeLobby,
  ok,
  rejected,
  recruitmentCard,
  setHand,
  startGame,
} from './helpers';

function leftOfUid(state: ReturnType<typeof startGame>, uid: string): string {
  const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
  const index = sorted.findIndex((player) => player.uid === uid);
  return sorted[(index + 1) % sorted.length].uid;
}

describe('dice and movement', () => {
  it('rolls the seeded die and moves that many open spaces', () => {
    const state = startGame(3, 11);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.pawnSpace = 3;
    state.closedSpaces = [];

    const predicted = randomInt(state.rngState, 1, 6).value;
    const result = ok(state, { type: 'ROLL_DICE', uid: boss }, 3000);

    expect(result.state.lastDice).toEqual([predicted]);
    expect(result.state.pawnSpace).toBe(movePawn(3, predicted, []));
    expect(result.state.phase).toBe('afterMove');
    expect(result.events.some((event) => event.type === 'diceRolled')).toBe(true);
  });

  it('does not count closed spaces as steps', () => {
    const state = startGame(3, 12);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.pawnSpace = 3;
    state.closedSpaces = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    const result = ok(state, { type: 'ROLL_DICE', uid: boss }, 3000);
    expect(result.state.pawnSpace).toBe(7);
  });

  it('can loop around the board back to the same space', () => {
    const state = startGame(3, 13);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.pawnSpace = 4;
    const { state: rolled } = ok(state, { type: 'ROLL_DICE', uid: boss }, 3000);
    const face = rolled.lastDice?.[0] ?? 1;
    // With all other spaces closed, every step lands on 4 again.
    expect(movePawn(4, face, [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])).toBe(4);
  });

  it('only the turn owner can roll, and only at turn start', () => {
    const state = startGame(3, 14);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    const other = state.players.find((player) => player.uid !== boss);
    if (!other) throw new Error('no other player');

    expect(rejected(state, { type: 'ROLL_DICE', uid: other.uid }, 3000)).toBe('NOT_YOUR_TURN');
    state.phase = 'afterMove';
    expect(rejected(state, { type: 'ROLL_DICE', uid: boss }, 3000)).toBe('WRONG_PHASE');
  });
});

describe('drawing cards', () => {
  it('draws exactly 3 cards and ends the turn', () => {
    const state = startGame(3, 21);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    const before = getPlayer(state, boss).hand.length;
    const deckBefore = state.deck.length;

    const result = ok(state, { type: 'DRAW_CARDS', uid: boss }, 3000);
    expect(getPlayer(result.state, boss).hand).toHaveLength(before + 3);
    expect(result.state.deck).toHaveLength(deckBefore - 3);
    expect(result.state.phase).toBe('turnStart');
    expect(result.state.bossUid).toBe(leftOfUid(state, boss));
    expect(result.state.turnNumber).toBe(state.turnNumber + 1);
  });

  it('requires a mandatory discard above 12 cards', () => {
    const state = startGame(3, 22);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    setHand(
      state,
      boss,
      Array.from({ length: HAND_LIMIT - 2 }, () => recruitmentCard()),
    );

    const drawn = ok(state, { type: 'DRAW_CARDS', uid: boss }, 3000).state;
    expect(getPlayer(drawn, boss).hand).toHaveLength(HAND_LIMIT + 1);
    expect(drawn.phase).toBe('turnEndDiscard');
    expect(drawn.pendingDiscardUids).toEqual([boss]);
    expect(drawn.nextTurnUid).toBe(leftOfUid(state, boss));

    const cards = getPlayer(drawn, boss).hand;
    const after = ok(drawn, { type: 'DISCARD', uid: boss, cardIds: [cards[0].id] }, 4000).state;
    expect(getPlayer(after, boss).hand).toHaveLength(HAND_LIMIT);
    expect(after.phase).toBe('turnStart');
    expect(after.bossUid).toBe(leftOfUid(state, boss));
    expect(after.pendingDiscardUids).toEqual([]);
  });

  it('rejects discarding the wrong number of cards', () => {
    const state = startGame(3, 23);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    setHand(
      state,
      boss,
      Array.from({ length: HAND_LIMIT - 2 }, () => recruitmentCard()),
    );
    const drawn = ok(state, { type: 'DRAW_CARDS', uid: boss }, 3000).state;
    const hand = getPlayer(drawn, boss).hand;

    expect(rejected(drawn, { type: 'DISCARD', uid: boss, cardIds: [] }, 4000)).toBe(
      'INVALID_DISCARD',
    );
    expect(
      rejected(drawn, { type: 'DISCARD', uid: boss, cardIds: [hand[0].id, hand[1].id] }, 4000),
    ).toBe('INVALID_DISCARD');
    expect(rejected(drawn, { type: 'DISCARD', uid: boss, cardIds: ['not-in-hand'] }, 4000)).toBe(
      'CARD_NOT_IN_HAND',
    );
  });

  it('shuffles the discard pile into the deck when empty', () => {
    const state = startGame(3, 24);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    setHand(state, boss, []);
    state.deck = [];
    state.discardPile = [recruitmentCard(), recruitmentCard()];

    const result = ok(state, { type: 'DRAW_CARDS', uid: boss }, 3000);
    expect(getPlayer(result.state, boss).hand).toHaveLength(2);
    expect(result.state.deck).toHaveLength(0);
    expect(result.state.discardPile).toHaveLength(0);
  });

  it('only the turn owner can draw, and only after moving', () => {
    const state = startGame(3, 25);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    const other = state.players.find((player) => player.uid !== boss);
    if (!other) throw new Error('no other player');

    state.phase = 'afterMove';
    expect(rejected(state, { type: 'DRAW_CARDS', uid: other.uid }, 3000)).toBe('NOT_YOUR_TURN');
    state.phase = 'turnStart';
    expect(rejected(state, { type: 'DRAW_CARDS', uid: boss }, 3000)).toBe('WRONG_PHASE');
  });
});

describe('opening a deal', () => {
  it('forces a roll before opening on turn 1 and every later turn', () => {
    const state = startGame(3, 31);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    expect(state.phase).toBe('turnStart');
    expect(state.pawnSpace).toBe(1);
    expect(rejected(state, { type: 'OPEN_DEAL', uid: boss }, 3000)).toBe('WRONG_PHASE');

    state.turnNumber = 2;
    state.dealsClosed = 1;
    arrangeTurn(state, boss, 6);
    expect(rejected(state, { type: 'OPEN_DEAL', uid: boss }, 3000)).toBe('WRONG_PHASE');

    const rolled = ok(state, { type: 'ROLL_DICE', uid: boss }, 3000).state;
    expect(rolled.phase).toBe('afterMove');
  });

  it('opens at the new space after a move', () => {
    const state = startGame(3, 32);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    state.pawnSpace = 11;

    const result = ok(state, { type: 'OPEN_DEAL', uid: boss }, 3000);
    expect(result.state.deal?.space).toBe(11);
  });

  it('rejects opening on a closed space', () => {
    const state = startGame(3, 33);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    state.pawnSpace = 5;
    state.closedSpaces = [5];
    expect(rejected(state, { type: 'OPEN_DEAL', uid: boss }, 3000)).toBe('SPACE_CLOSED');
  });

  it('rejects opening by another player or twice', () => {
    const state = startGame(3, 34);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    const other = state.players.find((player) => player.uid !== boss);
    if (!other) throw new Error('no other player');
    state.phase = 'afterMove';

    expect(rejected(state, { type: 'OPEN_DEAL', uid: other.uid }, 3000)).toBe('NOT_YOUR_TURN');
    const opened = ok(state, { type: 'OPEN_DEAL', uid: boss }, 3000).state;
    expect(rejected(opened, { type: 'OPEN_DEAL', uid: boss }, 3100)).toBe('WRONG_PHASE');
  });

  it('rejects invalid starting clan cards', () => {
    const state = startGame(3, 35);
    const boss = state.bossUid;
    if (!boss) throw new Error('no boss');
    state.phase = 'afterMove';
    expect(rejected(state, { type: 'OPEN_DEAL', uid: boss, clanCardIds: ['nope'] }, 3000)).toBe(
      'CARD_NOT_IN_HAND',
    );
  });
});

describe('lobby', () => {
  it('joins players in free seats and starts only with 3+', () => {
    let state = makeLobby(0, 41);
    state = ok(state, { type: 'JOIN', uid: 'p1', name: 'Alice' }, 1000).state;
    state = ok(state, { type: 'JOIN', uid: 'p2', name: 'Bob' }, 1001).state;
    expect(rejected(state, { type: 'START_GAME', uid: 'p1' }, 1002)).toBe('NOT_ENOUGH_PLAYERS');
    state = ok(state, { type: 'JOIN', uid: 'p3', name: 'Cara' }, 1003).state;
    expect(state.players.map((player) => player.seat)).toEqual([0, 1, 2]);
    expect(rejected(state, { type: 'JOIN', uid: 'p1', name: 'Again' }, 1004)).toBe('PLAYER_EXISTS');
    expect(rejected(state, { type: 'JOIN', uid: 'p4', name: '   ' }, 1005)).toBe('INVALID_NAME');
    expect(rejected(state, { type: 'JOIN', uid: 'p4', name: 'x'.repeat(17) }, 1006)).toBe(
      'INVALID_NAME',
    );

    state = ok(state, { type: 'START_GAME', uid: 'p1' }, 2000).state;
    expect(state.phase).toBe('turnStart');
    expect(state.pawnSpace).toBe(1);
    expect(state.players).toHaveLength(3);
  });

  it('reassigns seats only in the lobby and only to free seats', () => {
    let state = makeLobby(3, 42);
    state = ok(state, { type: 'REASSIGN_SEAT', uid: 'p1', targetUid: 'p3', seat: 4 }, 1000).state;
    expect(getPlayer(state, 'p3').seat).toBe(4);
    expect(
      rejected(state, { type: 'REASSIGN_SEAT', uid: 'p1', targetUid: 'p2', seat: 4 }, 1001),
    ).toBe('SEAT_TAKEN');
    const started = ok(state, { type: 'START_GAME', uid: 'p1' }, 2000).state;
    expect(started.players.map((player) => player.seat)).toEqual([0, 1, 2]);
    expect(
      rejected(started, { type: 'REASSIGN_SEAT', uid: 'p1', targetUid: 'p2', seat: 1 }, 3000),
    ).toBe('WRONG_PHASE');
  });

  it('leaves the lobby', () => {
    let state = makeLobby(3, 43);
    state = ok(state, { type: 'LEAVE', uid: 'p2' }, 1000).state;
    expect(state.players.map((player) => player.uid)).toEqual(['p1', 'p3']);
    expect(rejected(state, { type: 'LEAVE', uid: 'p2' }, 1001)).toBe('PLAYER_NOT_FOUND');
    arrangeTurn(state, 'p1', 2);
    expect(rejected(state, { type: 'LEAVE', uid: 'p1' }, 1002)).toBe('WRONG_PHASE');
  });
});
