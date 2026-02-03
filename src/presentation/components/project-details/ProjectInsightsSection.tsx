'use client';

import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

import type { PhaseInsightDTO, ProjectInsightDTO } from '@/presentation/actions/insights';
import { Button } from '@/presentation/components/ui/button';

import { cn } from '@/lib/utils';

import { InsightCard } from './InsightCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectInsightsSectionProps {
  projectInsight: ProjectInsightDTO['projectInsight'];
  phaseInsights: PhaseInsightDTO[];
  generatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sektion für KI-generierte Insights in der Projekt-Detailansicht.
 *
 * Zeigt:
 * - Projekt-Level Insight (oben, prominent)
 * - Phase-Level Insights (darunter, collapsible)
 */
export function ProjectInsightsSection({
  projectInsight,
  phaseInsights,
  generatedAt,
}: ProjectInsightsSectionProps) {
  const [showPhaseInsights, setShowPhaseInsights] = useState(false);

  const hasProjectInsight = projectInsight !== null;
  const hasPhaseInsights = phaseInsights.length > 0;
  const hasAnyInsights = hasProjectInsight || hasPhaseInsights;

  if (!hasAnyInsights) {
    return (
      <section className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">KI-INSIGHTS</h2>
        </div>

        {/* Empty State */}
        <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
          <Brain className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p>Noch keine Insights verfügbar</p>
          <p className="mt-1 text-sm text-gray-400">
            Die erste Analyse wird um 05:15 Uhr generiert
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">KI-INSIGHTS</h2>
        </div>
        {generatedAt && (
          <span className="text-xs text-gray-400">
            Stand: {new Date(generatedAt).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })} Uhr
          </span>
        )}
      </div>

      {/* Projekt-Level Insight */}
      {hasProjectInsight && (
        <InsightCard
          title="Projekt-Übersicht"
          status={projectInsight.status}
          summaryText={projectInsight.summaryText}
          detailText={projectInsight.detailText}
          recommendationText={projectInsight.recommendationText}
          progressPercent={projectInsight.overallProgressPercent}
          deadlineDelta={projectInsight.projectDeadlineDelta}
          variant="project"
        />
      )}

      {/* Phase Insights (collapsible) */}
      {hasPhaseInsights && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPhaseInsights(!showPhaseInsights)}
            className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900"
          >
            {showPhaseInsights ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Phasen-Details ({phaseInsights.length})</span>
          </Button>

          {showPhaseInsights && (
            <div className="space-y-2 pl-2">
              {phaseInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  title={insight.phaseName}
                  status={insight.status}
                  summaryText={insight.summaryText}
                  detailText={insight.detailText}
                  recommendationText={insight.recommendationText}
                  progressPercent={insight.progressPercent}
                  burnRateTrend={insight.burnRateTrend}
                  remainingHours={insight.remainingHours}
                  deadlineDelta={insight.deadlineDeltaIst}
                  dataQuality={insight.dataQuality}
                  variant="phase"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights Stats Summary */}
      {hasProjectInsight && (
        <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          {projectInsight.phasesOnTrack !== null && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-gray-600">{projectInsight.phasesOnTrack} im Plan</span>
            </div>
          )}
          {projectInsight.phasesAtRisk !== null && projectInsight.phasesAtRisk > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-gray-600">{projectInsight.phasesAtRisk} gefährdet</span>
            </div>
          )}
          {projectInsight.phasesBehind !== null && projectInsight.phasesBehind > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-gray-600">{projectInsight.phasesBehind} im Verzug</span>
            </div>
          )}
          {projectInsight.totalSollHours !== null && projectInsight.totalIstHours !== null && (
            <div className={cn('ml-auto text-gray-500')}>
              {projectInsight.totalIstHours}h / {projectInsight.totalSollHours}h
            </div>
          )}
        </div>
      )}
    </section>
  );
}
