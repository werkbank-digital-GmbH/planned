'use client';

import { useCallback, useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/avatar';
import type { UserRowData } from '@/presentation/contexts/PlanningContext';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useSelection } from '@/presentation/contexts/SelectionContext';

import { formatDateISO, isToday } from '@/lib/date-utils';
import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

import { DraggableAllocationCard } from './DraggableAllocationCard';
import { DroppableCell } from './DroppableCell';
import { EmptyCell } from './EmptyCell';
import { SelectableCell } from './SelectableCell';

interface UserRowProps {
  user: UserRowData;
}

/**
 * Zeile für einen Mitarbeiter im Planungs-Grid (Team View).
 *
 * Zeigt den Mitarbeiter links und seine Zuweisungen
 * für jeden Tag der Woche mit Kapazitätsanzeige.
 * Unterstützt:
 * - Drag & Drop für Allocations
 * - Range Selection für Mehrfachauswahl
 * - Überallokations-Warnung (Tages- und Wochenebene)
 */
export function UserRow({ user }: UserRowProps) {
  const { days } = usePlanning();
  const { setHoveredCell } = useSelection();

  // Gruppiere Allocations nach Datum
  const allocationsByDate = useMemo(() => {
    const map = new Map<string, typeof user.allocations>();
    for (const alloc of user.allocations) {
      const dateKey = formatDateISO(alloc.date);
      const existing = map.get(dateKey) ?? [];
      existing.push(alloc);
      map.set(dateKey, existing);
    }
    return map;
  }, [user.allocations]);

  // Kapazitätsberechnung
  const dailyCapacity = user.weeklyHours / 5;
  const totalAllocatedHours = user.allocations.reduce(
    (sum, a) => sum + (a.plannedHours ?? 0),
    0
  );
  const isWeeklyOverAllocated = totalAllocatedHours > user.weeklyHours;

  // Initialen für Avatar
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Hover-Handler für Paste-Ziel
  const handleCellMouseEnter = useCallback(
    (date: Date) => {
      setHoveredCell({ userId: user.id, date });
    },
    [setHoveredCell, user.id]
  );

  const handleCellMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, [setHoveredCell]);

  return (
    <div
      className={cn(
        'grid grid-cols-[280px_repeat(5,1fr)] border-b border-gray-100',
        isWeeklyOverAllocated && 'bg-red-50/30'
      )}
    >
      {/* User Info */}
      <div className="flex items-start gap-3 border-r border-gray-200 p-3">
        <Avatar className="h-8 w-8 shrink-0">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{user.fullName}</div>
          <div
            className={cn(
              'text-xs',
              isWeeklyOverAllocated ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}
          >
            {formatHoursWithUnit(totalAllocatedHours)} / {formatHoursWithUnit(user.weeklyHours)}
          </div>
        </div>
      </div>

      {/* Day Cells */}
      {days.map((day) => {
        const dateKey = formatDateISO(day.date);
        const dayAllocations = allocationsByDate.get(dateKey) ?? [];
        const today = isToday(day.date);

        const dailyHours = dayAllocations.reduce(
          (sum, a) => sum + (a.plannedHours ?? 0),
          0
        );
        const isDailyOverAllocated = dailyHours > dailyCapacity;

        return (
          <SelectableCell
            key={day.date.toISOString()}
            userId={user.id}
            date={day.date}
          >
            <DroppableCell
              userId={user.id}
              date={day.date}
              className={cn(
                'min-h-[80px]',
                today && 'bg-amber-50/50'
              )}
            >
              <div
                onMouseEnter={() => handleCellMouseEnter(day.date)}
                onMouseLeave={handleCellMouseLeave}
                className="h-full flex flex-col"
              >
                <div className="flex-1">
                  {dayAllocations.length === 0 ? (
                    <EmptyCell userId={user.id} date={day.date} />
                  ) : (
                    <div className="space-y-1">
                      {dayAllocations.map((alloc) => (
                        <DraggableAllocationCard
                          key={alloc.id}
                          allocation={alloc}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Tages-Kapazitätsanzeige */}
                {dailyHours > 0 && (
                  <div
                    className={cn(
                      'text-[10px] text-center mt-1 font-medium border-t border-gray-100 pt-0.5',
                      isDailyOverAllocated ? 'text-red-600' : 'text-gray-400'
                    )}
                  >
                    {dailyHours}h / {dailyCapacity}h
                  </div>
                )}
              </div>
            </DroppableCell>
          </SelectableCell>
        );
      })}
    </div>
  );
}
