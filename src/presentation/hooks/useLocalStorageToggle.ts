'use client';

import { useCallback, useState } from 'react';

/**
 * Generischer Hook für einen localStorage-backed boolean Toggle.
 *
 * Liest den initialen Wert aus localStorage (SSR-safe) und persistiert
 * Änderungen automatisch.
 *
 * @param key - localStorage Key (z.B. 'planned.hideEmptyProjects')
 * @param defaultValue - Fallback wenn kein Wert im Storage (Default: false)
 */
export function useLocalStorageToggle(key: string, defaultValue = false) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? stored === 'true' : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const toggle = useCallback(() => {
    setValue((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // localStorage nicht verfügbar - ignorieren
      }
      return next;
    });
  }, [key]);

  return [value, toggle] as const;
}
