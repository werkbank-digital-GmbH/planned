'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DropHighlightStatus = 'valid' | 'absence';

export interface DropHighlight {
  /** ID der Ziel-Phase */
  phaseId: string;
  /** Map von dateISO → Status (valid oder absence) */
  days: Map<string, DropHighlightStatus>;
}

interface DragHighlightContextValue {
  /** Aktuelles Drop-Highlight (null wenn kein Drag aktiv oder Drag nicht über Phase) */
  highlight: DropHighlight | null;
  /** Setzt den Highlight-State. Nur updaten wenn sich phaseId oder Datums-Keys ändern. */
  setHighlight: (highlight: DropHighlight | null) => void;
  /** Löscht den Highlight-State */
  clearHighlight: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const DragHighlightContext = createContext<DragHighlightContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function DragHighlightProvider({ children }: { children: ReactNode }) {
  const [highlight, setHighlightState] = useState<DropHighlight | null>(null);

  // Referenz-Vergleich um unnötige Re-Renders zu vermeiden
  const prevKeyRef = useRef<string>('');

  const setHighlight = useCallback((next: DropHighlight | null) => {
    if (!next) {
      if (prevKeyRef.current !== '') {
        prevKeyRef.current = '';
        setHighlightState(null);
      }
      return;
    }

    // Erzeuge einen Cache-Key aus phaseId + sortierte Datums-Keys
    const daysKeys = Array.from(next.days.keys()).sort().join(',');
    const key = `${next.phaseId}:${daysKeys}`;

    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setHighlightState(next);
    }
  }, []);

  const clearHighlight = useCallback(() => {
    if (prevKeyRef.current !== '') {
      prevKeyRef.current = '';
      setHighlightState(null);
    }
  }, []);

  return (
    <DragHighlightContext.Provider value={{ highlight, setHighlight, clearHighlight }}>
      {children}
    </DragHighlightContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDragHighlight(): DragHighlightContextValue {
  const context = useContext(DragHighlightContext);
  if (!context) {
    throw new Error('useDragHighlight must be used within a DragHighlightProvider');
  }
  return context;
}

/**
 * Convenience-Hook: Gibt den Highlight-Status für eine bestimmte Phase + Datum zurück.
 *
 * @returns 'valid' | 'absence' | null
 */
export function useDayHighlightStatus(phaseId: string, dateISO: string): DropHighlightStatus | null {
  const { highlight } = useDragHighlight();

  if (!highlight || highlight.phaseId !== phaseId) return null;
  return highlight.days.get(dateISO) ?? null;
}
