# Active Context

## Aktueller Stand (2026-02-13, Session 27)

### Zuletzt Abgeschlossen

**Session 27: Full Feature-Roadmap Completion** ✅ — Commit: `0cb11be`

1. **Feature 6: Query Parallelization (5→3 DB-Calls)** ✅
   - `GetAllocationsForWeekQuery.ts` — `executeProjectCentric()` Methode optimiert
   - 3 sequentielle Schritte → 2 sequentielle Schritte
   - 5 DB-Calls → 3 DB-Calls (redundanten `findByIds(userIds)` eliminiert)
   - `Promise.all([allocations, allUsers, phases])` → dann `absences` separat (braucht allUserIds)
   - `userMap` aus `allUsers` gefiltert statt extra DB-Call

2. **Feature 8: Analytics Test Coverage (93 neue Tests)** ✅
   - 6 neue Testdateien erstellt, 695 Tests gesamt (vorher 602)
   - `src/domain/analytics/__tests__/test-helpers.ts` — Shared Factories (createSnapshot, createBurnRate, createPhaseInsight)
   - `src/domain/analytics/__tests__/BurnRateCalculator.test.ts` — 19 Tests (calculate, trend, hasEnoughData)
   - `src/domain/analytics/__tests__/ProgressionCalculator.test.ts` — 32 Tests (calculate, determineStatus, dataQuality, workingDays)
   - `src/domain/analytics/__tests__/ProjectInsightAggregator.test.ts` — 16 Tests (aggregate, status priority)
   - `src/application/use-cases/analytics/__tests__/GeneratePhaseSnapshotsUseCase.test.ts` — 9 Tests (Supabase mock chains)
   - `src/application/use-cases/analytics/__tests__/GenerateInsightsUseCase.test.ts` — 17 Tests (basic + enhanced scenarios)

**Vorherige Sessions:** 4 Planning UI Features ✅, MonthGrid Rewrite ✅, Resize-Snap ✅, Team View ✅, Resize-Performance ✅, BF-3 ✅, TD-1–TD-6 ✅, P1–P6 ✅

### Feature-Roadmap (vom User priorisiert)

1. ~~MonthGrid Alignment mit ResourcePool~~ ✅ (Session 25)
2. ~~Drop Highlight covers whole allocation period~~ ✅ (Session 26)
3. ~~Buttons to hide empty phases/projects~~ ✅ (Session 26)
4. ~~Header height consistency~~ ✅ (Session 26)
5. ~~Smooth Slide-Transition~~ ✅ (Session 26)
6. ~~Query Parallelization (5→3 DB-Calls)~~ ✅ (Session 27)
7. ~~usePlanning() Extraction / ResizeActionsContext~~ ✅ (Session 27)
8. ~~Test Coverage für Analytics~~ ✅ (Session 27, 93 neue Tests)

**Roadmap KOMPLETT** ✅ — Nächste Schritte: Tech Debt oder neue Features

### Tech Debt

- **Große Dateien aufteilen** - PlanningContext.tsx (1000!), GetAllocationsForWeekQuery.ts (829), GenerateInsightsUseCase.ts (775)
- **PlanningContext Splitting** - Month-Logik (monthWeeks, monthProjectRows, monthPoolItems, Multi-Week-Fetch) in eigenen `useMonthData()` Hook extrahieren
- **Fehlende Tests** - Repositories, Weather/Geocoding Services (Analytics Domain + Use Cases jetzt abgedeckt ✅)
- **ProjectInsightAggregator.totalPlan** - Hardcoded 0 (TODO: aus Snapshots aggregieren)
- **BF-3 offen:** Progress-Reporting während langer Syncs (nice-to-have)

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
16. **Plan D7: Enhanced Recommendations** ✅ - Commit: `6fefec9`
17. **BF-1+BF-2+BF-4: Performance + Geocoding + Weather UI** ✅ - Commit: `a308bce`
18. **Session 18: Infrastructure Hardening (P1-P6)** ✅ - Commits: `356a154`..`d076140`
19. **Session 19: Tech Debt (TD-1-TD-6)** ✅ - Commits: `2a2df71`..`2d76b17`
20. **Session 20: BF-3 Asana Retry** ✅ - Commit: `80d3d2c`
21. **Session 21: Resize Fix + Performance** ✅ - Commit: `55cb92c`
22. **Session 22: Team View + Scrollbars** ✅ - Commit: `82adfea`
23. **Session 23: Resize-Bugs Fix (Revert + Animation)** ✅ - Commit: `de007e9`
24. **Session 24: Asana Integration UI-Bug Fix** ✅ - Commit: `de007e9`
25. **Session 25: Resize-Snap + MonthGrid Rewrite** ✅ - Commits: `e7667ed`, `db6bfce`
26. **Session 26+27: Full Feature-Roadmap** ✅ - Commit: `0cb11be` (Drop Highlight, Hide Empty, Sticky Headers, Slide-Transition, Query Parallelization, ResizeActionsContext, Analytics Tests)

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
- **BF-4:** Wetter-UI: grid-cols-7 Layout, Inline-Daten, Legende im Header
