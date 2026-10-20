import type { DealRequirementGroup, DealSpace } from './config/dealBoard';
import type { FamilyColor } from './config/families';
import type { ClanCard, InfluenceCard, InfluenceCardKind } from './config/influenceCards';

export type Phase =
  | 'lobby'
  | 'setupPickStart'
  | 'turnStart'
  | 'afterMove'
  | 'dealOpen'
  | 'turnEndDiscard'
  | 'gameOver';

export interface PlayerState {
  uid: string;
  name: string;
  seat: number;
  investors: FamilyColor[];
  hand: InfluenceCard[];
  money: number;
}

export type OfferSource = 'table' | 'hand';

export interface OfferState {
  color: FamilyColor;
  source: OfferSource;
  /** Present only for `source: 'hand'`; never projected into public state. */
  card?: ClanCard;
  amount: number;
  submittedAt: number;
}

export type TravelTarget =
  | { kind: 'investor'; color: FamilyColor; uid: string }
  | { kind: 'clan'; color: FamilyColor; uid: string; placement: 'bossClan' | 'offer' };

export type PendingTarget =
  | { kind: 'investor'; color: FamilyColor; uid: string }
  | { kind: 'clan'; color: FamilyColor; uid: string; placement: 'bossClan' | 'offer' }
  | { kind: 'recruit'; color: FamilyColor };

export type PendingKind = 'travel' | 'recruitment' | 'imTheBoss';

export interface PendingCardState {
  /** Public id, also used by PLAY_STOP (`p1`, `p2`, ...). */
  id: string;
  /** Monotonic sequence used to break ties between equal timestamps. */
  seq: number;
  kind: PendingKind;
  playerUid: string;
  /** Action cards set aside for this effect; hidden from public projection. */
  cards: InfluenceCard[];
  target?: PendingTarget;
  ts: number;
  stoppedBy?: string;
}

export interface DealState {
  space: number;
  /** Snapshot of the board space requirements (config copy). */
  requirements: DealSpace;
  /** Tile that will be placed when this deal resolves (= dealsClosed + 1). */
  tileNumber: number;
  /** Clan cards the boss placed face-up, removed from their hand. */
  bossClanCards: ClanCard[];
  offers: Record<string, Partial<Record<FamilyColor, OfferState>>>;
  /** color -> uid of the player whose offer the boss accepted. */
  accepted: Partial<Record<FamilyColor, string>>;
  excludedColors: FamilyColor[];
  locked: boolean;
  /** Action cards played into this deal; discarded when the deal ends. */
  actionCards: InfluenceCard[];
}

export interface InterruptWindowState {
  reason: 'dealLocked' | 'cardPlayed';
  triggeredBy: string;
  deadline: number;
  passed: string[];
}

export interface FullGameState {
  schemaVersion: 1;
  phase: Phase;
  players: PlayerState[];
  turnNumber: number;
  /** Current turn owner at TURN_START, and current boss while a deal is open. */
  bossUid: string | null;
  startPickerUid: string | null;
  /** 0 until the start space has been picked. */
  pawnSpace: number;
  closedSpaces: number[];
  dealsClosed: number;
  unclaimedInvestors: FamilyColor[];
  onVacation: FamilyColor[];
  deck: InfluenceCard[];
  discardPile: InfluenceCard[];
  rngState: number;
  deal: DealState | null;
  pendingCards: PendingCardState[];
  window: InterruptWindowState | null;
  nextPendingSeq: number;
  lastDice: number[] | null;
  log: GameEvent[];
  finalScores: Record<string, number> | null;
  /** Set while the current turn is waiting for mandatory discards. */
  nextTurnUid: string | null;
  pendingDiscardUids: string[];
}

