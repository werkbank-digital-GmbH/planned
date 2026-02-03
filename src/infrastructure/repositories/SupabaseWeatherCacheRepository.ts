import type { SupabaseClient } from '@supabase/supabase-js';

import type { WeatherForecast } from '@/domain/weather';

import type { IWeatherCacheRepository } from '@/application/ports/repositories/IWeatherCacheRepository';

/**
 * WMO Weather Code descriptions for mapping cached data back to forecasts.
 */
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Klar',
  1: 'Überwiegend klar',
  2: 'Teilweise bewölkt',
  3: 'Bewölkt',
  45: 'Nebel',
  48: 'Reif-Nebel',
  51: 'Leichter Nieselregen',
  53: 'Nieselregen',
  55: 'Starker Nieselregen',
  56: 'Gefrierender Nieselregen',
  57: 'Starker gefrierender Nieselregen',
  61: 'Leichter Regen',
  63: 'Regen',
  65: 'Starker Regen',
  66: 'Gefrierender Regen',
  67: 'Starker gefrierender Regen',
  71: 'Leichter Schnee',
  73: 'Schnee',
  75: 'Starker Schnee',
  77: 'Schneekörner',
  80: 'Leichte Regenschauer',
  81: 'Regenschauer',
  82: 'Starke Regenschauer',
  85: 'Leichte Schneeschauer',
  86: 'Schneeschauer',
  95: 'Gewitter',
  96: 'Gewitter mit leichtem Hagel',
  99: 'Gewitter mit starkem Hagel',
};

/**
 * Supabase-Implementierung des IWeatherCacheRepository.
 *
 * Caches weather forecasts to reduce API calls to Open-Meteo.
 * Coordinates are rounded to 2 decimal places (~1km accuracy) for cache hits.
 */
export class SupabaseWeatherCacheRepository implements IWeatherCacheRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly supabase: SupabaseClient<any>) {}

  /**
   * Round coordinates to 2 decimal places for consistent cache keys.
   * This provides approximately 1.1km accuracy, sufficient for weather data.
   */
  private roundCoord(coord: number): number {
    return Math.round(coord * 100) / 100;
  }

  async getForecasts(lat: number, lng: number, dates: Date[]): Promise<WeatherForecast[]> {
    if (dates.length === 0) return [];

    const roundedLat = this.roundCoord(lat);
    const roundedLng = this.roundCoord(lng);
    const dateStrings = dates.map((d) => d.toISOString().split('T')[0]);

    const { data, error } = await this.supabase
      .from('weather_cache')
      .select('*')
      .eq('lat', roundedLat)
      .eq('lng', roundedLng)
      .in('forecast_date', dateStrings);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => this.mapToForecast(row));
  }

  async saveForecasts(lat: number, lng: number, forecasts: WeatherForecast[]): Promise<void> {
    if (forecasts.length === 0) return;

    const roundedLat = this.roundCoord(lat);
    const roundedLng = this.roundCoord(lng);

    const rows = forecasts.map((f) => ({
      lat: roundedLat,
      lng: roundedLng,
      forecast_date: f.date.toISOString().split('T')[0],
      weather_code: f.weatherCode,
      temp_min: f.tempMin,
      temp_max: f.tempMax,
      precipitation_probability: f.precipitationProbability,
      wind_speed_max: f.windSpeedMax,
      fetched_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase.from('weather_cache').upsert(rows, {
      onConflict: 'lat,lng,forecast_date',
    });

    if (error) throw error;
  }

  async deleteOldEntries(olderThan: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('weather_cache')
      .delete()
      .lt('fetched_at', olderThan.toISOString())
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToForecast(row: any): WeatherForecast {
    const weatherCode = row.weather_code ?? 0;
    return {
      date: new Date(row.forecast_date),
      weatherCode,
      weatherDescription: WEATHER_DESCRIPTIONS[weatherCode] || 'Unbekannt',
      tempMin: row.temp_min ?? 0,
      tempMax: row.temp_max ?? 0,
      precipitationProbability: row.precipitation_probability ?? 0,
      windSpeedMax: row.wind_speed_max ?? 0,
    };
  }
}
