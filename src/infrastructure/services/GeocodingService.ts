/**
 * Nominatim Geocoding Service.
 *
 * Rate Limit: max 1 Request/Sekunde (Nominatim Policy)
 * User-Agent Header ist required.
 */

import type { IGeocodingService, GeocodingResult } from '@/application/ports/services/IGeocodingService';

export class NominatimGeocodingService implements IGeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'planned-app/1.0 (kontakt@planned.app)';
  private lastRequestTime = 0;

  async geocode(address: string): Promise<GeocodingResult | null> {
    // Rate Limiting: min 1s zwischen Requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'de,at,ch', // DACH-Region
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      console.error('[Geocoding] Request failed:', response.status);
      return null;
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  }
}

export function createGeocodingService(): IGeocodingService {
  return new NominatimGeocodingService();
}