export type GameAction =
  | { type: 'JOIN'; uid: string; name: string; ts?: number }
  | { type: 'LEAVE'; uid: string; ts?: number }
  | { type: 'START_GAME'; uid: string; ts?: number }
  | { type: 'SET_START_SPACE'; uid: string; space: number; ts?: number }
  | { type: 'ROLL_DICE'; uid: string; ts?: number }
  | {
      type: 'OPEN_DEAL';
      uid: string;
      clanCardIds?: string[];
      excludeColors?: FamilyColor[];
      ts?: number;
    }
  | { type: 'DRAW_CARDS'; uid: string; ts?: number }
  | {
      type: 'SUBMIT_OFFER';
      uid: string;
      color: FamilyColor;
      source: OfferSource;
      cardId?: string;
      amount: number;
      ts?: number;
    }
  | { type: 'WITHDRAW_OFFER'; uid: string; color: FamilyColor; ts?: number }
  | { type: 'ACCEPT_OFFER'; uid: string; color: FamilyColor; targetUid: string; ts?: number }
  | { type: 'UNACCEPT_OFFER'; uid: string; color: FamilyColor; ts?: number }
  | { type: 'BOSS_ADD_CLAN'; uid: string; cardId: string; ts?: number }
  | { type: 'SET_EXCLUDED_COLORS'; uid: string; colors: FamilyColor[]; ts?: number }
  | { type: 'LOCK_DEAL'; uid: string; ts?: number }
  | { type: 'CANCEL_LOCK'; uid: string; ts?: number }
  | { type: 'FAIL_DEAL'; uid: string; ts?: number }
  | { type: 'PLAY_TRAVEL'; uid: string; cardId: string; target: TravelTarget; ts?: number }
  | {
      type: 'PLAY_RECRUITMENT';
      uid: string;
      cardIds: string[];
      targetColor: FamilyColor;
      ts?: number;
    }
  | { type: 'PLAY_STOP'; uid: string; cardId: string; targetPendingId: string; ts?: number }
  | { type: 'PLAY_IM_THE_BOSS'; uid: string; cardId: string; ts?: number }
  | { type: 'PASS_WINDOW'; uid: string; ts?: number }
  | { type: 'DISCARD'; uid: string; cardIds: string[]; ts?: number }
  | { type: 'SKIP_DISCONNECTED_BOSS'; uid: string; ts?: number }
  | { type: 'REMATCH'; uid: string; ts?: number }
  | { type: 'REASSIGN_SEAT'; uid: string; targetUid: string; seat: number; ts?: number };

export type ActionType = GameAction['type'];

interface BaseEvent {
  at: number;
}

export type GameEvent =
  | (BaseEvent & {
      type: 'gameStarted';
      playerCount: number;
      firstUid: string;
      pickerUid: string;
    })
  | (BaseEvent & { type: 'playerJoined'; uid: string; name: string; seat: number })
  | (BaseEvent & { type: 'playerLeft'; uid: string })
  | (BaseEvent & { type: 'seatReassigned'; uid: string; seat: number })
  | (BaseEvent & { type: 'turnStarted'; uid: string; turnNumber: number })
  | (BaseEvent & { type: 'startSpacePicked'; uid: string; space: number })
  | (BaseEvent & {
      type: 'dealOpened';
      uid: string;
      space: number;
      tileNumber: number;
      dividends: number;
    })
  | (BaseEvent & { type: 'diceRolled'; uid: string; face: number; from: number; to: number })
  | (BaseEvent & { type: 'cardsDrawn'; uid: string; count: number })
  | (BaseEvent & {
      type: 'offerSubmitted';
      uid: string;
      color: FamilyColor;
      source: OfferSource;
      amount: number;
    })
  | (BaseEvent & { type: 'offerWithdrawn'; uid: string; color: FamilyColor })
  | (BaseEvent & { type: 'offerAccepted'; uid: string; color: FamilyColor; amount: number })
  | (BaseEvent & { type: 'offerUnaccepted'; color: FamilyColor })
  | (BaseEvent & { type: 'clanAdded'; uid: string; color: FamilyColor })
  | (BaseEvent & { type: 'excludedColorsSet'; uid: string; colors: FamilyColor[] })
  | (BaseEvent & { type: 'dealLocked'; uid: string })
  | (BaseEvent & { type: 'lockCancelled'; uid: string })
  | (BaseEvent & { type: 'dealUnlocked'; reason: 'incomplete' | 'bossStolen' })
  | (BaseEvent & {
      type: 'cardPlayed';
      uid: string;
      kind: PendingKind | 'stop';
      targetColor?: FamilyColor;
      targetUid?: string;
    })
  | (BaseEvent & { type: 'cardStopped'; pendingId: string; uid: string; byUid: string })
  | (BaseEvent & { type: 'cardResolved'; uid: string; kind: PendingKind })
  | (BaseEvent & { type: 'cardFizzled'; uid: string; kind: PendingKind })
  | (BaseEvent & { type: 'bossStolen'; fromUid: string; toUid: string })
  | (BaseEvent & {
      type: 'dealResolved';
      space: number;
      bossUid: string;
      tileNumber: number;
      dividends: number;
      valuePerDividend: number;
      bossDividends: number;
      accepted: { uid: string; color: FamilyColor; amount: number }[];
      totalPaid: number;
    })
  | (BaseEvent & {
      type: 'dealFailed';
      uid: string;
      space: number;
      reason: 'bossAction' | 'bossSkipped';
    })
  | (BaseEvent & { type: 'pawnsMoved'; from: number; to: number })
  | (BaseEvent & { type: 'endCheckRolled'; tileNumber: number; face: number; ends: boolean })
  | (BaseEvent & {
      type: 'gameOver';
      finalScores: Record<string, number>;
      winners: string[];
    })
  | (BaseEvent & { type: 'discardRequired'; uids: string[] })
  | (BaseEvent & { type: 'cardsDiscarded'; uid: string; count: number })
  | (BaseEvent & { type: 'bossSkipped'; uid: string });

