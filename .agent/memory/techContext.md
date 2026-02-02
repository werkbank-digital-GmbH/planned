# Technical Context

## Projektstruktur

```
/Users/jonas/Projects/planned/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── services/
│   │   └── value-objects/
│   ├── application/
│   │   ├── use-cases/
│   │   └── dtos/
│   ├── infrastructure/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── supabase/
│   └── presentation/
│       ├── actions/
│       ├── components/
│       ├── hooks/
│       └── stores/
├── supabase/
│   └── migrations/
├── public/
└── tests/
```

## Wichtige Konfigurationsdateien

| Datei | Zweck |
|-------|-------|
| `next.config.ts` | Next.js Konfiguration |
| `tailwind.config.ts` | Tailwind CSS |
| `tsconfig.json` | TypeScript |
| `vitest.config.ts` | Tests |
| `.env.local` | Lokale Umgebungsvariablen |

## Umgebungsvariablen

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Asana
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=

# Sicherheit
ENCRYPTION_KEY=
CRON_SECRET=
ASANA_WEBHOOK_SECRET=
```

## Datenbank-Schema (Kern-Tabellen)

```sql
-- Tenants
tenants (id, name, created_at)

-- Users
users (id, tenant_id, email, first_name, last_name, role)

-- Projekte
projects (id, tenant_id, name, status, start_date, end_date)

-- Phasen
project_phases (id, project_id, name, start_date, end_date,
                planned_hours, actual_hours, area, asana_gid)

-- Zuweisungen
allocations (id, tenant_id, user_id, phase_id, date, hours)

-- Abwesenheiten
absences (id, tenant_id, user_id, type, start_date, end_date, asana_gid)

-- Integration
integration_credentials (tenant_id, asana_access_token,
                         asana_workspace_id, asana_source_project_id, ...)
integration_mappings (tenant_id, internal_type, internal_id,
                      external_system, external_id)
sync_logs (tenant_id, sync_type, status, details, started_at, finished_at)
```

## Scripts

```bash
# Development
pnpm dev

# Build
pnpm build

# Tests
pnpm test        # Watch mode
pnpm test:run    # Single run

# Linting
pnpm lint
pnpm lint:fix

# Type Check
pnpm typecheck
```

## Dependencies (Kern)

```json
{
  "next": "15.x",
  "react": "19.x",
  "@supabase/supabase-js": "2.x",
  "zustand": "5.x",
  "@tanstack/react-query": "5.x",
  "date-fns": "4.x",
  "lucide-react": "latest",
  "tailwindcss": "3.x"
}
```

## Deployment

- **Hosting**: Vercel
- **Database**: Supabase (Hosted)
- **Cron Jobs**: Vercel Cron oder externer Service
- **Domain**: TBD
