import { create } from 'zustand';

export type ToastTone = 'info' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface UiStore {
  toast: ToastMessage | null;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
}

let nextToastId = 1;

export const useUiStore = create<UiStore>((set) => ({
  toast: null,
  showToast: (message, tone = 'info') =>
    set({ toast: { id: nextToastId++, message, tone } }),
  hideToast: () => set({ toast: null }),
}));
