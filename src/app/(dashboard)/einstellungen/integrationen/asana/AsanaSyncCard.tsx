'use client';

import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { syncAsanaTaskPhases, type TaskSyncResultDTO } from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';

/**
 * Ermoglicht das Synchronisieren von Projekten und Phasen aus Asana.
 * Nutzt die Task-basierte Sync-Logik (Tasks werden zu Phasen).
 */
export function AsanaSyncCard() {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<TaskSyncResultDTO | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncAsanaTaskPhases();

      if (result.success) {
        setLastResult(result.data);
        const summary = [
          result.data.projectsCreated > 0 && `${result.data.projectsCreated} Projekte erstellt`,
          result.data.projectsUpdated > 0 && `${result.data.projectsUpdated} Projekte aktualisiert`,
          result.data.phasesCreated > 0 && `${result.data.phasesCreated} Phasen erstellt`,
          result.data.phasesUpdated > 0 && `${result.data.phasesUpdated} Phasen aktualisiert`,
        ].filter(Boolean).join(', ');

        toast.success(summary || 'Synchronisierung abgeschlossen (keine Anderungen)');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projekte synchronisieren</CardTitle>
        <CardDescription>
          Importiert Projekte und Phasen basierend auf der Quell-Konfiguration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSync} disabled={isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
        </Button>

        {lastResult && (
          <div className="rounded-lg border p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Letzte Synchronisierung
            </div>
            <ul className="space-y-1 text-gray-600">
              <li>Projekte erstellt: {lastResult.projectsCreated}</li>
              <li>Projekte aktualisiert: {lastResult.projectsUpdated}</li>
              <li>Phasen erstellt: {lastResult.phasesCreated}</li>
              <li>Phasen aktualisiert: {lastResult.phasesUpdated}</li>
              <li className="text-gray-400">Tasks ubersprungen: {lastResult.tasksSkipped}</li>
            </ul>
            {lastResult.errors.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Warnungen
                </div>
                <ul className="space-y-1 text-sm text-amber-600">
                  {lastResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
