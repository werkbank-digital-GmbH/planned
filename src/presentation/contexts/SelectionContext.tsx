'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import type { AllocationWithDetails } from '@/application/queries';

import { createAllocationAction } from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useUndo } from '@/presentation/contexts/UndoContext';
import type {
  RangeSelection,
  SelectedCell,
  UserForSelection,
} from '@/presentation/hooks/types/selection';
import { useRangeSelection } from '@/presentation/hooks/useRangeSelection';

import { formatDateISO } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HoveredCell {
  userId?: string;
  resourceId?: string;
  date: Date;
}

export interface QuickAddPrefill {
  projectPhaseId?: string;
  userId?: string;
  resourceId?: string;
  date?: Date;
  /** Mehrere Daten für Batch-Create */
  dates?: Date[];
}

interface SelectionContextValue {
  // Single Allocation Selection
  selectedAllocationId: string | null;
  selectedAllocation: AllocationWithDetails | null;
  hoveredCell: HoveredCell | null;

  // Range Selection
  rangeSelection: RangeSelection;

  // Dialog State
  showHelp: boolean;
  showDeleteConfirm: boolean;
  showQuickAdd: boolean;
  quickAddPrefill: QuickAddPrefill | null;

  // Single Allocation Actions
  selectAllocation: (allocation: AllocationWithDetails | null) => void;
  setHoveredCell: (cell: HoveredCell | null) => void;
  clearSelection: () => void;

  // Range Selection Actions
  startRangeSelect: (cell: SelectedCell) => void;
  updateRangeSelect: (cell: SelectedCell) => void;
  endRangeSelect: () => void;
  toggleCellSelection: (cell: SelectedCell, addToSelection: boolean) => void;
  extendToCell: (cell: SelectedCell) => void;
  clearRangeSelection: () => void;

  // Batch Create
  createAllocationsForSelection: (projectPhaseId: string) => Promise<void>;
  hasRangeSelection: boolean;
  validRangeSelectionCount: number;

