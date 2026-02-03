/**
 * Weather Service Interface
 *
 * Provides weather forecast data and construction site evaluation.
 */

import type { WeatherForecast, ConstructionWeatherRating } from '@/domain/weather';

export interface IWeatherService {
  /**
   * Get weather forecast for given coordinates.
   * @param lat - Latitude
   * @param lng - Longitude
   * @param days - Number of forecast days (default: 7)
   * @returns Array of daily forecasts
   */
  getForecast(lat: number, lng: number, days?: number): Promise<WeatherForecast[]>;

  /**
   * Evaluate weather conditions for construction work.
   * @param forecast - Weather forecast to evaluate
   * @returns Rating and reasons
   */
  evaluateForConstruction(forecast: WeatherForecast): ConstructionWeatherRating;
}
