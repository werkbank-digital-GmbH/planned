-- Migration: Add Weather Support
-- Purpose: Enable weather-based insights for construction sites

-- Firmenstandort in Tenant-Settings
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS company_lng DECIMAL(10, 7);

-- Geocoding Cache für Projekte
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS address_lng DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS address_geocoded_at TIMESTAMPTZ;

-- Wetter-Cache
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  forecast_date DATE NOT NULL,
  weather_code INTEGER,
  temp_min DECIMAL(4, 1),
  temp_max DECIMAL(4, 1),
  precipitation_probability INTEGER,
  wind_speed_max DECIMAL(5, 1),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lat, lng, forecast_date)
);

-- Index für Lookups
CREATE INDEX IF NOT EXISTS idx_weather_cache_coords_date
ON weather_cache(lat, lng, forecast_date);
