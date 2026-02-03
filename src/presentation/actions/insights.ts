'use server';

/**
 * Insights Server Actions
 *
 * Server Actions für Analytics-Insights:
 * - Tenant-weite KPI-Zusammenfassung für Dashboard
 */

import type {
  BurnRateTrend,
  DataQuality,
  InsightStatus,
  PhaseInsight,
} from '@/domain/analytics/types';
import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';

import { SupabaseAnalyticsRepository } from '@/infrastructure/repositories/SupabaseAnalyticsRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RiskProjectDTO {
  id: string;
  name: string;
  status: InsightStatus;
  phasesAtRisk: number;
}

export interface TenantInsightsDTO {
  projectsAtRisk: number;
  projectsOnTrack: number;
  totalProjects: number;
  criticalPhasesCount: number;
  averageProgressPercent: number;
  burnRateTrend: BurnRateTrend;
  topRiskProjects: RiskProjectDTO[];
  lastUpdatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den aktuellen User mit Tenant-Daten.
 */
async function getCurrentUserWithTenant() {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Nicht eingeloggt');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    throw new Error('User nicht gefunden');
  }

  return {
    id: userData.id,
    role: userData.role as UserRole,
    tenantId: userData.tenant_id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET TENANT INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt aggregierte Insights für das Dashboard.
 *
 * Aggregiert Daten aus project_insights für den Tenant:
 * - Projekte nach Status
 * - Durchschnittlicher Fortschritt
 * - Top 3 Risiko-Projekte
 * - Letztes Update-Datum
 */
export async function getTenantInsightsAction(): Promise<ActionResult<TenantInsightsDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin sehen die Insights
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const analyticsRepo = new SupabaseAnalyticsRepository(supabase);

    const summary = await analyticsRepo.getTenantInsightsSummary(currentUser.tenantId);

    return Result.ok(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT INSIGHTS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseInsightDTO {
  id: string;
  phaseId: string;
  phaseName: string;
  status: InsightStatus;
  progressPercent: number | null;
  summaryText: string;
  detailText: string | null;
  recommendationText: string | null;
  burnRateIst: number | null;
  burnRateTrend: BurnRateTrend | null;
  remainingHours: number | null;
  deadlineDeltaIst: number | null;
  dataQuality: DataQuality | null;
}

export interface ProjectInsightDTO {
  projectInsight: {
    id: string;
    projectId: string;
    status: InsightStatus;
    overallProgressPercent: number | null;
    summaryText: string;
    detailText: string | null;
    recommendationText: string | null;
    phasesOnTrack: number | null;
    phasesAtRisk: number | null;
    phasesBehind: number | null;
    totalSollHours: number | null;
    totalIstHours: number | null;
    projectedCompletionDate: string | null;
    projectDeadlineDelta: number | null;
  } | null;
  phaseInsights: PhaseInsightDTO[];
  generatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECT INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt Insights für ein spezifisches Projekt.
 *
 * Enthält:
 * - Project-Level Insight (Zusammenfassung)
 * - Phase-Level Insights (Details pro Phase)
 * - Generierungszeitpunkt
 */
export async function getProjectInsightsAction(
  projectId: string
): Promise<ActionResult<ProjectInsightDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin sehen die Insights
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const analyticsRepo = new SupabaseAnalyticsRepository(supabase);

    // Prüfe, ob Projekt zum Tenant gehört
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return Result.fail('NOT_FOUND', 'Projekt nicht gefunden');
    }

    if (projectData.tenant_id !== currentUser.tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung für dieses Projekt');
    }

    // Hole Project Insight
    const projectInsight = await analyticsRepo.getLatestProjectInsight(projectId);

    // Hole Phase IDs für dieses Projekt
    const { data: phases } = await supabase
      .from('project_phases')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order');

    const phaseIds = (phases ?? []).map((p) => p.id);
    const phaseNameMap = new Map((phases ?? []).map((p) => [p.id, p.name]));

    // Hole Phase Insights
    const phaseInsights = phaseIds.length > 0
      ? await analyticsRepo.getLatestInsightsForPhases(phaseIds)
      : [];

    // Mappe zu DTOs
    const phaseInsightDTOs: PhaseInsightDTO[] = phaseInsights.map((pi: PhaseInsight) => ({
      id: pi.id,
      phaseId: pi.phase_id,
      phaseName: phaseNameMap.get(pi.phase_id) ?? 'Unbekannte Phase',
      status: pi.status,
      progressPercent: pi.progress_percent,
      summaryText: pi.summary_text,
      detailText: pi.detail_text,
      recommendationText: pi.recommendation_text,
      burnRateIst: pi.burn_rate_ist,
      burnRateTrend: pi.burn_rate_ist_trend,
      remainingHours: pi.remaining_hours,
      deadlineDeltaIst: pi.deadline_delta_ist,
      dataQuality: pi.data_quality,
    }));

    const projectInsightDTO: ProjectInsightDTO = {
      projectInsight: projectInsight
        ? {
            id: projectInsight.id,
            projectId: projectInsight.project_id,
            status: projectInsight.status,
            overallProgressPercent: projectInsight.overall_progress_percent,
            summaryText: projectInsight.summary_text,
            detailText: projectInsight.detail_text,
            recommendationText: projectInsight.recommendation_text,
            phasesOnTrack: projectInsight.phases_on_track,
            phasesAtRisk: projectInsight.phases_at_risk,
            phasesBehind: projectInsight.phases_behind,
            totalSollHours: projectInsight.total_soll_hours,
            totalIstHours: projectInsight.total_ist_hours,
            projectedCompletionDate: projectInsight.projected_completion_date,
            projectDeadlineDelta: projectInsight.project_deadline_delta,
          }
        : null,
      phaseInsights: phaseInsightDTOs,
      generatedAt: projectInsight?.created_at ?? null,
    };

    return Result.ok(projectInsightDTO);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
