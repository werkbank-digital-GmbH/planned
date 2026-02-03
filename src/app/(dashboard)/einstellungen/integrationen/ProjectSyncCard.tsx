'use client';

import { AlertCircle, ArrowRight, Building2, CheckCircle, Loader2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  getAsanaCustomFields,
  getAsanaProjects,
  getAsanaSourceConfig,
  getAsanaTeams,
  saveAsanaSourceConfig,
  syncAsanaTaskPhases,
  type AsanaProjectDTO,
  type AsanaSourceConfigDTO,
  type AsanaTeamDTO,
  type CustomFieldDTO,
  type TaskSyncResultDTO,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import { Separator } from '@/presentation/components/ui/separator';

const NONE_VALUE = '__none__';

/**
 * Kombinierte Karte für Projekte & Phasen.
 * Enthält: Quell-Konfiguration, Field Mapping, Sync-Button.
 */
export function ProjectSyncCard() {
  const [isSaving, startSaveTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Daten
  const [teams, setTeams] = useState<AsanaTeamDTO[]>([]);
  const [projects, setProjects] = useState<AsanaProjectDTO[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDTO[]>([]);
  const [config, setConfig] = useState<AsanaSourceConfigDTO>({
    sourceProjectId: null,
    teamId: null,
    phaseTypeFieldId: null,
    zuordnungFieldId: null,
    sollStundenFieldId: null,
    istStundenFieldId: null,
    addressFieldId: null,
  });
  const [syncResult, setSyncResult] = useState<TaskSyncResultDTO | null>(null);

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const [teamsResult, projectsResult, configResult] = await Promise.all([
        getAsanaTeams(),
        getAsanaProjects(),
        getAsanaSourceConfig(),
      ]);

      if (teamsResult.success) {
        setTeams(teamsResult.data);
      }

      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      if (configResult.success) {
        setConfig(configResult.data);

        // Custom Fields laden wenn Quell-Projekt konfiguriert
        if (configResult.data.sourceProjectId) {
          const fieldsResult = await getAsanaCustomFields();
          if (fieldsResult.success) {
            setCustomFields(fieldsResult.data);
          }
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  // Custom Fields neu laden wenn Quell-Projekt sich ändert
  useEffect(() => {
    if (!config.sourceProjectId) {
      setCustomFields([]);
      return;
    }

    async function loadFields() {
      const fieldsResult = await getAsanaCustomFields();
      if (fieldsResult.success) {
        setCustomFields(fieldsResult.data);
      }
    }

    loadFields();
  }, [config.sourceProjectId]);

  const handleSave = () => {
    startSaveTransition(async () => {
      const result = await saveAsanaSourceConfig({
        sourceProjectId: config.sourceProjectId,
        teamId: config.teamId,
        phaseTypeFieldId: config.phaseTypeFieldId,
        zuordnungFieldId: config.zuordnungFieldId,
        sollStundenFieldId: config.sollStundenFieldId,
        istStundenFieldId: config.istStundenFieldId,
        addressFieldId: config.addressFieldId,
      });

      if (result.success) {
        toast.success('Konfiguration gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleSync = () => {
    startSyncTransition(async () => {
      const result = await syncAsanaTaskPhases();

      if (result.success) {
        setSyncResult(result.data);
        const summary = [
          result.data.projectsCreated > 0 && `${result.data.projectsCreated} Projekte erstellt`,
          result.data.projectsUpdated > 0 && `${result.data.projectsUpdated} Projekte aktualisiert`,
          result.data.phasesCreated > 0 && `${result.data.phasesCreated} Phasen erstellt`,
          result.data.phasesUpdated > 0 && `${result.data.phasesUpdated} Phasen aktualisiert`,
        ].filter(Boolean).join(', ');

        toast.success(summary || 'Synchronisierung abgeschlossen (keine Änderungen)');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleChange = (field: keyof AsanaSourceConfigDTO, value: string | null) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value === NONE_VALUE ? null : value,
    }));
  };

  const isConfigured = !!(config.sourceProjectId && config.teamId);
  const enumFields = customFields.filter((f) => f.type === 'enum' || f.type === 'multi_enum');
  const numberFields = customFields.filter((f) => f.type === 'number');
  const textFields = customFields.filter((f) => f.type === 'text');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <CardTitle>Projekte & Phasen</CardTitle>
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
          <Building2 className="h-5 w-5 text-blue-600" />
          <CardTitle>Projekte & Phasen</CardTitle>
        </div>
        <CardDescription>
          Bauvorhaben und Projektphasen aus Asana synchronisieren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quell-Konfiguration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Quell-Konfiguration</h3>

          {/* Quell-Projekt */}
          <div className="space-y-2">
            <Label htmlFor="sourceProject">Quell-Projekt (Phasen)</Label>
            <p className="text-xs text-gray-500">
              Tasks aus diesem Projekt werden als Phasen importiert
            </p>
            <SearchableSelect
              value={config.sourceProjectId}
              onValueChange={(v) => handleChange('sourceProjectId', v)}
              options={projects.map((p) => ({ value: p.gid, label: p.name }))}
              placeholder="Projekt auswählen..."
              searchPlaceholder="Projekt suchen..."
              emptyText="Kein Projekt gefunden"
              allowClear={true}
              clearLabel="Nicht konfiguriert"
            />
          </div>

          {/* Team */}
          <div className="space-y-2">
            <Label htmlFor="team">Team (Bauvorhaben)</Label>
            <p className="text-xs text-gray-500">
              Projekte aus diesem Team werden als Bauvorhaben importiert
            </p>
            <SearchableSelect
              value={config.teamId}
              onValueChange={(v) => handleChange('teamId', v)}
              options={teams.map((t) => ({ value: t.gid, label: t.name }))}
              placeholder="Team auswählen..."
              searchPlaceholder="Team suchen..."
              emptyText="Kein Team gefunden"
              allowClear={true}
              clearLabel="Nicht konfiguriert"
            />
          </div>
        </div>

        <Separator />

        {/* Field Mapping */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Custom Field Mapping</h3>

          {!config.sourceProjectId ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p>Wählen Sie zuerst ein Quell-Projekt aus, um Custom Fields zu laden.</p>
              </div>
            </div>
          ) : customFields.length === 0 ? (
            <p className="text-sm text-gray-500">
              Keine Custom Fields im Quell-Projekt gefunden.
            </p>
          ) : (
            <div className="rounded-lg border">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">Asana</span>
                <span className="w-4" />
                <span className="text-sm font-medium text-gray-600">planned.</span>
              </div>

              {/* Mapping Rows */}
              <div className="divide-y">
                {/* Projektphase → Phasen-Name */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <Select
                    value={config.phaseTypeFieldId ?? NONE_VALUE}
                    onValueChange={(v) => handleChange('phaseTypeFieldId', v)}
                  >
                    <SelectTrigger id="phaseType">
                      <SelectValue placeholder="Field auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Task-Name verwenden</SelectItem>
                      {enumFields.map((field) => (
                        <SelectItem key={field.gid} value={field.gid}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">Phasen-Name</span>
                </div>

                {/* Zuordnung → Bereich */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <Select
                    value={config.zuordnungFieldId ?? NONE_VALUE}
                    onValueChange={(v) => handleChange('zuordnungFieldId', v)}
                  >
                    <SelectTrigger id="zuordnung">
                      <SelectValue placeholder="Field auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                      {enumFields.map((field) => (
                        <SelectItem key={field.gid} value={field.gid}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">Bereich</span>
                </div>

                {/* Soll-Stunden → Budget (Soll) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <Select
                    value={config.sollStundenFieldId ?? NONE_VALUE}
                    onValueChange={(v) => handleChange('sollStundenFieldId', v)}
                  >
                    <SelectTrigger id="sollStunden">
                      <SelectValue placeholder="Field auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                      {numberFields.map((field) => (
                        <SelectItem key={field.gid} value={field.gid}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">Budget (Soll)</span>
                </div>

                {/* Ist-Stunden → Ist-Stunden */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <Select
                    value={config.istStundenFieldId ?? NONE_VALUE}
                    onValueChange={(v) => handleChange('istStundenFieldId', v)}
                  >
                    <SelectTrigger id="istStunden">
                      <SelectValue placeholder="Field auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                      {numberFields.map((field) => (
                        <SelectItem key={field.gid} value={field.gid}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">Ist-Stunden</span>
                </div>

                {/* Adresse → Projektadresse */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <Select
                    value={config.addressFieldId ?? NONE_VALUE}
                    onValueChange={(v) => handleChange('addressFieldId', v)}
                  >
                    <SelectTrigger id="addressField">
                      <SelectValue placeholder="Field auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                      {textFields.map((field) => (
                        <SelectItem key={field.gid} value={field.gid}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">Projektadresse</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Aktionen */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Speichern...' : 'Speichern'}
          </Button>

          {isConfigured && (
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
            </Button>
          )}
        </div>

        {/* Sync-Ergebnis */}
        {syncResult && (
          <div className="rounded-lg border p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Letzte Synchronisierung
            </div>
            <ul className="space-y-1 text-gray-600">
              <li>Projekte erstellt: {syncResult.projectsCreated}</li>
              <li>Projekte aktualisiert: {syncResult.projectsUpdated}</li>
              <li>Phasen erstellt: {syncResult.phasesCreated}</li>
              <li>Phasen aktualisiert: {syncResult.phasesUpdated}</li>
              <li className="text-gray-400">Tasks übersprungen: {syncResult.tasksSkipped}</li>
            </ul>
            {syncResult.errors.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Warnungen
                </div>
                <ul className="space-y-1 text-sm text-amber-600">
                  {syncResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Hinweis wenn nicht konfiguriert */}
        {!isConfigured && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Konfiguration erforderlich</p>
              <p className="mt-1">
                Wählen Sie ein Quell-Projekt und ein Team aus, um Projekte synchronisieren zu können.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
