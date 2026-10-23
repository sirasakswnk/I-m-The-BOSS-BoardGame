import { describe, expect, it } from 'vitest';

import { isDealComplete } from '../validators';
import {
  arrangeAfterMove,
  clanCard,
  getPlayer,
  lockAndResolve,
  ok,
  openDealAt,
  passWindowAll,
  rejected,
  setHand,
  setTableInvestors,
  startGame,
  travelCard,
} from './helpers';

describe('deal resolution', () => {
  it('closes the space, pays dividends and advances the turn', () => {
    const state = startGame(4, 42);
    setTableInvestors(state, { p1: ['green', 'yellow'] });
    setHand(state, 'p1', []);

    const opened = openDealAt(state, 'p1', 8);
    expect(opened.phase).toBe('dealOpen');
    expect(opened.deal?.tileNumber).toBe(1);
    expect(isDealComplete(opened)).toBe(true);

    const resolved = lockAndResolve(opened, 'p1', 5000);
    expect(resolved.phase).toBe('turnStart');
    expect(resolved.deal).toBeNull();
    expect(resolved.dealsClosed).toBe(1);
    expect(resolved.closedSpaces).toEqual([8]);
    expect(resolved.pawnSpace).toBe(9);
    expect(resolved.bossUid).toBe('p2');
    expect(getPlayer(resolved, 'p1').money).toBe(6);
    expect(resolved.log.some((event) => event.type === 'dealResolved')).toBe(true);
    // The next boss must roll instead of opening the following space directly.
    expect(rejected(resolved, { type: 'OPEN_DEAL', uid: 'p2' }, 5000)).toBe('WRONG_PHASE');
  });

  it('splits dividends with the offer owner', () => {
    const state = startGame(4, 7);
    setTableInvestors(state, { p1: ['red'], p2: ['black'] });
    setHand(state, 'p2', []);

    const opened = openDealAt(state, 'p1', 10);
    expect(isDealComplete(opened)).toBe(false);
    const offered = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards: [{ color: 'black', source: 'table' }], amount: 2 },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const resolved = lockAndResolve(accepted, 'p1', 5000);
    expect(getPlayer(resolved, 'p1').money).toBe(2);
    expect(getPlayer(resolved, 'p2').money).toBe(4);

    const event = resolved.log.find((entry) => entry.type === 'dealResolved');
    expect(event).toBeDefined();
    if (event?.type === 'dealResolved') {
      expect(event.totalPaid).toBe(6);
      expect(event.bossDividends).toBe(1);
      expect(event.valuePerDividend).toBe(2);
    }
  });

  it('requires every requirement group to be filled exactly', () => {
    const state = startGame(4, 8);
    setTableInvestors(state, { p1: ['red', 'blue', 'yellow'], p2: ['purple'] });
    setHand(state, 'p2', []);

    const opened = openDealAt(state, 'p1', 4);
    expect(opened.deal?.requirements.requiredInvestors).toBe(4);
    expect(isDealComplete(opened)).toBe(false);
    expect(rejected(opened, { type: 'LOCK_DEAL', uid: 'p1' }, 3100)).toBe('DEAL_INCOMPLETE');

    const offered = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards: [{ color: 'purple', source: 'table' }], amount: 1 },
      3200,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3300,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const resolved = lockAndResolve(accepted, 'p1', 5000);
    expect(getPlayer(resolved, 'p1').money).toBe(8);
    expect(getPlayer(resolved, 'p2').money).toBe(2);
  });

  it('unlocks the deal when a travel makes it incomplete', () => {
    const state = startGame(4, 9);
    setTableInvestors(state, { p1: ['red'], p2: ['black'] });
    setHand(state, 'p2', []);

    const opened = openDealAt(state, 'p1', 10);
    const offered = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards: [{ color: 'black', source: 'table' }], amount: 1 },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    const locked = ok(accepted, { type: 'LOCK_DEAL', uid: 'p1' }, 3300).state;

    const travel = travelCard('red');
    setHand(locked, 'p3', [travel]);
    const traveled = ok(
      locked,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p3',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'red' },
      },
      3400,
    ).state;
    const closed = passWindowAll(traveled, 3410);

    expect(closed.window).toBeNull();
    expect(closed.deal).not.toBeNull();
    expect(closed.deal?.locked).toBe(false);
    expect(closed.onVacation).toEqual(['red']);
    expect(isDealComplete(closed)).toBe(false);
  });
});

