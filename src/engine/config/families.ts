/**
 * Family (investor) definitions - plan.md section 3.1.
 *
 * The order of FAMILY_ORDER is part of the rules:
 * it is the A-F order used to pick the first player at setup.
 */
export const FAMILY_ORDER = ['red', 'blue', 'green', 'yellow', 'purple', 'black'] as const;

export type FamilyColor = (typeof FAMILY_ORDER)[number];

export const FAMILY_COUNT = FAMILY_ORDER.length;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

export const FAMILY_INDEX: Record<FamilyColor, number> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3,
  purple: 4,
  black: 5,
};

export function isFamilyColor(value: unknown): value is FamilyColor {
  return typeof value === 'string' && (FAMILY_ORDER as readonly string[]).includes(value);
}
