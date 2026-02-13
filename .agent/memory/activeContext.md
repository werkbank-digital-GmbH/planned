# Active Context

## Aktueller Stand (2026-02-13, Session 31+32)

### Zuletzt Abgeschlossen

**Session 32: Prompt-Ausführung — 7 Änderungen** ✅

Session 31 (vorherige Kontext-Sitzung):
1. **Bug 7: Team View ResourcePool** ✅ — Commit: `b494dd1`
   - `PlanningContext`: `teamPhasePool` computed property + Types
   - `PhasePoolCard.tsx` NEU: Draggable Phasen-Karte mit Badge
   - `ResourcePool.tsx`: Eigener Team-View Branch
   - `PlanningGrid.tsx`: `teamPhasePool` Prop durchgereicht

2. **Planning Header Cleanup** ✅ — Commit: `6566892`
   - `EmptyFilterToggles.tsx`: Icon-only mit Tooltip (Text entfernt)
   - `WeekNavigation.tsx`: Nur [< Heute >] Buttons (periodLabel/DateRange entfernt)
   - `PlanningGrid.tsx GridHeader`: `periodLabel` in erster Spalte

3. **MonthView Absence-Filter bei Drop** ✅ — Commit: `6d6c657`
   - `DndProvider.tsx`: Abwesenheitstage beim Pool-Drop in Monatsansicht filtern

4. **Allocation-Splitting um Abwesenheiten** ✅ — Commit: `3900f6d`
   - `DndProvider.tsx`: `splitDatesAroundAbsences()` Hilfsfunktion

Session 32 (diese Sitzung):
5. **MonthGrid Unified Row Layout** ✅ — Commit: `95067e0`
   - `MonthGrid.tsx MonthDayCell`: Pure Drop-Target (keine Cards, keine allocations-Props)
   - `MonthGrid.tsx MonthPhaseWeekCell`: Unified Row Layout (wie PhaseRow.tsx)
   - DayCells = absolute Hintergrund-Drop-Targets, sortedSpans = Vordergrund-Grid-Zeilen
   - `AllocationWithDetails` + `getSpannedAllocationIds` Imports entfernt

**Guards:** TypeScript ✅ | ESLint ✅ | Tests 691 passed ✅

**Nicht gepusht:** Branch ist 6 Commits ahead von `origin/main`

### Nächste Schritte

1. Pushen auf `origin/main`
2. Nächste Bug-Runde oder Feature-Arbeit
3. Tech Debt aufräumen (siehe unten)

### Tech Debt

- **Dateiname `DesktopNavigation.tsx`** → Rename zu `AppHeader.tsx`
- **Große Dateien aufteilen** - PlanningContext.tsx (1050+!), GetAllocationsForWeekQuery.ts (829), GenerateInsightsUseCase.ts (775)
- **PlanningContext Splitting** - Month-Logik in eigenen `useMonthData()` Hook
- **Fehlende Tests** - Repositories, Weather/Geocoding Services
- **ProjectInsightAggregator.totalPlan** - Hardcoded 0
- **BF-3 offen:** Progress-Reporting während langer Syncs

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
26. **Session 26+27: Full Feature-Roadmap** ✅ - Commit: `0cb11be`
27. **Session 28: Bug-Fix-Runde 1 (12 Bugs)** ✅ - Commit: `dfac02e`
28. **Session 29+30: Bug-Runde 2 (3 Bugs)** ✅ - Commit: `b494dd1`
29. **Session 31+32: UI-Prompts (Team Pool, Header, Absence-Filter, MonthGrid Layout)** ✅ - Commits: `6566892`..`95067e0`

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
- **Bug 14:** Unified Row Layout statt Two-Layer (DayCells = Drop-Targets, alle Spans als Zeilen)
- **Bug 15:** Hamburger-Menü mit Sheet statt horizontaler Navigation, kein Logo
