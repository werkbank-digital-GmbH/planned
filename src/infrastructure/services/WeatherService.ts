/**
 * Open-Meteo Weather Service.
 *
 * Kostenlos, kein API Key, DSGVO-konform.
 * https://open-meteo.com/
 */

import type { WeatherForecast, ConstructionWeatherRating } from '@/domain/weather';

import type { IWeatherService } from '@/application/ports/services/IWeatherService';

interface OpenMeteoResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

export class OpenMeteoWeatherService implements IWeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getForecast(lat: number, lng: number, days: number = 7): Promise<WeatherForecast[]> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily:
        'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max',
      timezone: 'Europe/Berlin',
      forecast_days: days.toString(),
    });

    const response = await fetch(`${this.baseUrl}?${params}`);

    if (!response.ok) {
      console.error('[WeatherService] API error:', response.status);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    return this.mapResponse(data);
  }

  evaluateForConstruction(forecast: WeatherForecast): ConstructionWeatherRating {
    const reasons: string[] = [];
    let rating: 'good' | 'moderate' | 'poor' = 'good';

    // Regen-Check
    if (forecast.precipitationProbability > 70) {
      rating = 'poor';
      reasons.push(`Hohe Regenwahrscheinlichkeit (${forecast.precipitationProbability}%)`);
    } else if (forecast.precipitationProbability > 40) {
      if (rating === 'good') rating = 'moderate';
      reasons.push(`Möglicher Regen (${forecast.precipitationProbability}%)`);
    }

    // Frost-Check
    if (forecast.tempMin < 0) {
      rating = 'poor';
      reasons.push(`Frost (${forecast.tempMin}°C)`);
    } else if (forecast.tempMin < 5) {
      if (rating === 'good') rating = 'moderate';
      reasons.push(`Kalt (${forecast.tempMin}°C)`);
    }

    // Wind-Check (Kranarbeiten ab 50 km/h nicht möglich)
    if (forecast.windSpeedMax > 50) {
      rating = 'poor';
      reasons.push(`Starker Wind (${forecast.windSpeedMax} km/h) - keine Kranarbeiten`);
    } else if (forecast.windSpeedMax > 30) {
      if (rating === 'good') rating = 'moderate';
      reasons.push(`Wind (${forecast.windSpeedMax} km/h)`);
    }

    // Gewitter-Check (Weather Codes 95-99)
    if (forecast.weatherCode >= 95) {
      rating = 'poor';
      reasons.push(`${forecast.weatherDescription} - Arbeiten einstellen`);
    }

    return { rating, reasons };
  }

  private mapResponse(data: OpenMeteoResponse): WeatherForecast[] {
    const { daily } = data;
    return daily.time.map((date: string, i: number) => ({
      date: new Date(date),
      weatherCode: daily.weather_code[i],
      weatherDescription: this.getWeatherDescription(daily.weather_code[i]),
      tempMin: daily.temperature_2m_min[i],
      tempMax: daily.temperature_2m_max[i],
      precipitationProbability: daily.precipitation_probability_max[i],
      windSpeedMax: daily.wind_speed_10m_max[i],
    }));
  }

  private getWeatherDescription(code: number): string {
    // WMO Weather Interpretation Codes
    // https://open-meteo.com/en/docs
    const descriptions: Record<number, string> = {
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
    return descriptions[code] || 'Unbekannt';
  }
}

export function createWeatherService(): IWeatherService {
  return new OpenMeteoWeatherService();
}
