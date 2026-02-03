import { TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { formatHoursWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TeamCapacityMetrics {
  activeUsers: number;
  weeklyCapacity: number;
  plannedHours: number;
  freeCapacity: number;
  utilizationPercent: number;
}

interface TeamCapacityCardProps {
  data: TeamCapacityMetrics;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt Team-Kapazitäts-Metriken an.
 *
 * Features:
 * - Aktive Mitarbeiter
 * - Wochen-Kapazität
 * - Geplante Stunden
 * - Freie/Überbuchte Kapazität
 * - Auslastungsbalken
 */
export function TeamCapacityCard({ data }: TeamCapacityCardProps) {
  const { activeUsers, weeklyCapacity, plannedHours, freeCapacity, utilizationPercent } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team-Kapazität
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <div className="text-sm text-gray-500">Aktive Mitarbeiter</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatHoursWithUnit(weeklyCapacity)}</div>
            <div className="text-sm text-gray-500">Wochen-Kapazität</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatHoursWithUnit(plannedHours)}</div>
            <div className="text-sm text-gray-500">Geplant</div>
          </div>
          <div>
            <div
              className={cn(
                'text-2xl font-bold',
                freeCapacity < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatHoursWithUnit(freeCapacity)}
            </div>
            <div className="text-sm text-gray-500">
              {freeCapacity < 0 ? 'Überbucht' : 'Frei'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Auslastung
            </span>
            <span className={cn(utilizationPercent > 100 && 'text-red-600')}>
              {utilizationPercent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                utilizationPercent > 100
                  ? 'bg-red-500'
                  : utilizationPercent >= 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              )}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
