'use client';

/**
 * UndoContext
 *
 * Stellt Undo/Redo Funktionalität für die gesamte Planungsansicht bereit.
 * Registriert auch die Keyboard Shortcuts (Cmd+Z / Cmd+Shift+Z).
 */

import { createContext, useContext, type ReactNode } from 'react';

import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useKeyboardShortcuts } from '@/presentation/hooks/useKeyboardShortcuts';
import {
  useUndoRedo,
} from '@/presentation/hooks/useUndoRedo';

import type { UndoContextValue } from '../hooks/types/undo';

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const UndoContext = createContext<UndoContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface UndoProviderProps {
  children: ReactNode;
}

/**
 * Provider für Undo/Redo Funktionalität.
 *
 * Muss innerhalb des PlanningProvider sein, um nach Undo/Redo
 * die Daten zu aktualisieren.
 */
export function UndoProvider({ children }: UndoProviderProps) {
  const undoRedo = useUndoRedo();
  const { refresh } = usePlanning();

  // Wrapper für Undo mit Refresh
  const handleUndo = async () => {
    await undoRedo.undo();
    await refresh();
  };

  // Wrapper für Redo mit Refresh
  const handleRedo = async () => {
    await undoRedo.redo();
    await refresh();
  };

  // Keyboard Shortcuts registrieren
  useKeyboardShortcuts([
    {
      key: 'z',
      meta: true,
      handler: (e) => {
        e.preventDefault();
        handleUndo();
      },
      disabled: !undoRedo.canUndo || undoRedo.isProcessing,
    },
    {
      key: 'z',
      meta: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        handleRedo();
      },
      disabled: !undoRedo.canRedo || undoRedo.isProcessing,
    },
    {
      key: 'y',
      meta: true,
      handler: (e) => {
        e.preventDefault();
        handleRedo();
      },
      disabled: !undoRedo.canRedo || undoRedo.isProcessing,
    },
  ]);

  // Context Value mit wrapped undo/redo
  const value: UndoContextValue = {
    ...undoRedo,
    undo: handleUndo,
    redo: handleRedo,
  };

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook zum Zugriff auf den UndoContext.
 *
 * @throws Error wenn außerhalb des UndoProvider verwendet
 */
export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
}
