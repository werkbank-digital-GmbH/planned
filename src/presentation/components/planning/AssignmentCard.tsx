'use client';

import { useDraggable } from '@dnd-kit/core';
import { AlertCircle, Truck, User } from 'lucide-react';
import { memo } from 'react';

import type { AllocationWithDetails } from '@/application/queries';

import { createAllocationAction } from '@/presentation/actions/allocations';
import { useResizeActions } from '@/presentation/contexts/ResizeActionsContext';
import { useAllocationResize } from '@/presentation/hooks/useAllocationResize';

import { formatDateISO, getWeekDates } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { AllocationPopover, type AllocationPopoverData } from './AllocationPopover';
import * as styles from './assignment-card.styles';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentCardProps {
  allocation: AllocationWithDetails;
  compact?: boolean;
  /** Tag-Index für Resize (0-4 für Mo-Fr) */
  dayIndex?: number;
  /** Phase Start-Datum für Resize-Constraint */
  phaseStartDate?: string;
  /** Phase End-Datum für Resize-Constraint */
  phaseEndDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Karte für einen zugewiesenen Mitarbeiter/Ressource in einer Tageszelle.
 *
 * Zeigt:
 * - Name (abgekürzt bei User, z.B. "M.Bauer")
 * - Stunden (optional)
 * - Warnung bei Abwesenheits-Konflikt
 * - Draggable für Verschieben
 * - Resize-Handle am rechten Rand mit Echtzeit-Preview
 */
export const AssignmentCard = memo(function AssignmentCard({
  allocation,
  compact = false,
  dayIndex,
  phaseStartDate,
  phaseEndDate,
}: AssignmentCardProps) {
  const {
    weekStart,
    addAllocationOptimistic,
    removeAllocationOptimistic,
    replaceAllocationId,
  } = useResizeActions();

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
    id: `allocation-${allocation.id}`,
    data: {
      type: 'allocation',
      allocationId: allocation.id,
      sourceUserId: allocation.user?.id,
      sourceResourceId: allocation.resource?.id,
      sourceDate: allocation.date,
      projectPhaseId: allocation.projectPhase.id,
    },
  });

  // Resize Hook — snappt auf volle Tagesbreiten
  const { handleProps, isResizing, previewSpanDays } = useAllocationResize({
    allocationIds: [allocation.id],
    startDayIndex: dayIndex ?? 0,
    currentSpanDays: 1,
    phaseId: allocation.projectPhase.id,
    userId: allocation.user?.id,
    resourceId: allocation.resource?.id,
    phaseStartDate,
    phaseEndDate,
    weekDates,
    onResizeComplete: async (newSpanDays) => {
      if (newSpanDays === 1) return;

      // ERWEITERN: Neue Allocations erstellen für die zusätzlichen Tage
      const startIdx = dayIndex ?? 0;
      const newDates = weekDates
        .slice(startIdx + 1, startIdx + newSpanDays)
        .map((d) => formatDateISO(d));

      // Temporäre IDs für optimistische Updates
      const tempIds = newDates.map(() => `temp-${crypto.randomUUID()}`);

      // 1. Optimistisches Update
      newDates.forEach((date, index) => {
        addAllocationOptimistic({
          id: tempIds[index],
          userId: allocation.user?.id,
          userName: allocation.user?.fullName,
          resourceId: allocation.resource?.id,
          resourceName: allocation.resource?.name,
          projectPhaseId: allocation.projectPhase.id,
          date,
          plannedHours: 8,
        });
      });

      // 2. Server-Calls
      const results = await Promise.all(
        newDates.map((date) =>
          createAllocationAction({
            projectPhaseId: allocation.projectPhase.id,
            date,
            userId: allocation.user?.id,
            resourceId: allocation.resource?.id,
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
    },
  });

  // Kombinierte Styles für Drag und Resize
  const style = (() => {
    // Bei Move-Drag: transform für Position
    if (transform) {
      return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      };
    }
    // Bei Resize: Width via previewSpanDays mit CSS-Transition
    if (isResizing && previewSpanDays > 1) {
      return {
        width: `${previewSpanDays * 100}%`,
        transition: 'width 150ms ease-out',
      } as React.CSSProperties;
    }
    return undefined;
  })();

  // Name formatieren
  const displayName = allocation.user
    ? formatUserName(allocation.user.fullName)
    : allocation.resource?.name ?? 'Unbekannt';

  const isUser = !!allocation.user;
  const hasConflict = allocation.hasAbsenceConflict;
  const isDragging = isMoveDragging;

  // Popover-Daten zusammenstellen
  const popoverData: AllocationPopoverData = {
    displayName,
    fullName: allocation.user?.fullName ?? allocation.resource?.name,
    isUser,
    spanDays: 1,
    plannedHours: allocation.plannedHours ?? 8,
    actualHours: allocation.actualHours,
    phaseName: allocation.projectPhase.name,
    projectName: allocation.project.name,
    notes: allocation.notes ?? undefined,
    conflictType: hasConflict ? allocation.absenceType ?? undefined : undefined,
  };

  const cardContent = (
    <div
      ref={setMoveRef}
      style={style}
      className={cn(
        styles.cardBase,
        isUser ? styles.cardUser : styles.cardResource,
        hasConflict && styles.cardConflict,
        isDragging && styles.cardDragging,
        isResizing && styles.cardResizing,
        compact && 'max-w-[80px]'
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
        <span className="font-medium truncate">{displayName}</span>
        {hasConflict && (
          <AlertCircle className={cn(styles.iconSize, 'text-red-500')} />
        )}
      </div>

      {/* Resize-Handle am rechten Rand */}
      {dayIndex !== undefined && (
        <div
          {...handleProps}
          className={cn(
            styles.resizeHandleBase,
            isUser ? styles.resizeHandleUser : styles.resizeHandleResource,
            isResizing && styles.resizeHandleActive
          )}
          title="Ziehen um Dauer zu ändern"
        />
      )}

    </div>
  );

  return (
    <AllocationPopover data={popoverData}>
      {cardContent}
    </AllocationPopover>
  );
});

AssignmentCard.displayName = 'AssignmentCard';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatiert einen Benutzernamen in Kurzform.
 * "Max Bauer" -> "M.Bauer"
 * "Anna Maria Schmidt" -> "A.Schmidt"
 */
function formatUserName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return fullName;

  const lastName = parts[parts.length - 1];
  const firstInitial = parts[0].charAt(0).toUpperCase();

  return `${firstInitial}.${lastName}`;
}
