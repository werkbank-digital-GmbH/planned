# Plan D6: Wetter-Integration

## Ziel
Wetterdaten für Baustellen abrufen, um wetterabhängige Empfehlungen in Insights zu ermöglichen.

## Kontext
- Holzbau ist wetterabhängig (Regen, Frost, Wind)
- Projektadressen werden in D5 gesynct
- Open-Meteo API: kostenlos, kein API Key, DSGVO-konform
- Nominatim/OpenStreetMap für Geocoding: kostenlos, 1 Req/s Limit

## Abhängigkeit
- **D5 muss fertig sein** (Projektadressen müssen vorhanden sein)

---

## Prompt D6-1: DB-Migration + GeocodingService

```
Erstelle die Datenbank-Erweiterungen und den Geocoding-Service.

### 1. Migration erstellen: `supabase/migrations/[timestamp]_add_weather_support.sql`

```sql
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
```

### 2. GeocodingService erstellen

Neue Datei: `src/infrastructure/services/GeocodingService.ts`

```typescript
/**
 * Nominatim Geocoding Service.
 *
 * Rate Limit: max 1 Request/Sekunde (Nominatim Policy)
 * User-Agent Header ist required.
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface IGeocodingService {
  geocode(address: string): Promise<GeocodingResult | null>;
}

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
```

### 3. Interface exportieren

In `src/application/ports/services/index.ts`:
- Export `IGeocodingService` Interface

### 4. Project Entity erweitern

In `src/domain/entities/Project.ts`:
- `addressLat?: number`
- `addressLng?: number`
- `addressGeocodedAt?: Date`

### 5. Repository Mapper anpassen

In `SupabaseProjectRepository.ts`:
- Die neuen Geo-Felder mappen

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D6-2: WeatherService + Weather Cache Repository

```
Erstelle den Weather-Service und das Repository für den Wetter-Cache.

### 1. Weather Types definieren

Neue Datei: `src/domain/weather/types.ts`

```typescript
export interface WeatherForecast {
  date: Date;
  weatherCode: number;
  weatherDescription: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;  // 0-100
  windSpeedMax: number;              // km/h
}

export interface ConstructionWeatherRating {
  rating: 'good' | 'moderate' | 'poor';
  reasons: string[];
}
```

### 2. WeatherService erstellen

Neue Datei: `src/infrastructure/services/WeatherService.ts`

```typescript
/**
 * Open-Meteo Weather Service.
 * Kostenlos, kein API Key, DSGVO-konform.
 */

export interface IWeatherService {
  getForecast(lat: number, lng: number, days?: number): Promise<WeatherForecast[]>;
  evaluateForConstruction(forecast: WeatherForecast): ConstructionWeatherRating;
}

export class OpenMeteoWeatherService implements IWeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getForecast(lat: number, lng: number, days: number = 7): Promise<WeatherForecast[]> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max',
      timezone: 'Europe/Berlin',
      forecast_days: days.toString(),
    });

    const response = await fetch(`${this.baseUrl}?${params}`);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
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

    // Wind-Check
    if (forecast.windSpeedMax > 50) {
      rating = 'poor';
      reasons.push(`Starker Wind (${forecast.windSpeedMax} km/h) - keine Kranarbeiten`);
    } else if (forecast.windSpeedMax > 30) {
      if (rating === 'good') rating = 'moderate';
      reasons.push(`Wind (${forecast.windSpeedMax} km/h)`);
    }

    return { rating, reasons };
  }

  private mapResponse(data: any): WeatherForecast[] {
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
    // WMO Weather Codes
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
      61: 'Leichter Regen',
      63: 'Regen',
      65: 'Starker Regen',
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
      96: 'Gewitter mit Hagel',
      99: 'Starkes Gewitter mit Hagel',
    };
    return descriptions[code] || 'Unbekannt';
  }
}

export function createWeatherService(): IWeatherService {
  return new OpenMeteoWeatherService();
}
```

### 3. Weather Cache Repository

Neue Datei: `src/infrastructure/repositories/SupabaseWeatherCacheRepository.ts`

```typescript
export interface IWeatherCacheRepository {
  getForecasts(lat: number, lng: number, dates: Date[]): Promise<WeatherForecast[]>;
  saveForecasts(lat: number, lng: number, forecasts: WeatherForecast[]): Promise<void>;
  deleteOldEntries(olderThan: Date): Promise<number>;
}

// Implementation mit Supabase
// Round lat/lng auf 2 Dezimalstellen für Cache-Hits (ca. 1km Genauigkeit)
```

### 4. Index-Exports

- `src/domain/weather/index.ts`
- `src/infrastructure/services/index.ts` erweitern

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D6-3: Wetter Cron-Job + Geocoding bei Sync

```
Erstelle den Wetter-Caching Cron-Job und integriere Geocoding in den Sync.

### 1. Geocoding in Sync integrieren

In `SyncAsanaTaskPhasesUseCase.ts`:

Nach dem Projekt-Update, wenn `address` gesetzt und noch nicht geocoded:

```typescript
// Geocoding für neue/geänderte Adressen
if (project.address && !project.addressLat) {
  const geocodingService = createGeocodingService();
  const result = await geocodingService.geocode(project.address);

  if (result) {
    project = Project.create({
      ...project,
      addressLat: result.lat,
      addressLng: result.lng,
      addressGeocodedAt: new Date(),
    });
    await this.projectRepository.update(project);
  }
}
```

### 2. Wetter Cron-Job erstellen

