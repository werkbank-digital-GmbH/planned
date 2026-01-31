# Prompt 06: User Management

**Phase:** 2 – Authentifizierung & Multi-Tenancy
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Multi-Tenancy funktioniert. Jetzt implementieren wir die User-Verwaltung.

**Bereits vorhanden:**
- Supabase Auth mit Login/Logout
- Multi-Tenancy mit RLS
- Tenant Context Hook

---

## Ziel

Implementiere CRUD für User innerhalb eines Tenants mit Rollenverwaltung.

---

## Referenz-Dokumentation

- `DATA_MODEL.md` – Users Tabelle
- `FEATURES.md` – F6: Mitarbeiter-Verwaltung (F6.1-F6.5)
- **UI-Screens:**
  - `stitch_planned./settings_-_employee_management/settings_-_employee_management.png`
  - `stitch_planned./dialog_-_create_employee_form/dialog_-_create_employee_form.png`
  - `stitch_planned./dialog_-_edit_employee_form/dialog_-_edit_employee_form.png`

---

## Akzeptanzkriterien

```gherkin
Feature: F6 - Mitarbeiter-Verwaltung

Scenario: F6.1 - Mitarbeiter-Liste anzeigen
  Given ich bin Admin oder Planer
  When ich zu Einstellungen > Mitarbeiter navigiere
  Then sehe ich alle Mitarbeiter meines Tenants
  And kann nach Name/E-Mail filtern
  And sehe für jeden: Name, E-Mail, Rolle, Wochenstunden, Status

Scenario: F6.2 - Neuen Mitarbeiter anlegen
  Given ich bin Admin
  When ich auf "Mitarbeiter hinzufügen" klicke
  Then öffnet sich ein Dialog (siehe dialog_-_create_employee_form.png)
  When ich das Formular ausfülle:
    | Feld          | Wert                |
    | Vorname       | Max                 |
    | Nachname      | Mustermann          |
    | E-Mail        | max@firma.de        |
    | Rolle         | planer              |
    | Wochenstunden | 40                  |
  And auf "Speichern" klicke
  Then wird der Mitarbeiter erstellt
  And erscheint in der Liste
  And erhält eine Einladungs-E-Mail

Scenario: F6.3 - Mitarbeiter bearbeiten
  Given ich bin Admin
  When ich auf einen Mitarbeiter klicke
  Then öffnet sich ein Bearbeitungs-Dialog (siehe dialog_-_edit_employee_form.png)
  When ich Änderungen vornehme und speichere
  Then werden die Änderungen übernommen
  And sind sofort in der Liste sichtbar

Scenario: F6.4 - Mitarbeiter deaktivieren
  Given ich bin Admin
  And ein Mitarbeiter ist aktiv
  When ich auf "Deaktivieren" klicke
  Then wird der Status auf "inaktiv" gesetzt
  And der Mitarbeiter kann sich nicht mehr einloggen
  And seine Allocations bleiben erhalten

Scenario: F6.5 - Einladung erneut senden
  Given ich bin Admin
  And ein Mitarbeiter hat sich noch nicht registriert
  When ich auf "Einladung erneut senden" klicke
  Then erhält er eine neue Einladungs-E-Mail

Scenario: Rollen-Berechtigung
  Given ich bin "planer" (nicht Admin)
  When ich die Mitarbeiter-Seite öffne
  Then kann ich Mitarbeiter sehen
  But ich kann keine Mitarbeiter anlegen/bearbeiten/löschen
```

---

## Technische Anforderungen

### User Roles aus DATA_MODEL.md

```typescript
type UserRole = 'admin' | 'planer' | 'gewerblich';

// Berechtigungen
const permissions = {
  admin: ['create_user', 'edit_user', 'delete_user', 'view_all'],
  planer: ['view_all'],
  gewerblich: ['view_self'],
};
```

### User Entity

```typescript
interface User {
  id: string;
  tenantId: string;
  authId?: string;  // Verknüpfung zu Supabase Auth
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;  // 0-60
  isActive: boolean;
  timetacId?: string;   // Optional: TimeTac User-ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Create User DTO

```typescript
interface CreateUserDTO {
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
}
```

---

## Implementierungsschritte

### 🔴 RED: Test für User Entity

```typescript
// src/domain/entities/__tests__/User.test.ts
import { describe, it, expect } from 'vitest';
import { User } from '../User';

