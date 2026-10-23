import { describe, expect, it } from 'vitest';

import { getDealSpace } from '@/engine/config/dealBoard';
import type { InfluenceCard } from '@/engine/config/influenceCards';
import type { PublicDeal, PublicState } from '@/engine/types';

import {
  getActionBlockReason,
  getActionCards,
  getRecruitmentTargets,
  getStopTargets,
  getTravelTargets,
  getWindowPassInfo,
  hasPlayableAction,
  travelTargetKey,
} from './actionUtils';

const travelRed: InfluenceCard = { id: 'travel-red-1', kind: 'travel', color: 'red' };
const travelWild: InfluenceCard = { id: 'travel-wild-1', kind: 'travel', color: 'wild' };
const travelPurple: InfluenceCard = {
  id: 'travel-purple-1',
  kind: 'travel',
  color: 'purple',
};
const recruitment1: InfluenceCard = { id: 'recruitment-1', kind: 'recruitment' };
const recruitment2: InfluenceCard = { id: 'recruitment-2', kind: 'recruitment' };
const recruitment3: InfluenceCard = { id: 'recruitment-3', kind: 'recruitment' };
const stop: InfluenceCard = { id: 'stop-1', kind: 'stop' };
const bossCard: InfluenceCard = { id: 'imTheBoss-1', kind: 'imTheBoss' };

const baseDeal: PublicDeal = {
  space: 3,
  requirements: getDealSpace(3),
  tileNumber: 1,
  bossClans: ['blue'],
  offers: {
    alice: {
      cards: [{ color: 'green', source: 'hand' }],
      amount: 1,
      submittedAt: 1,
    },
    bob: {
      cards: [{ color: 'yellow', source: 'table' }],
      amount: 1,
      submittedAt: 1,
    },
  },
  acceptedOffers: {},
  excludedColors: [],
  locked: false,
};

function makeState(overrides: Partial<PublicState> = {}): PublicState {
  return {
    phase: 'dealOpen',
    turnNumber: 1,
    bossUid: 'boss',
    pawnSpace: 1,
    closedSpaces: [],
    dealsClosed: 0,
    tableInvestors: {
      boss: ['red', 'blue'],
      alice: ['red', 'green'],
      bob: ['yellow'],
    },
    unclaimedInvestors: [],
    onVacation: [],
    handCounts: { boss: 5, alice: 5, bob: 5 },
    deckCount: 50,
    discardCount: 0,
    deal: baseDeal,
    pendingCards: [],
    window: null,
    lastDice: null,
    log: [],
    finalScores: null,
    pendingDiscardUids: [],
    ...overrides,
  };
}

