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
  PhaseSnapshot,
  SuggestedAction,
} from '@/domain/analytics/types';

import { Result, type ActionResult } from '@/application/common';

import { SupabaseAnalyticsRepository } from '@/infrastructure/repositories/SupabaseAnalyticsRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { getCurrentUserWithTenant } from '@/presentation/actions/shared/auth';

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
  /** Beschreibung der Phase aus Asana Task Notes */
  phaseDescription: string | null;
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
  /** Vorgeschlagene Aktion aus der KI-Analyse (D7) */
  suggestedAction: SuggestedAction | null;
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
  /** Projektadresse aus Asana Custom Field */
  projectAddress: string | null;
  /** Adress-Konflikt: Unterschiedliche Adressen in den Phasen */
  addressConflict: boolean;
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

    // Prüfe, ob Projekt zum Tenant gehört und lade Adress-Daten
    // Type cast notwendig da Supabase-Typen noch nicht regeneriert wurden
    const { data: projectDataRaw, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, address, address_conflict')
      .eq('id', projectId)
      .single();

    const projectData = projectDataRaw as {
      id: string;
      tenant_id: string;
      address: string | null;
      address_conflict: boolean | null;
    } | null;

    if (projectError || !projectData) {
      return Result.fail('NOT_FOUND', 'Projekt nicht gefunden');
    }

    if (projectData.tenant_id !== currentUser.tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung für dieses Projekt');
    }

    // Hole Project Insight
    const projectInsight = await analyticsRepo.getLatestProjectInsight(projectId);

    // Hole Phase IDs für dieses Projekt
    // Type cast notwendig da Supabase-Typen noch nicht regeneriert wurden
    const { data: phasesRaw } = await supabase
      .from('project_phases')
      .select('id, name, description')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order');

    const phases = (phasesRaw ?? []) as unknown as Array<{
      id: string;
      name: string;
      description: string | null;
    }>;

    const phaseIds = phases.map((p) => p.id);
    const phaseNameMap = new Map(phases.map((p) => [p.id, p.name]));
    const phaseDescriptionMap = new Map(phases.map((p) => [p.id, p.description ?? null]));

    // Hole Phase Insights
    const phaseInsights = phaseIds.length > 0
      ? await analyticsRepo.getLatestInsightsForPhases(phaseIds)
      : [];

    // Mappe zu DTOs
    const phaseInsightDTOs: PhaseInsightDTO[] = phaseInsights.map((pi: PhaseInsight) => ({
      id: pi.id,
      phaseId: pi.phase_id,
      phaseName: phaseNameMap.get(pi.phase_id) ?? 'Unbekannte Phase',
      phaseDescription: phaseDescriptionMap.get(pi.phase_id) ?? null,
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
      suggestedAction: pi.suggested_action,
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
      projectAddress: projectData.address ?? null,
      addressConflict: projectData.address_conflict ?? false,
      phaseInsights: phaseInsightDTOs,
      generatedAt: projectInsight?.created_at ?? null,
    };

    return Result.ok(projectInsightDTO);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE SNAPSHOTS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseSnapshotDTO {
  id: string;
  phaseId: string;
  snapshotDate: string;
  istHours: number;
  planHours: number;
  sollHours: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PHASE SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt Snapshots für eine Phase (für Trend-Sparklines).
 *
 * Gibt die letzten N Snapshots zurück, sortiert nach Datum aufsteigend
 * (älteste zuerst, für chronologische Darstellung).
 *
 * @param phaseId - Die Phase-ID
 * @param limit - Maximale Anzahl Snapshots (default: 14)
 */
export async function getPhaseSnapshotsAction(
  phaseId: string,
  limit: number = 14
): Promise<ActionResult<PhaseSnapshotDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin sehen die Snapshots
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const analyticsRepo = new SupabaseAnalyticsRepository(supabase);

    // Prüfe, ob Phase zum Tenant gehört
    const { data: phaseData, error: phaseError } = await supabase
      .from('project_phases')
      .select('id, project_id, projects!inner(tenant_id)')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phaseData) {
      return Result.fail('NOT_FOUND', 'Phase nicht gefunden');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantId = (phaseData.projects as any)?.tenant_id;
    if (tenantId !== currentUser.tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung für diese Phase');
    }

    // Hole Snapshots (getSnapshotsForPhase gibt absteigend zurück)
    const snapshots = await analyticsRepo.getSnapshotsForPhase(phaseId, limit);

    // Sortiere chronologisch aufsteigend (älteste zuerst)
    const sortedSnapshots = snapshots.sort(
      (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );

    // Mappe zu DTOs
    const snapshotDTOs: PhaseSnapshotDTO[] = sortedSnapshots.map((s: PhaseSnapshot) => ({
      id: s.id,
      phaseId: s.phase_id,
      snapshotDate: s.snapshot_date,
      istHours: s.ist_hours,
      planHours: s.plan_hours,
      sollHours: s.soll_hours,
    }));

    return Result.ok(snapshotDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
