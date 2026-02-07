import { NextResponse } from 'next/server';

import { GenerateInsightsUseCase } from '@/application/use-cases/analytics/GenerateInsightsUseCase';

import { InsightTextGenerator } from '@/infrastructure/ai/InsightTextGenerator';
import { SupabaseAnalyticsRepository } from '@/infrastructure/repositories/SupabaseAnalyticsRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 Minuten max

// Rate Limit: 1 Stunde in Millisekunden
const RATE_LIMIT_MS = 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface RefreshSuccessResponse {
  success: true;
  lastRefreshAt: string;
  snapshotsCreated: number;
  insightsCreated: number;
}

interface RefreshRateLimitedResponse {
  success: false;
  error: 'rate_limited';
  nextRefreshAt: string;
  waitMinutes: number;
}

interface RefreshErrorResponse {
  success: false;
  error: 'unauthorized' | 'forbidden' | 'generation_failed';
  message: string;
}

type RefreshResponse =
  | RefreshSuccessResponse
  | RefreshRateLimitedResponse
  | RefreshErrorResponse;

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/insights/refresh
 *
 * Manueller Refresh der Insights für den aktuellen Tenant.
 * Rate Limited: Max 1x pro Stunde pro Tenant.
 *
 * Flow:
 * 1. Auth prüfen (User-Session)
 * 2. Tenant-ID aus Session holen
 * 3. Rate Limit prüfen (letzter Refresh < 1 Stunde?)
 * 4. Wenn erlaubt: Snapshots + Insights für diesen Tenant generieren
 * 5. lastRefreshAt in tenants-Tabelle speichern
 * 6. Response mit neuem Timestamp
 */
