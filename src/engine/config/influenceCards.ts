import { FAMILY_ORDER, type FamilyColor } from './families';

/**
 * Influence cards - plan.md section 3.2.
 * Total deck is exactly 98 cards.
 */
export type InfluenceCard =
  | { id: string; kind: 'clan'; color: FamilyColor }
  | { id: string; kind: 'travel'; color: FamilyColor | 'wild' }
  | { id: string; kind: 'recruitment' }
  | { id: string; kind: 'stop' }
  | { id: string; kind: 'imTheBoss' };

export type InfluenceCardKind = InfluenceCard['kind'];

/** A clan card (hand card placed face-up in a deal). */
export type ClanCard = Extract<InfluenceCard, { kind: 'clan' }>;

export const CLAN_CARDS_PER_FAMILY = 4;
export const TRAVEL_CARDS_PER_FAMILY = 3;
export const TRAVEL_WILD_CARDS = 3;
export const RECRUITMENT_CARD_COUNT = 33;
export const STOP_CARD_COUNT = 10;
export const IM_THE_BOSS_CARD_COUNT = 10;

export const INFLUENCE_CARD_COUNTS: Record<InfluenceCardKind, number> = {
  clan: FAMILY_ORDER.length * CLAN_CARDS_PER_FAMILY,
  travel: FAMILY_ORDER.length * TRAVEL_CARDS_PER_FAMILY + TRAVEL_WILD_CARDS,
  recruitment: RECRUITMENT_CARD_COUNT,
  stop: STOP_CARD_COUNT,
  imTheBoss: IM_THE_BOSS_CARD_COUNT,
};

export const TOTAL_INFLUENCE_CARDS = Object.values(INFLUENCE_CARD_COUNTS).reduce(
  (total, count) => total + count,
  0,
);

/** Builds a fresh, unshuffled 98-card deck. */
export function buildInfluenceDeck(): InfluenceCard[] {
  const deck: InfluenceCard[] = [];

  for (const color of FAMILY_ORDER) {
    for (let copy = 1; copy <= CLAN_CARDS_PER_FAMILY; copy += 1) {
      deck.push({ id: `clan-${color}-${copy}`, kind: 'clan', color });
    }
  }

  for (const color of FAMILY_ORDER) {
    for (let copy = 1; copy <= TRAVEL_CARDS_PER_FAMILY; copy += 1) {
      deck.push({ id: `travel-${color}-${copy}`, kind: 'travel', color });
    }
  }

  for (let copy = 1; copy <= TRAVEL_WILD_CARDS; copy += 1) {
    deck.push({ id: `travel-wild-${copy}`, kind: 'travel', color: 'wild' });
  }

  for (let copy = 1; copy <= RECRUITMENT_CARD_COUNT; copy += 1) {
    deck.push({ id: `recruitment-${copy}`, kind: 'recruitment' });
  }

  for (let copy = 1; copy <= STOP_CARD_COUNT; copy += 1) {
    deck.push({ id: `stop-${copy}`, kind: 'stop' });
  }

  for (let copy = 1; copy <= IM_THE_BOSS_CARD_COUNT; copy += 1) {
    deck.push({ id: `imTheBoss-${copy}`, kind: 'imTheBoss' });
  }

  return deck;
}
