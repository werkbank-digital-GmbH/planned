// ═══════════════════════════════════════════════════════════════════════════
// PHASE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseSnapshot {
  id: string;
  tenant_id: string;
  phase_id: string;
  snapshot_date: string; // ISO date string (YYYY-MM-DD)
  ist_hours: number;
  plan_hours: number;
  soll_hours: number;
  allocations_count: number;
  allocated_users_count: number;
  created_at: string;
}

export interface CreatePhaseSnapshotDTO {
  tenant_id: string;
  phase_id: string;
  snapshot_date: string;
  ist_hours: number;
  plan_hours: number;
  soll_hours: number;
  allocations_count: number;
  allocated_users_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE INSIGHT
// ═══════════════════════════════════════════════════════════════════════════

export type InsightStatus =
  | 'on_track'
  | 'ahead'
  | 'at_risk'
  | 'behind'
  | 'critical'
  | 'not_started'
  | 'completed'
  | 'unknown';

export type BurnRateTrend = 'up' | 'down' | 'stable';

export type DataQuality = 'good' | 'limited' | 'insufficient';

export interface PhaseInsight {
  id: string;
  tenant_id: string;
  phase_id: string;
  insight_date: string;

  // IST-basierte Metriken
  burn_rate_ist: number | null;
  burn_rate_ist_trend: BurnRateTrend | null;
  days_remaining_ist: number | null;
  completion_date_ist: string | null;
  deadline_delta_ist: number | null;

  // PLAN-basierte Metriken
  burn_rate_plan: number | null;
  days_remaining_plan: number | null;
  completion_date_plan: string | null;
  deadline_delta_plan: number | null;

  // Zusätzliche Metriken
  remaining_hours: number | null;
  progress_percent: number | null;
  capacity_gap_hours: number | null;
  capacity_gap_days: number | null;

  // Status & Texte
  status: InsightStatus;
  summary_text: string;
  detail_text: string | null;
  recommendation_text: string | null;

  // Meta
  data_quality: DataQuality | null;
  data_points_count: number | null;

  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT INSIGHT
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectInsight {
  id: string;
  tenant_id: string;
  project_id: string;
  insight_date: string;

  // Aggregierte Metriken
  total_soll_hours: number | null;
  total_ist_hours: number | null;
  total_plan_hours: number | null;
  total_remaining_hours: number | null;
  overall_progress_percent: number | null;

  // Phase-Statistiken
  phases_count: number | null;
  phases_on_track: number | null;
  phases_at_risk: number | null;
  phases_behind: number | null;
  phases_completed: number | null;

  // Prognose
  latest_phase_deadline: string | null;
  projected_completion_date: string | null;
  project_deadline_delta: number | null;

  // Status & Texte
  status: InsightStatus;
  summary_text: string;
  detail_text: string | null;
  recommendation_text: string | null;

  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BURN RATE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

export interface BurnRateCalculation {
  // IST-basiert
  istBurnRate: number; // Ø Stunden/Arbeitstag
  istDataPoints: number; // Anzahl Tage mit Daten
  istTrend: BurnRateTrend;

  // PLAN-basiert
  planBurnRate: number; // Ø geplante Stunden/Tag
  planDataPoints: number;
}

export interface ProgressionMetrics {
  remainingHours: number; // SOLL - IST
  progressPercent: number; // (IST / SOLL) * 100
  daysUntilDeadline: number; // Arbeitstage bis Deadline

  // IST-Prognose
  daysRemainingIst: number | null;
  completionDateIst: Date | null;
  deadlineDeltaIst: number | null;

  // PLAN-Prognose
  daysRemainingPlan: number | null;
  completionDatePlan: Date | null;
  deadlineDeltaPlan: number | null;

  // Capacity Gap
  capacityGapHours: number; // Was noch geplant werden muss
  capacityGapDays: number; // In Personentagen (bei 8h/Tag)
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT INSIGHTS SUMMARY (Dashboard KPIs)
// ═══════════════════════════════════════════════════════════════════════════

export interface RiskProject {
  id: string;
  name: string;
  status: InsightStatus;
  phasesAtRisk: number;
}

export interface TenantInsightsSummary {
  projectsAtRisk: number;
  projectsOnTrack: number;
  totalProjects: number;
  criticalPhasesCount: number;
  averageProgressPercent: number;
  burnRateTrend: BurnRateTrend;
  topRiskProjects: RiskProject[];
  lastUpdatedAt: string | null;
}
