/**
 * Geocoding Service Interface
 *
 * Converts addresses to geographic coordinates (lat/lng).
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface IGeocodingService {
  /**
   * Geocode an address string to coordinates.
   * @param address - Human-readable address
   * @returns Coordinates and display name, or null if not found
   */
  geocode(address: string): Promise<GeocodingResult | null>;
}
