'use client';

/**
 * useRangeSelection Hook
 *
 * Ermöglicht das Auswählen mehrerer Zellen im Grid durch:
 * - Click & Drag für Rechteck-Auswahl
 * - Shift+Click zum Erweitern
 * - Cmd/Ctrl+Click für nicht-zusammenhängende Auswahl
 */

import { useCallback, useMemo, useState } from 'react';

import { isSameDay } from '@/lib/date-utils';

import type {
  RangeSelection,
  SelectedCell,
  UserForSelection,
} from './types/selection';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet alle Zellen im Rechteck zwischen Start und End.
 */
function calculateRectangle(
  start: SelectedCell,
  end: SelectedCell,
  users: UserForSelection[]
): SelectedCell[] {
  const cells: SelectedCell[] = [];

  // Datum-Range berechnen
  const startDate = start.date < end.date ? start.date : end.date;
  const endDate = start.date > end.date ? start.date : end.date;

  // Tage zwischen Start und End
  const dayCount = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // User-Range (Index-basiert)
  const startUserIndex = users.findIndex((u) => u.id === start.userId);
  const endUserIndex = users.findIndex((u) => u.id === end.userId);

  // Wenn User nicht gefunden, nur Datum-Range verwenden
  if (startUserIndex === -1 || endUserIndex === -1) {
    // Nur für den angegebenen User
    for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);

      // Nur Werktage (Mo-Fr)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      cells.push({
        userId: start.userId,
        resourceId: start.resourceId,
        date: new Date(date),
      });
    }
    return cells;
  }

  const minUserIndex = Math.min(startUserIndex, endUserIndex);
  const maxUserIndex = Math.max(startUserIndex, endUserIndex);

  // Alle Zellen im Rechteck
  for (let userIdx = minUserIndex; userIdx <= maxUserIndex; userIdx++) {
    const user = users[userIdx];
    if (!user) continue;

    for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);

      // Nur Werktage (Mo-Fr)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      cells.push({
        userId: user.id,
        date: new Date(date),
      });
    }
  }

  return cells;
}

/**
 * Entfernt Duplikate aus Zellen-Array.
 */
function uniqueCells(cells: SelectedCell[]): SelectedCell[] {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.userId ?? ''}-${cell.resourceId ?? ''}-${cell.date.toISOString().split('T')[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Prüft ob zwei Zellen die gleiche Position haben.
 */
function isSameCellPosition(a: SelectedCell, b: SelectedCell): boolean {
  return (
    a.userId === b.userId &&
    a.resourceId === b.resourceId &&
    isSameDay(a.date, b.date)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Range Selection im Planungsgrid.
 *
 * @param users - Liste der User für Index-Berechnung
 * @param _weekStart - Start der aktuellen Woche
 * @returns Range Selection State und Actions
 */
export function useRangeSelection(
  users: UserForSelection[],
  _weekStart: Date
) {
  const [cells, setCells] = useState<SelectedCell[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState<SelectedCell | undefined>();
  const [endCell, setEndCell] = useState<SelectedCell | undefined>();

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Berechnet Vorschau-Zellen während des Ziehens.
   */
  const previewCells = useMemo(() => {
    if (!isDragging || !startCell || !endCell) return [];
    return calculateRectangle(startCell, endCell, users);
  }, [isDragging, startCell, endCell, users]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Startet Drag-Selection.
   */
  const startRangeSelect = useCallback((cell: SelectedCell) => {
    setStartCell(cell);
    setEndCell(cell);
    setIsDragging(true);
  }, []);

  /**
   * Aktualisiert End-Position während des Ziehens.
   */
  const updateRangeSelect = useCallback(
    (cell: SelectedCell) => {
      if (!isDragging) return;
      setEndCell(cell);
    },
    [isDragging]
  );

  /**
   * Beendet Drag-Selection und finalisiert Auswahl.
   */
  const endRangeSelect = useCallback(() => {
    if (!isDragging) {
      return;
    }

    // Preview wird zur tatsächlichen Auswahl
    if (previewCells.length > 0) {
      setCells((prev) => uniqueCells([...prev, ...previewCells]));
    }

    setIsDragging(false);
    setStartCell(undefined);
    setEndCell(undefined);
  }, [isDragging, previewCells]);

  /**
   * Toggle Einzelzelle (mit/ohne Modifier).
   */
  const toggleCellSelection = useCallback(
    (cell: SelectedCell, addToSelection: boolean) => {
      setCells((prev) => {
        const exists = prev.some((c) => isSameCellPosition(c, cell));

        if (addToSelection) {
          // Toggle bei Cmd/Ctrl
          if (exists) {
            return prev.filter((c) => !isSameCellPosition(c, cell));
          }
          return [...prev, cell];
        }

        // Ohne Modifier: Nur diese Zelle auswählen
        return [cell];
      });
    },
    []
  );

  /**
   * Erweitert Auswahl von letzter Zelle (Shift+Click).
   */
  const extendToCell = useCallback(
    (cell: SelectedCell) => {
      if (cells.length === 0) {
        setCells([cell]);
        return;
      }

      const lastCell = cells[cells.length - 1];
      const rectangle = calculateRectangle(lastCell, cell, users);
      setCells((prev) => uniqueCells([...prev, ...rectangle]));
    },
    [cells, users]
  );

  /**
   * Leert die komplette Auswahl.
   */
  const clearSelection = useCallback(() => {
    setCells([]);
    setIsDragging(false);
    setStartCell(undefined);
    setEndCell(undefined);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  const rangeSelection: RangeSelection = {
    cells,
    isDragging,
    startCell,
    endCell,
    previewCells,
  };

  return {
    rangeSelection,
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
    clearSelection,
  };
}
