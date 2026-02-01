'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  getAsanaProjects,
  getAsanaSourceConfig,
  getAsanaTeams,
  saveAsanaSourceConfig,
  type AsanaProjectDTO,
  type AsanaSourceConfigDTO,
  type AsanaTeamDTO,
} from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Label } from '@/presentation/components/ui/label';
import { SearchableSelect } from '@/presentation/components/ui/searchable-select';


/**
 * Konfiguration für das Quell-Projekt und Team.
 * - Quell-Projekt: Projekt mit Tasks, die als Phasen importiert werden (z.B. "Jahresplanung")
 * - Team: Team dessen Projekte als Bauvorhaben importiert werden (z.B. "600 Projekte")
 */
export function AsanaSourceConfigCard() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Daten
  const [teams, setTeams] = useState<AsanaTeamDTO[]>([]);
  const [projects, setProjects] = useState<AsanaProjectDTO[]>([]);
  const [config, setConfig] = useState<AsanaSourceConfigDTO>({
    sourceProjectId: null,
    teamId: null,
    phaseTypeFieldId: null,
    zuordnungFieldId: null,
    sollStundenFieldId: null,
  });

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
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAsanaSourceConfig({
        sourceProjectId: config.sourceProjectId,
        teamId: config.teamId,
        phaseTypeFieldId: config.phaseTypeFieldId,
        zuordnungFieldId: config.zuordnungFieldId,
        sollStundenFieldId: config.sollStundenFieldId,
      });

      if (result.success) {
        toast.success('Konfiguration gespeichert');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleChange = (
    field: keyof AsanaSourceConfigDTO,
    value: string | null
  ) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quell-Konfiguration</CardTitle>
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
        <CardTitle>Quell-Konfiguration</CardTitle>
        <CardDescription>
          Legen Sie fest, woher Projekte und Phasen importiert werden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quell-Projekt (Tasks werden zu Phasen) */}
        <div className="space-y-2">
          <Label htmlFor="sourceProject">Quell-Projekt (Phasen)</Label>
          <p className="text-sm text-gray-500">
            Tasks aus diesem Projekt werden als Phasen importiert (z.B. &quot;Jahresplanung&quot;)
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

        {/* Team (Projekte werden zu Bauvorhaben) */}
        <div className="space-y-2">
          <Label htmlFor="team">Team (Bauvorhaben)</Label>
          <p className="text-sm text-gray-500">
            Projekte aus diesem Team werden als Bauvorhaben importiert (z.B. &quot;600 Projekte&quot;)
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

        {/* Info Box */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">So funktioniert der Import:</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Tasks aus dem Quell-Projekt werden als Phasen importiert</li>
            <li>Jeder Task muss zu einem Projekt im ausgewahlten Team gehoren</li>
            <li>Das Projekt wird automatisch als Bauvorhaben erstellt</li>
            <li>Start/Ende kommen aus den Task-Daten</li>
          </ol>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? 'Speichern...' : 'Konfiguration speichern'}
        </Button>
      </CardContent>
    </Card>
  );
}
