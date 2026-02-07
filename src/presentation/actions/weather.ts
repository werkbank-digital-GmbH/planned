'use server';

/**
 * Weather Server Actions
 *
 * Server Actions für Wetterdaten:
 * - Projekt-spezifische Wettervorhersage
 * - Baustellen-Bewertung für Holzbau
 */

import type { WeatherForecast, ConstructionWeatherRating } from '@/domain/weather';

import { Result, type ActionResult } from '@/application/common';

import { SupabaseWeatherCacheRepository } from '@/infrastructure/repositories/SupabaseWeatherCacheRepository';
import { createGeocodingService } from '@/infrastructure/services/GeocodingService';
import { createWeatherService } from '@/infrastructure/services/WeatherService';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { getCurrentUserWithTenant } from '@/presentation/actions/shared/auth';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WeatherForecastDTO {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  windSpeedMax: number;
  constructionRating: ConstructionWeatherRating;
}

export interface ProjectWeatherDTO {
  projectId: string;
  projectAddress: string | null;
  lat: number | null;
  lng: number | null;
  forecasts: WeatherForecastDTO[];
  cachedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// GET PROJECT WEATHER
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectWithWeatherData {
  id: string;
  tenant_id: string;
  address: string | null;
  address_lat: number | null;
  address_lng: number | null;
}

/**
 * Lädt Wetterdaten für ein Projekt.
 *
 * 1. Prüft ob Koordinaten vorhanden, ggf. Geocoding
 * 2. Prüft Cache
 * 3. Bei Cache-Miss: Frische Daten holen und cachen
 * 4. Fügt Baustellen-Bewertung hinzu
 */
export async function getProjectWeatherAction(
  projectId: string
): Promise<ActionResult<ProjectWeatherDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin sehen die Wetterdaten
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();
    const weatherService = createWeatherService();
    const weatherCache = new SupabaseWeatherCacheRepository(supabase);

    // Projekt laden mit Adress- und Geo-Daten
    const { data: projectDataRaw, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, address, address_lat, address_lng')
      .eq('id', projectId)
      .single();

    const projectData = projectDataRaw as ProjectWithWeatherData | null;

    if (projectError || !projectData) {
      return Result.fail('NOT_FOUND', 'Projekt nicht gefunden');
    }

    if (projectData.tenant_id !== currentUser.tenantId) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung für dieses Projekt');
    }

    // Prüfe ob Koordinaten vorhanden
    let lat = projectData.address_lat;
    let lng = projectData.address_lng;

    // Geocoding falls Adresse vorhanden aber keine Koordinaten
    if (projectData.address && (!lat || !lng)) {
      try {
        const geocodingService = createGeocodingService();
        const geoResult = await geocodingService.geocode(projectData.address);

        if (geoResult) {
          lat = geoResult.lat;
          lng = geoResult.lng;

          // Koordinaten in DB speichern für zukünftige Requests
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('projects') as any)
            .update({
              address_lat: lat,
              address_lng: lng,
              address_geocoded_at: new Date().toISOString(),
            })
            .eq('id', projectId);
        }
      } catch (error) {
        console.warn('[Weather] Geocoding failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Wenn keine Koordinaten verfügbar, leere Antwort
    if (!lat || !lng) {
      return Result.ok({
        projectId,
        projectAddress: projectData.address,
        lat: null,
        lng: null,
        forecasts: [],
        cachedAt: null,
      });
    }

    // Nächste 7 Tage als Datum-Array
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }

    // Versuche aus Cache zu laden
    let forecasts: WeatherForecast[] = await weatherCache.getForecasts(lat, lng, dates);
    let cachedAt: string | null = null;

    // Bei Cache-Miss oder unvollständigem Cache: Frische Daten holen
    if (forecasts.length < 7) {
      try {
        forecasts = await weatherService.getForecast(lat, lng, 7);
        await weatherCache.saveForecasts(lat, lng, forecasts);
        cachedAt = new Date().toISOString();
      } catch (error) {
        console.warn('[Weather] Forecast fetch failed, using cached data:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Mappe zu DTOs mit Baustellen-Bewertung
    const forecastDTOs: WeatherForecastDTO[] = forecasts.map((f) => ({
      date: f.date.toISOString().split('T')[0],
      weatherCode: f.weatherCode,
      weatherDescription: f.weatherDescription,
      tempMin: f.tempMin,
      tempMax: f.tempMax,
      precipitationProbability: f.precipitationProbability,
      windSpeedMax: f.windSpeedMax,
      constructionRating: weatherService.evaluateForConstruction(f),
    }));

    return Result.ok({
      projectId,
      projectAddress: projectData.address,
      lat,
      lng,
      forecasts: forecastDTOs,
      cachedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
