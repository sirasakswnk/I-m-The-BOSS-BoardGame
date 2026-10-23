import { describe, expect, it } from 'vitest';

import { isDealComplete } from '../validators';
import {
  clanCard,
  getPlayer,
  imTheBossCard,
  lockAndResolve,
  ok,
  openDealAt,
  passWindowAll,
  recruitmentCard,
  rejected,
  setHand,
  setTableInvestors,
  startGame,
  stopCard,
  travelCard,
} from './helpers';

describe('travel', () => {
  it('sends an investor on vacation until the deal ends', () => {
    const state = startGame(4, 70);
    setTableInvestors(state, { p1: ['green'], p2: ['yellow'] });
    const travel = travelCard('green');
    setHand(state, 'p2', [travel]);

    const opened = openDealAt(state, 'p1', 8);
    const played = ok(
      opened,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      3100,
    ).state;
    expect(played.pendingCards).toHaveLength(1);
    expect(played.window?.triggeredBy).toBe('p2');
    expect(getPlayer(played, 'p2').hand).toHaveLength(0);

    const closed = passWindowAll(played, 3110);
    expect(closed.pendingCards).toEqual([]);
    expect(closed.onVacation).toEqual(['green']);
    expect(closed.deal?.actionCards.some((card) => card.id === travel.id)).toBe(true);
    expect(closed.log.some((event) => event.type === 'cardResolved')).toBe(true);

    const failed = ok(closed, { type: 'FAIL_DEAL', uid: 'p1' }, 4000).state;
    expect(failed.onVacation).toEqual([]);
    expect(failed.discardPile.some((card) => card.id === travel.id)).toBe(true);
  });

  it('discards a hand offer clan card when traveled', () => {
    const state = startGame(4, 71);
    setTableInvestors(state, { p1: ['red', 'blue'] });
    const offeredClan = clanCard('purple');
    const travel = travelCard('purple');
    setHand(state, 'p2', [offeredClan]);
    setHand(state, 'p3', [travel]);

    const opened = openDealAt(state, 'p1', 4);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'purple', source: 'hand', cardId: offeredClan.id }],
        amount: 1,
      },
      3100,
    ).state;

    const played = ok(
      offered,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p3',
        cardId: travel.id,
        target: { kind: 'clan', uid: 'p2', color: 'purple', placement: 'offer' },
      },
      3200,
    ).state;
    const closed = passWindowAll(played, 3210);

    expect(closed.deal?.offers.p2).toBeUndefined();
    expect(closed.discardPile.some((card) => card.id === offeredClan.id)).toBe(true);
    expect(closed.discardPile.some((card) => card.id === travel.id)).toBe(true);
    expect(closed.log.some((event) => event.type === 'cardResolved')).toBe(true);
  });

  it('removes one card from an accepted multi-card offer and revokes acceptance', () => {
    const state = startGame(4, 74);
    setTableInvestors(state, { p1: ['red', 'blue'], p2: ['yellow'] });
    const offeredClan = clanCard('purple');
    const travel = travelCard('purple');
    setHand(state, 'p2', [offeredClan]);
    setHand(state, 'p3', [travel]);

    const opened = openDealAt(state, 'p1', 4);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'table' },
          { color: 'purple', source: 'hand', cardId: offeredClan.id },
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
    expect(accepted.deal?.accepted).toEqual({ yellow: 'p2', purple: 'p2' });
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p3',
        cardId: travel.id,
        target: { kind: 'clan', uid: 'p2', color: 'purple', placement: 'offer' },
      },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);

    expect(closed.deal?.offers.p2?.cards).toEqual([{ color: 'yellow', source: 'table' }]);
    expect(closed.deal?.accepted).toEqual({});
    expect(closed.discardPile.some((card) => card.id === offeredClan.id)).toBe(true);
    expect(isDealComplete(closed)).toBe(false);
  });

  it('discards a boss clan card when traveled', () => {
    const state = startGame(4, 72);
    setTableInvestors(state, { p1: ['green'] });
    const bossClan = clanCard('yellow');
    const travel = travelCard('yellow');
    setHand(state, 'p1', [bossClan]);
    setHand(state, 'p2', [travel]);

    const opened = openDealAt(state, 'p1', 8, { clanCardIds: [bossClan.id] });
    expect(isDealComplete(opened)).toBe(true);

    const played = ok(
      opened,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'clan', uid: 'p1', color: 'yellow', placement: 'bossClan' },
      },
      3100,
    ).state;
    const closed = passWindowAll(played, 3110);

    expect(closed.deal?.bossClanCards).toEqual([]);
    expect(isDealComplete(closed)).toBe(false);
    expect(closed.discardPile.some((card) => card.id === bossClan.id)).toBe(true);
    expect(closed.discardPile.some((card) => card.id === travel.id)).toBe(true);
  });

  it('rejects mismatched, self, missing and vacation targets', () => {
    const state = startGame(4, 73);
    setTableInvestors(state, { p1: ['green'], p2: ['yellow'] });
    const travel = travelCard('red');
    setHand(state, 'p2', [travel]);
    const opened = openDealAt(state, 'p1', 8);

    expect(
      rejected(
        opened,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: travel.id,
          target: { kind: 'investor', uid: 'p1', color: 'green' },
        },
        3100,
      ),
    ).toBe('INVALID_TARGET');

    const greenTravel = travelCard('green');
    setHand(opened, 'p2', [greenTravel]);
    expect(
      rejected(
        opened,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: greenTravel.id,
          target: { kind: 'investor', uid: 'p2', color: 'green' },
        },
        3100,
      ),
    ).toBe('TARGET_IS_SELF');

    expect(
      rejected(
        opened,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: greenTravel.id,
          target: { kind: 'investor', uid: 'p3', color: 'green' },
        },
        3100,
      ),
    ).toBe('INVALID_TARGET');

    opened.onVacation = ['green'];
    expect(
      rejected(
        opened,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: greenTravel.id,
          target: { kind: 'investor', uid: 'p1', color: 'green' },
        },
        3100,
      ),
    ).toBe('COLOR_ON_VACATION');

    expect(
      rejected(
        opened,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: greenTravel.id,
          target: { kind: 'clan', uid: 'p2', color: 'green', placement: 'offer' },
        },
        3100,
      ),
    ).toBe('INVALID_TARGET');
  });

  it('cannot travel outside an open deal', () => {
    const state = startGame(4, 74);
    const travel = travelCard('wild');
    setHand(state, 'p2', [travel]);
    expect(
      rejected(
        state,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p2',
          cardId: travel.id,
          target: { kind: 'investor', uid: 'p1', color: 'green' },
        },
        3100,
      ),
    ).toBe('WRONG_PHASE');
  });
});

