# Decision Log

Architekturentscheidungen mit Begründung, um Zyklen und Wiederholungen zu vermeiden.

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
