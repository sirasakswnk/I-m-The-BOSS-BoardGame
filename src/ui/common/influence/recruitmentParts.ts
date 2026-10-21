import type { InfluenceCard } from '@/engine/config/influenceCards';

export type RecruitmentPart = 1 | 2 | 3;

/**
 * Maps recruitment cards in a hand to the 1/3, 2/3, 3/3 triptych parts,
 * sorted by card id so reordering the hand cannot shuffle the slices.
 */
// ASSUMPTION: numeric id suffixes compare numerically (2 before 10), and hands
// with more than three recruitment cards restart the triptych at 1/3.
export function getRecruitmentPartMap(
  cards: readonly InfluenceCard[],
): ReadonlyMap<string, RecruitmentPart> {
  const ids = cards
    .filter((card): card is Extract<InfluenceCard, { kind: 'recruitment' }> => {
      return card.kind === 'recruitment';
    })
    .map((card) => card.id)
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

  return new Map(ids.map((id, index) => [id, ((index % 3) + 1) as RecruitmentPart] as const));
}
