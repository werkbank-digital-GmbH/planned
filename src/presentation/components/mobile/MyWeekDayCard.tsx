'use client';

import { format, isToday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';

import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface MyAllocationDTO {
  id: string;
  projectName: string;
  projectNumber?: string;
  phaseName: string;
  plannedHours: number;
  notes?: string;
  bereich: 'produktion' | 'montage';
}

interface MyWeekDayDTO {
  date: string;
  dayName: string;
  allocations: MyAllocationDTO[];
  absence?: {
    type: string;
    note?: string;
  };
}

interface MyWeekDayCardProps {
  day: MyWeekDayDTO;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ABSENCE_LABELS: Record<string, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  holiday: 'Feiertag',
  training: 'Schulung',
  other: 'Abwesend',
};

const BEREICH_COLORS: Record<string, string> = {
  produktion: 'border-l-blue-500',
  montage: 'border-l-green-500',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tageskarte für Meine Woche
 *
 * Features:
 * - Zeigt Allocations oder Abwesenheit
 * - Farbcodierung nach Bereich (Produktion/Montage)
 * - Heutiger Tag hervorgehoben
 * - Empty State bei keinen Einsätzen
 */
export function MyWeekDayCard({ day }: MyWeekDayCardProps) {
  const { date, dayName, allocations, absence } = day;
  const dateObj = parseISO(date);
  const isCurrentDay = isToday(dateObj);
  const formattedDate = format(dateObj, 'dd.MM.', { locale: de });

  // Abwesenheits-Tag
  if (absence) {
    return (
      <div
        className={cn(
          'rounded-lg bg-gray-100 p-4',
          isCurrentDay && 'ring-2 ring-accent'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">
              {dayName}, {formattedDate}
            </div>
            <div className="text-sm text-gray-500">
              {ABSENCE_LABELS[absence.type] ?? 'Abwesend'}
            </div>
          </div>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    );
  }

  // Keine Allocations
  if (allocations.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-white p-4',
          isCurrentDay && 'ring-2 ring-accent'
        )}
      >
        <div className="font-medium">
          {dayName}, {formattedDate}
        </div>
        <div className="mt-2 text-sm text-gray-400">Keine Einsätze geplant</div>
      </div>
    );
  }

  // Allocations anzeigen
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-white',
        isCurrentDay && 'ring-2 ring-accent'
      )}
    >
      {/* Tag Header */}
      <div className="border-b bg-gray-50 px-4 py-2">
        <div className="font-medium">
          {dayName}, {formattedDate}
        </div>
      </div>

      {/* Allocations */}
      <div className="divide-y">
        {allocations.map((alloc) => (
          <div
            key={alloc.id}
            className={cn(
              'border-l-4 px-4 py-3',
              BEREICH_COLORS[alloc.bereich] ?? 'border-l-gray-300'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{alloc.projectName}</div>
                <div className="text-xs text-gray-500">{alloc.phaseName}</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5" />
                {formatHoursWithUnit(alloc.plannedHours)}
              </div>
            </div>

            {alloc.notes && (
              <div className="mt-1 text-xs italic text-gray-500">
                {alloc.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
