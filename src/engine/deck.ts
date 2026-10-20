import type { InfluenceCard } from './config/influenceCards';
import { shuffle } from './rng';

export interface DrawResult {
  drawn: InfluenceCard[];
  deck: InfluenceCard[];
  discardPile: InfluenceCard[];
  rngState: number;
}

/**
 * Draws from the top of the deck (the end of the array). When the deck is
 * empty the discard pile is shuffled into a new deck; if both are empty the
 * draw simply returns fewer cards (plan.md section 3.4).
 */
export function drawCards(
  deck: readonly InfluenceCard[],
  discardPile: readonly InfluenceCard[],
  count: number,
  rngState: number,
): DrawResult {
  let nextDeck = [...deck];
  let nextDiscard = [...discardPile];
  let state = rngState;
  const drawn: InfluenceCard[] = [];

  while (drawn.length < count) {
    if (nextDeck.length === 0) {
      if (nextDiscard.length === 0) break;
      const reshuffled = shuffle(nextDiscard, state);
      nextDeck = reshuffled.value;
      state = reshuffled.state;
      nextDiscard = [];
    }

    const card = nextDeck.pop();
    if (!card) break;
    drawn.push(card);
  }

  return { drawn, deck: nextDeck, discardPile: nextDiscard, rngState: state };
}
