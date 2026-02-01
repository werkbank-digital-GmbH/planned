'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  deleteTimeTacProjectMapping,
  getLocalProjectsWithPhases,
  getTimeTacProjectMapping,
  getTimeTacProjects,
  saveTimeTacProjectMapping,
  type LocalProjectWithPhasesDTO,
  type TimeTacProjectDTO,
} from '@/presentation/actions/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
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
 * Ermöglicht das Mapping von TimeTac Projekten zu Planned Phasen.
 */
export function TimeTacMappingCard() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [timetacProjects, setTimetacProjects] = useState<TimeTacProjectDTO[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProjectWithPhasesDTO[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});

  // Daten laden
  useEffect(() => {
    async function loadData() {
      const [ttProjectsResult, localResult, mappingResult] = await Promise.all([
        getTimeTacProjects(),
        getLocalProjectsWithPhases(),
        getTimeTacProjectMapping(),
      ]);

      if (ttProjectsResult.success) {
        setTimetacProjects(ttProjectsResult.data);
      }

      if (localResult.success) {
        setLocalProjects(localResult.data);
      }

      if (mappingResult.success) {
        setMapping(mappingResult.data);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleMappingChange = (timetacProjectId: number, phaseId: string) => {
    startTransition(async () => {
      if (phaseId === NONE_VALUE) {
        // Mapping löschen
        const result = await deleteTimeTacProjectMapping(timetacProjectId);
        if (result.success) {
          setMapping((prev) => {
            const newMapping = { ...prev };
            delete newMapping[timetacProjectId];
            return newMapping;
          });
          toast.success('Mapping entfernt');
        } else {
          toast.error(result.error.message);
        }
      } else {
        // Mapping speichern
        const result = await saveTimeTacProjectMapping({
          timetacProjectId,
          plannedPhaseId: phaseId,
        });
        if (result.success) {
          setMapping((prev) => ({ ...prev, [timetacProjectId]: phaseId }));
          toast.success('Mapping gespeichert');
        } else {
          toast.error(result.error.message);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projekt-Mapping</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Flatten phases for select options
  const phaseOptions = localProjects.flatMap((project) =>
    project.phases.map((phase) => ({
      id: phase.id,
      label: `${project.name} → ${phase.name} (${phase.bereich})`,
    }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projekt-Mapping</CardTitle>
        <CardDescription>
          Ordnen Sie TimeTac Projekte Ihren Planned Phasen zu.
          Zeiteinträge werden dann der entsprechenden Phase zugeordnet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {timetacProjects.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Projekte in TimeTac gefunden.
          </p>
        ) : phaseOptions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Keine Phasen in Planned gefunden. Synchronisieren Sie zuerst Projekte aus Asana.
          </p>
        ) : (
          <div className="space-y-4">
            {timetacProjects
              .filter((p) => p.active)
              .map((ttProject) => (
                <div key={ttProject.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {ttProject.name}
                    {ttProject.number && (
                      <span className="ml-2 text-gray-400">({ttProject.number})</span>
                    )}
                  </Label>
                  <Select
                    value={mapping[ttProject.id] ?? NONE_VALUE}
                    onValueChange={(v) => handleMappingChange(ttProject.id, v)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Phase auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Nicht zugeordnet</SelectItem>
                      {phaseOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
          </div>
        )}

        {/* Inaktive Projekte anzeigen */}
        {timetacProjects.filter((p) => !p.active).length > 0 && (
          <div className="mt-6 border-t pt-4">
            <p className="mb-2 text-sm font-medium text-gray-500">
              Inaktive TimeTac Projekte ({timetacProjects.filter((p) => !p.active).length})
            </p>
            <ul className="space-y-1 text-sm text-gray-400">
              {timetacProjects
                .filter((p) => !p.active)
                .map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
