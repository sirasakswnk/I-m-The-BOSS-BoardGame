import { DEAL_TILES } from './config/dealTiles';
import type { FamilyColor } from './config/families';
import { FAMILY_INDEX, MAX_PLAYERS, isFamilyColor } from './config/families';
import {
  DRAW_COUNT,
  GRACE_MS,
  HAND_LIMIT,
  INTERRUPT_MS,
  STARTING_MONEY,
  STORED_LOG_LIMIT,
} from './config/rules';
import { drawCards } from './deck';
import { runEndCheck } from './endgame';
import { randomInt } from './rng';
import { startGame } from './setup';
import type {
  ApplyResult,
  FullGameState,
  GameAction,
  GameEvent,
  OfferState,
  PendingCardState,
} from './types';
import {
  RuleError,
  findOffer,
  findPlayer,
  getAllowedColors,
  getAcceptedOffers,
  isDealComplete,
  isColorRequired,
  isValidSpace,
  leftOf,
  movePawn,
  nextOpenSpace,
  reject,
  requireBoss,
  requireCard,
  requireDeal,
  requireDealSpace,
  requireDistinctCards,
  requireNoWindow,
  requirePhase,
  requirePlayer,
  requireSpaceOpen,
  sortPending,
  validateAcceptOffer,
  validateExclusions,
  validateRecruitment,
  validateStopTarget,
  validateSubmitOffer,
  validateTravelTarget,
} from './validators';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type EventInput = DistributiveOmit<GameEvent, 'at'>;

function emit(events: GameEvent[], at: number, input: EventInput): void {
  events.push({ ...input, at } as GameEvent);
}

/* ------------------------------------------------------------------ */
/* Turn helpers                                                        */
/* ------------------------------------------------------------------ */

function beginTurn(state: FullGameState, uid: string, at: number, events: GameEvent[]): void {
  state.phase = 'turnStart';
  state.bossUid = uid;
  state.turnNumber += 1;
  state.nextTurnUid = null;
  state.pendingDiscardUids = [];
  emit(events, at, { type: 'turnStarted', uid, turnNumber: state.turnNumber });
}

function finishTurn(state: FullGameState, nextUid: string, at: number, events: GameEvent[]): void {
  state.deal = null;
  state.window = null;
  state.pendingCards = [];
  state.onVacation = [];

  const overLimit = state.players
    .filter((player) => player.hand.length > HAND_LIMIT)
    .map((player) => player.uid);

  if (overLimit.length > 0) {
    state.phase = 'turnEndDiscard';
    state.nextTurnUid = nextUid;
    state.pendingDiscardUids = overLimit;
    emit(events, at, { type: 'discardRequired', uids: overLimit });
    return;
  }

  state.nextTurnUid = null;
  state.pendingDiscardUids = [];
  beginTurn(state, nextUid, at, events);
}

function openCardWindow(state: FullGameState, uid: string, at: number): void {
  state.window = {
    reason: 'cardPlayed',
    triggeredBy: uid,
    deadline: at + INTERRUPT_MS,
    passed: [],
  };
}

function closeIfAllPassed(state: FullGameState, at: number, events: GameEvent[]): void {
  const window = state.window;
  if (!window) return;
  const others = state.players.filter((player) => player.uid !== window.triggeredBy);
  if (others.every((player) => window.passed.includes(player.uid))) {
    closeWindow(state, at, events);
  }
}

/* ------------------------------------------------------------------ */
/* Action handlers                                                     */
/* ------------------------------------------------------------------ */

type ActionOf<T extends GameAction['type']> = Extract<GameAction, { type: T }>;

function handleJoin(
  state: FullGameState,
  action: ActionOf<'JOIN'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'lobby');
  const name = typeof action.name === 'string' ? action.name.trim() : '';
  if (name.length < 1 || name.length > 16) reject('INVALID_NAME');
  if (findPlayer(state, action.uid)) reject('PLAYER_EXISTS');
  if (state.players.length >= MAX_PLAYERS) reject('ROOM_FULL');

  const usedSeats = new Set(state.players.map((player) => player.seat));
  let seat = -1;
  for (let candidate = 0; candidate < MAX_PLAYERS; candidate += 1) {
    if (!usedSeats.has(candidate)) {
      seat = candidate;
      break;
    }
  }
  if (seat < 0) reject('ROOM_FULL');

  state.players.push({
    uid: action.uid,
    name,
    seat,
    investors: [],
    hand: [],
    money: STARTING_MONEY,
  });
  emit(events, at, { type: 'playerJoined', uid: action.uid, name, seat });
}

function handleLeave(
  state: FullGameState,
  action: ActionOf<'LEAVE'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'lobby');
  if (!findPlayer(state, action.uid)) reject('PLAYER_NOT_FOUND');
  state.players = state.players.filter((player) => player.uid !== action.uid);
  emit(events, at, { type: 'playerLeft', uid: action.uid });
}

