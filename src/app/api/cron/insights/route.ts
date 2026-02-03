import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { AvailabilityAnalyzer } from '@/application/services/AvailabilityAnalyzer';
import { GenerateInsightsUseCase } from '@/application/use-cases/analytics/GenerateInsightsUseCase';

import { InsightTextGenerator } from '@/infrastructure/ai/InsightTextGenerator';
import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseAnalyticsRepository } from '@/infrastructure/repositories/SupabaseAnalyticsRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { SupabaseWeatherCacheRepository } from '@/infrastructure/repositories/SupabaseWeatherCacheRepository';
import { OpenMeteoWeatherService } from '@/infrastructure/services/WeatherService';
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
 * POST /api/cron/insights
 *
 * Generiert KI-basierte Insights für alle aktiven Phasen und Projekte.
 * Wird von Vercel Cron um 05:15 UTC aufgerufen (nach den Snapshots um 05:00).
 *
 * Für jede Phase:
 * - Burn Rate aus Snapshots berechnen
 * - Prognosen erstellen (IST- und PLAN-basiert)
 * - KI-Texte generieren (Claude Haiku)
 * - Phase-Insight speichern
 *
 * Für jedes Projekt:
 * - Phase-Insights aggregieren
 * - Project-Insight mit KI-Texten erstellen
 *
 * Erfordert:
 * - CRON_SECRET für Authentifizierung
 * - ANTHROPIC_API_KEY für KI-Textgenerierung (optional, Fallback auf regelbasierte Texte)
 */
export async function POST(_request: Request) {
  // 1. Authentifizierung prüfen
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron:Insights] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron:Insights] Starting insight generation...');
  const startTime = Date.now();

  try {
    // 2. Supabase Admin Client (bypasses RLS)
    const supabase = createAdminSupabaseClient();

    // 3. Services erstellen
    const analyticsRepository = new SupabaseAnalyticsRepository(supabase);
    const textGenerator = new InsightTextGenerator(process.env.ANTHROPIC_API_KEY);

    // 4. Enhanced Dependencies für D7 Features (Verfügbarkeit + Wetter)
    const userRepository = new SupabaseUserRepository(supabase);
    const allocationRepository = new SupabaseAllocationRepository(supabase);
    const absenceRepository = new SupabaseAbsenceRepository(supabase);
    const weatherService = new OpenMeteoWeatherService();
    const weatherCacheRepository = new SupabaseWeatherCacheRepository(supabase);

    const availabilityAnalyzer = new AvailabilityAnalyzer(
      userRepository,
      allocationRepository,
      absenceRepository
    );

    // 5. Use Case ausführen mit Enhanced Dependencies
    const useCase = new GenerateInsightsUseCase(
      analyticsRepository,
      supabase,
      textGenerator,
      {
        availabilityAnalyzer,
        weatherService,
        weatherCacheRepository,
      }
    );

    const result = await useCase.execute();

    const duration = Date.now() - startTime;
    console.log(`[Cron:Insights] Completed in ${duration}ms:`, {
      tenants: result.tenants_processed,
      phases: result.phases_processed,
      phaseInsights: result.phase_insights_created,
      projects: result.projects_processed,
      projectInsights: result.project_insights_created,
      errors: result.errors.length,
    });

    return NextResponse.json({
      ...result,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[Cron:Insights] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/insights
 *
 * Health Check / Info Endpoint.
 * Gibt Informationen über den Cron-Job zurück.
 */
export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    name: 'Insights Generator',
    schedule: '15 5 * * *', // Täglich um 05:15 UTC (nach Snapshots)
    description: 'Generiert KI-basierte Insights für Phasen und Projekte',
    endpoint: 'POST /api/cron/insights',
    authentication: 'Bearer CRON_SECRET',
    ai_enabled: hasAnthropicKey,
    ai_model: hasAnthropicKey ? 'claude-3-haiku-20240307' : 'fallback (regelbasiert)',
    features: {
      enhanced_recommendations: true,
      availability_analysis: true,
      weather_context: true,
    },
  });
}
