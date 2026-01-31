'use client';

import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useSwipeable } from 'react-swipeable';

import { MyWeekDayCard } from './MyWeekDayCard';

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

interface MyWeekDataDTO {
  weekStart: string;
  weekEnd: string;
  calendarWeek: number;
  days: MyWeekDayDTO[];
  totalPlannedHours: number;
}

interface MyWeekViewProps {
  data: MyWeekDataDTO;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Haupt-View für Meine Woche
 *
 * Features:
 * - Wochen-Navigation mit Buttons und Swipe
 * - Pull-to-Refresh Indikator
 * - Kalenderwochen-Anzeige
 * - Gesamt-Stunden der Woche
 */
export function MyWeekView({ data }: MyWeekViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const weekStart = parseISO(data.weekStart);
  const weekEnd = parseISO(data.weekEnd);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    const weekParam = newWeek.toISOString().split('T')[0];

    startTransition(() => {
      router.push(`/meine-woche?week=${weekParam}`);
    });
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateWeek('next'),
    onSwipedRight: () => navigateWeek('prev'),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
    });
    // Refresh-Indikator nach kurzer Zeit ausblenden
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const isLoading = isPending || isRefreshing;

  return (
    <div {...swipeHandlers} className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Vorherige Woche"
            disabled={isLoading}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="font-semibold">KW {data.calendarWeek}</div>
            <div className="text-sm text-gray-500">
              {format(weekStart, 'dd.MM.', { locale: de })} -{' '}
              {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
            </div>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Nächste Woche"
            disabled={isLoading}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Gesamt-Stunden */}
        <div className="mt-2 text-center text-sm text-gray-500">
          {data.totalPlannedHours}h geplant diese Woche
        </div>
      </header>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}

      {/* Pull-to-Refresh Area (touch handler) */}
      <div
        className="flex-1 space-y-3 overflow-auto p-4"
        onTouchStart={(e) => {
          const element = e.currentTarget;
          if (element.scrollTop === 0) {
            const startY = e.touches[0].clientY;

            const handleTouchMove = (moveEvent: TouchEvent) => {
              const currentY = moveEvent.touches[0].clientY;
              if (currentY - startY > 80 && !isRefreshing) {
                handleRefresh();
              }
            };

            const handleTouchEnd = () => {
              element.removeEventListener('touchmove', handleTouchMove as EventListener);
              element.removeEventListener('touchend', handleTouchEnd);
            };

            element.addEventListener('touchmove', handleTouchMove as EventListener);
            element.addEventListener('touchend', handleTouchEnd);
          }
        }}
      >
        {data.days.map((day) => (
          <MyWeekDayCard key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
