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

import type { AllocationSpan } from './utils/allocation-grouping';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SpanningAssignmentCardProps {
  span: AllocationSpan;
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
 */
export function SpanningAssignmentCard({ span }: SpanningAssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isUser = !!span.userId;
  const spanLabel = getSpanLabel(span.spanDays);

  const cardContent = (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
        'cursor-grab active:cursor-grabbing',
        'transition-colors select-none',
        'border shadow-sm',
        isUser
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-orange-50 text-orange-800 border-orange-200',
        isDragging && 'opacity-50 ring-2 ring-blue-500 shadow-lg'
      )}
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
