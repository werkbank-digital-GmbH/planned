# Prompt 19a: Range-Select Multi-Allocation

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Undo/Redo ist implementiert. Jetzt implementieren wir Range-Select für das schnelle Erstellen mehrerer Allocations.

**KRITISCH:** Dieses Feature wurde im ursprünglichen Review als fehlend identifiziert. Es ist in `FEATURES.md` unter F3.2 dokumentiert und essentiell für effiziente Planung.

**Bereits vorhanden:**
- Planungsgrid mit Drag & Drop
- Quick-Add Dialog
- Batch-Create Support in Undo-System
- Selection Context

---

## Ziel

Implementiere Range-Select für das Auswählen mehrerer Zellen und gleichzeitiges Erstellen von Allocations.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.2 (Mehrfachzuweisung)
- `Rules.md` – Drag-Select Verhalten

---

## Akzeptanzkriterien

```gherkin
Feature: F3.2 - Range-Select Multi-Allocation

Scenario: Mehrere Zellen durch Ziehen auswählen
  Given ich bin in der Planungsansicht
  When ich bei Max auf Montag klicke und halte
  And zu Mittwoch ziehe
  Then sind Montag, Dienstag und Mittwoch bei Max markiert
  And die Auswahl ist blau umrandet

Scenario: Mehrere Zellen über mehrere User
  Given ich bin in der Planungsansicht
  When ich bei Max Montag klicke und halte
  And diagonal zu Anna Mittwoch ziehe
  Then sind alle Zellen im Rechteck markiert:
    | User | Mo | Di | Mi |
    | Max  | ✓  | ✓  | ✓  |
    | Anna | ✓  | ✓  | ✓  |

Scenario: Allocations für Auswahl erstellen
  Given ich habe ein Rechteck von Zellen ausgewählt
  When ich eine Phase aus der Sidebar auf die Auswahl ziehe
  Then werden Allocations für ALLE markierten Zellen erstellt
  And die Allocations sind als Batch im Undo-Stack

Scenario: Quick-Add für Range öffnen
  Given ich habe mehrere Zellen ausgewählt
  When ich "N" drücke oder Rechtsklick > "Allocation erstellen"
  Then öffnet sich der Quick-Add Dialog
  And alle ausgewählten Zellen sind vorausgewählt

Scenario: Auswahl mit Shift erweitern
  Given ich habe eine Zelle ausgewählt
  When ich Shift gedrückt halte und eine andere Zelle klicke
  Then wird die Auswahl auf das Rechteck zwischen beiden erweitert

Scenario: Auswahl mit Cmd/Ctrl erweitern
  Given ich habe Zellen ausgewählt
  When ich Cmd/Ctrl gedrückt halte und weitere Zellen klicke
  Then werden diese zur bestehenden Auswahl hinzugefügt
  And ich kann nicht-zusammenhängende Bereiche auswählen

Scenario: Auswahl aufheben
  Given ich habe Zellen ausgewählt
  When ich in einen leeren Bereich klicke
  Or Escape drücke
  Then wird die Auswahl aufgehoben

Scenario: Abwesenheiten in Auswahl
  Given Max hat Urlaub am Mittwoch
  When ich Mo-Fr bei Max auswähle
  Then ist Mi ausgegraut (Abwesenheit)
  And wird bei "Alle erstellen" übersprungen
  And ich sehe eine Warnung "1 Tag übersprungen (Abwesenheit)"

Scenario: Visuelle Unterscheidung
  Given ich ziehe über Zellen
  Then sehe ich:
    | Element              | Darstellung                |
    | Potenzielle Auswahl  | Hellblau mit Rahmen        |
    | Bestätigte Auswahl   | Kräftiges Blau mit Rahmen  |
    | Abwesenheits-Zelle   | Ausgegraut, durchgestrichen|
```

---

## Technische Anforderungen

### Selection State

```typescript
interface RangeSelection {
  // Alle ausgewählten Zellen
  cells: SelectedCell[];

  // Aktueller Drag-Zustand
  isDragging: boolean;
  startCell?: SelectedCell;
  endCell?: SelectedCell;

  // Vorschau während des Ziehens
  previewCells: SelectedCell[];
}

interface SelectedCell {
  userId?: string;
  resourceId?: string;
  date: Date;
  hasAbsence?: boolean;
  absenceType?: string;
}
```

### Selection Context Extended

