# Prompt 16: Drag & Drop Basic

**Phase:** 4 – UI & Drag-and-Drop
**Komplexität:** L (Large)
**Geschätzte Zeit:** 5-6 Stunden

---

## Kontext

Die Planungsansicht steht. Jetzt implementieren wir Drag & Drop für Allocations.

**Bereits vorhanden:**
- PlanningGrid mit User/Ressourcen-Zeilen
- AllocationCard Component
- MoveAllocationUseCase
- CreateAllocationUseCase

---

## Ziel

Implementiere Drag & Drop für das Verschieben und Erstellen von Allocations mit @dnd-kit.

---

## Referenz-Dokumentation

- `FEATURES.md` – F3.6 (Move), F3.8 (Drag & Drop)
- `DEPENDENCIES.md` – @dnd-kit/core, @dnd-kit/sortable
- `Rules.md` – DnD Feedback-Regeln

---

## Akzeptanzkriterien

```gherkin
Feature: F3.8 - Drag & Drop

Scenario: Allocation verschieben (gleicher User)
  Given ich sehe eine Allocation am Montag
  When ich sie per Drag auf Mittwoch ziehe
  Then wird sie am Mittwoch platziert
  And verschwindet vom Montag
  And die Stunden werden redistributed

Scenario: Allocation zu anderem User verschieben
  Given ich sehe eine Allocation bei Max
  When ich sie per Drag zu Anna ziehe
  Then wird sie Anna zugeordnet
  And Max' Stunden werden redistributed
  And Anna's Stunden werden redistributed

Scenario: Neue Allocation aus Sidebar erstellen
  Given ich sehe Projekte in der Sidebar
  When ich eine Phase auf eine leere Zelle ziehe
  Then wird eine neue Allocation erstellt
  And der Quick-Add Dialog öffnet sich NICHT (direkt erstellt)

Scenario: Drag über User mit Abwesenheit
  Given Anna hat Urlaub am Mittwoch
  When ich eine Allocation über Mittwoch bei Anna ziehe
  Then wird die Zelle rot umrandet (Warning)
  And ich kann trotzdem droppen (mit Warnung)

Scenario: Drag abbrechen
  Given ich ziehe eine Allocation
  When ich ESC drücke
  Then wird der Drag abgebrochen
  And die Allocation bleibt an der ursprünglichen Position

Scenario: Visuelles Feedback
  Given ich ziehe eine Allocation
  Then sehe ich:
    | Element           | Feedback                    |
    | Dragged Card      | Leicht vergrößert, Schatten |
    | Original Position | Ghost (halbtransparent)     |
    | Valid Drop Zone   | Grün umrandet               |
    | Invalid Zone      | Rot umrandet                |
    | Cursor            | grabbing                    |

Scenario: Touch Support
  Given ich nutze ein Tablet
  When ich lange auf eine Allocation drücke (300ms)
  Then startet der Drag-Modus
  And ich kann die Allocation verschieben
```

---

## Technische Anforderungen

### @dnd-kit Setup

```typescript
// Sensor-Konfiguration
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Mindestens 8px bewegen bevor Drag startet
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 300,        // 300ms halten für Touch
      tolerance: 5,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### Drag Data Format

```typescript
interface AllocationDragData {
  type: 'allocation';
  allocationId: string;
  sourceUserId?: string;
  sourceResourceId?: string;
  sourceDate: Date;
  projectPhaseId: string;
}

interface ProjectPhaseDragData {
  type: 'project-phase';
  projectPhaseId: string;
  projectId: string;
  phaseName: string;
}

type DragData = AllocationDragData | ProjectPhaseDragData;
```

### Drop Zone IDs

```typescript
// Format: cell-{userId/resourceId}-{date}
const dropZoneId = `cell-user-${userId}-${date.toISOString()}`;
// oder
const dropZoneId = `cell-resource-${resourceId}-${date.toISOString()}`;
```

---

## Implementierungsschritte

### 🔴 RED: E2E Test für Drag & Drop

```typescript
// tests/e2e/planning/drag-drop.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Drag & Drop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlaner(page);
    await page.goto('/planung');
  });

  test('should drag allocation to different day', async ({ page }) => {
    const card = page.locator('[data-testid="allocation-card"]').first();
    const targetCell = page.locator('[data-date="2026-02-04"]').first();

    await card.dragTo(targetCell);

    // Allocation sollte am neuen Tag sein
    await expect(targetCell.locator('[data-testid="allocation-card"]')).toBeVisible();
  });

  test('should show warning when dropping on absence day', async ({ page }) => {
    // ... Test für Abwesenheits-Warning
  });

  test('should cancel drag on ESC', async ({ page }) => {
    const card = page.locator('[data-testid="allocation-card"]').first();
    const originalPosition = await card.boundingBox();

    await card.hover();
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.keyboard.press('Escape');
    await page.mouse.up();

    const newPosition = await card.boundingBox();
    expect(newPosition).toEqual(originalPosition);
  });
});
```

### 🟢 GREEN: DnD Provider Setup

```typescript
// src/presentation/components/planning/DndProvider.tsx
'use client';

