'use client';

import { X } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';
import { useSelection } from '@/presentation/contexts/SelectionContext';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Toolbar für aktive Range-Selection.
 *
 * Zeigt:
 * - Anzahl ausgewählter Zellen
 * - Button zum Öffnen des Quick-Add Dialogs
 * - Button zum Abbrechen der Auswahl
 */
export function SelectionToolbar() {
  const {
    hasRangeSelection,
    validRangeSelectionCount,
    rangeSelection,
    clearRangeSelection,
    openQuickAdd,
  } = useSelection();

  // Nicht rendern wenn keine Auswahl
  if (!hasRangeSelection) {
    return null;
  }

  const totalCount = rangeSelection.cells.length;
  const skippedCount = totalCount - validRangeSelectionCount;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
      {/* Selection Info */}
      <div className="text-sm">
        <span className="font-medium">{validRangeSelectionCount}</span>
        <span className="text-muted-foreground">
          {validRangeSelectionCount === 1 ? ' Zelle' : ' Zellen'} ausgewählt
        </span>
        {skippedCount > 0 && (
          <span className="ml-1 text-orange-600">
            ({skippedCount} mit Abwesenheit)
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => openQuickAdd()}
          disabled={validRangeSelectionCount === 0}
        >
          Zuweisungen erstellen
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={clearRangeSelection}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Auswahl aufheben</span>
        </Button>
      </div>
    </div>
  );
}
