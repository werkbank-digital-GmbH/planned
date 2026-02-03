import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { SupabaseWeatherCacheRepository } from '@/infrastructure/repositories/SupabaseWeatherCacheRepository';
import { createWeatherService } from '@/infrastructure/services/WeatherService';
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

interface ProjectWithCoords {
  id: string;
  address_lat: number;
  address_lng: number;
}

/**
 * POST /api/cron/weather
 *
 * Aktualisiert den Wetter-Cache für alle Projekt-Standorte.
 * Wird von Vercel Cron täglich um 06:00 UTC aufgerufen.
 *
 * 1. Lädt alle aktiven Projekte mit Koordinaten
 * 2. Sammelt unique Koordinaten (gerundet auf 2 Dezimalstellen)
 * 3. Holt 7-Tage-Forecast für jeden Standort
 * 4. Speichert Ergebnisse im Cache
 * 5. Löscht alte Cache-Einträge (> 7 Tage)
 */
export async function POST(_request: Request) {
  // 1. Authentifizierung prüfen
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron:Weather] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron:Weather] Starting weather cache update...');
  const startTime = Date.now();

  try {
    // 2. Supabase Admin Client (bypasses RLS)
    const supabase = createAdminSupabaseClient();
    const weatherCache = new SupabaseWeatherCacheRepository(supabase);
    const weatherService = createWeatherService();

    // 3. Alle Projekte mit Koordinaten laden
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, address_lat, address_lng')
      .eq('status', 'active')
      .not('address_lat', 'is', null)
      .not('address_lng', 'is', null);

    if (projectsError) throw projectsError;

    // 4. Unique Koordinaten sammeln (gerundet auf 2 Dezimalstellen für ~1km Genauigkeit)
    const uniqueLocations = new Map<string, { lat: number; lng: number }>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const project of (projects || []) as any as ProjectWithCoords[]) {
      const roundedLat = Math.round(project.address_lat * 100) / 100;
      const roundedLng = Math.round(project.address_lng * 100) / 100;
      const key = `${roundedLat},${roundedLng}`;

      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, { lat: roundedLat, lng: roundedLng });
      }
    }

    console.log(`[Cron:Weather] Found ${uniqueLocations.size} unique locations from ${projects?.length || 0} projects`);

    // 5. Forecasts für jeden Standort holen und cachen
    let locationsUpdated = 0;
    let locationsErrored = 0;

    for (const [, location] of uniqueLocations) {
      try {
        const forecasts = await weatherService.getForecast(location.lat, location.lng, 7);
        await weatherCache.saveForecasts(location.lat, location.lng, forecasts);
        locationsUpdated++;

        // Rate limiting: Open-Meteo hat keine strikte Rate Limit,
        // aber wir warten 100ms zwischen Requests um fair zu sein
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Cron:Weather] Error fetching forecast for ${location.lat},${location.lng}:`, error);
        locationsErrored++;
      }
    }

    // 6. Alte Cache-Einträge löschen (älter als 24 Stunden)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cacheEntriesDeleted = await weatherCache.deleteOldEntries(oneDayAgo);

    const duration = Date.now() - startTime;
    console.log(`[Cron:Weather] Completed in ${duration}ms:`, {
      totalProjects: projects?.length || 0,
      uniqueLocations: uniqueLocations.size,
      locationsUpdated,
      locationsErrored,
      cacheEntriesDeleted,
    });

    return NextResponse.json({
      success: true,
      totalProjects: projects?.length || 0,
      uniqueLocations: uniqueLocations.size,
      locationsUpdated,
      locationsErrored,
      cacheEntriesDeleted,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[Cron:Weather] Fatal error:', error);

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
 * GET /api/cron/weather
 *
 * Health Check / Info Endpoint.
 * Gibt Informationen über den Cron-Job zurück.
 */
export async function GET() {
  return NextResponse.json({
    name: 'Weather Cache Updater',
    schedule: '0 6 * * *', // Täglich um 06:00 UTC
    description: 'Aktualisiert den Wetter-Cache für alle Projekt-Standorte',
    endpoint: 'POST /api/cron/weather',
    authentication: 'Bearer CRON_SECRET',
  });
}
