'use client';

import { useDraggable } from '@dnd-kit/core';
import { AlertCircle, Truck, User } from 'lucide-react';

import type { AllocationWithDetails } from '@/application/queries';

import { createAllocationAction } from '@/presentation/actions/allocations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useAllocationResize } from '@/presentation/hooks/useAllocationResize';

import { formatDateISO, getWeekDates } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

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
export function AssignmentCard({
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

  // Resize Hook für Echtzeit-Preview
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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Name formatieren
  const displayName = allocation.user
    ? formatUserName(allocation.user.fullName)
    : allocation.resource?.name ?? 'Unbekannt';

  const isUser = !!allocation.user;
  const hasConflict = allocation.hasAbsenceConflict;
  const isDragging = isMoveDragging;

  const cardContent = (
    <div
      ref={setMoveRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        'transition-colors select-none',
        isUser ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800',
        hasConflict && 'ring-2 ring-red-400',
        isDragging && 'opacity-50 ring-2 ring-blue-500',
        isResizing && 'ring-2 ring-blue-400',
        compact ? 'max-w-[80px]' : 'max-w-[100px]'
      )}
    >
      {/* Move-Bereich (gesamte Card außer Handle) */}
      <div
        {...moveListeners}
        {...moveAttributes}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing flex-1 min-w-0"
      >
        {isUser ? (
          <User className="h-3 w-3 flex-shrink-0" />
        ) : (
          <Truck className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="truncate">{displayName}</span>
        {hasConflict && (
          <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-500" />
        )}
      </div>

      {/* Resize-Handle am rechten Rand - jetzt mit eigenem Handler */}
      {dayIndex !== undefined && (
        <div
          {...handleProps}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-2',
            'cursor-col-resize',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'bg-gradient-to-r from-transparent',
            isUser ? 'to-blue-300' : 'to-orange-300',
            'rounded-r',
            isResizing && 'opacity-100 bg-blue-400'
          )}
          title="Ziehen um Dauer zu ändern"
        />
      )}

      {/* Preview-Extension für Resize (wenn mehr als 1 Tag) */}
      {isResizing && previewSpanDays > 1 && (
        <div
          className={cn(
            'absolute left-full top-0 bottom-0',
            'border-2 border-dashed rounded-r',
            isUser
              ? 'bg-blue-100/50 border-blue-400'
              : 'bg-orange-100/50 border-orange-400'
          )}
          style={{ width: `${(previewSpanDays - 1) * 100}%` }}
        />
      )}
    </div>
  );

  // Mit Tooltip wenn es zusätzliche Infos gibt
  if (allocation.plannedHours || allocation.notes || hasConflict) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <div className="space-y-1">
              <p className="font-medium">
                {allocation.user?.fullName ?? allocation.resource?.name}
              </p>
              {allocation.plannedHours && (
                <p className="text-xs text-gray-500">
                  {allocation.plannedHours}h geplant
                </p>
              )}
              {allocation.notes && (
                <p className="text-xs text-gray-500 italic">
                  {allocation.notes}
                </p>
              )}
              {hasConflict && (
                <p className="text-xs text-red-500">
                  Konflikt:{' '}
                  {allocation.absenceType === 'vacation'
                    ? 'Urlaub'
                    : allocation.absenceType}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

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
