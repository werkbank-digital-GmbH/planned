'use client';

import { useDroppable } from '@dnd-kit/core';
import { useMemo } from 'react';

import type { PhaseRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';

import { formatDateISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { AssignmentCard } from './AssignmentCard';
import { HoursDisplay } from './HoursDisplay';
import { SpanningAssignmentCard } from './SpanningAssignmentCard';
import { createPhaseDropZoneId } from './types/dnd';
import {
  groupConsecutiveAllocations,
  getSpannedAllocationIds,
} from './utils/allocation-grouping';

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
  /** Tag-Index für Resize (0-4 für Mo-Fr) */
  dayIndex: number;
  allocations: PhaseRowData['dayAllocations'][string];
  isActiveThisWeek: boolean;
  /** IDs der Allocations die Teil eines Multi-Tag-Spans sind (werden nicht angezeigt) */
  spannedAllocationIds: Set<string>;
  /** Phase Start-Datum für Resize-Constraint */
  phaseStartDate?: string;
  /** Phase End-Datum für Resize-Constraint */
  phaseEndDate?: string;
}

function DayCell({
  phaseId,
  projectId,
  date,
  dayIndex,
  allocations,
  isActiveThisWeek,
  spannedAllocationIds,
  phaseStartDate,
  phaseEndDate,
}: DayCellProps) {
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

  // Filtere Allocations, die Teil eines Spans sind (werden über SpanningAssignmentCard angezeigt)
  const singleAllocations = allocations.filter((a) => !spannedAllocationIds.has(a.id));

  return (
    <div
      ref={setNodeRef}
      data-day-cell
      data-day-index={dayIndex}
      className={cn(
        'min-h-[60px] p-1 border-r border-gray-200 last:border-r-0',
        'flex flex-wrap gap-1 content-start',
        isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-300',
        isToday && 'bg-amber-50',
        !isActiveThisWeek && 'bg-gray-50'
      )}
    >
      {singleAllocations.map((allocation) => (
        <AssignmentCard
          key={allocation.id}
          allocation={allocation}
          dayIndex={dayIndex}
          phaseStartDate={phaseStartDate}
          phaseEndDate={phaseEndDate}
        />
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
 * - Multi-Tag-Spans als zusammenhängende Blöcke (z.B. "Mo-Fr")
 * - Drop-Zones für Drag & Drop aus dem Pool
 */
export function PhaseRow({ phase, weekDates, projectId }: PhaseRowProps) {
  const { isActiveThisWeek } = phase;

  // Gruppiere aufeinanderfolgende Allocations zu Spans
  const spans = useMemo(
    () => groupConsecutiveAllocations(phase.dayAllocations, weekDates),
    [phase.dayAllocations, weekDates]
  );

  // IDs der Allocations die Teil eines Multi-Tag-Spans sind
  const spannedAllocationIds = useMemo(() => getSpannedAllocationIds(spans), [spans]);

  // Multi-Tag-Spans (spanDays > 1)
  const multiDaySpans = useMemo(() => spans.filter((s) => s.spanDays > 1), [spans]);

  // Berechne die Summe der geplanten Stunden für diese Woche aus den Allocations
  const weeklyPlannedHours = Object.values(phase.dayAllocations)
    .flat()
    .reduce((sum, allocation) => sum + (allocation.plannedHours ?? 0), 0);

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

          {/* Stunden-Info: IST / PLAN / SOLL */}
          <HoursDisplay
            ist={phase.phase.actualHours}
            plan={weeklyPlannedHours}
            soll={phase.phase.budgetHours}
            variant="phase"
            className="mt-0.5"
          />
        </div>
      </div>

      {/* 5 Tageszellen + Spanning Cards */}
      <div className="col-span-5 relative">
        {/* Grid für die Tageszellen */}
        <div className="grid grid-cols-5">
          {weekDates.map((date, dayIndex) => {
            const dateKey = formatDateISO(date);
            const allocations = phase.dayAllocations[dateKey] ?? [];

            return (
              <DayCell
                key={dateKey}
                phaseId={phase.phase.id}
                projectId={projectId}
                date={date}
                dayIndex={dayIndex}
                allocations={allocations}
                isActiveThisWeek={isActiveThisWeek}
                spannedAllocationIds={spannedAllocationIds}
                phaseStartDate={phase.phase.startDate?.toISOString()}
                phaseEndDate={phase.phase.endDate?.toISOString()}
              />
            );
          })}
        </div>

        {/* Multi-Tag-Spans (absolut positioniert über den Zellen) */}
        {multiDaySpans.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="grid grid-cols-5 h-full">
              {multiDaySpans.map((span) => (
                <div
                  key={span.allocations[0].id}
                  className="pointer-events-auto p-1"
                  style={{
                    gridColumn: `${span.startDayIndex + 1} / span ${span.spanDays}`,
                  }}
                >
                  <SpanningAssignmentCard
                    span={span}
                    phaseStartDate={phase.phase.startDate?.toISOString()}
                    phaseEndDate={phase.phase.endDate?.toISOString()}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
