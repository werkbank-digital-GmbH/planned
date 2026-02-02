# Decision Log

Architekturentscheidungen mit Begründung, um Zyklen und Wiederholungen zu vermeiden.

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
