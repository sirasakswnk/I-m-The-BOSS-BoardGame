import { MAX_PLAYERS } from '@/engine/config/families';

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** Shape of rooms/{code}/meta in Realtime Database (plan.md section 5). */
export interface RoomMeta {
  hostUid: string;
  hostConnected: boolean;
  status: RoomStatus;
  createdAt: number;
  schemaVersion: number;
}

/** Shape of rooms/{code}/players/{uid} in Realtime Database. */
export interface RoomPlayer {
  name: string;
  seat: number;
  connected: boolean;
  lastSeen: number;
  joinedAt: number;
}

export type RoomPlayers = Record<string, RoomPlayer>;

export interface RoomSnapshot {
  meta: RoomMeta;
  players: RoomPlayers;
}

export type RoomErrorCode =
  | 'AUTH_FAILED'
  | 'INVALID_CODE'
  | 'INVALID_NICKNAME'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_STARTED'
  | 'ROOM_FINISHED'
  | 'CODE_RETRY'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

/** Keeps the player cap in one place; the engine remains the rules source. */
export const ROOM_MAX_PLAYERS = MAX_PLAYERS;
