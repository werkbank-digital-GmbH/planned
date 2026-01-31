# Prompt 03: Clean Architecture Grundstruktur

**Phase:** 1 – Projekt-Setup & Infrastruktur
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Supabase ist integriert. Jetzt etablieren wir die Clean Architecture Grundstruktur mit DI Container und ActionResult Pattern.

**Bereits vorhanden:**
- Next.js 15 mit TypeScript strict mode
- Supabase mit allen Tabellen und RLS
- Vier Supabase-Clients (Server, Browser, Action, Admin)
- Generierte TypeScript Types

---

## Ziel

Implementiere den Dependency Injection Container und das ActionResult Pattern gemäß `API_SPEC.md`.

---

## Referenz-Dokumentation

- `API_SPEC.md` – DI Container, ActionResult Pattern, Error Codes
- `FOLDER_STRUCTURE.md` – Schichten-Struktur
- `Rules.md` – Import-Regeln, Error Handling

---

## Akzeptanzkriterien

```gherkin
Feature: Clean Architecture Basis

Scenario: ActionResult Pattern
  Given ich eine Server Action ausführe
  Then gibt sie immer ein ActionResult zurück:
    | Feld    | Erfolg          | Fehler                    |
    | success | true            | false                     |
    | data    | T (Ergebnis)    | undefined                 |
    | error   | undefined       | { code, message, details }|

Scenario: DI Container
  Given ich einen Use Case benötige
  When ich den Container nutze
  Then kann ich Repositories und Services auflösen
  And die Implementierungen sind austauschbar (für Tests)

Scenario: Domain Errors
  Given ein Validierungsfehler tritt auf
  Then wird ein typisierter DomainError geworfen
  And der Error hat einen eindeutigen Code aus API_SPEC.md

Scenario: Import-Regeln
  Given ich einen Import in der Domain-Schicht schreibe
  Then kann ich NICHTS außer Standard-Bibliotheken importieren
  And ESLint meldet einen Fehler bei Verstößen
```

---

## Technische Anforderungen

### ActionResult Pattern aus API_SPEC.md

```typescript
// Erfolg
type ActionSuccess<T> = {
  success: true;
  data: T;
};

// Fehler
type ActionFailure = {
  success: false;
  error: ActionError;
};

type ActionResult<T> = ActionSuccess<T> | ActionFailure;

interface ActionError {
  code: string;       // z.B. 'ALLOCATION_NOT_FOUND'
  message: string;    // Deutsche Fehlermeldung
  details?: Record<string, unknown>;
}
```

### DI Container Interface

```typescript
interface IContainer {
  resolve<T>(token: symbol): T;
  register<T>(token: symbol, factory: () => T): void;
}
```

### Error Codes aus API_SPEC.md (Auszug)

```typescript
const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Allocation
  ALLOCATION_NOT_FOUND: 'ALLOCATION_NOT_FOUND',
  ALLOCATION_USER_OR_RESOURCE_REQUIRED: 'ALLOCATION_USER_OR_RESOURCE_REQUIRED',
  ALLOCATION_CANNOT_HAVE_BOTH: 'ALLOCATION_CANNOT_HAVE_BOTH',

  // ... 60+ weitere Codes in API_SPEC.md
} as const;
```

---

## Implementierungsschritte

### 🔴 RED: Test für ActionResult Helper-Funktionen

```typescript
// src/application/common/__tests__/ActionResult.test.ts
import { describe, it, expect } from 'vitest';
import { Result } from '../ActionResult';

describe('ActionResult', () => {
  describe('Result.ok', () => {
    it('should create success result with data', () => {
      const result = Result.ok({ id: '123', name: 'Test' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', name: 'Test' });
      }
    });
  });

  describe('Result.fail', () => {
    it('should create failure result with error', () => {
      const result = Result.fail('NOT_FOUND', 'Ressource nicht gefunden');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toBe('Ressource nicht gefunden');
      }
    });

    it('should include details when provided', () => {
      const result = Result.fail('VALIDATION_ERROR', 'Ungültig', { field: 'email' });

      if (!result.success) {
        expect(result.error.details).toEqual({ field: 'email' });
      }
    });
  });
});
```

### 🟢 GREEN: ActionResult implementieren

```typescript
// src/application/common/ActionResult.ts

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionFailure = {
  success: false;
  error: ActionError;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export interface ActionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const Result = {
  ok<T>(data: T): ActionSuccess<T> {
    return { success: true, data };
  },

  fail(code: string, message: string, details?: Record<string, unknown>): ActionFailure {
    return {
      success: false,
      error: { code, message, details },
    };
  },
};
```

### 🔴 RED: Test für DI Container

```typescript
// src/infrastructure/container/__tests__/Container.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container, TOKENS } from '../Container';

describe('DI Container', () => {
  let container: Container;

  beforeEach(() => {
    container = Container.getInstance();
    container.reset(); // Für Tests
  });

  it('should be a singleton', () => {
    const instance1 = Container.getInstance();
    const instance2 = Container.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register and resolve dependencies', () => {
    const mockRepo = { findById: vi.fn() };
    container.register(TOKENS.UserRepository, () => mockRepo);

    const resolved = container.resolve(TOKENS.UserRepository);
    expect(resolved).toBe(mockRepo);
  });

  it('should throw when resolving unregistered token', () => {
    expect(() => container.resolve(Symbol('unknown')))
      .toThrow('No registration found');
  });
});
```

