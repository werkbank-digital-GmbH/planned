'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  deleteTimeTacProjectMapping,
  getLocalProjectsWithPhases,
  getTimeTacProjectMapping,
  getTimeTacProjects,
  saveTimeTacProjectMapping,
} from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ermöglicht die Zuordnung von TimeTac-Projekten zu Planned-Phasen.
 *
 * Features:
 * - Lädt alle Projekte aus TimeTac
 * - Lädt alle lokalen Projekte mit Phasen
 * - Zeigt aktuelles Mapping
 * - Ermöglicht Zuweisung und Löschen
 */
export function TimeTacProjectMapping() {
  const queryClient = useQueryClient();

  // TimeTac Projekte laden
  const {
    data: timetacProjectsResult,
    isLoading: isLoadingTimetac,
  } = useQuery({
    queryKey: ['timetac', 'projects'],
    queryFn: async () => {
      const result = await getTimeTacProjects();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Lokale Projekte mit Phasen laden
  const {
    data: localProjectsResult,
    isLoading: isLoadingLocal,
  } = useQuery({
    queryKey: ['projects', 'withPhases'],
    queryFn: async () => {
      const result = await getLocalProjectsWithPhases();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Aktuelles Mapping laden
  const { data: mappingResult, isLoading: isLoadingMapping } = useQuery({
    queryKey: ['timetac', 'projectMapping'],
    queryFn: async () => {
      const result = await getTimeTacProjectMapping();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Speichern Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { timetacProjectId: number; plannedPhaseId: string }) => {
      const result = await saveTimeTacProjectMapping(data);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Zuordnung gespeichert');
      queryClient.invalidateQueries({ queryKey: ['timetac', 'projectMapping'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Löschen Mutation
  const deleteMutation = useMutation({
    mutationFn: async (timetacProjectId: number) => {
      const result = await deleteTimeTacProjectMapping(timetacProjectId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      toast.success('Zuordnung entfernt');
      queryClient.invalidateQueries({ queryKey: ['timetac', 'projectMapping'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const timetacProjects = timetacProjectsResult ?? [];
  const localProjects = localProjectsResult ?? [];
  const currentMapping = mappingResult ?? {};

  // Handler für Änderungen
  const handleChange = (timetacProjectId: number, phaseId: string) => {
    if (phaseId === 'none') {
      deleteMutation.mutate(timetacProjectId);
    } else {
      saveMutation.mutate({ timetacProjectId, plannedPhaseId: phaseId });
    }
  };

  // Loading State
  if (isLoadingTimetac || isLoadingLocal || isLoadingMapping) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Lade Konfiguration...</span>
      </div>
    );
  }

  // No TimeTac projects
  if (timetacProjects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Keine Projekte in TimeTac gefunden.</p>
        <p className="mt-1 text-xs">
          Erstellen Sie Projekte in TimeTac, um sie hier zuordnen zu können.
        </p>
      </div>
    );
  }

  // No local projects
  if (localProjects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Keine Projekte in Planned gefunden.</p>
        <p className="mt-1 text-xs">
          Synchronisieren Sie zunächst Projekte aus Asana.
        </p>
      </div>
    );
  }

  // Flatten phases for Select
  const phaseOptions = localProjects.flatMap((project) =>
    project.phases.map((phase) => ({
      value: phase.id,
      label: `${project.name} → ${phase.name}`,
      bereich: phase.bereich,
    }))
  );

  // Aktive (nicht archivierte) Projekte zuerst
  const sortedProjects = [...timetacProjects].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Projekt-Zuordnung</h3>
        <p className="text-sm text-gray-500">
          Ordnen Sie TimeTac-Projekte den Planned-Phasen zu für IST-Zeiten.
        </p>
      </div>

      {/* Mapping Table */}
      <div className="max-h-96 divide-y overflow-auto rounded-md border">
        {sortedProjects.map((ttProject) => {
          const mappedPhaseId = currentMapping[ttProject.id];
          const isPending = saveMutation.isPending || deleteMutation.isPending;

          return (
            <div
              key={ttProject.id}
              className={`grid grid-cols-[1fr,1fr,auto] items-center gap-4 p-3 ${
                !ttProject.active ? 'bg-gray-50 opacity-60' : ''
              }`}
            >
              {/* TimeTac Projekt */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ttProject.name}</span>
                  {!ttProject.active && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                      inaktiv
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {ttProject.number ? `#${ttProject.number} · ` : ''}
                  TimeTac ID: {ttProject.id}
                </div>
              </div>

              {/* Phase Select */}
              <Select
                value={mappedPhaseId ?? 'none'}
                onValueChange={(value) => handleChange(ttProject.id, value)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Phase auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nicht zugeordnet</SelectItem>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                      <span className="ml-1 text-xs text-gray-400">
                        ({option.bereich === 'produktion' ? 'P' : 'M'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(ttProject.id)}
                disabled={!mappedPhaseId || isPending}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
        <strong>Hinweis:</strong> Die Zuordnung wird automatisch beim nächsten Sync
        verwendet. Zeiteinträge werden der zugeordneten Phase als IST-Stunden zugerechnet.
      </div>
    </div>
  );
}
