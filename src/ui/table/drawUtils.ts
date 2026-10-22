import type { GameEvent, InfluenceCard } from '@/engine/types';

export type DrawEvent = Extract<GameEvent, { type: 'cardsDrawn' }>;

const HAND_KIND_ORDER: Record<InfluenceCard['kind'], number> = {
  clan: 0,
  travel: 1,
  stop: 2,
  recruitment: 3,
  imTheBoss: 4,
};

/** Order the hand fan shows cards in: grouped by kind, stable inside a kind. */
export function sortHandForDisplay(cards: readonly InfluenceCard[]): InfluenceCard[] {
  return [...cards].sort((left, right) => HAND_KIND_ORDER[left.kind] - HAND_KIND_ORDER[right.kind]);
}

export function findLatestDraw(log: readonly GameEvent[]): DrawEvent | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index];
    if (event.type === 'cardsDrawn') return event;
  }
  return null;
}

export function drawKey(event: DrawEvent): string {
  return `${event.at}:${event.uid}:${event.count}`;
}

/** Cards in the hand that were not there before, in the order the fan shows them. */
export function getNewCards(
  hand: readonly InfluenceCard[],
  knownIds: readonly string[],
): InfluenceCard[] {
  const known = new Set(knownIds);
  return sortHandForDisplay(hand).filter((card) => !known.has(card.id));
}

/**
 * The engine reshuffles the discard pile into a new deck when the deck runs
 * out mid-draw (plan.md 3.4) without a log event, so infer it from the piles
 * as they were before the draw.
 */
export function didReshuffle(
  before: { deckCount: number; discardCount: number },
  drawn: number,
): boolean {
  return before.deckCount < drawn && before.discardCount > 0;
}
