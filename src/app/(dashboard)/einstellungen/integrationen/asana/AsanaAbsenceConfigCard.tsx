'use client';

import { AlertCircle, Calendar, Loader2, RefreshCw, Save } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

const NONE_VALUE = '__none__';

/**
 * Absence-Konfiguration fur Asana-Integration.
 * Ermoglicht die Auswahl eines Asana-Projekts als Quelle fur Abwesenheiten.
 */
export function AsanaAbsenceConfigCard() {
  const [isPending, startTransition] = useTransition();
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
    startTransition(async () => {
      const result = await saveAsanaAbsenceConfig({
        absenceProjectId: absenceProjectId === NONE_VALUE ? null : absenceProjectId,
      });

      if (result.success) {
        toast.success('Abwesenheiten-Konfiguration gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleSync = () => {
    if (!absenceProjectId || absenceProjectId === NONE_VALUE) {
      toast.error('Bitte zuerst ein Abwesenheiten-Projekt auswahlen');
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

  const selectedProject = projects.find((p) => p.gid === absenceProjectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Abwesenheiten aus Asana
          </CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Abwesenheiten aus Asana
        </CardTitle>
        <CardDescription>
          Importieren Sie Abwesenheiten aus einem Asana-Projekt (jeder Task = eine Abwesenheit)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Erklarung */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            <strong>So funktioniert der Import:</strong> Jeder Task im ausgewahlten Projekt wird
            als Abwesenheit importiert. Der <strong>Assignee</strong> des Tasks bestimmt den
            Mitarbeiter, <strong>Start-</strong> und <strong>Due-Date</strong> den Zeitraum.
            Der Abwesenheitstyp wird aus dem Task-Namen abgeleitet (Urlaub, Krank, etc.).
          </p>
        </div>

        {/* Projekt-Auswahl */}
        <div className="space-y-2">
          <Label htmlFor="absenceProject">Abwesenheiten-Projekt</Label>
          <p className="text-xs text-gray-500">
            Asana-Projekt, das Abwesenheiten als Tasks enthalt
          </p>
          <Select
            value={absenceProjectId ?? NONE_VALUE}
            onValueChange={setAbsenceProjectId}
          >
            <SelectTrigger id="absenceProject">
              <SelectValue placeholder="Projekt auswahlen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Kein Projekt (deaktiviert)</SelectItem>
              {projects
                .filter((p) => !p.archived)
                .map((project) => (
                  <SelectItem key={project.gid} value={project.gid}>
                    {project.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>

          {absenceProjectId && absenceProjectId !== NONE_VALUE && (
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
          <div className="rounded-lg border p-4 space-y-2">
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
                <div className="text-xs text-gray-500">Ubersprungen</div>
              </div>
            </div>

            {syncResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1 text-sm font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Hinweise ({syncResult.errors.length})
                </div>
                <ul className="max-h-32 overflow-y-auto text-xs text-amber-600 space-y-1">
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

        {/* Warnung wenn Projekt ausgewahlt aber nicht gespeichert */}
        {absenceProjectId &&
          absenceProjectId !== NONE_VALUE &&
          selectedProject &&
          !syncResult && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Vergessen Sie nicht, die Konfiguration zu speichern und dann zu synchronisieren.
              </span>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