/* ------------------------------------------------------------------ */
/* Public / private projections                                        */
/* ------------------------------------------------------------------ */

export interface PublicOffer {
  color: FamilyColor;
  source: OfferSource;
  amount: number;
  submittedAt: number;
}

export interface PublicDeal {
  space: number;
  requirements: DealSpace;
  tileNumber: number;
  bossClans: FamilyColor[];
  offers: Record<string, Partial<Record<FamilyColor, PublicOffer>>>;
  acceptedOffers: Partial<Record<FamilyColor, string>>;
  excludedColors: FamilyColor[];
  locked: boolean;
}

export interface PublicPendingCard {
  id: string;
  kind: PendingKind;
  playerUid: string;
  target?: PendingTarget;
  stoppedBy?: string;
}

export interface PublicState {
  phase: Phase;
  turnNumber: number;
  bossUid: string | null;
  startPickerUid: string | null;
  pawnSpace: number;
  closedSpaces: number[];
  dealsClosed: number;
  tableInvestors: Record<string, FamilyColor[]>;
  unclaimedInvestors: FamilyColor[];
  onVacation: FamilyColor[];
  handCounts: Record<string, number>;
  deckCount: number;
  discardCount: number;
  deal: PublicDeal | null;
  pendingCards: PublicPendingCard[];
  window: InterruptWindowState | null;
  lastDice: number[] | null;
  log: GameEvent[];
  finalScores: Record<string, number> | null;
  pendingDiscardUids: string[];
}

export interface PrivateState {
  hand: InfluenceCard[];
  money: number;
}

export interface ProjectedState {
  public: PublicState;
  private: Record<string, PrivateState>;
}

export type RejectReason =
  | 'NOT_IN_LOBBY'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ROOM_FULL'
  | 'PLAYER_EXISTS'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_NAME'
  | 'INVALID_ACTION'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'NOT_BOSS'
  | 'NOT_START_PICKER'
  | 'INVALID_SPACE'
  | 'SPACE_CLOSED'
  | 'DEAL_ALREADY_OPEN'
  | 'NO_OPEN_DEAL'
  | 'DEAL_LOCKED'
  | 'WINDOW_OPEN'
  | 'NO_WINDOW'
  | 'CARD_NOT_IN_HAND'
  | 'WRONG_CARD_KIND'
  | 'CARD_ALREADY_PLACED'
  | 'COLOR_NOT_REQUIRED'
  | 'COLOR_ALREADY_IN_DEAL'
  | 'INVALID_EXCLUSION'
  | 'COLOR_ON_VACATION'
  | 'INVALID_TARGET'
  | 'INVALID_AMOUNT'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_ACCEPTED'
  | 'OFFER_SOURCE_MISMATCH'
  | 'CANNOT_OFFER_AS_BOSS'
  | 'ALREADY_BOSS'
  | 'CANNOT_ACCEPT_OWN_OFFER'
  | 'NOT_LOCKED'
  | 'DIVIDENDS_EXCEEDED'
  | 'DEAL_INCOMPLETE'
  | 'NOTHING_TO_DISCARD'
  | 'INVALID_DISCARD'
  | 'PENDING_NOT_FOUND'
  | 'CANNOT_STOP_STOP'
  | 'STOP_ALREADY_PLAYED'
  | 'CANNOT_STOP_OWN_CARD'
  | 'UNCLAIMED_INVESTORS_REMAIN'
  | 'NO_INVESTOR_TARGET'
  | 'INVALID_RECRUITMENT_CARDS'
  | 'TOO_LATE'
  | 'GAME_NOT_OVER'
  | 'SEAT_TAKEN'
  | 'INVALID_SEAT'
  | 'TARGET_IS_SELF'
  | 'NOT_ENOUGH_CARDS';

export interface ActionResult {
  state: FullGameState;
  events: GameEvent[];
}

export type ApplyResult = ActionResult | { error: RejectReason };

export interface TickResult {
  state: FullGameState;
  events: GameEvent[];
}

export type { DealRequirementGroup, DealSpace, FamilyColor, InfluenceCard, InfluenceCardKind };