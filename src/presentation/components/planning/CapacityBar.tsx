'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';

import { cn } from '@/lib/utils';

interface CapacityBarProps {
  /** Geplante Stunden */
  planned: number;
  /** Tatsächlich gebuchte Stunden */
  actual: number;
  /** Verfügbare Kapazität (z.B. 8h pro Tag) */
  capacity: number;
  /** Ob Label angezeigt werden soll */
  showLabel?: boolean;
}

/**
 * Auslastungsbalken für die Kapazitätsanzeige.
 *
 * Zeigt visuell die Auslastung (geplant vs. Kapazität)
 * und optional die tatsächlich gebuchten Stunden.
 */
export function CapacityBar({
  planned,
  actual,
  capacity,
  showLabel = true,
}: CapacityBarProps) {
  const utilizationPercent = capacity > 0 ? (planned / capacity) * 100 : 0;
  const actualPercent = capacity > 0 ? (actual / capacity) * 100 : 0;

  // Farben basierend auf Auslastung
  const getBarColor = (percent: number) => {
    if (percent > 100) return 'bg-red-500';
    if (percent >= 90) return 'bg-orange-500';
    if (percent >= 70) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1">
          {showLabel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Auslastung</span>
              <span
                className={cn(
                  'font-medium',
                  utilizationPercent > 100 && 'text-red-600',
                  utilizationPercent >= 90 &&
                    utilizationPercent <= 100 &&
                    'text-orange-600'
                )}
              >
                {Math.round(utilizationPercent)}%
              </span>
            </div>
          )}

          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            {/* Geplante Stunden */}
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all',
                getBarColor(utilizationPercent)
              )}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />

            {/* Überbuchung */}
            {utilizationPercent > 100 && (
              <div
                className="absolute inset-y-0 right-0 animate-pulse rounded-full bg-red-500"
                style={{ width: `${Math.min(utilizationPercent - 100, 20)}%` }}
              />
            )}

            {/* Tatsächliche Stunden als Overlay-Linie */}
            {actual > 0 && (
              <div
                className="absolute top-0 h-2 w-0.5 bg-foreground/60"
                style={{
                  left: `${Math.min(actualPercent, 100)}%`,
                }}
              />
            )}
          </div>

          {showLabel && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {planned}h / {capacity}h geplant
              </span>
              {actual > 0 && <span>{actual}h gebucht</span>}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <div>Geplant: {planned}h</div>
          <div>Gebucht: {actual}h</div>
          <div>Kapazität: {capacity}h</div>
          <div>Auslastung: {Math.round(utilizationPercent)}%</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
