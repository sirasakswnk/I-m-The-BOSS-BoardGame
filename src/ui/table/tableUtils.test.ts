import { describe, expect, it } from 'vitest';

import { DEAL_BOARD_SPACES } from '@/engine/config/dealBoard';
import type { FamilyColor } from '@/engine/config/families';
import type { PublicDeal } from '@/engine/types';
import type { RoomPlayers } from '@/net/roomTypes';

import {
  getBossAutoJoinColors,
  getClosedTileMap,
  getDealParticipation,
  getDealSegments,
  getExclusionCandidates,
  getGroupProgress,
  getOverfilledGroups,
  getRemainingExclusionNeed,
  getSeatLayout,
  getSpaceByIndex,
  getSpacePosition,
  isDealComplete,
  isExclusionPlanValid,
} from './tableUtils';

function player(seat: number, name = `P${seat + 1}`) {
  return {
    name,
    seat,
    connected: true,
    lastSeen: 1,
    joinedAt: 1,
  };
}

const fourPlayers: RoomPlayers = {
  p1: player(0, 'หนึ่ง'),
  p2: player(1, 'สอง'),
  p3: player(2, 'สาม'),
  p4: player(3, 'สี่'),
};

describe('table seat layout', () => {
  it('places the next seats left and top, with the previous seat right', () => {
    const layout = getSeatLayout(fourPlayers, 'p2');
    expect(layout.left?.uid).toBe('p3');
    expect(layout.top.map((entry) => entry.uid)).toEqual(['p4']);
    expect(layout.right?.uid).toBe('p1');
  });

  it('rotates starting from the local player', () => {
    const layout = getSeatLayout(fourPlayers, 'p1');
    expect(layout.left?.uid).toBe('p2');
    expect(layout.top.map((entry) => entry.uid)).toEqual(['p3']);
    expect(layout.right?.uid).toBe('p4');
  });

  it('supports three top seats for six-player tables', () => {
    const sixPlayers: RoomPlayers = {
      ...fourPlayers,
      p5: player(4, 'ห้า'),
      p6: player(5, 'หก'),
    };
    const layout = getSeatLayout(sixPlayers, 'p3');
    expect(layout.left?.uid).toBe('p4');
    expect(layout.top.map((entry) => entry.uid)).toEqual(['p5', 'p6', 'p1']);
    expect(layout.right?.uid).toBe('p2');
  });
});

describe('board geometry', () => {
  it('maps all 16 spaces clockwise around a 5x5 board', () => {
    expect(getSpacePosition(1)).toEqual({ row: 1, col: 1 });
    expect(getSpacePosition(5)).toEqual({ row: 1, col: 5 });
    expect(getSpacePosition(6)).toEqual({ row: 2, col: 5 });
    expect(getSpacePosition(9)).toEqual({ row: 5, col: 5 });
    expect(getSpacePosition(13)).toEqual({ row: 5, col: 1 });
    expect(getSpacePosition(16)).toEqual({ row: 2, col: 1 });

    const positions = DEAL_BOARD_SPACES.map((space) => getSpacePosition(space.index));
    expect(new Set(positions.map(({ row, col }) => `${row},${col}`)).size).toBe(16);
  });

  it('resolves spaces by index and keeps the center free', () => {
    expect(getSpaceByIndex(9)?.requiredInvestors).toBe(5);
    expect(getSpaceByIndex(0)).toBeNull();
    expect(getSpaceByIndex(17)).toBeNull();
  });
});

describe('closed deal tiles', () => {
  it('maps closed spaces to tiles in the order they were covered', () => {
    expect([...getClosedTileMap([3, 11, 7])]).toEqual([
      [3, 1],
      [11, 2],
      [7, 3],
    ]);
  });

  it('does not depend on the trimmed public log', () => {
    // The public log keeps 50 events; closed spaces must survive long games.
    const closed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(getClosedTileMap(closed).get(1)).toBe(1);
    expect(getClosedTileMap(closed).size).toBe(12);
  });
});

