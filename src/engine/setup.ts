import { FAMILY_INDEX, FAMILY_ORDER, MIN_PLAYERS, MAX_PLAYERS } from './config/families';
import type { FamilyColor } from './config/families';
import { buildInfluenceDeck } from './config/influenceCards';
import { STARTING_HAND_SIZE, STARTING_MONEY } from './config/rules';
import { drawCards } from './deck';
import { normalizeSeed, randomInt, shuffle } from './rng';
import type { FullGameState, GameEvent } from './types';
import { orderedPlayers, reject } from './validators';

export interface NewPlayer {
  uid: string;
  name: string;
}

/** Creates an empty lobby. Used by tests and by the room layer at START_GAME. */
export function createInitialState(seed: number, players: NewPlayer[] = []): FullGameState {
  return {
    schemaVersion: 1,
    phase: 'lobby',
    players: players.map((player, index) => ({
      uid: player.uid,
      name: player.name,
      seat: index,
      investors: [],
      hand: [],
      money: STARTING_MONEY,
    })),
    turnNumber: 0,
    bossUid: null,
    pawnSpace: 0,
    closedSpaces: [],
    dealsClosed: 0,
    unclaimedInvestors: [],
    onVacation: [],
    deck: [],
    discardPile: [],
    rngState: normalizeSeed(seed),
    deal: null,
    pendingCards: [],
    window: null,
    nextPendingSeq: 1,
    lastDice: null,
    log: [],
    finalScores: null,
    nextTurnUid: null,
    pendingDiscardUids: [],
  };
}

function sortInvestors(colors: FamilyColor[]): FamilyColor[] {
  return [...colors].sort((a, b) => FAMILY_INDEX[a] - FAMILY_INDEX[b]);
}

/**
 * SETUP.
 *
 * Picks the first player uniformly with the shared seeded RNG, shuffles the
 * 98-card influence deck, deals permanent investors and five influence cards
 * per player. All pawns start on space 1 and the first player must roll before
 * they can open a deal.
 *
 * Mutates `state` (already a caller-owned clone) and returns the events.
 */
export function startGame(state: FullGameState, now: number): GameEvent[] {
  const players = orderedPlayers(state);
  if (players.length < MIN_PLAYERS) reject('NOT_ENOUGH_PLAYERS');
  if (players.length > MAX_PLAYERS) reject('ROOM_FULL');

  // Normalize seats 0..n-1, preserving join order.
  state.players = players;
  state.players.forEach((player, index) => {
    player.seat = index;
    player.hand = [];
    player.money = STARTING_MONEY;
    player.investors = [];
  });

  const playerCount = state.players.length;

  // First player is rolled before any cards are dealt, so investor colours
  // have no influence on who starts.
  const firstRoll = randomInt(state.rngState, 0, playerCount - 1);
  state.rngState = firstRoll.state;
  const firstPlayer = state.players[firstRoll.value];

  // Permanent investor cards, dealt at random.
  const investorPool = shuffle(FAMILY_ORDER, state.rngState);
  state.rngState = investorPool.state;
  const investorsPerPlayer = playerCount === 3 ? 2 : 1;
  let cursor = 0;

  for (const player of state.players) {
    const dealt = investorPool.value.slice(cursor, cursor + investorsPerPlayer);
    cursor += investorsPerPlayer;
    player.investors = sortInvestors([...dealt]);
  }

  state.unclaimedInvestors = sortInvestors(investorPool.value.slice(cursor));

  // Influence deck.
  const deck = buildInfluenceDeck();
  const shuffledDeck = shuffle(deck, state.rngState);
  state.rngState = shuffledDeck.state;

  const totalToDraw = playerCount * STARTING_HAND_SIZE;
  const openingDraw = drawCards(shuffledDeck.value, [], totalToDraw, state.rngState);
  state.rngState = openingDraw.rngState;

  state.players.forEach((player, index) => {
    player.hand = openingDraw.drawn.slice(
      index * STARTING_HAND_SIZE,
      (index + 1) * STARTING_HAND_SIZE,
    );
  });

  state.deck = openingDraw.deck;
  state.discardPile = [];
  state.deal = null;
  state.pendingCards = [];
  state.window = null;
  state.onVacation = [];
  state.closedSpaces = [];
  state.dealsClosed = 0;
  state.pawnSpace = 1;
  state.lastDice = null;
  state.finalScores = null;
  state.nextTurnUid = null;
  state.pendingDiscardUids = [];
  state.turnNumber = 1;
  state.phase = 'turnStart';
  state.bossUid = firstPlayer.uid;

  return [
    {
      type: 'gameStarted',
      at: now,
      playerCount,
      firstUid: firstPlayer.uid,
    },
    { type: 'turnStarted', at: now, uid: firstPlayer.uid, turnNumber: 1 },
  ];
}
