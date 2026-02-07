import { Suspense } from 'react';

import {
  PlanningDndProvider,
  PlanningGrid,
  PlanningKeyboardHandler,
  UndoToolbar,
  ViewModeToggle,
  WeekNavigation,
} from '@/presentation/components/planning';
import { TooltipProvider } from '@/presentation/components/ui/tooltip';
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
            <PlanningDndProvider>
              {/* Vollständige Höhe: 100vh - Navigation (64px) - Main Padding (48px) */}
              <div className="flex flex-col h-[calc(100vh-112px)]">
                {/* Header - feste Höhe */}
                <div className="flex items-center justify-between shrink-0 pb-4">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Planung</h1>
                    <ViewModeToggle />
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
          </SelectionProvider>
        </UndoProvider>
      </PlanningProvider>
    </TooltipProvider>
  );
}
