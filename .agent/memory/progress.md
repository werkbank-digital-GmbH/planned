# Progress Log

## 2026-02-06 (Session 16)

### Session: Bugfix BF-1 (Performance) + BF-2 (Geocoding)

**Abgeschlossen:**

1. **BF-1: Insights Performance-Optimierung** ✅
   - `GenerateInsightsUseCase.ts` komplett refactored:
     - Neue `processTenant()` Methode mit Batch-Strategie
     - `getSnapshotsForPhasesInDateRange()` - 1 Query für alle Phase-Snapshots
     - Tenant-Level Availability (1x laden, für alle Phasen wiederverwenden)
     - Wetter pro Koordinaten-Paar gecacht (Map mit `lat,lng` Key)
     - `preparePhaseInsight()` - Synchrone Vorberechnung ohne I/O
     - `generateTextsAndSave()` - Claude API Call + DB-Upsert pro Phase
     - `Promise.allSettled` in 10er-Batches für parallele Claude Calls
   - `AvailabilityAnalyzer.ts`:
     - Neue `getTenantAvailabilityContext()` Methode
     - `getAllocationsForTenant()` - 1 Tenant-Query statt N User-Queries
     - Bestehende `findAvailableUsers()` + `findOverloadedUsers()` ebenfalls auf Tenant-Query umgestellt
   - `IAnalyticsRepository.ts` - Interface erweitert:
     - `getSnapshotsForPhasesInDateRange(phaseIds[], startDate, endDate)`
   - `SupabaseAnalyticsRepository.ts`:
     - Implementation mit `.in('phase_id', phaseIds)` und Gruppierung

2. **BF-2: Robustes Geocoding** ✅
   - `GeocodingService.ts` - 3-Stufen Geocoding:
     - `search()` - Freitext-Suche
     - `extractCityFromAddress()` - PLZ+Stadt Fallback
     - `structuredSearch()` - Straße, PLZ, Stadt separat
     - `enforceRateLimit()` - Extrahierte Rate-Limit-Logik
     - `parseAddress()` - Adress-Parsing für strukturierte Suche
     - Logging auf jeder Stufe
   - `tenant.ts`:
     - Verbesserte Fehlermeldung mit Formathinweis

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Geänderte Dateien (6):**
- `src/application/use-cases/analytics/GenerateInsightsUseCase.ts` - Performance-Refactor
- `src/application/services/AvailabilityAnalyzer.ts` - Tenant-Batch-Query + neue Methode
- `src/domain/analytics/IAnalyticsRepository.ts` - Batch-Interface
- `src/infrastructure/repositories/SupabaseAnalyticsRepository.ts` - Batch-Implementation
- `src/infrastructure/services/GeocodingService.ts` - 3-Stufen Fallback
- `src/presentation/actions/tenant.ts` - Bessere Fehlermeldung

**Erwartete Performance-Verbesserung:**
- Vorher: ~180-240s (sequentielle Queries + sequentielle Claude Calls)
- Nachher: ~20-40s (Batch-Queries + parallele Claude Calls)

---

## 2026-02-03 (Session 15)

### Session: Plan D7 - Enhanced Recommendations (Teil 1 + Teil 2 + Teil 3)

**Abgeschlossen:**

1. **D7-1: AvailabilityAnalyzer + DB-Migration** ✅
   - Migration: `20260203212104_add_suggested_actions.sql`
     - `suggested_action JSONB` Feld in `phase_insights` Tabelle
   - Types in `types.ts`:
     - `SuggestedAction`, `SuggestedActionType` (assign_user, reschedule, alert, none)
     - `AvailableUser`, `OverloadedUser`, `AvailabilityContext`
   - `AvailabilityAnalyzer.ts` Service:
     - `findAvailableUsers()` - Findet User mit freier Kapazität
     - `findOverloadedUsers()` - Findet überlastete User (>100%)
     - `getAvailabilityContext()` - Aggregiert beides