describe('stop', () => {
  function stopSetup() {
    const state = startGame(4, 80);
    setTableInvestors(state, { p1: ['green'] });
    const travel = travelCard('green');
    const stop = stopCard();
    setHand(state, 'p2', [travel]);
    setHand(state, 'p3', [stop]);
    return { state, travel, stop };
  }

  it('cancels a pending travel and discards both cards', () => {
    const { state, travel, stop } = stopSetup();
    const opened = openDealAt(state, 'p1', 8);
    const attempted = ok(
      opened,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      3100,
    ).state;
    const pendingId = attempted.pendingCards[0].id;

    const stopped = ok(
      attempted,
      { type: 'PLAY_STOP', uid: 'p3', cardId: stop.id, targetPendingId: pendingId },
      3200,
    ).state;
    expect(stopped.window?.triggeredBy).toBe('p3');
    expect(stopped.discardPile.some((card) => card.id === stop.id)).toBe(true);
    expect(stopped.pendingCards[0].stoppedBy).toBe('p3');

    const closed = passWindowAll(stopped, 3210);
    expect(closed.onVacation).toEqual([]);
    expect(closed.pendingCards).toEqual([]);
    expect(closed.discardPile.some((card) => card.id === travel.id)).toBe(true);
    expect(closed.log.some((event) => event.type === 'cardStopped')).toBe(true);
    expect(closed.log.some((event) => event.type === 'cardResolved')).toBe(false);
  });

  it('rejects stopping your own card or stopping twice', () => {
    const { state, travel, stop } = stopSetup();
    const secondStop = stopCard();
    const notStop = clanCard('green');
    setHand(state, 'p4', [secondStop]);
    setHand(state, 'p2', [travel, notStop]);
    const opened = openDealAt(state, 'p1', 8);
    const attempted = ok(
      opened,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      3100,
    ).state;
    const pendingId = attempted.pendingCards[0].id;

    expect(
      rejected(
        attempted,
        { type: 'PLAY_STOP', uid: 'p2', cardId: notStop.id, targetPendingId: pendingId },
        3200,
      ),
    ).toBe('WRONG_CARD_KIND');

    const stopped = ok(
      attempted,
      { type: 'PLAY_STOP', uid: 'p3', cardId: stop.id, targetPendingId: pendingId },
      3200,
    ).state;
    expect(
      rejected(
        stopped,
        { type: 'PLAY_STOP', uid: 'p4', cardId: secondStop.id, targetPendingId: pendingId },
        3300,
      ),
    ).toBe('STOP_ALREADY_PLAYED');
  });

  it('cannot stop your own card', () => {
    const state = startGame(4, 81);
    setTableInvestors(state, { p1: ['green'] });
    const travel = travelCard('green');
    const stop = stopCard();
    setHand(state, 'p2', [travel, stop]);
    const opened = openDealAt(state, 'p1', 8);
    const attempted = ok(
      opened,
      {
        type: 'PLAY_TRAVEL',
        uid: 'p2',
        cardId: travel.id,
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      3100,
    ).state;
    expect(
      rejected(
        attempted,
        {
          type: 'PLAY_STOP',
          uid: 'p2',
          cardId: stop.id,
          targetPendingId: attempted.pendingCards[0].id,
        },
        3200,
      ),
    ).toBe('CANNOT_STOP_OWN_CARD');
  });

  it('requires an open window and a pending card', () => {
    const state = startGame(4, 82);
    setTableInvestors(state, { p1: ['green'] });
    const stop = stopCard();
    setHand(state, 'p2', [stop]);
    const opened = openDealAt(state, 'p1', 8);
    expect(
      rejected(
        opened,
        { type: 'PLAY_STOP', uid: 'p2', cardId: stop.id, targetPendingId: 'p1' },
        3100,
      ),
    ).toBe('NO_WINDOW');
  });
});

describe('recruitment', () => {
  it('takes an unclaimed investor and discards the three cards', () => {
    const state = startGame(4, 90);
    setTableInvestors(state, { p1: ['green'] }, ['yellow', 'purple']);
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p2', cards);

    const opened = openDealAt(state, 'p1', 8);
    const played = ok(
      opened,
      { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: cards.map((card) => card.id), targetColor: 'yellow' },
      3100,
    ).state;
    expect(played.pendingCards[0].target).toEqual({ kind: 'recruit', color: 'yellow' });

    const closed = passWindowAll(played, 3110);
    expect(getPlayer(closed, 'p2').investors).toContain('yellow');
    expect(closed.unclaimedInvestors).toEqual(['purple']);
    for (const card of cards) {
      expect(closed.discardPile.some((entry) => entry.id === card.id)).toBe(true);
    }
    expect(closed.log.some((event) => event.type === 'cardResolved')).toBe(true);
  });

  it('transfers an investor from another player and removes the accepted offer', () => {
    const state = startGame(4, 91);
    setTableInvestors(state, { p1: ['red'], p2: ['black'], p3: ['yellow'] });
    setHand(state, 'p2', []);
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p3', cards);

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
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      { type: 'PLAY_RECRUITMENT', uid: 'p3', cardIds: cards.map((card) => card.id), targetColor: 'black' },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);

    expect(getPlayer(closed, 'p2').investors).not.toContain('black');
    expect(getPlayer(closed, 'p3').investors).toContain('black');
    expect(closed.deal?.offers.p2).toBeUndefined();
    expect(closed.deal?.accepted.black).toBeUndefined();
    expect(isDealComplete(closed)).toBe(false);
  });

  it('removes a recruited investor from a multi-card accepted offer', () => {
    const state = startGame(4, 95);
    setTableInvestors(state, { p1: ['red', 'blue'], p2: ['yellow'] });
    const offeredClan = clanCard('purple');
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p2', [offeredClan]);
    setHand(state, 'p3', cards);

    const opened = openDealAt(state, 'p1', 4);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'table' },
          { color: 'purple', source: 'hand', cardId: offeredClan.id },
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
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      {
        type: 'PLAY_RECRUITMENT',
        uid: 'p3',
        cardIds: cards.map((card) => card.id),
        targetColor: 'yellow',
      },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);

    expect(getPlayer(closed, 'p2').investors).not.toContain('yellow');
    expect(getPlayer(closed, 'p3').investors).toContain('yellow');
    expect(closed.deal?.offers.p2?.cards).toEqual([
      { color: 'purple', source: 'hand', card: expect.objectContaining({ id: offeredClan.id }) },
    ]);
    expect(closed.deal?.accepted).toEqual({});
    expect(isDealComplete(closed)).toBe(false);
  });

  it('keeps an investor on vacation after recruitment', () => {
    const state = startGame(4, 92);
    setTableInvestors(state, { p1: ['red'], p3: ['black'] });
    state.onVacation = ['black'];
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p2', cards);

    const opened = openDealAt(state, 'p1', 10);
    const played = ok(
      opened,
      { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: cards.map((card) => card.id), targetColor: 'black' },
      3100,
    ).state;
    const closed = passWindowAll(played, 3110);
    expect(getPlayer(closed, 'p2').investors).toContain('black');
    expect(closed.onVacation).toEqual(['black']);

    const failed = ok(closed, { type: 'FAIL_DEAL', uid: 'p1' }, 4000).state;
    expect(failed.onVacation).toEqual([]);
  });

  it('keeps an accepted hand offer when the boss recruits a vacationing family', () => {
    const state = startGame(4, 93);
    setTableInvestors(state, { p1: ['red'], p3: ['black'] });
    state.onVacation = ['black'];
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    const blackClan = clanCard('black');
    setHand(state, 'p1', cards);
    setHand(state, 'p2', [blackClan]);
    setHand(state, 'p3', []);

    const opened = openDealAt(state, 'p1', 10);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'black', source: 'hand', cardId: blackClan.id }],
        amount: 1,
      },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      {
        type: 'PLAY_RECRUITMENT',
        uid: 'p1',
        cardIds: cards.map((card) => card.id),
        targetColor: 'black',
      },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);

    expect(getPlayer(closed, 'p1').investors).toContain('black');
    expect(getPlayer(closed, 'p3').investors).not.toContain('black');
    expect(closed.deal?.accepted.black).toBe('p2');
    expect(closed.onVacation).toEqual(['black']);
    expect(isDealComplete(closed)).toBe(true);
  });

  it('revokes a whole multi-card acceptance when the boss recruits its family', () => {
    const state = startGame(4, 96);
    setTableInvestors(state, { p1: ['red', 'blue'], p2: ['yellow'], p3: ['black'] });
    const blackClan = clanCard('black');
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p1', cards);
    setHand(state, 'p2', [blackClan]);
    setHand(state, 'p3', []);

    const opened = openDealAt(state, 'p1', 4);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [
          { color: 'yellow', source: 'table' },
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
    expect(accepted.deal?.accepted).toEqual({ yellow: 'p2', black: 'p2' });
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      {
        type: 'PLAY_RECRUITMENT',
        uid: 'p1',
        cardIds: cards.map((card) => card.id),
        targetColor: 'black',
      },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);

    expect(getPlayer(closed, 'p1').investors).toContain('black');
    expect(closed.deal?.offers.p2?.cards).toHaveLength(2);
    expect(closed.deal?.accepted).toEqual({});
    expect(isDealComplete(closed)).toBe(false);
  });

  it('rejects invalid card sets and targets', () => {
    const state = startGame(4, 93);
    setTableInvestors(state, { p1: ['red'], p2: ['green'] }, ['black']);
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    setHand(state, 'p2', cards);
    const opened = openDealAt(state, 'p1', 10);

    expect(
      rejected(
        opened,
        { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: [cards[0].id, cards[1].id], targetColor: 'black' },
        3100,
      ),
    ).toBe('INVALID_RECRUITMENT_CARDS');

    expect(
      rejected(
        opened,
        { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: cards.map((card) => card.id), targetColor: 'red' },
        3100,
      ),
    ).toBe('UNCLAIMED_INVESTORS_REMAIN');

    const noUnclaimed = structuredClone(opened);
    noUnclaimed.unclaimedInvestors = [];
    expect(
      rejected(
        noUnclaimed,
        { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: cards.map((card) => card.id), targetColor: 'yellow' },
        3100,
      ),
    ).toBe('NO_INVESTOR_TARGET');

    expect(
      rejected(
        noUnclaimed,
        { type: 'PLAY_RECRUITMENT', uid: 'p2', cardIds: cards.map((card) => card.id), targetColor: 'green' },
        3100,
      ),
    ).toBe('TARGET_IS_SELF');

    const nonRecruitment = travelCard('wild');
    setHand(noUnclaimed, 'p4', [nonRecruitment]);
    expect(
      rejected(
        noUnclaimed,
        {
          type: 'PLAY_RECRUITMENT',
          uid: 'p4',
          cardIds: [nonRecruitment.id, 'missing-a', 'missing-b'],
          targetColor: 'green',
        },
        3100,
      ),
    ).toBe('CARD_NOT_IN_HAND');
  });
});

