# Decision Log

Architekturentscheidungen mit Begründung, um Zyklen und Wiederholungen zu vermeiden.

---

## 2026-02-13: MonthGrid — Multi-Week-Fetch mit Merged Rows statt eigener API

**Kontext:** MonthGrid-Rewrite von 28-31 Tagesspalten auf 4-5 Wochenspalten. Die bestehende Server Action `getProjectWeekDataAction()` liefert Daten für eine einzelne Woche (Mo-Fr). Die Monatsansicht braucht 4-5 Wochen gleichzeitig.

**Entscheidung:** Parallel Fetch aller Wochen via `Promise.all(monthWeeks.map(week => getProjectWeekDataAction(week.mondayISO)))`, dann client-seitig mergen: `monthProjectRows` (union aller Projekte, Phases-dayAllocations über Wochen gemerged), `monthPoolItems` (union aller PoolItems, first-week-wins).

**Begründung:**
- Kein neuer Backend-Endpoint nötig — wiederverwendet existierende, getestete Server Action
- `Promise.all` parallelisiert: 4-5 parallele Fetches statt sequentiell → ~1 Roundtrip-Zeit
- Client-seitiges Mergen ist trivial: Map nach Projekt-ID, Phases nach Phase-ID, dayAllocations einfach zusammenführen
- PlanningContext verwaltet `monthWeekDataMap` State für inkrementelle Updates

**Alternativen verworfen:**
- Eigene `getProjectMonthDataAction()` → Neuer Endpoint, DB-Query muss alle Wochen auf einmal laden, komplexere SQL, Maintenance-Aufwand
- Single-Fetch mit Datumsbereich → `GetAllocationsForWeekQuery` ist auf 5 Tage optimiert, Umbau wäre riskant
- Server-seitiges Mergen via API Route → Zusätzliche Latenz, Server-Last, gleicher Merge-Code nur woanders

---

## 2026-02-13: MonthGrid — Aligned Grid (280px + repeat(N, 1fr)) für ResourcePool

**Kontext:** ResourcePool hatte im Monatsmodus ein eigenes Layout (`repeat(weekGroups.size, minmax(180px, 1fr))`) mit CardHeader, das nicht mit dem MonthGrid-Grid übereinstimmte.

**Entscheidung:** ResourcePool Monatsmodus übernimmt exakt das MonthGrid-Grid: `280px + repeat(weekCount, 1fr)` mit linker Spalte (Label + Filter) und Wochenspalten. Week-Separator identisch (`border-r-2 border-gray-300`). Absence-Badges via `getAbsenceDaysLabel()`.

**Begründung:**
- Spalten von Grid und Pool müssen optisch aligned sein (gleiche Breiten für gleiche Wochen)
- Konsistente UX: Wochenansicht hat bereits dieses aligned Pattern
- Absenz-Badges geben im Monatskontext schnelle Info welche Tage betroffen sind (z.B. "Mo/Di")

**Alternativen verworfen:**
- Separate Column-Widths → Visuell verwirrend, Spalten stimmen nicht überein
- ResourcePool ohne Week-Alignment → Gleicher Pool wie vorher, verfehlt den Zweck des Rewrites

---

## 2026-02-12: Asana Integration — UI-Display-Bug statt Datenverlust

**Kontext:** Nach Disconnect+Reconnect der Asana-Integration erscheinen alle Config-Dropdowns (Quell-Projekt, Team, Custom Fields, Abwesenheiten) als leer. User denkt alles sei weg.

**Entscheidung:** Drei-Punkt-Fix: (1) Error-State + Banner in ProjectSyncCard/AbsenceSyncCard, (2) Fallback-Label in SearchableSelect wenn Wert gespeichert aber keine Option geladen, (3) Keine Server-Action-Änderungen.

**Begründung:**
- DB-Daten sind nachweislich intakt (User hat in Supabase verifiziert)
- `SearchableSelect` zeigt `selectedOption?.label || placeholder` — bei leerem Options-Array wird Placeholder gezeigt
- Error-Banner informiert User dass API-Problem vorliegt, Config aber erhalten bleibt
- Fallback-Label `Konfiguriert (515588)` zeigt gespeicherten Wert auch ohne geladene Options
- Minimaler Eingriff: 3 Dateien, keine Architekturänderung