2. **D7-2: Enhanced KI-Prompts + Use Case** ✅
   - `IInsightTextGenerator.ts` erweitert:
     - `EnhancedPhaseTextInput` mit Weather & Availability Context
     - `GeneratedTextsWithAction` mit `suggestedAction`
     - `generateEnhancedPhaseTexts()` Methode
   - `InsightTextGenerator.ts` erweitert:
     - Enhanced Claude Prompt mit Wetter, Verfügbarkeit, konkreten Handlungsempfehlungen
     - `buildEnhancedPhasePrompt()` mit deutschsprachigem System-Prompt
     - `generateEnhancedFallbackTexts()` für regelbasierte Fallbacks
   - `GenerateInsightsUseCase.ts` erweitert:
     - Optional `EnhancedDependencies` (availabilityAnalyzer, weatherService, weatherCacheRepository)
     - `buildEnhancedInput()`, `getWeatherContext()`, `mapForecastToContext()`
   - Cron Route `/api/cron/insights` mit allen Enhanced Dependencies

3. **D7-3: Actionable UI + Action-Handler** ✅
   - `InsightCard.tsx` erweitert:
     - `ActionButton` Komponente (assign_user, reschedule, alert)
     - Props: `suggestedAction`, `onActionClick`
   - `ProjectInsightsSection.tsx` erweitert:
     - `handlePhaseActionClick()` Handler
     - `QuickAssignDialog` State Management
   - `QuickAssignDialog.tsx` NEU:
     - Day-Selection für vorgeschlagene Tage
     - Quick-Assign oder "In Planung öffnen"
     - Success/Error States
   - `quickAssignUserToPhaseAction` Server Action:
     - Nutzt bestehenden `CreateAllocationUseCase`
     - Erstellt Allocation für jeden ausgewählten Tag
     - Warnings für Abwesenheiten/Mehrfach-Zuweisungen
   - `PhaseInsightDTO` erweitert mit `suggestedAction`

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Neue Dateien:**
- `supabase/migrations/20260203212104_add_suggested_actions.sql`
- `src/application/services/AvailabilityAnalyzer.ts`
- `src/presentation/components/project-details/QuickAssignDialog.tsx`
- `src/presentation/actions/quick-assign.ts`

**Geänderte Dateien:**
- `src/domain/analytics/types.ts` - SuggestedAction Types
- `src/application/ports/services/IInsightTextGenerator.ts` - Enhanced Types
- `src/infrastructure/ai/InsightTextGenerator.ts` - Enhanced Generation
- `src/application/use-cases/analytics/GenerateInsightsUseCase.ts` - Enhanced Dependencies
- `src/app/api/cron/insights/route.ts` - Enhanced Dependencies instantiation
- `src/presentation/actions/insights.ts` - suggestedAction im DTO
- `src/presentation/components/project-details/InsightCard.tsx` - ActionButton
- `src/presentation/components/project-details/ProjectInsightsSection.tsx` - Action Handler
- `src/presentation/components/project-details/index.ts` - QuickAssignDialog Export
- `src/presentation/components/planning/ProjectDetailModal.tsx` - Props angepasst

---

## 2026-02-03 (Session 14)

### Session: Plan D6 - Wetter-Integration

**Abgeschlossen:**

1. **D6-1: DB-Migration + GeocodingService** ✅
   - Migration: `20260203204957_add_weather_support.sql`
     - `weather_cache` Tabelle mit Koordinaten, Forecast-JSON, TTL
     - Geo-Felder in `projects` und `tenants` (lat, lng, geocoded_at)
   - `NominatimGeocodingService` mit Rate Limiting (1 req/s)
   - `Project` Entity erweitert: `addressLat`, `addressLng`, `addressGeocodedAt`, `withGeoLocation()`

2. **D6-2: WeatherService + Cache Repository** ✅
   - `WeatherService` mit Open-Meteo API (7-Tage-Vorhersage)
   - `WeatherForecast` und `ConstructionWeatherRating` Types
   - Bautauglichkeits-Bewertung: good/moderate/poor basierend auf Wetter, Niederschlag, Wind
   - `SupabaseWeatherCacheRepository` mit Koordinaten-Rundung (~1km)

3. **D6-3: Wetter Cron-Job + Geocoding bei Sync** ✅
   - `/api/cron/weather` Route (täglich 05:30 UTC)
   - `SyncAsanaTaskPhasesUseCase` erweitert mit optionalem `IGeocodingService`
   - Geocoding automatisch bei Asana-Sync wenn Adresse vorhanden

4. **D6-4: Wetter-UI + Firmenstandort** ✅
   - `WeatherForecastCard` mit 7-Tage-Ansicht und Farbcodierung
   - `WeatherIcon` für WMO-Wettercodes
   - Integration in `ProjectDetailModal`
   - `CompanyAddressForm` für Firmenstandort in `/einstellungen/unternehmen`
   - `updateCompanyAddressAction` mit Geocoding-Validierung
   - `alert.tsx` UI-Komponente erstellt

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Commit:** `9b1203c`