function handleStartGame(
  state: FullGameState,
  action: ActionOf<'START_GAME'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'lobby');
  requirePlayer(state, action.uid);
  events.push(...startGame(state, at));
}

function handleRollDice(
  state: FullGameState,
  action: ActionOf<'ROLL_DICE'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'turnStart');
  if (state.bossUid !== action.uid) reject('NOT_YOUR_TURN');
  if (!isValidSpace(state.pawnSpace)) reject('INVALID_SPACE');

  const roll = randomInt(state.rngState, 1, 6);
  state.rngState = roll.state;

  const from = state.pawnSpace;
  const to = movePawn(from, roll.value, state.closedSpaces);
  state.pawnSpace = to;
  state.phase = 'afterMove';
  state.lastDice = [roll.value];

  emit(events, at, { type: 'diceRolled', uid: action.uid, face: roll.value, from, to });
}

function handleOpenDeal(
  state: FullGameState,
  action: ActionOf<'OPEN_DEAL'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'afterMove');
  if (state.bossUid !== action.uid) reject('NOT_YOUR_TURN');
  if (state.deal) reject('DEAL_ALREADY_OPEN');

  const space = state.pawnSpace;
  requireSpaceOpen(state, space);
  const requirements = requireDealSpace(space);
  const boss = requirePlayer(state, action.uid);

  const clanCardIds = action.clanCardIds ?? [];
  if (!Array.isArray(clanCardIds)) reject('INVALID_ACTION');
  requireDistinctCards(clanCardIds);

  const bossClanCards = clanCardIds.map((cardId) => {
    const card = requireCard(boss, cardId);
    if (card.kind !== 'clan') reject('WRONG_CARD_KIND');
    if (!isColorRequired(requirements, card.color)) reject('COLOR_NOT_REQUIRED');
    if (boss.investors.includes(card.color) && !state.onVacation.includes(card.color)) {
      reject('COLOR_ALREADY_IN_DEAL');
    }
    return card;
  });

  if (new Set(bossClanCards.map((card) => card.color)).size !== bossClanCards.length) {
    reject('COLOR_ALREADY_IN_DEAL');
  }

  const excludeColors = action.excludeColors ?? [];
  if (!Array.isArray(excludeColors)) reject('INVALID_ACTION');
  const uniqueExclusions = new Set<FamilyColor>();
  for (const color of excludeColors) {
    if (!isFamilyColor(color)) reject('INVALID_ACTION');
    if (uniqueExclusions.has(color)) reject('INVALID_ACTION');
    uniqueExclusions.add(color);
    if (!boss.investors.includes(color)) reject('INVALID_TARGET');
    if (!isColorRequired(requirements, color)) reject('COLOR_NOT_REQUIRED');
  }

  validateExclusions(requirements, boss.investors, state.onVacation, [...uniqueExclusions]);

  const placedIds = new Set(clanCardIds);
  boss.hand = boss.hand.filter((card) => !placedIds.has(card.id));

  state.deal = {
    space,
    requirements,
    tileNumber: state.dealsClosed + 1,
    bossClanCards,
    offers: {},
    accepted: {},
    excludedColors: [...uniqueExclusions],
    locked: false,
    actionCards: [],
  };
  state.phase = 'dealOpen';

  emit(events, at, {
    type: 'dealOpened',
    uid: action.uid,
    space,
    tileNumber: state.deal.tileNumber,
    dividends: requirements.dividends,
  });
}

function handleDrawCards(
  state: FullGameState,
  action: ActionOf<'DRAW_CARDS'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'afterMove');
  if (state.bossUid !== action.uid) reject('NOT_YOUR_TURN');

  const player = requirePlayer(state, action.uid);
  const draw = drawCards(state.deck, state.discardPile, DRAW_COUNT, state.rngState);
  state.deck = draw.deck;
  state.discardPile = draw.discardPile;
  state.rngState = draw.rngState;
  player.hand.push(...draw.drawn);

  emit(events, at, { type: 'cardsDrawn', uid: player.uid, count: draw.drawn.length });
  finishTurn(state, leftOf(state, player.uid).uid, at, events);
}

function handleSubmitOffer(
  state: FullGameState,
  action: ActionOf<'SUBMIT_OFFER'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  const validated = validateSubmitOffer(state, player, {
    color: action.color,
    source: action.source,
    cardId: action.cardId,
    amount: action.amount,
  });
  const deal = requireDeal(state);

  if (validated.existing) {
    validated.existing.amount = validated.amount;
    validated.existing.submittedAt = at;
  } else {
    const offer: OfferState = {
      color: validated.color,
      source: validated.source,
      amount: validated.amount,
      submittedAt: at,
    };
    if (validated.source === 'hand') {
      const card = validated.card;
      if (!card) reject('CARD_NOT_IN_HAND');
      offer.card = card;
      player.hand = player.hand.filter((held) => held.id !== card.id);
    }
    if (!deal.offers[player.uid]) deal.offers[player.uid] = {};
    deal.offers[player.uid][offer.color] = offer;
  }

  emit(events, at, {
    type: 'offerSubmitted',
    uid: player.uid,
    color: validated.color,
    source: validated.source,
    amount: validated.amount,
  });
}

