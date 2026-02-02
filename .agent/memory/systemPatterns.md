# System Patterns

## Sicherheits-Guards

### Vor jedem Commit
```bash
pnpm lint && pnpm typecheck && pnpm test:run
```

### Server/Client Boundary (Next.js 15)

```typescript
// Server-only Module markieren
import 'server-only';

// Niemals im Client:
// - Supabase Service Role Key
// - Encryption Keys
// - API Secrets
```

### Multi-Tenancy Regeln

1. **Jede Query braucht tenant_id**
2. **RLS ist immer aktiv** - Verlasse dich nie nur auf App-Logic
3. **Admin-Client nur serverseitig** - `createAdminSupabaseClient()` nie im Client

---

## Architektur-Patterns

### Clean Architecture

```
Domain Layer (Kern)
├── Entities (Project, Phase, User, Absence, Allocation)
├── Value Objects (DateRange, Hours, etc.)
└── Domain Services (UserMatcher, etc.)

Application Layer
├── Use Cases (SyncAsanaTaskPhasesUseCase, etc.)
├── DTOs
└── Interfaces (Repository Ports)

Infrastructure Layer
├── Repositories (SupabaseXxxRepository)
├── Services (AsanaService, EncryptionService)
└── Supabase Client

Presentation Layer
├── Server Actions (actions/)
├── React Components
├── Hooks
└── Zustand Stores
```

### Repository Pattern

```typescript
// Interface im Application Layer
interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByTenantId(tenantId: string): Promise<Project[]>;
  save(project: Project): Promise<void>;
}

// Implementation im Infrastructure Layer
class SupabaseProjectRepository implements ProjectRepository {
  constructor(private supabase: SupabaseClient) {}
  // ...
}
```

### Use Case Pattern

```typescript
class SyncAsanaTaskPhasesUseCase {
  constructor(
    private asanaService: AsanaService,
    private projectRepo: ProjectRepository,
    // ... weitere Dependencies
  ) {}

  async execute(tenantId: string): Promise<SyncResult> {
    // Business Logic
  }
}
```

## Datenbank-Patterns

### Multi-Tenancy mit RLS

```sql
-- Jede Tabelle hat tenant_id
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON projects
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

### Integration Mappings

```sql
-- Mapping zwischen internen und externen IDs
CREATE TABLE integration_mappings (
  tenant_id UUID,
  internal_type TEXT,  -- 'user', 'project', etc.
  internal_id TEXT,
  external_system TEXT, -- 'asana'
  external_id TEXT,
  UNIQUE(tenant_id, external_system, external_id)
);
```

## Frontend-Patterns

### Server Actions

```typescript
// src/presentation/actions/projectActions.ts
'use server'

export async function createProject(data: CreateProjectDTO) {
  const tenantId = await getTenantId();
  // ... validation, repository calls
}
```

### Zustand Stores

```typescript
// Globaler State mit Zustand
const usePlanningStore = create<PlanningState>((set) => ({
  allocations: [],
  addAllocation: (allocation) => set((state) => ({
    allocations: [...state.allocations, allocation]
  })),
}));
```

## API-Patterns

### Cron Jobs

- Route: `/api/cron/sync-asana`
- Auth: Bearer Token (CRON_SECRET)
- Verarbeitet alle Tenants mit aktiver Integration

### Webhooks

- Route: `/api/webhooks/asana`
- Auth: X-Hook-Signature Header
- Verarbeitet einzelne Events (Task updated, etc.)

## Naming Conventions

| Kontext | Convention | Beispiel |
|---------|------------|----------|
| Entities | PascalCase | `ProjectPhase` |
| Use Cases | VerbNounUseCase | `SyncAsanaTaskPhasesUseCase` |
| Repositories | SupabaseXxxRepository | `SupabaseProjectRepository` |
| Actions | camelCase | `createProject` |
| Components | PascalCase | `ProjectCard` |
| Hooks | useXxx | `usePlanning` |