---

## 2026-02-03 (Session 13)

### Session: Plan D5 - Asana-Sync Erweiterung

**Abgeschlossen:**

1. **D5-1: DB-Migration + Repository-Anpassungen** ✅
   - Migration: `20260203210000_add_description_and_address.sql`
     - `description TEXT` in `project_phases`
     - `address_conflict BOOLEAN DEFAULT false` in `projects`
     - `asana_address_field_id TEXT` in `integration_credentials`
   - Entity-Erweiterungen:
     - `ProjectPhase.description` Property
     - `Project.addressConflict` Property + `withAddressConflict()` Methode
   - Mapper aktualisiert: `ProjectPhaseMapper`, `ProjectMapper`
   - Repositories aktualisiert: `SupabaseProjectPhaseRepository`, `SupabaseProjectRepository`, `SupabaseIntegrationCredentialsRepository`
   - `IIntegrationCredentialsRepository` Interface erweitert

2. **D5-2: AsanaService + SyncUseCase Erweiterung** ✅
   - `IAsanaService` Interface erweitert:
     - `AsanaTask` mit `notes?: string` und `html_notes?: string`
     - `AsanaTaskSyncConfig` mit `addressFieldId?: string`
     - `MappedTaskPhaseData` mit `description?: string` und `projectAddress?: string`
   - `AsanaService.getTasksFromProject()`: Lädt jetzt `notes` und `html_notes`
   - `AsanaService.mapTaskToPhase()`:
     - HTML-Tag-Stripping für Beschreibung
     - Projektadresse aus Custom Field extrahieren
   - `SyncAsanaTaskPhasesUseCase`:
     - Adress-Validierungslogik (alle Phasen gleiche Adresse → nutzen, unterschiedlich → `addressConflict = true`)
     - Speichert `description` bei Phasen

3. **D5-3: UI für Custom Field Mapping + Adress-Anzeige** ✅
   - `FieldMappingDTO` erweitert mit `addressFieldId`
   - `AsanaSourceConfigDTO` erweitert mit `addressFieldId`
   - `AsanaFieldMapping.tsx`: Neues "Projektadresse" Feld
   - `ProjectSyncCard.tsx`: Adress-Mapping-Zeile hinzugefügt
   - `AsanaTaskFieldMappingCard.tsx`: Adress-Feld Select hinzugefügt
   - `AsanaSourceConfigCard.tsx`: `addressFieldId` im State
   - `PhaseInsightDTO` erweitert mit `phaseDescription: string | null`
   - `ProjectInsightDTO` erweitert mit `projectAddress: string | null` und `addressConflict: boolean`
   - `getProjectInsightsAction()` lädt jetzt Adresse und Description

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Neue Dateien:**
- `supabase/migrations/20260203210000_add_description_and_address.sql`

**Geänderte Dateien (19):**
- Domain: `Project.ts`, `ProjectPhase.ts`
- Infrastructure: `ProjectMapper.ts`, `ProjectPhaseMapper.ts`, `SupabaseProjectRepository.ts`, `SupabaseProjectPhaseRepository.ts`, `SupabaseIntegrationCredentialsRepository.ts`, `AsanaService.ts`
- Application: `IAsanaService.ts`, `IIntegrationCredentialsRepository.ts`, `SyncAsanaTaskPhasesUseCase.ts`, `SyncAsanaAbsencesUseCase.test.ts`
- Presentation: `integrations.ts`, `insights.ts`, `AsanaFieldMapping.tsx`, `ProjectSyncCard.tsx`, `AsanaSourceConfigCard.tsx`, `AsanaTaskFieldMappingCard.tsx`

**Commit:** `47bdf75`

---

## 2026-02-03 (Session 12)

### Session: D4-3 und D4-4 Fertigstellung

**Abgeschlossen:**

1. **D4-3: Phasen-Status + Sparklines** ✅
   - `TrendSparkline.tsx` - Pure SVG Sparkline Komponente
   - `PhaseRow.tsx` - `border-l-4` mit Status-Farben (grün/gelb/rot/blau/grau)
   - `getPhaseSnapshotsAction()` Server Action
   - `PhaseRowData.insightStatus` Feld hinzugefügt
   - Commit: `acb535a`

