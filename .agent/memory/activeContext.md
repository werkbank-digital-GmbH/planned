# Active Context

## Aktueller Stand (2026-02-13, Session 28+29)

### Zuletzt Abgeschlossen

**Session 28: Bug-Fix-Runde 1 (12 Bugs)** ✅ — Commit: `dfac02e`

12 Planning-UI-Bugs in 4 Arbeitspaketen (WP1-WP4) gefixt:
1. PoolCard Absence-Badge Overflow → Badge in Header-Row verschoben
2. Resize Revert-Bug → completingRef Guard + useEffect + 3s Safety Timeout
3. AssignmentCard "2 Tage" Label → Entfernt (nur in Popover)
4. AllocationPopover IST-Stunden → IST-Spalte entfernt (IST nur pro Phase, nicht pro Allocation)
5. AllocationPopover Tageanzahl → Immer sichtbar
6. ResourcePool Month-Items nur in erster Woche → Availability-Merge über alle Wochen
7. Rote Border auf Cards mit Absence → `cardConflict` entfernt
8. AssignmentCard nicht volle Breite → `w-full` in cardBase
9. Resize-Threshold zu sensitiv → 0.5 → 0.3
10. Mitarbeiter-Anzeige bei Allokation → DayCell `flex flex-col` + `relative z-[1]` pro Card
11. Mehrere Allokationen stacking → `flex flex-col gap-1`
12. Drag-Highlight alle Tage → viewMode-abhängig (Woche=1 Tag, Monat=ganze Woche)

**Session 29 (aktuelle): Bug-Runde 2 — Planung + Prompts** ✅

Drei neue Bugs gesammelt, geplant und Prompts geschrieben:

1. **Bug 7: Team View ResourcePool** — Pool zeigt Mitarbeiter statt Phasen
   - Plan + Prompt geschrieben
   - 4 Dateien (PlanningContext, PhasePoolCard NEU, ResourcePool, PlanningGrid)
   - DnD-Handler existiert bereits

2. **Bug 14: Multi-Day/Single-Day Card Overlap** — PhaseRow Two-Layer-System → Unified Row Layout
   - Plan + Prompt geschrieben
   - Bug 14 bereits implementiert (PhaseRow.tsx modifiziert — DayCell = reine Drop-Targets, alle Spans als eigene Zeilen)
   - 1 Datei (PhaseRow)

3. **Bug 15: Navigation Redesign** — Horizontale Nav → Hamburger-Menü mit Sheet
   - Plan + Prompt geschrieben
   - shadcn Sheet muss installiert werden (`pnpx shadcn@latest add sheet`)
   - 7+ Dateien (DesktopNav→AppHeader, layout.tsx, Settings-Layout, SettingsTabs löschen, Page-Titles entfernen)

### Status der Prompts

| Prompt | Bug | Status | Parallel? |
|--------|-----|--------|-----------|
| A | Bug 7 (Team Pool) | Prompt geschrieben, bereit | ✅ |
| B | Bug 14 (Card Overlap) | BEREITS IMPLEMENTIERT (PhaseRow.tsx modifiziert) | — |
| C | Bug 15 (Nav Redesign) | Prompt geschrieben, bereit | ✅ |

**Bug 14 ist bereits umgesetzt** — PhaseRow.tsx wurde modifiziert (DayCell ohne Cards, Unified Row Layout mit sortedSpans).

**Prompt A und C können parallel ausgeführt werden** — keine Datei-Konflikte.

### Nächste Schritte

1. Prompt A (Bug 7) und Prompt C (Bug 15) an ausführende Agenten geben
2. Review der Ergebnisse
3. Alle drei Bugs zusammen committen und pushen
4. ggf. weitere Bug-Runde

### Tech Debt

- **Große Dateien aufteilen** - PlanningContext.tsx (1000+!), GetAllocationsForWeekQuery.ts (829), GenerateInsightsUseCase.ts (775)
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