describe('User Entity', () => {
  it('should create valid user', () => {
    const user = User.create({
      email: 'test@firma.de',
      fullName: 'Max Mustermann',
      role: 'planer',
      weeklyHours: 40,
      tenantId: 'tenant-123',
    });

    expect(user.email).toBe('test@firma.de');
    expect(user.isActive).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(() => User.create({
      email: 'invalid',
      fullName: 'Test',
      role: 'planer',
      weeklyHours: 40,
      tenantId: 'tenant-123',
    })).toThrow('Ungültige E-Mail-Adresse');
  });

  it('should reject weekly hours > 60', () => {
    expect(() => User.create({
      email: 'test@firma.de',
      fullName: 'Test',
      role: 'planer',
      weeklyHours: 70,
      tenantId: 'tenant-123',
    })).toThrow('Wochenstunden müssen zwischen 0 und 60 liegen');
  });
});
```

### 🟢 GREEN: User Entity implementieren

```typescript
// src/domain/entities/User.ts
import { ValidationError } from '@/domain/errors';

export type UserRole = 'admin' | 'planer' | 'gewerblich';

export interface UserProps {
  id?: string;
  tenantId: string;
  authId?: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive?: boolean;
  timetacId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  readonly id: string;
  readonly tenantId: string;
  readonly authId?: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly weeklyHours: number;
  readonly isActive: boolean;
  readonly timetacId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: Required<Omit<UserProps, 'authId' | 'timetacId'>> & Pick<UserProps, 'authId' | 'timetacId'>) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.authId = props.authId;
    this.email = props.email;
    this.fullName = props.fullName;
    this.role = props.role;
    this.weeklyHours = props.weeklyHours;
    this.isActive = props.isActive;
    this.timetacId = props.timetacId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: UserProps): User {
    // Validierung
    if (!props.email.includes('@')) {
      throw new ValidationError('Ungültige E-Mail-Adresse');
    }
    if (props.weeklyHours < 0 || props.weeklyHours > 60) {
      throw new ValidationError('Wochenstunden müssen zwischen 0 und 60 liegen');
    }
    if (!props.fullName.trim()) {
      throw new ValidationError('Name ist erforderlich');
    }

    return new User({
      id: props.id ?? crypto.randomUUID(),
      tenantId: props.tenantId,
      authId: props.authId,
      email: props.email.toLowerCase(),
      fullName: props.fullName.trim(),
      role: props.role,
      weeklyHours: props.weeklyHours,
      isActive: props.isActive ?? true,
      timetacId: props.timetacId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  get dailyHours(): number {
    return this.weeklyHours / 5;
  }
}
```

### 🔴 RED: Test für CreateUser Use Case

```typescript
// src/application/use-cases/users/__tests__/CreateUserUseCase.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CreateUserUseCase } from '../CreateUserUseCase';

describe('CreateUserUseCase', () => {
  it('should create user and send invitation', async () => {
    const mockUserRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue({ id: 'user-123' }),
    };
    const mockAuthService = {
      inviteUser: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateUserUseCase(mockUserRepo, mockAuthService);
    const result = await useCase.execute({
      email: 'new@firma.de',
      fullName: 'Neuer User',
      role: 'planer',
      weeklyHours: 40,
      tenantId: 'tenant-123',
    });

    expect(result.id).toBe('user-123');
    expect(mockAuthService.inviteUser).toHaveBeenCalledWith('new@firma.de');
  });

  it('should reject duplicate email', async () => {
    const mockUserRepo = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'existing' }),
    };

    const useCase = new CreateUserUseCase(mockUserRepo, {} as any);

    await expect(useCase.execute({
      email: 'existing@firma.de',
      fullName: 'Test',
      role: 'planer',
      weeklyHours: 40,
      tenantId: 'tenant-123',
    })).rejects.toThrow('E-Mail-Adresse bereits vergeben');
  });
});
```

### 🟢 GREEN: CreateUser Use Case implementieren

```typescript
// src/application/use-cases/users/CreateUserUseCase.ts
import { User, UserRole } from '@/domain/entities/User';
import { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import { IAuthService } from '@/application/ports/services/IAuthService';
import { ConflictError } from '@/domain/errors';

export interface CreateUserRequest {
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  tenantId: string;
}

export class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(request: CreateUserRequest): Promise<User> {
    // Prüfen ob E-Mail bereits existiert
    const existing = await this.userRepository.findByEmail(request.email, request.tenantId);
    if (existing) {
      throw new ConflictError('E-Mail-Adresse bereits vergeben');
    }

    // User erstellen
    const user = User.create({
      email: request.email,
      fullName: request.fullName,
      role: request.role,
      weeklyHours: request.weeklyHours,
      tenantId: request.tenantId,
    });

    // Speichern
    const savedUser = await this.userRepository.save(user);

    // Einladungs-E-Mail senden
    await this.authService.inviteUser(request.email);

    return savedUser;
  }
}
```

### 🟢 GREEN: E2E Test für UI

```typescript
// tests/e2e/settings/employees.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mitarbeiter-Verwaltung', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/einstellungen/mitarbeiter');
  });

  test('should show employee list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Mitarbeiter');
    await expect(page.locator('[data-testid="employee-row"]')).toHaveCount.greaterThan(0);
  });

  test('should create new employee', async ({ page }) => {
    await page.click('button:has-text("Mitarbeiter hinzufügen")');

    await page.fill('input[name="fullName"]', 'Test Mitarbeiter');
    await page.fill('input[name="email"]', 'test.new@firma.de');
    await page.selectOption('select[name="role"]', 'planer');
    await page.fill('input[name="weeklyHours"]', '40');

    await page.click('button:has-text("Speichern")');

    await expect(page.locator('text=Test Mitarbeiter')).toBeVisible();
  });
});
```

### 🟢 GREEN: Einstellungen-Seite mit User-Liste

```typescript
// src/app/(dashboard)/einstellungen/mitarbeiter/page.tsx
// Implementation basierend auf UI-Screen
```

---

## Erwartete Dateien

```
src/
├── domain/
│   └── entities/
│       ├── User.ts
│       └── __tests__/
│           └── User.test.ts
├── application/
│   ├── ports/
│   │   ├── repositories/
│   │   │   └── IUserRepository.ts
│   │   └── services/
│   │       └── IAuthService.ts
│   └── use-cases/
│       └── users/
│           ├── CreateUserUseCase.ts
│           ├── UpdateUserUseCase.ts
│           ├── GetUsersUseCase.ts
│           ├── DeactivateUserUseCase.ts
│           └── __tests__/
│               └── CreateUserUseCase.test.ts
├── infrastructure/
│   └── repositories/
│       └── SupabaseUserRepository.ts
├── presentation/
│   ├── actions/
│   │   └── users.ts
│   └── components/
│       └── settings/
│           ├── UserList.tsx
│           ├── UserForm.tsx
│           └── UserRow.tsx
└── app/
    └── (dashboard)/
        └── einstellungen/
            └── mitarbeiter/
                └── page.tsx
```

---

## Hinweise

- Nur Admin kann User verwalten (Planer kann nur sehen)
- `weeklyHours` zwischen 0 und 60
- E-Mail muss unique pro Tenant sein
- TimeTac-ID kann optional gesetzt werden (für späteren Sync)
- Deaktivierte User können sich nicht einloggen, Allocations bleiben
- UI-Design exakt nach den PNG-Screens

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] User-Liste zeigt alle Mitarbeiter
- [ ] Neuer Mitarbeiter kann erstellt werden
- [ ] Bearbeitung funktioniert
- [ ] Deaktivierung funktioniert
- [ ] E-Mail-Validierung (unique, Format)
- [ ] Rollen-Berechtigung wird geprüft

---

*Vorheriger Prompt: 05 – Multi-Tenancy & RLS*
*Nächster Prompt: 07 – Project Entity & Repository*
