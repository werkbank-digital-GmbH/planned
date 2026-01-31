# Prompt 10: Resource & ResourceType Entities

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** S (Small)
**Geschätzte Zeit:** 1-2 Stunden

---

## Kontext

Allocation verweist auf Resources. Jetzt implementieren wir Resource und ResourceType.

**Bereits vorhanden:**
- Allocation Entity mit XOR-Validierung (User/Resource)
- User Entity

---

## Ziel

Implementiere Resource-Verwaltung mit konfigurierbaren Kategorien (ResourceTypes).

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – resources, resource_types Tabellen
- `FEATURES.md` – F5: Ressourcen-Verwaltung (F5.1-F5.6)
- **UI-Screens:**
  - `stitch_planned./settings_-_resource_management/settings_-_resource_management.png`
  - `stitch_planned./dialog_-_create_resource_form/dialog_-_create_resource_form.png`
  - `stitch_planned./dialog_-_edit_resource_details/dialog_-_edit_resource_details.png`
  - `stitch_planned./dialog_-_create_resource_type/dialog_-_create_resource_type.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F5 - Ressourcen-Verwaltung

Scenario: F5.1 - Ressourcen-Typen verwalten
  Given ich bin Admin
  When ich zu Einstellungen > Ressourcen navigiere
  Then sehe ich alle Ressourcen-Typen:
    | Name               | Icon   |
    | Fahrzeug           | 🚗     |
    | Maschine Produktion| ⚙️     |
    | Maschine Montage   | 🔧     |

Scenario: F5.2 - Neuen Ressourcen-Typ anlegen
  Given ich bin Admin
  When ich "Typ hinzufügen" klicke
  Then öffnet sich ein Dialog (siehe dialog_-_create_resource_type.png)
  When ich Name und Icon eingebe
  Then wird der Typ erstellt

Scenario: F5.3 - Ressource anlegen
  Given ich bin Admin
  When ich "Ressource hinzufügen" klicke
  Then öffnet sich ein Dialog (siehe dialog_-_create_resource_form.png)
  When ich Name, Typ und optional Kennzeichen eingebe
  Then wird die Ressource erstellt
  And erscheint im Resource Pool

Scenario: F5.4 - Ressource bearbeiten
  Given eine Ressource existiert
  When ich auf "Bearbeiten" klicke
  Then öffnet sich ein Dialog (siehe dialog_-_edit_resource_details.png)
  When ich Änderungen vornehme
  Then werden sie gespeichert

Scenario: F5.5 - Ressource deaktivieren
  Given eine Ressource ist aktiv
  When ich auf "Deaktivieren" klicke
  Then wird is_active = false gesetzt
  And die Ressource erscheint nicht mehr im Pool
  And bestehende Allocations bleiben erhalten
```

---

## Technische Anforderungen

### ResourceType Entity