**Alternativen verworfen:**
- Retry-Mechanismus → Over-Engineering für seltenen Fall
- Options vorher cachen/speichern → Zusätzliche Komplexität, Sync-Problem
- Token-Refresh in OAuth Callback erzwingen → Problem ist breiter (Rate Limits, Netzwerk)

---

## 2026-02-12: Resize — completingRef Guard gegen Race Condition

**Kontext:** Nach dem Resize sprang der Balken kurz auf die alte Länge zurück, bevor er die neue Länge annahm. Ursache: `useEffect` in `useAllocationResize` synchronisiert `previewSpanDays` mit `currentSpanDays` — aber `setIsResizing(false)` triggerte den Effect bevor `onResizeComplete` (async) die neuen Daten geladen hatte.

**Entscheidung:** `completingRef` als Guard einführen. Der Effect prüft `!isResizing && !completingRef.current` bevor er zurücksetzt. `handleMouseUp` aktiviert den Guard vor `setIsResizing(false)` und löst ihn nach `onResizeComplete`.

**Begründung:**
- Minimaler Eingriff: Nur 1 neuer Ref + 2 Zeilen in handleMouseUp/handleTouchEnd
- Kein Timing-abhängiger Workaround (kein setTimeout)
- Guard ist selbst-auflösend (wird in finally-Position gelöst)
- Deckt auch den Error-Case ab (Guard wird nach catch gelöst)

**Alternativen verworfen:**
- `useRef` für isResizing statt State → Würde andere Abhängigkeiten brechen
- `setTimeout` um Effect zu verzögern → Fragil, timing-abhängig
- `currentSpanDays` nicht im Effect tracken → Würde externe Updates (z.B. Realtime) ignorieren

---

## 2026-02-12: Resize — Ghost Preview entfernt zugunsten Card-Width

**Kontext:** Während des Resize erschienen gestrichelte Linien und Elemente fielen auseinander. Root Cause: Ghost-Preview (absolut positioniertes Element) hatte ein eigenes Koordinatensystem das mit der `calc(100% + Xpx)` Width der Card kollidierte.

**Entscheidung:** Ghost Preview komplett entfernen. Die Card selbst zeigt die Resize-Preview via `width: calc(100% + pixelOffset)`.

**Begründung:**
- Eine visuelle Repräsentation reicht — Card-Width ist bereits pixelgenau
- Ghost hatte hardcoded Offsets die bei verschiedenen Card-Größen nicht passten
- Weniger DOM-Elemente = weniger Layout-Berechnungen während Drag

**Alternativen verworfen:**
- Ghost-Koordinaten fixen → Fragil, Card-Width ist das bessere Modell
- Beide behalten → Redundant, verwirrt den User

---

## 2026-02-08: Performance — Prop-Drilling statt Context für PhaseRow

**Kontext:** `PhaseRow` nutzte `usePlanning()` nur für `highlightPhaseId`. Da React Context alle Consumers bei jeder Änderung re-rendert, war `React.memo` auf PhaseRow wirkungslos — jede Context-Änderung (Loading, Filters, etc.) re-renderte alle PhaseRows.

**Entscheidung:** `highlightPhaseId` als Prop von PlanningGrid → ProjectRow → PhaseRow durchreichen. `usePlanning()` aus PhaseRow komplett entfernt.

**Begründung:**
- PhaseRow wird N× pro Projekt gerendert — Multiplikator-Effekt bei unnötigen Re-Renders
- `highlightPhaseId` ändert sich quasi nie (nur bei URL-Parameter) → Props bleiben stabil
- `React.memo` wird dadurch voll wirksam: PhaseRow re-rendert nur bei echten Prop-Änderungen
- Prop-Drilling über 2 Ebenen ist akzeptabel, Context-Splitting wäre Overengineering

