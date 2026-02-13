'use client';

import { GripHorizontal, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useResizable } from '@/presentation/hooks/useResizable';

import { getDayNameShort, isToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { MonthGrid } from './MonthGrid';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectRow } from './ProjectRow';
import { ResourcePool } from './ResourcePool';
import { UserRow } from './UserRow';

/** Sichtbare Scrollbar-Styles für macOS (Auto-Hide-Scrollbar Override) */
const SCROLLBAR_CLASSES =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full';

// ═══════════════════════════════════════════════════════════════════════════
// GRID HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GridHeaderProps {
  weekDates: Date[];
  headerLabel?: string;
}

function GridHeader({ weekDates, headerLabel = 'Projekt / Phase' }: GridHeaderProps) {
  return (
    <div className="grid grid-cols-[280px_repeat(5,1fr)] border-b bg-gray-50">
      {/* Erste Spalte Header */}
      <div className="border-r border-gray-200 p-3 font-medium text-sm">
        {headerLabel}
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

// ═══════════════════════════════════════════════════════════════════════════
// RESIZABLE RESOURCE POOL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface ResizablePoolWrapperProps {
  children: React.ReactNode;
}

function ResizablePoolWrapper({ children }: ResizablePoolWrapperProps) {
  const { height, isDragging, handleMouseDown, handleTouchStart } = useResizable({
    defaultHeight: 180,
    minHeight: 80,
    maxHeight: 400,
    storageKey: 'planning-resource-pool-height',
  });

  return (
    <div
      className="shrink-0 bg-gray-50 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col"
      style={{ height }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          'h-3 cursor-ns-resize flex items-center justify-center shrink-0',
          'hover:bg-gray-200/50 transition-colors rounded-t',
          isDragging && 'bg-blue-100'
        )}
      >
        <GripHorizontal className="h-4 w-4 text-gray-400" />
      </div>

      {/* Pool Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
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
 * - Ressourcen-Pool am unteren Rand für Drag & Drop (resizable)
 */
export function PlanningGrid() {
  const {
    projectRows,
    poolItems,
    isLoading,
    error,
    viewMode,
    periodDates,
    getWeekDates,
    toggleProjectExpanded,
    allUserRows,
    highlightPhaseId,
    monthWeeks,
    monthPoolItems,
  } = usePlanning();

  const weekDates = useMemo(() => getWeekDates(), [getWeekDates]);

  // State für Projekt-Detail-Modal
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const isModalOpen = selectedProjectId !== null;

  // Monatsansicht - separate Komponente
  if (viewMode === 'month') {
    return (
      <div className="flex flex-col h-full">
        {/* Scrollable Grid Area */}
        <div className={cn('flex-1 overflow-auto min-h-0', SCROLLBAR_CLASSES)}>
          <MonthGrid />
        </div>

        {/* Resizable Ressourcen-Pool */}
        <ResizablePoolWrapper>
          <ResourcePool
            poolItems={monthPoolItems}
            weekDates={weekDates}
            viewMode={viewMode}
            periodDates={periodDates}
            monthWeeks={monthWeeks}
          />
        </ResizablePoolWrapper>
      </div>
    );
  }

  // Team-Ansicht (Mitarbeiter-zentriert)
  if (viewMode === 'team') {
    return (
      <div className="flex flex-col h-full">
        {/* Scrollable Grid Area */}
        <div className={cn('flex-1 overflow-auto min-h-0', SCROLLBAR_CLASSES)}>
          <div className="rounded-lg border bg-white relative">
            <GridHeader weekDates={weekDates} headerLabel="Mitarbeiter" />

            {allUserRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Keine Mitarbeiter in dieser Woche
              </div>
            ) : (
              <div className="flex flex-col">
                {allUserRows.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && allUserRows.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Resizable Ressourcen-Pool */}
        <ResizablePoolWrapper>
          <ResourcePool poolItems={poolItems} weekDates={weekDates} viewMode={viewMode} periodDates={periodDates} />
        </ResizablePoolWrapper>
      </div>
    );
  }

  // Fehler-Anzeige
  if (error) {
    return (
      <div className="flex items-center justify-center h-full rounded-lg border bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Lade-Anzeige
  if (isLoading && projectRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full rounded-lg border p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Lade Daten...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Grid Area */}
      <div className={cn('flex-1 overflow-auto min-h-0', SCROLLBAR_CLASSES)}>
        <div className="rounded-lg border bg-white relative">
          <GridHeader weekDates={weekDates} />

          <div className="flex flex-col gap-2 p-2">
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
                  onShowDetails={setSelectedProjectId}
                  highlightPhaseId={highlightPhaseId}
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
      </div>

      {/* Resizable Ressourcen-Pool */}
      <ResizablePoolWrapper>
        <ResourcePool poolItems={poolItems} weekDates={weekDates} viewMode={viewMode} periodDates={periodDates} />
      </ResizablePoolWrapper>

      {/* Projekt-Detail-Modal */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        isOpen={isModalOpen}
        onClose={() => setSelectedProjectId(null)}
      />
    </div>
  );
}
