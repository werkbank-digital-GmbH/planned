'use client';

import { AlertCircle, CalendarOff, Loader2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  getAsanaAbsenceConfig,
  getAsanaProjects,
  saveAsanaAbsenceConfig,
  syncAsanaAbsences,
  type AsanaProjectDTO,
} from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/presentation/components/ui/card';
import { Label } from '@/presentation/components/ui/label';
import { SearchableSelect } from '@/presentation/components/ui/searchable-select';

const NONE_VALUE = '__none__';

/**
 * Kombinierte Karte für Abwesenheiten-Synchronisation.
 * Enthält: Projekt-Auswahl, Sync-Button.
 */
export function AbsenceSyncCard() {
  const [isSaving, startSaveTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const [projects, setProjects] = useState<AsanaProjectDTO[]>([]);
  const [absenceProjectId, setAbsenceProjectId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const [configResult, projectsResult] = await Promise.all([
        getAsanaAbsenceConfig(),
        getAsanaProjects(),
      ]);

      if (configResult.success) {
        setAbsenceProjectId(configResult.data.absenceProjectId);
      }

      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleSave = () => {
    startSaveTransition(async () => {
      const result = await saveAsanaAbsenceConfig({
        absenceProjectId: absenceProjectId === NONE_VALUE ? null : absenceProjectId,
      });

      if (result.success) {
        toast.success('Konfiguration gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleSync = () => {
    if (!absenceProjectId || absenceProjectId === NONE_VALUE) {
      toast.error('Bitte zuerst ein Abwesenheiten-Projekt auswählen');
      return;
    }

    startSyncTransition(async () => {
      const result = await syncAsanaAbsences();

      if (result.success) {
        setSyncResult(result.data);
        toast.success(
          `Sync abgeschlossen: ${result.data.created} erstellt, ${result.data.updated} aktualisiert`
        );
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const isConfigured = absenceProjectId && absenceProjectId !== NONE_VALUE;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-600" />
            <CardTitle>Abwesenheiten</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-amber-600" />
          <CardTitle>Abwesenheiten</CardTitle>
        </div>
        <CardDescription>
          Urlaub, Krankheit und andere Abwesenheiten aus Asana importieren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Erklärung */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            <strong>So funktioniert der Import:</strong> Jeder Task im ausgewählten Projekt wird
            als Abwesenheit importiert. Der <strong>Assignee</strong> bestimmt den Mitarbeiter,{' '}
            <strong>Start-</strong> und <strong>Due-Date</strong> den Zeitraum.
            Der Typ wird aus dem Task-Namen abgeleitet (Urlaub, Krank, etc.).
          </p>
        </div>

        {/* Projekt-Auswahl */}
        <div className="space-y-2">
          <Label htmlFor="absenceProject">Abwesenheiten-Projekt</Label>
          <p className="text-xs text-gray-500">
            Asana-Projekt, das Abwesenheiten als Tasks enthält
          </p>
          <SearchableSelect
            value={absenceProjectId}
            onValueChange={setAbsenceProjectId}
            options={projects
              .filter((p) => !p.archived)
              .map((p) => ({ value: p.gid, label: p.name }))}
            placeholder="Projekt auswählen..."
            searchPlaceholder="Projekt suchen..."
            emptyText="Kein Projekt gefunden"
            allowClear={true}
            clearLabel="Kein Projekt (deaktiviert)"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>

          {isConfigured && (
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Jetzt synchronisieren
            </Button>
          )}
        </div>

        {/* Sync-Ergebnis */}
        {syncResult && (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="text-sm font-medium">Letzter Sync</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{syncResult.created}</div>
                <div className="text-xs text-gray-500">Erstellt</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{syncResult.updated}</div>
                <div className="text-xs text-gray-500">Aktualisiert</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">{syncResult.skipped}</div>
                <div className="text-xs text-gray-500">Übersprungen</div>
              </div>
            </div>

            {syncResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1 text-sm font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Hinweise ({syncResult.errors.length})
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-amber-600">
                  {syncResult.errors.map((error, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-1">•</span>
                      <span>{error}</span>
                    </li>
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
