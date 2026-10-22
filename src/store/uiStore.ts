import { create } from 'zustand';

export type ToastTone = 'info' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

const SOUND_STORAGE_KEY = 'im-the-boss:sound-enabled';

function readSoundPreference(): boolean {
  try {
    return globalThis.localStorage?.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveSoundPreference(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Private browsing can reject storage; the in-memory toggle still works.
  }
}

interface UiStore {
  toast: ToastMessage | null;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
  /** Web Audio effects are opt-in and default to off. */
  soundEnabled: boolean;
  toggleSound: () => void;
}

let nextToastId = 1;

export const useUiStore = create<UiStore>((set) => ({
  toast: null,
  showToast: (message, tone = 'info') =>
    set({ toast: { id: nextToastId++, message, tone } }),
  hideToast: () => set({ toast: null }),
  soundEnabled: readSoundPreference(),
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      saveSoundPreference(next);
      return { soundEnabled: next };
    }),
}));
