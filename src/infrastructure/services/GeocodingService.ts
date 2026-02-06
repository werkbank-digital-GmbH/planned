/**
 * Nominatim Geocoding Service.
 *
 * Rate Limit: max 1 Request/Sekunde (Nominatim Policy)
 * User-Agent Header ist required.
 *
 * Features:
 * - Adress-Normalisierung für bessere Trefferquote
 * - Fallback auf PLZ + Stadt wenn volle Adresse nicht gefunden
 * - Strukturierte Suche als zweiter Fallback
 * - Logging für Debugging
 */

import type { IGeocodingService, GeocodingResult } from '@/application/ports/services/IGeocodingService';

export class NominatimGeocodingService implements IGeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'planned-app/1.0 (kontakt@planned.app)';
  private lastRequestTime = 0;

  async geocode(address: string): Promise<GeocodingResult | null> {
    const trimmed = address.trim();
    if (!trimmed) return null;

    console.log('[Geocoding] Searching for:', trimmed);

    // 1. Versuch: Volle Adresse suchen
    const result = await this.search(trimmed);
    if (result) {
      console.log('[Geocoding] Found:', result.displayName);
      return result;
    }

    // 2. Versuch: PLZ + Stadt extrahieren und suchen
    const cityFallback = this.extractCityFromAddress(trimmed);
    if (cityFallback && cityFallback !== trimmed) {
      console.log('[Geocoding] Fallback to city:', cityFallback);
      const cityResult = await this.search(cityFallback);
      if (cityResult) {
        console.log('[Geocoding] Found via city fallback:', cityResult.displayName);
        return cityResult;
      }
    }

    // 3. Versuch: Strukturierte Suche (Straße, Stadt, PLZ separat)
    const structured = this.parseAddress(trimmed);
    if (structured) {
      console.log('[Geocoding] Trying structured search:', structured);
      const structuredResult = await this.structuredSearch(structured);
      if (structuredResult) {
        console.log('[Geocoding] Found via structured search:', structuredResult.displayName);
        return structuredResult;
      }
    }

    console.warn('[Geocoding] No results for:', trimmed);
    return null;
  }

  /**
   * Einfache Freitext-Suche.
   */
  private async search(query: string): Promise<GeocodingResult | null> {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'de,at,ch', // DACH-Region
    });

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.error('[Geocoding] Request failed:', response.status, response.statusText);
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
    } catch (error) {
      console.error('[Geocoding] Fetch error:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Strukturierte Suche mit separaten Feldern.
   */
  private async structuredSearch(
    parsed: { street?: string; city?: string; postalCode?: string }
  ): Promise<GeocodingResult | null> {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      countrycodes: 'de,at,ch',
    });

    if (parsed.street) params.set('street', parsed.street);
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.postalCode) params.set('postalcode', parsed.postalCode);

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) return null;

      const results = await response.json();
      if (!results || results.length === 0) return null;

      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        displayName: results[0].display_name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Erzwingt Rate Limiting: min 1s zwischen Requests.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Extrahiert PLZ + Stadt aus einer Adresse.
   *
   * Erkennt Formate wie:
   * - "Musterstraße 1, 70173 Stuttgart"
   * - "Musterstraße 1, Stuttgart"
   * - "70173 Stuttgart"
   */
  private extractCityFromAddress(address: string): string | null {
    // Versuche PLZ + Stadt zu finden (z.B. "70173 Stuttgart")
    const plzCityMatch = address.match(/(\d{4,5})\s+([A-Za-zÄÖÜäöüß\s-]+)/);
    if (plzCityMatch) {
      return `${plzCityMatch[1]} ${plzCityMatch[2].trim()}`;
    }

    // Wenn Komma vorhanden, nimm den Teil nach dem Komma
    const parts = address.split(',');
    if (parts.length >= 2) {
      const afterComma = parts.slice(1).join(',').trim();
      if (afterComma.length > 2) {
        return afterComma;
      }
    }

    return null;
  }

  /**
   * Versucht eine Adresse in strukturierte Bestandteile zu zerlegen.
   *
   * Erkennt das Format: "Straße Nr, PLZ Stadt"
   */
  private parseAddress(address: string): { street?: string; city?: string; postalCode?: string } | null {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length < 2) return null;

    const street = parts[0];
    const cityPart = parts.slice(1).join(', ').trim();

    // PLZ + Stadt aus dem Stadtteil extrahieren
    const plzMatch = cityPart.match(/^(\d{4,5})\s+(.+)$/);

    if (plzMatch) {
      return {
        street,
        postalCode: plzMatch[1],
        city: plzMatch[2].trim(),
      };
    }

    // Nur Stadt (ohne PLZ)
    return {
      street,
      city: cityPart,
    };
  }
}

export function createGeocodingService(): IGeocodingService {
  return new NominatimGeocodingService();
}