import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { AllocationCard } from './AllocationCard';
import { moveAllocation } from '@/presentation/actions/allocations';

interface PlanningDndProviderProps {
  children: React.ReactNode;
}

export function PlanningDndProvider({ children }: PlanningDndProviderProps) {
  const [activeData, setActiveData] = useState<DragData | null>(null);
  const [overData, setOverData] = useState<DropZoneData | null>(null);
  const { refreshWeekData } = usePlanning();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    setActiveData(data);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (!overId) {
      setOverData(null);
      return;
    }

    // Parse drop zone ID
    const parsed = parseDropZoneId(overId as string);
    setOverData(parsed);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveData(null);
    setOverData(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropZone = parseDropZoneId(over.id as string);

    if (!dropZone) return;

    try {
      if (dragData.type === 'allocation') {
        // Allocation verschieben
        await moveAllocation({
          allocationId: dragData.allocationId,
          newDate: dropZone.date,
          newUserId: dropZone.userId,
          newResourceId: dropZone.resourceId,
        });
      } else if (dragData.type === 'project-phase') {
        // Neue Allocation aus Sidebar erstellen
        await createAllocation({
          projectPhaseId: dragData.projectPhaseId,
          date: dropZone.date,
          userId: dropZone.userId,
          resourceId: dropZone.resourceId,
        });
      }

      // Daten neu laden
      await refreshWeekData();
    } catch (error) {
      console.error('DnD action failed:', error);
      // TODO: Error Toast
    }
  }, [refreshWeekData]);

  const handleDragCancel = useCallback(() => {
    setActiveData(null);
    setOverData(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeData?.type === 'allocation' && (
          <AllocationCardOverlay allocationId={activeData.allocationId} />
        )}
        {activeData?.type === 'project-phase' && (
          <ProjectPhaseOverlay
            projectPhaseId={activeData.projectPhaseId}
            phaseName={activeData.phaseName}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Helper: Drop Zone ID parsen
function parseDropZoneId(id: string): DropZoneData | null {
  // Format: cell-user-{userId}-{isoDate} oder cell-resource-{resourceId}-{isoDate}
  const match = id.match(/^cell-(user|resource)-(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;

  const [, type, entityId, dateStr] = match;
  return {
    type: type as 'user' | 'resource',
    userId: type === 'user' ? entityId : undefined,
    resourceId: type === 'resource' ? entityId : undefined,
    date: new Date(dateStr),
  };
}
```

### 🟢 GREEN: Draggable AllocationCard

```typescript
// src/presentation/components/planning/DraggableAllocationCard.tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AllocationCard } from './AllocationCard';
import { cn } from '@/lib/utils';

interface DraggableAllocationCardProps {
  allocation: AllocationWithDetails;
  hasAbsenceConflict?: boolean;
}

export function DraggableAllocationCard({
  allocation,
  hasAbsenceConflict,
}: DraggableAllocationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `allocation-${allocation.id}`,
    data: {
      type: 'allocation',
      allocationId: allocation.id,
      sourceUserId: allocation.user?.id,
      sourceResourceId: allocation.resource?.id,
      sourceDate: allocation.date,
      projectPhaseId: allocation.projectPhase.id,
    } satisfies AllocationDragData,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50'
      )}
      {...listeners}
      {...attributes}
    >
      <AllocationCard
        allocation={allocation}
        hasAbsenceConflict={hasAbsenceConflict}
        isDragging={isDragging}
      />
    </div>
  );
}
```

### 🟢 GREEN: Droppable Cell

```typescript
// src/presentation/components/planning/DroppableCell.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableCellProps {
  userId?: string;
  resourceId?: string;
  date: Date;
  hasAbsence?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DroppableCell({
  userId,
  resourceId,
  date,
  hasAbsence,
  children,
  className,
}: DroppableCellProps) {
  const type = userId ? 'user' : 'resource';
  const entityId = userId || resourceId;
  const dateStr = date.toISOString().split('T')[0];
  const dropZoneId = `cell-${type}-${entityId}-${dateStr}`;

  const { isOver, setNodeRef, active } = useDroppable({
    id: dropZoneId,
  });

  // Validierung: Kann hier gedroppt werden?
  const isValidDrop = active && !hasAbsence;
  const showWarning = active && hasAbsence;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative min-h-[80px] p-2 border-l transition-colors',
        className,
        isOver && isValidDrop && 'bg-success/10 ring-2 ring-success',
        isOver && showWarning && 'bg-warning/10 ring-2 ring-warning',
        !isOver && active && 'bg-gray-50' // Potenzielle Drop Zone
      )}
      data-user-id={userId}
      data-resource-id={resourceId}
      data-date={date.toISOString()}
    >
      {children}

      {/* Drop Indicator */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            'w-full h-1 rounded',
            isValidDrop ? 'bg-success' : 'bg-warning'
          )} />
        </div>
      )}
    </div>
  );
}
```

### 🟢 GREEN: Drag Overlay Components

```typescript
// src/presentation/components/planning/AllocationCardOverlay.tsx
'use client';