function handleWithdrawOffer(
  state: FullGameState,
  action: ActionOf<'WITHDRAW_OFFER'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (!isFamilyColor(action.color)) reject('INVALID_ACTION');

  const offer = findOffer(deal, player.uid, action.color);
  if (!offer) reject('OFFER_NOT_FOUND');
  if (offer.source !== 'table') reject('INVALID_ACTION');
  if (deal.accepted[action.color] === player.uid) reject('OFFER_ACCEPTED');

  delete deal.offers[player.uid]?.[action.color];
  emit(events, at, { type: 'offerWithdrawn', uid: player.uid, color: action.color });
}

function handleAcceptOffer(
  state: FullGameState,
  action: ActionOf<'ACCEPT_OFFER'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const validated = validateAcceptOffer(state, boss, action.color, action.targetUid);
  validated.deal.accepted[action.color] = action.targetUid;
  emit(events, at, {
    type: 'offerAccepted',
    uid: action.targetUid,
    color: action.color,
    amount: validated.offer.amount,
  });
}

function handleUnacceptOffer(
  state: FullGameState,
  action: ActionOf<'UNACCEPT_OFFER'>,
  at: number,
  events: GameEvent[],
): void {
  requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (!isFamilyColor(action.color)) reject('INVALID_ACTION');
  if (!deal.accepted[action.color]) reject('OFFER_NOT_FOUND');

  delete deal.accepted[action.color];
  emit(events, at, { type: 'offerUnaccepted', color: action.color });
}

function handleBossAddClan(
  state: FullGameState,
  action: ActionOf<'BOSS_ADD_CLAN'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');

  const card = requireCard(boss, action.cardId);
  if (card.kind !== 'clan') reject('WRONG_CARD_KIND');
  if (!isColorRequired(deal.requirements, card.color)) reject('COLOR_NOT_REQUIRED');
  if (boss.investors.includes(card.color) && !state.onVacation.includes(card.color)) {
    reject('COLOR_ALREADY_IN_DEAL');
  }
  if (deal.bossClanCards.some((placed) => placed.color === card.color)) {
    reject('COLOR_ALREADY_IN_DEAL');
  }
  if (deal.accepted[card.color]) reject('COLOR_ALREADY_IN_DEAL');

  boss.hand = boss.hand.filter((held) => held.id !== card.id);
  deal.bossClanCards.push(card);
  emit(events, at, { type: 'clanAdded', uid: boss.uid, color: card.color });
}

function handleSetExcludedColors(
  state: FullGameState,
  action: ActionOf<'SET_EXCLUDED_COLORS'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (!Array.isArray(action.colors)) reject('INVALID_ACTION');

  const unique = new Set<FamilyColor>();
  for (const color of action.colors) {
    if (!isFamilyColor(color)) reject('INVALID_ACTION');
    if (unique.has(color)) reject('INVALID_ACTION');
    unique.add(color);
    if (!boss.investors.includes(color)) reject('INVALID_TARGET');
    if (!isColorRequired(deal.requirements, color)) reject('COLOR_NOT_REQUIRED');
  }

  validateExclusions(deal.requirements, boss.investors, state.onVacation, [...unique]);

  deal.excludedColors = [...unique];

  // Re-including an investor makes it join for free; drop any accepted offer
  // for that family so one family is not represented twice. A vacationing
  // investor does not auto-join, so its accepted offer must survive.
  const allowed = getAllowedColors(deal.requirements);
  for (const color of boss.investors) {
    if (!allowed.has(color)) continue;
    if (deal.excludedColors.includes(color)) continue;
    if (state.onVacation.includes(color)) continue;
    if (deal.accepted[color]) delete deal.accepted[color];
  }

  emit(events, at, { type: 'excludedColorsSet', uid: boss.uid, colors: [...unique] });
}

function handleLockDeal(
  state: FullGameState,
  action: ActionOf<'LOCK_DEAL'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  if (!isDealComplete(state)) reject('DEAL_INCOMPLETE');

  deal.locked = true;
  state.window = {
    reason: 'dealLocked',
    triggeredBy: boss.uid,
    deadline: at + INTERRUPT_MS,
    passed: [],
  };
  emit(events, at, { type: 'dealLocked', uid: boss.uid });
}

