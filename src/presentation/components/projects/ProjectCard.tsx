'use client';

import { ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';

import type { ProjectOverviewDTO } from '@/presentation/actions/projects';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/avatar';
import { Card, CardContent } from '@/presentation/components/ui/card';

import { formatHours, formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectCardProps {
  project: ProjectOverviewDTO;
}

// Status-Badge Farben
const STATUS_STYLES: Record<
  ProjectOverviewDTO['status'] | 'late',
  { bg: string; text: string; label: string }
> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'AKTIV' },
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'GEPLANT' },
  paused: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'PAUSIERT' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'FERTIG' },
  late: { bg: 'bg-red-100', text: 'text-red-700', label: 'ÜBERFÄLLIG' },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Projekt-Karte für die Projektübersicht.
 *
 * Zeigt:
 * - Name und Status-Badge
 * - Adresse
 * - Fortschrittsbalken
 * - Phasen-Zähler
 * - Stunden (IST/SOLL)
 * - Zugewiesene Mitarbeiter
 */
export function ProjectCard({ project }: ProjectCardProps) {
  // Status ermitteln (LATE überschreibt andere)
  const displayStatus = project.isLate && project.status === 'active' ? 'late' : project.status;
  const statusStyle = STATUS_STYLES[displayStatus];

  // Stunden-Anzeige formatieren
  const isOverBudget = project.actualHours > project.budgetHours && project.budgetHours > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
          <span
            className={cn(
              'flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium',
              statusStyle.bg,
              statusStyle.text
            )}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Adresse */}
        {project.address && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{project.address}</span>
          </div>
        )}

        {/* Fortschritt */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Fortschritt</span>
            <span className="font-medium">{project.progressPercent}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                project.progressPercent >= 100
                  ? 'bg-green-500'
                  : project.progressPercent > 75
                    ? 'bg-yellow-500'
                    : 'bg-accent'
              )}
              style={{ width: `${Math.min(project.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Phasen */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Phasen</div>
            <div className="text-lg font-semibold">
              {project.phasesCompleted}
              <span className="text-gray-400 font-normal"> / {project.phasesTotal}</span>
            </div>
          </div>

          {/* Stunden */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">
              {isOverBudget ? 'Stunden (Über)' : 'Stunden (Ist / Soll)'}
            </div>
            <div className={cn('text-lg font-semibold', isOverBudget && 'text-red-600')}>
              {formatHours(project.actualHours)}
              <span className={cn('font-normal', isOverBudget ? 'text-red-400' : 'text-gray-400')}>
                {' '}
                / {formatHoursWithUnit(project.budgetHours)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Avatars + Details Link */}
        <div className="flex items-center justify-between pt-3 border-t">
          {/* Avatars */}
          {project.assignedUsers.length > 0 ? (
            <div className="flex -space-x-2">
              {project.assignedUsers.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-8 w-8 border-2 border-white">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.assignedUsers.length > 3 && (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 border-2 border-white text-xs text-gray-600 font-medium">
                  +{project.assignedUsers.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Keine Zuweisungen</span>
          )}

          {/* Details Link */}
          <Link
            href={`/projekte/${project.id}`}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
