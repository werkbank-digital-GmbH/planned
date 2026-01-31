'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  getAsanaProjects,
  syncSelectedProjects,
} from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Checkbox } from '@/presentation/components/ui/checkbox';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ermöglicht die Auswahl von Asana-Projekten zur Synchronisation.
 *
 * Features:
 * - Lädt alle Projekte aus dem verbundenen Asana Workspace
 * - Zeigt Sync-Status pro Projekt
 * - Markiert archivierte Projekte
 * - Ermöglicht Mehrfachauswahl und Sync
 */
export function AsanaProjectSelector() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Projekte laden
  const {
    data: projectsResult,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['asana', 'projects'],
    queryFn: async () => {
      const result = await getAsanaProjects();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await syncSelectedProjects(Array.from(selectedIds));
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`${data?.created ?? 0} Projekte importiert, ${data?.updated ?? 0} aktualisiert`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['asana', 'projects'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const projects = projectsResult ?? [];

  // Toggle einzelnes Projekt
  const toggleProject = (projectGid: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectGid)) {
        newSet.delete(projectGid);
      } else {
        newSet.add(projectGid);
      }
      return newSet;
    });
  };

  // Alle nicht-synchronisierten auswählen
  const selectAllUnsyncedProjects = () => {
    const unsyncedGids = projects
      .filter((p) => !p.isSynced && !p.archived)
      .map((p) => p.gid);
    setSelectedIds(new Set(unsyncedGids));
  };

  // Auswahl leeren
  const selectNone = () => {
    setSelectedIds(new Set());
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Projekte werden geladen...</span>
      </div>
    );
  }

  // No projects
  if (projects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Keine Projekte im Workspace gefunden.
      </div>
    );
  }

  const unsyncedCount = projects.filter((p) => !p.isSynced && !p.archived).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Projekte synchronisieren</h3>
          <p className="text-sm text-gray-500">
            Wählen Sie die Projekte aus, die in Planned erscheinen sollen.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Aktualisieren</span>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={selectAllUnsyncedProjects}
          className="text-primary hover:underline"
          disabled={unsyncedCount === 0}
        >
          Alle neuen auswählen ({unsyncedCount})
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={selectNone}
          className="text-gray-500 hover:underline"
          disabled={selectedIds.size === 0}
        >
          Keine auswählen
        </button>
      </div>

      {/* Project list */}
      <div className="max-h-80 divide-y overflow-auto rounded-md border">
        {projects.map((project) => (
          <label
            key={project.gid}
            className={`flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-50 ${
              project.archived ? 'opacity-50' : ''
            } ${project.isSynced ? 'bg-green-50' : ''}`}
          >
            <Checkbox
              checked={selectedIds.has(project.gid)}
              onCheckedChange={() => toggleProject(project.gid)}
              disabled={project.isSynced}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{project.name}</span>
                {project.isSynced && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    synchronisiert
                  </span>
                )}
                {project.archived && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    archiviert
                  </span>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Sync button */}
      <Button
        onClick={() => syncMutation.mutate()}
        disabled={selectedIds.size === 0 || syncMutation.isPending}
        className="w-full"
      >
        {syncMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Synchronisiere...
          </>
        ) : (
          `${selectedIds.size} Projekt${selectedIds.size === 1 ? '' : 'e'} synchronisieren`
        )}
      </Button>
    </div>
  );
}
