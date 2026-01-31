# Prompt 19: Undo/Redo System

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** L (Large)
**Geschätzte Zeit:** 4-5 Stunden

---

## Kontext

Die Planungsoberfläche ist feature-complete. Jetzt implementieren wir Undo/Redo für versehentliche Änderungen.

**KRITISCH:** Dieses Feature wurde im ursprünglichen Review als fehlend identifiziert. Es ist essentiell für die User Experience bei Drag & Drop Operationen.

**Bereits vorhanden:**
- CreateAllocationUseCase
- MoveAllocationUseCase
- DeleteAllocationUseCase
- Keyboard Shortcuts (Cmd+Z / Cmd+Shift+Z reserviert)

---

## Ziel

Implementiere ein robustes Undo/Redo System für alle Allocation-Operationen.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.11 (Undo/Redo)
- `Rules.md` – Undo-Verhalten

---

## Akzeptanzkriterien

```gherkin
Feature: Undo/Redo System

Scenario: Erstellung rückgängig machen
  Given ich habe eine Allocation erstellt
  When ich Cmd/Ctrl+Z drücke
  Then wird die Allocation gelöscht
  And ich sehe "Erstellung rückgängig gemacht"

Scenario: Verschiebung rückgängig machen
  Given ich habe eine Allocation verschoben
  When ich Cmd/Ctrl+Z drücke
  Then kehrt die Allocation zur ursprünglichen Position zurück
  And die Stunden werden wieder redistributed

Scenario: Löschung rückgängig machen
  Given ich habe eine Allocation gelöscht
  When ich Cmd/Ctrl+Z drücke
  Then wird die Allocation wiederhergestellt
  And sie erscheint an der ursprünglichen Position

Scenario: Redo nach Undo
  Given ich habe eine Aktion rückgängig gemacht
  When ich Cmd/Ctrl+Shift+Z drücke
  Then wird die Aktion erneut ausgeführt

Scenario: Undo-Stack Limit
  Given ich habe 51 Aktionen ausgeführt
  Then sind nur die letzten 50 Aktionen im Undo-Stack
  And die älteste Aktion kann nicht mehr rückgängig gemacht werden

Scenario: Neue Aktion leert Redo-Stack
  Given ich habe etwas rückgängig gemacht (Redo verfügbar)
  When ich eine neue Aktion ausführe
  Then ist der Redo-Stack leer

Scenario: Undo-Button in der UI
  Given ich habe Änderungen gemacht
  Then sehe ich einen Undo-Button in der Toolbar
  And er zeigt die Anzahl der rückgängig machbaren Aktionen

Scenario: Undo über Session-Grenzen
  Given ich habe Änderungen gemacht
  When ich die Seite neu lade
  Then ist der Undo-Stack leer (nicht persistent)

Scenario: Batch-Undo für Multi-Create
  Given ich habe 5 Allocations auf einmal erstellt (Multi-Select)
  When ich Cmd/Ctrl+Z drücke
  Then werden alle 5 Allocations auf einmal rückgängig gemacht
```

---

## Technische Anforderungen

### Undo Action Types

```typescript
type UndoableAction =
  | { type: 'CREATE_ALLOCATION'; allocation: AllocationSnapshot }
  | { type: 'DELETE_ALLOCATION'; allocation: AllocationSnapshot }
  | { type: 'MOVE_ALLOCATION'; allocationId: string; from: MoveSnapshot; to: MoveSnapshot }
  | { type: 'BATCH_CREATE'; allocations: AllocationSnapshot[] }
  | { type: 'BATCH_DELETE'; allocations: AllocationSnapshot[] };

interface AllocationSnapshot {
  id: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: string;  // ISO string
  plannedHours: number;
  notes?: string;
}

interface MoveSnapshot {
  userId?: string;
  resourceId?: string;
  date: string;
  projectPhaseId: string;
}
```

### Undo Context Interface

```typescript
interface UndoContext {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastAction?: string;  // Beschreibung für Tooltip

  undo: () => Promise<void>;
  redo: () => Promise<void>;
  pushAction: (action: UndoableAction) => void;
  clear: () => void;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Undo/Redo Hook

```typescript
// src/presentation/hooks/__tests__/useUndoRedo.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

