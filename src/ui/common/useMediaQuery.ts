import { useCallback, useSyncExternalStore } from 'react';

/** plan.md 9.2: < 768 phone, 768–1023 tablet (wide phone layout), ≥ 1024 desktop. */
export const COMPACT_TABLE_QUERY = '(max-width: 1023px)';
export const PHONE_QUERY = '(max-width: 767px)';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function matchesQuery(query: string): boolean {
  return canMatch() && window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => matchesQuery(query),
    () => false,
  );
}
