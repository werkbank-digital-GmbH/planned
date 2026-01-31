'use client';

import { Check, Search } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

import {
  searchProjectsAction,
  type ProjectSearchDTO,
} from '@/presentation/actions/projects';
import { Input } from '@/presentation/components/ui/input';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectSearchProps {
  /** Callback wenn ein Projekt ausgewählt wird */
  onSelect: (project: ProjectSearchDTO) => void;
  /** Fehlermeldung */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Projekt-Suchfeld mit Dropdown.
 *
 * Fuzzy-Search nach Projektname.
 * Mindestens 2 Zeichen für Suche erforderlich.
 */
export const ProjectSearch = forwardRef<HTMLInputElement, ProjectSearchProps>(
  ({ onSelect, error }, ref) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [projects, setProjects] = useState<ProjectSearchDTO[]>([]);
    const [selectedProject, setSelectedProject] =
      useState<ProjectSearchDTO | null>(null);

    // Suche bei Query-Änderung
    useEffect(() => {
      if (query.length < 2) {
        setProjects([]);
        return;
      }

      const searchProjects = async () => {
        setIsLoading(true);
        try {
          const result = await searchProjectsAction(query);
          if (result.success) {
            setProjects(result.data);
          }
        } finally {
          setIsLoading(false);
        }
      };

      // Debounce
      const timeout = setTimeout(searchProjects, 200);
      return () => clearTimeout(timeout);
    }, [query]);

    const handleSelect = (project: ProjectSearchDTO) => {
      setSelectedProject(project);
      setQuery(project.name);
      setIsOpen(false);
      onSelect(project);
    };

    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedProject(null);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Projekt suchen..."
            className={cn(
              'pl-10',
              error && 'border-destructive',
              selectedProject && 'border-green-500'
            )}
          />
          {selectedProject && (
            <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
          )}
        </div>

        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

        {/* Dropdown */}
        {isOpen && query.length >= 2 && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
            {isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Suche...</div>
            ) : projects.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Keine Projekte gefunden
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="text-sm">{project.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
);

ProjectSearch.displayName = 'ProjectSearch';