2. **D4-4: Refresh-Mechanismus mit Rate Limiting** ✅
   - DB Migration: `insights_last_refresh_at` in tenants Tabelle
   - API Route `/api/insights/refresh` (POST + GET)
   - Rate Limit: 1x/Stunde pro Tenant (in DB gespeichert)
   - `useRefreshInsights.ts` Hook mit Client-State
   - `RefreshInsightsButton.tsx` (3 States: bereit/läuft/warten)
   - Dashboard-Integration mit Countdown-Anzeige
   - Commit: `e4f9f16`

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Neue Dateien (D4-3):**
- `src/presentation/components/project-details/TrendSparkline.tsx`

**Neue Dateien (D4-4):**
- `src/app/api/insights/refresh/route.ts`
- `src/presentation/components/dashboard/RefreshInsightsButton.tsx`
- `src/presentation/hooks/useRefreshInsights.ts`
- `supabase/migrations/20260203195031_add_insights_refresh_tracking.sql`

**Geänderte Dateien:**
- `src/presentation/actions/insights.ts` - getPhaseSnapshotsAction
- `src/presentation/components/planning/PhaseRow.tsx` - border-l-4 Status
- `src/application/queries/GetAllocationsForWeekQuery.ts` - insightStatus
- `src/presentation/components/project-details/index.ts` - TrendSparkline Export
- `src/presentation/components/dashboard/index.ts` - RefreshInsightsButton Export
- `src/app/(dashboard)/dashboard/page.tsx` - Button-Integration

---

## 2026-02-03 (Session 11 - Teil 2)

### Session: D4-1 und D4-2 Implementation

**Abgeschlossen:**

1. **D4-1: Dashboard KPIs** ✅
   - `AnalyticsKPIs.tsx` - 4 KPI-Karten (Projekte im Verzug, Fortschritt, Kritische Phasen, Burn Rate)
   - `RiskProjectsList.tsx` - Top 3 Risiko-Projekte mit Links
   - `InsightsLastUpdated.tsx` - Timestamp-Anzeige
   - Server Action `getTenantInsightsAction()`
   - Commit: `145b2a0`

2. **D4-2: Projekt-Modal** ✅
   - `ProjectDetailModal.tsx` - Fast fullscreen Dialog
   - `ProjectInsightsSection.tsx` - KI-Texte + Phase-Details
   - `InsightCard.tsx` - Einzelne Insight-Anzeige
   - Server Action `getProjectInsightsAction()`
   - Trigger: `?`-Icon neben Projekt in Sidebar
   - Commit: `749f3cc`

**Guard-Ergebnisse:**
- ESLint: ✅ (nur bekannte console Warnings)
- TypeScript: ✅
- Tests: 602 passed

**Neue Dateien:**
- `src/presentation/actions/insights.ts`
- `src/presentation/components/dashboard/AnalyticsKPIs.tsx`
- `src/presentation/components/dashboard/RiskProjectsList.tsx`
- `src/presentation/components/dashboard/InsightsLastUpdated.tsx`
- `src/presentation/components/dashboard/RefreshInsightsButton.tsx`
- `src/presentation/components/planning/ProjectDetailModal.tsx`
- `src/presentation/components/project-details/ProjectInsightsSection.tsx`
- `src/presentation/components/project-details/InsightCard.tsx`
- `src/presentation/components/project-details/TrendSparkline.tsx`
- `src/presentation/hooks/useRefreshInsights.ts`
- `src/app/api/insights/refresh/route.ts`
- `supabase/migrations/20260203195031_add_insights_refresh_tracking.sql`

---

## 2026-02-03 (Session 11 - Teil 1)

### Session: Analytics UI Planung (D4-D7)

**Typ:** Sparring & Planung

**Ergebnis:**
- Intensive Requirements-Analyse mit Challenge/Counter-Challenge
- 21 Löcher identifiziert und geklärt
- 4 detaillierte Pläne erstellt (D4-D7)

**Entscheidungen:**
- Modal für Projekt-Details (nicht Popover, nicht Side Panel)
- Phasen-Status via `border-l-4` Farben (grün/gelb/rot)
- Dashboard = GF-View (Tenant-KPIs), Planungsview = Planer-View
- Refresh 1x/Stunde mit Optimistic UI
- Open-Meteo (Wetter) + Nominatim (Geocoding) - beide kostenlos
- Asana Source of Truth, Task-Description + Projektadresse syncen

