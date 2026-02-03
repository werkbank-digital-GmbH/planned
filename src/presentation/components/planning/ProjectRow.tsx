'use client';

import { ChevronDown, ChevronRight, Clock, Target } from 'lucide-react';

import type { ProjectRowData } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';

import { cn } from '@/lib/utils';

import { PhaseRow } from './PhaseRow';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectRowProps {
  project: ProjectRowData;
  weekDates: Date[];
  onToggleExpand: (projectId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Projekt-Zeile im Planungs-Grid.
 *
 * Zeigt:
 * - Projektname mit Aufklapp-Chevron
 * - Status-Badge (AKTIV/GEPLANT/etc.)
 * - KPIs: Wochenstunden, Budget, Verbleibend
 * - Phasen-Zeilen wenn aufgeklappt
 */
export function ProjectRow({ project, weekDates, onToggleExpand }: ProjectRowProps) {
  const { isExpanded, hasActivePhasesThisWeek } = project;

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Projekt-Header */}
      <div
        className={cn(
          'grid grid-cols-[280px_repeat(5,1fr)] items-center gap-0',
          'bg-gray-50 hover:bg-gray-100 transition-colors',
          hasActivePhasesThisWeek && 'bg-white hover:bg-gray-50'
        )}
      >
        {/* Projekt-Info (linke Spalte) */}
        <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-200">
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

        {/* 5 Tageszellen (leer bei Projekt-Ebene) */}
        {weekDates.map((date) => (
          <div
            key={date.toISOString()}
            className="h-full min-h-[52px] border-r border-gray-200 last:border-r-0"
          />
        ))}
      </div>

      {/* Phasen-Zeilen (wenn aufgeklappt) */}
      {isExpanded && project.phases.length > 0 && (
        <div className="bg-white">
          {project.phases.map((phase) => (
            <PhaseRow
              key={phase.phase.id}
              phase={phase}
              weekDates={weekDates}
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
