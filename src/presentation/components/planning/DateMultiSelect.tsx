'use client';

import {
  getDayNameShort,
  getWeekDates,
  isSameDay,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DateMultiSelectProps {
  /** Montag der aktuellen Woche */
  weekStart: Date;
  /** Ausgewählte Daten */
  value: Date[];
  /** Callback wenn sich die Auswahl ändert */
  onChange: (dates: Date[]) => void;
  /** Fehlermeldung */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mehrfachauswahl für Wochentage.
 *
 * Zeigt Mo-Fr der aktuellen Woche als Buttons.
 * Ermöglicht das Auswählen mehrerer Tage gleichzeitig.
 */
export function DateMultiSelect({
  weekStart,
  value,
  onChange,
  error,
}: DateMultiSelectProps) {
  // 5 Werktage der aktuellen Woche
  const weekDays = getWeekDates(weekStart);

  const toggleDate = (date: Date) => {
    const isSelected = value.some((d) => isSameDay(d, date));

    if (isSelected) {
      onChange(value.filter((d) => !isSameDay(d, date)));
    } else {
      onChange([...value, date]);
    }
  };

  const selectAll = () => {
    onChange(weekDays);
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {weekDays.map((date, index) => {
          const isSelected = value.some((d) => isSameDay(d, date));

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => toggleDate(date)}
              className={cn(
                'flex-1 rounded-md border py-2 px-3 text-center transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div className="text-xs font-medium">{getDayNameShort(index)}</div>
              <div className="text-sm">
                {date.getUTCDate()}.{date.getUTCMonth() + 1}.
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          className="text-primary hover:underline"
        >
          Alle auswählen
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          onClick={selectNone}
          className="text-muted-foreground hover:underline"
        >
          Keine auswählen
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