**Tech Debt hinzugefügt:**
- UI: Spacing zwischen Projekten/Phasen
- Bidirektionaler Sync: Plan-Stunden → Asana

---

## 2026-02-03 (Session 10)

### Session: Analytics & Insights (Plan D1-D3)

**Abgeschlossen:**

1. **Plan D1: Analytics Datenbank-Schema** ✅
   - Migration: `20260203144546_add_analytics_tables.sql`
   - Neue Tabellen: `phase_snapshots`, `phase_insights`, `project_insights`
   - Types: `src/domain/analytics/types.ts`
   - Repository Interface: `src/domain/analytics/IAnalyticsRepository.ts`
   - Commit: `e354dd0`

2. **Plan D2: Snapshot Cron-Job** ✅
   - Migration: `20260203151010_add_analytics_functions.sql`
   - Repository: `SupabaseAnalyticsRepository.ts`
   - Use Case: `GeneratePhaseSnapshotsUseCase.ts`
   - Cron Route: `/api/cron/snapshots` (täglich 05:00 UTC)
   - Commit: `5e64788`

3. **Plan D3: Insights Generator mit KI** ✅
   - **Domain Services:**
     - `BurnRateCalculator.ts` - Berechnet Burn Rate mit Trend-Erkennung
     - `ProgressionCalculator.ts` - Projiziert Fertigstellung, Status, Datenqualität
     - `ProjectInsightAggregator.ts` - Aggregiert Phase-Insights zu Projekt-Ebene
   - **KI-Service:**
     - `InsightTextGenerator.ts` - Generiert motivierende deutsche Texte
     - Interface `IInsightTextGenerator.ts` für Clean Architecture
     - Fallback auf regelbasierte Texte bei API-Fehler
   - **Use Case:**
     - `GenerateInsightsUseCase.ts` - Orchestriert alle Berechnungen
   - **Infrastruktur:**
     - Cron Route: `/api/cron/insights` (täglich 05:15 UTC)
     - `ANTHROPIC_API_KEY` Env-Variable
     - `@anthropic-ai/sdk` Dependency
   - Commit: `bca2870`

**Guard-Ergebnisse:**
- ESLint: ✅ (nur erwartete Warnings)
- TypeScript: ✅
- Tests: 602 bestanden

**Neue Dateien:**
- `supabase/migrations/20260203144546_add_analytics_tables.sql`
- `supabase/migrations/20260203151010_add_analytics_functions.sql`
- `src/domain/analytics/types.ts`
- `src/domain/analytics/IAnalyticsRepository.ts`
- `src/domain/analytics/BurnRateCalculator.ts`
- `src/domain/analytics/ProgressionCalculator.ts`
- `src/domain/analytics/ProjectInsightAggregator.ts`
- `src/domain/analytics/index.ts`
- `src/infrastructure/repositories/SupabaseAnalyticsRepository.ts`
- `src/infrastructure/ai/InsightTextGenerator.ts`
- `src/infrastructure/ai/index.ts`
- `src/application/ports/services/IInsightTextGenerator.ts`
- `src/application/use-cases/analytics/GeneratePhaseSnapshotsUseCase.ts`
- `src/application/use-cases/analytics/GenerateInsightsUseCase.ts`
- `src/application/use-cases/analytics/index.ts`
- `src/app/api/cron/snapshots/route.ts`
- `src/app/api/cron/insights/route.ts`

**Geänderte Dateien:**
- `vercel.json` - Neue Cron-Schedules
- `src/lib/env-server.ts` - ANTHROPIC_API_KEY
- `src/application/ports/services/index.ts` - IInsightTextGenerator Export
- `package.json` + `pnpm-lock.yaml` - @anthropic-ai/sdk

---

## 2026-02-03 (Session 9)

### Session: Card-Konsistenz & Popover UI

**Abgeschlossen:**

1. **Plan A: HoursDisplay Click-Popover** ✅
   - Tooltip durch Popover ersetzt für bessere Touch-Unterstützung
   - Button-Animation bei Klick (`active:scale-95`)
   - Commit: `3a5db66`

2. **Plan B: Resize Bug-Fix + Animation** ✅
   - Off-by-One-Bug beim Resize nach links behoben
   - Threshold-basierte Rundung statt Math.round()
   - Pixelgenaue Animation während des Drags
   - Smooth Snap-Transition (150ms ease-out)
   - Commit: `3a5db66`

