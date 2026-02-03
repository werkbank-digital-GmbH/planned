'use server';

/**
 * Insights Server Actions
 *
 * Server Actions für Analytics-Insights:
 * - Tenant-weite KPI-Zusammenfassung für Dashboard
 */

import type { BurnRateTrend, InsightStatus } from '@/domain/analytics/types';
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