describe('completeness on multi-group spaces', () => {
  it('space 7 requires exactly one family from each pair', () => {
    const state = startGame(3, 60);
    setTableInvestors(state, { p1: ['blue', 'red', 'green'] });
    setHand(state, 'p1', []);
    const complete = openDealAt(state, 'p1', 7);
    expect(isDealComplete(complete)).toBe(true);

    const partial = startGame(3, 61);
    setTableInvestors(partial, { p1: ['blue', 'red'] });
    setHand(partial, 'p1', []);
    const incomplete = openDealAt(partial, 'p1', 7);
    expect(isDealComplete(incomplete)).toBe(false);
  });

  it('space 12 requires two of blue/yellow/black and one of green/purple', () => {
    const state = startGame(3, 62);
    setTableInvestors(state, { p1: ['blue', 'black', 'green'] });
    setHand(state, 'p1', []);
    const complete = openDealAt(state, 'p1', 12);
    expect(isDealComplete(complete)).toBe(true);

    const partial = startGame(3, 63);
    setTableInvestors(partial, { p1: ['blue', 'green'] });
    setHand(partial, 'p1', []);
    const incomplete = openDealAt(partial, 'p1', 12);
    expect(isDealComplete(incomplete)).toBe(false);
  });

  it('space 14 needs yellow, one of red/blue and one of green/purple', () => {
    const state = startGame(3, 64);
    setTableInvestors(state, { p1: ['yellow', 'red', 'green'] });
    setHand(state, 'p1', []);
    const complete = openDealAt(state, 'p1', 14);
    expect(isDealComplete(complete)).toBe(true);

    const partial = startGame(3, 65);
    setTableInvestors(partial, { p1: ['yellow', 'red'] });
    setHand(partial, 'p1', []);
    const incomplete = openDealAt(partial, 'p1', 14);
    expect(isDealComplete(incomplete)).toBe(false);

    const overfilled = startGame(3, 66);
    setTableInvestors(overfilled, { p1: ['yellow', 'red', 'blue', 'green'] });
    setHand(overfilled, 'p1', []);
    arrangeAfterMove(overfilled, 'p1', 14);
    expect(rejected(overfilled, { type: 'OPEN_DEAL', uid: 'p1' }, 3000)).toBe('INVALID_EXCLUSION');
    const resolved = ok(
      overfilled,
      { type: 'OPEN_DEAL', uid: 'p1', excludeColors: ['blue'] },
      3000,
    ).state;
    expect(resolved.deal?.excludedColors).toEqual(['blue']);
    expect(isDealComplete(resolved)).toBe(true);
  });
});

