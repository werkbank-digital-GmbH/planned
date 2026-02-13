'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import type { AllocationWithDetails, PhaseRowData, ProjectRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

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
import type { MonthWeek } from './utils/month-week-utils';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PROJECT_COLUMN_WIDTH = 280; // px

// ═══════════════════════════════════════════════════════════════════════════
// GRID HEADER
// ═══════════════════════════════════════════════════════════════════════════

interface MonthGridHeaderProps {
  monthWeeks: MonthWeek[];
}

function MonthGridHeader({ monthWeeks }: MonthGridHeaderProps) {
  return (
    <div
      className="grid border-b bg-gray-50 sticky top-0 z-10"
      style={{
        gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px repeat(${monthWeeks.length}, 1fr)`,
      }}
    >
      {/* Projekt/Phase-Spalte Header */}
      <div className="border-r border-gray-200 p-3 font-medium text-sm">
        Projekt / Phase
      </div>

      {/* Wochen-Header */}
      {monthWeeks.map((week) => {
        const firstDate = week.weekDates[0];
        const lastDate = week.weekDates[4];

        return (
          <div
            key={week.weekKey}
            className="border-r-2 border-gray-300 py-2 px-1 text-center last:border-r-0"
          >
            <div className="font-medium text-sm">KW {week.calendarWeek}</div>
            <div className="text-[10px] text-gray-500">
              {firstDate.getUTCDate()}.{firstDate.getUTCMonth() + 1}. &ndash;{' '}
              {lastDate.getUTCDate()}.{lastDate.getUTCMonth() + 1}.
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'planning':
      return 'secondary';
    case 'paused':
      return 'outline';
    case 'completed':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'AKTIV',
    planning: 'GEPLANT',
    paused: 'PAUSIERT',
    completed: 'FERTIG',
  };
  return labels[status] ?? status.toUpperCase();
}

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
// DAY CELL (inside MonthPhaseRow week sub-grid)
// ═══════════════════════════════════════════════════════════════════════════

interface MonthDayCellProps {
  phaseId: string;
  projectId: string;
  date: Date;
  dayIndex: number;
  allocations: AllocationWithDetails[];
  isActiveThisWeek: boolean;
  spannedAllocationIds: Set<string>;
  phaseStartDate?: string;
  phaseEndDate?: string;
}

function MonthDayCell({
  phaseId,
  projectId,
  date,
  dayIndex,
  allocations,
  isActiveThisWeek,
  spannedAllocationIds,
  phaseStartDate,
  phaseEndDate,
}: MonthDayCellProps) {
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

  // Filtere Allocations die Teil eines Multi-Day-Spans sind
  const singleAllocations = allocations.filter((a) => !spannedAllocationIds.has(a.id));

  return (
    <div
      ref={setNodeRef}
      data-day-cell
      data-day-index={dayIndex}
      className={cn(
        'min-h-[48px] p-0.5 border-r border-gray-200 last:border-r-0',
        'flex flex-wrap gap-0.5 content-start',
        isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-300',
        isToday && 'bg-amber-50',
        !isActiveThisWeek && 'bg-gray-50'
      )}
    >
      {singleAllocations.map((allocation) => (
        <AssignmentCard
          key={allocation.id}
          allocation={allocation}
          compact
          dayIndex={dayIndex}
          phaseStartDate={phaseStartDate}
          phaseEndDate={phaseEndDate}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTH PHASE ROW (renders 5-col sub-grid per week)
// ═══════════════════════════════════════════════════════════════════════════

interface MonthPhaseRowProps {
  phase: PhaseRowData;
  monthWeeks: MonthWeek[];
  projectId: string;
}

function MonthPhaseRow({ phase, monthWeeks, projectId }: MonthPhaseRowProps) {
  const bereichColor = getBereichBadgeColor(phase.phase.bereich);

  // Berechne die Summe der geplanten Stunden über alle Wochen
  const monthlyPlannedHours = Object.values(phase.dayAllocations)
    .flat()
    .reduce((sum, allocation) => sum + (allocation.plannedHours ?? 0), 0);

  return (
    <div
      className="grid items-stretch border-t border-gray-100"
      style={{
        gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px repeat(${monthWeeks.length}, 1fr)`,
      }}
    >
      {/* Phase-Info (linke Spalte) */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-200 bg-white pl-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs truncate">{phase.phase.name}</span>
            <Badge
              variant="outline"
              className={cn('text-[9px] px-1 py-0 border-0', bereichColor)}
            >
              {getBereichLabel(phase.phase.bereich)}
            </Badge>
          </div>
          <HoursDisplay
            ist={phase.phase.actualHours}
            plan={monthlyPlannedHours}
            soll={phase.phase.budgetHours}
            variant="phase"
            className="text-[10px]"
          />
        </div>
      </div>

      {/* Pro Woche: 5-col Sub-Grid mit Cards */}
      {monthWeeks.map((week) => (
        <MonthPhaseWeekCell
          key={week.weekKey}
          phase={phase}
          week={week}
          projectId={projectId}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTH PHASE WEEK CELL (a single week column for a phase)
// ═══════════════════════════════════════════════════════════════════════════

interface MonthPhaseWeekCellProps {
  phase: PhaseRowData;
  week: MonthWeek;
  projectId: string;
}

function MonthPhaseWeekCell({ phase, week, projectId }: MonthPhaseWeekCellProps) {
  // Filtere dayAllocations auf diese Woche
  const weekDayAllocations = useMemo(() => {
    const filtered: Record<string, AllocationWithDetails[]> = {};
    for (const date of week.weekDates) {
      const key = formatDateISO(date);
      if (phase.dayAllocations[key]) {
        filtered[key] = phase.dayAllocations[key];
      }
    }
    return filtered;
  }, [phase.dayAllocations, week.weekDates]);

  // Gruppiere aufeinanderfolgende Allocations für diese Woche
  const spans = useMemo(
    () => groupConsecutiveAllocations(weekDayAllocations, week.weekDates),
    [weekDayAllocations, week.weekDates]
  );

  const spannedAllocationIds = useMemo(() => getSpannedAllocationIds(spans), [spans]);
  const multiDaySpans = useMemo(() => spans.filter((s) => s.spanDays > 1), [spans]);

  return (
    <div className="relative border-r-2 border-gray-300 last:border-r-0">
      {/* 5-col sub-grid for day cells */}
      <div className="grid grid-cols-5">
        {week.weekDates.map((date, dayIndex) => {
          const dateKey = formatDateISO(date);
          const allocations = weekDayAllocations[dateKey] ?? [];

          return (
            <MonthDayCell
              key={dateKey}
              phaseId={phase.phase.id}
              projectId={projectId}
              date={date}
              dayIndex={dayIndex}
              allocations={allocations}
              isActiveThisWeek={phase.isActiveThisWeek}
              spannedAllocationIds={spannedAllocationIds}
              phaseStartDate={phase.phase.startDate?.toISOString()}
              phaseEndDate={phase.phase.endDate?.toISOString()}
            />
          );
        })}
      </div>

      {/* Multi-Day Spans (absolut positioniert über den Zellen) */}
      {multiDaySpans.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="grid grid-cols-5 h-full">
            {multiDaySpans.map((span) => (
              <div
                key={span.allocations[0].id}
                className="pointer-events-auto p-0.5"
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
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ROW
// ═══════════════════════════════════════════════════════════════════════════

interface MonthProjectRowProps {
  project: ProjectRowData;
  monthWeeks: MonthWeek[];
  onToggleExpand: (projectId: string) => void;
}

function MonthProjectRow({ project, monthWeeks, onToggleExpand }: MonthProjectRowProps) {
  const { isExpanded, hasActivePhasesThisWeek } = project;

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Projekt-Header */}
      <div
        className={cn(
          'grid items-center',
          'bg-gray-50 hover:bg-gray-100 transition-colors',
          hasActivePhasesThisWeek && 'bg-white hover:bg-gray-50'
        )}
        style={{
          gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px repeat(${monthWeeks.length}, 1fr)`,
        }}
      >
        {/* Projekt-Info (linke Spalte) */}
        <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-200 bg-inherit">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onToggleExpand(project.project.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {project.project.name}
              </span>
              <Badge
                variant={getStatusBadgeVariant(project.project.status)}
                className="text-[10px] px-1.5 py-0"
              >
                {getStatusLabel(project.project.status)}
              </Badge>
            </div>

            <HoursDisplay
              ist={project.totalActualHours}
              plan={project.weeklyPlannedHours}
              soll={project.totalBudgetHours}
              variant="project"
              className="mt-0.5"
            />
          </div>
        </div>

        {/* Leere Wochen-Zellen auf Projekt-Ebene */}
        {monthWeeks.map((week) => (
          <div
            key={week.weekKey}
            className="h-full min-h-[52px] border-r-2 border-gray-300 last:border-r-0"
          />
        ))}
      </div>

      {/* Phasen-Zeilen (wenn aufgeklappt) */}
      {isExpanded && project.phases.length > 0 && (
        <div className="bg-white">
          {project.phases.map((phase) => (
            <MonthPhaseRow
              key={phase.phase.id}
              phase={phase}
              monthWeeks={monthWeeks}
              projectId={project.project.id}
            />
          ))}
        </div>
      )}

      {/* Leere Nachricht wenn keine Phasen */}
      {isExpanded && project.phases.length === 0 && (
        <div className="px-6 py-3 text-sm text-gray-500 italic bg-white">
          Keine Phasen vorhanden
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Monats-Grid der Planungsansicht.
 *
 * Zeigt 4-5 Wochenspalten, wobei jede Woche intern ein 5-Spalten Sub-Grid
 * (Mo-Fr) hat. Mini-Cards (AssignmentCard/SpanningAssignmentCard) werden
 * identisch zur Wochenansicht angezeigt.
 */
export function MonthGrid() {
  const {
    monthProjectRows,
    monthWeeks,
    isMonthLoading,
    error,
    toggleProjectExpanded,
  } = usePlanning();

  // Fehler-Anzeige
  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Lade-Anzeige
  if (isMonthLoading && monthProjectRows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Lade Monatsdaten...</span>
      </div>
    );
  }

  if (monthWeeks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8">
        <span className="text-gray-500">Keine Wochendaten verfügbar</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white relative w-full">
      <MonthGridHeader monthWeeks={monthWeeks} />

      <div className="flex flex-col gap-2 p-2">
        {monthProjectRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Projekte mit Phasen in diesem Monat
          </div>
        ) : (
          monthProjectRows.map((project) => (
            <MonthProjectRow
              key={project.project.id}
              project={project}
              monthWeeks={monthWeeks}
              onToggleExpand={toggleProjectExpanded}
            />
          ))
        )}
      </div>

      {/* Loading Overlay */}
      {isMonthLoading && monthProjectRows.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
