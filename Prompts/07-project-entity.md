# Prompt 07: Project Entity & Repository

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** S (Small)
**Geschätzte Zeit:** 1-2 Stunden

---

## Kontext

User Management ist fertig. Jetzt beginnen wir mit der Kern-Domain: Projekte.

**Bereits vorhanden:**
- User Entity mit CRUD
- Multi-Tenancy mit RLS
- DI Container

**Wichtig:** Projekte kommen aus Asana und werden NICHT manuell in planned. erstellt!

---

## Ziel

Implementiere die Project Entity und das Repository. Projekte sind read-only aus Sicht von planned. (außer Status-Änderungen).

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – Projects Tabelle
- `Rules.md` – "Projekte kommen NUR aus Asana"

---

## Akzeptanzkriterien

```gherkin
Feature: Project Entity

Scenario: Projekt laden
  Given ein Projekt existiert in der Datenbank
  When ich das Projekt lade
  Then erhalte ich alle Projekt-Attribute
  And die zugehörigen Phasen (lazy oder eager)

Scenario: Projekt-Status ändern
  Given ein Projekt mit Status "active"
  When ich den Status auf "paused" ändere
  Then wird das Update gespeichert
  And ein Sync zu Asana wird getriggert (später)

Scenario: Kein manuelles Erstellen
  Given ich bin im System
  Then gibt es KEINE Möglichkeit, Projekte manuell zu erstellen
  And CreateProjectUseCase existiert NICHT
```

---

## Technische Anforderungen

### Project Entity aus DATA_MODEL.md

```typescript
interface Project {
  id: string;
  tenantId: string;
  name: string;
  clientName?: string;
  address?: string;
  status: ProjectStatus;
  asanaGid?: string;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';
```

### IProjectRepository Interface

```typescript
interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByAsanaGid(gid: string): Promise<Project | null>;
  findAllByTenant(tenantId: string): Promise<Project[]>;
  findWithPhases(id: string): Promise<ProjectWithPhases | null>;
  save(project: Project): Promise<Project>;
  updateStatus(id: string, status: ProjectStatus): Promise<void>;
  // KEIN create() - Projekte kommen aus Asana!
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für Project Entity Validierung

```typescript
// src/domain/entities/__tests__/Project.test.ts
import { describe, it, expect } from 'vitest';
import { Project, ProjectStatus } from '../Project';

describe('Project Entity', () => {
  it('should create valid project', () => {
    const project = Project.create({
      name: 'Haus Weber',
      tenantId: 'tenant-123',
      status: 'active',
    });

    expect(project.name).toBe('Haus Weber');
    expect(project.status).toBe('active');
  });

  it('should require name', () => {
    expect(() => Project.create({
      name: '',
      tenantId: 'tenant-123',
      status: 'active',
    })).toThrow('Projektname ist erforderlich');
  });

  it('should validate status', () => {
    expect(() => Project.create({
      name: 'Test',
      tenantId: 'tenant-123',
      status: 'invalid' as ProjectStatus,
    })).toThrow('Ungültiger Projektstatus');
  });
});
```

### 🟢 GREEN: Project Entity implementieren

```typescript
// src/domain/entities/Project.ts
import { ValidationError } from '@/domain/errors';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

const VALID_STATUSES: ProjectStatus[] = ['planning', 'active', 'paused', 'completed'];

export interface ProjectProps {
  id?: string;
  tenantId: string;
  name: string;
  clientName?: string;
  address?: string;
  status: ProjectStatus;
  asanaGid?: string;
  syncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Project {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly clientName?: string;
  readonly address?: string;
  readonly status: ProjectStatus;
  readonly asanaGid?: string;
  readonly syncedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: Required<Omit<ProjectProps, 'clientName' | 'address' | 'asanaGid' | 'syncedAt'>> & Partial<ProjectProps>) {
    Object.assign(this, props);
  }

  static create(props: ProjectProps): Project {
    if (!props.name?.trim()) {
      throw new ValidationError('Projektname ist erforderlich');
    }
    if (!VALID_STATUSES.includes(props.status)) {
      throw new ValidationError('Ungültiger Projektstatus');
    }

    return new Project({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      name: props.name.trim(),
      clientName: props.clientName?.trim(),
      address: props.address?.trim(),
      status: props.status,
      asanaGid: props.asanaGid,
      syncedAt: props.syncedAt,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  withStatus(status: ProjectStatus): Project {
    return Project.create({ ...this, status, updatedAt: new Date() });
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isFromAsana(): boolean {
    return !!this.asanaGid;
  }
}
```

### 🔴 RED: Test für Repository Interface

```typescript
// src/application/ports/repositories/__tests__/IProjectRepository.test.ts
// Interface-Tests (TypeScript-Kompilierung validiert)
```

### 🟢 GREEN: IProjectRepository definieren

```typescript
// src/application/ports/repositories/IProjectRepository.ts
import { Project, ProjectStatus } from '@/domain/entities/Project';
import { ProjectPhase } from '@/domain/entities/ProjectPhase';

export interface ProjectWithPhases extends Project {
  phases: ProjectPhase[];
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByAsanaGid(gid: string, tenantId: string): Promise<Project | null>;
  findAllByTenant(tenantId: string): Promise<Project[]>;
  findWithPhases(id: string): Promise<ProjectWithPhases | null>;
  save(project: Project): Promise<Project>;
  updateStatus(id: string, status: ProjectStatus): Promise<void>;
}
```

### 🟢 GREEN: SupabaseProjectRepository implementieren

```typescript
// src/infrastructure/repositories/SupabaseProjectRepository.ts
import { IProjectRepository, ProjectWithPhases } from '@/application/ports/repositories/IProjectRepository';
import { Project, ProjectStatus } from '@/domain/entities/Project';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { ProjectMapper } from '@/infrastructure/mappers/ProjectMapper';

export class SupabaseProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<Project | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return ProjectMapper.toDomain(data);
  }

  async findAllByTenant(tenantId: string): Promise<Project[]> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error || !data) return [];
    return data.map(ProjectMapper.toDomain);
  }

  async findWithPhases(id: string): Promise<ProjectWithPhases | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_phases(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return ProjectMapper.toDomainWithPhases(data);
  }

  async save(project: Project): Promise<Project> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .upsert(ProjectMapper.toPersistence(project))
      .select()
      .single();

    if (error) throw new Error(`Failed to save project: ${error.message}`);
    return ProjectMapper.toDomain(data);
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('projects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to update status: ${error.message}`);
  }
}
```

---

## Erwartete Dateien

```
src/
├── domain/
│   ├── entities/
│   │   ├── Project.ts
│   │   └── __tests__/
│   │       └── Project.test.ts
│   └── enums/
│       └── ProjectStatus.ts
├── application/
│   └── ports/
│       └── repositories/
│           └── IProjectRepository.ts
└── infrastructure/
    ├── repositories/
    │   └── SupabaseProjectRepository.ts
    └── mappers/
        └── ProjectMapper.ts
```

---

## Hinweise

- KEIN CreateProjectUseCase (kommt aus Asana)
- Status-Änderung triggert Asana-Sync (implementiert in Prompt 21)
- `asanaGid` ist die Verknüpfung zu Asana Project
- Projekte sind immer tenant-isoliert (RLS)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Project Entity validiert korrekt
- [ ] Repository kann Projekte laden
- [ ] Es gibt KEINE Möglichkeit, Projekte manuell zu erstellen
- [ ] Mapper funktioniert bidirektional

---

*Vorheriger Prompt: 06 – User Management*
*Nächster Prompt: 08 – ProjectPhase Entity & Bereich-Logik*
