'use client';

import { useDroppable } from '@dnd-kit/core';
import { Trash2, Truck, Users } from 'lucide-react';
import { useState } from 'react';

import type { PoolItem } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import type { ViewMode } from '@/presentation/contexts/PlanningContext';

import { formatDateISO, getDayNameShort, getCalendarWeek } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { PoolCard } from './PoolCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ResourcePoolProps {
  poolItems: PoolItem[];
  weekDates: Date[];
  viewMode: ViewMode;
  periodDates: Date[];
}

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
 * Gruppiert Dates nach Kalenderwochen
 */
function groupDatesByWeek(dates: Date[]): Map<string, Date[]> {
  const weeks = new Map<string, Date[]>();

  for (const date of dates) {
    const weekNum = getCalendarWeek(date);
    const year = date.getFullYear();
    const key = `${year}-KW${weekNum}`;

    if (!weeks.has(key)) {
      weeks.set(key, []);
    }
    weeks.get(key)!.push(date);
  }

  return weeks;
}

/**
 * Prüft ob ein Mitarbeiter/Ressource an einem bestimmten Tag verfügbar ist
 */
function isAvailableOnDate(item: PoolItem, dateIndex: number): boolean {
  const availability = item.availability[dateIndex];
  return availability?.status === 'available' || availability?.status === 'partial';
}

/**
 * Prüft ob ein Mitarbeiter/Ressource in einer Woche verfügbar ist (mind. 1 Tag)
 */
function isAvailableInWeek(item: PoolItem, weekDates: Date[], allDates: Date[]): boolean {
  for (const date of weekDates) {
    const dateIndex = allDates.findIndex(d => formatDateISO(d) === formatDateISO(date));
    if (dateIndex >= 0 && isAvailableOnDate(item, dateIndex)) {
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
export function ResourcePool({ poolItems, weekDates, viewMode, periodDates }: ResourcePoolProps) {
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

  // Wochenansicht: Nach Tagen gruppieren
  if (viewMode === 'week') {
    return (
      <Card
        ref={setNodeRef}
        className={cn(
          'bg-gray-50 transition-all',
          showDeleteHint && 'ring-2 ring-red-400 bg-red-50',
          isDraggingAllocation && !isOver && 'ring-1 ring-dashed ring-gray-300'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              {showDeleteHint ? (
                <Trash2 className="h-4 w-4 text-red-500" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {showDeleteHint ? 'Hier ablegen zum Entfernen' : 'Ressourcen-Pool'}
            </CardTitle>

            {/* Filter Tabs - jetzt links */}
            <div className="flex items-center gap-1 p-1 bg-white rounded-lg border">
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
                      'flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      activeTab === tab.value
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    <span
                      className={cn(
                        'ml-1',
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
        </CardHeader>

        <CardContent>
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {weekDates.map((date, dayIndex) => {
                // Filtere Ressourcen, die an diesem Tag verfügbar sind
                const availableOnDay = filteredItems.filter((item) =>
                  isAvailableOnDate(item, dayIndex)
                );

                return (
                  <div key={date.toISOString()} className="flex flex-col">
                    {/* Tag-Header */}
                    <div className="text-center pb-2 border-b mb-2">
                      <div className="font-medium text-sm">{getDayNameShort(dayIndex)}</div>
                      <div className="text-xs text-gray-500">
                        {date.getDate()}.{date.getMonth() + 1}.
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {availableOnDay.length} verfügbar
                      </Badge>
                    </div>

                    {/* Verfügbare Ressourcen für diesen Tag */}
                    <div className="flex flex-col gap-1.5 min-h-[100px]">
                      {availableOnDay.length > 0 ? (
                        availableOnDay.map((item) => (
                          <PoolCard
                            key={`${item.type}-${item.id}-${dayIndex}`}
                            item={item}
                            weekDates={[date]} // Nur dieser eine Tag (Wochenansicht = 1 Allocation)
                            compact
                            contextKey={`day-${dayIndex}`}
                          />
                        ))
                      ) : (
                        <div className="text-center text-xs text-gray-400 py-4">
                          Keine verfügbar
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

  // Monatsansicht: Nach Kalenderwochen gruppieren
  const weekGroups = groupDatesByWeek(periodDates);

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'bg-gray-50 transition-all',
        showDeleteHint && 'ring-2 ring-red-400 bg-red-50',
        isDraggingAllocation && !isOver && 'ring-1 ring-dashed ring-gray-300'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            {showDeleteHint ? (
              <Trash2 className="h-4 w-4 text-red-500" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            {showDeleteHint ? 'Hier ablegen zum Entfernen' : 'Ressourcen-Pool'}
          </CardTitle>

          {/* Filter Tabs - jetzt links */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border">
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
                    'flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    activeTab === tab.value
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    className={cn(
                      'ml-1',
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
      </CardHeader>

      <CardContent>
        {filteredItems.length > 0 ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${weekGroups.size}, minmax(180px, 1fr))`
            }}
          >
            {Array.from(weekGroups.entries()).map(([weekKey, dates]) => {
              const weekNum = weekKey.split('-KW')[1];

              // Filtere Ressourcen, die in dieser Woche verfügbar sind
              const availableInWeek = filteredItems.filter((item) =>
                isAvailableInWeek(item, dates, periodDates)
              );

              // Berechne Datumsbereich für die Woche
              const firstDate = dates[0];
              const lastDate = dates[dates.length - 1];
              const dateRange = `${firstDate.getDate()}.${firstDate.getMonth() + 1}. - ${lastDate.getDate()}.${lastDate.getMonth() + 1}.`;

              return (
                <div key={weekKey} className="flex flex-col">
                  {/* Wochen-Header */}
                  <div className="text-center pb-2 border-b mb-2">
                    <div className="font-medium text-sm">KW {weekNum}</div>
                    <div className="text-xs text-gray-500">{dateRange}</div>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {availableInWeek.length} verfügbar
                    </Badge>
                  </div>

                  {/* Verfügbare Ressourcen für diese Woche */}
                  <div className="flex flex-col gap-1.5 min-h-[100px]">
                    {availableInWeek.length > 0 ? (
                      availableInWeek.map((item) => (
                        <PoolCard
                          key={`${item.type}-${item.id}-${weekKey}`}
                          item={item}
                          weekDates={dates}
                          compact
                          contextKey={weekKey}
                        />
                      ))
                    ) : (
                      <div className="text-center text-xs text-gray-400 py-4">
                        Keine verfügbar
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
