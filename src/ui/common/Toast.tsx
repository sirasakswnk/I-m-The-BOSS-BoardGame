import { useEffect } from 'react';

import { useUiStore } from '@/store/uiStore';

/** Global toast, styled after design/home.html (bottom, ink panel, hard shadow). */
export function Toast() {
  const toast = useUiStore((state) => state.toast);
  const hideToast = useUiStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => hideToast(), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast show ${toast.tone === 'error' ? 'toast-error' : ''}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
