'use client';

import { Filter, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Separator } from '@/presentation/components/ui/separator';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { formatHoursWithUnit } from '@/lib/format';

import { CapacityBar } from './CapacityBar';
import { FilterDropdown } from './FilterDropdown';
import { ProjectList } from './ProjectList';

interface PlanningSidebarProps {
  /** Verfügbare Projekte für den Filter und die Projekt-Liste */
  projects: Array<{ id: string; name: string }>;
  /** Verfügbare Mitarbeiter für den Filter */
  users: Array<{ id: string; fullName: string }>;
}

/**
 * Sidebar der Planungsansicht.
 *
 * Enthält Filter und Wochenzusammenfassung.
 */
export function PlanningSidebar({ projects, users }: PlanningSidebarProps) {
  const { filters, setFilters, summary, isLoading } = usePlanning();

  return (
    <div className="w-[280px] space-y-4">
      {/* Filter Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterDropdown
            label="Projekt"
            placeholder="Alle Projekte"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={filters.projectId}
            onChange={(value) => setFilters({ ...filters, projectId: value })}
            isLoading={isLoading}
          />

          <FilterDropdown
            label="Mitarbeiter"
            placeholder="Alle Mitarbeiter"
            options={users.map((u) => ({ value: u.id, label: u.fullName }))}
            value={filters.userId}
            onChange={(value) => setFilters({ ...filters, userId: value })}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Project List Section */}
      <ProjectList projects={projects} />

      {/* Summary Section */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Wochenzusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CapacityBar
              planned={summary.totalPlannedHours}
              actual={summary.totalActualHours}
              capacity={summary.totalCapacity}
            />

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geplant</span>
                <span className="font-medium">{formatHoursWithUnit(summary.totalPlannedHours)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gebucht</span>
                <span className="font-medium">{formatHoursWithUnit(summary.totalActualHours)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kapazität</span>
                <span className="font-medium">{formatHoursWithUnit(summary.totalCapacity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auslastung</span>
                <span className="font-medium">
                  {Math.round(summary.utilizationPercent)}%
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mitarbeiter</span>
                <span className="font-medium">{summary.userCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projekte</span>
                <span className="font-medium">{summary.projectCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