describe('useUndoRedo', () => {
  it('should start with empty stacks', () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should enable undo after pushing action', async () => {
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      result.current.pushAction({
        type: 'CREATE_ALLOCATION',
        allocation: mockAllocationSnapshot,
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoCount).toBe(1);
  });

  it('should move action to redo stack on undo', async () => {
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      result.current.pushAction({
        type: 'CREATE_ALLOCATION',
        allocation: mockAllocationSnapshot,
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should clear redo stack on new action', async () => {
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      result.current.pushAction({ type: 'CREATE_ALLOCATION', allocation: mockAllocationSnapshot });
    });

    await act(async () => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    await act(async () => {
      result.current.pushAction({ type: 'CREATE_ALLOCATION', allocation: mockAllocationSnapshot });
    });

    expect(result.current.canRedo).toBe(false);
  });

  it('should limit undo stack to 50 actions', async () => {
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      for (let i = 0; i < 60; i++) {
        result.current.pushAction({
          type: 'CREATE_ALLOCATION',
          allocation: { ...mockAllocationSnapshot, id: `alloc-${i}` },
        });
      }
    });

    expect(result.current.undoCount).toBe(50);
  });
});
```

### 🟢 GREEN: useUndoRedo Hook

```typescript
// src/presentation/hooks/useUndoRedo.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