  // Dialog Actions
  setShowHelp: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  openQuickAdd: (prefill?: QuickAddPrefill) => void;
  closeQuickAdd: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const SelectionContext = createContext<SelectionContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface SelectionProviderProps {
  children: ReactNode;
}

/**
 * Provider für Selection-State in der Planungsansicht.
 *
 * Verwaltet:
 * - Aktuell selektierte Allocation
 * - Range Selection (Mehrfachauswahl)
 * - Aktuell gehovertes Zelle (für Paste-Ziel)
 * - Dialog-States (Help, Delete, QuickAdd)
 */
export function SelectionProvider({ children }: SelectionProviderProps) {
  const { weekStart, userRows, refresh } = usePlanning();
  const { pushAction } = useUndo();

  // Single Selection State
  const [selectedAllocation, setSelectedAllocation] =
    useState<AllocationWithDetails | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  // Dialog State
  const [showHelp, setShowHelp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState<QuickAddPrefill | null>(
    null
  );

  // Users für Range Selection aus userRows berechnen
  const users: UserForSelection[] = userRows.map((u) => ({
    id: u.id,
    fullName: u.fullName,
  }));

  // Range Selection Hook
  const {
    rangeSelection,
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
    clearSelection: clearRangeSelection,
  } = useRangeSelection(users, weekStart);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const hasRangeSelection = rangeSelection.cells.length > 0;
  const validRangeSelectionCount = rangeSelection.cells.filter(
    (c) => !c.hasAbsence
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE SELECTION ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const selectAllocation = useCallback(
    (allocation: AllocationWithDetails | null) => {
      setSelectedAllocation(allocation);
      // Bei Allocation-Auswahl Range Selection leeren
      if (allocation) {
        clearRangeSelection();
      }
    },
    [clearRangeSelection]
  );

  const clearSelection = useCallback(() => {
    setSelectedAllocation(null);
    setShowDeleteConfirm(false);
    clearRangeSelection();
  }, [clearRangeSelection]);

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH CREATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Erstellt Allocations für alle ausgewählten Zellen.
   */
  const createAllocationsForSelection = useCallback(
    async (projectPhaseId: string) => {
      const { cells } = rangeSelection;

      if (cells.length === 0) return;

      // Abwesenheiten herausfiltern
      const validCells = cells.filter((c) => !c.hasAbsence);
      const skippedCount = cells.length - validCells.length;

      if (validCells.length === 0) {
        toast.error('Alle ausgewählten Tage haben Abwesenheiten');
        return;
      }

      try {
        // Batch erstellen
        const results = await Promise.all(
          validCells.map((cell) =>
            createAllocationAction({
              projectPhaseId,
              userId: cell.userId,
              resourceId: cell.resourceId,
              date: formatDateISO(cell.date),
            })
          )
        );

        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        // Undo-Stack: Als Batch
        if (successful.length > 0) {
          const snapshots = successful
            .filter((r) => r.success)
            .map((r) => ({
              id: r.data.allocation.id,
              tenantId: r.data.allocation.tenantId,
              userId: r.data.allocation.userId,
              resourceId: r.data.allocation.resourceId,
              projectPhaseId: r.data.allocation.projectPhaseId,
              date: r.data.allocation.date,
              plannedHours: r.data.allocation.plannedHours ?? 8,
              notes: r.data.allocation.notes,
            }));

          if (snapshots.length === 1) {
            pushAction({
              type: 'CREATE_ALLOCATION',
              allocation: snapshots[0],
            });
          } else {
            pushAction({
              type: 'BATCH_CREATE',
              allocations: snapshots,
            });
          }
        }

        // Feedback
        let message = `${successful.length} Allocation${successful.length !== 1 ? 's' : ''} erstellt`;
        if (skippedCount > 0) {
          message += ` (${skippedCount} übersprungen wegen Abwesenheit)`;
        }
        if (failed.length > 0) {
          message += ` (${failed.length} fehlgeschlagen)`;
        }

        if (failed.length > 0) {
          toast.warning(message);
        } else {
          toast.success(message);
        }

        clearRangeSelection();
        await refresh();
      } catch (error) {
        toast.error('Fehler beim Erstellen der Allocations', {
          description:
            error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    },
    [rangeSelection, pushAction, clearRangeSelection, refresh]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DIALOG ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const openQuickAdd = useCallback(
    (prefill?: QuickAddPrefill) => {
      // Wenn Range-Selection aktiv, Daten als Prefill übergeben
      if (hasRangeSelection && !prefill) {
        const validCells = rangeSelection.cells.filter((c) => !c.hasAbsence);
        if (validCells.length > 0) {
          const firstCell = validCells[0];
          setQuickAddPrefill({
            userId: firstCell.userId,
            resourceId: firstCell.resourceId,
            dates: validCells.map((c) => c.date),
          });
          setShowQuickAdd(true);
          return;
        }
      }

      setQuickAddPrefill(prefill ?? null);
      setShowQuickAdd(true);
    },
    [hasRangeSelection, rangeSelection.cells]
  );

  const closeQuickAdd = useCallback(() => {
    setShowQuickAdd(false);
    setQuickAddPrefill(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────

  const value: SelectionContextValue = {
    // Single Selection
    selectedAllocationId: selectedAllocation?.id ?? null,
    selectedAllocation,
    hoveredCell,

    // Range Selection
    rangeSelection,
    hasRangeSelection,
    validRangeSelectionCount,

    // Dialog State
    showHelp,
    showDeleteConfirm,
    showQuickAdd,
    quickAddPrefill,

    // Single Selection Actions
    selectAllocation,
    setHoveredCell,
    clearSelection,

    // Range Selection Actions
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
    clearRangeSelection,

    // Batch Create
    createAllocationsForSelection,

    // Dialog Actions
    setShowHelp,
    setShowDeleteConfirm,
    openQuickAdd,
    closeQuickAdd,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook um auf den Selection-Context zuzugreifen.
 *
 * @throws Error wenn außerhalb von SelectionProvider verwendet
 */
export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);

  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }

  return context;
}

// Re-export types
export type { SelectedCell, RangeSelection } from '@/presentation/hooks/types/selection';
