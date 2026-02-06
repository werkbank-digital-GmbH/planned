import type { SupabaseClient } from '@supabase/supabase-js';

import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import type {
  PhaseSnapshot,
  CreatePhaseSnapshotDTO,
  PhaseInsight,
  ProjectInsight,
  TenantInsightsSummary,
  RiskProject,
  BurnRateTrend,
} from '@/domain/analytics/types';

/**
 * Supabase-Implementierung des IAnalyticsRepository.
 *
 * Verwaltet Phase-Snapshots und Insights für das Analytics-System.
 *
 * HINWEIS: Diese Implementation nutzt `any` casts für die neuen Tabellen,
 * da die database.types.ts erst nach Anwendung der Migration aktualisiert werden.
 * Nach `supabase gen types` können die Typen präzisiert werden.
 */
export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly supabase: SupabaseClient<any>) {}

  // ═══════════════════════════════════════════════════════════════════════
  // SNAPSHOTS
  // ═══════════════════════════════════════════════════════════════════════

  async createSnapshot(data: CreatePhaseSnapshotDTO): Promise<PhaseSnapshot> {
    const { data: snapshot, error } = await this.supabase
      .from('phase_snapshots')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return this.mapSnapshot(snapshot);
  }

  async createSnapshots(data: CreatePhaseSnapshotDTO[]): Promise<PhaseSnapshot[]> {
    if (data.length === 0) return [];

    const { data: snapshots, error } = await this.supabase
      .from('phase_snapshots')
      .insert(data)
      .select();

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (snapshots || []).map((s: any) => this.mapSnapshot(s));
  }

  async getSnapshotsForPhase(phaseId: string, limit = 30): Promise<PhaseSnapshot[]> {
    const { data, error } = await this.supabase
      .from('phase_snapshots')
      .select('*')
      .eq('phase_id', phaseId)
      .order('snapshot_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((s: any) => this.mapSnapshot(s));
  }

  async getSnapshotsForDateRange(
    phaseId: string,
    startDate: string,
    endDate: string
  ): Promise<PhaseSnapshot[]> {
    const { data, error } = await this.supabase
      .from('phase_snapshots')
      .select('*')
      .eq('phase_id', phaseId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((s: any) => this.mapSnapshot(s));
  }

  async getSnapshotsForPhasesInDateRange(
    phaseIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, PhaseSnapshot[]>> {
    const result = new Map<string, PhaseSnapshot[]>();

    if (phaseIds.length === 0) return result;

    // Initialisiere leere Arrays für alle Phasen
    for (const phaseId of phaseIds) {
      result.set(phaseId, []);
    }

    // Eine einzige Query für alle Phasen
    const { data, error } = await this.supabase
      .from('phase_snapshots')
      .select('*')
      .in('phase_id', phaseIds)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true });

    if (error) throw error;

    // Gruppiere nach Phase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of data || []) {
      const phaseId = row.phase_id as string;
      const snapshots = result.get(phaseId);
      if (snapshots) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        snapshots.push(this.mapSnapshot(row as any));
      }
    }

    return result;
  }

  async hasSnapshotForToday(phaseId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    const { count, error } = await this.supabase
      .from('phase_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('phase_id', phaseId)
      .eq('snapshot_date', today);

    if (error) throw error;
    return (count || 0) > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  async upsertPhaseInsight(
    insight: Omit<PhaseInsight, 'id' | 'created_at'>
  ): Promise<PhaseInsight> {
    const { data, error } = await this.supabase
      .from('phase_insights')
      .upsert(insight, {
        onConflict: 'phase_id,insight_date',
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapPhaseInsight(data);
  }

  async getLatestPhaseInsight(phaseId: string): Promise<PhaseInsight | null> {
    const { data, error } = await this.supabase
      .from('phase_insights')
      .select('*')
      .eq('phase_id', phaseId)
      .order('insight_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapPhaseInsight(data) : null;
  }

  async getLatestInsightsForPhases(phaseIds: string[]): Promise<PhaseInsight[]> {
    if (phaseIds.length === 0) return [];

    const { data, error } = await this.supabase.rpc('get_latest_insights_for_phases', {
      p_phase_ids: phaseIds,
    });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((i: any) => this.mapPhaseInsight(i));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROJECT INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  async upsertProjectInsight(
    insight: Omit<ProjectInsight, 'id' | 'created_at'>
  ): Promise<ProjectInsight> {
    const { data, error } = await this.supabase
      .from('project_insights')
      .upsert(insight, {
        onConflict: 'project_id,insight_date',
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapProjectInsight(data);
  }

  async getLatestProjectInsight(projectId: string): Promise<ProjectInsight | null> {
    const { data, error } = await this.supabase
      .from('project_insights')
      .select('*')
      .eq('project_id', projectId)
      .order('insight_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapProjectInsight(data) : null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════

  async cleanupOldSnapshots(): Promise<number> {
    const { data, error } = await this.supabase.rpc('cleanup_old_snapshots');
    if (error) throw error;
    return (data as number) || 0;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TENANT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  async getTenantInsightsSummary(tenantId: string): Promise<TenantInsightsSummary> {
    // Hole alle neuesten Project Insights für diesen Tenant
    const { data: projectInsights, error } = await this.supabase
      .from('project_insights')
      .select(
        `
        id,
        project_id,
        insight_date,
        overall_progress_percent,
        phases_at_risk,
        phases_behind,
        status,
        created_at
      `
      )
      .eq('tenant_id', tenantId)
      .order('insight_date', { ascending: false });

    if (error) throw error;

    // Keine Insights vorhanden
    if (!projectInsights || projectInsights.length === 0) {
      return this.emptyTenantSummary();
    }

    // Dedupliziere: nur das neueste Insight pro Projekt
    const latestByProject = new Map<string, (typeof projectInsights)[0]>();
    for (const insight of projectInsights) {
      if (!latestByProject.has(insight.project_id)) {
        latestByProject.set(insight.project_id, insight);
      }
    }

    const latestInsights = Array.from(latestByProject.values());

    // Aggregiere Status-Counts
    let projectsAtRisk = 0;
    let projectsOnTrack = 0;
    let criticalPhasesCount = 0;
    let totalProgress = 0;
    let progressCount = 0;

    const riskProjects: Array<{
      projectId: string;
      status: string;
      phasesAtRisk: number;
    }> = [];

    for (const insight of latestInsights) {
      const status = insight.status as string;
      const phasesAtRisk = (insight.phases_at_risk || 0) + (insight.phases_behind || 0);

      if (['behind', 'critical', 'at_risk'].includes(status)) {
        projectsAtRisk++;
        riskProjects.push({
          projectId: insight.project_id,
          status,
          phasesAtRisk,
        });
      } else if (['on_track', 'ahead'].includes(status)) {
        projectsOnTrack++;
      }

      criticalPhasesCount += phasesAtRisk;

      if (insight.overall_progress_percent !== null) {
        totalProgress += insight.overall_progress_percent;
        progressCount++;
      }
    }

    // Sortiere Risiko-Projekte nach Kritikalität und hole Top 3
    const sortedRiskProjects = riskProjects
      .sort((a, b) => {
        // Kritischste zuerst
        const statusOrder: Record<string, number> = {
          critical: 0,
          behind: 1,
          at_risk: 2,
        };
        const aOrder = statusOrder[a.status] ?? 99;
        const bOrder = statusOrder[b.status] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // Bei gleichem Status: mehr Risiko-Phasen zuerst
        return b.phasesAtRisk - a.phasesAtRisk;
      })
      .slice(0, 3);

    // Hole Projektnamen für die Top-Risk-Projekte
    const topRiskProjects = await this.enrichRiskProjectsWithNames(
      sortedRiskProjects,
      tenantId
    );

    // Ermittle globalen Burn Rate Trend
    const burnRateTrend = await this.getOverallBurnRateTrend(tenantId);

    // Ermittle letztes Update
    const lastUpdatedAt =
      latestInsights.length > 0
        ? latestInsights.reduce((latest, i) =>
            i.created_at > latest ? i.created_at : latest
          , latestInsights[0].created_at)
        : null;

    return {
      projectsAtRisk,
      projectsOnTrack,
      totalProjects: latestInsights.length,
      criticalPhasesCount,
      averageProgressPercent:
        progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
      burnRateTrend,
      topRiskProjects,
      lastUpdatedAt,
    };
  }

  /**
   * Reichert Risiko-Projekte mit Projektnamen an
   */
  private async enrichRiskProjectsWithNames(
    riskProjects: Array<{ projectId: string; status: string; phasesAtRisk: number }>,
    tenantId: string
  ): Promise<RiskProject[]> {
    if (riskProjects.length === 0) return [];

    const projectIds = riskProjects.map((p) => p.projectId);

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .in('id', projectIds);

    if (error) throw error;

    const projectNameMap = new Map(projects?.map((p) => [p.id, p.name]) ?? []);

    return riskProjects.map((rp) => ({
      id: rp.projectId,
      name: projectNameMap.get(rp.projectId) || 'Unbekanntes Projekt',
      status: rp.status as RiskProject['status'],
      phasesAtRisk: rp.phasesAtRisk,
    }));
  }

  /**
   * Ermittelt den Gesamttrend der Burn Rate über alle Phasen
   */
  private async getOverallBurnRateTrend(tenantId: string): Promise<BurnRateTrend> {
    // Hole die neuesten Phase-Insights und aggregiere den Trend
    const { data: phaseInsights, error } = await this.supabase
      .from('phase_insights')
      .select('burn_rate_ist_trend')
      .eq('tenant_id', tenantId)
      .not('burn_rate_ist_trend', 'is', null)
      .order('insight_date', { ascending: false })
      .limit(50); // Betrachte die letzten 50 Phase-Insights

    if (error) throw error;

    if (!phaseInsights || phaseInsights.length === 0) {
      return 'stable';
    }

    // Zähle die Trends
    let up = 0;
    let down = 0;
    let stable = 0;

    for (const insight of phaseInsights) {
      switch (insight.burn_rate_ist_trend) {
        case 'up':
          up++;
          break;
        case 'down':
          down++;
          break;
        default:
          stable++;
      }
    }

    // Mehrheitsentscheidung
    if (up > down && up > stable) return 'up';
    if (down > up && down > stable) return 'down';
    return 'stable';
  }

  /**
   * Gibt eine leere Tenant-Summary zurück
   */
  private emptyTenantSummary(): TenantInsightsSummary {
    return {
      projectsAtRisk: 0,
      projectsOnTrack: 0,
      totalProjects: 0,
      criticalPhasesCount: 0,
      averageProgressPercent: 0,
      burnRateTrend: 'stable',
      topRiskProjects: [],
      lastUpdatedAt: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE MAPPERS
  // ═══════════════════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSnapshot(row: any): PhaseSnapshot {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      phase_id: row.phase_id,
      snapshot_date: row.snapshot_date,
      ist_hours: Number(row.ist_hours),
      plan_hours: Number(row.plan_hours),
      soll_hours: Number(row.soll_hours),
      allocations_count: row.allocations_count,
      allocated_users_count: row.allocated_users_count,
      created_at: row.created_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPhaseInsight(row: any): PhaseInsight {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      phase_id: row.phase_id,
      insight_date: row.insight_date,
      burn_rate_ist: row.burn_rate_ist ? Number(row.burn_rate_ist) : null,
      burn_rate_ist_trend: row.burn_rate_ist_trend as PhaseInsight['burn_rate_ist_trend'],
      days_remaining_ist: row.days_remaining_ist,
      completion_date_ist: row.completion_date_ist,
      deadline_delta_ist: row.deadline_delta_ist,
      burn_rate_plan: row.burn_rate_plan ? Number(row.burn_rate_plan) : null,
      days_remaining_plan: row.days_remaining_plan,
      completion_date_plan: row.completion_date_plan,
      deadline_delta_plan: row.deadline_delta_plan,
      remaining_hours: row.remaining_hours ? Number(row.remaining_hours) : null,
      progress_percent: row.progress_percent,
      capacity_gap_hours: row.capacity_gap_hours ? Number(row.capacity_gap_hours) : null,
      capacity_gap_days: row.capacity_gap_days ? Number(row.capacity_gap_days) : null,
      status: row.status as PhaseInsight['status'],
      summary_text: row.summary_text,
      detail_text: row.detail_text,
      recommendation_text: row.recommendation_text,
      data_quality: row.data_quality as PhaseInsight['data_quality'],
      data_points_count: row.data_points_count,
      suggested_action: row.suggested_action ?? null,
      created_at: row.created_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProjectInsight(row: any): ProjectInsight {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      project_id: row.project_id,
      insight_date: row.insight_date,
      total_soll_hours: row.total_soll_hours ? Number(row.total_soll_hours) : null,
      total_ist_hours: row.total_ist_hours ? Number(row.total_ist_hours) : null,
      total_plan_hours: row.total_plan_hours ? Number(row.total_plan_hours) : null,
      total_remaining_hours: row.total_remaining_hours
        ? Number(row.total_remaining_hours)
        : null,
      overall_progress_percent: row.overall_progress_percent,
      phases_count: row.phases_count,
      phases_on_track: row.phases_on_track,
      phases_at_risk: row.phases_at_risk,
      phases_behind: row.phases_behind,
      phases_completed: row.phases_completed,
      latest_phase_deadline: row.latest_phase_deadline,
      projected_completion_date: row.projected_completion_date,
      project_deadline_delta: row.project_deadline_delta,
      status: row.status as ProjectInsight['status'],
      summary_text: row.summary_text,
      detail_text: row.detail_text,
      recommendation_text: row.recommendation_text,
      created_at: row.created_at,
    };
  }
}