function handleCancelLock(
  state: FullGameState,
  action: ActionOf<'CANCEL_LOCK'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  if (!deal.locked) reject('NOT_LOCKED');
  if (!state.window) reject('NO_WINDOW');

  deal.locked = false;
  emit(events, at, { type: 'lockCancelled', uid: boss.uid });

  if (state.pendingCards.length === 0) {
    state.window = null;
  } else {
    state.window.reason = 'cardPlayed';
  }
}

function handleFailDeal(
  state: FullGameState,
  action: ActionOf<'FAIL_DEAL'>,
  at: number,
  events: GameEvent[],
): void {
  const boss = requireBoss(state, action.uid);
  const deal = requireDeal(state);
  requirePhase(state, 'dealOpen');
  requireNoWindow(state);
  if (deal.locked) reject('DEAL_LOCKED');
  failDealInternal(state, boss.uid, at, events, 'bossAction');
}

function handlePlayTravel(
  state: FullGameState,
  action: ActionOf<'PLAY_TRAVEL'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  requirePhase(state, 'dealOpen');
  const deal = requireDeal(state);
  const card = requireCard(player, action.cardId);
  if (card.kind !== 'travel') reject('WRONG_CARD_KIND');

  const target = validateTravelTarget(state, player, card, action.target);
  player.hand = player.hand.filter((held) => held.id !== card.id);
  deal.actionCards.push(card);

  const pending: PendingCardState = {
    id: `p${state.nextPendingSeq}`,
    seq: state.nextPendingSeq,
    kind: 'travel',
    playerUid: player.uid,
    cards: [card],
    target,
    ts: at,
  };
  state.nextPendingSeq += 1;
  state.pendingCards.push(pending);
  openCardWindow(state, player.uid, at);

  emit(events, at, {
    type: 'cardPlayed',
    uid: player.uid,
    kind: 'travel',
    targetColor: target.color,
    targetUid: target.uid,
  });
}

function handlePlayRecruitment(
  state: FullGameState,
  action: ActionOf<'PLAY_RECRUITMENT'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  requirePhase(state, 'dealOpen');
  const deal = requireDeal(state);
  const validated = validateRecruitment(state, player, action.cardIds, action.targetColor);

  const ids = new Set(validated.cards.map((card) => card.id));
  player.hand = player.hand.filter((held) => !ids.has(held.id));
  deal.actionCards.push(...validated.cards);

  const pending: PendingCardState = {
    id: `p${state.nextPendingSeq}`,
    seq: state.nextPendingSeq,
    kind: 'recruitment',
    playerUid: player.uid,
    cards: validated.cards,
    target: { kind: 'recruit', color: action.targetColor },
    ts: at,
  };
  state.nextPendingSeq += 1;
  state.pendingCards.push(pending);
  openCardWindow(state, player.uid, at);

  emit(events, at, {
    type: 'cardPlayed',
    uid: player.uid,
    kind: 'recruitment',
    targetColor: action.targetColor,
  });
}

function handlePlayImTheBoss(
  state: FullGameState,
  action: ActionOf<'PLAY_IM_THE_BOSS'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  requirePhase(state, 'dealOpen');
  const deal = requireDeal(state);
  if (state.bossUid === player.uid) reject('ALREADY_BOSS');

  const card = requireCard(player, action.cardId);
  if (card.kind !== 'imTheBoss') reject('WRONG_CARD_KIND');

  player.hand = player.hand.filter((held) => held.id !== card.id);
  deal.actionCards.push(card);

  const pending: PendingCardState = {
    id: `p${state.nextPendingSeq}`,
    seq: state.nextPendingSeq,
    kind: 'imTheBoss',
    playerUid: player.uid,
    cards: [card],
    ts: at,
  };
  state.nextPendingSeq += 1;
  state.pendingCards.push(pending);
  openCardWindow(state, player.uid, at);

  emit(events, at, { type: 'cardPlayed', uid: player.uid, kind: 'imTheBoss' });
}

function handlePlayStop(
  state: FullGameState,
  action: ActionOf<'PLAY_STOP'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  requirePhase(state, 'dealOpen');
  if (!state.window) reject('NO_WINDOW');

  const card = requireCard(player, action.cardId);
  if (card.kind !== 'stop') reject('WRONG_CARD_KIND');

  const { pendingIndex } = validateStopTarget(state, player, action.targetPendingId);
  const target = state.pendingCards[pendingIndex];
  const window = state.window;

  player.hand = player.hand.filter((held) => held.id !== card.id);
  state.discardPile.push(card);
  target.stoppedBy = player.uid;

  window.deadline = at + INTERRUPT_MS;
  window.triggeredBy = player.uid;
  window.reason = 'cardPlayed';
  window.passed = window.passed.filter((uid) => uid !== player.uid);

  emit(events, at, {
    type: 'cardPlayed',
    uid: player.uid,
    kind: 'stop',
    targetColor: target.target?.color,
    targetUid: target.playerUid,
  });
  emit(events, at, {
    type: 'cardStopped',
    pendingId: target.id,
    uid: target.playerUid,
    byUid: player.uid,
  });

  closeIfAllPassed(state, at, events);
}