### 🟢 GREEN: DI Container implementieren

```typescript
// src/infrastructure/container/Container.ts

type Factory<T> = () => T;

export class Container {
  private static instance: Container;
  private registrations = new Map<symbol, Factory<unknown>>();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(token: symbol, factory: Factory<T>): void {
    this.registrations.set(token, factory);
  }

  resolve<T>(token: symbol): T {
    const factory = this.registrations.get(token);
    if (!factory) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }
    return factory() as T;
  }

  reset(): void {
    this.registrations.clear();
  }
}

// src/infrastructure/container/tokens.ts
export const TOKENS = {
  // Repositories
  UserRepository: Symbol('UserRepository'),
  ProjectRepository: Symbol('ProjectRepository'),
  ProjectPhaseRepository: Symbol('ProjectPhaseRepository'),
  AllocationRepository: Symbol('AllocationRepository'),
  ResourceRepository: Symbol('ResourceRepository'),
  ResourceTypeRepository: Symbol('ResourceTypeRepository'),
  AbsenceRepository: Symbol('AbsenceRepository'),
  TimeEntryRepository: Symbol('TimeEntryRepository'),
  TenantRepository: Symbol('TenantRepository'),
  SyncLogRepository: Symbol('SyncLogRepository'),
  IntegrationCredentialsRepository: Symbol('IntegrationCredentialsRepository'),

  // Services
  AsanaService: Symbol('AsanaService'),
  TimeTacService: Symbol('TimeTacService'),
  EncryptionService: Symbol('EncryptionService'),
} as const;
```

### 🔴 RED: Test für Domain Errors

```typescript
// src/domain/errors/__tests__/DomainError.test.ts
import { describe, it, expect } from 'vitest';
import { DomainError, ValidationError, NotFoundError } from '../index';

describe('Domain Errors', () => {
  it('should create ValidationError with code', () => {
    const error = new ValidationError('E-Mail ist ungültig');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('E-Mail ist ungültig');
    expect(error instanceof DomainError).toBe(true);
  });

  it('should create NotFoundError with entity info', () => {
    const error = new NotFoundError('User', '123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User mit ID 123 nicht gefunden');
  });
});
```

### 🟢 GREEN: Domain Errors implementieren

```typescript
// src/domain/errors/DomainError.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// src/domain/errors/ValidationError.ts
import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}

// src/domain/errors/NotFoundError.ts
import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entityName: string, id: string) {
    super(`${entityName} mit ID ${id} nicht gefunden`);
  }
}

// src/domain/errors/index.ts
export { DomainError } from './DomainError';
export { ValidationError } from './ValidationError';
export { NotFoundError } from './NotFoundError';
```

### 🔵 REFACTOR: Error Codes als Konstanten

```typescript
// src/application/common/ErrorCodes.ts
export const ErrorCodes = {
  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION (AUTH_*)
  // ═══════════════════════════════════════════════════════════════
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION (VALIDATION_*)
  // ═══════════════════════════════════════════════════════════════
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_RANGE: 'VALIDATION_INVALID_RANGE',

  // ═══════════════════════════════════════════════════════════════
  // ALLOCATION (ALLOCATION_*)
  // ═══════════════════════════════════════════════════════════════
  ALLOCATION_NOT_FOUND: 'ALLOCATION_NOT_FOUND',
  ALLOCATION_USER_OR_RESOURCE_REQUIRED: 'ALLOCATION_USER_OR_RESOURCE_REQUIRED',
  ALLOCATION_CANNOT_HAVE_BOTH: 'ALLOCATION_CANNOT_HAVE_BOTH',
  ALLOCATION_PHASE_NOT_FOUND: 'ALLOCATION_PHASE_NOT_FOUND',

  // ... weitere Codes aus API_SPEC.md
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

---

## Erwartete Dateien

```
src/
├── domain/
│   └── errors/
│       ├── DomainError.ts
│       ├── ValidationError.ts
│       ├── NotFoundError.ts
│       ├── AuthorizationError.ts
│       ├── ConflictError.ts
│       ├── index.ts
│       └── __tests__/
│           └── DomainError.test.ts
├── application/
│   └── common/
│       ├── ActionResult.ts
│       ├── ErrorCodes.ts
│       ├── index.ts
│       └── __tests__/
│           └── ActionResult.test.ts
├── infrastructure/
│   └── container/
│       ├── Container.ts
│       ├── tokens.ts
│       ├── index.ts
│       └── __tests__/
│           └── Container.test.ts
└── lib/
    └── constants.ts  # Erweitert um WORK_DAYS_PER_WEEK
```

---

## Hinweise

- Container muss Singleton sein
- Error Codes exakt aus `API_SPEC.md` übernehmen
- `WORK_DAYS_PER_WEEK = 5` als Konstante definieren
- Keine externen DI Libraries verwenden (eigene Implementation)
- Domain Errors sind abstrakt und werden in Use Cases geworfen
- Server Actions fangen Errors und übersetzen sie zu ActionResult

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Alle Tests sind grün
- [ ] ActionResult Type-Guards funktionieren
- [ ] Container ist als Singleton implementiert
- [ ] Domain Errors haben korrekte Codes
- [ ] Error Codes aus API_SPEC.md sind vollständig

---

*Vorheriger Prompt: 02 – Supabase Integration*
*Nächster Prompt: 04 – Supabase Auth Integration*
