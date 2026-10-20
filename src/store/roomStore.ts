import { create } from 'zustand';

import type { RoomErrorCode, RoomMeta, RoomPlayers } from '@/net/roomTypes';

interface RoomStore {
  /** Anonymous Firebase uid, shared by Home and Room. */
  uid: string | null;
  authReady: boolean;
  authErrorCode: RoomErrorCode | null;

  /** Current room snapshot (only the public lobby paths). */
  roomCode: string | null;
  meta: RoomMeta | null;
  players: RoomPlayers;
  roomLoading: boolean;
  roomErrorCode: RoomErrorCode | null;

  setAuth: (uid: string) => void;
  setAuthError: (code: RoomErrorCode) => void;

  beginRoom: (code: string) => void;
  setMeta: (meta: RoomMeta | null) => void;
  setPlayers: (players: RoomPlayers) => void;
  setRoomLoading: (loading: boolean) => void;
  setRoomError: (code: RoomErrorCode | null) => void;
  resetRoom: () => void;
}

const initialRoomState = {
  roomCode: null,
  meta: null,
  players: {} as RoomPlayers,
  roomLoading: false,
  roomErrorCode: null,
};

export const useRoomStore = create<RoomStore>((set) => ({
  uid: null,
  authReady: false,
  authErrorCode: null,

  ...initialRoomState,

  setAuth: (uid) => set({ uid, authReady: true, authErrorCode: null }),
  setAuthError: (code) => set({ uid: null, authReady: true, authErrorCode: code }),

  beginRoom: (code) =>
    set({
      ...initialRoomState,
      roomCode: code,
      roomLoading: true,
    }),
  setMeta: (meta) => set({ meta, roomErrorCode: meta ? null : 'ROOM_NOT_FOUND' }),
  setPlayers: (players) => set({ players }),
  setRoomLoading: (roomLoading) => set({ roomLoading }),
  setRoomError: (roomErrorCode) => set({ roomErrorCode, roomLoading: false }),
  resetRoom: () => set({ ...initialRoomState }),
}));