import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { cn } from '@/lib/utils';

const BEREICH_COLORS = {
  produktion: 'bg-blue-100 border-blue-300 text-blue-800',
  montage: 'bg-green-100 border-green-300 text-green-800',
};

interface AllocationCardOverlayProps {
  allocationId: string;
}

export function AllocationCardOverlay({ allocationId }: AllocationCardOverlayProps) {
  const { getAllocationById } = usePlanning();
  const allocation = getAllocationById(allocationId);

  if (!allocation) return null;

  return (
    <div
      className={cn(
        'rounded-md border p-2 shadow-lg scale-105 rotate-2',
        BEREICH_COLORS[allocation.projectPhase.bereich]
      )}
    >
      <div className="font-medium text-xs">
        {allocation.project.number}
      </div>
      <div className="text-xs mt-1">
        {allocation.plannedHours}h
      </div>
    </div>
  );
}

// src/presentation/components/planning/ProjectPhaseOverlay.tsx
interface ProjectPhaseOverlayProps {
  projectPhaseId: string;
  phaseName: string;
}

export function ProjectPhaseOverlay({ phaseName }: ProjectPhaseOverlayProps) {
  return (
    <div className="rounded-md border border-accent bg-accent/10 p-2 shadow-lg">
      <div className="font-medium text-xs text-accent">
        + {phaseName}
      </div>
    </div>
  );
}
```

### 🟢 GREEN: Sidebar Draggable Phases

```typescript
// src/presentation/components/planning/SidebarProjectPhase.tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProjectPhaseProps {
  phase: ProjectPhaseSummary;
  project: ProjectSummary;
}

export function SidebarProjectPhase({ phase, project }: SidebarProjectPhaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `sidebar-phase-${phase.id}`,
    data: {
      type: 'project-phase',
      projectPhaseId: phase.id,
      projectId: project.id,
      phaseName: phase.name,
    } satisfies ProjectPhaseDragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-grab',
        isDragging && 'opacity-50'
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4 text-gray-400" />
      <span className="text-sm">{phase.name}</span>
      <span className="text-xs text-gray-500 ml-auto">
        {phase.bereich === 'produktion' ? 'P' : 'M'}
      </span>
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   └── components/
│       └── planning/
│           ├── DndProvider.tsx
│           ├── DraggableAllocationCard.tsx
│           ├── DroppableCell.tsx
│           ├── AllocationCardOverlay.tsx
│           ├── ProjectPhaseOverlay.tsx
│           ├── SidebarProjectPhase.tsx
│           └── types/
│               └── dnd.ts  # DragData, DropZoneData Types
```

---

## Hinweise

- **Voraussetzung:** `@dnd-kit/core` und `@dnd-kit/sortable` müssen installiert sein (siehe DEPENDENCIES.md)
- @dnd-kit für volle Kontrolle über Drag-Verhalten
- Touch Support mit 300ms Delay (vermeidet versehentliches Dragging)
- Keyboard Support für Barrierefreiheit
- Ghost Element an Originalposition
- Optimistic Updates im Context
- ESC zum Abbrechen
- Visuelle Unterscheidung valid/invalid Drop Zones

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Allocation kann per Drag verschoben werden
- [ ] Neue Allocation kann aus Sidebar erstellt werden
- [ ] Touch Support funktioniert
- [ ] ESC bricht Drag ab
- [ ] Visuelles Feedback ist korrekt
- [ ] Abwesenheits-Warning wird angezeigt

---

*Vorheriger Prompt: 15 – Planungsansicht UI*
*Nächster Prompt: 17 – Copy/Paste & Keyboard Shortcuts*
