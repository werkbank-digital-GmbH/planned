'use client';

import { useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/avatar';
import type { UserRowData } from '@/presentation/contexts/PlanningContext';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useSelection } from '@/presentation/contexts/SelectionContext';

import { formatDateISO, isToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { DraggableAllocationCard } from './DraggableAllocationCard';
import { DroppableCell } from './DroppableCell';
import { EmptyCell } from './EmptyCell';
import { SelectableCell } from './SelectableCell';

interface UserRowProps {
  user: UserRowData;
}

/**
 * Zeile für einen Mitarbeiter im Planungs-Grid.
 *
 * Zeigt den Mitarbeiter links und seine Zuweisungen
 * für jeden Tag der Woche.
 * Unterstützt:
 * - Drag & Drop für Allocations
 * - Range Selection für Mehrfachauswahl
 */
export function UserRow({ user }: UserRowProps) {
  const { days } = usePlanning();
  const { setHoveredCell } = useSelection();

  // Gruppiere Allocations nach Datum
  const allocationsByDate = new Map<string, typeof user.allocations>();
  for (const alloc of user.allocations) {
    const dateKey = formatDateISO(alloc.date);
    const existing = allocationsByDate.get(dateKey) ?? [];
    existing.push(alloc);
    allocationsByDate.set(dateKey, existing);
  }

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
    <div className="grid grid-cols-[200px_repeat(5,1fr)]">
      {/* User Info */}
      <div className="flex items-start gap-3 border-r p-3">
        <Avatar className="h-8 w-8">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{user.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {user.weeklyHours}h / Woche
          </div>
        </div>
      </div>

      {/* Day Cells */}
      {days.map((day) => {
        const dateKey = formatDateISO(day.date);
        const dayAllocations = allocationsByDate.get(dateKey) ?? [];
        const today = isToday(day.date);

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
                'min-h-[100px]',
                today && 'bg-primary/5'
              )}
            >
              <div
                onMouseEnter={() => handleCellMouseEnter(day.date)}
                onMouseLeave={handleCellMouseLeave}
                className="h-full"
              >
                {dayAllocations.length === 0 ? (
                  <EmptyCell userId={user.id} date={day.date} />
                ) : (
                  <div className="space-y-2">
                    {dayAllocations.map((alloc) => (
                      <DraggableAllocationCard
                        key={alloc.id}
                        allocation={alloc}
                      />
                    ))}
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
