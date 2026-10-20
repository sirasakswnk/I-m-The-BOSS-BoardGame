import type {
  DealState,
  FamilyColor,
  FullGameState,
  InfluenceCard,
  InterruptWindowState,
  PendingCardState,
  PlayerState,
  PrivateState,
  PublicDeal,
  PublicPendingCard,
  PublicState,
} from '@/engine/types';

/**
 * Realtime Database does not persist empty arrays or empty objects. Engine
 * states written with `update()` therefore lose fields such as `closedSpaces:
 * []` or `deal: null`; these helpers restore the engine's expected shape.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizePlayer(raw: unknown): PlayerState {
  const player = asRecord(raw);
  return {
    uid: asString(player.uid),
    name: asString(player.name),
    seat: asNumber(player.seat),
    investors: asArray<FamilyColor>(player.investors),
    hand: asArray<InfluenceCard>(player.hand),
    money: asNumber(player.money),
  };
}

function normalizeWindow(raw: unknown): InterruptWindowState | null {
  if (!isRecord(raw)) return null;
  return {
    reason: raw.reason === 'dealLocked' ? 'dealLocked' : 'cardPlayed',
    triggeredBy: asString(raw.triggeredBy),
    deadline: asNumber(raw.deadline),
    passed: asArray<string>(raw.passed),
  };
}

function normalizePending(raw: unknown): PendingCardState {
  const pending = asRecord(raw);
  return {
    id: asString(pending.id),
    seq: asNumber(pending.seq),
    kind:
      pending.kind === 'travel' ||
      pending.kind === 'recruitment' ||
      pending.kind === 'imTheBoss'
        ? pending.kind
        : 'travel',
    playerUid: asString(pending.playerUid),
    cards: asArray<InfluenceCard>(pending.cards),
    target: isRecord(pending.target)
      ? (pending.target as unknown as PendingCardState['target'])
      : undefined,
    ts: asNumber(pending.ts),
    stoppedBy: typeof pending.stoppedBy === 'string' ? pending.stoppedBy : undefined,
  };
}

function normalizeDeal(raw: unknown): DealState | null {
  if (!isRecord(raw)) return null;
  const requirements = isRecord(raw.requirements)
    ? (raw.requirements as unknown as DealState['requirements'])
    : null;
  if (!requirements) return null;

  return {
    space: asNumber(raw.space),
    requirements,
    tileNumber: asNumber(raw.tileNumber),
    bossClanCards: asArray(raw.bossClanCards),
    offers: asRecord(raw.offers) as DealState['offers'],
    accepted: asRecord(raw.accepted) as DealState['accepted'],
    excludedColors: asArray<FamilyColor>(raw.excludedColors),
    locked: raw.locked === true,
    actionCards: asArray<InfluenceCard>(raw.actionCards),
  };
}

/** Restores a hostState snapshot after RTDB dropped empty nodes. */
export function normalizeHostState(raw: unknown): FullGameState | null {
  if (!isRecord(raw)) return null;

  return {
    schemaVersion: 1,
    phase: (raw.phase as FullGameState['phase']) ?? 'lobby',
    players: asArray(raw.players).map(normalizePlayer),
    turnNumber: asNumber(raw.turnNumber),
    bossUid: asNullableString(raw.bossUid),
    startPickerUid: asNullableString(raw.startPickerUid),
    pawnSpace: asNumber(raw.pawnSpace),
    closedSpaces: asArray<number>(raw.closedSpaces),
    dealsClosed: asNumber(raw.dealsClosed),
    unclaimedInvestors: asArray<FamilyColor>(raw.unclaimedInvestors),
    onVacation: asArray<FamilyColor>(raw.onVacation),
    deck: asArray<InfluenceCard>(raw.deck),
    discardPile: asArray<InfluenceCard>(raw.discardPile),
    rngState: asNumber(raw.rngState, 1),
    deal: normalizeDeal(raw.deal),
    pendingCards: asArray(raw.pendingCards).map(normalizePending),
    window: normalizeWindow(raw.window),
    nextPendingSeq: asNumber(raw.nextPendingSeq, 1),
    lastDice: Array.isArray(raw.lastDice) ? (raw.lastDice as number[]) : null,
    log: asArray(raw.log) as FullGameState['log'],
    finalScores: isRecord(raw.finalScores)
      ? (raw.finalScores as Record<string, number>)
      : null,
    nextTurnUid: asNullableString(raw.nextTurnUid),
    pendingDiscardUids: asArray<string>(raw.pendingDiscardUids),
  };
}

function normalizePublicDeal(raw: unknown): PublicDeal | null {
  if (!isRecord(raw)) return null;
  const requirements = isRecord(raw.requirements)
    ? (raw.requirements as unknown as PublicDeal['requirements'])
    : null;
  if (!requirements) return null;

  return {
    space: asNumber(raw.space),
    requirements,
    tileNumber: asNumber(raw.tileNumber),
    bossClans: asArray<FamilyColor>(raw.bossClans),
    offers: asRecord(raw.offers) as PublicDeal['offers'],
    acceptedOffers: asRecord(raw.acceptedOffers) as PublicDeal['acceptedOffers'],
    excludedColors: asArray<FamilyColor>(raw.excludedColors),
    locked: raw.locked === true,
  };
}

function normalizeInvestorMap(raw: unknown): Record<string, FamilyColor[]> {
  const result: Record<string, FamilyColor[]> = {};
  for (const [uid, colors] of Object.entries(asRecord(raw))) {
    result[uid] = asArray<FamilyColor>(colors);
  }
  return result;
}

function normalizeHandCounts(raw: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [uid, count] of Object.entries(asRecord(raw))) {
    result[uid] = asNumber(count);
  }
  return result;
}

/** Restores public state after RTDB dropped empty arrays / objects. */
export function normalizePublicState(raw: unknown): PublicState | null {
  if (!isRecord(raw)) return null;

  return {
    phase: (raw.phase as PublicState['phase']) ?? 'lobby',
    turnNumber: asNumber(raw.turnNumber),
    bossUid: asNullableString(raw.bossUid),
    startPickerUid: asNullableString(raw.startPickerUid),
    pawnSpace: asNumber(raw.pawnSpace),
    closedSpaces: asArray<number>(raw.closedSpaces),
    dealsClosed: asNumber(raw.dealsClosed),
    tableInvestors: normalizeInvestorMap(raw.tableInvestors),
    unclaimedInvestors: asArray<FamilyColor>(raw.unclaimedInvestors),
    onVacation: asArray<FamilyColor>(raw.onVacation),
    handCounts: normalizeHandCounts(raw.handCounts),
    deckCount: asNumber(raw.deckCount),
    discardCount: asNumber(raw.discardCount),
    deal: normalizePublicDeal(raw.deal),
    pendingCards: asArray<PublicPendingCard>(raw.pendingCards),
    window: normalizeWindow(raw.window),
    lastDice: Array.isArray(raw.lastDice) ? (raw.lastDice as number[]) : null,
    log: asArray(raw.log) as PublicState['log'],
    finalScores: isRecord(raw.finalScores)
      ? (raw.finalScores as Record<string, number>)
      : null,
    pendingDiscardUids: asArray<string>(raw.pendingDiscardUids),
  };
}

/** Private state is small; missing fields mean the subscription has not landed. */
export function normalizePrivateState(raw: unknown): PrivateState | null {
  if (!isRecord(raw)) return null;
  return {
    hand: asArray<InfluenceCard>(raw.hand),
    money: asNumber(raw.money),
  };
}
