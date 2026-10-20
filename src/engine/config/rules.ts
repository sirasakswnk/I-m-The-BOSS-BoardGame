/**
 * Game constants - plan.md section 3.4.
 * Every number the rules depend on lives here, never in the engine logic.
 */
export const STARTING_MONEY = 0;
export const STARTING_HAND_SIZE = 5;
export const HAND_LIMIT = 12;
export const INTERRUPT_MS = 5000;
export const GRACE_MS = 300;
export const DEAL_TILE_COUNT = 15;

/** Number of cards drawn by DRAW_CARDS. */
export const DRAW_COUNT = 3;

/** A recruitment play must use exactly this many cards at once. */
export const RECRUITMENT_PLAY_COUNT = 3;

/** First deal count at which the end-of-game die roll happens. */
export const END_CHECK_FIRST_DEAL = 10;

/**
 * The host closes an interrupt window only after `deadline + GRACE_MS + this`
 * to give in-flight actions time to arrive (plan.md 7.2).
 */
export const HOST_CLOSE_BUFFER_MS = 200;

/** Number of events kept in the public log. */
export const PUBLIC_LOG_LIMIT = 50;

/** Number of events kept in the full state log. */
export const STORED_LOG_LIMIT = 200;
