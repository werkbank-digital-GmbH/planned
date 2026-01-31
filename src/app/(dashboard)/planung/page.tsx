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
 */
export default async function PlanungPage() {
  return (
    <TooltipProvider>
      <PlanningProvider>
        <UndoProvider>
          <SelectionProvider>
            <PlanningDndProvider>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Planung</h1>
                    <ViewModeToggle />
                  </div>
                  <div className="flex items-center gap-4">
                    <UndoToolbar />
                    <WeekNavigation />
                  </div>
                </div>

                {/* Main Content - Volle Breite (keine Sidebar mehr) */}
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-lg border">
                      <span className="text-gray-500">Lade Planung...</span>
                    </div>
                  }
                >
                  <PlanningGrid />
                </Suspense>
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