function handlePassWindow(
  state: FullGameState,
  action: ActionOf<'PASS_WINDOW'>,
  at: number,
  events: GameEvent[],
): void {
  const player = requirePlayer(state, action.uid);
  const window = state.window;
  if (!window) reject('NO_WINDOW');

  if (!window.passed.includes(player.uid)) window.passed.push(player.uid);
  closeIfAllPassed(state, at, events);
}

function handleDiscard(
  state: FullGameState,
  action: ActionOf<'DISCARD'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'turnEndDiscard');
  const player = requirePlayer(state, action.uid);
  if (!state.pendingDiscardUids.includes(player.uid)) reject('NOTHING_TO_DISCARD');
  if (player.hand.length <= HAND_LIMIT) reject('NOTHING_TO_DISCARD');
  if (!Array.isArray(action.cardIds) || action.cardIds.length === 0) {
    reject('INVALID_DISCARD');
  }
  requireDistinctCards(action.cardIds);

  const ids = new Set(action.cardIds);
  const discarded = player.hand.filter((card) => ids.has(card.id));
  if (discarded.length !== action.cardIds.length) reject('CARD_NOT_IN_HAND');

  const remaining = player.hand.filter((card) => !ids.has(card.id));
  if (remaining.length !== HAND_LIMIT) reject('INVALID_DISCARD');

  player.hand = remaining;
  state.discardPile.push(...discarded);
  emit(events, at, { type: 'cardsDiscarded', uid: player.uid, count: discarded.length });

  const overLimit = state.players
    .filter((candidate) => candidate.hand.length > HAND_LIMIT)
    .map((candidate) => candidate.uid);
  state.pendingDiscardUids = overLimit;

  if (overLimit.length === 0) {
    const nextUid = state.nextTurnUid;
    if (!nextUid) reject('INVALID_ACTION');
    state.nextTurnUid = null;
    beginTurn(state, nextUid, at, events);
  }
}

function handleSkipDisconnectedBoss(
  state: FullGameState,
  action: ActionOf<'SKIP_DISCONNECTED_BOSS'>,
  at: number,
  events: GameEvent[],
): void {
  requirePlayer(state, action.uid);
  const bossUid = state.bossUid;
  if (!bossUid) reject('WRONG_PHASE');

  if (state.phase === 'turnStart') {
    emit(events, at, { type: 'bossSkipped', uid: bossUid });
    beginTurn(state, leftOf(state, bossUid).uid, at, events);
    return;
  }

  if (state.phase === 'afterMove') {
    emit(events, at, { type: 'bossSkipped', uid: bossUid });
    finishTurn(state, leftOf(state, bossUid).uid, at, events);
    return;
  }

  if (state.phase === 'dealOpen') {
    failDealInternal(state, bossUid, at, events, 'bossSkipped');
    return;
  }

  reject('WRONG_PHASE');
}

function handleRematch(
  state: FullGameState,
  action: ActionOf<'REMATCH'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'gameOver');
  requirePlayer(state, action.uid);
  state.log = [];
  events.push(...startGame(state, at));
}

function handleReassignSeat(
  state: FullGameState,
  action: ActionOf<'REASSIGN_SEAT'>,
  at: number,
  events: GameEvent[],
): void {
  requirePhase(state, 'lobby');
  requirePlayer(state, action.uid);
  const target = requirePlayer(state, action.targetUid);
  if (!Number.isInteger(action.seat) || action.seat < 0 || action.seat >= MAX_PLAYERS) {
    reject('INVALID_SEAT');
  }
  const occupant = state.players.find(
    (player) => player.seat === action.seat && player.uid !== target.uid,
  );
  if (occupant) reject('SEAT_TAKEN');

  target.seat = action.seat;
  emit(events, at, { type: 'seatReassigned', uid: target.uid, seat: action.seat });
}

/* ------------------------------------------------------------------ */
/* Deal failure / resolution                                           */
/* ------------------------------------------------------------------ */

function failDealInternal(
  state: FullGameState,
  bossUid: string,
  at: number,
  events: GameEvent[],
  reason: 'bossAction' | 'bossSkipped',
): void {
  const deal = state.deal;
  if (!deal) return;
  const boss = requirePlayer(state, bossUid);

  for (const card of deal.bossClanCards) boss.hand.push(card);

  for (const uid of Object.keys(deal.offers)) {
    const byColor = deal.offers[uid];
    if (!byColor) continue;
    for (const offer of Object.values(byColor)) {
      if (!offer) continue;
      if (offer.source !== 'hand' || !offer.card) continue;
      const owner = findPlayer(state, uid);
      if (owner) owner.hand.push(offer.card);
    }
  }

  state.discardPile.push(...deal.actionCards);
  state.onVacation = [];

  emit(events, at, { type: 'dealFailed', uid: bossUid, space: deal.space, reason });

  state.deal = null;
  state.window = null;
  state.pendingCards = [];
  finishTurn(state, leftOf(state, bossUid).uid, at, events);
}

