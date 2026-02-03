import type { PhaseInsight, ProjectInsight, InsightStatus } from './types';

/**
 * Input für die Projekt-Aggregation.
 */
export interface ProjectAggregationInput {
  tenantId: string;
  projectId: string;
  projectName: string;
  phaseInsights: PhaseInsight[];
  phaseDeadlines: Map<string, Date | null>; // phaseId -> deadline
}

/**
 * Aggregiert Phase-Insights zu einem Project-Insight.
 *
 * - Summierte Stunden (SOLL, IST, PLAN, Remaining)
 * - Phase-Status Zählung (on_track, at_risk, behind, etc.)
 * - Projekt-Status aus schlimmster Phase
 * - Projiziertes Projektende
 */
export class ProjectInsightAggregator {
  /**
   * Aggregiert Phase-Insights zu einem Project-Insight.
   */
  aggregate(input: ProjectAggregationInput, insightDate: string): Omit<ProjectInsight, 'id' | 'created_at'> {
    const { tenantId, projectId, phaseInsights, phaseDeadlines } = input;

    // Wenn keine Phase-Insights vorhanden, minimales Insight erstellen
    if (phaseInsights.length === 0) {
      return {
        tenant_id: tenantId,
        project_id: projectId,
        insight_date: insightDate,
        total_soll_hours: 0,
        total_ist_hours: 0,
        total_plan_hours: 0,
        total_remaining_hours: 0,
        overall_progress_percent: 0,
        phases_count: 0,
        phases_on_track: 0,
        phases_at_risk: 0,
        phases_behind: 0,
        phases_completed: 0,
        latest_phase_deadline: null,
        projected_completion_date: null,
        project_deadline_delta: null,
        status: 'unknown',
        summary_text: 'Keine aktiven Phasen vorhanden.',
        detail_text: null,
        recommendation_text: null,
      };
    }

    // Stunden aggregieren
    let totalSoll = 0;
    let totalIst = 0;
    const totalPlan = 0; // TODO: Plan-Stunden aus Snapshots aggregieren wenn verfügbar
    let totalRemaining = 0;

    for (const pi of phaseInsights) {
      // Wir brauchen die Stunden aus dem neuesten Snapshot
      // Da wir nur die Insights haben, nutzen wir die remaining_hours
      // und berechnen rückwärts (oder wir müssen die Snapshots übergeben)
      // Für jetzt: wir nehmen an, remaining_hours ist korrekt
      if (pi.remaining_hours !== null) {
        totalRemaining += pi.remaining_hours;
      }
      if (pi.progress_percent !== null && pi.remaining_hours !== null) {
        // IST = (progress / 100) * SOLL
        // SOLL = IST + remaining
        // Also: SOLL = (progress / 100) * SOLL + remaining
        // => SOLL * (1 - progress/100) = remaining
        // => SOLL = remaining / (1 - progress/100)
        if (pi.progress_percent < 100) {
          const estimatedSoll = pi.remaining_hours / (1 - pi.progress_percent / 100);
          const estimatedIst = estimatedSoll - pi.remaining_hours;
          totalSoll += estimatedSoll;
          totalIst += estimatedIst;
        } else {
          // 100% progress = fertig, remaining sollte 0 sein
          totalIst += pi.remaining_hours; // Falls nicht 0
        }
      }
    }

    // Progress berechnen
    const overallProgress = totalSoll > 0 ? Math.round((totalIst / totalSoll) * 100) : 0;

    // Status zählen
    const statusCounts = this.countStatuses(phaseInsights);

    // Späteste Deadline finden
    let latestDeadline: Date | null = null;
    for (const [, deadline] of phaseDeadlines) {
      if (deadline && (!latestDeadline || deadline > latestDeadline)) {
        latestDeadline = deadline;
      }
    }

    // Projiziertes Projektende: spätestes completion_date_ist
    let projectedCompletion: Date | null = null;
    for (const pi of phaseInsights) {
      if (pi.completion_date_ist) {
        const date = new Date(pi.completion_date_ist);
        if (!projectedCompletion || date > projectedCompletion) {
          projectedCompletion = date;
        }
      }
    }

    // Projekt-Deadline-Delta berechnen
    let projectDeadlineDelta: number | null = null;
    if (latestDeadline && projectedCompletion) {
      const deltaMs = projectedCompletion.getTime() - latestDeadline.getTime();
      projectDeadlineDelta = Math.round(deltaMs / (1000 * 60 * 60 * 24));
    }

    // Projekt-Status aus schlimmster Phase
    const projectStatus = this.determineProjectStatus(phaseInsights);

    return {
      tenant_id: tenantId,
      project_id: projectId,
      insight_date: insightDate,
      total_soll_hours: totalSoll,
      total_ist_hours: totalIst,
      total_plan_hours: totalPlan,
      total_remaining_hours: totalRemaining,
      overall_progress_percent: overallProgress,
      phases_count: phaseInsights.length,
      phases_on_track: statusCounts.on_track + statusCounts.ahead,
      phases_at_risk: statusCounts.at_risk,
      phases_behind: statusCounts.behind + statusCounts.critical,
      phases_completed: statusCounts.completed,
      latest_phase_deadline: latestDeadline?.toISOString().split('T')[0] || null,
      projected_completion_date: projectedCompletion?.toISOString().split('T')[0] || null,
      project_deadline_delta: projectDeadlineDelta,
      status: projectStatus,
      // Texte werden später vom KI-Service generiert
      summary_text: '',
      detail_text: null,
      recommendation_text: null,
    };
  }

  /**
   * Zählt die verschiedenen Status der Phasen.
   */
  private countStatuses(
    insights: PhaseInsight[]
  ): Record<InsightStatus, number> {
    const counts: Record<InsightStatus, number> = {
      on_track: 0,
      ahead: 0,
      at_risk: 0,
      behind: 0,
      critical: 0,
      not_started: 0,
      completed: 0,
      unknown: 0,
    };

    for (const insight of insights) {
      counts[insight.status]++;
    }

    return counts;
  }

  /**
   * Bestimmt den Projekt-Status aus den schlimmsten Phase-Status.
   */
  private determineProjectStatus(insights: PhaseInsight[]): InsightStatus {
    // Priorität: critical > behind > at_risk > on_track > ahead
    // Spezialfälle: not_started, completed, unknown
    const statusPriority: InsightStatus[] = [
      'critical',
      'behind',
      'at_risk',
      'on_track',
      'ahead',
      'not_started',
      'completed',
      'unknown',
    ];

    // Finde den "schlimmsten" Status
    for (const status of statusPriority) {
      if (insights.some((i) => i.status === status)) {
        return status;
      }
    }

    return 'unknown';
  }
}

/**
 * Singleton-Instanz für einfachen Import.
 */
export const projectInsightAggregator = new ProjectInsightAggregator();