describe('boss exclusions and clans', () => {
  it('requires the boss to exclude enough overfilled families', () => {
    const state = startGame(4, 43);
    setTableInvestors(state, {
      p1: ['red', 'blue', 'green', 'yellow', 'purple'],
    });
    setHand(state, 'p1', []);
    arrangeAfterMove(state, 'p1', 2);

    expect(rejected(state, { type: 'OPEN_DEAL', uid: 'p1' }, 3000)).toBe('INVALID_EXCLUSION');

    const opened = ok(
      state,
      { type: 'OPEN_DEAL', uid: 'p1', excludeColors: ['purple'] },
      3000,
    ).state;
    expect(opened.deal?.excludedColors).toEqual(['purple']);
    expect(isDealComplete(opened)).toBe(true);
  });

  it('rejects excluding a family that would not overfill', () => {
    const state = startGame(4, 44);
    setTableInvestors(state, { p1: ['red', 'blue', 'black'] });
    setHand(state, 'p1', []);
    arrangeAfterMove(state, 'p1', 3);

    expect(rejected(state, { type: 'OPEN_DEAL', uid: 'p1', excludeColors: ['red'] }, 3000)).toBe(
      'INVALID_EXCLUSION',
    );

    const opened = ok(state, { type: 'OPEN_DEAL', uid: 'p1' }, 3000).state;
    expect(isDealComplete(opened)).toBe(true);
  });

  it('lets the boss replace a vacationing investor with a clan card of the same color', () => {
    const state = startGame(4, 45);
    setTableInvestors(state, { p1: ['red', 'black'] });
    state.onVacation = ['black'];
    const card = clanCard('black');
    setHand(state, 'p1', [card]);

    const opened = openDealAt(state, 'p1', 10, { clanCardIds: [card.id] });
    expect(isDealComplete(opened)).toBe(true);
    expect(getPlayer(opened, 'p1').hand).toHaveLength(0);
    expect(opened.deal?.bossClanCards).toHaveLength(1);

    const resolved = lockAndResolve(opened, 'p1', 5000);
    expect(resolved.onVacation).toEqual([]);
    expect(resolved.discardPile.some((entry) => entry.id === card.id)).toBe(true);
    expect(getPlayer(resolved, 'p1').money).toBe(6);
  });

  it('adds a boss clan card during an open deal', () => {
    const state = startGame(4, 46);
    setTableInvestors(state, { p1: ['green'] });
    const card = clanCard('yellow');
    setHand(state, 'p1', [card]);

    const opened = openDealAt(state, 'p1', 8);
    expect(isDealComplete(opened)).toBe(false);

    const added = ok(opened, { type: 'BOSS_ADD_CLAN', uid: 'p1', cardId: card.id }, 3100).state;
    expect(isDealComplete(added)).toBe(true);
    expect(getPlayer(added, 'p1').hand).toHaveLength(0);

    const resolved = lockAndResolve(added, 'p1', 4000);
    expect(getPlayer(resolved, 'p1').money).toBe(6);
  });

  it('rejects invalid exclusion changes', () => {
    const state = startGame(4, 47);
    setTableInvestors(state, { p1: ['red', 'blue', 'green'] });
    setHand(state, 'p1', []);
    const opened = openDealAt(state, 'p1', 4, { excludeColors: ['green'] });
    expect(opened.deal?.excludedColors).toEqual(['green']);

    expect(rejected(opened, { type: 'SET_EXCLUDED_COLORS', uid: 'p1', colors: [] }, 3100)).toBe(
      'INVALID_EXCLUSION',
    );

    const kept = ok(
      opened,
      { type: 'SET_EXCLUDED_COLORS', uid: 'p1', colors: ['red'] },
      3200,
    ).state;
    expect(kept.deal?.excludedColors).toEqual(['red']);
  });

  it('keeps accepted offers for vacationing investors when exclusions change', () => {
    const state = startGame(4, 49);
    setTableInvestors(state, { p1: ['red', 'blue'], p3: ['black'] });
    state.onVacation = ['blue'];
    const blueClan = clanCard('blue');
    setHand(state, 'p1', []);
    setHand(state, 'p2', [blueClan]);
    setHand(state, 'p3', []);

    const opened = openDealAt(state, 'p1', 3);
    expect(isDealComplete(opened)).toBe(false);

    const offeredClan = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'blue', source: 'hand', cardId: blueClan.id }],
        amount: 1,
      },
      3100,
    ).state;
    const offeredTable = ok(
      offeredClan,
      { type: 'SUBMIT_OFFER', uid: 'p3', cards: [{ color: 'black', source: 'table' }], amount: 1 },
      3200,
    ).state;
    const accepted = ok(
      ok(offeredTable, { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' }, 3300)
        .state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p3' },
      3400,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const updated = ok(
      accepted,
      { type: 'SET_EXCLUDED_COLORS', uid: 'p1', colors: [] },
      3500,
    ).state;
    expect(updated.deal?.accepted.blue).toBe('p2');
    expect(updated.deal?.accepted.black).toBe('p3');
    expect(isDealComplete(updated)).toBe(true);
  });

  it('requires unaccepting a whole offer before re-including its family', () => {
    const state = startGame(4, 50);
    setTableInvestors(state, {
      p1: ['red', 'blue', 'green', 'yellow'],
      p2: ['purple'],
      p3: ['black'],
    });
    const greenClan = clanCard('green');
    const blackClan = clanCard('black');
    setHand(state, 'p1', []);
    setHand(state, 'p2', [greenClan, blackClan]);
    setHand(state, 'p3', []);

    const opened = openDealAt(state, 'p1', 4, { excludeColors: ['green'] });
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'green', source: 'hand', cardId: greenClan.id },
          { color: 'black', source: 'hand', cardId: blackClan.id },
        ],
        amount: 1,
      },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(accepted.deal?.accepted.green).toBe('p2');
    expect(accepted.deal?.accepted.black).toBe('p2');

    // Re-including green would make the boss's investor and the accepted offer
    // share a family. The boss must unaccept the whole grouped offer first.
    expect(
      rejected(
        accepted,
        { type: 'SET_EXCLUDED_COLORS', uid: 'p1', colors: ['red'] },
        3300,
      ),
    ).toBe('COLOR_ALREADY_IN_DEAL');
    expect(accepted.deal?.accepted).toEqual({ green: 'p2', black: 'p2' });

    const unaccepted = ok(
      accepted,
      { type: 'UNACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3400,
    ).state;
    expect(unaccepted.deal?.accepted).toEqual({});
    expect(unaccepted.deal?.offers.p2?.cards).toHaveLength(2);

    const updated = ok(
      unaccepted,
      { type: 'SET_EXCLUDED_COLORS', uid: 'p1', colors: ['red'] },
      3500,
    ).state;
    expect(updated.deal?.excludedColors).toEqual(['red']);
    expect(updated.deal?.accepted).toEqual({});
  });
});

