import type {
  PhaseSnapshot,
  CreatePhaseSnapshotDTO,
  PhaseInsight,
  ProjectInsight,
  TenantInsightsSummary,
} from './types';

export interface IAnalyticsRepository {
  // ═══════════════════════════════════════════════════════════════════════
  // SNAPSHOTS
  // ═══════════════════════════════════════════════════════════════════════

  /** Erstellt einen neuen Snapshot */
  createSnapshot(data: CreatePhaseSnapshotDTO): Promise<PhaseSnapshot>;

  /** Erstellt mehrere Snapshots (Batch) */
  createSnapshots(data: CreatePhaseSnapshotDTO[]): Promise<PhaseSnapshot[]>;

  /** Holt Snapshots für eine Phase (sortiert nach Datum absteigend) */
  getSnapshotsForPhase(phaseId: string, limit?: number): Promise<PhaseSnapshot[]>;

  /** Holt Snapshots für einen Zeitraum */
  getSnapshotsForDateRange(
    phaseId: string,
    startDate: string,
    endDate: string
  ): Promise<PhaseSnapshot[]>;

  /** Prüft ob heute bereits ein Snapshot existiert */
  hasSnapshotForToday(phaseId: string): Promise<boolean>;

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  /** Speichert oder aktualisiert ein Phase-Insight */
  upsertPhaseInsight(
    insight: Omit<PhaseInsight, 'id' | 'created_at'>
  ): Promise<PhaseInsight>;

  /** Holt das neueste Insight für eine Phase */
  getLatestPhaseInsight(phaseId: string): Promise<PhaseInsight | null>;

  /** Holt Insights für mehrere Phasen (für Projekt-Aggregation) */
  getLatestInsightsForPhases(phaseIds: string[]): Promise<PhaseInsight[]>;

  // ═══════════════════════════════════════════════════════════════════════
  // PROJECT INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  /** Speichert oder aktualisiert ein Project-Insight */
  upsertProjectInsight(
    insight: Omit<ProjectInsight, 'id' | 'created_at'>
  ): Promise<ProjectInsight>;

  /** Holt das neueste Insight für ein Projekt */
  getLatestProjectInsight(projectId: string): Promise<ProjectInsight | null>;

  // ═══════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════

  /** Löscht alte Snapshots (10 Jahre nach Projektabschluss) */
  cleanupOldSnapshots(): Promise<number>;

  // ═══════════════════════════════════════════════════════════════════════
  // TENANT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  /** Holt aggregierte Insights für einen Tenant (für Dashboard-KPIs) */
  getTenantInsightsSummary(tenantId: string): Promise<TenantInsightsSummary>;
}
