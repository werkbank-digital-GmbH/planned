/**
 * Types für das Undo/Redo System.
 *
 * Definiert die Strukturen für rückgängig machbare Aktionen.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ALLOCATION SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Snapshot einer Allocation für Undo/Redo.
 *
 * Enthält alle Daten die benötigt werden um eine Allocation
 * vollständig wiederherzustellen.
 */
export interface AllocationSnapshot {
  id: string;
  tenantId: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: string; // ISO string
  plannedHours: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Snapshot für Verschiebung (Quelle oder Ziel).
 */
export interface MoveSnapshot {
  userId?: string;
  resourceId?: string;
  date: string;
  projectPhaseId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNDOABLE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Union Type für alle rückgängig machbaren Aktionen.
 */
export type UndoableAction =
  | { type: 'CREATE_ALLOCATION'; allocation: AllocationSnapshot }
  | { type: 'DELETE_ALLOCATION'; allocation: AllocationSnapshot }
  | {
      type: 'MOVE_ALLOCATION';
      allocationId: string;
      from: MoveSnapshot;
      to: MoveSnapshot;
    }
  | { type: 'BATCH_CREATE'; allocations: AllocationSnapshot[] }
  | { type: 'BATCH_DELETE'; allocations: AllocationSnapshot[] };

// ═══════════════════════════════════════════════════════════════════════════
// UNDO CONTEXT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface für den UndoContext.
 */
export interface UndoContextValue {
  /** Kann rückgängig gemacht werden? */
  canUndo: boolean;
  /** Kann wiederholt werden? */
  canRedo: boolean;
  /** Anzahl der Undo-Aktionen */
  undoCount: number;
  /** Anzahl der Redo-Aktionen */
  redoCount: number;
  /** Beschreibung der letzten Aktion */
  lastAction?: string;
  /** Wird gerade verarbeitet? */
  isProcessing: boolean;

  /** Rückgängig machen */
  undo: () => Promise<void>;
  /** Wiederholen */
  redo: () => Promise<void>;
  /** Aktion zum Stack hinzufügen */
  pushAction: (action: UndoableAction) => void;
  /** Stacks leeren */
  clear: () => void;
}