describe('failing a deal', () => {
  it('returns boss clans and hand offers, discards action cards and ends the turn', () => {
    const state = startGame(4, 48);
    setTableInvestors(state, {
      p1: ['red', 'blue'],
      p2: ['black'],
      p3: ['yellow'],
    });
    const bossClan = clanCard('green');
    const offerClan = clanCard('purple');
    const travel = travelCard('red');
    setHand(state, 'p1', [bossClan]);
    setHand(state, 'p2', [offerClan]);
    setHand(state, 'p3', [travel]);

    const opened = openDealAt(state, 'p1', 4, { clanCardIds: [bossClan.id] });
    expect(isDealComplete(opened)).toBe(false);

    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'purple', source: 'hand', cardId: offerClan.id }],
        amount: 1,
      },
      3100,
    ).state;
    const traveled = ok(
      offered,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p3',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'red' },
      },
      3200,
    ).state;
    const closed = passWindowAll(traveled, 3210);
    expect(closed.deal).not.toBeNull();

    const failed = ok(closed, { type: 'FAIL_DEAL', uid: 'p1' }, 4000).state;
    expect(failed.deal).toBeNull();
    expect(failed.phase).toBe('turnStart');
    expect(failed.bossUid).toBe('p2');
    expect(failed.closedSpaces).toEqual([]);
    expect(failed.onVacation).toEqual([]);
    expect(getPlayer(failed, 'p1').hand.some((card) => card.id === bossClan.id)).toBe(true);
    expect(getPlayer(failed, 'p2').hand.some((card) => card.id === offerClan.id)).toBe(true);
    expect(failed.discardPile.some((card) => card.id === travel.id)).toBe(true);
  });
});

