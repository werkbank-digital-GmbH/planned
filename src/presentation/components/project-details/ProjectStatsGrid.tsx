'use client';

import { CheckCircle2, Clock, Timer } from 'lucide-react';

import type { ProjectDetailsDTO } from '@/presentation/actions/project-details';
import { Card, CardContent } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectStatsGridProps {
  project: ProjectDetailsDTO;
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
  progressColor?: string;
  icon: React.ReactNode;
  badge?: { text: string; color: string };
}

function StatCard({
  title,
  value,
  subtitle,
  progress,
  progressColor = 'bg-accent',
  icon,
  badge,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{value}</span>
              {badge && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    badge.color
                  )}
                >
                  {badge.text}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>

        {progress !== undefined && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Statistik-Grid für die Projekt-Detailseite.
 *
 * Zeigt 3 Karten:
 * - Gesamtfortschritt (%)
 * - Soll-Stunden (Budget)
 * - IST-Stunden (mit Prozent des Budgets)
 */
export function ProjectStatsGrid({ project }: ProjectStatsGridProps) {
  const { progressPercent, totalBudgetHours, totalActualHours } = project;

  // IST-Stunden Prozent vom Budget
  const actualPercent =
    totalBudgetHours > 0
      ? Math.round((totalActualHours / totalBudgetHours) * 100)
      : 0;

  // Farbe basierend auf Fortschritt
  const progressColor =
    progressPercent >= 100
      ? 'bg-green-500'
      : progressPercent >= 75
        ? 'bg-yellow-500'
        : 'bg-accent';

  // Farbe für IST-Stunden (rot wenn über Budget)
  const actualColor =
    totalActualHours > totalBudgetHours ? 'bg-red-500' : 'bg-gray-800';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Gesamtfortschritt */}
      <StatCard
        title="Gesamtfortschritt"
        value={`${progressPercent}%`}
        icon={<CheckCircle2 className="h-6 w-6" />}
        progress={progressPercent}
        progressColor={progressColor}
      />

      {/* Soll-Stunden */}
      <StatCard
        title="Soll-Stunden"
        value={`${totalBudgetHours}`}
        subtitle="Geplant laut Angebot"
        icon={<Clock className="h-6 w-6" />}
      />

      {/* IST-Stunden */}
      <StatCard
        title="IST-Stunden"
        value={`${totalActualHours}`}
        icon={<Timer className="h-6 w-6" />}
        badge={{
          text: `${actualPercent}%`,
          color:
            actualPercent > 100
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700',
        }}
        progress={actualPercent}
        progressColor={actualColor}
      />
    </div>
  );
}
