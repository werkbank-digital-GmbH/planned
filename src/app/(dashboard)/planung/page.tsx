import { Suspense } from 'react';

import {
  EmptyFilterToggles,
  PlanningDndProvider,
  PlanningGrid,
  PlanningKeyboardHandler,
  UndoToolbar,
  ViewModeToggle,
  WeekNavigation,
} from '@/presentation/components/planning';
import { TooltipProvider } from '@/presentation/components/ui/tooltip';
import { EmptyFilterProvider } from '@/presentation/contexts/EmptyFilterContext';
import { PlanningProvider } from '@/presentation/contexts/PlanningContext';
import { SelectionProvider } from '@/presentation/contexts/SelectionContext';
import { UndoProvider } from '@/presentation/contexts/UndoContext';

/**
 * Planungsseite (Projekt-zentriert)
 *
 * Hauptseite für die Wochenplanung mit:
 * - Wochennavigation
 * - Grid mit Projekten/Phasen und Mitarbeiter-Zuweisungen
 * - Ressourcen-Pool für Drag & Drop
 * - Keyboard Shortcuts für Power-User
 *
 * Unterstützt URL-Params für Pre-Selection aus QuickAssignDialog:
 * - phaseId: Phase hervorheben und Projekt aufklappen
 * - userId: User-Filter setzen
 * - date: Zur entsprechenden Woche navigieren
 */
interface PlanungPageProps {
  searchParams: Promise<{
    phaseId?: string;
    userId?: string;
    date?: string;
  }>;
}

export default async function PlanungPage({ searchParams }: PlanungPageProps) {
  const params = await searchParams;

  return (
    <TooltipProvider>
      <PlanningProvider
        initialDate={params.date}
        highlightPhaseId={params.phaseId}
        initialUserId={params.userId}
      >
        <UndoProvider>
          <SelectionProvider>
            <EmptyFilterProvider>
            <PlanningDndProvider>
              {/* Vollständige Höhe: 100vh - Main Padding (32px) */}
              <div className="flex flex-col h-[calc(100vh-32px)]">
                {/* Header - feste Höhe */}
                <div className="flex items-center justify-between shrink-0 pb-4">
                  <div className="flex items-center gap-4">
                    <ViewModeToggle />
                    <EmptyFilterToggles />
                  </div>
                  <div className="flex items-center gap-4">
                    <UndoToolbar />
                    <WeekNavigation />
                  </div>
                </div>

                {/* Scrollable Planning Area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center rounded-lg border">
                        <span className="text-gray-500">Lade Planung...</span>
                      </div>
                    }
                  >
                    <PlanningGrid />
                  </Suspense>
                </div>
              </div>

              {/* Keyboard Shortcuts Handler */}
              <PlanningKeyboardHandler />
            </PlanningDndProvider>
            </EmptyFilterProvider>
          </SelectionProvider>
        </UndoProvider>
      </PlanningProvider>
    </TooltipProvider>
  );
}
