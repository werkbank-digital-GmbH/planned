'use client';

import { Building2, CircleHelp, Factory, Truck, Users } from 'lucide-react';

import type { PhaseDetailDTO } from '@/presentation/actions/project-details';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseCardProps {
  phase: PhaseDetailDTO;
  onEdit?: (phaseId: string) => void;
}

// Bereich-Badge Styles
const BEREICH_STYLES: Record<
  PhaseDetailDTO['bereich'],
  { bg: string; text: string; label: string; icon: React.ReactNode }
> = {
  produktion: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'PRODUKTION',
    icon: <Factory className="h-5 w-5" />,
  },
  montage: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'VOR ORT',
    icon: <Building2 className="h-5 w-5" />,
  },
  externes_gewerk: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'EXTERN',
    icon: <Truck className="h-5 w-5" />,
  },
  nicht_definiert: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'NICHT DEFINIERT',
    icon: <CircleHelp className="h-5 w-5" />,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatiert ein Datum für die Anzeige.
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatiert einen Datums-Zeitraum.
 */
function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined
): string {
  if (!startDate && !endDate) return 'Kein Zeitraum';
  if (!startDate) return `bis ${formatDate(endDate)}`;
  if (!endDate) return `ab ${formatDate(startDate)}`;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Karte für eine einzelne Projektphase.
 *
 * Zeigt:
 * - Icon basierend auf Bereich
 * - Name und Bereich-Badge
 * - Datum-Zeitraum
 * - SOLL/IST/DIFF Stunden
 * - Zugewiesene Mitarbeiter und Ressourcen
 * - Fortschrittsbalken
 */
export function PhaseCard({ phase, onEdit }: PhaseCardProps) {
  const bereichStyle = BEREICH_STYLES[phase.bereich];
  const isOverBudget = phase.actualHours > phase.budgetHours && phase.budgetHours > 0;
  const isUnderBudget = phase.diffHours > 0;

  // Fortschrittsbalken-Farbe
  const progressColor =
    phase.status === 'completed'
      ? 'bg-green-500'
      : isOverBudget
        ? 'bg-red-500'
        : 'bg-accent';

  // Status-Text
  const statusText =
    phase.status === 'not_started'
      ? 'Noch nicht gestartet'
      : phase.status === 'completed'
        ? 'Abgeschlossen'
        : undefined;

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        onEdit && 'cursor-pointer'
      )}
      onClick={() => onEdit?.(phase.id)}
    >
      <CardContent className="p-5">
        {/* Header: Icon + Name + Badge */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              bereichStyle.bg,
              bereichStyle.text
            )}
          >
            {bereichStyle.icon}
          </div>

          {/* Name und Badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {phase.name}
              </h3>
              <Badge
                className={cn(
                  'text-xs font-medium flex-shrink-0',
                  bereichStyle.bg,
                  bereichStyle.text
                )}
              >
                {bereichStyle.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateRange(phase.startDate, phase.endDate)}
            </p>
          </div>

          {/* Status / Progress */}
          <div className="text-right flex-shrink-0">
            {statusText ? (
              <span className="text-sm text-gray-500">{statusText}</span>
            ) : (
              <>
                <span className="text-sm text-gray-500">Fortschritt</span>
                <span className="block font-semibold">{phase.progressPercent}%</span>
              </>
            )}
          </div>
        </div>

        {/* Stunden-Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          {/* SOLL */}
          <div>
            <span className="text-gray-500 block">SOLL</span>
            <span className="font-semibold">{phase.budgetHours}h</span>
          </div>

          {/* IST */}
          <div>
            <span className="text-gray-500 block">IST</span>
            <span className={cn('font-semibold', isOverBudget && 'text-red-600')}>
              {phase.actualHours}h
            </span>
          </div>

          {/* DIFF */}
          <div>
            <span className="text-gray-500 block">DIFF</span>
            <span
              className={cn(
                'font-semibold',
                isUnderBudget ? 'text-green-600' : isOverBudget ? 'text-red-600' : ''
              )}
            >
              {phase.diffHours > 0 ? `-${phase.diffHours}h` : `+${Math.abs(phase.diffHours)}h`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {phase.status !== 'not_started' && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${Math.min(phase.progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* Assigned Users & Resources */}
        {(phase.assignedUsers.length > 0 || phase.assignedResources.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {/* Users */}
            {phase.assignedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-sm"
              >
                <div className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                  {user.initials}
                </div>
                <span className="text-gray-700">{user.fullName.split(' ')[0]}</span>
              </div>
            ))}

            {/* Resources */}
            {phase.assignedResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full text-sm"
              >
                <Truck className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700">{resource.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for assignments */}
        {phase.assignedUsers.length === 0 && phase.assignedResources.length === 0 && (
          <div className="flex items-center gap-2 pt-3 border-t text-gray-400 text-sm">
            <Users className="h-4 w-4" />
            <span>Keine Zuweisungen</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
