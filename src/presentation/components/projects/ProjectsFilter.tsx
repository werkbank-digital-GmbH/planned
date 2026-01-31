'use client';

import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

import type { ProjectOverviewDTO } from '@/presentation/actions/projects';
import { Input } from '@/presentation/components/ui/input';

import { cn } from '@/lib/utils';

import { ProjectCard } from './ProjectCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FilterTab = 'all' | 'active' | 'completed' | 'paused';

interface ProjectsFilterProps {
  projects: ProjectOverviewDTO[];
}

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'paused', label: 'Pausiert' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter und Suche für die Projektübersicht.
 *
 * Enthält:
 * - Suchfeld
 * - Filter-Tabs (Alle, Aktiv, Abgeschlossen, Pausiert)
 * - Gefiltertes Projekt-Grid
 */
export function ProjectsFilter({ projects }: ProjectsFilterProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter und Suche anwenden
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Tab-Filter
    if (activeTab !== 'all') {
      if (activeTab === 'active') {
        // Aktiv inkludiert auch "planning"
        result = result.filter((p) => p.status === 'active' || p.status === 'planning');
      } else if (activeTab === 'completed') {
        result = result.filter((p) => p.status === 'completed');
      } else if (activeTab === 'paused') {
        result = result.filter((p) => p.status === 'paused');
      }
    }

    // Suche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.address?.toLowerCase().includes(query) ||
          p.clientName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [projects, activeTab, searchQuery]);

  // Zähler pro Tab
  const tabCounts = useMemo(() => {
    return {
      all: projects.length,
      active: projects.filter((p) => p.status === 'active' || p.status === 'planning').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      paused: projects.filter((p) => p.status === 'paused').length,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Header mit Suche und Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Suchfeld */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Nach Projektname oder Adresse suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
              {tabCounts[tab.value] > 0 && (
                <span
                  className={cn(
                    'ml-1.5',
                    activeTab === tab.value ? 'text-gray-500' : 'text-gray-400'
                  )}
                >
                  {tabCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Projekt-Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery
              ? `Keine Projekte für "${searchQuery}" gefunden`
              : 'Keine Projekte in dieser Kategorie'}
          </p>
        </div>
      )}
    </div>
  );
}