describe('offers', () => {
  function openSpaceFour() {
    const state = startGame(4, 50);
    setTableInvestors(state, { p1: ['red', 'blue'], p2: ['yellow', 'purple'], p3: ['green'] });
    setHand(state, 'p2', []);
    setHand(state, 'p3', []);
    return openDealAt(state, 'p1', 4);
  }

  it('keeps one multi-card offer per player and updates it in place', () => {
    const opened = openSpaceFour();
    const cards = [
      { color: 'yellow' as const, source: 'table' as const },
      { color: 'purple' as const, source: 'table' as const },
    ];
    let state = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards, amount: 1 },
      3100,
    ).state;
    expect(state.deal?.offers.p2?.cards).toEqual(cards);
    expect(state.deal?.offers.p2?.amount).toBe(1);
    expect(Object.keys(state.deal?.offers ?? {})).toEqual(['p2']);

    state = ok(
      state,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards, amount: 2 },
      3200,
    ).state;
    expect(state.deal?.offers.p2?.cards).toEqual(cards);
    expect(state.deal?.offers.p2?.amount).toBe(2);
    expect(
      rejected(
        state,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p2',
          cards: [cards[0], cards[0]],
          amount: 2,
        },
        3300,
      ),
    ).toBe('INVALID_ACTION');
  });

  it('returns removed clan cards to hand and removes an empty offer', () => {
    const opened = openSpaceFour();
    const hand = clanCard('yellow');
    setHand(opened, 'p2', [hand]);

    let state = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'hand', cardId: hand.id },
          { color: 'purple', source: 'table' },
        ],
        amount: 1,
      },
      3100,
    ).state;
    expect(getPlayer(state, 'p2').hand.some((card) => card.id === hand.id)).toBe(false);

    state = ok(
      state,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'purple', source: 'table' }],
        amount: 1,
      },
      3200,
    ).state;
    expect(getPlayer(state, 'p2').hand.some((card) => card.id === hand.id)).toBe(true);
    expect(state.deal?.offers.p2?.cards).toEqual([{ color: 'purple', source: 'table' }]);

    state = ok(
      state,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards: [], amount: 1 },
      3300,
    ).state;
    expect(state.deal?.offers.p2).toBeUndefined();
  });

  it('rejects invalid offer submissions', () => {
    const opened = openSpaceFour();
    expect(
      rejected(
        opened,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p1',
          cards: [{ color: 'red', source: 'table' }],
          amount: 1,
        },
        3100,
      ),
    ).toBe('CANNOT_OFFER_AS_BOSS');
    expect(
      rejected(
        opened,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p2',
          cards: [{ color: 'yellow', source: 'table' }],
          amount: 0,
        },
        3100,
      ),
    ).toBe('INVALID_AMOUNT');
    expect(
      rejected(
        opened,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p2',
          cards: [{ color: 'black', source: 'table' }],
          amount: 1,
        },
        3100,
      ),
    ).toBe('INVALID_TARGET');
    expect(
      rejected(
        opened,
        { type: 'SUBMIT_OFFER', uid: 'p2', cards: [], amount: 1 },
        3100,
      ),
    ).toBe('OFFER_NOT_FOUND');

    const hand = clanCard('yellow');
    setHand(opened, 'p2', [hand]);
    expect(
      rejected(
        opened,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p2',
          cards: [{ color: 'purple', source: 'hand', cardId: hand.id }],
          amount: 1,
        },
        3100,
      ),
    ).toBe('INVALID_TARGET');
  });

  it('accepts every card together and revokes acceptance when the offer is edited', () => {
    const opened = openSpaceFour();
    const cards = [
      { color: 'yellow' as const, source: 'table' as const },
      { color: 'purple' as const, source: 'table' as const },
    ];
    let state = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards, amount: 1 },
      3100,
    ).state;
    state = ok(
      state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(state.deal?.accepted).toEqual({ yellow: 'p2', purple: 'p2' });
    expect(isDealComplete(state)).toBe(true);

    state = ok(
      state,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards, amount: 2 },
      3300,
    ).state;
    expect(state.deal?.accepted).toEqual({});
    expect(state.deal?.offers.p2?.amount).toBe(2);
    expect(isDealComplete(state)).toBe(false);
  });

  it('requires the boss to unaccept a conflicting offer before another can take its color', () => {
    const opened = openSpaceFour();
    const yellowClan = clanCard('yellow');
    setHand(opened, 'p3', [yellowClan]);

    let state = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'yellow', source: 'table' }],
        amount: 1,
      },
      3100,
    ).state;
    state = ok(
      state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(
      rejected(
        state,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p3',
          cards: [{ color: 'yellow', source: 'hand', cardId: yellowClan.id }],
          amount: 1,
        },
        3300,
      ),
    ).toBe('COLOR_ALREADY_IN_DEAL');

    state = ok(
      state,
      { type: 'UNACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3400,
    ).state;
    state = ok(
      state,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p3',
        cards: [{ color: 'yellow', source: 'hand', cardId: yellowClan.id }],
        amount: 1,
      },
      3500,
    ).state;
    expect(state.deal?.offers.p3?.cards).toMatchObject([
      { color: 'yellow', source: 'hand' },
    ]);
  });

  it('withdraws a whole offer, returning clan cards and clearing acceptance', () => {
    const opened = openSpaceFour();
    const hand = clanCard('purple');
    setHand(opened, 'p2', [hand]);

    let state = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'table' },
          { color: 'purple', source: 'hand', cardId: hand.id },
        ],
        amount: 1,
      },
      3100,
    ).state;
    state = ok(
      state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(state.deal?.accepted).toEqual({ yellow: 'p2', purple: 'p2' });

    state = ok(state, { type: 'WITHDRAW_OFFER', uid: 'p2' }, 3300).state;
    expect(state.deal?.offers.p2).toBeUndefined();
    expect(state.deal?.accepted).toEqual({});
    expect(getPlayer(state, 'p2').hand.some((card) => card.id === hand.id)).toBe(true);
    expect(
      rejected(state, { type: 'WITHDRAW_OFFER', uid: 'p2' }, 3400),
    ).toBe('OFFER_NOT_FOUND');
  });

  it('pays a multi-card offer once regardless of its color count', () => {
    const opened = openSpaceFour();
    const cards = [
      { color: 'yellow' as const, source: 'table' as const },
      { color: 'purple' as const, source: 'table' as const },
    ];
    const offered = ok(
      opened,
      { type: 'SUBMIT_OFFER', uid: 'p2', cards, amount: 2 },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const resolved = lockAndResolve(accepted, 'p1', 5000);
    const event = resolved.log.find((entry) => entry.type === 'dealResolved');
    expect(event?.type).toBe('dealResolved');
    if (event?.type !== 'dealResolved') return;

    expect(event.accepted).toHaveLength(1);
    expect(event.accepted[0]?.uid).toBe('p2');
    expect(event.accepted[0]?.amount).toBe(2);
    expect(event.accepted[0]?.colors).toEqual(['yellow', 'purple']);
    expect(getPlayer(resolved, 'p2').money).toBe(2 * event.valuePerDividend);
    expect(getPlayer(resolved, 'p1').money).toBe(3 * event.valuePerDividend);
  });

  it('blocks offer edits while the lock window is open', () => {
    const opened = openSpaceFour();
    let state = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'table' },
          { color: 'purple', source: 'table' },
        ],
        amount: 1,
      },
      3100,
    ).state;
    state = ok(
      state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(isDealComplete(state)).toBe(true);

    const locked = ok(state, { type: 'LOCK_DEAL', uid: 'p1' }, 4000).state;
    expect(
      rejected(
        locked,
        {
          type: 'SUBMIT_OFFER',
          uid: 'p3',
          cards: [{ color: 'green', source: 'table' }],
          amount: 1,
        },
        4010,
      ),
    ).toBe('WINDOW_OPEN');
  });

  it('rejects dividends above the tile total', () => {
    const opened = openSpaceFour();
    let state = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'yellow', source: 'table' }],
        amount: 4,
      },
      3100,
    ).state;
    state = ok(
      state,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p3',
        cards: [{ color: 'green', source: 'table' }],
        amount: 2,
      },
      3200,
    ).state;
    state = ok(
      state,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3300,
    ).state;
    expect(
      rejected(state, { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p3' }, 3400),
    ).toBe('DIVIDENDS_EXCEEDED');
  });

  it('rejects non-required colors at acceptance and own offers', () => {
    const state = startGame(4, 51);
    setTableInvestors(state, { p1: ['red', 'blue', 'black'], p4: ['green'] });
    setHand(state, 'p2', []);
    setHand(state, 'p4', []);
    const opened = openDealAt(state, 'p1', 3);
    expect(isDealComplete(opened)).toBe(true);

    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p4',
        cards: [{ color: 'green', source: 'table' }],
        amount: 1,
      },
      3100,
    ).state;
    expect(
      rejected(offered, { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p4' }, 3200),
    ).toBe('COLOR_NOT_REQUIRED');
    expect(
      rejected(offered, { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p1' }, 3200),
    ).toBe('CANNOT_ACCEPT_OWN_OFFER');
  });
});
