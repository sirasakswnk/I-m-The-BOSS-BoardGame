import { describe, expect, it } from 'vitest';

import { finishGame } from '../endgame';
import { project } from '../project';
import {
  clanCard,
  getPlayer,
  ok,
  openDealAt,
  setHand,
  setTableInvestors,
  startGame,
  travelCard,
} from './helpers';

describe('projection privacy', () => {
  it('keeps hands, money and placed card ids out of the public state', () => {
    const state = startGame(4, 150);
    setTableInvestors(state, { p1: ['green'] });
    const bossClan = clanCard('yellow');
    const offerClan = clanCard('green');
    const travel = travelCard('wild');
    setHand(state, 'p1', [bossClan]);
    setHand(state, 'p2', [offerClan]);
    setHand(state, 'p3', [travel]);

    const opened = openDealAt(state, 'p1', 8, { clanCardIds: [bossClan.id] });
    const offered = ok(
      opened,
      {
        type: 'SUBMIT_OFFER',
        uid: 'p2',
        color: 'green',
        source: 'hand',
        cardId: offerClan.id,
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
        target: { kind: 'investor', uid: 'p1', color: 'green' },
      },
      3200,
    ).state;

    const projected = project(played);
    const publicJson = JSON.stringify(projected.public);

    expect(projected.public.deal?.bossClans).toEqual(['yellow']);
    const offer = projected.public.deal?.offers.p2?.green;
    expect(offer).toMatchObject({ color: 'green', source: 'hand', amount: 1 });
    expect(offer).not.toHaveProperty('card');
    expect(offer).not.toHaveProperty('cardId');

    const pending = projected.public.pendingCards[0];
    expect(pending).toBeDefined();
    expect(pending).not.toHaveProperty('cards');
    expect(pending?.target).toEqual({ kind: 'investor', uid: 'p1', color: 'green' });

    expect(projected.public).not.toHaveProperty('deck');
    expect(projected.public).not.toHaveProperty('discardPile');
    expect(projected.public).not.toHaveProperty('players');
    expect(projected.public).not.toHaveProperty('rngState');
    expect(projected.public).not.toHaveProperty('nextPendingSeq');

    for (const card of [bossClan, offerClan, travel]) {
      expect(publicJson).not.toContain(card.id);
    }
    for (const player of played.players) {
      for (const card of player.hand) {
        expect(publicJson).not.toContain(card.id);
      }
    }

    expect(projected.public.handCounts.p2).toBe(getPlayer(played, 'p2').hand.length);
    expect(projected.private.p2.hand.map((card) => card.id)).not.toContain(offerClan.id);
    expect(projected.private.p3.hand.map((card) => card.id)).not.toContain(travel.id);
  });

  it('exposes final scores only at game over', () => {
    const state = startGame(3, 151);
    getPlayer(state, 'p1').money = 12;
    getPlayer(state, 'p2').money = 9;
    getPlayer(state, 'p3').money = 4;

    const before = project(state);
    expect(before.public.finalScores).toBeNull();

    finishGame(state, 4000);
    const after = project(state);
    expect(after.public.finalScores).toEqual({ p1: 12, p2: 9, p3: 4 });
    expect(after.private.p1.money).toBe(12);
  });

  it('copies public collections so later mutations do not leak', () => {
    const state = startGame(3, 152);
    state.closedSpaces = [1, 2];
    const projected = project(state);
    state.closedSpaces.push(3);
    state.onVacation.push('red');
    expect(projected.public.closedSpaces).toEqual([1, 2]);
    expect(projected.public.onVacation).toEqual([]);
  });
});
