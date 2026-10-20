import { describe, expect, it } from 'vitest';

import { DEAL_BOARD_SPACES } from '../config/dealBoard';
import { DEAL_TILES } from '../config/dealTiles';
import { FAMILY_ORDER } from '../config/families';
import { buildInfluenceDeck, INFLUENCE_CARD_COUNTS } from '../config/influenceCards';
import { DEAL_TILE_COUNT } from '../config/rules';

describe('influence deck', () => {
  const deck = buildInfluenceDeck();

  it('contains exactly 98 cards with the spec distribution', () => {
    expect(deck).toHaveLength(98);
    expect(INFLUENCE_CARD_COUNTS).toEqual({
      clan: 24,
      travel: 21,
      recruitment: 33,
      stop: 10,
      imTheBoss: 10,
    });
    expect(deck.filter((card) => card.kind === 'clan')).toHaveLength(24);
    expect(deck.filter((card) => card.kind === 'travel')).toHaveLength(21);
    expect(deck.filter((card) => card.kind === 'recruitment')).toHaveLength(33);
    expect(deck.filter((card) => card.kind === 'stop')).toHaveLength(10);
    expect(deck.filter((card) => card.kind === 'imTheBoss')).toHaveLength(10);
  });

  it('has four clan and three travel cards per family plus three wild travels', () => {
    for (const color of FAMILY_ORDER) {
      const clans = deck.filter((card) => card.kind === 'clan' && card.color === color);
      expect(clans).toHaveLength(4);
      const travels = deck.filter((card) => card.kind === 'travel' && card.color === color);
      expect(travels).toHaveLength(3);
    }
    const wild = deck.filter((card) => card.kind === 'travel' && card.color === 'wild');
    expect(wild).toHaveLength(3);
  });

  it('uses unique card ids', () => {
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
  });
});

describe('deal board', () => {
  it('has 16 spaces numbered 1..16 with the spec dividends', () => {
    expect(DEAL_BOARD_SPACES).toHaveLength(16);
    expect(DEAL_BOARD_SPACES.map((space) => space.index)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    for (const space of DEAL_BOARD_SPACES) {
      expect(space.dividends).toBe(space.requiredInvestors + 1);
      expect(space.requiredInvestors).toBeGreaterThanOrEqual(2);
      expect(space.requiredInvestors).toBeLessThanOrEqual(5);
    }
  });

  it('formats every requirement group consistently and exactly', () => {
    for (const space of DEAL_BOARD_SPACES) {
      const seen = new Set<string>();
      let total = 0;
      for (const group of space.groups) {
        for (const color of group.colors) {
          expect(FAMILY_ORDER).toContain(color);
          expect(seen.has(color)).toBe(false);
          seen.add(color);
        }
        expect(group.pick).toBeGreaterThan(0);
        expect(group.pick).toBeLessThanOrEqual(group.colors.length);
        total += group.pick;
      }
      expect(total).toBe(space.requiredInvestors);
    }
  });
});

describe('deal tiles', () => {
  it('has 15 tiles with the spec value progression', () => {
    expect(DEAL_TILES).toHaveLength(DEAL_TILE_COUNT);
    expect(DEAL_TILES.map((tile) => tile.valuePerDividend)).toEqual([
      2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5,
    ]);
    expect(DEAL_TILES.map((tile) => tile.number)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 1),
    );
  });

  it('has the end-check faces from the rules', () => {
    expect(DEAL_TILES[9].endCheckFaces).toEqual([1]);
    expect(DEAL_TILES[10].endCheckFaces).toEqual([1, 2]);
    expect(DEAL_TILES[11].endCheckFaces).toEqual([1, 2, 3]);
    expect(DEAL_TILES[12].endCheckFaces).toEqual([1, 2, 3, 4]);
    expect(DEAL_TILES[13].endCheckFaces).toEqual([1, 2, 3, 4, 5]);
    expect(DEAL_TILES[14].autoEnd).toBe(true);
    expect(DEAL_TILES.slice(0, 9).every((tile) => tile.endCheckFaces.length === 0)).toBe(true);
  });
});
