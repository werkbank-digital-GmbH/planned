'use client';

import { CheckCircle2, CalendarClock, Target } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HoursDisplayProps {
  /** Ist-Stunden: Tatsächlich geleistete Stunden (aus Asana) */
  ist?: number;
  /** Plan-Stunden: In dieser Periode geplante Stunden (Summe Allocations) */
  plan: number;
  /** Soll-Stunden: Budget für diese Phase/Projekt (aus Asana) */
  soll?: number;
  /** Styling-Variante */
  variant?: 'project' | 'phase';
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatiert Stunden: Dezimalstelle nur wenn nötig
 * - 24.0 → "24"
 * - 12.5 → "12.5"
 * - 0 → "0"
 */
function formatHours(hours: number | undefined): string {
  if (hours === undefined || hours === null) return '0';
  // Auf eine Dezimalstelle runden
  const rounded = Math.round(hours * 10) / 10;
  // Dezimalstelle nur anzeigen wenn nötig
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt IST / PLAN / SOLL Stunden nebeneinander mit Symbolen und Tooltips.
 *
 * @example
 * ```tsx
 * <HoursDisplay
 *   ist={36.8}
 *   plan={40}
 *   soll={100}
 *   variant="project"
 * />
 * ```
 */
export function HoursDisplay({
  ist,
  plan,
  soll,
  variant = 'phase',
  className,
}: HoursDisplayProps) {
  const isProject = variant === 'project';
  const iconSize = isProject ? 'h-3 w-3' : 'h-3 w-3';
  const textSize = isProject ? 'text-xs' : 'text-xs';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-2', textSize, 'text-gray-500', className)}>
        {/* IST - Tatsächlich geleistete Stunden */}
        {ist !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 cursor-default">
                <CheckCircle2 className={cn(iconSize, 'text-green-600')} />
                <span>{formatHours(ist)}h</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Ist-Stunden: Tatsächlich geleistete Stunden (aus Asana)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* PLAN - Geplante Stunden aus Allocations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-0.5 cursor-default">
              <CalendarClock className={cn(iconSize, 'text-blue-600')} />
              <span>{formatHours(plan)}h</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Plan-Stunden: In dieser Woche/diesem Monat geplante Stunden</p>
          </TooltipContent>
        </Tooltip>

        {/* SOLL - Budget aus Asana */}
        {soll !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 cursor-default">
                <Target className={cn(iconSize, 'text-orange-600')} />
                <span>{formatHours(soll)}h</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Soll-Stunden: Budget für diese Phase (aus Asana)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