describe('pending resolution order', () => {
  function pendingSetup(seed: number, firstAt: number, secondAt: number, recruitmentFirst: boolean) {
    const state = startGame(4, seed);
    setTableInvestors(state, { p1: ['green'] });
    const cards = [recruitmentCard(), recruitmentCard(), recruitmentCard()];
    const travel = travelCard('green');
    setHand(state, 'p2', cards);
    setHand(state, 'p3', [travel]);
    const opened = openDealAt(state, 'p1', 8);

    let current = opened;
    if (recruitmentFirst) {
      current = ok(
        current,
        {
          type: 'PLAY_RECRUITMENT',
          uid: 'p2',
          cardIds: cards.map((card) => card.id),
          targetColor: 'green',
        },
        firstAt,
      ).state;
      current = ok(
        current,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p3',
          cardId: travel.id,
          target: { kind: 'investor', uid: 'p1', color: 'green' },
        },
        secondAt,
      ).state;
    } else {
      current = ok(
        current,
        {
          type: 'PLAY_TRAVEL',
          uid: 'p3',
          cardId: travel.id,
          target: { kind: 'investor', uid: 'p1', color: 'green' },
        },
        firstAt,
      ).state;
      current = ok(
        current,
        {
          type: 'PLAY_RECRUITMENT',
          uid: 'p2',
          cardIds: cards.map((card) => card.id),
          targetColor: 'green',
        },
        secondAt,
      ).state;
    }

    return { state: current, cards, travel };
  }

  it('resolves equal timestamps by play sequence', () => {
    const { state } = pendingSetup(94, 3100, 3100, false);
    expect(state.pendingCards.map((pending) => pending.kind)).toEqual([
      'travel',
      'recruitment',
    ]);

    const closed = passWindowAll(state, 3110);
    expect(closed.onVacation).toEqual(['green']);
    expect(getPlayer(closed, 'p2').investors).toContain('green');
    expect(getPlayer(closed, 'p1').investors).not.toContain('green');
    expect(closed.log.filter((event) => event.type === 'cardResolved')).toHaveLength(2);
    expect(closed.log.some((event) => event.type === 'cardFizzled')).toBe(false);
  });

  it('fizzles a travel whose investor moved first', () => {
    const { state } = pendingSetup(95, 3100, 3110, true);
    const closed = passWindowAll(state, 3120);

    expect(getPlayer(closed, 'p2').investors).toContain('green');
    expect(closed.onVacation).toEqual([]);
    expect(closed.log.filter((event) => event.type === 'cardResolved')).toHaveLength(1);
    const fizzled = closed.log.find((event) => event.type === 'cardFizzled');
    expect(fizzled?.type).toBe('cardFizzled');
    if (fizzled?.type === 'cardFizzled') {
      expect(fizzled.kind).toBe('travel');
    }
  });
});

