'use client';

import { useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ShortcutConfig {
  /** Taste(n) die den Shortcut auslösen */
  key: string | string[];
  /** Cmd (Mac) / Ctrl (Windows) erforderlich */
  meta?: boolean;
  /** Alt-Taste erforderlich */
  alt?: boolean;
  /** Shift-Taste erforderlich */
  shift?: boolean;
  /** Handler der bei Match aufgerufen wird */
  handler: (e: KeyboardEvent) => void;
  /** Shortcut deaktivieren */
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für globale Keyboard Shortcuts.
 *
 * Features:
 * - Unterstützt einzelne Tasten und Tastenkombinationen
 * - Meta-Key (Cmd/Ctrl) Support für Mac und Windows
 * - Ignoriert Events wenn Input/Textarea fokussiert
 * - Shortcuts können deaktiviert werden
 *
 * @example
 * ```typescript
 * useKeyboardShortcuts([
 *   { key: 'c', meta: true, handler: handleCopy },
 *   { key: 'Escape', handler: handleCancel },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Nicht triggern wenn ein Eingabefeld fokussiert ist
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key];
        const keyMatches = keys.includes(e.key);

        // Meta auf Mac = Cmd, auf Windows = Ctrl
        const metaMatches = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;

        const altMatches = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (keyMatches && metaMatches && altMatches && shiftMatches) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
