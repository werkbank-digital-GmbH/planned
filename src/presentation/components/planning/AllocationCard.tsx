'use client';

import { AlertTriangle, Clock } from 'lucide-react';

import type { AllocationWithDetails } from '@/application/queries';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

// Farben für verschiedene Bereiche
const BEREICH_COLORS: Record<string, string> = {
  Produktion: 'bg-blue-100 border-blue-300 text-blue-900',
  Montage: 'bg-green-100 border-green-300 text-green-900',
  Planung: 'bg-purple-100 border-purple-300 text-purple-900',
  Sonstiges: 'bg-gray-100 border-gray-300 text-gray-900',
};

interface AllocationCardProps {
  allocation: AllocationWithDetails;
  onClick?: () => void;
}

/**
 * Einzelne Zuweisungs-Karte.
 *
 * Zeigt Projekt, Phase, geplante/tatsächliche Stunden
 * und eventuelle Konflikte an.
 */
export function AllocationCard({ allocation, onClick }: AllocationCardProps) {
  const bereich = allocation.projectPhase.bereich ?? 'Sonstiges';
  const colorClass = BEREICH_COLORS[bereich] ?? BEREICH_COLORS.Sonstiges;

  const plannedHours = allocation.plannedHours ?? 0;
  const actualHours = allocation.actualHours;
  const hasVariance = actualHours > 0 && actualHours !== plannedHours;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'w-full rounded border p-2 text-left text-xs transition-colors',
            'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary',
            colorClass,
            allocation.hasAbsenceConflict && 'ring-2 ring-orange-400'
          )}
        >
          {/* Projekt */}
          <div className="truncate font-medium">{allocation.project.name}</div>

          {/* Phase */}
          <div className="truncate text-[10px] opacity-80">
            {allocation.projectPhase.name}
          </div>

          {/* Stunden */}
          <div className="mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatHoursWithUnit(plannedHours)}</span>
            {hasVariance && (
              <span className="text-[10px] opacity-70">
                ({formatHoursWithUnit(actualHours)} geb.)
              </span>
            )}
          </div>

          {/* Konflikt-Indikator */}
          {allocation.hasAbsenceConflict && (
            <div className="mt-1 flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px]">Abwesend</span>
            </div>
          )}

          {/* Resource indicator */}
          {allocation.resource && (
            <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
              <span>🚛 {allocation.resource.name}</span>
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px]">
        <div className="space-y-1">
          <div className="font-medium">{allocation.project.name}</div>
          {allocation.project.number && (
            <div className="text-xs text-muted-foreground">
              Nr. {allocation.project.number}
            </div>
          )}
          <div className="text-sm">{allocation.projectPhase.name}</div>
          <div className="text-xs">
            Bereich: <span className="font-medium">{bereich}</span>
          </div>
          <div className="text-xs">
            Geplant: <span className="font-medium">{formatHoursWithUnit(plannedHours)}</span>
            {actualHours > 0 && (
              <>
                {' '}
                | Gebucht: <span className="font-medium">{formatHoursWithUnit(actualHours)}</span>
              </>
            )}
          </div>
          {allocation.notes && (
            <div className="text-xs text-muted-foreground">
              {allocation.notes}
            </div>
          )}
          {allocation.hasAbsenceConflict && allocation.absenceType && (
            <div className="text-xs text-orange-600">
              ⚠️ Abwesenheit: {allocation.absenceType}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