3. **Plan C: Card-Konsistenz** ✅
   - Gemeinsame Styles in `assignment-card.styles.ts` extrahiert
   - Neue `AllocationPopover.tsx` Komponente mit:
     - IST/PLAN/SOLL Grid mit Icons
     - Auslastungs-Balken (grün/orange/rot)
     - Varianz-Anzeige
     - Phase & Projekt Info
     - Konflikt-Warnung
   - AssignmentCard & SpanningAssignmentCard vereinheitlicht
   - Test für compact-mode angepasst
   - Commit: `f1dce79`

4. **Dezimalstellen-Formatierung** ✅
   - Neue `src/lib/format.ts` mit `formatHours()` und `formatHoursWithUnit()`
   - 16 Komponenten aktualisiert
   - Konsistent max 2 Dezimalstellen, keine trailing zeros
   - Commit: `3a5db66`

**Guard-Ergebnisse:**
- ESLint: ✅ (nur erwartete Warnings)
- TypeScript: ✅
- Tests: 602 bestanden

**Neue Dateien:**
- `src/lib/format.ts`
- `src/presentation/components/planning/assignment-card.styles.ts`
- `src/presentation/components/planning/AllocationPopover.tsx`

**Geänderte Dateien:**
- `src/presentation/components/planning/HoursDisplay.tsx` - Popover statt Tooltip
- `src/presentation/hooks/useAllocationResize.ts` - Bug-Fix + Animation
- `src/presentation/components/planning/AssignmentCard.tsx` - Shared Styles + Popover
- `src/presentation/components/planning/SpanningAssignmentCard.tsx` - Shared Styles + Popover
- 16 Komponenten für formatHoursWithUnit

---

## 2026-02-03 (Session 8)

### Session: Bugfix Environment Variables + Planning UI Features

**Abgeschlossen:**

1. **Bugfix: Environment Variables Split** ✅
   - Production-Crash auf `/dashboard` behoben
   - `env.ts` aufgeteilt in `env-client.ts` und `env-server.ts`
   - Server-only Guard verhindert Client-Import von Server-Variablen
   - Vitest Mock für `server-only` hinzugefügt
   - Commit: `644823d`

2. **Review & Push: Planning UI Verbesserungen** ✅
   - Plan 3: MonthGrid responsive (CSS Grid, minmax)
   - Plan 4: Spacing zwischen Projekten
   - Plan 5: Vertikales Scrolling
   - Commits: `1a9bf9c`, `3032952`, `3ec58f8`

3. **Review & Push: Planning UX Improvements** ✅
   - HoursDisplay (IST/PLAN/SOLL) mit Icons und Tooltips
   - Optimistic Updates für sofortige UI-Reaktion
   - Echtzeit Resize-Animation mit useAllocationResize Hook
   - Commit: `a2c3824`

**Guard-Ergebnisse:**
- ESLint: ✅
- TypeScript: ✅
- Tests: 602 bestanden

---

## 2026-02-03 (Session 7)

### Session: Planning UX Improvements

**Abgeschlossen:**

1. **Plan: Stunden-Anzeige überarbeiten (IST/PLAN/SOLL)** ✅
   - Neue `HoursDisplay.tsx` Komponente
   - Icons: Clock (IST), Calendar (PLAN), Target (SOLL)
   - Tooltips mit detaillierten Beschreibungen
   - Farben: grün/orange/rot je nach Verhältnis
   - Integration in ProjectRow, PhaseRow, MonthGrid

2. **Plan 1: Optimistic Updates für schnellere UI-Reaktion** ✅
   - PlanningContext erweitert mit 4 neuen Funktionen:
     - `addAllocationOptimistic`
     - `removeAllocationOptimistic`
     - `moveAllocationOptimistic`
     - `replaceAllocationId`
   - DndProvider nutzt optimistische Updates vor Server-Calls
   - Rollback bei Server-Fehlern

3. **Plan 2: Echtzeit Resize-Animation** ✅
   - Neuer Hook `useAllocationResize.ts`
   - Mouse und Touch Support
   - Live-Preview während des Ziehens
   - Phase-Constraints (Start/End-Datum)
   - dnd-kit Resize-Logik entfernt
   - Tests aktualisiert mit PlanningContext Mock
   - Commit: `a2c3824`

**Guard-Ergebnisse:**
- ESLint: ✅
- TypeScript: ✅
- Tests: 602 bestanden

