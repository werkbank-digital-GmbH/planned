# Agentic Operating System (AOS) - Setup Guide

Eine allgemeingültige Anleitung zum Aufbau eines Agentic Operating Systems für bestehende Projekte.

---

## 1. Das Problem

LLMs sind **zustandslos** - sie vergessen alles zwischen Sessions. Das führt zu:
- Wiederholten Erklärungen
- Vergessenen Architekturentscheidungen
- Inkonsistentem Code
- Kontext-Drift bei längeren Projekten

## 2. Die Lösung: Memory Bank Pattern

Ein externes Langzeitgedächtnis im Dateisystem, das der Agent **zwingend lesen und pflegen muss**.

---

## 3. Schnellstart (5 Minuten)

### Schritt 1: Verzeichnisse erstellen

```bash
mkdir -p .agent/memory .claude/commands
```

### Schritt 2: Memory Bank Dateien anlegen

Erstelle diese Dateien in `.agent/memory/`:

| Datei | Zweck | Änderungshäufigkeit |
|-------|-------|---------------------|
| `projectBrief.md` | Vision, Ziele, Tech-Stack | Selten (Verfassung) |
| `productContext.md` | User Stories, Problemstellung | Selten |
| `activeContext.md` | Aktueller Fokus, nächste Schritte | Jede Session |
| `systemPatterns.md` | Architekturregeln, Conventions | Bei neuen Patterns |
| `techContext.md` | Projektstruktur, Dependencies | Bei Strukturänderungen |
| `progress.md` | Fortschritts-Log, Commits | Jede Session |
| `decisionLog.md` | Architekturentscheidungen | Bei wichtigen Entscheidungen |

### Schritt 3: CLAUDE.md erstellen

Erstelle `CLAUDE.md` im Projekt-Root:

```markdown
# CLAUDE.md - Memory Protocol

Du bist ein Senior Engineer mit Amnesie zwischen Sessions.
Dein externes Gedächtnis liegt unter `.agent/memory/`.

## REGEL 1: BOOT
Bevor du arbeitest, lies `.agent/memory/activeContext.md`.

## REGEL 2: UPDATE
Bevor du die Session beendest, aktualisiere `activeContext.md` und `progress.md`.

## REGEL 3: ARCHITEKTUR
Konsultiere `systemPatterns.md` vor strukturellen Änderungen.
```

### Schritt 4: Commands erstellen

**`.claude/commands/boot.md`:**
```markdown
# /boot
Lies alle Dateien in `.agent/memory/` und fasse zusammen:
- Woran arbeiten wir?
- Was ist der nächste Schritt?
```

**`.claude/commands/memo.md`:**
```markdown
# /memo
Aktualisiere `.agent/memory/activeContext.md` und `progress.md` basierend auf dieser Session.
```

---

## 4. Detaillierte Datei-Templates

### projectBrief.md (Die Verfassung)

```markdown
# Project Brief: [Projektname]

## Vision
[1-2 Sätze: Was ist das Ziel?]

## Kernfunktionen
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

## Tech-Stack
| Kategorie | Technologie |
|-----------|-------------|
| Frontend | [z.B. Next.js, React] |
| Backend | [z.B. Supabase, Node.js] |
| Database | [z.B. PostgreSQL] |

## Nicht-Ziele (Out of Scope)
- [Was wir NICHT bauen]
```

### productContext.md (Das Warum)

```markdown
# Product Context

## Das Problem
[Welches Problem lösen wir?]

## Die Lösung
[Wie lösen wir es?]

## User Stories

### [Rolle 1]
> Als [Rolle] möchte ich [Aktion], damit [Nutzen].

### [Rolle 2]
> Als [Rolle] möchte ich [Aktion], damit [Nutzen].
```

### activeContext.md (Das Arbeitsgedächtnis)

```markdown
# Active Context

## Aktueller Stand ([Datum])

### Fokus
[Was tun wir gerade?]

### Laufende Arbeiten
- [Aufgabe 1]
- [Aufgabe 2]

### Nächste Schritte
- [ ] [Schritt 1]
- [ ] [Schritt 2]
- [ ] [Schritt 3]

### Offene Fragen
- [Frage 1]
```

### systemPatterns.md (Das Gesetzbuch)

```markdown
# System Patterns

## Architektur
[Beschreibung der Architektur]

## Naming Conventions
| Kontext | Convention | Beispiel |
|---------|------------|----------|
| Komponenten | PascalCase | `UserCard` |
| Funktionen | camelCase | `getUserById` |

## Code-Regeln
- [Regel 1]
- [Regel 2]
```

### decisionLog.md (Das Geschichtsbuch)

```markdown
# Decision Log

## [Datum]: [Titel]

**Kontext:** [Situation]

**Entscheidung:** [Was wurde entschieden]

**Begründung:** [Warum]

**Alternativen verworfen:**
- [Alternative] → [Grund]
```

### progress.md (Der Fortschritt)

```markdown
# Progress Log

## [Datum]

### Session: [Thema]

**Erledigt:**
- [Aufgabe 1]
- [Aufgabe 2]

**Commits:**
- `abc1234` - [Commit Message]

**Offen:**
- [ ] [Noch zu tun]
```

