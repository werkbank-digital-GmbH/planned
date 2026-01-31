import { Suspense } from 'react';

import { getProjectsListAction } from '@/presentation/actions/projects';
import { getUsersAction } from '@/presentation/actions/users';
import {
  PlanningDndProvider,
  PlanningGrid,
  PlanningKeyboardHandler,
  PlanningSidebar,
  UndoToolbar,
  WeekNavigation,
} from '@/presentation/components/planning';
import { TooltipProvider } from '@/presentation/components/ui/tooltip';
import { PlanningProvider } from '@/presentation/contexts/PlanningContext';
import { SelectionProvider } from '@/presentation/contexts/SelectionContext';
import { UndoProvider } from '@/presentation/contexts/UndoContext';

/**
 * Planungsseite
 *
 * Hauptseite für die Wochenplanung mit:
 * - Wochennavigation
 * - Grid mit Mitarbeitern und Zuweisungen
 * - Sidebar mit Filtern und Zusammenfassung
 * - Keyboard Shortcuts für Power-User
 */
export default async function PlanungPage() {
  // Lade initiale Daten parallel
  const [usersResult, projectsResult] = await Promise.all([
    getUsersAction(true), // Nur aktive User
    getProjectsListAction(),
  ]);

  const users = usersResult.success ? usersResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];

  return (
    <TooltipProvider>
      <PlanningProvider>
        <UndoProvider>
          <SelectionProvider>
            <PlanningDndProvider>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Planung</h1>
                  <div className="flex items-center gap-4">
                    <UndoToolbar />
                    <WeekNavigation />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex gap-6">
                  {/* Grid */}
                  <div className="relative min-w-0 flex-1">
                    <Suspense
                      fallback={
                        <div className="flex h-[400px] items-center justify-center rounded-lg border">
                          <span className="text-muted-foreground">Lade Planung...</span>
                        </div>
                      }
                    >
                      <PlanningGrid />
                    </Suspense>
                  </div>

                  {/* Sidebar */}
                  <PlanningSidebar
                    projects={projects}
                    users={users.map((u) => ({ id: u.id, fullName: u.fullName }))}
                  />
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
