# Prompt 05: Multi-Tenancy & RLS

**Phase:** 2 – Authentifizierung & Multi-Tenancy
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Auth funktioniert. Jetzt stellen wir sicher, dass jeder User nur Daten seines Tenants sieht.

**Bereits vorhanden:**
- Supabase Auth mit Login/Logout
- Middleware für Route Protection
- RLS Policies in der Datenbank (aus Prompt 02)

---

## Ziel

Implementiere Multi-Tenancy mit Row Level Security und Tenant-Kontext im Frontend.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – Tenant-Tabelle, tenant_id Foreign Keys
- `SUPABASE_SETUP.md` – RLS Policies, Helper Functions
- `API_SPEC.md` – `get_current_tenant_id()` Function

---

## Akzeptanzkriterien

```gherkin
Feature: Multi-Tenancy

Scenario: Tenant-Isolation auf DB-Ebene
  Given Tenant A hat Projekte [P1, P2]
  And Tenant B hat Projekte [P3, P4]
  When ein User von Tenant A Projekte abruft
  Then sieht er nur [P1, P2]
  And niemals [P3, P4]

Scenario: Tenant-Kontext im Frontend
  Given ein eingeloggter User
  When ich die App nutze
  Then ist der Tenant-Kontext immer verfügbar
  And der Tenant-Name wird im Header angezeigt
  And alle API-Calls nutzen automatisch die Tenant-Isolation

Scenario: RLS Policy Enforcement
  Given ein User versucht über die Konsole direkten DB-Zugriff
  When er eine SQL-Query ohne Tenant-Filter ausführt
  Then werden trotzdem nur seine Tenant-Daten zurückgegeben
  Because RLS Policies greifen auf Datenbankebene

Scenario: Fehlender Tenant
  Given ein Auth-User ohne zugeordneten Tenant
  When er sich einloggt
  Then wird er zu einem Onboarding-Flow weitergeleitet
  Or erhält eine Fehlermeldung "Kein Unternehmen zugeordnet"
```

---

## Technische Anforderungen

### RLS Helper Functions (aus SUPABASE_SETUP.md)

```sql
-- Gibt die tenant_id des aktuellen Users zurück
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM users
    WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Gibt die Rolle des aktuellen Users zurück
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM users
    WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prüft ob der aktuelle User Admin ist
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Tenant Context Hook

```typescript
interface TenantContext {
  tenantId: string;
  tenantName: string;
  slug: string;
}

function useTenant(): TenantContext | null;
```

---

## Implementierungsschritte

### 🔴 RED: Integration Test für Tenant-Isolation

```typescript
// tests/integration/multi-tenancy.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

describe('Multi-Tenancy', () => {
  let tenantA: { id: string; userId: string };
  let tenantB: { id: string; userId: string };

  beforeAll(async () => {
    // Setup: Zwei Tenants mit jeweils einem User erstellen
    const admin = createAdminSupabaseClient();
    // ... Setup Code
  });

  it('should only return projects for current tenant', async () => {
    // Als User A einloggen und Projekte abrufen
    const clientA = await createClientAsUser(tenantA.userId);
    const { data: projectsA } = await clientA.from('projects').select('*');

    // Alle Projekte sollten zu Tenant A gehören
    expect(projectsA?.every(p => p.tenant_id === tenantA.id)).toBe(true);
  });

  it('should not allow cross-tenant access', async () => {
    // Als User A versuchen, Projekt von Tenant B zu lesen
    const clientA = await createClientAsUser(tenantA.userId);
    const { data, error } = await clientA
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantB.id); // Expliziter Filter

    // RLS sollte trotzdem nur Tenant A Daten zurückgeben
    expect(data).toEqual([]);
  });
});
```

### 🟢 GREEN: RLS Policies verifizieren

Sicherstellen, dass alle RLS Policies aus `SUPABASE_SETUP.md` aktiv sind:

```sql
-- Beispiel: Allocations Policy
CREATE POLICY "tenant_isolation" ON allocations
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Verifizieren
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 🔴 RED: Test für Tenant Context Hook

```typescript
// src/presentation/hooks/__tests__/useTenant.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTenant } from '../useTenant';

describe('useTenant', () => {
  it('should return tenant context for logged-in user', async () => {
    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.tenantId).toBeDefined();
    expect(result.current?.tenantName).toBeDefined();
  });

  it('should return null when not logged in', async () => {
    // Mock: Kein User
    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
```

### 🟢 GREEN: useTenant Hook implementieren

```typescript
// src/presentation/hooks/useTenant.ts
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClientSupabaseClient } from '@/infrastructure/supabase/client';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  slug: string;
}

export function useTenant(): TenantContext | null {
  const supabase = getClientSupabaseClient();

  const { data } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData } = await supabase
        .from('users')
        .select('tenant:tenants(id, name, slug)')
        .eq('auth_id', user.id)
        .single();

      if (!userData?.tenant) return null;

      return {
        tenantId: userData.tenant.id,
        tenantName: userData.tenant.name,
        slug: userData.tenant.slug,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache
  });

  return data ?? null;
}
```

### 🟢 GREEN: GetCurrentUserWithTenant Use Case

```typescript
// src/application/use-cases/auth/GetCurrentUserWithTenantUseCase.ts
import { IUserRepository } from '@/application/ports/repositories/IUserRepository';

export interface CurrentUserWithTenant {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export class GetCurrentUserWithTenantUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(authId: string): Promise<CurrentUserWithTenant | null> {
    return this.userRepository.findByAuthIdWithTenant(authId);
  }
}
```

### 🔵 REFACTOR: Tenant-Daten cachen

Tenant-Daten mit React Query cachen, um unnötige DB-Calls zu vermeiden.

---

## Erwartete Dateien

```
src/
├── presentation/
│   └── hooks/
│       ├── useTenant.ts
│       ├── useCurrentUser.ts
│       └── __tests__/
│           └── useTenant.test.ts
├── application/
│   └── use-cases/
│       └── auth/
│           └── GetCurrentUserWithTenantUseCase.ts
└── infrastructure/
    └── repositories/
        └── SupabaseTenantRepository.ts

tests/
└── integration/
    └── multi-tenancy.test.ts
```

---

## Hinweise

- `get_current_tenant_id()` wird von RLS Policies verwendet
- Tenant-Daten im React Query Cache (staleTime: 5 Min)
- Bei fehlendem Tenant → Onboarding oder Fehlermeldung
- Admin Client bypassed RLS – nur für Cron Jobs verwenden!
- Alle neuen Tabellen müssen `tenant_id` haben und RLS aktiv sein

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] User sieht nur eigene Tenant-Daten
- [ ] `useTenant()` Hook funktioniert
- [ ] RLS verhindert Cross-Tenant-Zugriff
- [ ] Tenant-Name wird im UI angezeigt
- [ ] Integration Tests sind grün

---

*Vorheriger Prompt: 04 – Supabase Auth Integration*
*Nächster Prompt: 06 – User Management*