function resolveDeal(state: FullGameState, at: number, events: GameEvent[]): void {
  const deal = state.deal;
  const bossUid = state.bossUid;
  if (!deal || !bossUid) return;

  const boss = requirePlayer(state, bossUid);
  const tile = DEAL_TILES[deal.tileNumber - 1];
  if (!tile) return;

  const accepted = getAcceptedOffers(deal);
  const totalDividends = accepted.reduce((total, entry) => total + entry.offer.amount, 0);
  const bossDividends = deal.requirements.dividends - totalDividends;
  const value = tile.valuePerDividend;

  boss.money += bossDividends * value;
  for (const entry of accepted) {
    const offerer = findPlayer(state, entry.uid);
    if (offerer) offerer.money += entry.offer.amount * value;
  }

  const investorColors = new Set<FamilyColor>();
  for (const color of boss.investors) {
    if (!isColorRequired(deal.requirements, color)) continue;
    if (deal.excludedColors.includes(color)) continue;
    if (state.onVacation.includes(color)) continue;
    investorColors.add(color);
  }

  for (const card of deal.bossClanCards) {
    const used = !investorColors.has(card.color) && !deal.accepted[card.color];
    if (used) state.discardPile.push(card);
    else boss.hand.push(card);
  }

  for (const entry of accepted) {
    if (entry.offer.source === 'hand' && entry.offer.card) {
      state.discardPile.push(entry.offer.card);
    }
  }

  for (const uid of Object.keys(deal.offers)) {
    const byColor = deal.offers[uid];
    if (!byColor) continue;
    for (const offer of Object.values(byColor)) {
      if (!offer) continue;
      if (offer.source !== 'hand' || !offer.card) continue;
      if (deal.accepted[offer.color] === uid) continue;
      const owner = findPlayer(state, uid);
      if (owner) owner.hand.push(offer.card);
    }
  }

  state.discardPile.push(...deal.actionCards);
  state.onVacation = [];

  state.closedSpaces.push(deal.space);
  state.dealsClosed += 1;

  const fromSpace = state.pawnSpace;
  state.pawnSpace = nextOpenSpace(deal.space, state.closedSpaces);

  emit(events, at, {
    type: 'dealResolved',
    space: deal.space,
    bossUid: boss.uid,
    tileNumber: deal.tileNumber,
    dividends: deal.requirements.dividends,
    valuePerDividend: value,
    bossDividends,
    accepted: accepted.map((entry) => ({
      uid: entry.uid,
      color: entry.color,
      amount: entry.offer.amount,
    })),
    totalPaid: deal.requirements.dividends * value,
  });

  if (state.pawnSpace !== fromSpace) {
    emit(events, at, { type: 'pawnsMoved', from: fromSpace, to: state.pawnSpace });
  }

  state.deal = null;
  state.window = null;
  state.pendingCards = [];

  events.push(...runEndCheck(state, at));
  if (state.phase === 'gameOver') return;

  finishTurn(state, leftOf(state, boss.uid).uid, at, events);
}

/* ------------------------------------------------------------------ */
/* Interrupt window processing                                         */
/* ------------------------------------------------------------------ */

function moveCardsToDiscard(state: FullGameState, cards: PendingCardState['cards']): void {
  const deal = state.deal;
  if (!deal) {
    state.discardPile.push(...cards);
    return;
  }
  const ids = new Set(cards.map((card) => card.id));
  const found = deal.actionCards.filter((card) => ids.has(card.id));
  if (found.length === 0) return;
  deal.actionCards = deal.actionCards.filter((card) => !ids.has(card.id));
  state.discardPile.push(...found);
}

function applyTravelEffect(state: FullGameState, pending: PendingCardState): boolean {
  const deal = state.deal;
  if (!deal || !pending.target) return false;
  const target = pending.target;

  if (target.kind === 'investor') {
    const owner = findPlayer(state, target.uid);
    if (!owner || !owner.investors.includes(target.color)) return false;
    if (state.onVacation.includes(target.color)) return false;

    state.onVacation.push(target.color);

    const offer = findOffer(deal, owner.uid, target.color);
    if (offer?.source === 'table') {
      delete deal.offers[owner.uid]?.[target.color];
      if (deal.accepted[target.color] === owner.uid) delete deal.accepted[target.color];
    }
    return true;
  }

  if (target.kind !== 'clan') return false;

  if (target.placement === 'bossClan') {
    if (target.uid !== state.bossUid) return false;
    const index = deal.bossClanCards.findIndex((card) => card.color === target.color);
    if (index < 0) return false;
    const [clanCard] = deal.bossClanCards.splice(index, 1);
    state.discardPile.push(clanCard);
    moveCardsToDiscard(state, pending.cards);
    return true;
  }

  const offer = findOffer(deal, target.uid, target.color);
  if (!offer || offer.source !== 'hand' || !offer.card) return false;
  delete deal.offers[target.uid]?.[target.color];
  if (deal.accepted[target.color] === target.uid) delete deal.accepted[target.color];
  state.discardPile.push(offer.card);
  moveCardsToDiscard(state, pending.cards);
  return true;
}

