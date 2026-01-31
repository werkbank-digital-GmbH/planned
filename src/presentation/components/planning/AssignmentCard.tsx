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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentCardProps {
  allocation: AllocationWithDetails;
  compact?: boolean;
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
 */
export function AssignmentCard({ allocation, compact = false }: AssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `allocation-${allocation.id}`,
    data: {
      type: 'allocation',
      allocation,
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

  const cardContent = (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        'cursor-grab active:cursor-grabbing',
        'transition-colors select-none',
        isUser ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800',
        hasConflict && 'ring-2 ring-red-400',
        isDragging && 'opacity-50 ring-2 ring-blue-500',
        compact ? 'max-w-[80px]' : 'max-w-[100px]'
      )}
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
