'use client';

import { Clock } from 'lucide-react';

import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BEREICH_COLORS: Record<string, string> = {
  Produktion: 'bg-blue-100 border-blue-300 text-blue-900',
  Montage: 'bg-green-100 border-green-300 text-green-900',
  Planung: 'bg-purple-100 border-purple-300 text-purple-900',
  Sonstiges: 'bg-gray-100 border-gray-300 text-gray-900',
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AllocationCardOverlayProps {
  allocationId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overlay-Karte die beim Drag einer Allocation angezeigt wird.
 *
 * Zeigt eine vergrößerte, leicht gedrehte Version der Karte
 * mit Schatten für visuelles Feedback.
 */
export function AllocationCardOverlay({ allocationId }: AllocationCardOverlayProps) {
  const { getAllocationById } = usePlanning();
  const allocation = getAllocationById(allocationId);

  if (!allocation) return null;

  const bereich = allocation.projectPhase.bereich ?? 'Sonstiges';
  const colorClass = BEREICH_COLORS[bereich] ?? BEREICH_COLORS.Sonstiges;
  const plannedHours = allocation.plannedHours ?? 0;

  return (
    <div
      className={cn(
        'rounded-md border p-2 shadow-lg',
        'scale-105 rotate-2',
        'cursor-grabbing',
        colorClass
      )}
      style={{ minWidth: '120px' }}
    >
      {/* Projekt */}
      <div className="truncate text-xs font-medium">
        {allocation.project.name}
      </div>

      {/* Phase */}
      <div className="truncate text-[10px] opacity-80">
        {allocation.projectPhase.name}
      </div>

      {/* Stunden */}
      <div className="mt-1 flex items-center gap-1 text-xs">
        <Clock className="h-3 w-3" />
        <span>{formatHoursWithUnit(plannedHours)}</span>
      </div>
    </div>
  );
}