```typescript
interface ResourceType {
  id: string;
  tenantId: string;
  name: string;         // z.B. "Fahrzeug", "Maschine Produktion"
  icon?: string;        // Emoji oder Icon-Name
  color?: string;       // Hex-Farbe für UI
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Resource Entity

```typescript
interface Resource {
  id: string;
  tenantId: string;
  resourceTypeId: string;
  name: string;           // z.B. "Sprinter 1", "Kran A"
  licensePlate?: string;  // Nur für Fahrzeuge
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für ResourceType Entity

```typescript
// src/domain/entities/__tests__/ResourceType.test.ts
import { describe, it, expect } from 'vitest';
import { ResourceType } from '../ResourceType';

describe('ResourceType Entity', () => {
  it('should create valid resource type', () => {
    const type = ResourceType.create({
      tenantId: 'tenant-123',
      name: 'Fahrzeug',
      icon: '🚗',
      sortOrder: 1,
    });

    expect(type.name).toBe('Fahrzeug');
    expect(type.icon).toBe('🚗');
  });

  it('should require name', () => {
    expect(() => ResourceType.create({
      tenantId: 'tenant-123',
      name: '',
      sortOrder: 1,
    })).toThrow('Name ist erforderlich');
  });
});
```

### 🔴 RED: Test für Resource Entity

```typescript
// src/domain/entities/__tests__/Resource.test.ts
import { describe, it, expect } from 'vitest';
import { Resource } from '../Resource';

describe('Resource Entity', () => {
  it('should create valid resource', () => {
    const resource = Resource.create({
      tenantId: 'tenant-123',
      resourceTypeId: 'type-123',
      name: 'Sprinter 1',
      licensePlate: 'B-AB 1234',
    });

    expect(resource.name).toBe('Sprinter 1');
    expect(resource.licensePlate).toBe('B-AB 1234');
    expect(resource.isActive).toBe(true);
  });

  it('should require name', () => {
    expect(() => Resource.create({
      tenantId: 'tenant-123',
      resourceTypeId: 'type-123',
      name: '',
    })).toThrow('Name ist erforderlich');
  });
});
```

### 🟢 GREEN: Entities implementieren

```typescript
// src/domain/entities/ResourceType.ts
import { ValidationError } from '@/domain/errors';

export interface ResourceTypeProps {
  id?: string;
  tenantId: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ResourceType {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly icon?: string;
  readonly color?: string;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: ResourceTypeProps): ResourceType {
    if (!props.name?.trim()) {
      throw new ValidationError('Name ist erforderlich');
    }

    return new ResourceType({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      name: props.name.trim(),
      icon: props.icon,
      color: props.color,
      sortOrder: props.sortOrder,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
}

// src/domain/entities/Resource.ts
import { ValidationError } from '@/domain/errors';

export interface ResourceProps {
  id?: string;
  tenantId: string;
  resourceTypeId: string;
  name: string;
  licensePlate?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Resource {
  readonly id: string;
  readonly tenantId: string;
  readonly resourceTypeId: string;
  readonly name: string;
  readonly licensePlate?: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: any) {
    Object.assign(this, props);
  }

  static create(props: ResourceProps): Resource {
    if (!props.name?.trim()) {
      throw new ValidationError('Name ist erforderlich');
    }

    return new Resource({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      resourceTypeId: props.resourceTypeId,
      name: props.name.trim(),
      licensePlate: props.licensePlate?.trim(),
      isActive: props.isActive ?? true,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  deactivate(): Resource {
    return Resource.create({ ...this, isActive: false, updatedAt: new Date() });
  }

  reactivate(): Resource {
    return Resource.create({ ...this, isActive: true, updatedAt: new Date() });
  }
}
```

### 🟢 GREEN: Repositories implementieren

```typescript
// src/application/ports/repositories/IResourceRepository.ts
// src/application/ports/repositories/IResourceTypeRepository.ts
// src/infrastructure/repositories/SupabaseResourceRepository.ts
// src/infrastructure/repositories/SupabaseResourceTypeRepository.ts
```

---

## Erwartete Dateien

```
src/
├── domain/
│   └── entities/
│       ├── ResourceType.ts
│       ├── Resource.ts
│       └── __tests__/
│           ├── ResourceType.test.ts
│           └── Resource.test.ts
├── application/
│   ├── ports/
│   │   └── repositories/
│   │       ├── IResourceTypeRepository.ts
│   │       └── IResourceRepository.ts
│   └── use-cases/
│       └── resources/
│           ├── CreateResourceTypeUseCase.ts
│           ├── CreateResourceUseCase.ts
│           └── DeactivateResourceUseCase.ts
└── infrastructure/
    └── repositories/
        ├── SupabaseResourceTypeRepository.ts
        └── SupabaseResourceRepository.ts
```

---

## Hinweise

- ResourceTypes sind Tenant-spezifisch (jeder Tenant kann eigene definieren)
- Name muss unique pro Tenant sein
- Deaktivierte Ressourcen bleiben in der DB, erscheinen aber nicht im Pool
- Allocations für deaktivierte Ressourcen bleiben bestehen
- UI-Design exakt nach den PNG-Screens

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] ResourceType CRUD funktioniert
- [ ] Resource CRUD funktioniert
- [ ] Deaktivierung funktioniert
- [ ] Allocations bleiben bei Deaktivierung erhalten

---

*Vorheriger Prompt: 09 – Allocation Entity*
*Nächster Prompt: 11 – Absence Entity & Konflikt-Erkennung*