const MAX_UNDO_STACK = 50;

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const canUndo = undoStack.length > 0 && !isProcessing;
  const canRedo = redoStack.length > 0 && !isProcessing;

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

  const undo = useCallback(async () => {
    if (!canUndo) return;

    const action = undoStack[undoStack.length - 1];
    setIsProcessing(true);

    try {
      await executeUndoAction(action);

      // Action von Undo zu Redo verschieben
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, action]);

      toast.success(getUndoMessage(action));
    } catch (error) {
      toast.error('Rückgängig machen fehlgeschlagen');
      console.error('Undo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [canUndo, undoStack]);

  const redo = useCallback(async () => {
    if (!canRedo) return;

    const action = redoStack[redoStack.length - 1];
    setIsProcessing(true);

    try {
      await executeRedoAction(action);

      // Action von Redo zu Undo verschieben
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, action]);

      toast.success(getRedoMessage(action));
    } catch (error) {
      toast.error('Wiederholen fehlgeschlagen');
      console.error('Redo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [canRedo, redoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const lastAction = useMemo(() => {
    if (undoStack.length === 0) return undefined;
    return getActionDescription(undoStack[undoStack.length - 1]);
  }, [undoStack]);

  return {
    canUndo,
    canRedo,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    lastAction,
    undo,
    redo,
    pushAction,
    clear,
    isProcessing,
  };
}

// Helper: Undo-Aktion ausführen
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

// Helper: Redo-Aktion ausführen (Gegenteil von Undo)
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

// Helper: Beschreibungen für UI
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

function getUndoMessage(action: UndoableAction): string {
  return `${getActionDescription(action)} rückgängig gemacht`;
}

function getRedoMessage(action: UndoableAction): string {
  return `${getActionDescription(action)} wiederhergestellt`;
}
```

### 🟢 GREEN: Direct API Functions (ohne Undo-Push)

```typescript
// src/presentation/actions/allocations-direct.ts
'use server';

// Diese Funktionen werden von Undo/Redo verwendet
// Sie pushen NICHT in den Undo-Stack (würde Endlosschleife verursachen)

export async function createAllocationDirect(
  snapshot: AllocationSnapshot
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase
    .from('allocations')
    .insert({
      id: snapshot.id,
      user_id: snapshot.userId,
      resource_id: snapshot.resourceId,
      project_phase_id: snapshot.projectPhaseId,
      date: snapshot.date,
      planned_hours: snapshot.plannedHours,
      notes: snapshot.notes,
    });

  if (error) throw new Error(error.message);
}

export async function deleteAllocationDirect(
  allocationId: string
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('id', allocationId);

  if (error) throw new Error(error.message);
}

export async function moveAllocationDirect(
  allocationId: string,
  target: MoveSnapshot
): Promise<void> {
  const supabase = await createActionSupabaseClient();

  const { error } = await supabase
    .from('allocations')
    .update({
      user_id: target.userId,
      resource_id: target.resourceId,
      date: target.date,
      project_phase_id: target.projectPhaseId,
    })
    .eq('id', allocationId);

  if (error) throw new Error(error.message);
}
```

### 🟢 GREEN: UndoContext Provider

```typescript
// src/presentation/contexts/UndoContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUndoRedo } from '@/presentation/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/presentation/hooks/useKeyboardShortcuts';

const UndoContext = createContext<ReturnType<typeof useUndoRedo> | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const undoRedo = useUndoRedo();

  // Keyboard Shortcuts registrieren
  useKeyboardShortcuts([
    {
      key: 'z',
      meta: true,
      handler: () => undoRedo.undo(),
      disabled: !undoRedo.canUndo,
    },
    {
      key: 'z',
      meta: true,
      shift: true,
      handler: () => undoRedo.redo(),
      disabled: !undoRedo.canRedo,
    },
    {
      key: 'y',
      meta: true,
      handler: () => undoRedo.redo(), // Alternative: Ctrl+Y
      disabled: !undoRedo.canRedo,
    },
  ]);

  return (
    <UndoContext.Provider value={undoRedo}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
}
```

### 🟢 GREEN: UndoToolbar Component

```typescript
// src/presentation/components/planning/UndoToolbar.tsx
'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';
import { useUndo } from '@/presentation/contexts/UndoContext';

export function UndoToolbar() {
  const { canUndo, canRedo, undoCount, lastAction, undo, redo, isProcessing } = useUndo();

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo || isProcessing}
            aria-label="Rückgängig"
          >
            <Undo2 className="h-4 w-4" />
            {undoCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {undoCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canUndo
            ? `Rückgängig: ${lastAction} (⌘Z)`
            : 'Nichts zum Rückgängig machen'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo || isProcessing}
            aria-label="Wiederholen"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {canRedo
            ? 'Wiederholen (⌘⇧Z)'
            : 'Nichts zum Wiederholen'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

### 🟢 GREEN: Integration in Use Cases

```typescript
// Beispiel: CreateAllocationUseCase mit Undo-Support
// src/presentation/actions/allocations.ts (erweitert)

export async function createAllocationWithUndo(
  input: CreateAllocationInput,
  pushUndo: (action: UndoableAction) => void
): Promise<ActionResult<AllocationWithDetails>> {
  const result = await createAllocation(input);

  if (result.success) {
    // Snapshot für Undo erstellen
    pushUndo({
      type: 'CREATE_ALLOCATION',
      allocation: {
        id: result.data.id,
        userId: result.data.user?.id,
        resourceId: result.data.resource?.id,
        projectPhaseId: result.data.projectPhase.id,
        date: result.data.date.toISOString(),
        plannedHours: result.data.plannedHours,
        notes: result.data.notes,
      },
    });
  }

  return result;
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   ├── hooks/
│   │   ├── useUndoRedo.ts
│   │   └── __tests__/
│   │       └── useUndoRedo.test.ts
│   ├── contexts/
│   │   └── UndoContext.tsx
│   ├── components/
│   │   └── planning/
│   │       └── UndoToolbar.tsx
│   └── actions/
│       └── allocations-direct.ts
```

---

## Hinweise

- Undo-Stack nicht persistent (leert sich bei Page Reload)
- Maximum 50 Aktionen im Stack
- Batch-Operationen als eine Undo-Aktion
- Direct-Functions umgehen Undo-Stack (für Redo)
- Toast-Feedback für Undo/Redo
- Shortcuts: Cmd+Z (Undo), Cmd+Shift+Z oder Cmd+Y (Redo)
- Button zeigt Anzahl der rückgängig machbaren Aktionen

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Cmd+Z macht Erstellung rückgängig
- [ ] Cmd+Z macht Verschiebung rückgängig
- [ ] Cmd+Z macht Löschung rückgängig
- [ ] Cmd+Shift+Z führt Redo aus
- [ ] Stack-Limit (50) wird eingehalten
- [ ] Neue Aktion leert Redo-Stack
- [ ] Batch-Operationen als eine Aktion
- [ ] UI zeigt Undo-Count

---

*Vorheriger Prompt: 18 – Quick-Add Dialog*
*Nächster Prompt: 19a – Range-Select Multi-Allocation*
