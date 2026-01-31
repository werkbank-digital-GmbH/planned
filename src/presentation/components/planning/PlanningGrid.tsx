'use client';

import { Loader2 } from 'lucide-react';

import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { getDayNameShort, isToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { MonthGrid } from './MonthGrid';
import { ProjectRow } from './ProjectRow';
import { ResourcePool } from './ResourcePool';

// ═══════════════════════════════════════════════════════════════════════════
// GRID HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GridHeaderProps {
  weekDates: Date[];
}

function GridHeader({ weekDates }: GridHeaderProps) {
  return (
    <div className="grid grid-cols-[280px_repeat(5,1fr)] border-b bg-gray-50">
      {/* Projekt/Phase-Spalte Header */}
      <div className="border-r border-gray-200 p-3 font-medium text-sm">
        Projekt / Phase
      </div>

      {/* Tages-Header */}
      {weekDates.map((date, index) => {
        const today = isToday(date);

        return (
          <div
            key={date.toISOString()}
            className={cn(
              'border-r border-gray-200 p-3 text-center last:border-r-0',
              today && 'bg-amber-50'
            )}
          >
            <div className={cn('font-medium text-sm', today && 'text-amber-700')}>
              {getDayNameShort(index)}
            </div>
            <div
              className={cn(
                'text-xs text-gray-500',
                today && 'text-amber-600'
              )}
            >
              {date.getDate()}.{date.getMonth() + 1}.
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Haupt-Grid der Planungsansicht (Projekt-zentriert).
 *
 * Zeigt:
 * - Header mit Wochentagen
 * - Projekte als aufklappbare Zeilen
 * - Phasen als Unterzeilen mit zugewiesenen Mitarbeitern
 * - Ressourcen-Pool am unteren Rand für Drag & Drop
 */
export function PlanningGrid() {
  const {
    projectRows,
    poolItems,
    isLoading,
    error,
    viewMode,
    getWeekDates,
    toggleProjectExpanded,
  } = usePlanning();

  const weekDates = getWeekDates();

  // Monatsansicht - separate Komponente
  if (viewMode === 'month') {
    return (
      <div className="space-y-4">
        <MonthGrid />

        {/* Ressourcen-Pool - Sticky am unteren Bildschirmrand */}
        <div className="sticky bottom-0 z-10 bg-gray-50 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pt-4 -mx-6 px-6 -mb-6 pb-6">
          <ResourcePool poolItems={poolItems} weekDates={weekDates} />
        </div>
      </div>
    );
  }

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
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Lade Daten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planungs-Grid */}
      <div className="rounded-lg border bg-white relative">
        <GridHeader weekDates={weekDates} />

        <div className="divide-y divide-gray-200">
          {projectRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Keine Projekte mit Phasen in dieser Woche
            </div>
          ) : (
            projectRows.map((project) => (
              <ProjectRow
                key={project.project.id}
                project={project}
                weekDates={weekDates}
                onToggleExpand={toggleProjectExpanded}
              />
            ))
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && projectRows.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      {/* Ressourcen-Pool - Sticky am unteren Bildschirmrand */}
      <div className="sticky bottom-0 z-10 bg-gray-50 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pt-4 -mx-6 px-6 -mb-6 pb-6">
        <ResourcePool poolItems={poolItems} weekDates={weekDates} />
      </div>
    </div>
  );
}
