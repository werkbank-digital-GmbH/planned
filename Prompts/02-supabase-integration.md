# Prompt 02: Supabase Integration & Database Setup

**Phase:** 1 – Projekt-Setup & Infrastruktur
**Komplexität:** L (Large)
**Geschätzte Zeit:** 4-5 Stunden

---

## Kontext

Das Next.js Projekt aus Prompt 01 ist fertig. Jetzt integrieren wir Supabase als Backend mit PostgreSQL-Datenbank.

**Bereits vorhanden:**
- Next.js 15 mit TypeScript strict mode
- Tailwind CSS mit planned.-Farben
- Clean Architecture Ordnerstruktur

---

## Ziel

Erstelle die vollständige Datenbankstruktur gemäß `DATA_MODEL.md` und konfiguriere die Supabase-Clients für verschiedene Kontexte.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – Vollständiges Schema mit SQL
- `SUPABASE_SETUP.md` – Migrations, RLS Policies, Triggers
- `API_SPEC.md` – Supabase Client Setup für verschiedene Kontexte
- `DEPENDENCIES.md` – Supabase Paketversionen

---

## Akzeptanzkriterien

```gherkin
Feature: Supabase Integration

Scenario: Datenbank-Schema
  Given das Supabase-Projekt
  When ich die Migrationen ausführe
  Then existieren alle Tabellen aus DATA_MODEL.md:
    | Tabelle              |
    | tenants              |
    | users                |
    | projects             |
    | project_phases       |
    | allocations          |
    | resources            |
    | resource_types       |
    | absences             |
    | time_entries         |
    | sync_logs            |
    | integration_credentials |

Scenario: TypeScript Types
  Given die Datenbank-Struktur
  When ich `supabase gen types` ausführe
  Then existiert `src/lib/database.types.ts`
  And alle Tabellen haben korrekte TypeScript-Interfaces

Scenario: Supabase Clients
  Given die Supabase-Integration
  Then existieren vier Client-Typen:
    | Client           | Verwendung           | Cookies    |
    | Server           | Server Components    | Read-only  |
    | Browser          | Client Components    | Browser    |
    | Action           | Server Actions       | Read/Write |
    | Admin            | Cron Jobs, Migrations| Keine      |

Scenario: Environment Variables
  Given die Konfiguration
  Then sind folgende Umgebungsvariablen dokumentiert:
    | Variable                      | Required |
    | NEXT_PUBLIC_SUPABASE_URL      | ✅       |
    | NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅       |
    | SUPABASE_SERVICE_ROLE_KEY     | ✅       |
    | ENCRYPTION_KEY                | ✅ (Prod)|
```

---

## Technische Anforderungen

### Paketversionen aus DEPENDENCIES.md

```typescript
const supabaseDeps = {
  "@supabase/supabase-js": "2.47.0",
  "@supabase/ssr": "0.5.2"
};
```

### Client-Typen aus API_SPEC.md

| Context | Client | Cookies | RLS |
|---------|--------|---------|-----|
| Server Components | `createServerSupabaseClient()` | Read-only | ✅ |
| Client Components | `createClientSupabaseClient()` | Browser | ✅ |
| Server Actions | `createActionSupabaseClient()` | Read/Write | ✅ |
| Admin Operations | `createAdminSupabaseClient()` | None | ⚠️ Bypassed |

---

## Implementierungsschritte

### 🔴 RED: Test für Supabase-Verbindung

```typescript
// tests/infrastructure/supabase.test.ts
import { describe, it, expect } from 'vitest';

describe('Supabase Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });
});
```

### 🟢 GREEN: Supabase Pakete installieren

```bash
pnpm add @supabase/supabase-js@2.47.0 @supabase/ssr@0.5.2
pnpm add -D supabase@1.226.4
```

### 🔴 RED: Test für TypeScript Types

```typescript
// tests/infrastructure/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Database } from '@/lib/database.types';

describe('Database Types', () => {
  it('should have allocations table type', () => {
    type Allocations = Database['public']['Tables']['allocations'];
    // TypeScript-Kompilierung validiert dies
    expect(true).toBe(true);
  });
});
```

### 🟢 GREEN: Migrationen erstellen

