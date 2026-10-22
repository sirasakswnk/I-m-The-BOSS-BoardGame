import { describe, expect, it } from 'vitest';

import type { GameEvent, InfluenceCard } from '@/engine/types';

import {
  didReshuffle,
  drawKey,
  findLatestDraw,
  getNewCards,
  sortHandForDisplay,
} from './drawUtils';

const hand: InfluenceCard[] = [
  { id: 'boss-1', kind: 'imTheBoss' },
  { id: 'clan-red-1', kind: 'clan', color: 'red' },
  { id: 'stop-1', kind: 'stop' },
  { id: 'travel-wild-1', kind: 'travel', color: 'wild' },
  { id: 'clan-blue-1', kind: 'clan', color: 'blue' },
];

describe('sortHandForDisplay', () => {
  it('groups cards by kind like the hand fan', () => {
    expect(sortHandForDisplay(hand).map((card) => card.id)).toEqual([
      'clan-red-1',
      'clan-blue-1',
      'travel-wild-1',
      'stop-1',
      'boss-1',
    ]);
  });
});

describe('getNewCards', () => {
  it('returns only cards that were not in the hand before, in fan order', () => {
    const known = ['clan-red-1', 'stop-1'];
    expect(getNewCards(hand, known).map((card) => card.id)).toEqual([
      'clan-blue-1',
      'travel-wild-1',
      'boss-1',
    ]);
    expect(
      getNewCards(
        hand,
        hand.map((card) => card.id),
      ),
    ).toEqual([]);
  });
});

describe('didReshuffle', () => {
  it('detects a deck that ran out while the discard pile had cards', () => {
    expect(didReshuffle({ deckCount: 1, discardCount: 9 }, 3)).toBe(true);
    expect(didReshuffle({ deckCount: 0, discardCount: 4 }, 3)).toBe(true);
    expect(didReshuffle({ deckCount: 3, discardCount: 9 }, 3)).toBe(false);
    expect(didReshuffle({ deckCount: 1, discardCount: 0 }, 1)).toBe(false);
  });
});

describe('findLatestDraw', () => {
  it('returns the newest draw and a stable key', () => {
    const log: GameEvent[] = [
      { type: 'cardsDrawn', at: 1, uid: 'p1', count: 3 },
      { type: 'turnStarted', at: 1, uid: 'p2', turnNumber: 2 },
      { type: 'cardsDrawn', at: 5, uid: 'p2', count: 2 },
      { type: 'turnStarted', at: 5, uid: 'p3', turnNumber: 3 },
    ];
    const latest = findLatestDraw(log);
    expect(latest?.uid).toBe('p2');
    expect(drawKey(latest!)).toBe('5:p2:2');
    expect(findLatestDraw([])).toBeNull();
  });
});
