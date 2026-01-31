'use client';

/**
 * useUndoRedo Hook
 *
 * Verwaltet den Undo/Redo Stack für Allocation-Operationen.
 * Maximum 50 Aktionen im Stack. Nicht persistent über Page Reload.
 */

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createAllocationDirect,
  deleteAllocationDirect,
  moveAllocationDirect,
} from '@/presentation/actions/allocations-direct';

import type { UndoableAction, UndoContextValue } from './types/undo';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_UNDO_STACK = 50;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Führt die Undo-Aktion aus (Gegenteil der ursprünglichen Aktion).
 */
async function executeUndoAction(action: UndoableAction): Promise<void> {
  switch (action.type) {
    case 'CREATE_ALLOCATION':
      // Erstellung rückgängig = Löschen
      await deleteAllocationDirect(action.allocation.id);
      break;

    case 'DELETE_ALLOCATION':
      // Löschung rückgängig = Wiederherstellen
      await createAllocationDirect(action.allocation);
      break;

    case 'MOVE_ALLOCATION':
      // Verschiebung rückgängig = Zurück zur ursprünglichen Position
      await moveAllocationDirect(action.allocationId, action.from);
      break;

    case 'BATCH_CREATE':
      // Batch-Erstellung rückgängig = Alle löschen
      await Promise.all(
        action.allocations.map((a) => deleteAllocationDirect(a.id))
      );
      break;

    case 'BATCH_DELETE':
      // Batch-Löschung rückgängig = Alle wiederherstellen
      await Promise.all(
        action.allocations.map((a) => createAllocationDirect(a))
      );
      break;
  }
}

/**
 * Führt die Redo-Aktion aus (ursprüngliche Aktion erneut).
 */
async function executeRedoAction(action: UndoableAction): Promise<void> {
  switch (action.type) {
    case 'CREATE_ALLOCATION':
      await createAllocationDirect(action.allocation);
      break;

    case 'DELETE_ALLOCATION':
      await deleteAllocationDirect(action.allocation.id);
      break;

    case 'MOVE_ALLOCATION':
      await moveAllocationDirect(action.allocationId, action.to);
      break;

    case 'BATCH_CREATE':
      await Promise.all(
        action.allocations.map((a) => createAllocationDirect(a))
      );
      break;

    case 'BATCH_DELETE':
      await Promise.all(
        action.allocations.map((a) => deleteAllocationDirect(a.id))
      );
      break;
  }
}

/**
 * Generiert eine Beschreibung für eine Aktion.
 */
function getActionDescription(action: UndoableAction): string {
  switch (action.type) {
    case 'CREATE_ALLOCATION':
      return 'Allocation erstellt';
    case 'DELETE_ALLOCATION':
      return 'Allocation gelöscht';
    case 'MOVE_ALLOCATION':
      return 'Allocation verschoben';
    case 'BATCH_CREATE':
      return `${action.allocations.length} Allocations erstellt`;
    case 'BATCH_DELETE':
      return `${action.allocations.length} Allocations gelöscht`;
  }
}

/**
 * Generiert die Undo-Meldung.
 */
function getUndoMessage(action: UndoableAction): string {
  return `${getActionDescription(action)} rückgängig gemacht`;
}

/**
 * Generiert die Redo-Meldung.
 */
function getRedoMessage(action: UndoableAction): string {
  return `${getActionDescription(action)} wiederhergestellt`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Undo/Redo Funktionalität.
 *
 * @returns UndoContextValue mit allen Undo/Redo Funktionen
 */
export function useUndoRedo(): UndoContextValue {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const canUndo = undoStack.length > 0 && !isProcessing;
  const canRedo = redoStack.length > 0 && !isProcessing;

  const lastAction = useMemo(() => {
    if (undoStack.length === 0) return undefined;
    return getActionDescription(undoStack[undoStack.length - 1]);
  }, [undoStack]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fügt eine Aktion zum Undo-Stack hinzu.
   */
  const pushAction = useCallback((action: UndoableAction) => {
    setUndoStack((prev) => {
      const newStack = [...prev, action];
      // Stack-Limit einhalten
      if (newStack.length > MAX_UNDO_STACK) {
        return newStack.slice(-MAX_UNDO_STACK);
      }
      return newStack;
    });

    // Redo-Stack leeren bei neuer Aktion
    setRedoStack([]);
  }, []);

  /**
   * Macht die letzte Aktion rückgängig.
   */
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isProcessing) return;

    const action = undoStack[undoStack.length - 1];
    setIsProcessing(true);

    try {
      await executeUndoAction(action);

      // Action von Undo zu Redo verschieben
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, action]);

      toast.success(getUndoMessage(action));
    } catch (error) {
      toast.error('Rückgängig machen fehlgeschlagen', {
        description:
          error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
      console.error('Undo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [undoStack, isProcessing]);

  /**
   * Wiederholt die letzte rückgängig gemachte Aktion.
   */
  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isProcessing) return;

    const action = redoStack[redoStack.length - 1];
    setIsProcessing(true);

    try {
      await executeRedoAction(action);

      // Action von Redo zu Undo verschieben
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, action]);

      toast.success(getRedoMessage(action));
    } catch (error) {
      toast.error('Wiederholen fehlgeschlagen', {
        description:
          error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
      console.error('Redo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [redoStack, isProcessing]);

  /**
   * Leert beide Stacks.
   */
  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    canUndo,
    canRedo,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    lastAction,
    isProcessing,
    undo,
    redo,
    pushAction,
    clear,
  };
}
