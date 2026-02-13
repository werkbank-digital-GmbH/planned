import type {
  PhaseSnapshot,
  BurnRateCalculation,
  PhaseInsight,
} from '../types';

/**
 * Factory für PhaseSnapshot mit sinnvollen Defaults.
 */
export function createSnapshot(
  overrides: Partial<PhaseSnapshot> = {}
): PhaseSnapshot {
  return {
    id: 'snap-1',
    tenant_id: 'tenant-1',
    phase_id: 'phase-1',
    snapshot_date: '2025-01-06',
    ist_hours: 0,
    plan_hours: 0,
    soll_hours: 100,
    allocations_count: 3,
    allocated_users_count: 2,
    created_at: '2025-01-06T05:00:00Z',
    ...overrides,
  };
}

/**
 * Factory für BurnRateCalculation mit sinnvollen Defaults.
 */
export function createBurnRate(
  overrides: Partial<BurnRateCalculation> = {}
): BurnRateCalculation {
  return {
    istBurnRate: 8,
    istDataPoints: 5,
    istTrend: 'stable',
    planBurnRate: 8,
    planDataPoints: 5,
    ...overrides,
  };
}

/**
 * Factory für PhaseInsight mit sinnvollen Defaults.
 */
export function createPhaseInsight(
  overrides: Partial<PhaseInsight> = {}
): PhaseInsight {
  return {
    id: 'pi-1',
    tenant_id: 'tenant-1',
    phase_id: 'phase-1',
    insight_date: '2025-02-03',
    burn_rate_ist: 8,
    burn_rate_ist_trend: 'stable',
    days_remaining_ist: 6,
    completion_date_ist: '2025-02-14',
    deadline_delta_ist: 0,
    burn_rate_plan: 8,
    days_remaining_plan: 6,
    completion_date_plan: '2025-02-14',
    deadline_delta_plan: 0,
    remaining_hours: 50,
    progress_percent: 50,
    capacity_gap_hours: 10,
    capacity_gap_days: 1.25,
    status: 'on_track',
    summary_text: 'Test summary',
    detail_text: null,
    recommendation_text: null,
    data_quality: 'good',
    data_points_count: 5,
    suggested_action: null,
    created_at: '2025-02-03T05:15:00Z',
    ...overrides,
  };
}