---

## 5. Der Workflow

### Täglicher Zyklus

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Session Start           Arbeit              Session Ende   │
│       │                    │                      │         │
│       ▼                    ▼                      ▼         │
│   /boot              Code schreiben          /memo          │
│       │                    │                      │         │
│       ▼                    ▼                      ▼         │
│  Lese Memory Bank    Referenziere         Update Memory     │
│                      systemPatterns                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Start einer Session

```
/boot
```

Der Agent liest alle Memory-Dateien und gibt eine Zusammenfassung.

### Während der Arbeit

Bei Architektur-Fragen:
> "Prüfe systemPatterns.md auf unsere Regeln für [Thema]."

Bei neuen Features:
> "Dokumentiere diese Entscheidung in decisionLog.md."

### Ende einer Session

```
/memo
```

Der Agent aktualisiert `activeContext.md` und `progress.md`.

---

## 6. Thread-Orchestrierung (Advanced)

### Thread-Typen

| Typ | Name | Beschreibung |
|-----|------|--------------|
| Base | Basis | Einfach: Prompt → Arbeit → Review |
| P-Thread | Parallel | Mehrere Agenten gleichzeitig |
| C-Thread | Chained | Aufgabe in Phasen unterteilt |
| F-Thread | Fusion | Gleicher Prompt an mehrere Modelle |
| B-Thread | Big | Ein Agent steuert Sub-Agents |

### Sparring-Partner-Modell

```
┌──────────────────┐     Prompts      ┌──────────────────┐
│                  │ ───────────────► │                  │
│  Hauptagent      │                  │  Ausführende     │
│  (Architekt)     │ ◄─────────────── │  Agenten         │
│                  │     Ergebnis     │                  │
└──────────────────┘                  └──────────────────┘
        │
        │ Review & Push
        ▼
   Git Repository
```

Der Hauptagent:
- Analysiert und plant
- Erstellt detaillierte Prompts
- Reviewt Ergebnisse
- Pushed Code

Die ausführenden Agenten:
- Erhalten isolierte Aufgaben
- Implementieren Code
- Liefern Ergebnis zurück

---

## 7. Sicherheits-Policies

### Terminal-Policy

```markdown
# In CLAUDE.md oder systemPatterns.md

## Erlaubte Befehle (Allowlist)
- `npm run *`
- `pnpm *`
- `git status`, `git log`, `git diff`
- `ls`, `cat`, `grep`

## Verbotene Befehle
- `rm -rf`
- `git push --force`
- `sudo *`
```

### Architektur-Guards

```markdown
## Vor jedem Commit ausführen
npm run lint && npm run typecheck && npm run test
```

---

## 8. Wartung (Gardener Workflow)

Einmal pro Woche oder nach großen Meilensteinen:

> "Lies alle Dateien in .agent/memory/. Wir müssen aufräumen:
> 1. Archiviere alte Einträge aus activeContext.md
> 2. Prüfe ob systemPatterns.md noch aktuell ist
> 3. Konsolidiere progress.md"

---

## 9. Checkliste

### Minimal (MVP)

- [ ] `.agent/memory/` Verzeichnis erstellt
- [ ] `projectBrief.md` mit Vision und Stack
- [ ] `activeContext.md` mit aktuellem Fokus
- [ ] `CLAUDE.md` mit Memory Protocol
- [ ] `/boot` Command

### Vollständig

- [ ] Alle 7 Memory-Dateien
- [ ] `/boot` und `/memo` Commands
- [ ] `CLAUDE.md` mit allen Regeln
- [ ] `systemPatterns.md` mit Architektur
- [ ] `decisionLog.md` mit Template
- [ ] Thread-Orchestrierung dokumentiert

---

## 10. Troubleshooting

### Agent ignoriert Memory Bank

1. Prüfe ob `CLAUDE.md` im Root liegt
2. Starte mit explizitem `/boot`
3. Füge "Lies zuerst .agent/memory/activeContext.md" zum Prompt hinzu

### Kontext-Drift

1. Führe `/memo` am Ende jeder Session aus
2. Halte `activeContext.md` aktuell
3. Dokumentiere Entscheidungen in `decisionLog.md`

### Dateien werden zu lang

1. Archiviere alte Einträge
2. Halte nur die letzten 5-10 Einträge in `progress.md`
3. Nutze `activeContext.md` nur für aktuellen Fokus

---

## Zusammenfassung

Das AOS verwandelt einen zustandslosen Agenten in einen persistenten Mitarbeiter durch:

1. **Strukturierte Dateien** im `.agent/memory/` Verzeichnis
2. **Zwingende Regeln** in `CLAUDE.md`
3. **Automatisierte Commands** (`/boot`, `/memo`)
4. **Disziplinierter Workflow** (Lesen → Arbeiten → Schreiben)

Der Schlüssel liegt nicht in der KI-Magie, sondern in der **Disziplin der Dateistruktur** und der **strikten Anweisung**, diese als "Single Source of Truth" zu behandeln.
