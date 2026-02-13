'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { getMonday } from '@/lib/date-utils';

/**
 * Perioden-Navigation für die Planungsansicht.
 *
 * Zeigt Vor/Zurück-Buttons und einen Heute-Button.
 * Die KW/Monats-Anzeige wird im GridHeader dargestellt.
 */
export function WeekNavigation() {
  const {
    viewMode,
    periodStart,
    goToNextPeriod,
    goToPreviousPeriod,
    goToToday,
    isLoading,
  } = usePlanning();

  // Prüfe ob die aktuelle Woche/Periode angezeigt wird
  const isCurrentPeriod =
    viewMode !== 'month'
      ? getMonday(new Date()).getTime() === periodStart.getTime()
      : periodStart.getMonth() === new Date().getMonth() &&
        periodStart.getFullYear() === new Date().getFullYear();

  const ariaLabelPrevious = viewMode === 'month' ? 'Vorheriger Monat' : 'Vorherige Woche';
  const ariaLabelNext = viewMode === 'month' ? 'Nächster Monat' : 'Nächste Woche';

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousPeriod}
        disabled={isLoading}
        aria-label={ariaLabelPrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={goToToday}
        disabled={isLoading || isCurrentPeriod}
        className="px-3"
      >
        Heute
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNextPeriod}
        disabled={isLoading}
        aria-label={ariaLabelNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
