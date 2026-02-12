'use client';

import { useDraggable } from '@dnd-kit/core';
import { Calendar, Truck, User } from 'lucide-react';
import { memo } from 'react';

import {
  createAllocationAction,
  deleteAllocationAction,
} from '@/presentation/actions/allocations';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useAllocationResize } from '@/presentation/hooks/useAllocationResize';

import { formatDateISO, getWeekDates } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { AllocationPopover, type AllocationPopoverData } from './AllocationPopover';
import * as styles from './assignment-card.styles';
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
export const SpanningAssignmentCard = memo(function SpanningAssignmentCard({
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
  const { handleProps, isResizing, previewSpanDays, pixelOffset } = useAllocationResize({
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
  const visualSpanDays = isResizing ? previewSpanDays : span.spanDays;
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
    if (isResizing && pixelOffset !== 0) {
      return {
        width: `calc(100% + ${pixelOffset}px)`,
        transitionProperty: 'box-shadow, border-color, background-color, color, opacity',
      } as React.CSSProperties;
    }
    return undefined;
  })();

  // Popover-Daten zusammenstellen
  const firstAllocation = span.allocations[0];
  const popoverData: AllocationPopoverData = {
    displayName: span.displayName,
    fullName: firstAllocation.user?.fullName ?? firstAllocation.resource?.name,
    isUser,
    spanDays: visualSpanDays,
    plannedHours: span.totalHours,
    actualHours: span.allocations.reduce((sum, a) => sum + (a.actualHours ?? 0), 0) || undefined,
    phaseName: firstAllocation.projectPhase.name,
    projectName: firstAllocation.project.name,
    notes: firstAllocation.notes ?? undefined,
    conflictType: firstAllocation.hasAbsenceConflict ? firstAllocation.absenceType ?? undefined : undefined,
  };

  const cardContent = (
    <div
      ref={setMoveRef}
      style={style}
      className={cn(
        styles.cardBase,
        isUser ? styles.cardUser : styles.cardResource,
        isDragging && styles.cardDragging,
        isResizing && styles.cardResizing
      )}
    >
      {/* Move-Bereich (gesamte Card außer Handle) */}
      <div
        {...moveListeners}
        {...moveAttributes}
        className={styles.moveHandle}
      >
        {isUser ? (
          <User className={styles.iconSize} />
        ) : (
          <Truck className={styles.iconSize} />
        )}
        <span className="font-medium truncate">{span.displayName}</span>
        {spanLabel && (
          <span className="text-[10px] opacity-70 flex items-center gap-0.5">
            <Calendar className="h-3 w-3" />
            {spanLabel}
          </span>
        )}
      </div>

      {/* Resize-Handle am rechten Rand */}
      <div
        {...handleProps}
        className={cn(
          styles.resizeHandleBase,
          isUser ? styles.resizeHandleUser : styles.resizeHandleResource,
          isResizing && styles.resizeHandleActive
        )}
        title="Ziehen um Dauer zu ändern"
      />

    </div>
  );

  return (
    <AllocationPopover data={popoverData}>
      {cardContent}
    </AllocationPopover>
  );
});

SpanningAssignmentCard.displayName = 'SpanningAssignmentCard';
