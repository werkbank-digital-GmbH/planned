'use client';

import { useDraggable } from '@dnd-kit/core';
import { Calendar, Truck, User } from 'lucide-react';

import {
  createAllocationAction,
  deleteAllocationAction,
} from '@/presentation/actions/allocations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useAllocationResize } from '@/presentation/hooks/useAllocationResize';

import { formatDateISO, getWeekDates } from '@/lib/date-utils';
import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { AllocationSpan } from './utils/allocation-grouping';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SpanningAssignmentCardProps {
  span: AllocationSpan;
  /** Phase Start-Datum für Resize-Constraint */
  phaseStartDate?: string;
  /** Phase End-Datum für Resize-Constraint */
  phaseEndDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erzeugt das Tage-Label für den Span.
 * 5 Tage = "Mo-Fr"
 * Sonst = "X Tage"
 */
function getSpanLabel(spanDays: number): string {
  if (spanDays === 5) return 'Mo-Fr';
  if (spanDays === 4) return '4 Tage';
  if (spanDays === 3) return '3 Tage';
  if (spanDays === 2) return '2 Tage';
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Karte für einen Allocation-Span (mehrere aufeinanderfolgende Tage).
 *
 * Wird über mehrere Tagesspalten hinweg angezeigt.
 * Zeigt:
 * - Name (abgekürzt)
 * - Tages-Label (z.B. "Mo-Fr" oder "3 Tage")
 * - Gesamtstunden
 * - Draggable für Verschieben des gesamten Blocks
 * - Resize-Handle am rechten Rand mit Echtzeit-Preview
 */
export function SpanningAssignmentCard({
  span,
  phaseStartDate,
  phaseEndDate,
}: SpanningAssignmentCardProps) {
  const {
    weekStart,
    addAllocationOptimistic,
    removeAllocationOptimistic,
    replaceAllocationId,
  } = usePlanning();

  // Wochentage für Resize-Berechnung
  const weekDates = getWeekDates(weekStart);

  // Move-Draggable für die gesamte Card
  const {
    attributes: moveAttributes,
    listeners: moveListeners,
    setNodeRef: setMoveRef,
    transform,
    isDragging: isMoveDragging,
  } = useDraggable({
    id: `allocation-span-${span.allocations[0].id}`,
    data: {
      type: 'allocation-span',
      allocationIds: span.allocations.map((a) => a.id),
      userId: span.userId,
      resourceId: span.resourceId,
      phaseId: span.phaseId,
      displayName: span.displayName,
      spanDays: span.spanDays,
      startDayIndex: span.startDayIndex,
    },
  });

  // Resize Hook für Echtzeit-Preview mit pixelgenauer Animation
  const { handleProps, isResizing, previewSpanDays, pixelOffset, isSnapping } = useAllocationResize({
    allocationIds: span.allocations.map((a) => a.id),
    startDayIndex: span.startDayIndex,
    currentSpanDays: span.spanDays,
    phaseId: span.phaseId,
    userId: span.userId,
    resourceId: span.resourceId,
    phaseStartDate,
    phaseEndDate,
    weekDates,
    onResizeComplete: async (newSpanDays) => {
      if (newSpanDays === span.spanDays) return;

      if (newSpanDays > span.spanDays) {
        // ERWEITERN: Neue Allocations erstellen
        const newDates = weekDates
          .slice(
            span.startDayIndex + span.spanDays,
            span.startDayIndex + newSpanDays
          )
          .map((d) => formatDateISO(d));

        // Temporäre IDs für optimistische Updates
        const tempIds = newDates.map(() => `temp-${crypto.randomUUID()}`);

        // 1. Optimistisches Update
        newDates.forEach((date, index) => {
          addAllocationOptimistic({
            id: tempIds[index],
            userId: span.userId,
            userName: span.displayName,
            resourceId: span.resourceId,
            resourceName: span.displayName,
            projectPhaseId: span.phaseId,
            date,
            plannedHours: 8,
          });
        });

        // 2. Server-Calls
        const results = await Promise.all(
          newDates.map((date) =>
            createAllocationAction({
              projectPhaseId: span.phaseId,
              date,
              userId: span.userId,
              resourceId: span.resourceId,
            })
          )
        );

        // 3. Ergebnisse verarbeiten
        results.forEach((result, index) => {
          if (result.success) {
            replaceAllocationId(tempIds[index], result.data.allocation.id);
          } else {
            removeAllocationOptimistic(tempIds[index]);
            console.error('Create allocation failed:', result.error.message);
          }
        });
      } else {
        // VERKLEINERN: Überschüssige Allocations löschen
        const toDelete = span.allocations.slice(newSpanDays);

        // 1. Optimistisches Update
        toDelete.forEach((alloc) => {
          removeAllocationOptimistic(alloc.id);
        });

        // 2. Server-Calls
        const results = await Promise.all(
          toDelete.map((alloc) =>
            deleteAllocationAction({ allocationId: alloc.id })
          )
        );

        // 3. Bei Fehler: Rollback
        results.forEach((result, index) => {
          if (!result.success) {
            const alloc = toDelete[index];
            addAllocationOptimistic({
              id: alloc.id,
              userId: alloc.user?.id,
              userName: alloc.user?.fullName,
              resourceId: alloc.resource?.id,
              resourceName: alloc.resource?.name,
              projectPhaseId: alloc.projectPhase.id,
              date: formatDateISO(alloc.date),
              plannedHours: alloc.plannedHours ?? 8,
            });
            console.error('Delete allocation failed:', result.error.message);
          }
        });
      }
    },
  });

  const isUser = !!span.userId;
  const isDragging = isMoveDragging;

  // Verwende Preview während Resize, sonst Original
  const visualSpanDays = (isResizing || isSnapping) ? previewSpanDays : span.spanDays;
  const spanLabel = getSpanLabel(visualSpanDays);

  // Kombinierte Styles für Drag und Resize
  const style = (() => {
    // Bei Move-Drag: transform für Position
    if (transform) {
      return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      };
    }
    // Bei Resize: pixelgenaue Breitenanpassung
    if ((isResizing || isSnapping) && pixelOffset !== 0) {
      return {
        // Basis-Breite + Pixel-Offset für smooth Animation
        width: `calc(100% + ${pixelOffset}px)`,
        transition: isSnapping ? 'width 150ms ease-out' : 'none',
      };
    }
    return undefined;
  })();

  const cardContent = (
    <div
      ref={setMoveRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-1.5 px-2 py-1 rounded text-xs',
        'select-none',
        'border shadow-sm',
        isUser
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-orange-50 text-orange-800 border-orange-200',
        isDragging && 'opacity-50 ring-2 ring-blue-500 shadow-lg',
        (isResizing || isSnapping) && 'ring-2 ring-blue-400 z-10'
      )}
    >
      {/* Move-Bereich (gesamte Card außer Handle) */}
      <div
        {...moveListeners}
        {...moveAttributes}
        className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing flex-1 min-w-0"
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <Truck className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span className="font-medium truncate">{span.displayName}</span>
        {spanLabel && (
          <span className="text-[10px] opacity-70 flex items-center gap-0.5">
            <Calendar className="h-3 w-3" />
            {spanLabel}
          </span>
        )}
      </div>

      {/* Resize-Handle am rechten Rand - jetzt mit eigenem Handler */}
      <div
        {...handleProps}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-3',
          'cursor-col-resize',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-gradient-to-r from-transparent',
          isUser ? 'to-blue-300' : 'to-orange-300',
          'rounded-r',
          (isResizing || isSnapping) && 'opacity-100 bg-blue-400'
        )}
        title="Ziehen um Dauer zu ändern"
      />

      {/* Ghost-Preview zeigt finale Snap-Position während des Drags */}
      {isResizing && previewSpanDays !== span.spanDays && (
        <div
          className={cn(
            'absolute top-0 bottom-0 left-0',
            'border-2 border-dashed rounded pointer-events-none',
            isUser
              ? 'border-blue-400 bg-blue-50/30'
              : 'border-orange-400 bg-orange-50/30'
          )}
          style={{
            // Preview zeigt finale Größe basierend auf previewSpanDays
            width: `${(previewSpanDays / span.spanDays) * 100}%`,
          }}
        />
      )}
    </div>
  );

  // Tooltip mit Details
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <div className="space-y-1">
            <p className="font-medium">
              {span.allocations[0].user?.fullName ??
                span.allocations[0].resource?.name}
            </p>
            <p className="text-xs text-gray-500">
              {visualSpanDays} Tage ({formatHoursWithUnit(span.totalHours)} gesamt)
            </p>
            <p className="text-xs text-gray-500">
              Phase: {span.allocations[0].projectPhase.name}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
