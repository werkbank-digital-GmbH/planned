'use client';

import { ChevronDown, ChevronRight, FolderKanban } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { PhaseBereich } from '@/domain/types';

import { getProjectPhasesAction } from '@/presentation/actions/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

import { DraggablePhaseCard, type PhaseCardData } from './DraggablePhaseCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectWithPhases {
  id: string;
  name: string;
  phases?: PhaseCardData[];
}

interface ProjectListProps {
  /** Projekte die angezeigt werden sollen */
  projects: Array<{ id: string; name: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectItemProps {
  project: { id: string; name: string };
}

function ProjectItem({ project }: ProjectItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phases, setPhases] = useState<PhaseCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Lade Phasen wenn das Projekt geöffnet wird
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      setIsLoading(true);
      getProjectPhasesAction(project.id)
        .then((result) => {
          if (result.success) {
            setPhases(
              result.data.map((phase) => ({
                id: phase.id,
                name: phase.name,
                bereich: phase.bereich as PhaseBereich,
                projectId: project.id,
                projectName: project.name,
              }))
            );
          }
          setHasLoaded(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, hasLoaded, project.id, project.name]);

  return (
    <div className="space-y-1">
      {/* Project Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
          'hover:bg-gray-100'
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
        )}
        <span className="truncate font-medium">{project.name}</span>
      </button>

      {/* Phases List */}
      {isOpen && (
        <div className="ml-4 space-y-1 border-l pl-2">
          {isLoading && (
            <div className="px-2 py-1 text-xs text-gray-500">Lade Phasen...</div>
          )}
          {!isLoading && phases.length === 0 && hasLoaded && (
            <div className="px-2 py-1 text-xs text-gray-500">
              Keine Phasen vorhanden
            </div>
          )}
          {phases.map((phase) => (
            <DraggablePhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Projekt-Liste für die Sidebar.
 *
 * Zeigt alle Projekte mit aufklappbaren Phasen.
 * Phasen können per Drag & Drop auf das Grid gezogen werden
 * um neue Allocations zu erstellen.
 */
export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderKanban className="h-4 w-4" />
            Projekte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500">Keine aktiven Projekte vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderKanban className="h-4 w-4" />
          Projekte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="mb-3 text-xs text-gray-500">
          Phase auf einen Mitarbeiter ziehen zum Einplanen
        </p>
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </CardContent>
    </Card>
  );
}
