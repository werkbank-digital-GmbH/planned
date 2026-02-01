'use client';

import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { syncSelectedProjects, type SyncResultDTO } from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';

/**
 * Ermöglicht das Synchronisieren von Projekten aus Asana.
 */
export function AsanaSyncCard() {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<SyncResultDTO | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncSelectedProjects([]);

      if (result.success) {
        setLastResult(result.data);
        toast.success(
          `Synchronisierung abgeschlossen: ${result.data.created} erstellt, ${result.data.updated} aktualisiert`
        );
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
          Importiert alle Projekte und deren Phasen aus Asana
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
              <li>Projekte erstellt: {lastResult.created}</li>
              <li>Projekte aktualisiert: {lastResult.updated}</li>
              <li>Projekte archiviert: {lastResult.archived}</li>
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
