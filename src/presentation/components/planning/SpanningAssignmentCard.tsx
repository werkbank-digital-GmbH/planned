'use client';

import { useDraggable } from '@dnd-kit/core';
import { Calendar, Truck, User } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { cn } from '@/lib/utils';

import type { ResizeAllocationDragData } from './types/dnd';
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
 * - Resize-Handle am rechten Rand
 */
export function SpanningAssignmentCard({
  span,
  phaseStartDate,
  phaseEndDate,
}: SpanningAssignmentCardProps) {
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

  // Resize-Draggable für den Handle
  const resizeData: ResizeAllocationDragData = {
    type: 'resize-allocation',
    allocationId: span.allocations[0].id,
    allocationIds: span.allocations.map((a) => a.id),
    userId: span.userId,
    resourceId: span.resourceId,
    phaseId: span.phaseId,
    projectId: span.allocations[0].project.id,
    startDayIndex: span.startDayIndex,
    currentSpanDays: span.spanDays,
    phaseStartDate,
    phaseEndDate,
    displayName: span.displayName,
  };

  const {
    attributes: resizeAttributes,
    listeners: resizeListeners,
    setNodeRef: setResizeRef,
    isDragging: isResizeDragging,
  } = useDraggable({
    id: `resize-span-${span.allocations[0].id}`,
    data: resizeData,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isUser = !!span.userId;
  const spanLabel = getSpanLabel(span.spanDays);
  const isDragging = isMoveDragging || isResizeDragging;

  const cardContent = (
    <div
      ref={setMoveRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-1.5 px-2 py-1 rounded text-xs',
        'transition-colors select-none',
        'border shadow-sm',
        isUser
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-orange-50 text-orange-800 border-orange-200',
        isDragging && 'opacity-50 ring-2 ring-blue-500 shadow-lg'
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

      {/* Resize-Handle am rechten Rand */}
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
              {span.allocations[0].user?.fullName ?? span.allocations[0].resource?.name}
            </p>
            <p className="text-xs text-gray-500">
              {span.spanDays} Tage ({span.totalHours}h gesamt)
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
