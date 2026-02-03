/**
 * Weather Domain Types
 *
 * Types for weather forecasting and construction site evaluation.
 */

export interface WeatherForecast {
  date: Date;
  weatherCode: number;
  weatherDescription: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number; // 0-100
  windSpeedMax: number; // km/h
}

export interface ConstructionWeatherRating {
  rating: 'good' | 'moderate' | 'poor';
  reasons: string[];
}

/**
 * Weather cache entry for database storage.
 */
export interface WeatherCacheEntry {
  id: string;
  lat: number;
  lng: number;
  forecastDate: Date;
  weatherCode: number | null;
  tempMin: number | null;
  tempMax: number | null;
  precipitationProbability: number | null;
  windSpeedMax: number | null;
  fetchedAt: Date;
}
