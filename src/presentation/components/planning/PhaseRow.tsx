'use client';

import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';

import type { InsightStatus } from '@/domain/analytics/types';

import type { PhaseRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { useDayHighlightStatus } from '@/presentation/contexts/DragHighlightContext';

import { formatDateISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { AssignmentCard } from './AssignmentCard';
import { HoursDisplay } from './HoursDisplay';
import { SpanningAssignmentCard } from './SpanningAssignmentCard';
import { createPhaseDropZoneId } from './types/dnd';
import { groupConsecutiveAllocations } from './utils/allocation-grouping';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseRowProps {
  phase: PhaseRowData;
  weekDates: Date[];
  projectId: string;
  highlightPhaseId: string | null;
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
    case 'vertrieb':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getBereichLabel(bereich: string): string {
  const labels: Record<string, string> = {
    produktion: 'PRODUKTION',
    montage: 'MONTAGE',
    externes_gewerk: 'EXTERN',
    vertrieb: 'VERTRIEB',
  };
  return labels[bereich] ?? bereich.toUpperCase();
}

/**
 * Gibt die Tailwind border-l-Farbe für den InsightStatus zurück.
 */
function getInsightStatusBorderColor(status?: InsightStatus): string {
  if (!status) return 'border-l-gray-200';

  const colors: Record<InsightStatus, string> = {
    on_track: 'border-l-green-500',
    ahead: 'border-l-green-500',
    at_risk: 'border-l-yellow-500',
    behind: 'border-l-red-500',
    critical: 'border-l-red-500',
    not_started: 'border-l-gray-300',
    completed: 'border-l-blue-500',
    unknown: 'border-l-gray-300',
  };

  return colors[status] ?? 'border-l-gray-200';
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
  isActiveThisWeek: boolean;
}

function DayCell({
  phaseId,
  projectId,
  date,
  dayIndex,
  isActiveThisWeek,
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

  // Multi-Day Drop Highlight aus DragHighlightContext
  const highlightStatus = useDayHighlightStatus(phaseId, dateKey);

  return (
    <div
      ref={setNodeRef}
      data-day-cell
      data-day-index={dayIndex}
      className={cn(
        'h-full border-r border-gray-200 last:border-r-0',
        highlightStatus === 'valid' && 'bg-green-50 ring-2 ring-inset ring-green-400',
        highlightStatus === 'absence' && 'bg-orange-50 ring-2 ring-inset ring-orange-400',
        !highlightStatus && isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-300',
        !highlightStatus && isToday && 'bg-amber-50',
        !highlightStatus && !isActiveThisWeek && 'bg-gray-50'
      )}
    />
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
export const PhaseRow = memo(function PhaseRow({ phase, weekDates, projectId, highlightPhaseId }: PhaseRowProps) {
  const { isActiveThisWeek, insightStatus } = phase;
  const isHighlighted = highlightPhaseId === phase.phase.id;

  // Border-Farbe basierend auf Insight-Status
  const borderColor = getInsightStatusBorderColor(insightStatus);

  // Gruppiere aufeinanderfolgende Allocations zu Spans
  const spans = useMemo(
    () => groupConsecutiveAllocations(phase.dayAllocations, weekDates),
    [phase.dayAllocations, weekDates]
  );

  // Sortiert: nach startDayIndex, bei Gleichheit breitere zuerst
  const sortedSpans = useMemo(
    () => [...spans].sort((a, b) =>
      a.startDayIndex - b.startDayIndex || b.spanDays - a.spanDays
    ),
    [spans]
  );

  // Berechne die Summe der geplanten Stunden für diese Woche aus den Allocations
  const weeklyPlannedHours = useMemo(
    () =>
      Object.values(phase.dayAllocations)
        .flat()
        .reduce((sum, allocation) => sum + (allocation.plannedHours ?? 0), 0),
    [phase.dayAllocations]
  );

  return (
    <div
      className={cn(
        'grid grid-cols-[280px_repeat(5,1fr)] items-stretch gap-0',
        'border-t border-gray-100',
        !isActiveThisWeek && 'opacity-60',
        isHighlighted && 'ring-2 ring-primary ring-inset'
      )}
    >
      {/* Phasen-Info (linke Spalte) mit Status-Border */}
      <div
        className={cn(
          'flex items-center gap-2 pl-10 pr-3 py-2 border-r border-gray-200 bg-white',
          'border-l-4',
          borderColor
        )}
      >
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

      {/* 5 Tageszellen + Allocation Spans */}
      <div className="col-span-5 relative">
        {/* Hintergrund: DayCells als reine Drop-Targets (absolut, füllt gesamte Fläche) */}
        <div className="absolute inset-0 grid grid-cols-5">
          {weekDates.map((date, dayIndex) => (
              <DayCell
                key={formatDateISO(date)}
                phaseId={phase.phase.id}
                projectId={projectId}
                date={date}
                dayIndex={dayIndex}
                isActiveThisWeek={isActiveThisWeek}
              />
          ))}
        </div>

        {/* Vordergrund: Alle Spans als eigene Zeilen (kein Overlap!) */}
        <div className="relative z-[1] pointer-events-none min-h-[60px]">
          {sortedSpans.length === 0 ? (
            <div className="h-[60px]" />
          ) : (
            sortedSpans.map((span) => (
              <div key={span.allocations[0].id} className="grid grid-cols-5">
                <div
                  className="p-1 pointer-events-auto"
                  style={{
                    gridColumn: `${span.startDayIndex + 1} / span ${span.spanDays}`,
                  }}
                >
                  {span.spanDays === 1 ? (
                    <AssignmentCard
                      allocation={span.allocations[0]}
                      dayIndex={span.startDayIndex}
                      phaseStartDate={phase.phase.startDate?.toISOString()}
                      phaseEndDate={phase.phase.endDate?.toISOString()}
                    />
                  ) : (
                    <SpanningAssignmentCard
                      span={span}
                      phaseStartDate={phase.phase.startDate?.toISOString()}
                      phaseEndDate={phase.phase.endDate?.toISOString()}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

PhaseRow.displayName = 'PhaseRow';
