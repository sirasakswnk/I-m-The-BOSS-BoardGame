import type {
  ActionType,
  FullGameState,
  PrivateState,
  PublicState,
  RejectReason,
} from '@/engine/types';

/**
 * Shape of one child under rooms/{code}/actions (plan.md section 5).
 * The client writes uid/type/payload/ts; the host reconstructs a GameAction.
 */
export interface StoredAction {
  uid: string;
  type: ActionType;
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
