# Active Context

## Aktueller Stand (2026-02-13, Session 25)

### Zuletzt Abgeschlossen

**MonthGrid Rewrite — Wochenspalten statt Tagesspalten** ✅ — Noch nicht committed
- 28-31 einzelne Tagesspalten → 4-5 Wochenspalten mit je 5-col Sub-Grid (Mo-Fr)
- **Schritt 1:** `month-week-utils.ts` erstellt (`groupMonthIntoWeeks()`, `getAbsenceDaysLabel()`)
- **Schritt 2:** `PlanningContext.tsx` erweitert mit Multi-Week Fetch (`monthWeeks`, `monthProjectRows`, `monthPoolItems`, `isMonthLoading`)
- **Schritt 3:** `MonthGrid.tsx` komplett rewritten (MonthGridHeader, MonthProjectRow, MonthPhaseRow, MonthPhaseWeekCell, MonthDayCell)
- **Schritt 4:** `ResourcePool.tsx` Month-Branch aligned mit MonthGrid Grid (280px + repeat(weekCount, 1fr)), Absence-Badges
- **Schritt 5:** `PlanningGrid.tsx` übergibt `monthWeeks` + `monthPoolItems` an ResourcePool

**Resize-Snap Behavior** ✅ — Noch nicht committed
- `pixelOffset` eliminiert → `previewSpanDays` + CSS Transitions (150ms ease-out)
- Ring-Outline → Shadow-lg bei Resize

**Asana Integration "Reset"-Bug Fix** ✅ — Noch nicht committed
- Error-State + rotes Banner in ProjectSyncCard/AbsenceSyncCard
- Fallback-Label in SearchableSelect

**Resize-Bugs: Revert-Bug + Broken Animation** ✅ — Noch nicht committed
- `completingRef` Guard, Ghost Preview entfernt, `transitionProperty` statt `transition: 'none'`

**Vorherige Sessions:** Team View ✅, Resize-Performance ✅, BF-3 ✅, TD-1–TD-6 ✅, P1–P6 ✅

### Nächste Features / Offene Prompts

- **Commit ausstehend:** Sessions 23-25 (Resize-Fixes, Asana UI-Bug-Fix, Resize-Snap, MonthGrid Rewrite)
- **BF-3 offen:** Progress-Reporting während langer Syncs (nice-to-have)
- **Performance Follow-Up:** `GetAllocationsForWeekQuery` parallelisieren (5 DB-Calls → 3)
- **Performance Follow-Up:** List-Virtualization für >20 Projekte
- **Performance Follow-Up:** `AssignmentCard`/`SpanningAssignmentCard` — `usePlanning()` durch Props ersetzen

### Tech Debt

- **ENV-Vars auf Vercel** - Im Dashboard prüfen: CRON_SECRET, ASANA_REDIRECT_URI, ENCRYPTION_KEY, ANTHROPIC_API_KEY
- **Große Dateien aufteilen** - GetAllocationsForWeekQuery.ts (829), GenerateInsightsUseCase.ts (775), PlanningContext.tsx (748)
- **Fehlende Tests** - Analytics Use Cases, Repositories, Weather/Geocoding Services
- **ProjectInsightAggregator.totalPlan** - Hardcoded 0 (TODO: aus Snapshots aggregieren)

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
23. **Session 23: Resize-Bugs Fix (Revert + Animation)** ✅ - Noch nicht committed
24. **Session 24: Asana Integration UI-Bug Fix** ✅ - Noch nicht committed
25. **Session 25: Resize-Snap + MonthGrid Rewrite** ✅ - Noch nicht committed

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
