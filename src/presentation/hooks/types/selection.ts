/**
 * Types für Range Selection.
 *
 * Definiert die Strukturen für Mehrfach-Zellen-Auswahl.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SELECTED CELL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Eine ausgewählte Zelle im Grid.
 */
export interface SelectedCell {
  userId?: string;
  resourceId?: string;
  date: Date;
  hasAbsence?: boolean;
  absenceType?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RANGE SELECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * State für Range Selection.
 */
export interface RangeSelection {
  /** Alle ausgewählten Zellen */
  cells: SelectedCell[];

  /** Aktueller Drag-Zustand */
  isDragging: boolean;
  startCell?: SelectedCell;
  endCell?: SelectedCell;

  /** Vorschau während des Ziehens */
  previewCells: SelectedCell[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USER SUMMARY (für Index-Berechnung)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User-Summary für Range-Berechnung.
 */
export interface UserForSelection {
  id: string;
  fullName: string;
}