**Neue Dateien:**
- `src/presentation/components/planning/HoursDisplay.tsx`
- `src/presentation/hooks/useAllocationResize.ts`

**Geänderte Dateien:**
- `src/presentation/contexts/PlanningContext.tsx` - Optimistic Update Funktionen
- `src/presentation/components/planning/DndProvider.tsx` - Resize-Logik entfernt
- `src/presentation/components/planning/AssignmentCard.tsx` - useAllocationResize Hook
- `src/presentation/components/planning/SpanningAssignmentCard.tsx` - useAllocationResize Hook
- `src/presentation/components/planning/PhaseRow.tsx` - Data-Attribute für Resize
- `src/presentation/components/planning/ProjectRow.tsx` - HoursDisplay Integration
- `src/presentation/components/planning/MonthGrid.tsx` - HoursDisplay Integration
- `src/application/queries/GetAllocationsForWeekQuery.ts` - totalActualHours hinzugefügt
- `src/presentation/hooks/index.ts` - Export für useAllocationResize
- `src/presentation/components/planning/index.ts` - Export für HoursDisplay

---

## 2026-02-03 (Session 6)

### Session: Planning UI Optimierungen

**Abgeschlossen:**

1. **Plan 4: Spacing zwischen Projekten** ✅
   - `flex flex-col gap-2 p-2` statt `divide-y`
   - Projekt-Karten mit `rounded-lg border shadow-sm`
   - Konsistent in Wochen- und Monatsansicht
   - Commit: `1a9bf9c`

2. **Plan 3: MonthGrid Responsive Layout** ✅
   - CSS Grid mit `minmax(32px, 1fr)` für Tagesspalten
   - Nutzt volle Breite bis zum rechten Rand
   - Sticky Header bei horizontalem Scroll
   - Commit: `3032952`

3. **Plan 5: Vertikales Scrolling** ✅
   - Feste Höhe `h-[calc(100vh-112px)]` für Planungsbereich
   - Header bleibt fixiert, Grid-Area scrollt
   - ResourcePool mit `shrink-0` am unteren Rand
   - Funktioniert in Wochen- und Monatsansicht
   - Commit: `3ec58f8`

**Guard-Ergebnisse:**
- ESLint: ✅
- TypeScript: ✅
- Tests: 602 bestanden

**Geänderte Dateien:**
- `src/app/(dashboard)/planung/page.tsx`
- `src/presentation/components/planning/PlanningGrid.tsx`
- `src/presentation/components/planning/MonthGrid.tsx`
- `src/presentation/components/planning/ProjectRow.tsx`

---

## Commit History (relevant)

```
9b1203c feat: Add weather integration for construction sites (Plan D6)
47bdf75 feat: Extend Asana sync with task descriptions and project addresses (Plan D5)
e4f9f16 feat: Add manual insights refresh with rate limiting (Plan D4-4)
acb535a feat: Add phase status colors and trend sparklines (Plan D4-3)
749f3cc feat: Add project detail modal with insights in planning view (Plan D4-2)
145b2a0 feat: Add dashboard analytics KPIs and risk projects (Plan D4-1)
bca2870 feat: Add insights generator with AI text generation (Plan D3)
5e64788 feat: Add snapshot cron job for analytics (Plan D2)
e354dd0 feat: Add analytics database schema (Plan D1)
f1dce79 refactor: Unify AssignmentCard styles with shared styles and AllocationPopover
3a5db66 feat: Add click popovers for hours display and fix resize animation
a2c3824 feat: Improve planning UI with hours display, optimistic updates and real-time resize
3ec58f8 feat: Add vertical scrolling to planning area
3032952 feat: Make MonthGrid responsive with full-width layout
1a9bf9c style: Add spacing between projects in PlanningGrid
8c6e842 chore: Add Agentic Operating System (AOS) for project memory
ced74d6 fix: Add hydration guard to SyncNotificationListener
c8afc7f feat: Add sync notification toasts for Asana updates
a30208f feat: Add resizable ResourcePool and align columns with PlanningGrid
8ac0064 feat: Add webhook signature cleanup and use case tests
280e9cd feat: Extend Cron-Job with full Asana sync (tasks, users, absences)
377bb70 refactor: Improve Custom Field Mapping UI with table layout
39002b8 refactor: Restructure integrations page by function
c450f82 feat: Add login button to landing page
6fe44bc feat: Extend Asana integration with user mapping, actual hours, and absences
5877ff8 refactor: Remove TimeTac integration completely
```