Neue Datei: `src/app/api/cron/weather/route.ts`

```typescript
/**
 * Wetter-Cache Cron-Job.
 *
 * Läuft täglich um 06:00 UTC.
 * - Lädt 7-Tage-Forecast für alle aktiven Projekte mit Koordinaten
 * - Cached Ergebnisse in weather_cache
 * - Löscht alte Einträge (> 7 Tage)
 */

export async function GET(request: Request) {
  // Auth-Check (CRON_SECRET)

  // 1. Alle Tenants mit aktiven Projekten laden
  // 2. Unique Koordinaten sammeln (gerundet auf 2 Dezimalstellen)
  // 3. Für jeden Standort: Forecast holen und cachen
  // 4. Alte Cache-Einträge löschen

  return Response.json({
    locationsUpdated: count,
    cacheEntriesDeleted: deleted
  });
}
```

### 3. Vercel Cron konfigurieren

In `vercel.json`:
```json
{
  "crons": [
    // ... existierende crons
    {
      "path": "/api/cron/weather",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### 4. Server Action für manuellen Wetter-Abruf

Neue Datei oder erweitern: `src/presentation/actions/weather.ts`

```typescript
'use server';

export async function getProjectWeatherAction(projectId: string): Promise<ActionResult<WeatherForecast[]>> {
  // 1. Projekt laden
  // 2. Wenn keine Koordinaten → Geocoding versuchen
  // 3. Aus Cache laden oder frisch abrufen
  // 4. Forecasts zurückgeben
}
```

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Prompt D6-4: Wetter-UI in Insights + Tenant-Settings

```
Erstelle die Wetter-Anzeige in den Projekt-Insights und die Tenant-Settings für Firmenadresse.

### 1. Wetter-Forecast Komponente

Neue Datei: `src/presentation/components/project-details/WeatherForecast.tsx`

```tsx
'use client';

interface WeatherForecastProps {
  forecasts: WeatherForecast[];
}

export function WeatherForecastCard({ forecasts }: WeatherForecastProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cloud className="h-4 w-4" />
          Wetter (7 Tage)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {forecasts.slice(0, 7).map((day, i) => (
            <WeatherDay key={i} forecast={day} isToday={i === 0} />
          ))}
        </div>

        {/* Warnung bei schlechtem Wetter in den nächsten 3 Tagen */}
        {forecasts.slice(0, 3).some(f => evaluateForConstruction(f).rating === 'poor') && (
          <Alert variant="warning" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ungünstige Wetterbedingungen in den nächsten Tagen erwartet.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherDay({ forecast, isToday }: { forecast: WeatherForecast; isToday: boolean }) {
  const rating = evaluateForConstruction(forecast);
  const bgColor = {
    good: 'bg-green-100',
    moderate: 'bg-yellow-100',
    poor: 'bg-red-100',
  }[rating.rating];

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={cn('p-2 rounded text-center min-w-[48px]', bgColor)}>
          <p className="text-xs text-muted-foreground">
            {isToday ? 'Heute' : format(forecast.date, 'EE', { locale: de })}
          </p>
          <WeatherIcon code={forecast.weatherCode} className="h-5 w-5 mx-auto" />
          <p className="text-xs font-medium">
            {forecast.tempMin}° / {forecast.tempMax}°
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{forecast.weatherDescription}</p>
        <p>Regen: {forecast.precipitationProbability}%</p>
        <p>Wind: {forecast.windSpeedMax} km/h</p>
        {rating.reasons.length > 0 && (
          <div className="mt-1 pt-1 border-t">
            {rating.reasons.map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">{r}</p>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
```

### 2. Integration in ProjectInsightsSection

In `ProjectInsightsSection.tsx`:

```tsx
// Wetter laden
const { data: weather } = useQuery({
  queryKey: ['weather', project.id],
  queryFn: () => getProjectWeatherAction(project.id),
  enabled: !!project.addressLat,
});

// Im JSX nach den Insights:
{weather?.success && (
  <WeatherForecastCard forecasts={weather.data} />
)}

{!project.addressLat && project.address && (
  <p className="text-xs text-muted-foreground">
    📍 Adresse wird geocoded...
  </p>
)}
```

### 3. Tenant-Settings für Firmenadresse

Neue Datei: `src/presentation/components/settings/CompanyAddressForm.tsx`

```tsx
'use client';

export function CompanyAddressForm() {
  // Form für:
  // - company_address (Textfeld)
  // - "Adresse prüfen" Button → Geocoding
  // - Anzeige der gefundenen Koordinaten
  // - Optional: Mini-Map Preview
}
```

### 4. Server Action für Tenant-Adresse

In `src/presentation/actions/tenants.ts`:

```typescript
export async function updateTenantAddressAction(address: string): Promise<ActionResult<{
  address: string;
  lat: number;
  lng: number;
}>> {
  // 1. Geocoding
  // 2. Tenant updaten
  // 3. Ergebnis zurückgeben
}
```

### 5. Settings-Seite erweitern

In `/einstellungen` eine neue Sektion "Firmenstandort" hinzufügen.

### Guards ausführen:
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```
```

---

## Abhängigkeiten
- **D5** muss fertig sein (Projektadressen)

## API Limits beachten
- Nominatim: 1 Request/Sekunde, User-Agent required
- Open-Meteo: Keine dokumentierten Limits, aber fair use

## Schätzung
~4 Prompts, mittlerer bis hoher Aufwand

---

*Aktualisiert: 2026-02-03, Session 13*
