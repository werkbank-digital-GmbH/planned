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
  deleteAllocationAction,
  moveAllocationAction,
} from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useUndo } from '@/presentation/contexts/UndoContext';

import { formatDateISO, getMonday, getWeekDates } from '@/lib/date-utils';

import { AllocationCardOverlay } from './AllocationCardOverlay';
import { AllocationSpanOverlay } from './AllocationSpanOverlay';
import { PoolItemOverlay } from './PoolItemOverlay';
import { ProjectPhaseOverlay } from './ProjectPhaseOverlay';
import { ResizeAllocationOverlay } from './ResizeAllocationOverlay';
import {
  type DragData,
  type DropZoneData,
  isAllocationDragData,
  isAllocationSpanDragData,
  isPoolItemDragData,
  isProjectPhaseDragData,
  isResizeAllocationDragData,
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
  const { refresh, getAllocationById, viewMode, weekStart } = usePlanning();

  // Berechne weekDates aus weekStart
  const weekDates = getWeekDates(weekStart);
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

          // Fall 1: Drop auf Pool = Löschen
          if (dropZone.type === 'pool') {
            if (!originalAllocation) {
              console.error('Delete failed: Allocation not found');
              return;
            }

            const result = await deleteAllocationAction({
              allocationId: dragData.allocationId,
            });

            if (result.success) {
              // Push Undo Action für Delete
              pushAction({
                type: 'DELETE_ALLOCATION',
                allocation: {
                  id: originalAllocation.id,
                  tenantId: originalAllocation.tenantId,
                  userId: originalAllocation.user?.id,
                  resourceId: originalAllocation.resource?.id,
                  projectPhaseId: originalAllocation.projectPhase.id,
                  date: originalAllocation.date.toISOString().split('T')[0],
                  plannedHours: originalAllocation.plannedHours ?? 8,
                  notes: originalAllocation.notes,
                },
              });
            } else {
              console.error('Delete failed:', result.error.message);
            }
          } else {
            // Fall 2: Drop auf Phase/Cell = Verschieben
            const moveParams: {
              allocationId: string;
              newDate?: string;
              newProjectPhaseId?: string;
            } = {
              allocationId: dragData.allocationId,
            };

            // Datum setzen
            moveParams.newDate = formatDateISO(dropZone.date);

            // Phase ändern wenn Drop auf Phase-Zelle mit anderer Phase
            if (dropZone.type === 'phase' && dropZone.phaseId) {
              const currentPhaseId = originalAllocation?.projectPhase.id;
              if (dropZone.phaseId !== currentPhaseId) {
                moveParams.newProjectPhaseId = dropZone.phaseId;
              }
            }

            // Allocation verschieben
            const result = await moveAllocationAction(moveParams);

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
        } else if (isAllocationSpanDragData(dragData)) {
          // Allocation-Span verschieben oder löschen
          const { allocationIds } = dragData;

          // Fall 1: Drop auf Pool = Alle Allocations im Span löschen
          if (dropZone.type === 'pool') {
            // Sammle alle Original-Allocations für Undo
            const originalAllocations = allocationIds
              .map((id) => getAllocationById(id))
              .filter((a): a is NonNullable<typeof a> => a !== undefined);

            // Lösche alle Allocations parallel
            const results = await Promise.all(
              allocationIds.map((id) => deleteAllocationAction({ allocationId: id }))
            );

            const successfulDeletes = results.filter((r) => r.success);
            if (successfulDeletes.length > 0 && originalAllocations.length > 0) {
              // Batch-Undo für alle gelöschten Allocations
              pushAction({
                type: 'BATCH_DELETE',
                allocations: originalAllocations.map((a) => ({
                  id: a.id,
                  tenantId: a.tenantId,
                  userId: a.user?.id,
                  resourceId: a.resource?.id,
                  projectPhaseId: a.projectPhase.id,
                  date: a.date.toISOString().split('T')[0],
                  plannedHours: a.plannedHours ?? 8,
                  notes: a.notes,
                })),
              });
            }
          } else if (dropZone.type === 'phase' && dropZone.phaseId) {
            // Fall 2: Drop auf Phase-Zelle = Alle Allocations verschieben
            // Berechne den Offset zwischen dem ersten Tag des Spans und dem Drop-Datum
            const firstAllocation = getAllocationById(allocationIds[0]);
            if (!firstAllocation) return;

            const firstDate = firstAllocation.date;
            const dropDate = dropZone.date;
            const dayOffset =
              Math.round((dropDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

            // Verschiebe alle Allocations mit dem gleichen Offset
            await Promise.all(
              allocationIds.map((id) => {
                const allocation = getAllocationById(id);
                if (!allocation) return Promise.resolve({ success: false, error: { message: 'Not found' } });

                const newDate = new Date(allocation.date);
                newDate.setDate(newDate.getDate() + dayOffset);

                return moveAllocationAction({
                  allocationId: id,
                  newDate: formatDateISO(newDate),
                  newProjectPhaseId:
                    dropZone.phaseId !== allocation.projectPhase.id
                      ? dropZone.phaseId
                      : undefined,
                });
              })
            );
            // Für Undo: Könnte als BATCH_MOVE implementiert werden
            // Aktuell nicht im Undo-System vorhanden
          }
        } else if (isResizeAllocationDragData(dragData)) {
          // Resize: Allocation-Dauer per Drag ändern
          // Finde den Ziel-Tag-Index basierend auf dem Drop-Datum
          const dropDayIndex = weekDates.findIndex(
            (d: Date) => formatDateISO(d) === formatDateISO(dropZone.date)
          );

          if (dropDayIndex === -1) return;

          // Berechne die neue Span-Länge
          const newSpanDays = Math.max(1, dropDayIndex - dragData.startDayIndex + 1);

          // Keine Änderung?
          if (newSpanDays === dragData.currentSpanDays) return;

          // Phasen-Grenzen prüfen
          if (dragData.phaseStartDate || dragData.phaseEndDate) {
            const dropDate = weekDates[dropDayIndex];
            if (dragData.phaseStartDate && dropDate < new Date(dragData.phaseStartDate)) {
              return;
            }
            if (dragData.phaseEndDate && dropDate > new Date(dragData.phaseEndDate)) {
              return;
            }
          }

          if (newSpanDays > dragData.currentSpanDays) {
            // ERWEITERN: Neue Allocations erstellen
            const newDates = weekDates
              .slice(
                dragData.startDayIndex + dragData.currentSpanDays,
                dragData.startDayIndex + newSpanDays
              )
              .map((d: Date) => formatDateISO(d));

            const results = await Promise.all(
              newDates.map((date: string) =>
                createAllocationAction({
                  projectPhaseId: dragData.phaseId,
                  date,
                  userId: dragData.userId,
                  resourceId: dragData.resourceId,
                })
              )
            );

            // Sammle erfolgreiche Allocations für Undo
            const successfulAllocations = results
              .filter((r) => r.success)
              .map((r) => {
                if (!r.success) return null;
                return {
                  id: r.data.allocation.id,
                  tenantId: r.data.allocation.tenantId,
                  userId: r.data.allocation.userId,
                  resourceId: r.data.allocation.resourceId,
                  projectPhaseId: r.data.allocation.projectPhaseId,
                  date: r.data.allocation.date,
                  plannedHours: r.data.allocation.plannedHours ?? 8,
                  notes: r.data.allocation.notes,
                };
              })
              .filter((a): a is NonNullable<typeof a> => a !== null);

            if (successfulAllocations.length > 0) {
              pushAction({
                type: 'BATCH_CREATE',
                allocations: successfulAllocations,
              });
            }
          } else {
            // VERKLEINERN: Überschüssige Allocations löschen
            const toDelete = dragData.allocationIds.slice(newSpanDays);

            // Sammle Original-Daten für Undo
            const originalAllocations = toDelete
              .map((id) => getAllocationById(id))
              .filter((a): a is NonNullable<typeof a> => a !== undefined);

            await Promise.all(
              toDelete.map((id) => deleteAllocationAction({ allocationId: id }))
            );

            if (originalAllocations.length > 0) {
              pushAction({
                type: 'BATCH_DELETE',
                allocations: originalAllocations.map((a) => ({
                  id: a.id,
                  tenantId: a.tenantId,
                  userId: a.user?.id,
                  resourceId: a.resource?.id,
                  projectPhaseId: a.projectPhase.id,
                  date: a.date.toISOString().split('T')[0],
                  plannedHours: a.plannedHours ?? 8,
                  notes: a.notes,
                })),
              });
            }
          }
        } else if (isPoolItemDragData(dragData)) {
          // Neues Allocation aus Pool erstellen (auf Phase-Zelle)
          if (dropZone.type !== 'phase' || !dropZone.phaseId) {
            return;
          }

          // Wochenansicht: 1 Allocation für den Drop-Tag
          // Monatsansicht: 5 Allocations für alle Werktage der Woche (Mo-Fr)
          let datesToCreate: string[];

          if (viewMode === 'month') {
            // Monatsansicht: Alle 5 Werktage der Woche des Drop-Datums
            const monday = getMonday(dropZone.date);
            const weekDates = getWeekDates(monday);
            datesToCreate = weekDates.map((d) => formatDateISO(d));
          } else {
            // Wochenansicht: Nur der Drop-Tag
            datesToCreate = [formatDateISO(dropZone.date)];
          }

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
    [refresh, getAllocationById, pushAction, viewMode, weekDates]
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
        {activeData && isAllocationSpanDragData(activeData) && (
          <AllocationSpanOverlay
            displayName={activeData.displayName}
            spanDays={activeData.spanDays}
            isUser={!!activeData.userId}
          />
        )}
        {activeData && isResizeAllocationDragData(activeData) && (
          <ResizeAllocationOverlay
            displayName={activeData.displayName}
            currentSpanDays={activeData.currentSpanDays}
            isUser={!!activeData.userId}
          />
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
