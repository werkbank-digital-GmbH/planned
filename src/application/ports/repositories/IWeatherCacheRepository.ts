/**
 * Weather Cache Repository Interface
 *
 * Caches weather forecasts to reduce API calls to Open-Meteo.
 */

import type { WeatherForecast } from '@/domain/weather';

export interface IWeatherCacheRepository {
  /**
   * Get cached forecasts for given coordinates and dates.
   * Coordinates are rounded to 2 decimal places (~1km accuracy) for cache hits.
   * @param lat - Latitude
   * @param lng - Longitude
   * @param dates - Dates to fetch
   * @returns Cached forecasts (may be partial)
   */
  getForecasts(lat: number, lng: number, dates: Date[]): Promise<WeatherForecast[]>;

  /**
   * Save forecasts to cache.
   * @param lat - Latitude
   * @param lng - Longitude
   * @param forecasts - Forecasts to cache
   */
  saveForecasts(lat: number, lng: number, forecasts: WeatherForecast[]): Promise<void>;

  /**
   * Delete old cache entries.
   * @param olderThan - Delete entries fetched before this date
   * @returns Number of deleted entries
   */
  deleteOldEntries(olderThan: Date): Promise<number>;
}