**Alternativen verworfen:**
- Context-Splitting (separate Contexts für selten vs. häufig ändernde Werte) → Zu komplex für diesen Fall
- `useContextSelector` (Zustand/jotai Pattern) → Erfordert Library-Wechsel
- `useSyncExternalStore` → Overengineered

---

## 2026-02-08: Resize-Animation — isSnapping eliminiert

**Kontext:** Beim Verkleinern eines Mehrtages-Balkens gab es einen Doppel-Effekt: Erst CSS-Snap-Animation (150ms), dann Grid-Jump (span 3→span 2).

**Entscheidung:** `isSnapping` State komplett entfernt. `onResizeComplete()` wird sofort bei mouseup aufgerufen, kein `setTimeout(150)`.

**Begründung:**
- Die Card hat bereits `transition-all duration-150` als CSS-Klasse
- Wenn das Grid sich sofort ändert (span wechselt), animiert CSS die Größenänderung automatisch
- Die Snap-Zwischen-Animation war ein Artefakt das den Grid-Update verzögerte → 2 separate visuelle Schritte

**Alternativen verworfen:**
- FLIP-Animation (First-Last-Invert-Play) → Overengineered, CSS Transition reicht
- requestAnimationFrame für synchronen Update → Unnötig komplex

---

## 2026-02-06: Insights Performance - Tenant-Level statt Phase-Level

**Kontext:** Der Insights-Cron-Job dauerte ~3-4 Minuten weil Availability, Wetter und Snapshots pro Phase geladen wurden (N+1 Queries) und Claude API Calls sequentiell liefen.

**Entscheidung:** Drei-Stufen-Optimierung:
1. Batch-Loading: Alle Snapshots in 1 Query statt N
2. Tenant-Level: Availability + Wetter einmal pro Tenant laden und wiederverwenden
3. Parallel: Claude API Calls in 10er-Batches mit Promise.allSettled

**Begründung:**
- Availability-Daten sind für alle Phasen eines Tenants identisch (gleiche User-Basis)
- Wetter hängt an Koordinaten, nicht an Phasen → Cache pro Koordinaten-Paar
- Claude Haiku kann problemlos 10 parallele Requests verarbeiten
- Vorberechnungs-Phase (CPU-bound) wird von I/O-Phase (API-Calls) getrennt

**Alternativen verworfen:**
- Message-Queue für Claude Calls → Overengineered für MVP
- Batch-API von Anthropic → Asynchron, komplexere Implementierung
- Caching von Claude-Ergebnissen → Insights sollten täglich frisch sein

---

## 2026-02-06: Geocoding 3-Stufen-Fallback

**Kontext:** Nominatim findet nicht alle Adressen im ersten Versuch, besonders bei ungewöhnlichen Formaten.

**Entscheidung:** 3-Stufen Fallback: Freitext → PLZ+Stadt → Strukturierte Suche

**Begründung:**
- Verschiedene Adressformate bei Kunden (manche ohne PLZ, manche ohne Straße)
- Besser grobe Koordinaten (Stadtzentrum) als gar keine Wetterdaten
- Rate-Limit von 1 req/s erlaubt max 3 Versuche in 3s → akzeptabel

**Alternativen verworfen:**
- Google Geocoding API → Kostenpflichtig, DSGVO-Thema
- Adress-Validation vor Geocoding → UX-Aufwand, Kunden wollen frei tippen

---

## 2024-02-02: Nur Asana als externe Integration

**Kontext:** Ursprünglich waren sowohl TimeTac (Zeiterfassung) als auch Asana (Projektmanagement) als Integrationen geplant.

**Entscheidung:** TimeTac-Integration komplett entfernen, nur Asana behalten.

**Begründung:**
- Ist-Stunden können direkt aus Asana Custom Fields kommen
- TimeTac war zu komplex für MVP
- Reduziert Maintenance-Aufwand

**Alternativen verworfen:**
- TimeTac parallel zu Asana → Zu viel Komplexität
- Eigene Zeiterfassung → Out of Scope

---

