'use client';

import { useDroppable } from '@dnd-kit/core';
import { Trash2, Truck, Users } from 'lucide-react';
import { useState } from 'react';

import type { PoolItem } from '@/application/queries';

import { Card, CardContent } from '@/presentation/components/ui/card';
import type { ViewMode } from '@/presentation/contexts/PlanningContext';

import { formatDateISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { PoolCard } from './PoolCard';
import type { MonthWeek } from './utils/month-week-utils';
import { getAbsenceDaysLabel } from './utils/month-week-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ResourcePoolProps {
  poolItems: PoolItem[];
  weekDates: Date[];
  viewMode: ViewMode;
  periodDates: Date[];
  /** Nur für Monatsansicht: die Wochen des Monats */
  monthWeeks?: MonthWeek[];
}

const PROJECT_COLUMN_WIDTH = 280; // px — gleich wie MonthGrid

type FilterTab = 'all' | 'users' | 'resources';

const FILTER_TABS: { value: FilterTab; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Alle', icon: null },
  { value: 'users', label: 'Mitarbeiter', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'resources', label: 'Fuhrpark', icon: <Truck className="h-3.5 w-3.5" /> },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Mitarbeiter/Ressource an einem bestimmten Tag verfügbar ist
 */
function isAvailableOnDate(item: PoolItem, dateIndex: number): boolean {
  const availability = item.availability[dateIndex];
  return availability?.status === 'available' || availability?.status === 'partial';
}

/**
 * Prüft ob ein PoolItem in einer bestimmten MonthWeek verfügbar ist.
 * Nutzt die allDates des Pool-Items (aller Wochen) um den Index zu finden.
 */
function isAvailableInMonthWeek(
  item: PoolItem,
  weekDates: Date[],
  allDates: Date[]
): boolean {
  for (const date of weekDates) {
    const dateISO = formatDateISO(date);
    const globalIndex = allDates.findIndex((d) => formatDateISO(d) === dateISO);
    if (globalIndex >= 0 && isAvailableOnDate(item, globalIndex)) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ressourcen-Pool am unteren Bildschirmrand.
 *
 * Zeigt alle Mitarbeiter und Ressourcen mit deren Verfügbarkeit.
 * Items können per Drag & Drop auf Phasen-Zellen gezogen werden.
 * Allocations können hierher gezogen werden um sie zu löschen.
 *
 * Features:
 * - Filter-Tabs: Alle / Mitarbeiter / Fuhrpark (links neben Titel)
 * - Wochenansicht: Gruppierung nach Tagen (Mo-Fr)
 * - Monatsansicht: Gruppierung nach Kalenderwochen
 * - Verfügbarkeits-Indikatoren pro Tag/Woche
 * - Drop-Zone zum Löschen von Allocations
 */
export function ResourcePool({ poolItems, weekDates, viewMode, periodDates: _periodDates, monthWeeks }: ResourcePoolProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Drop-Zone für Allocation-Löschung
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'pool-delete-zone',
    data: { type: 'pool' },
  });

  // Zeige roten Rand wenn eine Allocation oder Allocation-Span darüber schwebt
  const dragType = active?.data?.current?.type;
  const isDraggingAllocation = dragType === 'allocation' || dragType === 'allocation-span';
  const showDeleteHint = isOver && isDraggingAllocation;

  // Filter anwenden
  const filteredItems = poolItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'users') return item.type === 'user';
    if (activeTab === 'resources') return item.type === 'resource';
    return true;
  });

  // Zähler
  const userCount = poolItems.filter((p) => p.type === 'user').length;
  const resourceCount = poolItems.filter((p) => p.type === 'resource').length;

  // Wochen- und Teamansicht: Nach Tagen gruppieren (aligned mit PlanningGrid)
  if (viewMode === 'week' || viewMode === 'team') {
    return (
      <Card
        ref={setNodeRef}
        className={cn(
          'bg-gray-50 transition-all h-full flex flex-col',
          showDeleteHint && 'ring-2 ring-red-400 bg-red-50',
          isDraggingAllocation && !isOver && 'ring-1 ring-dashed ring-gray-300'
        )}
      >
        <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-[280px_repeat(5,1fr)] h-full">
              {/* Erste Spalte: Label + Filter */}
              <div className="border-r border-gray-200 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {showDeleteHint ? (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  ) : (
                    <Users className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {showDeleteHint ? 'Hier ablegen zum Entfernen' : 'Verfügbar'}
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1">
                  {FILTER_TABS.map((tab) => {
                    const count =
                      tab.value === 'all'
                        ? poolItems.length
                        : tab.value === 'users'
                          ? userCount
                          : resourceCount;

                    return (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                          activeTab === tab.value
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span
                          className={cn(
                            activeTab === tab.value ? 'text-gray-500' : 'text-gray-400'
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tages-Spalten: Aligned mit PlanningGrid */}
              {weekDates.map((date, dayIndex) => {
                const availableOnDay = filteredItems.filter((item) =>
                  isAvailableOnDate(item, dayIndex)
                );

                return (
                  <div
                    key={date.toISOString()}
                    className="border-r border-gray-200 last:border-r-0 p-2 overflow-y-auto"
                  >
                    <div className="flex flex-col gap-1">
                      {availableOnDay.length > 0 ? (
                        availableOnDay.map((item) => (
                          <PoolCard
                            key={`${item.type}-${item.id}-${dayIndex}`}
                            item={item}
                            weekDates={[date]}
                            compact
                            contextKey={`day-${dayIndex}`}
                          />
                        ))
                      ) : (
                        <div className="text-center text-xs text-gray-400 py-4">
                          –
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Keine Ressourcen in dieser Kategorie
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Monatsansicht: Aligned Grid (280px + repeat(weekCount, 1fr))
  const weeks = monthWeeks ?? [];

  // Alle Tage über alle Wochen für globale Index-Berechnung
  const allMonthDates = weeks.flatMap((w) => w.weekDates);

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'bg-gray-50 transition-all h-full flex flex-col',
        showDeleteHint && 'ring-2 ring-red-400 bg-red-50',
        isDraggingAllocation && !isOver && 'ring-1 ring-dashed ring-gray-300'
      )}
    >
      <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
        {filteredItems.length > 0 && weeks.length > 0 ? (
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px repeat(${weeks.length}, 1fr)`,
            }}
          >
            {/* Erste Spalte: Label + Filter */}
            <div className="border-r border-gray-200 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {showDeleteHint ? (
                  <Trash2 className="h-4 w-4 text-red-500" />
                ) : (
                  <Users className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {showDeleteHint ? 'Hier ablegen zum Entfernen' : 'Verfügbar'}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {FILTER_TABS.map((tab) => {
                  const count =
                    tab.value === 'all'
                      ? poolItems.length
                      : tab.value === 'users'
                        ? userCount
                        : resourceCount;

                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                        activeTab === tab.value
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span
                        className={cn(
                          activeTab === tab.value ? 'text-gray-500' : 'text-gray-400'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wochenspalten: Aligned mit MonthGrid */}
            {weeks.map((week) => {
              const availableInWeek = filteredItems.filter((item) =>
                isAvailableInMonthWeek(item, week.weekDates, allMonthDates)
              );

              return (
                <div
                  key={week.weekKey}
                  className="border-r-2 border-gray-300 last:border-r-0 p-2 overflow-y-auto"
                >
                  <div className="flex flex-col gap-1">
                    {availableInWeek.length > 0 ? (
                      availableInWeek.map((item) => {
                        const absenceLabel = getAbsenceDaysLabel(
                          item,
                          week.weekDates,
                          allMonthDates
                        );

                        return (
                          <div key={`${item.type}-${item.id}-${week.weekKey}`} className="relative">
                            <PoolCard
                              item={item}
                              weekDates={week.weekDates}
                              compact
                              contextKey={week.weekKey}
                            />
                            {absenceLabel && (
                              <span className="absolute -top-1 -right-1 bg-red-100 text-red-700 text-[9px] font-medium px-1 rounded">
                                {absenceLabel}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-xs text-gray-400 py-4">
                        –
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Keine Ressourcen in dieser Kategorie
          </div>
        )}
      </CardContent>
    </Card>
  );
}