```typescript
interface SelectionContext {
  // Einzelne Allocation Auswahl
  selectedAllocation: AllocationWithDetails | null;
  selectAllocation: (alloc: AllocationWithDetails) => void;

  // Range Selection
  rangeSelection: RangeSelection;
  startRangeSelect: (cell: SelectedCell) => void;
  updateRangeSelect: (cell: SelectedCell) => void;
  endRangeSelect: () => void;
  toggleCellSelection: (cell: SelectedCell, addToSelection: boolean) => void;
  extendToCell: (cell: SelectedCell) => void;

  // Actions
  clearSelection: () => void;
  createAllocationsForSelection: (projectPhaseId: string) => Promise<void>;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Range-Selection

```typescript
// src/presentation/hooks/__tests__/useRangeSelection.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRangeSelection } from '../useRangeSelection';

describe('useRangeSelection', () => {
  it('should start range selection on mousedown', () => {
    const { result } = renderHook(() => useRangeSelection());

    act(() => {
      result.current.startRangeSelect({
        userId: 'user-1',
        date: new Date('2026-02-02'),
      });
    });

    expect(result.current.rangeSelection.isDragging).toBe(true);
    expect(result.current.rangeSelection.startCell).toBeDefined();
  });

  it('should calculate rectangular selection', () => {
    const { result } = renderHook(() => useRangeSelection());

    act(() => {
      result.current.startRangeSelect({
        userId: 'user-1',
        date: new Date('2026-02-02'), // Montag
      });
    });

    act(() => {
      result.current.updateRangeSelect({
        userId: 'user-2',
        date: new Date('2026-02-04'), // Mittwoch
      });
    });

    // Sollte 6 Zellen sein: 2 User × 3 Tage
    expect(result.current.rangeSelection.previewCells).toHaveLength(6);
  });

  it('should add cells with Cmd/Ctrl', () => {
    const { result } = renderHook(() => useRangeSelection());

    // Erste Auswahl
    act(() => {
      result.current.toggleCellSelection(
        { userId: 'user-1', date: new Date('2026-02-02') },
        false
      );
    });

    // Zusätzliche Auswahl mit addToSelection=true
    act(() => {
      result.current.toggleCellSelection(
        { userId: 'user-1', date: new Date('2026-02-05') },
        true
      );
    });

    expect(result.current.rangeSelection.cells).toHaveLength(2);
  });
});
```

### 🟢 GREEN: useRangeSelection Hook

```typescript
// src/presentation/hooks/useRangeSelection.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import { addDays, differenceInDays, min, max, isSameDay } from 'date-fns';