function applyRecruitmentEffect(state: FullGameState, pending: PendingCardState): boolean {
  const deal = state.deal;
  if (!deal || !pending.target || pending.target.kind !== 'recruit') return false;

  const recruiter = findPlayer(state, pending.playerUid);
  if (!recruiter) return false;
  const color = pending.target.color;

  if (state.unclaimedInvestors.includes(color)) {
    state.unclaimedInvestors = state.unclaimedInvestors.filter((candidate) => candidate !== color);
  } else {
    const owner = state.players.find(
      (candidate) => candidate.uid !== recruiter.uid && candidate.investors.includes(color),
    );
    if (!owner) return false;

    owner.investors = owner.investors.filter((candidate) => candidate !== color);
    const offer = findOffer(deal, owner.uid, color);
    if (offer?.source === 'table') {
      delete deal.offers[owner.uid]?.[color];
      if (deal.accepted[color] === owner.uid) delete deal.accepted[color];
    }
  }

  if (!recruiter.investors.includes(color)) {
    recruiter.investors.push(color);
    recruiter.investors.sort((a, b) => FAMILY_INDEX[a] - FAMILY_INDEX[b]);
  }

  if (
    state.bossUid === recruiter.uid &&
    deal.accepted[color] &&
    !state.onVacation.includes(color)
  ) {
    delete deal.accepted[color];
  }

  return true;
}

/**
 * imTheBoss - plan.md 3.5 / ASSUMPTION 2.
 * The new boss's placed cards join the deal for free; the old boss's free
 * participation becomes minimum (amount 1) offers that the new boss can accept.
 * All acceptances are void and exclusions reset because the boss changed.
 */
function applyBossChange(
  state: FullGameState,
  newBossUid: string,
  at: number,
  events: GameEvent[],
): boolean {
  const deal = state.deal;
  const oldBossUid = state.bossUid;
  if (!deal || !oldBossUid || oldBossUid === newBossUid) return false;

  const oldBoss = requirePlayer(state, oldBossUid);
  const newBoss = requirePlayer(state, newBossUid);
  const wasLocked = deal.locked;

  const allowed = getAllowedColors(deal.requirements);
  const oldFreeInvestors = oldBoss.investors.filter(
    (color) =>
      allowed.has(color) &&
      !deal.excludedColors.includes(color) &&
      !state.onVacation.includes(color),
  );
  const oldClanCards = [...deal.bossClanCards];
  deal.bossClanCards = [];

  // The new boss's placed clan offers become free boss cards; table offers and
  // offers for colors outside the space are simply dropped (cards return).
  const newBossOffers = deal.offers[newBossUid] ?? {};
  for (const color of Object.keys(newBossOffers) as FamilyColor[]) {
    const offer = newBossOffers[color];
    if (!offer) continue;
    if (offer.source === 'hand' && offer.card) {
      if (isColorRequired(deal.requirements, offer.color)) {
        deal.bossClanCards.push(offer.card);
      } else {
        newBoss.hand.push(offer.card);
      }
    }
    delete newBossOffers[color];
  }

  // Every agreement is void; the new boss must accept offers again.
  deal.accepted = {};

  // Old boss: participating investors become minimum table offers so the new
  // boss can choose to keep them (ASSUMPTION 2).
  for (const color of oldFreeInvestors) {
    if (deal.offers[oldBossUid]?.[color]) continue;
    if (!deal.offers[oldBossUid]) deal.offers[oldBossUid] = {};
    deal.offers[oldBossUid][color] = {
      color,
      source: 'table',
      amount: 1,
      submittedAt: at,
    };
  }

  // Old boss: placed clan cards become hand offers (or return to hand when the
  // same family already has an offer).
  for (const clanCard of oldClanCards) {
    if (deal.offers[oldBossUid]?.[clanCard.color]) {
      oldBoss.hand.push(clanCard);
      continue;
    }
    if (!deal.offers[oldBossUid]) deal.offers[oldBossUid] = {};
    deal.offers[oldBossUid][clanCard.color] = {
      color: clanCard.color,
      source: 'hand',
      card: clanCard,
      amount: 1,
      submittedAt: at,
    };
  }

  deal.excludedColors = [];
  deal.locked = false;
  state.bossUid = newBossUid;

  emit(events, at, { type: 'bossStolen', fromUid: oldBossUid, toUid: newBossUid });
  if (wasLocked) emit(events, at, { type: 'dealUnlocked', reason: 'bossStolen' });
  return true;
}