describe('action-card helpers', () => {
  it('sorts only action cards by kind and id', () => {
    const hand: InfluenceCard[] = [
      { id: 'clan-red-1', kind: 'clan', color: 'red' },
      bossCard,
      recruitment2,
      travelRed,
      stop,
      recruitment1,
    ];
    expect(getActionCards(hand).map((card) => card.id)).toEqual([
      'travel-red-1',
      'recruitment-1',
      'recruitment-2',
      'stop-1',
      'imTheBoss-1',
    ]);
  });

  it('finds investor, boss-clan and hand-offer travel targets', () => {
    const targets = getTravelTargets(makeState(), 'alice', travelWild);
    expect(targets.map((option) => travelTargetKey(option.target))).toEqual([
      'investor-boss-red',
      'clan-bossClan-boss-blue',
      'investor-boss-blue',
      'clan-offer-alice-green',
      'investor-bob-yellow',
    ]);
  });

  it('excludes self, vacation colors and table offers from travel targets', () => {
    const state = makeState({
      onVacation: ['red'],
    });
    const targets = getTravelTargets(state, 'alice', travelRed);
    expect(targets).toHaveLength(0);

    const wildTargets = getTravelTargets(state, 'alice', travelWild);
    expect(
      wildTargets.some(
        (option) => option.target.kind === 'investor' && option.target.color === 'red',
      ),
    ).toBe(false);
    expect(
      wildTargets.some((option) => option.placement === 'offer' && option.color === 'yellow'),
    ).toBe(false);
    expect(
      wildTargets.some((option) => option.target.kind === 'investor' && option.ownerUid === 'alice'),
    ).toBe(false);
  });

  it('recruits only unclaimed investors while any remain', () => {
    const state = makeState({ unclaimedInvestors: ['purple', 'red'] });
    expect(getRecruitmentTargets(state, 'bob')).toEqual([
      { color: 'red', from: 'unclaimed', ownerUid: null },
      { color: 'purple', from: 'unclaimed', ownerUid: null },
    ]);
  });

  it('recruits one public copy of each color from other players', () => {
    const state = makeState({
      tableInvestors: {
        boss: ['red', 'blue'],
        alice: ['red', 'green'],
        bob: ['green', 'yellow'],
      },
    });
    expect(getRecruitmentTargets(state, 'boss')).toEqual([
      { color: 'red', from: 'player', ownerUid: 'alice' },
      { color: 'green', from: 'player', ownerUid: 'alice' },
      { color: 'yellow', from: 'player', ownerUid: 'bob' },
    ]);
  });

  it('lists stop targets only inside an open window and not the player own card', () => {
    const pending = [
      { id: 'p1', kind: 'travel' as const, playerUid: 'alice', target: { kind: 'investor' as const, color: 'red' as const, uid: 'bob' } },
      { id: 'p2', kind: 'imTheBoss' as const, playerUid: 'bob' },
      { id: 'p3', kind: 'travel' as const, playerUid: 'boss', stoppedBy: 'alice' },
    ];
    const noWindow = makeState({ pendingCards: pending });
    expect(getStopTargets(noWindow, 'boss')).toEqual([]);

    const window = {
      reason: 'cardPlayed' as const,
      triggeredBy: 'alice',
      deadline: 6000,
      passed: [],
    };
    const withWindow = makeState({ pendingCards: pending, window });
    expect(getStopTargets(withWindow, 'boss').map((option) => option.pendingId)).toEqual([
      'p1',
      'p2',
    ]);
    expect(getStopTargets(withWindow, 'alice').map((option) => option.pendingId)).toEqual([
      'p2',
    ]);
  });

  it('reports why a card cannot be played', () => {
    const state = makeState({
      pendingCards: [
        { id: 'p1', kind: 'travel', playerUid: 'alice', target: { kind: 'investor', color: 'red', uid: 'bob' } },
      ],
    });
    const hand = [travelPurple, recruitment1, recruitment2, stop, bossCard];

    expect(getActionBlockReason(travelPurple, state, 'boss', hand)).toBe(
      'no-travel-target',
    );
    expect(getActionBlockReason(recruitment1, state, 'boss', hand)).toBe(
      'need-recruitment-cards',
    );
    expect(
      getActionBlockReason(recruitment1, state, 'boss', [
        ...hand,
        recruitment3,
      ]),
    ).toBeNull();
    expect(getActionBlockReason(stop, state, 'boss', hand)).toBe('stop-no-window');
    expect(getActionBlockReason(bossCard, state, 'boss', hand)).toBe('already-boss');
    expect(getActionBlockReason(bossCard, state, 'alice', hand)).toBeNull();
    expect(hasPlayableAction(state, 'boss', hand)).toBe(false);
    expect(hasPlayableAction(state, 'boss', [...hand, recruitment3])).toBe(true);
  });

  it('counts passes without the player who opened the window', () => {
    const state = makeState({
      window: {
        reason: 'dealLocked',
        triggeredBy: 'boss',
        deadline: 9000,
        passed: ['alice'],
      },
    });
    expect(getWindowPassInfo(state)).toEqual({
      triggeredBy: 'boss',
      eligibleUids: ['alice', 'bob'],
      passedUids: ['alice'],
      total: 2,
      passed: 1,
    });
    expect(getWindowPassInfo(makeState())).toBeNull();
  });
});
