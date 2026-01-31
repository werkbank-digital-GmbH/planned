'use client';

import { Loader2 } from 'lucide-react';

import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { GridHeader } from './GridHeader';
import { UserRow } from './UserRow';

/**
 * Haupt-Grid der Planungsansicht.
 *
 * Zeigt alle Mitarbeiter mit ihren Zuweisungen
 * in einer Wochenübersicht.
 */
export function PlanningGrid() {
  const { userRows, isLoading, error, days } = usePlanning();

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading && userRows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Lade Daten...</span>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background">
      <GridHeader />

      <div className="divide-y">
        {userRows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Keine Zuweisungen für diese Woche
          </div>
        ) : (
          userRows.map((user) => <UserRow key={user.id} user={user} />)
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && userRows.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
