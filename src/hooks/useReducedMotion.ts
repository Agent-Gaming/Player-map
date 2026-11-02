import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// No existing reduced-motion handling anywhere in this repo (confirmed by
// grep) — used wherever a cosmetic choses between its animated `src` and
// static `src_static` variant.
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}