export function useRangeSelection(users: UserSummary[], weekStart: Date) {
  const [cells, setCells] = useState<SelectedCell[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState<SelectedCell | undefined>();
  const [endCell, setEndCell] = useState<SelectedCell | undefined>();

  // Berechne Vorschau-Zellen während des Ziehens
  const previewCells = useMemo(() => {
    if (!isDragging || !startCell || !endCell) return [];

    return calculateRectangle(startCell, endCell, users, weekStart);
  }, [isDragging, startCell, endCell, users, weekStart]);

  const startRangeSelect = useCallback((cell: SelectedCell) => {
    setStartCell(cell);
    setEndCell(cell);
    setIsDragging(true);
    // Bestehende Auswahl nicht löschen wenn Shift/Cmd gedrückt
  }, []);

  const updateRangeSelect = useCallback((cell: SelectedCell) => {
    if (!isDragging) return;
    setEndCell(cell);
  }, [isDragging]);

  const endRangeSelect = useCallback(() => {
    if (!isDragging || previewCells.length === 0) {
      setIsDragging(false);
      return;
    }

    // Preview wird zur tatsächlichen Auswahl
    setCells((prev) => {
      // Duplikate entfernen
      const combined = [...prev, ...previewCells];
      return uniqueCells(combined);
    });

    setIsDragging(false);
    setStartCell(undefined);
    setEndCell(undefined);
  }, [isDragging, previewCells]);

  const toggleCellSelection = useCallback(
    (cell: SelectedCell, addToSelection: boolean) => {
      setCells((prev) => {
        const exists = prev.some((c) =>
          isSameCellPosition(c, cell)
        );

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

  const extendToCell = useCallback(
    (cell: SelectedCell) => {
      // Shift+Click: Erweitere von letzter Auswahl zu dieser Zelle
      if (cells.length === 0) {
        setCells([cell]);
        return;
      }

      const lastCell = cells[cells.length - 1];
      const rectangle = calculateRectangle(lastCell, cell, users, weekStart);
      setCells((prev) => uniqueCells([...prev, ...rectangle]));
    },
    [cells, users, weekStart]
  );

  const clearSelection = useCallback(() => {
    setCells([]);
    setIsDragging(false);
    setStartCell(undefined);
    setEndCell(undefined);
  }, []);

  return {
    rangeSelection: {
      cells,
      isDragging,
      startCell,
      endCell,
      previewCells,
    },
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
    clearSelection,
  };
}

// Helper: Berechne alle Zellen im Rechteck
function calculateRectangle(
  start: SelectedCell,
  end: SelectedCell,
  users: UserSummary[],
  weekStart: Date
): SelectedCell[] {
  const cells: SelectedCell[] = [];

  // Datum-Range
  const startDate = min([start.date, end.date]);
  const endDate = max([start.date, end.date]);
  const dayCount = differenceInDays(endDate, startDate) + 1;

  // User-Range (Index-basiert)
  const startUserIndex = users.findIndex((u) => u.id === start.userId);
  const endUserIndex = users.findIndex((u) => u.id === end.userId);
  const minUserIndex = Math.min(startUserIndex, endUserIndex);
  const maxUserIndex = Math.max(startUserIndex, endUserIndex);

  // Alle Zellen im Rechteck
  for (let userIdx = minUserIndex; userIdx <= maxUserIndex; userIdx++) {
    const user = users[userIdx];
    if (!user) continue;

    for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
      const date = addDays(startDate, dayOffset);

      // Nur Werktage (Mo-Fr)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      cells.push({
        userId: user.id,
        date,
      });
    }
  }

  return cells;
}

// Helper: Duplikate entfernen
function uniqueCells(cells: SelectedCell[]): SelectedCell[] {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.userId || cell.resourceId}-${cell.date.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper: Gleiche Position prüfen
function isSameCellPosition(a: SelectedCell, b: SelectedCell): boolean {
  return (
    a.userId === b.userId &&
    a.resourceId === b.resourceId &&
    isSameDay(a.date, b.date)
  );
}
```

### 🟢 GREEN: SelectableCell Component

```typescript
// src/presentation/components/planning/SelectableCell.tsx
'use client';

import { useRef, useCallback } from 'react';
import { useSelection } from '@/presentation/contexts/SelectionContext';
import { cn } from '@/lib/utils';

interface SelectableCellProps {
  userId?: string;
  resourceId?: string;
  date: Date;
  hasAbsence?: boolean;
  absenceType?: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectableCell({
  userId,
  resourceId,
  date,
  hasAbsence,
  absenceType,
  children,
  className,
}: SelectableCellProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const {
    rangeSelection,
    startRangeSelect,
    updateRangeSelect,
    endRangeSelect,
    toggleCellSelection,
    extendToCell,
  } = useSelection();

  const cell: SelectedCell = { userId, resourceId, date, hasAbsence, absenceType };

  // Prüfen ob diese Zelle ausgewählt ist
  const isSelected = rangeSelection.cells.some(
    (c) => c.userId === userId && c.resourceId === resourceId &&
      c.date.toDateString() === date.toDateString()
  );

  const isInPreview = rangeSelection.previewCells.some(
    (c) => c.userId === userId && c.resourceId === resourceId &&
      c.date.toDateString() === date.toDateString()
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Nur linke Maustaste
      if (e.button !== 0) return;

      // Verhindere Auswahl wenn auf einer Allocation
      if ((e.target as HTMLElement).closest('[data-allocation-id]')) return;

      if (e.shiftKey) {
        // Shift: Erweitere Auswahl
        extendToCell(cell);
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl: Toggle Zelle
        toggleCellSelection(cell, true);
      } else {
        // Normal: Start Drag-Selection
        startRangeSelect(cell);
      }
    },
    [cell, extendToCell, toggleCellSelection, startRangeSelect]
  );

  const handleMouseEnter = useCallback(() => {
    if (rangeSelection.isDragging) {
      updateRangeSelect(cell);
    }
  }, [rangeSelection.isDragging, cell, updateRangeSelect]);

  const handleMouseUp = useCallback(() => {
    if (rangeSelection.isDragging) {
      endRangeSelect();
    }
  }, [rangeSelection.isDragging, endRangeSelect]);

  return (
    <div
      ref={cellRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      className={cn(
        'relative transition-colors select-none',
        className,
        isSelected && 'bg-blue-100 ring-2 ring-blue-500 ring-inset',
        isInPreview && !isSelected && 'bg-blue-50 ring-1 ring-blue-300 ring-inset',
        hasAbsence && isSelected && 'bg-gray-200 ring-gray-400 opacity-60'
      )}
      data-selected={isSelected}
      data-cell-user={userId}
      data-cell-resource={resourceId}
      data-cell-date={date.toISOString()}
    >
      {children}

      {/* Abwesenheits-Markierung in Auswahl */}
      {hasAbsence && (isSelected || isInPreview) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300/50">
          <span className="text-xs text-gray-600 line-through">
            {absenceType}
          </span>
        </div>
      )}
    </div>
  );
}
```

### 🟢 GREEN: Batch-Create für Selection

```typescript
// src/presentation/contexts/SelectionContext.tsx (erweitert)

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
          createAllocation({
            projectPhaseId,
            userId: cell.userId,
            resourceId: cell.resourceId,
            date: cell.date,
          })
        )
      );

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      // Undo-Stack: Als Batch
      if (successful.length > 0) {
        pushUndo({
          type: 'BATCH_CREATE',
          allocations: successful.map((r) => ({
            id: r.data!.id,
            userId: r.data!.user?.id,
            resourceId: r.data!.resource?.id,
            projectPhaseId: r.data!.projectPhase.id,
            date: r.data!.date.toISOString(),
            plannedHours: r.data!.plannedHours,
          })),
        });
      }

      // Feedback
      let message = `${successful.length} Allocations erstellt`;
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

      clearSelection();
      await refreshWeekData();
    } catch (error) {
      toast.error('Fehler beim Erstellen der Allocations');
    }
  },
  [rangeSelection, pushUndo, clearSelection, refreshWeekData]
);
```

### 🟢 GREEN: Context Menu für Selection

```typescript
// src/presentation/components/planning/SelectionContextMenu.tsx
'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/presentation/components/ui/context-menu';
import { useSelection } from '@/presentation/contexts/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/presentation/actions/projects';
import { Plus, Trash2 } from 'lucide-react';

