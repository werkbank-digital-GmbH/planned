'use client';

import { useCallback, useMemo, type MouseEvent, type ReactNode } from 'react';

import { useSelection } from '@/presentation/contexts/SelectionContext';
import type { SelectedCell } from '@/presentation/hooks/types/selection';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SelectableCellProps {
  /** User-ID (für User-Zeilen) */
  userId?: string;
  /** Resource-ID (für Resource-Zeilen) */
  resourceId?: string;
  /** Datum der Zelle */
  date: Date;
  /** Ob an diesem Tag eine Abwesenheit vorliegt */
  hasAbsence?: boolean;
  /** Art der Abwesenheit */
  absenceType?: string;
  /** Kind-Elemente */
  children: ReactNode;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Selektierbare Zelle im Planning Grid.
 *
 * Unterstützt:
 * - Klick: Einzelne Zelle auswählen
 * - Shift+Klick: Bereich bis zur Zelle auswählen
 * - Cmd/Ctrl+Klick: Zelle zur Auswahl hinzufügen/entfernen
 * - Drag: Bereich auswählen
 *
 * Zeigt visuelles Feedback für ausgewählte und Preview-Zellen.
 */
export function SelectableCell({
  userId,
  resourceId,
  date,
  hasAbsence,
  absenceType,
  children,
  className,
}: SelectableCellProps) {
  const {
    rangeSelection,
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
  } = useSelection();

  // Zelle für Selection erstellen (memoized)
  const cell: SelectedCell = useMemo(
    () => ({
      userId,
      resourceId,
      date,
      hasAbsence,
      absenceType,
    }),
    [userId, resourceId, date, hasAbsence, absenceType]
  );

  // Prüfen ob diese Zelle ausgewählt ist
  const isSelected = rangeSelection.cells.some(
    (c) =>
      c.date.getTime() === date.getTime() &&
      c.userId === userId &&
      c.resourceId === resourceId
  );

  // Prüfen ob diese Zelle in der Preview ist
  const isPreview = rangeSelection.previewCells.some(
    (c) =>
      c.date.getTime() === date.getTime() &&
      c.userId === userId &&
      c.resourceId === resourceId
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Ignoriere wenn kein User/Resource
      if (!userId && !resourceId) return;

      // Ignoriere wenn auf interaktives Element geklickt
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      ) {
        return;
      }

      // Shift+Click: Bereich erweitern
      if (e.shiftKey) {
        e.preventDefault();
        extendToCell(cell);
        return;
      }

      // Cmd/Ctrl+Click: Toggle
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        toggleCellSelection(cell, true);
        return;
      }

      // Normaler Klick: Start Range Selection
      e.preventDefault();
      startRangeSelect(cell);
    },
    [userId, resourceId, cell, extendToCell, toggleCellSelection, startRangeSelect]
  );

  const handleMouseEnter = useCallback(
    (e: MouseEvent) => {
      // Nur während Drag
      if (!rangeSelection.isDragging) return;
      if (!userId && !resourceId) return;

      // Mit Maustasten gedrückt?
      if (e.buttons !== 1) return;

      updateRangeSelect(cell);
    },
    [rangeSelection.isDragging, userId, resourceId, cell, updateRangeSelect]
  );

  const handleMouseUp = useCallback(() => {
    if (rangeSelection.isDragging) {
      endRangeSelect();
    }
  }, [rangeSelection.isDragging, endRangeSelect]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'relative cursor-pointer select-none',
        className,
        // Selected State
        isSelected && !hasAbsence && 'ring-2 ring-primary ring-inset bg-primary/10',
        isSelected && hasAbsence && 'ring-2 ring-orange-400 ring-inset bg-orange-50',
        // Preview State (während Drag)
        isPreview && !isSelected && !hasAbsence && 'bg-primary/5',
        isPreview && !isSelected && hasAbsence && 'bg-orange-50/50'
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      data-selected={isSelected}
      data-preview={isPreview}
    >
      {children}

      {/* Selection Count Badge (nur bei Mehrfachauswahl auf erster Zelle) */}
      {isSelected && rangeSelection.cells.length > 1 && rangeSelection.cells[0] === cell && (
        <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
          {rangeSelection.cells.filter((c) => !c.hasAbsence).length}
        </div>
      )}
    </div>
  );
}
