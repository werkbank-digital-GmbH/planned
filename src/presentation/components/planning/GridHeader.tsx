'use client';

import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { getDayNameShort, isToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

/**
 * Header-Zeile des Planungs-Grids.
 *
 * Zeigt die Wochentage (Mo-Fr) mit Datum an.
 * Hebt den aktuellen Tag hervor.
 */
export function GridHeader() {
  const { days } = usePlanning();

  return (
    <div className="grid grid-cols-[200px_repeat(5,1fr)] border-b bg-muted/50">
      {/* Mitarbeiter-Spalte Header */}
      <div className="border-r p-3 font-medium">Mitarbeiter</div>

      {/* Tages-Header */}
      {days.map((day, index) => {
        const dayDate = new Date(day.date);
        const today = isToday(dayDate);

        return (
          <div
            key={day.date.toISOString()}
            className={cn(
              'border-r p-3 text-center last:border-r-0',
              today && 'bg-primary/10'
            )}
          >
            <div className={cn('font-medium', today && 'text-primary')}>
              {getDayNameShort(index)}
            </div>
            <div
              className={cn(
                'text-sm text-muted-foreground',
                today && 'text-primary'
              )}
            >
              {dayDate.getUTCDate()}.{dayDate.getUTCMonth() + 1}.
            </div>
          </div>
        );
      })}
    </div>
  );
}