export async function POST(): Promise<NextResponse<RefreshResponse>> {
  try {
    // 1. Auth prüfen via Supabase Session
    const supabase = await createActionSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'Nicht eingeloggt' },
        { status: 401 }
      );
    }

    // 2. User-Daten mit Tenant laden
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'User nicht gefunden' },
        { status: 401 }
      );
    }

    // 3. Nur Planer und Admin dürfen refreshen
    if (!['planer', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'forbidden', message: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const tenantId = userData.tenant_id;

    // 4. Rate Limit prüfen
    // HINWEIS: insights_last_refresh_at ist ein neues Feld (Migration 20260203195031)
    // und noch nicht in database.types.ts. Nach `supabase gen types` kann der Cast entfernt werden.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenantData, error: tenantError } = await (supabase as any)
      .from('tenants')
      .select('insights_last_refresh_at')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      return NextResponse.json(
        { success: false, error: 'generation_failed', message: 'Tenant nicht gefunden' },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantDataAny = tenantData as any;
    const lastRefreshAt = tenantDataAny?.insights_last_refresh_at
      ? new Date(tenantDataAny.insights_last_refresh_at)
      : null;

    if (lastRefreshAt) {
      const timeSinceLastRefresh = Date.now() - lastRefreshAt.getTime();

      if (timeSinceLastRefresh < RATE_LIMIT_MS) {
        const nextRefreshAt = new Date(lastRefreshAt.getTime() + RATE_LIMIT_MS);
        const waitMinutes = Math.ceil((RATE_LIMIT_MS - timeSinceLastRefresh) / (60 * 1000));

        return NextResponse.json(
          {
            success: false,
            error: 'rate_limited',
            nextRefreshAt: nextRefreshAt.toISOString(),
            waitMinutes,
          },
          { status: 429 }
        );
      }
    }

    // 5. Insights generieren (mit Admin-Client für Bypass von RLS)
    const adminSupabase = createAdminSupabaseClient();
    const analyticsRepository = new SupabaseAnalyticsRepository(adminSupabase);
    const textGenerator = new InsightTextGenerator(process.env.ANTHROPIC_API_KEY);

    const today = new Date().toISOString().split('T')[0];

    // 5a. Snapshots für diesen Tenant generieren
    const snapshotsResult = await generateSnapshotsForTenant(
      adminSupabase,
      analyticsRepository,
      tenantId,
      today
    );

    // 5b. Insights für diesen Tenant generieren
    const insightsResult = await generateInsightsForTenant(
      adminSupabase,
      analyticsRepository,
      textGenerator,
      tenantId,
      today
    );

    // 6. lastRefreshAt aktualisieren
    const newRefreshAt = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('tenants')
      .update({ insights_last_refresh_at: newRefreshAt })
      .eq('id', tenantId);

    return NextResponse.json({
      success: true,
      lastRefreshAt: newRefreshAt,
      snapshotsCreated: snapshotsResult.snapshots_created,
      insightsCreated: insightsResult.phase_insights_created + insightsResult.project_insights_created,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API:InsightsRefresh] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'generation_failed',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert Snapshots nur für einen bestimmten Tenant.
 */
async function generateSnapshotsForTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  analyticsRepository: SupabaseAnalyticsRepository,
  tenantId: string,
  today: string
) {
  const result = {
    snapshots_created: 0,
    skipped_existing: 0,
    errors: [] as string[],
  };

  try {
    // Aktive Phasen mit Metriken laden
    const { data: phases, error } = await supabase.rpc('get_active_phases_with_metrics', {
      p_tenant_id: tenantId,
      p_today: today,
    });

    if (error) throw error;

    // Alle Phase-IDs sammeln
    const allPhases = phases || [];
    const phaseIds = allPhases.map((p: { id: string }) => p.id);

    // Ein einziger Query für alle existierenden Snapshots (statt N Queries)
    const existingPhaseIds = new Set<string>();
    if (phaseIds.length > 0) {
      const { data: existingSnapshots } = await supabase
        .from('phase_snapshots')
        .select('phase_id')
        .in('phase_id', phaseIds)
        .eq('snapshot_date', today);

      for (const s of existingSnapshots || []) {
        existingPhaseIds.add(s.phase_id);
      }
    }

    const snapshotsToCreate: Array<{
      tenant_id: string;
      phase_id: string;
      snapshot_date: string;
      ist_hours: number;
      plan_hours: number;
      soll_hours: number;
      allocations_count: number;
      allocated_users_count: number;
    }> = [];

    for (const phase of allPhases) {
      if (existingPhaseIds.has(phase.id)) {
        result.skipped_existing++;
        continue;
      }

      snapshotsToCreate.push({
        tenant_id: phase.tenant_id,
        phase_id: phase.id,
        snapshot_date: today,
        ist_hours: Number(phase.ist_hours),
        plan_hours: Number(phase.plan_hours),
        soll_hours: Number(phase.soll_hours),
        allocations_count: Number(phase.allocations_count),
        allocated_users_count: Number(phase.allocated_users_count),
      });
    }

    if (snapshotsToCreate.length > 0) {
      await analyticsRepository.createSnapshots(snapshotsToCreate);
      result.snapshots_created = snapshotsToCreate.length;
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Generiert Insights nur für einen bestimmten Tenant.
 *
 * HINWEIS: Der GenerateInsightsUseCase verarbeitet alle Tenants.
 * Langfristig sollte der UseCase einen optionalen tenantId Parameter haben.
 * Für jetzt führen wir den vollständigen UseCase aus (ist idempotent durch upsert).
 */
async function generateInsightsForTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  analyticsRepository: SupabaseAnalyticsRepository,
  textGenerator: InsightTextGenerator,
  _tenantId: string, // Nicht verwendet, da UseCase alle Tenants verarbeitet
  today: string
) {
  const useCase = new GenerateInsightsUseCase(
    analyticsRepository,
    supabase,
    textGenerator
  );

  const result = await useCase.execute(today);
  return result;
}

/**
 * GET /api/insights/refresh
 *
 * Gibt Informationen über den letzten Refresh zurück.
 */
export async function GET() {
  try {
    const supabase = await createActionSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenantData } = await (supabase as any)
      .from('tenants')
      .select('insights_last_refresh_at')
      .eq('id', userData.tenant_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastRefreshAt = (tenantData as any)?.insights_last_refresh_at || null;
    const canRefresh = !lastRefreshAt ||
      Date.now() - new Date(lastRefreshAt).getTime() >= RATE_LIMIT_MS;

    let nextRefreshAt = null;
    let waitMinutes = null;

    if (lastRefreshAt && !canRefresh) {
      const lastRefresh = new Date(lastRefreshAt);
      nextRefreshAt = new Date(lastRefresh.getTime() + RATE_LIMIT_MS).toISOString();
      waitMinutes = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastRefresh.getTime())) / (60 * 1000));
    }

    return NextResponse.json({
      lastRefreshAt,
      canRefresh,
      nextRefreshAt,
      waitMinutes,
      rateLimitMinutes: RATE_LIMIT_MS / (60 * 1000),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
