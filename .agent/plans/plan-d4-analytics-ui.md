# Plan D4: Analytics UI Basis

## Ziel
Analytics-Auswertungen für Planer und Geschäftsführung sichtbar machen – basierend auf den bereits vorhandenen Insights aus D1-D3.

## Kontext
- `phase_insights` und `project_insights` Tabellen existieren (D1)
- Snapshots werden täglich um 05:00 UTC erstellt (D2)
- KI-Texte werden täglich um 05:15 UTC generiert (D3)
- Projekt-Detailseite existiert unter `/projekte/[id]`

---

## Komponenten

### 1. Dashboard KPIs (Geschäftsführung)

**Ort:** `/dashboard` (bestehende Seite erweitern)

**KPI-Karten:**
| KPI | Berechnung | Icon |
|-----|------------|------|
| Projekte im Verzug | Count wo `status` = 'behind' oder 'critical' | AlertTriangle |
| Gesamtauslastung | Durchschnitt aller `progress_percent` | TrendingUp |
| Kritische Phasen | Count `phase_insights` wo `status` = 'critical' | AlertCircle |
| Burn Rate Trend | Aggregierter Trend über alle aktiven Projekte | Activity |

**Zusätzlich:**
- "Top 3 Risiko-Projekte" Liste mit Links
- "Stand von: [Uhrzeit]" Anzeige
- Refresh-Button (1x pro Stunde, Optimistic UI)

**Neue Dateien:**
- `src/presentation/components/dashboard/AnalyticsKPIs.tsx`
- `src/presentation/components/dashboard/RiskProjectsList.tsx`
- `src/presentation/components/dashboard/RefreshInsightsButton.tsx`

---

### 2. Projekt-Modal in Planungsview (Planer)

**Trigger:** Klick auf `?`-Icon links neben Projekt in Sidebar

**Inhalt:** Bestehende Projekt-Detail-Komponenten + Insights
- `ProjectDetailsHeader` (Name, Status, Asana-Link)
- `ProjectStatsGrid` (Fortschritt, Soll, IST)
- **NEU:** `ProjectInsightsSection` (KI-Texte, Trends, Empfehlungen)
- `ProjectPhasesSection` (Phasen-Liste mit Status-Farben)

**Verhalten:**
- Modal: Fast fullscreen, scrollbar
- Schließen: X-Button oder Escape oder Klick außerhalb
- User kann nicht draggen während Modal offen (akzeptiert)

**Neue Dateien:**
- `src/presentation/components/planning/ProjectDetailModal.tsx`
- `src/presentation/components/project-details/ProjectInsightsSection.tsx`
- `src/presentation/components/project-details/InsightCard.tsx`
- `src/presentation/components/project-details/TrendSparkline.tsx`

---

### 3. Phasen-Status-Farben

**Darstellung:** `border-l-4` auf PhaseRow

| Status | Farbe | Tailwind |
|--------|-------|----------|
| on_track / ahead | Grün | `border-l-green-500` |
| at_risk | Gelb | `border-l-yellow-500` |
| behind / critical | Rot | `border-l-red-500` |
| not_started | Grau | `border-l-gray-300` |
| completed | Blau | `border-l-blue-500` |

**Änderungen:**
- `PhaseRow.tsx` – Border hinzufügen basierend auf Insight-Status
- `GetAllocationsForWeekQuery.ts` – Insight-Status mit laden

---

### 4. Trend-Grafiken

**Komponente:** `TrendSparkline`

**Datenquelle:** `phase_snapshots` (letzte 7/14/30 Tage)

**Darstellung:**
- Kleine Sparkline (80x24px) inline
- Farbe basierend auf Trend (grün = steigend, rot = fallend)
- Tooltip mit Details

**Library:** `recharts` (bereits im Projekt?) oder pure SVG

---

### 5. Refresh-Mechanismus

**API Route:** `POST /api/insights/refresh`

**Logik:**
1. Prüfe letzten Refresh (Rate Limit: 1x pro Stunde)
2. Wenn erlaubt: Trigger `GeneratePhaseSnapshotsUseCase` + `GenerateInsightsUseCase`
3. Return mit neuem Timestamp

**UI:**
- Button mit Spinner während Refresh
- Toast bei Erfolg/Fehler
- Disabled wenn Rate Limit aktiv (Countdown anzeigen)

**Neue Dateien:**
- `src/app/api/insights/refresh/route.ts`
- `src/presentation/hooks/useRefreshInsights.ts`

---

## Datenfluss

```
[Dashboard/Planungsview]
        |
        v
[Server Action: getInsights]
        |
        v
[SupabaseAnalyticsRepository]
        |
        v
[phase_insights / project_insights / phase_snapshots]
```

---

## Neue Server Actions

```typescript
// src/presentation/actions/insights.ts

export async function getProjectInsightsAction(projectId: string): Promise<ProjectInsightDTO>
export async function getTenantInsightsAction(): Promise<TenantInsightsDTO>
export async function refreshInsightsAction(): Promise<RefreshResult>
```

---

## Acceptance Criteria

- [ ] Dashboard zeigt 4 KPI-Karten mit aktuellen Werten
- [ ] Dashboard zeigt Top 3 Risiko-Projekte
- [ ] Dashboard zeigt "Stand von: [Uhrzeit]"
- [ ] Refresh-Button funktioniert mit Rate Limit (1x/Stunde)
- [ ] Klick auf `?` in Planungsview öffnet Modal
- [ ] Modal zeigt alle Projekt-Details + Insights
- [ ] Modal ist scrollbar und schließbar (X, Escape, Outside-Click)
- [ ] Phasen haben farbige Border basierend auf Status
- [ ] Trend-Sparklines zeigen historische Daten
- [ ] Mobile: Modal ist fullscreen

---

## Offene Fragen für Implementation

1. Recharts bereits installiert oder neu hinzufügen?
2. Wo genau sitzt das `?`-Icon in der Sidebar?
3. Soll der Refresh auch die Snapshots neu generieren oder nur Insights?

---

## Schätzung

**Aufwand:** ~3-4 Prompts für ausführende Agents

| Prompt | Inhalt |
|--------|--------|
| D4-1 | Dashboard KPIs + Server Actions |
| D4-2 | Projekt-Modal + Insights Section |
| D4-3 | Phasen-Status-Farben + Trend-Sparklines |
| D4-4 | Refresh-Mechanismus + Rate Limit |

---

*Erstellt: 2026-02-03*