Erstelle alle SQL-Migrationen aus `SUPABASE_SETUP.md`:

```
supabase/
├── migrations/
│   ├── 20260128000000_initial_schema.sql
│   ├── 20260128000001_rls_policies.sql
│   ├── 20260128000002_triggers.sql
│   └── 20260128000003_helper_functions.sql
├── seed.sql
└── config.toml
```

### 🟢 GREEN: TypeScript Types generieren

```bash
pnpm supabase gen types typescript --local > src/lib/database.types.ts
```

### 🔵 REFACTOR: Client-Factories organisieren

Erstelle die vier Supabase-Clients in `src/infrastructure/supabase/`:

---

## Erwartete Dateien

```
supabase/
├── migrations/
│   ├── 20260128000000_initial_schema.sql
│   ├── 20260128000001_rls_policies.sql
│   ├── 20260128000002_triggers.sql
│   └── 20260128000003_helper_functions.sql
├── seed.sql
└── config.toml

src/
├── infrastructure/
│   └── supabase/
│       ├── server.ts      # Server Components Client
│       ├── client.ts      # Browser Client
│       ├── actions.ts     # Server Actions Client
│       └── admin.ts       # Admin Client (Service Role)
├── lib/
│   ├── database.types.ts  # Generierte Types
│   └── env.ts             # Environment Validation
└── ...

.env.local
.env.example
```

---

## Migrations-Inhalt (Zusammenfassung)

### 20260128000000_initial_schema.sql

Erstelle alle Tabellen aus `DATA_MODEL.md`:

```sql
-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'planer', 'gewerblich');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed');
CREATE TYPE phase_bereich AS ENUM ('produktion', 'montage');
CREATE TYPE absence_type AS ENUM ('vacation', 'sick', 'holiday', 'training', 'other');
CREATE TYPE sync_status AS ENUM ('success', 'partial', 'failed');
CREATE TYPE sync_type AS ENUM ('asana_full', 'asana_webhook', 'timetac_time', 'timetac_absence');

-- Tabellen (siehe DATA_MODEL.md für vollständige Definitionen)
CREATE TABLE tenants (...);
CREATE TABLE users (...);
CREATE TABLE projects (...);
CREATE TABLE project_phases (...);
CREATE TABLE allocations (...);
CREATE TABLE resources (...);
CREATE TABLE resource_types (...);
CREATE TABLE absences (...);
CREATE TABLE time_entries (...);
CREATE TABLE sync_logs (...);
CREATE TABLE integration_credentials (...);
```

### 20260128000001_rls_policies.sql

RLS für Multi-Tenancy (siehe `SUPABASE_SETUP.md`):

```sql
-- Enable RLS
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Tenant-Isolation Policy
CREATE POLICY "tenant_isolation" ON allocations
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

### 20260128000002_triggers.sql

Trigger für automatische Berechnungen:

```sql
-- PlannedHours Redistribution Trigger
CREATE OR REPLACE FUNCTION redistribute_planned_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Berechnung aus Rules.md
END;
$$ LANGUAGE plpgsql;
```

### 20260128000003_helper_functions.sql

Helper-Funktionen für RLS:

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM users
    WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Supabase Client Implementierung

### Server Components Client

```typescript
// src/infrastructure/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore in Server Components (read-only)
          }
        },
      },
    }
  );
}
```

---

## Hinweise

- Alle SQL aus `SUPABASE_SETUP.md` übernehmen
- RLS Policies sind kritisch für Multi-Tenancy
- Trigger für `planned_hours` Auto-Redistribution nicht vergessen
- `ENCRYPTION_KEY` für Token-Verschlüsselung dokumentieren
- Seed-Daten aus `SEED_DATA.md` für lokale Entwicklung

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] `supabase start` startet lokale DB
- [ ] Alle Migrationen laufen ohne Fehler
- [ ] TypeScript Types sind generiert
- [ ] Alle vier Clients funktionieren
- [ ] RLS Policies sind aktiv

---

*Vorheriger Prompt: 01 – Next.js Projekt-Initialisierung*
*Nächster Prompt: 03 – Clean Architecture Grundstruktur*
