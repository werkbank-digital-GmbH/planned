# Active Context

## Aktueller Stand (2026-02-06, Session 16)

### Zuletzt Abgeschlossen

**Bugfix-Session: BF-1 Performance + BF-2 Geocoding** ✅

| Prompt | Inhalt | Status |
|--------|--------|--------|
| BF-1 | Insights Performance-Optimierung (Batch + Parallel + Tenant-Level) | ✅ |
| BF-2 | Robustes Geocoding mit Fallback + bessere Fehlermeldungen | ✅ |

**BF-1: Performance-Optimierung (4 Dateien geändert)**

1. `GenerateInsightsUseCase.ts` - Komplett refactored:
   - Snapshots batch-geladen (1 Query statt N pro Phase)
   - Availability einmal pro Tenant geladen (statt pro Phase)
   - Wetter pro Koordinaten-Paar gecacht (statt pro Phase)
   - Claude API Calls parallel in 10er-Batches (statt sequentiell)
   - Zwei-Phasen-Architektur: Vorberechnung → KI-Texte parallel
2. `AvailabilityAnalyzer.ts` - Neue `getTenantAvailabilityContext()` Methode + N+1 Fix:
   - `getAllocationsForTenant()` statt N einzelne `findByUserAndDateRange()` Queries
   - Nutzt `findByTenantAndDateRange()` für einen einzigen DB-Query
3. `IAnalyticsRepository.ts` - Neue `getSnapshotsForPhasesInDateRange()` Methode
4. `SupabaseAnalyticsRepository.ts` - Implementation mit `.in('phase_id', phaseIds)`

**BF-2: Robustes Geocoding (2 Dateien geändert)**

1. `GeocodingService.ts` - 3-Stufen Geocoding:
   - Stufe 1: Volle Adresse suchen
   - Stufe 2: PLZ + Stadt extrahieren (Fallback)
   - Stufe 3: Strukturierte Suche (Straße, PLZ, Stadt separat)
   - Logging auf jeder Stufe für Debugging
2. `tenant.ts` - Bessere Fehlermeldung mit Formathinweis

### Nächste Features / Offene Prompts

- **BF-3: Asana Sync Robustheit** - Noch nicht implementiert:
  - Explizite Pagination für getTasksFromProject
  - Graceful Degradation bei fehlenden Custom Fields
  - Rate-Limit-aware Sync (min 100ms zwischen API-Calls)

### Tech Debt

- **Pre-Selection in Planungsview** - URL-Params werden gesetzt aber nicht gelesen
- **DB-Migrationen auf Produktion** - Müssen manuell im Supabase Dashboard ausgeführt werden (3 Migrationen: D5, D6, D7)
- **ENV-Vars auf Vercel** - CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY prüfen

### Abgeschlossene Pläne (frühere Sessions)

<details>
<summary>Alle abgeschlossenen Pläne anzeigen</summary>

1. **Plan 1: TimeTac-Integration entfernen** ✅ - Commit: `5877ff8`
2. **Plan 2: Asana-Integration erweitern** ✅ - Commit: `6fe44bc`
3. **Plan 3: Integrationen-UI umstrukturieren** ✅ - Commits: `39002b8`, `377bb70`
4. **Prompt 1: Cron-Job erweitern** ✅ - Commit: `280e9cd`
5. **Prompt 2: Webhook-Signatur + Tests** ✅ - Commit: `8ac0064`
6. **Prompt A + B: Planning UI Verbesserungen** ✅ - Commit: `a30208f`
7. **Plan C: Asana Sync-Benachrichtigungen** ✅ - Commits: `c8afc7f`, `ced74d6`
8. **Agentic Operating System (AOS)** ✅ - Commit: `8c6e842`
9. **Plan 3-5: Planning UI Optimierungen** ✅ - Commits: `1a9bf9c`, `3032952`, `3ec58f8`
10. **Session 7: Planning UX Improvements** ✅ - Commit: `a2c3824`
11. **Session 9: Card-Konsistenz & Popover** ✅ - Commits: `3a5db66`, `f1dce79`
12. **Plan D1-D3: Analytics & Insights** ✅ - Commits: `e354dd0`, `5e64788`, `bca2870`
13. **Plan D4: Analytics UI** ✅ - Commits: `145b2a0`, `749f3cc`, `acb535a`, `e4f9f16`
14. **Plan D5: Asana-Sync Erweiterung** ✅ - Commit: `47bdf75`
15. **Plan D6: Wetter-Integration** ✅ - Commit: `9b1203c`
16. **Plan D7: Enhanced Recommendations** ✅ - (pending commit)
17. **BF-1+BF-2: Performance + Geocoding Fixes** ✅ - (pending commit)

</details>

## Wichtige Entscheidungen

- Asana ist die einzige externe Integration
- User-Matching basiert auf Email-Prefix
- Ist-Stunden kommen aus Asana Custom Field (nicht TimeTac)
- Abwesenheiten werden aus separatem Asana-Projekt synchronisiert
- Cron-Job führt alle 3 Sync-Arten aus (Tasks, Users, Absences)
- **Analytics:** Claude Haiku für KI-Textgenerierung mit regelbasiertem Fallback
- **Analytics:** Snapshots um 05:00 UTC, Insights um 05:15 UTC, Wetter um 05:30 UTC
- **Wetter:** Open-Meteo API (kostenlos, DSGVO), Nominatim Geocoding (1 req/s)
- **Wetter:** Firmenstandort als Fallback wenn Projekt keine Adresse hat
- **Wetter:** Cache auf 2 Dezimalstellen gerundet (~1km Genauigkeit)
- **D7:** SuggestedAction Types: assign_user, reschedule, alert, none
- **D7:** QuickAssignDialog für schnelle Mitarbeiter-Zuweisung aus Insights
- **BF-1:** Insights-Performance: Batch-Snapshots, Tenant-Level Availability, Parallel Claude Calls (10er Batches)
- **BF-2:** Geocoding: 3-Stufen-Fallback (Freitext → PLZ+Stadt → Strukturiert)
