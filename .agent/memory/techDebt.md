# Technical Debt & Future Features

## Backlog

### UI: Spacing zwischen Projekten/Phasen
**Priorität:** Mittel
**Status:** Offen

**Beschreibung:**
Das Spacing in der Planungsview zwischen Projekten und Phasen cleaner und aufgeräumter gestalten. Aktuell wirkt es etwas gedrängt.

**Notizen:**
- Betrifft PlanningGrid, ProjectRow, PhaseRow
- Konsistent in Wochen- und Monatsansicht

---

### Pre-Selection in Planungsview (D7-3)
**Priorität:** Niedrig
**Status:** Teilweise implementiert
**Erstellt:** 2026-02-03 (Session 15)

**Ursprüngliche Anforderung (Plan D7-3):**
> "URL-Parameter in Planungsview für Pre-Selection: `?phaseId=...&userId=...&date=...`"
> Ziel: Wenn User aus dem QuickAssignDialog "In Planung öffnen" klickt, soll die Planungsseite:
> 1. Das richtige Projekt automatisch aufklappen
> 2. Zur betroffenen Phase scrollen
> 3. Die Phase visuell highlighten
> 4. Optional: Den Zuweisungs-Dialog direkt öffnen

**Was implementiert wurde:**
- `QuickAssignDialog.tsx` Zeile 107-113: Der "In Planung öffnen"-Button konstruiert die URL mit Query-Params:
  ```typescript
  const params = new URLSearchParams({
    phaseId,
    userId: suggestedUserId ?? '',
    date: firstDay,
  });
  router.push(`/planung?${params.toString()}`);
  ```
- User wird zur `/planung?phaseId=xxx&userId=yyy&date=zzz` navigiert

**Was NICHT implementiert wurde:**
- Die Planungsseite (`src/app/(dashboard)/planung/page.tsx`) liest die URL-Parameter nicht aus
- Kein Auto-Expand des Projekts das die Phase enthält
- Kein Scroll-to-Element
- Kein Visual Highlighting
- Der User landet auf der Planungsseite und muss selbst navigieren

**Warum weggelassen:**
1. **PlanningContext Komplexität:** Der Context hat ~700 Zeilen und verwaltet:
   - Wochen-Navigation (weekStart, goToNextWeek, etc.)
   - Expandierte Projekte (expandedProjects Set)
   - Optimistic Updates (4 Funktionen)
   - View Mode (week/month)
   - Daten-Loading und Error State

2. **Implementierungsaufwand wäre erheblich:**
   - Neuer State: `highlightedPhaseId: string | null`
   - `useEffect` in PlanningProvider der URL-Params beim Mount liest
   - `useSearchParams()` Hook integrieren (Next.js App Router)
   - Logik um phaseId → projectId zu finden (Query oder aus weekData)
   - `expandedProjects` Set um das richtige Projekt erweitern
   - `scrollIntoView()` Logik mit Ref auf PhaseRow
   - CSS für Highlight-Animation (z.B. `ring-2 ring-blue-500` für 3 Sekunden)
   - Cleanup: Highlight nach Timeout entfernen, URL-Params clearen

3. **MVP-Entscheidung:** Der primäre Use Case "Mitarbeiter schnell zuweisen" ist über den QuickAssignDialog bereits vollständig abgedeckt. Die Pre-Selection ist ein Nice-to-have Enhancement.

**Implementierungsplan (für später):**

```typescript
// 1. In PlanningContext.tsx - neue State-Variablen
const [highlightedPhaseId, setHighlightedPhaseId] = useState<string | null>(null);

// 2. In PlanningProvider - URL-Params lesen beim Mount
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const phaseId = searchParams.get('phaseId');
  const dateParam = searchParams.get('date');

  if (phaseId) {
    // Phase → Projekt finden und expandieren
    const projectId = findProjectForPhase(phaseId); // Muss implementiert werden
    if (projectId) {
      setExpandedProjects(prev => new Set([...prev, projectId]));
    }
    setHighlightedPhaseId(phaseId);

    // Zur richtigen Woche navigieren
    if (dateParam) {
      goToWeek(new Date(dateParam));
    }

    // Highlight nach 5 Sekunden entfernen
    setTimeout(() => setHighlightedPhaseId(null), 5000);

    // URL cleanen
    window.history.replaceState({}, '', '/planung');
  }
}, []);

// 3. In PhaseRow.tsx - Ref und Scroll
const phaseRef = useRef<HTMLDivElement>(null);
const { highlightedPhaseId } = usePlanning();
const isHighlighted = highlightedPhaseId === phase.id;

useEffect(() => {
  if (isHighlighted && phaseRef.current) {
    phaseRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [isHighlighted]);

// 4. CSS-Klasse für Highlight
className={cn(
  'phase-row',
  isHighlighted && 'ring-2 ring-blue-500 ring-offset-2 animate-pulse'
)}
```

**Betroffene Dateien:**
- `src/presentation/contexts/PlanningContext.tsx` - Neuer State, URL-Param-Effect
- `src/presentation/components/planning/PhaseRow.tsx` - Ref, Scroll, Highlight-CSS
- `src/presentation/components/project-details/QuickAssignDialog.tsx` - URL-Params bereits implementiert ✅

**Geschätzter Aufwand:** 2-4 Stunden

---

### Bidirektionaler Sync: Plan-Stunden → Asana
**Priorität:** Niedrig
**Status:** Offen

**Beschreibung:**
Plan-Stunden aus planned zurück nach Asana syncen. Aktuell ist Asana Source of Truth, planned ist read-only.

**Notizen:**
- Neues Custom Field in Asana für Plan-Stunden
- Webhook oder Batch-Sync?
- Conflict Resolution wenn beide Seiten ändern

---

### Projektübergreifende Analytics
**Priorität:** Mittel
**Abhängigkeiten:** Phase/Projekt Analytics müssen erst fertig sein (Plan D)

**Beschreibung:**
Dashboard das alle Projekte aggregiert zeigt:
- Projekte im Zeitplan vs. verzögert
- Gesamtauslastung des Teams über alle Projekte
- Ressourcen-Engpässe über alle Projekte hinweg
- Portfolio-Health-Score
- Team-Velocity Trends

**Notizen:**
- Benötigt `phase_insights` Tabelle aus Plan D
- Eigene Aggregations-Logik für Projekt-übergreifende Metriken
- Separates Dashboard oder Integration in bestehendes Dashboard

---

### Logger-System
**Priorität:** Niedrig
**Status:** Offen

**Beschreibung:**
Strukturiertes Logging-System für besseres Debugging und Monitoring:
- Einheitliches Log-Format (JSON)
- Log-Levels (debug, info, warn, error)
- Request-Tracing mit Correlation-IDs
- Integration mit externem Logging-Service (z.B. Axiom, Logtail)

---

### Error Boundary & Error Tracking
**Priorität:** Mittel
**Status:** Offen

**Beschreibung:**
- React Error Boundaries für graceful degradation
- Integration mit Sentry oder ähnlichem Service
- User-friendly Error-Seiten
- Automatische Error-Reports

---

### Performance Monitoring
**Priorität:** Niedrig
**Status:** Offen

**Beschreibung:**
- Web Vitals Tracking
- API Response Time Monitoring
- Database Query Performance
- Vercel Analytics Integration

---

## Erledigte Tech Debt

(Hier werden erledigte Items dokumentiert)

---

*Zuletzt aktualisiert: 2026-02-03 (Session 15)*
