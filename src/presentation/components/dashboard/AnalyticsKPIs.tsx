import { Activity, AlertCircle, AlertTriangle, TrendingUp } from 'lucide-react';

import type { TenantInsightsDTO } from '@/presentation/actions/insights';
import { Card, CardContent } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AnalyticsKPIsProps {
  data: TenantInsightsDTO;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, subValue, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: 'text-gray-900',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    success: 'text-green-600',
  };

  const iconBgStyles = {
    default: 'bg-gray-100 text-gray-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
    success: 'bg-green-100 text-green-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2', iconBgStyles[variant])}>{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{label}</p>
            <p className={cn('text-2xl font-bold', variantStyles[variant])}>{value}</p>
            {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS KPIS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt Analytics-KPIs für das Dashboard an.
 *
 * 4 KPI-Karten:
 * - Projekte im Verzug (AlertTriangle)
 * - Durchschn. Fortschritt (TrendingUp)
 * - Kritische Phasen (AlertCircle)
 * - Burn Rate Trend (Activity)
 */
export function AnalyticsKPIs({ data }: AnalyticsKPIsProps) {
  const {
    projectsAtRisk,
    totalProjects,
    averageProgressPercent,
    criticalPhasesCount,
    burnRateTrend,
    projectsOnTrack,
  } = data;

  // Bestimme Varianten basierend auf Werten
  const riskVariant =
    projectsAtRisk === 0 ? 'success' : projectsAtRisk >= 3 ? 'danger' : 'warning';

  const progressVariant =
    averageProgressPercent >= 80
      ? 'success'
      : averageProgressPercent >= 50
        ? 'default'
        : 'warning';

  const criticalVariant =
    criticalPhasesCount === 0 ? 'success' : criticalPhasesCount >= 5 ? 'danger' : 'warning';

  const trendLabel = {
    up: 'Steigend',
    down: 'Fallend',
    stable: 'Stabil',
  };

  const trendVariant = {
    up: 'success' as const,
    down: 'danger' as const,
    stable: 'default' as const,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Projekte im Verzug"
        value={projectsAtRisk}
        subValue={`von ${totalProjects} Projekten`}
        variant={riskVariant}
      />

      <KPICard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Durchschn. Fortschritt"
        value={`${averageProgressPercent}%`}
        subValue={`${projectsOnTrack} im Plan`}
        variant={progressVariant}
      />

      <KPICard
        icon={<AlertCircle className="h-5 w-5" />}
        label="Kritische Phasen"
        value={criticalPhasesCount}
        subValue="benötigen Aufmerksamkeit"
        variant={criticalVariant}
      />

      <KPICard
        icon={<Activity className="h-5 w-5" />}
        label="Burn Rate Trend"
        value={trendLabel[burnRateTrend]}
        subValue="basierend auf IST-Stunden"
        variant={trendVariant[burnRateTrend]}
      />
    </div>
  );
}
