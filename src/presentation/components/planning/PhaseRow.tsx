'use client';

import { useDroppable } from '@dnd-kit/core';

import type { PhaseRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';

import { formatDateISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { AssignmentCard } from './AssignmentCard';
import { createPhaseDropZoneId } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseRowProps {
  phase: PhaseRowData;
  weekDates: Date[];
  projectId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getBereichBadgeColor(bereich: string): string {
  switch (bereich) {
    case 'produktion':
      return 'bg-blue-100 text-blue-800';
    case 'montage':
      return 'bg-green-100 text-green-800';
    case 'externes_gewerk':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getBereichLabel(bereich: string): string {
  const labels: Record<string, string> = {
    produktion: 'PRODUKTION',
    montage: 'MONTAGE',
    externes_gewerk: 'EXTERN',
  };
  return labels[bereich] ?? bereich.toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY CELL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DayCellProps {
  phaseId: string;
  projectId: string;
  date: Date;
  allocations: PhaseRowData['dayAllocations'][string];
  isActiveThisWeek: boolean;
}

function DayCell({ phaseId, projectId, date, allocations, isActiveThisWeek }: DayCellProps) {
  const dateKey = formatDateISO(date);
  const droppableId = createPhaseDropZoneId(phaseId, projectId, date);

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'phase-cell',
      phaseId,
      projectId,
      date,
    },
  });

  const isToday = formatDateISO(new Date()) === dateKey;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[60px] p-1 border-r border-gray-200 last:border-r-0',
        'flex flex-wrap gap-1 content-start',
        isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-300',
        isToday && 'bg-amber-50',
        !isActiveThisWeek && 'bg-gray-50'
      )}
    >
      {allocations.map((allocation) => (
        <AssignmentCard key={allocation.id} allocation={allocation} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Phasen-Zeile im Planungs-Grid (unter dem Projekt).
 *
 * Zeigt:
 * - Phasenname mit Bereich-Badge (PRODUKTION/MONTAGE/EXTERN)
 * - 5 Tageszellen mit zugewiesenen Mitarbeitern/Ressourcen
 * - Drop-Zones für Drag & Drop aus dem Pool
 */
export function PhaseRow({ phase, weekDates, projectId }: PhaseRowProps) {
  const { isActiveThisWeek } = phase;

  return (
    <div
      className={cn(
        'grid grid-cols-[280px_repeat(5,1fr)] items-stretch gap-0',
        'border-t border-gray-100',
        !isActiveThisWeek && 'opacity-60'
      )}
    >
      {/* Phasen-Info (linke Spalte) */}
      <div className="flex items-center gap-2 pl-10 pr-3 py-2 border-r border-gray-200 bg-white">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{phase.phase.name}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 border-0',
                getBereichBadgeColor(phase.phase.bereich)
              )}
            >
              {getBereichLabel(phase.phase.bereich)}
            </Badge>
          </div>

          {/* Stunden-Info (optional) */}
          {phase.phase.budgetHours !== undefined && (
            <div className="text-xs text-gray-500 mt-0.5">
              {phase.phase.actualHours ?? 0}h / {phase.phase.budgetHours}h
            </div>
          )}
        </div>
      </div>

      {/* 5 Tageszellen */}
      {weekDates.map((date) => {
        const dateKey = formatDateISO(date);
        const allocations = phase.dayAllocations[dateKey] ?? [];

        return (
          <DayCell
            key={dateKey}
            phaseId={phase.phase.id}
            projectId={projectId}
            date={date}
            allocations={allocations}
            isActiveThisWeek={isActiveThisWeek}
          />
        );
      })}
    </div>
  );
}
