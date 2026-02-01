'use client';

import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useState, useCallback, type ReactNode } from 'react';

import {
  createAllocationAction,
  moveAllocationAction,
} from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useUndo } from '@/presentation/contexts/UndoContext';

import { formatDateISO } from '@/lib/date-utils';

import { AllocationCardOverlay } from './AllocationCardOverlay';
import { PoolItemOverlay } from './PoolItemOverlay';
import { ProjectPhaseOverlay } from './ProjectPhaseOverlay';
import {
  type DragData,
  type DropZoneData,
  isAllocationDragData,
  isPoolItemDragData,
  isProjectPhaseDragData,
  parseDropZoneId,
} from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PlanningDndProviderProps {
  children: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DnD Provider für die Planungsansicht.
 *
 * Ermöglicht Drag & Drop von:
 * - Allocations zwischen Tagen/Users
 * - Projekt-Phasen aus der Sidebar zum Grid
 *
 * Verwendet @dnd-kit für volle Kontrolle über Drag-Verhalten.
 */
export function PlanningDndProvider({ children }: PlanningDndProviderProps) {
  const [activeData, setActiveData] = useState<DragData | null>(null);
  // overData wird für zukünftiges visuelles Feedback verwendet
  const [, setOverData] = useState<DropZoneData | null>(null);
  const { refresh, getAllocationById } = usePlanning();
  const { pushAction } = useUndo();

  // Sensor-Konfiguration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mindestens 8px bewegen bevor Drag startet
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // 300ms halten für Touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

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

    const parsed = parseDropZoneId(overId as string);
    setOverData(parsed);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveData(null);
      setOverData(null);

      if (!over) return;

      const dragData = active.data.current as DragData;
      const dropZone = parseDropZoneId(over.id as string);

      if (!dropZone) {
        return;
      }

      try {
        if (isAllocationDragData(dragData)) {
          // Hole Original-Allocation für Undo
          const originalAllocation = getAllocationById(dragData.allocationId);

          // Allocation verschieben
          const result = await moveAllocationAction({
            allocationId: dragData.allocationId,
            newDate: formatDateISO(dropZone.date),
          });

          if (result.success && originalAllocation) {
            // Push Undo Action
            pushAction({
              type: 'MOVE_ALLOCATION',
              allocationId: dragData.allocationId,
              from: {
                userId: originalAllocation.user?.id,
                resourceId: originalAllocation.resource?.id,
                date: originalAllocation.date.toISOString().split('T')[0],
                projectPhaseId: originalAllocation.projectPhase.id,
              },
              to: {
                userId: dropZone.userId,
                resourceId: dropZone.resourceId,
                date: formatDateISO(dropZone.date),
                projectPhaseId: result.data.allocation.projectPhaseId,
              },
            });
          } else if (!result.success) {
            console.error('Move failed:', result.error.message);
          }
        } else if (isProjectPhaseDragData(dragData)) {
          // Neue Allocation aus Sidebar erstellen
          const result = await createAllocationAction({
            projectPhaseId: dragData.projectPhaseId,
            date: formatDateISO(dropZone.date),
            userId: dropZone.userId,
            resourceId: dropZone.resourceId,
          });

          if (result.success) {
            // Push Undo Action
            pushAction({
              type: 'CREATE_ALLOCATION',
              allocation: {
                id: result.data.allocation.id,
                tenantId: result.data.allocation.tenantId,
                userId: result.data.allocation.userId,
                resourceId: result.data.allocation.resourceId,
                projectPhaseId: result.data.allocation.projectPhaseId,
                date: result.data.allocation.date,
                plannedHours: result.data.allocation.plannedHours ?? 8,
                notes: result.data.allocation.notes,
              },
            });
          } else {
            console.error('Create failed:', result.error.message);
          }
        } else if (isPoolItemDragData(dragData)) {
          // Neues Allocation aus Pool erstellen (auf Phase-Zelle)
          if (dropZone.type !== 'phase' || !dropZone.phaseId) {
            return;
          }

          // Bestimme die Daten für die Allocations:
          // - Wochenansicht (1 Tag im dates Array): Nur diesen Tag
          // - Monatsansicht (5 Tage im dates Array): Alle 5 Werktage der Woche
          const datesToCreate =
            dragData.dates.length > 1
              ? dragData.dates // Monatsansicht: Alle Werktage der Woche
              : [formatDateISO(dropZone.date)]; // Wochenansicht: Nur der Drop-Tag

          // Erstelle Allocations für alle Daten parallel
          const results = await Promise.all(
            datesToCreate.map((date) =>
              createAllocationAction({
                projectPhaseId: dropZone.phaseId!,
                date,
                userId: dragData.itemType === 'user' ? dragData.itemId : undefined,
                resourceId:
                  dragData.itemType === 'resource' ? dragData.itemId : undefined,
              })
            )
          );

          // Sammle erfolgreiche Allocations für Undo
          const successfulAllocations = results
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

          if (successfulAllocations.length > 0) {
            // Batch-Undo wenn mehrere Allocations erstellt wurden
            if (successfulAllocations.length > 1) {
              pushAction({
                type: 'BATCH_CREATE',
                allocations: successfulAllocations,
              });
            } else {
              pushAction({
                type: 'CREATE_ALLOCATION',
                allocation: successfulAllocations[0],
              });
            }
          }
        }

        // Daten neu laden
        await refresh();
      } catch (error) {
        console.error('DnD action failed:', error);
      }
    },
    [refresh, getAllocationById, pushAction]
  );

  const handleDragCancel = useCallback(() => {
    setActiveData(null);
    setOverData(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

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
        {activeData && isAllocationDragData(activeData) && (
          <AllocationCardOverlay allocationId={activeData.allocationId} />
        )}
        {activeData && isProjectPhaseDragData(activeData) && (
          <ProjectPhaseOverlay phaseName={activeData.phaseName} />
        )}
        {activeData && isPoolItemDragData(activeData) && (
          <PoolItemOverlay itemName={activeData.itemName} itemType={activeData.itemType} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT HOOK (für Drop Zone Styling)
// ═══════════════════════════════════════════════════════════════════════════

export { useActiveDragData, useOverData };

/**
 * Hook um auf die aktiven Drag-Daten zuzugreifen.
 * Wird verwendet für visuelles Feedback in Drop Zones.
 */
function useActiveDragData() {
  // Note: This would need to be implemented via a separate context
  // For now, components can use useDndContext from @dnd-kit/core directly
  return null;
}

/**
 * Hook um auf die Over-Daten zuzugreifen.
 */
function useOverData() {
  return null;
}