describe('boss auto-join and exclusions', () => {
  it('ignores vacationing investors and colors outside the space', () => {
    const space = getSpaceByIndex(10);
    expect(space).not.toBeNull();
    expect(
      getBossAutoJoinColors(['red', 'black', 'blue', 'green'], space!, ['green']),
    ).toEqual(['red', 'black']);
  });

  it('requires enough exclusions to bring every group within its pick count', () => {
    const space = getSpaceByIndex(1);
    expect(space).not.toBeNull();
    const autoJoin: FamilyColor[] = ['red', 'blue', 'yellow', 'green', 'purple', 'black'];
    const groups = getOverfilledGroups(space!, autoJoin);
    expect(groups).toHaveLength(1);
    expect(groups[0].overflow).toBe(1);
    expect(getExclusionCandidates(groups)).toEqual(['yellow', 'green', 'purple', 'black']);

    expect(getRemainingExclusionNeed(space!, autoJoin, [])).toBe(1);
    expect(isExclusionPlanValid(space!, autoJoin, [])).toBe(false);
    expect(isExclusionPlanValid(space!, autoJoin, ['blue'])).toBe(false);
    expect(isExclusionPlanValid(space!, autoJoin, ['yellow'])).toBe(true);
  });
});

describe('deal participation and dividends', () => {
  const requirements = getSpaceByIndex(10)!;

  function deal(overrides: Partial<PublicDeal> = {}): PublicDeal {
    return {
      space: 10,
      requirements,
      tileNumber: 1,
      bossClans: [],
      offers: {},
      acceptedOffers: {},
      excludedColors: [],
      locked: false,
      ...overrides,
    };
  }

  it('counts the boss free colors and accepted offers', () => {
    const participation = getDealParticipation(
      deal({
        offers: {
          p4: {
            cards: [{ color: 'red', source: 'table' }],
            amount: 1,
            submittedAt: 3,
          },
        },
        acceptedOffers: { red: 'p4' },
      }),
      'p2',
      { p2: ['red', 'blue'] },
      [],
    );

    expect(participation.bossInvestorFree).toEqual(['red']);
    expect(participation.accepted.map((entry) => entry.colors)).toEqual([['red']]);
    expect(participation.allColors.has('red')).toBe(true);
    expect(participation.allColors.has('blue')).toBe(false);
  });

  it('drops excluded and vacationing boss investors', () => {
    const participation = getDealParticipation(
      deal({ excludedColors: ['red'] }),
      'p2',
      { p2: ['red', 'black'] },
      ['black'],
    );
    expect(participation.bossInvestorFree).toEqual([]);
  });

  it('splits dividend segments between accepted offers and the boss', () => {
    const acceptedDeal = deal({
      offers: {
        p4: {
          cards: [{ color: 'red', source: 'hand' }],
          amount: 2,
          submittedAt: 4,
        },
      },
      acceptedOffers: { red: 'p4' },
    });
    const participation = getDealParticipation(
      acceptedDeal,
      'p2',
      { p2: ['red'] },
      [],
    );
    const segments = getDealSegments(acceptedDeal, participation);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ kind: 'accepted', colors: ['red'], uid: 'p4' });
    expect(segments.filter((segment) => segment.kind === 'boss')).toHaveLength(1);
  });

  it('checks each requirement group and the total investor count', () => {
    const progress = getGroupProgress(requirements, new Set(['red', 'black']));
    expect(progress.every((entry) => entry.status === 'complete')).toBe(true);

    const completeDeal = deal({
      offers: {
        p3: {
          cards: [
            { color: 'red', source: 'table' },
            { color: 'black', source: 'table' },
          ],
          amount: 1,
          submittedAt: 5,
        },
      },
      acceptedOffers: { red: 'p3', black: 'p3' },
    });
    const participants = getDealParticipation(completeDeal, 'p2', {}, []);
    expect(participants.accepted).toHaveLength(1);
    expect(participants.accepted[0]?.colors).toEqual(['red', 'black']);
    expect(isDealComplete(completeDeal, participants.allColors)).toBe(true);
    expect(
      isDealComplete(completeDeal, new Set(['red'])),
    ).toBe(false);
  });
});