/**
 * Closes the current interrupt window: resolves queued cards in timestamp
 * order, then either resolves the locked deal or unlocks it.
 */
export function closeWindow(state: FullGameState, at: number, events: GameEvent[]): void {
  if (!state.window) return;

  const pending = sortPending(state.pendingCards);
  state.pendingCards = [];

  for (const item of pending) {
    if (item.stoppedBy) {
      moveCardsToDiscard(state, item.cards);
      continue;
    }

    if (item.kind === 'travel') {
      const applied = applyTravelEffect(state, item);
      emit(events, at, {
        type: applied ? 'cardResolved' : 'cardFizzled',
        uid: item.playerUid,
        kind: 'travel',
      });
      continue;
    }

    if (item.kind === 'recruitment') {
      const applied = applyRecruitmentEffect(state, item);
      moveCardsToDiscard(state, item.cards);
      emit(events, at, {
        type: applied ? 'cardResolved' : 'cardFizzled',
        uid: item.playerUid,
        kind: 'recruitment',
      });
      continue;
    }

    const applied =
      item.playerUid !== state.bossUid && applyBossChange(state, item.playerUid, at, events);
    emit(events, at, {
      type: applied ? 'cardResolved' : 'cardFizzled',
      uid: item.playerUid,
      kind: 'imTheBoss',
    });
  }

  state.window = null;
  if (!state.deal) return;

  if (state.deal.locked) {
    if (isDealComplete(state)) {
      resolveDeal(state, at, events);
    } else {
      state.deal.locked = false;
      emit(events, at, { type: 'dealUnlocked', reason: 'incomplete' });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function applyAction(state: FullGameState, action: GameAction, now: number): ApplyResult {
  const at = typeof action.ts === 'number' && Number.isFinite(action.ts) ? action.ts : now;

  try {
    if (state.window && at > state.window.deadline + GRACE_MS) reject('TOO_LATE');

    const next = structuredClone(state);
    const events: GameEvent[] = [];

    switch (action.type) {
      case 'JOIN':
        handleJoin(next, action, at, events);
        break;
      case 'LEAVE':
        handleLeave(next, action, at, events);
        break;
      case 'START_GAME':
        handleStartGame(next, action, at, events);
        break;
      case 'ROLL_DICE':
        handleRollDice(next, action, at, events);
        break;
      case 'OPEN_DEAL':
        handleOpenDeal(next, action, at, events);
        break;
      case 'DRAW_CARDS':
        handleDrawCards(next, action, at, events);
        break;
      case 'SUBMIT_OFFER':
        handleSubmitOffer(next, action, at, events);
        break;
      case 'WITHDRAW_OFFER':
        handleWithdrawOffer(next, action, at, events);
        break;
      case 'ACCEPT_OFFER':
        handleAcceptOffer(next, action, at, events);
        break;
      case 'UNACCEPT_OFFER':
        handleUnacceptOffer(next, action, at, events);
        break;
      case 'BOSS_ADD_CLAN':
        handleBossAddClan(next, action, at, events);
        break;
      case 'SET_EXCLUDED_COLORS':
        handleSetExcludedColors(next, action, at, events);
        break;
      case 'LOCK_DEAL':
        handleLockDeal(next, action, at, events);
        break;
      case 'CANCEL_LOCK':
        handleCancelLock(next, action, at, events);
        break;
      case 'FAIL_DEAL':
        handleFailDeal(next, action, at, events);
        break;
      case 'PLAY_TRAVEL':
        handlePlayTravel(next, action, at, events);
        break;
      case 'PLAY_RECRUITMENT':
        handlePlayRecruitment(next, action, at, events);
        break;
      case 'PLAY_STOP':
        handlePlayStop(next, action, at, events);
        break;
      case 'PLAY_IM_THE_BOSS':
        handlePlayImTheBoss(next, action, at, events);
        break;
      case 'PASS_WINDOW':
        handlePassWindow(next, action, at, events);
        break;
      case 'DISCARD':
        handleDiscard(next, action, at, events);
        break;
      case 'SKIP_DISCONNECTED_BOSS':
        handleSkipDisconnectedBoss(next, action, at, events);
        break;
      case 'REMATCH':
        handleRematch(next, action, at, events);
        break;
      case 'REASSIGN_SEAT':
        handleReassignSeat(next, action, at, events);
        break;
      default: {
        const unknownAction: never = action;
        return unknownAction;
      }
    }

    if (events.length > 0) {
      next.log.push(...events);
      if (next.log.length > STORED_LOG_LIMIT) {
        next.log = next.log.slice(-STORED_LOG_LIMIT);
      }
    }

    return { state: next, events };
  } catch (error) {
    if (error instanceof RuleError) return { error: error.reason };
    throw error;
  }
}
