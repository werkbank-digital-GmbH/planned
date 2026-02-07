import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { GeneratePhaseSnapshotsUseCase } from '@/application/use-cases/analytics/GeneratePhaseSnapshotsUseCase';

import { SupabaseAnalyticsRepository } from '@/infrastructure/repositories/SupabaseAnalyticsRepository';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 Minuten max

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/cron/snapshots
 *
 * Generiert tägliche Snapshots für alle aktiven Phasen.
 * Wird täglich um 05:00 UTC ausgeführt (via Vercel Cron).
 *
 * Für jede aktive Phase wird ein Snapshot mit den aktuellen Metriken erstellt:
 * - IST-Stunden (aus Asana)
 * - PLAN-Stunden (Summe aller Allocations)
 * - SOLL-Stunden (Budget)
 * - Anzahl Allocations und zugewiesene User
 *
 * Der Job ist idempotent: Bereits existierende Snapshots werden übersprungen.
 */
export async function GET() {
  // 1. Authentifizierung prüfen
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron:Snapshots] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron:Snapshots] Starting snapshot generation...');
  const startTime = Date.now();

  try {
    // 2. Supabase Admin Client (bypasses RLS)
    const supabase = createAdminSupabaseClient();

    // 3. Repository und Use Case erstellen
    const analyticsRepository = new SupabaseAnalyticsRepository(supabase);
    const useCase = new GeneratePhaseSnapshotsUseCase(analyticsRepository, supabase);

    // 4. Snapshots generieren
    const result = await useCase.execute();

    const duration = Date.now() - startTime;
    console.log(`[Cron:Snapshots] Completed in ${duration}ms:`, {
      tenants: result.tenants_processed,
      phases: result.phases_processed,
      created: result.snapshots_created,
      skipped: result.skipped_existing,
      errors: result.errors.length,
    });

    return NextResponse.json({
      ...result,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[Cron:Snapshots] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

