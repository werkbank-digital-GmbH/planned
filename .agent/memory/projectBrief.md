# Project Brief: planned.

## Übersicht

**planned.** ist ein Multi-Tenant SaaS-Tool für Kapazitäts- und Ressourcenplanung, speziell entwickelt für Holzbauunternehmen in der DACH-Region.

## Kernfunktionen

### 1. Ressourcenplanung
- Visuelle Wochenplanung mit Drag & Drop
- Mitarbeiter-Zuweisung zu Projektphasen
- Kapazitätsübersicht und Auslastungsanzeige

### 2. Projektverwaltung
- Projekte (Bauvorhaben) mit Phasen
- Phasen haben Start/Ende, Soll-Stunden, Bereich
- Integration mit externen Systemen (Asana)

### 3. Mitarbeiterverwaltung
- Benutzerrollen: Admin, Planer, Gewerblich
- Abwesenheitsverwaltung (Urlaub, Krankheit, etc.)
- Skills und Qualifikationen (geplant)

### 4. Integrationen
- **Asana**: Projekte, Phasen, Abwesenheiten, User-Mapping
- Bidirektionaler Sync via Webhooks und Cron-Jobs

## Technologie-Stack

| Kategorie | Technologie |
|-----------|-------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| State | Zustand |
| Testing | Vitest |

## Architektur

Clean Architecture mit 4 Schichten:

```
src/
├── domain/          # Entities, Value Objects, Domain Services
├── application/     # Use Cases, DTOs
├── infrastructure/  # Repositories, External Services
└── presentation/    # React Components, Hooks, Server Actions
```

## Multi-Tenancy

- Row Level Security (RLS) in Supabase
- Jeder User gehört zu genau einem Tenant
- Tenant-ID wird in JWT-Claims gespeichert

## Zielgruppe

- Holzbauunternehmen (10-100 Mitarbeiter)
- Planer und Disponenten
- DACH-Region (deutschsprachig)
