'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Clock, Target } from 'lucide-react';

import type { PhaseRowData, ProjectRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

import {
  formatDateISO,
  getDayOfWeek,
  getWeekdayShort,
  isToday,
  isWeekend,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { createPhaseDropZoneId } from './types/dnd';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DAY_COLUMN_WIDTH = 32; // px pro Tag
const PROJECT_COLUMN_WIDTH = 280; // px

// ═══════════════════════════════════════════════════════════════════════════
// GRID HEADER
// ═══════════════════════════════════════════════════════════════════════════

interface MonthGridHeaderProps {
  monthDates: Date[];
}

function MonthGridHeader({ monthDates }: MonthGridHeaderProps) {
  return (
    <div
      className="flex border-b bg-gray-50 sticky top-0 z-10"
      style={{ minWidth: PROJECT_COLUMN_WIDTH + monthDates.length * DAY_COLUMN_WIDTH }}
    >
      {/* Projekt/Phase-Spalte Header */}
      <div
        className="border-r border-gray-200 p-3 font-medium text-sm flex-shrink-0 sticky left-0 bg-gray-50 z-20"
        style={{ width: PROJECT_COLUMN_WIDTH }}
      >
        Projekt / Phase
      </div>

      {/* Tages-Header */}
      {monthDates.map((date) => {
        const today = isToday(date);
        const weekend = isWeekend(date);
        const dayOfWeek = getDayOfWeek(date);

        return (
          <div
            key={date.toISOString()}
            className={cn(
              'border-r border-gray-200 py-1 text-center last:border-r-0 flex-shrink-0',
              today && 'bg-amber-50',
              weekend && !today && 'bg-gray-100'
            )}
            style={{ width: DAY_COLUMN_WIDTH }}
          >
            <div
              className={cn(
                'font-medium text-[10px] leading-tight',
                today && 'text-amber-700',
                weekend && !today && 'text-gray-400'
              )}
            >
              {getWeekdayShort(dayOfWeek)}
            </div>
            <div
              className={cn(
                'text-[10px] leading-tight',
                today ? 'text-amber-600' : 'text-gray-500',
                weekend && !today && 'text-gray-400'
              )}
            >
              {date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ROW
// ═══════════════════════════════════════════════════════════════════════════

interface MonthProjectRowProps {
  project: ProjectRowData;
  monthDates: Date[];
  onToggleExpand: (projectId: string) => void;
}

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

function MonthProjectRow({ project, monthDates, onToggleExpand }: MonthProjectRowProps) {
  const { isExpanded, hasActivePhasesThisWeek } = project;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Projekt-Header */}
      <div
        className={cn(
          'flex items-center',
          'bg-gray-50 hover:bg-gray-100 transition-colors',
          hasActivePhasesThisWeek && 'bg-white hover:bg-gray-50'
        )}
        style={{ minWidth: PROJECT_COLUMN_WIDTH + monthDates.length * DAY_COLUMN_WIDTH }}
      >
        {/* Projekt-Info (linke Spalte, sticky) */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-r border-gray-200 flex-shrink-0 sticky left-0 bg-inherit z-10"
          style={{ width: PROJECT_COLUMN_WIDTH }}
        >
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

            {/* KPIs */}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {project.weeklyPlannedHours}h / {project.totalBudgetHours}h
              </span>
              {project.remainingHours > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {project.remainingHours}h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tageszellen (leer bei Projekt-Ebene) */}
        {monthDates.map((date) => {
          const weekend = isWeekend(date);
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'h-full min-h-[52px] border-r border-gray-200 last:border-r-0 flex-shrink-0',
                today && 'bg-amber-50/50',
                weekend && !today && 'bg-gray-50'
              )}
              style={{ width: DAY_COLUMN_WIDTH }}
            />
          );
        })}
      </div>

      {/* Phasen-Zeilen (wenn aufgeklappt) */}
      {isExpanded && project.phases.length > 0 && (
        <div className="bg-white">
          {project.phases.map((phase) => (
            <MonthPhaseRow
              key={phase.phase.id}
              phase={phase}
              monthDates={monthDates}
              projectId={project.project.id}
            />
          ))}
        </div>
      )}

      {/* Leere Nachricht wenn keine Phasen */}
      {isExpanded && project.phases.length === 0 && (
        <div className="px-6 py-3 text-sm text-gray-500 italic bg-gray-50">
          Keine Phasen vorhanden
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE ROW
// ═══════════════════════════════════════════════════════════════════════════

interface MonthPhaseRowProps {
  phase: PhaseRowData;
  monthDates: Date[];
  projectId: string;
}

function getBereichColor(bereich: string): string {
  switch (bereich) {
    case 'produktion':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'montage':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'externes_gewerk':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// Droppable Tageszelle für Monatsansicht
interface MonthDayCellProps {
  phaseId: string;
  projectId: string;
  date: Date;
  totalHours: number;
  bereichColor: string;
  allocationsInfo: string;
}

function MonthDayCell({ phaseId, projectId, date, totalHours, bereichColor, allocationsInfo }: MonthDayCellProps) {
  const weekend = isWeekend(date);
  const today = isToday(date);
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

  // Wochenenden sind nicht droppable
  if (weekend) {
    return (
      <div
        className={cn(
          'min-h-[36px] border-r border-gray-200 last:border-r-0 flex-shrink-0 flex items-center justify-center',
          today && 'bg-amber-50/50',
          'bg-gray-50'
        )}
        style={{ width: DAY_COLUMN_WIDTH }}
      >
        {totalHours > 0 && (
          <div
            className={cn('text-[9px] font-medium rounded px-1 py-0.5', bereichColor)}
            title={allocationsInfo}
          >
            {totalHours}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[36px] border-r border-gray-200 last:border-r-0 flex-shrink-0 flex items-center justify-center',
        today && 'bg-amber-50/50',
        isOver && 'bg-blue-100 ring-1 ring-inset ring-blue-400'
      )}
      style={{ width: DAY_COLUMN_WIDTH }}
    >
      {totalHours > 0 && (
        <div
          className={cn('text-[9px] font-medium rounded px-1 py-0.5', bereichColor)}
          title={allocationsInfo}
        >
          {totalHours}
        </div>
      )}
    </div>
  );
}

function MonthPhaseRow({ phase, monthDates, projectId }: MonthPhaseRowProps) {
  const bereichColor = getBereichColor(phase.phase.bereich);

  return (
    <div
      className="flex items-center border-t border-gray-100"
      style={{ minWidth: PROJECT_COLUMN_WIDTH + monthDates.length * DAY_COLUMN_WIDTH }}
    >
      {/* Phase-Info (linke Spalte, sticky) */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-200 flex-shrink-0 sticky left-0 bg-white z-10 pl-10"
        style={{ width: PROJECT_COLUMN_WIDTH }}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            bereichColor.replace('text-', 'bg-').replace('-700', '-500')
          )}
        />
        <span className="text-sm truncate">{phase.phase.name}</span>
      </div>

      {/* Tageszellen mit Allocations - jetzt Droppable! */}
      {monthDates.map((date) => {
        const dateKey = formatDateISO(date);
        const allocations = phase.dayAllocations[dateKey] ?? [];
        const totalHours = allocations.reduce((sum, a) => sum + (a.plannedHours ?? 0), 0);
        const allocationsInfo = `${totalHours}h - ${allocations.map(a => a.user?.fullName ?? 'Unbekannt').join(', ')}`;

        return (
          <MonthDayCell
            key={date.toISOString()}
            phaseId={phase.phase.id}
            projectId={projectId}
            date={date}
            totalHours={totalHours}
            bereichColor={bereichColor}
            allocationsInfo={allocationsInfo}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Monats-Grid der Planungsansicht.
 *
 * Zeigt alle Tage eines Monats horizontal scrollbar mit:
 * - Feste linke Spalte (280px) für Projekt/Phase-Namen
 * - Kompakte Tagesspalten (~32px) mit Stunden-Chips
 * - Wochenenden grau hinterlegt
 */
export function MonthGrid() {
  const {
    projectRows,
    periodDates,
    isLoading,
    error,
    toggleProjectExpanded,
  } = usePlanning();

  // Fehler-Anzeige
  if (error) {
    return (
      <div className="rounded-lg border bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Lade-Anzeige
  if (isLoading && projectRows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8">
        <span className="text-gray-500">Lade Daten...</span>
      </div>
    );
  }

  // Berechne die Gesamtbreite des Grids
  const totalGridWidth = PROJECT_COLUMN_WIDTH + periodDates.length * DAY_COLUMN_WIDTH;

  return (
    <div
      className="rounded-lg border bg-white overflow-x-auto relative"
      style={{
        // Grid nimmt volle verfügbare Breite, scrollt wenn nötig
        minWidth: '100%',
      }}
    >
      <div style={{ minWidth: totalGridWidth }}>
        <MonthGridHeader monthDates={periodDates} />

        <div className="divide-y divide-gray-200">
          {projectRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Keine Projekte mit Phasen in diesem Monat
            </div>
          ) : (
            projectRows.map((project) => (
              <MonthProjectRow
                key={project.project.id}
                project={project}
                monthDates={periodDates}
                onToggleExpand={toggleProjectExpanded}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
