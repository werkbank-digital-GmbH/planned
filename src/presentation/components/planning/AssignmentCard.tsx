'use client';

import { useDraggable } from '@dnd-kit/core';
import { AlertCircle, Truck, User } from 'lucide-react';

import type { AllocationWithDetails } from '@/application/queries';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { cn } from '@/lib/utils';

import type { ResizeAllocationDragData } from './types/dnd';

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
 * - Resize-Handle am rechten Rand
 */
export function AssignmentCard({
  allocation,
  compact = false,
  dayIndex,
  phaseStartDate,
  phaseEndDate,
}: AssignmentCardProps) {
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

  // Resize-Draggable für den Handle
  const resizeData: ResizeAllocationDragData = {
    type: 'resize-allocation',
    allocationId: allocation.id,
    allocationIds: [allocation.id],
    userId: allocation.user?.id,
    resourceId: allocation.resource?.id,
    phaseId: allocation.projectPhase.id,
    projectId: allocation.project.id,
    startDayIndex: dayIndex ?? 0,
    currentSpanDays: 1,
    phaseStartDate,
    phaseEndDate,
    displayName: allocation.user
      ? formatUserName(allocation.user.fullName)
      : allocation.resource?.name ?? 'Unbekannt',
  };

  const {
    attributes: resizeAttributes,
    listeners: resizeListeners,
    setNodeRef: setResizeRef,
    isDragging: isResizeDragging,
  } = useDraggable({
    id: `resize-allocation-${allocation.id}`,
    data: resizeData,
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
  const isDragging = isMoveDragging || isResizeDragging;

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

      {/* Resize-Handle am rechten Rand */}
      {dayIndex !== undefined && (
        <div
          ref={setResizeRef}
          {...resizeListeners}
          {...resizeAttributes}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-2',
            'cursor-col-resize',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'bg-gradient-to-r from-transparent',
            isUser ? 'to-blue-300' : 'to-orange-300',
            'rounded-r'
          )}
          title="Ziehen um Dauer zu ändern"
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
                  Konflikt: {allocation.absenceType === 'vacation' ? 'Urlaub' : allocation.absenceType}
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