describe('imTheBoss', () => {
  it('steals the boss role and turns old free investors into minimum offers', () => {
    const state = startGame(4, 100);
    setTableInvestors(state, { p1: ['green', 'yellow'] });
    const steal = imTheBossCard();
    setHand(state, 'p2', [steal]);

    const opened = openDealAt(state, 'p1', 8);
    expect(isDealComplete(opened)).toBe(true);

    const played = ok(
      opened,
      { type: 'PLAY_IM_THE_BOSS', uid: 'p2', cardId: steal.id },
      3100,
    ).state;
    const closed = passWindowAll(played, 3110);

    expect(closed.bossUid).toBe('p2');
    expect(closed.deal?.locked).toBe(false);
    expect(closed.deal?.accepted).toEqual({});
    expect(closed.deal?.excludedColors).toEqual([]);
    expect(closed.deal?.offers.p1?.cards).toEqual([
      { color: 'green', source: 'table' },
      { color: 'yellow', source: 'table' },
    ]);
    expect(closed.deal?.offers.p1?.amount).toBe(1);
    expect(closed.log.some((event) => event.type === 'bossStolen')).toBe(true);

    const accepted = ok(
      closed,
      { type: 'ACCEPT_OFFER', uid: 'p2', targetUid: 'p1' },
      4000,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const resolved = lockAndResolve(accepted, 'p2', 5000);
    expect(getPlayer(resolved, 'p1').money).toBe(2);
    expect(getPlayer(resolved, 'p2').money).toBe(4);
    expect(resolved.discardPile.some((card) => card.id === steal.id)).toBe(true);
  });

  it('converts old boss clan cards into hand offers', () => {
    const state = startGame(4, 101);
    setTableInvestors(state, { p1: ['green'] });
    const clan = clanCard('yellow');
    const steal = imTheBossCard();
    setHand(state, 'p1', [clan]);
    setHand(state, 'p2', [steal]);

    const opened = openDealAt(state, 'p1', 8, { clanCardIds: [clan.id] });
    expect(isDealComplete(opened)).toBe(true);

    const closed = passWindowAll(
      ok(opened, { type: 'PLAY_IM_THE_BOSS', uid: 'p2', cardId: steal.id }, 3100).state,
      3110,
    );
    const handOffer = closed.deal?.offers.p1;
    expect(handOffer?.cards).toEqual([
      { color: 'green', source: 'table' },
      { color: 'yellow', source: 'hand', card: expect.objectContaining({ id: clan.id }) },
    ]);
    expect(handOffer?.amount).toBe(1);

    const accepted = ok(
      closed,
      { type: 'ACCEPT_OFFER', uid: 'p2', targetUid: 'p1' },
      4000,
    ).state;
    const resolved = lockAndResolve(accepted, 'p2', 5000);
    expect(getPlayer(resolved, 'p1').money).toBe(2);
    expect(getPlayer(resolved, 'p2').money).toBe(4);
    expect(resolved.discardPile.some((card) => card.id === clan.id)).toBe(true);
  });

  it('keeps the new boss hand offer as a free clan card', () => {
    const state = startGame(4, 102);
    setTableInvestors(state, { p1: ['green'] });
    const clan = clanCard('yellow');
    const steal = imTheBossCard();
    setHand(state, 'p2', [clan, steal]);

    const opened = openDealAt(state, 'p1', 8);
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        cards: [{ color: 'yellow', source: 'hand', cardId: clan.id }],
        amount: 2,
      },
      3100,
    ).state;
    const accepted = ok(
      offered,
      { type: 'ACCEPT_OFFER', uid: 'p1', targetUid: 'p2' },
      3200,
    ).state;
    expect(isDealComplete(accepted)).toBe(true);

    const played = ok(
      accepted,
      { type: 'PLAY_IM_THE_BOSS', uid: 'p2', cardId: steal.id },
      3300,
    ).state;
    const closed = passWindowAll(played, 3310);
    expect(closed.bossUid).toBe('p2');
    expect(closed.deal?.bossClanCards.map((card) => card.color)).toEqual(['yellow']);
    expect(closed.deal?.accepted).toEqual({});

    const reAccepted = ok(
      closed,
      { type: 'ACCEPT_OFFER', uid: 'p2', targetUid: 'p1' },
      4000,
    ).state;
    expect(isDealComplete(reAccepted)).toBe(true);

    const resolved = lockAndResolve(reAccepted, 'p2', 5000);
    expect(getPlayer(resolved, 'p1').money).toBe(2);
    expect(getPlayer(resolved, 'p2').money).toBe(4);
    expect(resolved.discardPile.some((card) => card.id === clan.id)).toBe(true);
  });

  it('applies queued steals in timestamp order', () => {
    const state = startGame(4, 103);
    setTableInvestors(state, { p1: ['green', 'yellow'] });
    const first = imTheBossCard();
    const second = imTheBossCard();
    setHand(state, 'p2', [first]);
    setHand(state, 'p3', [second]);

    const opened = openDealAt(state, 'p1', 8);
    const one = ok(opened, { type: 'PLAY_IM_THE_BOSS', uid: 'p2', cardId: first.id }, 3100).state;
    const two = ok(one, { type: 'PLAY_IM_THE_BOSS', uid: 'p3', cardId: second.id }, 3200).state;
    expect(two.pendingCards).toHaveLength(2);

    const closed = passWindowAll(two, 3210);
    expect(closed.bossUid).toBe('p3');
    expect(closed.log.filter((event) => event.type === 'bossStolen')).toHaveLength(2);
    expect(closed.deal?.offers.p1?.cards.map((card) => card.color).sort()).toEqual([
      'green',
      'yellow',
    ]);
  });

  it('rejects stealing when already the boss', () => {
    const state = startGame(4, 104);
    setTableInvestors(state, { p1: ['green', 'yellow'] });
    const steal = imTheBossCard();
    setHand(state, 'p1', [steal]);
    const opened = openDealAt(state, 'p1', 8);
    expect(
      rejected(
        opened,
        { type: 'PLAY_IM_THE_BOSS', uid: 'p1', cardId: steal.id },
        3100,
      ),
    ).toBe('ALREADY_BOSS');
  });
});
