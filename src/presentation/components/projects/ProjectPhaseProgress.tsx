'use client';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseSummary {
  id: string;
  name: string;
  bereich: string;
  sollHours: number;
  planHours: number;
  istHours: number;
  planPercentage: number;
  istPercentage: number;
  isOverBudget: boolean;
  isOverPlanned: boolean;
}

interface ProjectPhaseProgressProps {
  phase: PhaseSummary;
  /** Kompakte Darstellung ohne Labels */
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt den Fortschritt einer Projektphase mit SOLL/PLAN/IST.
 *
 * Features:
 * - Zwei Fortschrittsbalken: PLAN (blau) und IST (grün)
 * - Prozent- und Stundenanzeige
 * - Warnung bei Über-Budget oder Überplanung
 * - Kompakter Modus für Listen
 *
 * @example
 * ```tsx
 * <ProjectPhaseProgress
 *   phase={{
 *     id: '1',
 *     name: 'Elementierung',
 *     bereich: 'produktion',
 *     sollHours: 120,
 *     planHours: 100,
 *     istHours: 95,
 *     planPercentage: 83,
 *     istPercentage: 79,
 *     isOverBudget: false,
 *     isOverPlanned: false,
 *   }}
 * />
 * ```
 */
export function ProjectPhaseProgress({ phase, compact = false }: ProjectPhaseProgressProps) {
  const { sollHours, planHours, istHours, planPercentage, istPercentage, isOverBudget, isOverPlanned } = phase;

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Kompakte Progress Bars */}
        <div className="flex items-center gap-2">
          <span className="w-8 text-xs text-gray-400">PLAN</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full',
                isOverPlanned ? 'bg-red-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(planPercentage, 100)}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs text-gray-500">{planPercentage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-xs text-gray-400">IST</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full',
                isOverBudget ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(istPercentage, 100)}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs text-gray-500">{istPercentage}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{phase.name}</span>
        <span className="text-gray-500">{sollHours}h SOLL</span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-1">
        {/* PLAN */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs text-gray-500">PLAN</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isOverPlanned ? 'bg-red-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(planPercentage, 100)}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs">
            {planHours}h ({planPercentage}%)
          </span>
        </div>

        {/* IST */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs text-gray-500">IST</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isOverBudget ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(istPercentage, 100)}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs">
            {istHours}h ({istPercentage}%)
          </span>
        </div>
      </div>

      {/* Warnings */}
      {(isOverBudget || isOverPlanned) && (
        <div className="flex gap-2 text-xs">
          {isOverPlanned && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
              Überplant
            </span>
          )}
          {isOverBudget && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
              Über Budget
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectPhasesOverviewProps {
  phases: PhaseSummary[];
  /** Gruppiert nach Bereich (Produktion/Montage) */
  groupByBereich?: boolean;
}

/**
 * Zeigt eine Übersicht aller Phasen eines Projekts.
 */
export function ProjectPhasesOverview({ phases, groupByBereich = true }: ProjectPhasesOverviewProps) {
  if (phases.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-gray-500">
        Keine Phasen vorhanden.
      </div>
    );
  }

  if (!groupByBereich) {
    return (
      <div className="space-y-4">
        {phases.map((phase) => (
          <ProjectPhaseProgress key={phase.id} phase={phase} />
        ))}
      </div>
    );
  }

  // Gruppieren nach Bereich
  const produktionPhases = phases.filter((p) => p.bereich === 'produktion');
  const montagePhases = phases.filter((p) => p.bereich === 'montage');

  return (
    <div className="space-y-6">
      {produktionPhases.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase text-gray-400">
            Produktion
          </h4>
          <div className="space-y-4">
            {produktionPhases.map((phase) => (
              <ProjectPhaseProgress key={phase.id} phase={phase} />
            ))}
          </div>
        </div>
      )}

      {montagePhases.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase text-gray-400">
            Montage
          </h4>
          <div className="space-y-4">
            {montagePhases.map((phase) => (
              <ProjectPhaseProgress key={phase.id} phase={phase} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY BAR
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectSummaryBarProps {
  phases: PhaseSummary[];
}

/**
 * Kompakte Zusammenfassung aller Phasen eines Projekts.
 */
export function ProjectSummaryBar({ phases }: ProjectSummaryBarProps) {
  const totalSoll = phases.reduce((sum, p) => sum + p.sollHours, 0);
  const totalPlan = phases.reduce((sum, p) => sum + p.planHours, 0);
  const totalIst = phases.reduce((sum, p) => sum + p.istHours, 0);

  const planPercent = totalSoll > 0 ? Math.round((totalPlan / totalSoll) * 100) : 0;
  const istPercent = totalSoll > 0 ? Math.round((totalIst / totalSoll) * 100) : 0;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">SOLL:</span>
        <span className="font-medium">{totalSoll}h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">PLAN:</span>
        <span className={cn('font-medium', planPercent > 100 && 'text-red-600')}>
          {totalPlan}h ({planPercent}%)
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">IST:</span>
        <span className={cn('font-medium', istPercent > 100 && 'text-red-600')}>
          {totalIst}h ({istPercent}%)
        </span>
      </div>
    </div>
  );
}
