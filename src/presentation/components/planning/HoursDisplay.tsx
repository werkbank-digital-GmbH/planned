'use client';

import { CheckCircle2, CalendarClock, Target } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/popover';

import { formatHoursWithUnit } from '@/lib/format';
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

  // Gemeinsame Button-Styles für Klick-Interaktion
  const buttonStyles = cn(
    'inline-flex items-center gap-0.5',
    'cursor-pointer rounded px-1 py-0.5',
    'hover:bg-gray-100',
    'active:scale-95 transition-transform duration-75',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
  );

  return (
    <div className={cn('flex items-center gap-2', textSize, 'text-gray-500', className)}>
      {/* IST - Tatsächlich geleistete Stunden */}
      {ist !== undefined && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={buttonStyles}>
              <CheckCircle2 className={cn(iconSize, 'text-green-600')} />
              <span>{formatHoursWithUnit(ist)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[200px] text-sm">
            <p className="font-medium">Ist-Stunden</p>
            <p className="text-xs text-muted-foreground">
              Tatsächlich geleistete Stunden (aus Asana)
            </p>
          </PopoverContent>
        </Popover>
      )}

      {/* PLAN - Geplante Stunden aus Allocations */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={buttonStyles}>
            <CalendarClock className={cn(iconSize, 'text-blue-600')} />
            <span>{formatHoursWithUnit(plan)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="max-w-[200px] text-sm">
          <p className="font-medium">Plan-Stunden</p>
          <p className="text-xs text-muted-foreground">
            In dieser Woche/diesem Monat geplante Stunden
          </p>
        </PopoverContent>
      </Popover>

      {/* SOLL - Budget aus Asana */}
      {soll !== undefined && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={buttonStyles}>
              <Target className={cn(iconSize, 'text-orange-600')} />
              <span>{formatHoursWithUnit(soll)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[200px] text-sm">
            <p className="font-medium">Soll-Stunden</p>
            <p className="text-xs text-muted-foreground">
              Budget für diese Phase (aus Asana)
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
