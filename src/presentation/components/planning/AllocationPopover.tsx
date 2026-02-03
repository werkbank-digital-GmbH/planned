'use client';

import { AlertCircle, Calendar, Clock, Target, Truck, User } from 'lucide-react';

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

export interface AllocationPopoverData {
  /** Name des Zugewiesenen (User oder Resource) */
  displayName: string;
  /** Voller Name (für Tooltip) */
  fullName?: string;
  /** Ob es ein User ist (sonst Resource) */
  isUser: boolean;
  /** Anzahl der Tage im Span */
  spanDays: number;
  /** Geplante Stunden für diesen Tag/Span */
  plannedHours: number;
  /** Tatsächlich gebuchte Stunden */
  actualHours?: number;
  /** Budget-Stunden für die Phase */
  budgetHours?: number;
  /** Phase-Name */
  phaseName: string;
  /** Projekt-Name */
  projectName?: string;
  /** Notizen */
  notes?: string;
  /** Konflikt-Typ (z.B. "vacation") */
  conflictType?: string;
}

interface AllocationPopoverProps {
  /** Daten für den Popover-Inhalt */
  data: AllocationPopoverData;
  /** Trigger-Element (die Card) */
  children: React.ReactNode;
  /** Zusätzliche Klassen für den Trigger-Wrapper */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Übersetzt Konflikt-Typen ins Deutsche */
function translateConflictType(type: string): string {
  const translations: Record<string, string> = {
    vacation: 'Urlaub',
    sick: 'Krank',
    holiday: 'Feiertag',
    training: 'Schulung',
    other: 'Sonstige',
  };
  return translations[type] ?? type;
}

/** Erzeugt das Tage-Label */
function getSpanLabel(spanDays: number): string | null {
  if (spanDays === 1) return null;
  if (spanDays === 5) return 'Mo-Fr';
  return `${spanDays} Tage`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Popover mit Details zu einer Allocation.
 *
 * Zeigt bei Klick auf eine AssignmentCard:
 * - Name und Icon (User/Resource)
 * - Tage-Span (Mo-Fr, 3 Tage, etc.)
 * - Stunden: IST / PLAN / SOLL
 * - Phase und Projekt
 * - Notizen (falls vorhanden)
 * - Konflikt-Warnung (falls vorhanden)
 */
export function AllocationPopover({
  data,
  children,
  className,
}: AllocationPopoverProps) {
  const spanLabel = getSpanLabel(data.spanDays);
  const hasConflict = !!data.conflictType;
  const hasVariance = data.actualHours !== undefined && data.actualHours !== data.plannedHours;

  // Berechne Auslastung wenn Budget vorhanden
  const utilization = data.budgetHours
    ? Math.round((data.plannedHours / data.budgetHours) * 100)
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn('cursor-pointer', className)}>{children}</div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header mit Name und Icon */}
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'p-1.5 rounded',
                data.isUser ? 'bg-blue-100' : 'bg-orange-100'
              )}
            >
              {data.isUser ? (
                <User className="h-4 w-4 text-blue-700" />
              ) : (
                <Truck className="h-4 w-4 text-orange-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {data.fullName ?? data.displayName}
              </p>
              {spanLabel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {spanLabel}
                </p>
              )}
            </div>
          </div>

          {/* Stunden-Bereich */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* IST */}
            {data.actualHours !== undefined && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">IST</span>
                </div>
                <p className="text-sm font-semibold">
                  {formatHoursWithUnit(data.actualHours)}
                </p>
              </div>
            )}

            {/* PLAN */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <Calendar className="h-3 w-3" />
                <span className="text-xs font-medium">PLAN</span>
              </div>
              <p className="text-sm font-semibold">
                {formatHoursWithUnit(data.plannedHours)}
              </p>
            </div>

            {/* SOLL */}
            {data.budgetHours !== undefined && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-orange-600">
                  <Target className="h-3 w-3" />
                  <span className="text-xs font-medium">SOLL</span>
                </div>
                <p className="text-sm font-semibold">
                  {formatHoursWithUnit(data.budgetHours)}
                </p>
              </div>
            )}
          </div>

          {/* Auslastung */}
          {utilization !== null && (
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Auslastung</span>
                <span
                  className={cn(
                    'font-medium',
                    utilization > 100
                      ? 'text-red-600'
                      : utilization > 80
                        ? 'text-orange-600'
                        : 'text-green-600'
                  )}
                >
                  {utilization}%
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    utilization > 100
                      ? 'bg-red-500'
                      : utilization > 80
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Varianz-Hinweis */}
          {hasVariance && (
            <p className="text-xs text-muted-foreground">
              Abweichung:{' '}
              <span
                className={cn(
                  'font-medium',
                  data.actualHours! > data.plannedHours
                    ? 'text-red-600'
                    : 'text-green-600'
                )}
              >
                {data.actualHours! > data.plannedHours ? '+' : ''}
                {formatHoursWithUnit(data.actualHours! - data.plannedHours)}
              </span>
            </p>
          )}

          {/* Phase & Projekt */}
          <div className="pt-1 border-t text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{data.phaseName}</span>
            </p>
            {data.projectName && (
              <p className="truncate">{data.projectName}</p>
            )}
          </div>

          {/* Notizen */}
          {data.notes && (
            <p className="text-xs italic text-muted-foreground border-t pt-1">
              {data.notes}
            </p>
          )}

          {/* Konflikt-Warnung */}
          {hasConflict && (
            <div className="flex items-center gap-1.5 p-2 bg-red-50 rounded text-red-700 text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Konflikt: {translateConflictType(data.conflictType!)}
              </span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