## 2024-02-02: User-Matching per Email-Prefix

**Kontext:** Asana-User müssen mit planned.-Usern verknüpft werden für Abwesenheiten-Sync.

**Entscheidung:** Matching basiert auf Email-Prefix (Teil vor dem @).

**Begründung:**
- Unternehmen haben oft verschiedene Domains (holzbau.de vs holzbau.com)
- Email-Prefix ist typischerweise konsistent (j.mischke@...)
- Einfach zu implementieren, keine manuelle Zuordnung nötig

**Alternativen verworfen:**
- Manuelles Mapping per UI → Zu aufwendig für User
- Name-Matching → Zu unzuverlässig (Umlaute, Schreibweisen)

---

## 2024-01-XX: Clean Architecture

**Kontext:** Architektur für die Codebase wählen.

**Entscheidung:** Clean Architecture mit 4 Schichten (Domain, Application, Infrastructure, Presentation).

**Begründung:**
- Klare Trennung von Concerns
- Testbarkeit durch Dependency Injection
- Austauschbare Infrastructure (z.B. Supabase → andere DB)

**Alternativen verworfen:**
- Klassische MVC → Zu wenig Struktur für komplexe App
- Feature-basierte Struktur → Weniger klare Boundaries

---

## 2024-01-XX: Supabase statt Firebase

**Kontext:** Backend-as-a-Service wählen.

**Entscheidung:** Supabase mit PostgreSQL.

**Begründung:**
- PostgreSQL mit echten Relationen
- Row Level Security für Multi-Tenancy
- Open Source, kein Vendor Lock-in
- Realtime Subscriptions out of the box

**Alternativen verworfen:**
- Firebase → NoSQL nicht ideal für relationale Daten
- Eigenes Backend → Zu viel Aufwand für MVP

---

## 2026-02-03: Analytics UI Architektur (D4-D7)

**Kontext:** Analytics & Insights müssen für Planer und GF sichtbar gemacht werden. Mehrere UI-Patterns möglich.

**Entscheidungen:**

1. **Modal statt Popover/Side Panel für Projekt-Details**
   - Fast fullscreen, scrollbar, interaktiv
   - User kann nicht gleichzeitig draggen (akzeptiert)
   - Begründung: Genug Platz für alle Infos, einfacher zu implementieren

2. **Phasen-Status als `border-l-4`**
   - Grün (on_track/ahead), Gelb (at_risk), Rot (behind/critical)
   - Begründung: Keine Kollision mit Bereich-Badge, clean, skaliert gut

3. **Dashboard = GF, Planungsview = Planer**
   - Keine rollenbasierte UI, sondern funktionale Trennung
   - Dashboard: Tenant-weite KPIs
   - Planungsview: Projekt-Details via Modal

4. **Open-Meteo + Nominatim für Wetter/Geocoding**
   - Beide kostenlos, kein API Key, DSGVO-konform
   - Begründung: MVP-freundlich, später upgraden wenn nötig

5. **Asana bleibt Source of Truth**
   - planned ist read-only für alle Asana-Daten
   - Einzige Ausnahme (später): Plan-Stunden zurück syncen

**Alternativen verworfen:**
- Side Panel für Projekt-Details → Komplexer, User will lieber Modal schließen und dann draggen
- Notification-Badge für Warnungen → Nervt potentiell
- Google Maps Geocoding → Kostet Geld
- WeatherAPI → API Key nötig

---

## 2026-02-03: Projektadresse aus Custom Field + Konflikt-Erkennung (D5)

**Kontext:** Projektadressen werden für Wetter-Integration benötigt. Phasen können unterschiedliche Adressen haben (Multi-Standort).

**Entscheidungen:**

1. **Adresse aus Custom Field statt Task-Name**
   - Custom Field für Adresse mappen (Text-Feld)
   - Begründung: Strukturierte Daten, kein Parsing nötig

2. **Adress-Konflikt-Erkennung**
   - Wenn alle Phasen eines Projekts dieselbe Adresse haben → Projekt-Adresse setzen
   - Wenn unterschiedlich → `addressConflict = true`, keine Projekt-Adresse
   - Begründung: Ermöglicht UI-Warnung, verhindert falsche Wetterdaten

