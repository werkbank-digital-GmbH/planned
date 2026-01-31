'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

import {
  formatDateDE,
  getCalendarWeek,
  getFriday,
  getMonday,
} from '@/lib/date-utils';

/**
 * Wochennavigation für die Planungsansicht.
 *
 * Zeigt die aktuelle Kalenderwoche und ermöglicht
 * Navigation zwischen Wochen.
 */
export function WeekNavigation() {
  const { weekStart, goToNextWeek, goToPreviousWeek, goToToday, isLoading } =
    usePlanning();

  const friday = getFriday(weekStart);
  const calendarWeek = getCalendarWeek(weekStart);
  const year = weekStart.getUTCFullYear();

  // Prüfe ob die aktuelle Woche angezeigt wird
  const isCurrentWeek =
    getMonday(new Date()).getTime() === weekStart.getTime();

  return (
    <div className="flex items-center gap-4">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousWeek}
          disabled={isLoading}
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          disabled={isLoading || isCurrentWeek}
          className="px-3"
        >
          Heute
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNextWeek}
          disabled={isLoading}
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Display */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">
          KW {calendarWeek} / {year}
        </span>
        <span className="text-muted-foreground">
          {formatDateDE(weekStart)} - {formatDateDE(friday)}
        </span>
      </div>
    </div>
  );
}
