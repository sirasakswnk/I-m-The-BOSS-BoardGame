import type { FamilyColor } from './families';

/**
 * Deal board - plan.md section 3.3.
 *
 * 16 spaces, clockwise starting at the top-left corner.
 * `pick` is the number of colors a group contributes; when
 * `pick === colors.length` every color of that group is mandatory.
 */
export interface DealRequirementGroup {
  pick: number;
  colors: FamilyColor[];
}

export interface DealSpace {
  index: number;
  requiredInvestors: number;
  dividends: number;
  groups: DealRequirementGroup[];
}

export const DEAL_BOARD_SPACES: DealSpace[] = [
  {
    index: 1,
    requiredInvestors: 5,
    dividends: 6,
    groups: [
      { pick: 2, colors: ['red', 'blue'] },
      { pick: 3, colors: ['yellow', 'green', 'purple', 'black'] },
    ],
  },
  {
    index: 2,
    requiredInvestors: 4,
    dividends: 5,
    groups: [{ pick: 4, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'black'] }],
  },
  {
    index: 3,
    requiredInvestors: 3,
    dividends: 4,
    groups: [{ pick: 3, colors: ['red', 'blue', 'black'] }],
  },
  {
    index: 4,
    requiredInvestors: 4,
    dividends: 5,
    groups: [
      { pick: 2, colors: ['red', 'blue', 'green'] },
      { pick: 2, colors: ['yellow', 'purple', 'black'] },
    ],
  },
  {
    index: 5,
    requiredInvestors: 5,
    dividends: 6,
    groups: [
      { pick: 2, colors: ['green', 'purple'] },
      { pick: 3, colors: ['red', 'blue', 'yellow', 'black'] },
    ],
  },
  {
    index: 6,
    requiredInvestors: 3,
    dividends: 4,
    groups: [
      { pick: 2, colors: ['green', 'purple'] },
      { pick: 1, colors: ['red', 'blue', 'yellow'] },
    ],
  },
  {
    index: 7,
    requiredInvestors: 3,
    dividends: 4,
    groups: [
      { pick: 1, colors: ['blue', 'yellow'] },
      { pick: 1, colors: ['red', 'purple'] },
      { pick: 1, colors: ['green', 'black'] },
    ],
  },
  {
    index: 8,
    requiredInvestors: 2,
    dividends: 3,
    groups: [{ pick: 2, colors: ['green', 'yellow'] }],
  },
  {
    index: 9,
    requiredInvestors: 5,
    dividends: 6,
    groups: [
      { pick: 1, colors: ['blue'] },
      { pick: 4, colors: ['red', 'green', 'yellow', 'purple', 'black'] },
    ],
  },
  {
    index: 10,
    requiredInvestors: 2,
    dividends: 3,
    groups: [{ pick: 2, colors: ['red', 'black'] }],
  },
  {
    index: 11,
    requiredInvestors: 4,
    dividends: 5,
    groups: [{ pick: 4, colors: ['red', 'green', 'yellow', 'purple', 'black'] }],
  },
  {
    index: 12,
    requiredInvestors: 3,
    dividends: 4,
    groups: [
      { pick: 2, colors: ['blue', 'yellow', 'black'] },
      { pick: 1, colors: ['green', 'purple'] },
    ],
  },
  {
    index: 13,
    requiredInvestors: 5,
    dividends: 6,
    groups: [
      { pick: 3, colors: ['red', 'blue', 'yellow'] },
      { pick: 2, colors: ['green', 'purple', 'black'] },
    ],
  },
  {
    index: 14,
    requiredInvestors: 3,
    dividends: 4,
    groups: [
      { pick: 1, colors: ['yellow'] },
      { pick: 1, colors: ['red', 'blue'] },
      { pick: 1, colors: ['green', 'purple'] },
    ],
  },
  {
    index: 15,
    requiredInvestors: 2,
    dividends: 3,
    groups: [{ pick: 2, colors: ['purple', 'black'] }],
  },
  {
    index: 16,
    requiredInvestors: 3,
    dividends: 4,
    groups: [{ pick: 3, colors: ['red', 'blue', 'yellow', 'black'] }],
  },
];

export const DEAL_SPACE_COUNT = DEAL_BOARD_SPACES.length;

export function getDealSpace(index: number): DealSpace {
  const space = DEAL_BOARD_SPACES[index - 1];
  if (!space) {
    throw new Error(`Unknown deal space: ${index}`);
  }
  return space;
}