3. **Description aus html_notes**
   - Bevorzuge `html_notes`, Fallback auf `notes`
   - HTML-Tags strippen für Plain-Text-Speicherung
   - Begründung: html_notes hat Formatierung, wir brauchen nur Text für KI-Kontext

**Alternativen verworfen:**
- Adresse aus Task-Name parsen → Zu unzuverlässig
- Immer erste Adresse nehmen → Könnte falsch sein bei Multi-Standort

---

## 2026-02-03: Wetter-Integration Architektur (D6)

**Kontext:** Wetter-Daten für Baustellen sollen in der Planungsansicht sichtbar sein, um Projektplaner bei der Terminierung zu unterstützen.

**Entscheidungen:**

1. **Open-Meteo + Nominatim**
   - Beide APIs kostenlos, kein API Key, DSGVO-konform
   - Nominatim: 1 req/s Rate Limit implementiert
   - Open-Meteo: Keine Limits, WMO-Wettercodes

2. **Caching mit Koordinaten-Rundung**
   - Koordinaten auf 2 Dezimalstellen gerundet (~1km Genauigkeit)
   - Cache-TTL 24h, tägliche Aktualisierung via Cron
   - Begründung: Reduziert API-Calls erheblich, Wetter ändert sich nicht pro Meter

3. **Firmenstandort als Fallback**
   - Tenant kann Firmenadresse hinterlegen
   - Wird verwendet wenn Projekt keine Adresse hat
   - Begründung: Besser als gar keine Wetterdaten

4. **Bautauglichkeits-Bewertung**
   - 3-stufig: good/moderate/poor
   - Kriterien: Wetter (Regen/Schnee), Niederschlagswahrscheinlichkeit >70%, Wind >50km/h
   - Farbcodierung: grün/gelb/rot in UI

**Alternativen verworfen:**
- OpenWeatherMap → API Key erforderlich
- Google Geocoding → Kostet Geld
- Stündliche Wetter-Updates → Overkill für Bauplanung

---

## 2026-02-03: D7-3 Pre-Selection auf MVP-Level (Tech Debt)

**Kontext:** D7-3 sah URL-Parameter für Pre-Selection in der Planungsview vor (`?phaseId=...&userId=...&date=...`), sodass beim Klick auf "In Planung öffnen" automatisch zum richtigen Projekt/Phase gescrollt und diese gehighlightet wird.

**Entscheidung:** Pre-Selection nicht vollständig implementieren. Der "In Planung öffnen"-Button setzt die URL-Parameter, aber die Planungsseite reagiert noch nicht darauf.

**Begründung:**
- PlanningContext hat ~700 Zeilen komplexen State (Wochen-Navigation, expandierte Projekte, Optimistic Updates)
- Vollständige Implementation erfordert: neuen State, useEffect für URL-Params, Auto-Expand, Scroll-to-Element, Visual Highlighting
- Primärer Flow "Quick-Assign im Dialog" ist bereits voll funktional und deckt den Hauptanwendungsfall ab
- MVP-Philosophie: Kernfeature liefern, Nice-to-have später

**Tech Debt:**
- URL-Parameter werden gesetzt aber nicht gelesen
- Zukünftig: PlanningContext erweitern um `highlightedPhaseId`, Effect für URL-Params, Scroll + Highlight Logik

**Alternativen verworfen:**
- Vollständige Pre-Selection jetzt → Zu aufwändig für den Mehrwert
- URL-Parameter komplett weglassen → Besser haben für spätere Erweiterung

---

## Template für neue Entscheidungen

```markdown
## YYYY-MM-DD: [Titel]

**Kontext:** [Situation und Problem]

**Entscheidung:** [Was wurde entschieden]

**Begründung:** [Warum diese Entscheidung]

**Alternativen verworfen:**
- [Alternative 1] → [Grund]
- [Alternative 2] → [Grund]
```
