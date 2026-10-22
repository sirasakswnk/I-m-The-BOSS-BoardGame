import type {
  ActionType,
  FullGameState,
  PrivateState,
  PublicState,
  RejectReason,
} from '@/engine/types';

/** A room-level recovery action handled by the host before the engine. */
export interface SeatReclaimAction {
  type: 'RECLAIM_SEAT';
  uid: string;
  oldUid: string;
  newUid: string;
  name: string;
  ts?: number;
}

export type StoredActionType = ActionType | SeatReclaimAction['type'];

/**
 * Shape of one child under rooms/{code}/actions (plan.md section 5).
 * The client writes uid/type/payload/ts; the host reconstructs a GameAction.
 */
export interface StoredAction {
  uid: string;
  type: StoredActionType;
  payload?: Record<string, unknown>;
  ts?: number;
}

/** rooms/{code}/public/rejections/{uid} written by the host on validation failure. */
export interface ActionRejection {
  reason: RejectReason;
  actionId: string;
  at: number;
}

/** A game snapshot as read from the public/private RTDB paths. */
export interface GameSnapshot {
  public: PublicState;
  private: PrivateState;
}

/** The full authoritative state stored under rooms/{code}/hostState. */
export type HostState = FullGameState;
