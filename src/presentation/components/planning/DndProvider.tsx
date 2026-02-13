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
import {
  DragHighlightProvider,
  useDragHighlight,
  type DropHighlightStatus,
} from '@/presentation/contexts/DragHighlightContext';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { ResizeActionsProvider } from '@/presentation/contexts/ResizeActionsContext';
import { useUndo } from '@/presentation/contexts/UndoContext';

import { formatDateISO, getMonday, getWeekDates } from '@/lib/date-utils';

import { AllocationCardOverlay } from './AllocationCardOverlay';
import { AllocationSpanOverlay } from './AllocationSpanOverlay';
import { PoolItemOverlay } from './PoolItemOverlay';
import { ProjectPhaseOverlay } from './ProjectPhaseOverlay';
import {
  type DragData,
  type DropZoneData,
  isAllocationDragData,
  isAllocationSpanDragData,
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
  return (
    <DragHighlightProvider>
      <PlanningDndProviderInner>{children}</PlanningDndProviderInner>
    </DragHighlightProvider>
  );
}

function PlanningDndProviderInner({ children }: PlanningDndProviderProps) {
  const [activeData, setActiveData] = useState<DragData | null>(null);
  // overData wird für zukünftiges visuelles Feedback verwendet
  const [, setOverData] = useState<DropZoneData | null>(null);
  const {
    refresh,
    getAllocationById,
    viewMode,
    weekStart,
    addAllocationOptimistic,
    removeAllocationOptimistic,
    moveAllocationOptimistic,
    replaceAllocationId,
  } = usePlanning();

  const { pushAction } = useUndo();
  const { setHighlight, clearHighlight } = useDragHighlight();

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
      clearHighlight();
      return;
    }

    const parsed = parseDropZoneId(overId as string);
    setOverData(parsed);

    // ── Highlight-Berechnung ──────────────────────────────────────────
    const dragData = event.active.data.current as DragData | undefined;
    if (!parsed || !dragData || parsed.type !== 'phase' || !parsed.phaseId) {
      clearHighlight();
      return;
    }

    const phaseId = parsed.phaseId;
    const dropDate = parsed.date;
    const days = new Map<string, DropHighlightStatus>();

    if (isPoolItemDragData(dragData)) {
      if (viewMode === 'month') {
        // Monatsansicht: Ganze Woche (Mo-Fr) highlighten
        const monday = getMonday(dropDate);
        const weekDatesForHighlight = getWeekDates(monday);

        // Availability-Lookup aus DragData
        const availabilityMap = new Map<string, string>();
        if (dragData.availability) {
          for (const a of dragData.availability) {
            availabilityMap.set(a.date, a.status);
          }
        }

        for (const d of weekDatesForHighlight) {
          const iso = formatDateISO(d);
          const avStatus = availabilityMap.get(iso);
          days.set(iso, avStatus === 'absence' ? 'absence' : 'valid');
        }
      } else {
        // Wochen-/Teamansicht: Nur den einen Drop-Tag highlighten
        const availabilityMap = new Map<string, string>();
        if (dragData.availability) {
          for (const a of dragData.availability) {
            availabilityMap.set(a.date, a.status);
          }
        }
        const iso = formatDateISO(dropDate);
        const avStatus = availabilityMap.get(iso);
        days.set(iso, avStatus === 'absence' ? 'absence' : 'valid');
      }
    } else if (isAllocationSpanDragData(dragData)) {
      // Allocation-Span: N Tage ab Cursor-Position, max bis Freitag
      const spanDays = dragData.spanDays;
      for (let i = 0; i < spanDays; i++) {
        const d = new Date(dropDate);
        d.setUTCDate(d.getUTCDate() + i);
        // Clamp auf Wochentage (Mo-Fr)
        if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) {
          days.set(formatDateISO(d), 'valid');
        }
      }
    } else {
      // Einzelne Allocation oder ProjectPhase: nur der eine Tag
      days.set(formatDateISO(dropDate), 'valid');
    }

    setHighlight({ phaseId, days });
  }, [clearHighlight, setHighlight, viewMode]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveData(null);
      setOverData(null);
      clearHighlight();

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

            // 1. Optimistisches Update SOFORT
            removeAllocationOptimistic(dragData.allocationId);

            // 2. Server-Call im Hintergrund
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
              // Kein refresh() nötig - State ist bereits aktuell
            } else {
              // Rollback: Allocation wieder hinzufügen
              addAllocationOptimistic({
                id: originalAllocation.id,
                userId: originalAllocation.user?.id,
                userName: originalAllocation.user?.fullName,
                resourceId: originalAllocation.resource?.id,
                resourceName: originalAllocation.resource?.name,
                projectPhaseId: originalAllocation.projectPhase.id,
                date: formatDateISO(originalAllocation.date),
                plannedHours: originalAllocation.plannedHours ?? 8,
              });
              console.error('Delete failed:', result.error.message);
            }
            return; // Keine weitere Verarbeitung nötig
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
            const newDate = formatDateISO(dropZone.date);
            moveParams.newDate = newDate;

            // Phase ändern wenn Drop auf Phase-Zelle mit anderer Phase
            let newPhaseId: string | undefined;
            if (dropZone.type === 'phase' && dropZone.phaseId) {
              const currentPhaseId = originalAllocation?.projectPhase.id;
              if (dropZone.phaseId !== currentPhaseId) {
                moveParams.newProjectPhaseId = dropZone.phaseId;
                newPhaseId = dropZone.phaseId;
              }
            }

            // Speichere Original-Daten für Rollback
            const originalDate = originalAllocation
              ? formatDateISO(originalAllocation.date)
              : null;
            const originalPhaseId = originalAllocation?.projectPhase.id;

            // 1. Optimistisches Update SOFORT
            moveAllocationOptimistic(dragData.allocationId, newDate, newPhaseId);

            // 2. Server-Call im Hintergrund
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
              // Kein refresh() nötig - State ist bereits aktuell
            } else if (!result.success) {
              // Rollback: Zurück zur Original-Position
              if (originalDate && originalPhaseId) {
                moveAllocationOptimistic(
                  dragData.allocationId,
                  originalDate,
                  originalPhaseId
                );
              }
              console.error('Move failed:', result.error.message);
            }
            return; // Keine weitere Verarbeitung nötig
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
            const weekDatesForMonth = getWeekDates(monday);
            const allDates = weekDatesForMonth.map((d) => formatDateISO(d));

            // Absence-Tage rausfiltern (gleiche Logik wie in handleDragOver)
            if (dragData.availability) {
              const availabilityMap = new Map<string, string>();
              for (const a of dragData.availability) {
                availabilityMap.set(a.date, a.status);
              }
              datesToCreate = allDates.filter((dateStr) => {
                const status = availabilityMap.get(dateStr);
                return status !== 'absence';
              });
            } else {
              datesToCreate = allDates;
            }

            // Keine verfügbaren Tage → abbrechen
            if (datesToCreate.length === 0) {
              return;
            }
          } else {
            // Wochenansicht: Nur der Drop-Tag
            datesToCreate = [formatDateISO(dropZone.date)];
          }

          // 1. Optimistisches Update SOFORT - erstelle temporäre IDs
          const tempIds = datesToCreate.map(() => `temp-${crypto.randomUUID()}`);

          // Füge alle temporären Allocations hinzu
          datesToCreate.forEach((date, index) => {
            addAllocationOptimistic({
              id: tempIds[index],
              userId: dragData.itemType === 'user' ? dragData.itemId : undefined,
              userName: dragData.itemName,
              resourceId:
                dragData.itemType === 'resource' ? dragData.itemId : undefined,
              resourceName: dragData.itemName,
              projectPhaseId: dropZone.phaseId!,
              date,
              plannedHours: 8,
            });
          });

          // 2. Server-Calls im Hintergrund
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

          // 3. Verarbeite Ergebnisse
          const successfulAllocations: Array<{
            id: string;
            tenantId: string;
            userId?: string;
            resourceId?: string;
            projectPhaseId: string;
            date: string;
            plannedHours: number;
            notes?: string;
          }> = [];

          results.forEach((result, index) => {
            if (result.success) {
              // Ersetze temporäre ID mit echter ID
              replaceAllocationId(tempIds[index], result.data.allocation.id);
              successfulAllocations.push({
                id: result.data.allocation.id,
                tenantId: result.data.allocation.tenantId,
                userId: result.data.allocation.userId,
                resourceId: result.data.allocation.resourceId,
                projectPhaseId: result.data.allocation.projectPhaseId,
                date: result.data.allocation.date,
                plannedHours: result.data.allocation.plannedHours ?? 8,
                notes: result.data.allocation.notes,
              });
            } else {
              // Rollback: Entferne fehlgeschlagene temporäre Allocation
              removeAllocationOptimistic(tempIds[index]);
              console.error('Create failed:', result.error.message);
            }
          });

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
          return; // Keine weitere Verarbeitung nötig
        }

        // Für andere Fälle (ProjectPhase, AllocationSpan, Resize) noch refresh()
        // da diese komplexer sind und noch nicht vollständig optimistisch implementiert sind
        await refresh();
      } catch (error) {
        console.error('DnD action failed:', error);
        // Bei Fehler: Daten vom Server neu laden um konsistenten State zu haben
        await refresh();
      }
    },
    [
      refresh,
      getAllocationById,
      pushAction,
      viewMode,
      addAllocationOptimistic,
      removeAllocationOptimistic,
      moveAllocationOptimistic,
      replaceAllocationId,
      clearHighlight,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveData(null);
    setOverData(null);
    clearHighlight();
  }, [clearHighlight]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ResizeActionsProvider
      weekStart={weekStart}
      addAllocationOptimistic={addAllocationOptimistic}
      removeAllocationOptimistic={removeAllocationOptimistic}
      replaceAllocationId={replaceAllocationId}
    >
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
      </DragOverlay>
    </DndContext>
    </ResizeActionsProvider>
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
