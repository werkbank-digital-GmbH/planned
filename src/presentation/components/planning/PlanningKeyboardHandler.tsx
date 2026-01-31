'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import {
  createAllocationAction,
  deleteAllocationAction,
} from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useSelection } from '@/presentation/contexts/SelectionContext';
import { useUndo } from '@/presentation/contexts/UndoContext';
import { useAllocationClipboard } from '@/presentation/hooks/useAllocationClipboard';
import { useKeyboardShortcuts } from '@/presentation/hooks/useKeyboardShortcuts';

import { formatDateISO } from '@/lib/date-utils';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { QuickAddDialog } from './QuickAddDialog';
import { SelectionToolbar } from './SelectionToolbar';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Keyboard Handler für die Planungsansicht.
 *
 * Registriert globale Keyboard Shortcuts für:
 * - Copy/Paste (Cmd/Ctrl+C/V)
 * - Delete (Delete/Backspace)
 * - Navigation (Alt+Arrow)
 * - Quick-Add (N)
 * - Help (?)
 */
export function PlanningKeyboardHandler() {
  const { goToNextWeek, goToPreviousWeek, goToToday, refresh } = usePlanning();
  const { pushAction } = useUndo();

  const {
    selectedAllocation,
    hoveredCell,
    clearSelection,
    setShowHelp,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showQuickAdd,
    quickAddPrefill,
    openQuickAdd,
    closeQuickAdd,
    rangeSelection,
    endRangeSelect,
  } = useSelection();

  const { copy, paste, hasClipboard } = useAllocationClipboard();

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Kopiert die selektierte Allocation.
   */
  const handleCopy = useCallback(() => {
    if (selectedAllocation) {
      copy(selectedAllocation);
    }
  }, [selectedAllocation, copy]);

  /**
   * Fügt die kopierte Allocation an der Hover-Position ein.
   */
  const handlePaste = useCallback(async () => {
    if (!hasClipboard) {
      toast.error('Keine Allocation in der Zwischenablage');
      return;
    }

    if (!hoveredCell) {
      toast.error('Bewegen Sie den Mauszeiger über eine Zelle');
      return;
    }

    const result = await paste(
      hoveredCell.userId,
      hoveredCell.resourceId,
      formatDateISO(hoveredCell.date),
      async (data) => {
        const res = await createAllocationAction({
          projectPhaseId: data.projectPhaseId,
          userId: data.userId,
          resourceId: data.resourceId,
          date: data.date,
          notes: data.notes,
        });

        // Push Undo Action bei Erfolg
        if (res.success) {
          pushAction({
            type: 'CREATE_ALLOCATION',
            allocation: {
              id: res.data.allocation.id,
              tenantId: res.data.allocation.tenantId,
              userId: res.data.allocation.userId,
              resourceId: res.data.allocation.resourceId,
              projectPhaseId: res.data.allocation.projectPhaseId,
              date: res.data.allocation.date,
              plannedHours: res.data.allocation.plannedHours ?? 8,
              notes: res.data.allocation.notes,
            },
          });
        }

        return res;
      }
    );

    if (result) {
      await refresh();
    }
  }, [hasClipboard, hoveredCell, paste, refresh, pushAction]);

  /**
   * Zeigt Delete-Bestätigung oder löscht direkt.
   */
  const handleDelete = useCallback(() => {
    if (!selectedAllocation) return;

    // Bei Allocation mit Notizen: Bestätigung erforderlich
    if (selectedAllocation.notes) {
      setShowDeleteConfirm(true);
    } else {
      // Snapshot für Undo erstellen BEVOR gelöscht wird
      const snapshot = {
        id: selectedAllocation.id,
        tenantId: selectedAllocation.tenantId,
        userId: selectedAllocation.user?.id,
        resourceId: selectedAllocation.resource?.id,
        projectPhaseId: selectedAllocation.projectPhase.id,
        date: selectedAllocation.date.toISOString().split('T')[0],
        plannedHours: selectedAllocation.plannedHours ?? 8,
        notes: selectedAllocation.notes,
      };

      // Direkt löschen
      deleteAllocationAction({ allocationId: selectedAllocation.id })
        .then((result) => {
          if (result.success) {
            // Push Undo Action
            pushAction({
              type: 'DELETE_ALLOCATION',
              allocation: snapshot,
            });
            toast.success('Allocation gelöscht');
            clearSelection();
            refresh();
          } else {
            toast.error('Fehler beim Löschen', {
              description: result.error.message,
            });
          }
        })
        .catch((error) => {
          toast.error('Fehler beim Löschen', {
            description: error instanceof Error ? error.message : 'Unbekannter Fehler',
          });
        });
    }
  }, [selectedAllocation, setShowDeleteConfirm, clearSelection, refresh, pushAction]);

  /**
   * Bestätigt Löschung mit Notizen.
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedAllocation) return;

    // Snapshot für Undo erstellen BEVOR gelöscht wird
    const snapshot = {
      id: selectedAllocation.id,
      tenantId: selectedAllocation.tenantId,
      userId: selectedAllocation.user?.id,
      resourceId: selectedAllocation.resource?.id,
      projectPhaseId: selectedAllocation.projectPhase.id,
      date: selectedAllocation.date.toISOString().split('T')[0],
      plannedHours: selectedAllocation.plannedHours ?? 8,
      notes: selectedAllocation.notes,
    };

    try {
      const result = await deleteAllocationAction({
        allocationId: selectedAllocation.id,
        confirmed: true,
      });

      if (result.success) {
        // Push Undo Action
        pushAction({
          type: 'DELETE_ALLOCATION',
          allocation: snapshot,
        });
        toast.success('Allocation gelöscht');
        clearSelection();
        await refresh();
      } else {
        toast.error('Fehler beim Löschen', {
          description: result.error.message,
        });
      }
    } catch (error) {
      toast.error('Fehler beim Löschen', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }

    setShowDeleteConfirm(false);
  }, [selectedAllocation, clearSelection, refresh, setShowDeleteConfirm, pushAction]);

  /**
   * Dupliziert die selektierte Allocation am nächsten Tag.
   */
  const handleDuplicate = useCallback(() => {
    if (!selectedAllocation) return;

    // Nächsten Werktag finden
    const nextDay = new Date(selectedAllocation.date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Wochenende überspringen
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    // Quick-Add Dialog mit vorausgefüllten Daten öffnen
    openQuickAdd({
      projectPhaseId: selectedAllocation.projectPhase.id,
      userId: selectedAllocation.user?.id,
      resourceId: selectedAllocation.resource?.id,
      date: nextDay,
    });
  }, [selectedAllocation, openQuickAdd]);

  /**
   * Öffnet Quick-Add Dialog.
   */
  const handleQuickAdd = useCallback(() => {
    openQuickAdd();
  }, [openQuickAdd]);

  /**
   * Öffnet Hilfe-Dialog.
   */
  const handleHelp = useCallback(() => {
    setShowHelp(true);
  }, [setShowHelp]);

  // ─────────────────────────────────────────────────────────────────────────
  // SHORTCUTS REGISTRATION
  // ─────────────────────────────────────────────────────────────────────────

  useKeyboardShortcuts([
    // Allocation Actions
    {
      key: 'c',
      meta: true,
      handler: handleCopy,
      disabled: !selectedAllocation,
    },
    {
      key: 'v',
      meta: true,
      handler: handlePaste,
      disabled: !hasClipboard,
    },
    {
      key: ['Delete', 'Backspace'],
      handler: handleDelete,
      disabled: !selectedAllocation,
    },
    {
      key: 'd',
      meta: true,
      handler: handleDuplicate,
      disabled: !selectedAllocation,
    },

    // Navigation
    { key: 'ArrowRight', alt: true, handler: goToNextWeek },
    { key: 'ArrowLeft', alt: true, handler: goToPreviousWeek },
    { key: 't', alt: true, handler: goToToday },

    // Dialogs
    { key: 'n', handler: handleQuickAdd },
    { key: '?', handler: handleHelp },

    // Selection
    { key: 'Escape', handler: clearSelection },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // GLOBAL MOUSE UP HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Beendet Range Selection wenn Maus irgendwo losgelassen wird.
   */
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (rangeSelection.isDragging) {
        endRangeSelect();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [rangeSelection.isDragging, endRangeSelect]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        allocation={selectedAllocation}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ShortcutHelpDialog />

      <QuickAddDialog
        isOpen={showQuickAdd}
        onClose={closeQuickAdd}
        defaultValues={quickAddPrefill ?? undefined}
      />

      <SelectionToolbar />
    </>
  );
}