interface SelectionContextMenuProps {
  children: React.ReactNode;
}

export function SelectionContextMenu({ children }: SelectionContextMenuProps) {
  const {
    rangeSelection,
    createAllocationsForSelection,
    clearSelection,
    setShowQuickAdd,
  } = useSelection();

  const hasSelection = rangeSelection.cells.length > 0;
  const validCellCount = rangeSelection.cells.filter((c) => !c.hasAbsence).length;

  const { data: projects } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => getProjects({ status: 'active' }),
  });

  if (!hasSelection) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => setShowQuickAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Allocation erstellen ({validCellCount} Zellen)
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="h-4 w-4 mr-2" />
            Schnell zuweisen...
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-60 overflow-auto">
            {projects?.data?.map((project) => (
              <ContextMenuSub key={project.id}>
                <ContextMenuSubTrigger className="text-xs">
                  {project.name}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {project.phases?.map((phase) => (
                    <ContextMenuItem
                      key={phase.id}
                      onClick={() => createAllocationsForSelection(phase.id)}
                      className="text-xs"
                    >
                      {phase.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={clearSelection}>
          <Trash2 className="h-4 w-4 mr-2" />
          Auswahl aufheben
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   ├── hooks/
│   │   ├── useRangeSelection.ts
│   │   └── __tests__/
│   │       └── useRangeSelection.test.ts
│   ├── contexts/
│   │   └── SelectionContext.tsx  # Erweitert
│   └── components/
│       └── planning/
│           ├── SelectableCell.tsx
│           └── SelectionContextMenu.tsx
```

---

## Hinweise

- Nur Werktage (Mo-Fr) auswählbar
- Abwesenheiten werden übersprungen aber in Auswahl angezeigt
- Shift+Click erweitert zur rechteckigen Auswahl
- Cmd/Ctrl+Click für nicht-zusammenhängende Auswahl
- ESC oder Klick außerhalb hebt Auswahl auf
- Batch-Create als eine Undo-Aktion
- Drag aus Sidebar auf Auswahl erstellt für alle Zellen
- Rechtsklick öffnet Kontextmenü mit Schnellzuweisung

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Rechteck-Auswahl durch Ziehen
- [ ] Shift+Click erweitert Auswahl
- [ ] Cmd/Ctrl+Click toggle Einzelzellen
- [ ] Abwesenheiten werden übersprungen
- [ ] Batch-Create aus Auswahl
- [ ] Undo für Batch-Create
- [ ] Kontextmenü für Schnellzuweisung
- [ ] ESC hebt Auswahl auf

---

*Vorheriger Prompt: 19 – Undo/Redo System*
*Nächster Prompt: 20 – Asana Integration*
