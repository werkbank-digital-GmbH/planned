# planned. – Entwicklungsregeln

> Diese Regeln sind VERBINDLICH für jeden Prompt und jede Code-Generierung.

**Version:** 2.0
**Datum:** 29. Januar 2026

---

> **Hinweis:** Diese Dokumentation verwendet UTF-8-kodierte Box-Drawing-Zeichen (┌─┐│└┘) für Diagramme. Stelle sicher, dass dein Editor UTF-8 unterstützt.

---

## 🚨 WICHTIG: Diese Datei IMMER beachten!

Bevor du Code schreibst, lies diese Regeln. Sie sind nicht optional.

---

## 1. Projekt-Kontext

```yaml
Projektname: planned.
Beschreibung: Kapazitätsplanungs-App für Holzbaubetriebe
Sprache: TypeScript (strict mode)
Framework: Next.js 15 (App Router)
Styling: Tailwind CSS + Shadcn/UI
Datenbank: Supabase (PostgreSQL)
Auth: Supabase Auth
Hosting: Vercel
Testing: Vitest + Playwright
```

### Domänen-Kontext

```yaml
Zielgruppe: Holzbaubetriebe mit 10-100 Mitarbeitern
Bereiche: Produktion (Werk) + Montage (Baustelle)
Rollen:
  - admin: Geschäftsführung, IT (alle Rechte)
  - planer: Produktions-/Montageleiter (Planung)
  - gewerblich: Zimmerer, Monteure (Mobile Read-Only)
```

### Was planned. NICHT ist

```yaml
Keine Teams/Kolonnen: Nur Einzelpersonen werden allokiert
Keine Fahrzeitberechnung: Entfällt komplett
Keine Freigabe-Workflows: Jede Änderung gilt sofort
Keine Mobile-Schreibrechte: Gewerbliche nur Read-Only
Keine Projekt-Erstellung: Alles kommt aus Asana
```

---

## 2. Test-Driven Development (TDD)

### 🔴🟢🔵 Der TDD-Zyklus ist PFLICHT

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🔴 RED        →    🟢 GREEN      →    🔵 REFACTOR            │
│                                                                 │
│   Test schreiben     Code schreiben     Code verbessern         │
│   (schlägt fehl)     (Test wird grün)   (Tests bleiben grün)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### TDD-Regeln

1. **NIEMALS Code ohne Test schreiben**
   - Erst der Test, dann die Implementierung
   - Keine Ausnahmen, auch nicht für "einfache" Funktionen

2. **Test muss ZUERST fehlschlagen**
   - Ein Test, der sofort grün ist, testet nichts
   - Verifiziere, dass der Test wirklich rot ist

3. **Minimaler Code für grünen Test**
   - Schreibe nur so viel Code, wie nötig ist
   - Keine vorauseilende Optimierung

4. **Refactoring nur bei grünen Tests**
   - Erst wenn alle Tests grün sind, refactoren
   - Nach jedem Refactoring: Tests erneut laufen lassen

### Test-Struktur

```typescript
// ═══════════════════════════════════════════════════════════════
// TEST DATEI NAMING
// ═══════════════════════════════════════════════════════════════

// Unit Tests: Neben der Datei
src/domain/entities/Allocation.ts
src/domain/entities/Allocation.test.ts

// Integration Tests: Im __tests__ Ordner
src/application/use-cases/allocations/CreateAllocationUseCase.ts
src/application/use-cases/allocations/__tests__/CreateAllocationUseCase.test.ts

// E2E Tests: Im tests/ Ordner
tests/e2e/allocations.spec.ts
```

### Test-Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Reset mocks, create fixtures
  });

  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = featureUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('should throw [ErrorType] when [invalid condition]', () => {
      // Arrange
      const invalidInput = createInvalidInput();
      
      // Act & Assert
      expect(() => featureUnderTest(invalidInput))
        .toThrow(ExpectedError);
    });
  });
});
```

### Was muss getestet werden?

| Layer | Test-Typ | Was testen? |
|-------|----------|-------------|
| Domain | Unit | Entities, Value Objects, Domain Services |
| Application | Unit + Integration | Use Cases mit gemockten Repositories |
| Infrastructure | Integration | Repository-Implementierungen gegen Test-DB |
| Presentation | Integration + E2E | Server Actions, kritische User Flows |

### Mocking-Regeln

```typescript
// ✅ GUT: Repository mocken
const mockAllocationRepo: IAllocationRepository = {
  findById: vi.fn(),
  save: vi.fn(),
  findByUserAndDate: vi.fn().mockResolvedValue([]),
};

// ✅ GUT: External Service mocken
const mockAsanaService: IAsanaService = {
  getProjects: vi.fn().mockResolvedValue(testProjects),
};

// ❌ SCHLECHT: Domain Logic mocken
vi.mock('@/domain/services/AllocationCalculator'); // NIEMALS!

// ❌ SCHLECHT: Interne Implementierung mocken
vi.mock('@/domain/entities/Allocation'); // NIEMALS!
```

---

## 3. Clean Architecture

### Schichten-Regel (UNVERLETZLICH)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         DOMAIN                                  │
│                    (keine Abhängigkeiten)                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │                     APPLICATION                         │   │
│   │                  (kennt nur Domain)                     │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                 │   │   │
│   │   │    INFRASTRUCTURE     PRESENTATION              │   │   │
│   │   │    (implementiert)    (nutzt)                   │   │   │
│   │   │                                                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Import-Regeln

```typescript
// ═══════════════════════════════════════════════════════════════
// ERLAUBTE IMPORTS PRO LAYER
// ═══════════════════════════════════════════════════════════════

// Domain Layer darf importieren:
// ✅ Nichts außer Standard-Bibliotheken
// ❌ NIEMALS: application, infrastructure, presentation

// Application Layer darf importieren:
// ✅ @/domain/*
// ❌ NIEMALS: infrastructure, presentation

// Infrastructure Layer darf importieren:
// ✅ @/domain/*
// ✅ @/application/ports/* (nur Interfaces!)
// ❌ NIEMALS: presentation, application/use-cases

// Presentation Layer darf importieren:
// ✅ @/domain/* (nur Types/Enums für Props)
// ✅ @/application/use-cases/*
// ✅ @/infrastructure/container (für DI)
// ✅ @/presentation/*
```

### Ordnerstruktur

```
src/
├── domain/                     # KEINE Abhängigkeiten
│   ├── entities/
│   │   ├── Allocation.ts
│   │   ├── Project.ts
│   │   ├── ProjectPhase.ts
│   │   ├── Resource.ts
│   │   ├── User.ts
│   │   └── Absence.ts
│   ├── value-objects/
│   ├── enums/
│   │   ├── UserRole.ts
│   │   ├── ProjectStatus.ts
│   │   ├── PhaseBereich.ts
│   │   └── AbsenceType.ts
│   ├── errors/
│   └── services/
│       └── AllocationCalculator.ts
│
├── application/                # Nur Domain-Abhängigkeiten
│   ├── ports/
│   │   ├── repositories/
│   │   └── services/
│   ├── use-cases/
│   │   ├── allocations/
│   │   ├── projects/
│   │   ├── resources/
│   │   ├── users/
│   │   └── absences/
│   └── dtos/
│
├── infrastructure/             # Implementiert Interfaces
│   ├── repositories/
│   ├── services/
│   │   ├── AsanaService.ts
│   │   └── TimeTacService.ts
│   ├── supabase/
│   ├── mappers/
│   └── container/
│
├── presentation/               # UI + Server Actions
│   ├── actions/
│   ├── hooks/
│   └── components/
│
├── app/                        # Next.js App Router
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── planung/
│   │   ├── projekte/
│   │   ├── ressourcen/
│   │   ├── mitarbeiter/
│   │   └── einstellungen/
│   ├── (mobile)/
│   │   └── meine-woche/
│   └── api/
│       ├── webhooks/
│       └── cron/
│
└── lib/                        # Shared Utilities
```

---

## 4. Domänen-Regeln (Business Logic)

### Allocation-Regeln

```typescript
// ═══════════════════════════════════════════════════════════════
// REGEL 1: Allocation ist TAGESBASIERT
// ═══════════════════════════════════════════════════════════════

// Eine Allocation = Eine Person/Ressource + Eine Phase + EIN Tag
interface Allocation {
  id: string;
  userId?: string;        // XOR
  resourceId?: string;    // XOR
  projectPhaseId: string;
  date: Date;             // ← Einzelner Tag, KEIN Bereich!
  plannedHours?: number;  // Nur für User, nicht für Ressourcen
}

// ═══════════════════════════════════════════════════════════════
// REGEL 2: PlannedHours Berechnung
// ═══════════════════════════════════════════════════════════════

// Bei EINER Allocation am Tag:
plannedHours = user.weeklyHours / 5;  // z.B. 40/5 = 8h

// Bei MEHREREN Allocations am Tag:
plannedHours = (user.weeklyHours / 5) / anzahlAllocations;
// Beispiel: 2 Allocations → 8h / 2 = 4h pro Allocation

// Bei Ressourcen:
plannedHours = undefined;  // Ressourcen haben KEINE Stunden

// ═══════════════════════════════════════════════════════════════
// REGEL 3: User XOR Resource
// ═══════════════════════════════════════════════════════════════

// Eine Allocation hat ENTWEDER userId ODER resourceId, NIE beide
if (allocation.userId && allocation.resourceId) {
  throw new ValidationError('Allocation kann nicht User UND Resource haben');
}
if (!allocation.userId && !allocation.resourceId) {
  throw new ValidationError('Allocation braucht User ODER Resource');
}

// ═══════════════════════════════════════════════════════════════
// REGEL 4: Abwesenheit = Warnung, KEIN Block
// ═══════════════════════════════════════════════════════════════

// Allocation auf Abwesenheitstag ist ERLAUBT
// Aber: hasAbsenceWarning = true setzen
const hasAbsence = await absenceRepo.existsForUserAndDate(userId, date);
// Allocation wird trotzdem erstellt, UI zeigt Warnung

// ═══════════════════════════════════════════════════════════════
// REGEL 5: Phasen-Verlängerung
// ═══════════════════════════════════════════════════════════════

// Wenn Allocation.date > Phase.endDate:
// → Phase.endDate = Allocation.date
// → Sync zu Asana triggern (debounced)
```

### Projekt-Regeln

```typescript
// ═══════════════════════════════════════════════════════════════
// REGEL 1: Projekte kommen NUR aus Asana
// ═══════════════════════════════════════════════════════════════

// Kein manuelles Erstellen von Projekten in planned.
// Kein manuelles Erstellen von Phasen in planned.
// Alles wird synchronisiert

// ═══════════════════════════════════════════════════════════════
// REGEL 2: Bidirektionaler Sync mit Last-Write-Wins
// ═══════════════════════════════════════════════════════════════

// Änderungen in planned. → nach Asana (debounced, 5 Sekunden)
// Änderungen in Asana → nach planned. (via Webhook)
// Bei Konflikt: Jüngerer Timestamp gewinnt

// ═══════════════════════════════════════════════════════════════
// REGEL 3: Soft Delete mit 90-Tage Papierkorb
// ═══════════════════════════════════════════════════════════════

// Asana Task gelöscht → Phase.status = 'deleted', Phase.deletedAt = now()
// Allocations bleiben erhalten
// Nach 90 Tagen: Hard Delete
// Gelöschte Phasen NICHT in KPIs zählen
```

### Bereichs-Regeln

```typescript
// ═══════════════════════════════════════════════════════════════
// Jede ProjectPhase hat einen Bereich
// ═══════════════════════════════════════════════════════════════

type PhaseBereich = 'produktion' | 'montage';

// Produktion: Elementierung, Abbund, Modulbau (im Werk)
// Montage: Dachdeckerarbeiten, Fassade, etc. (auf Baustelle)

// Bereich kommt aus Asana Custom Field
// Bereich kann in planned. geändert werden → Sync zurück zu Asana
```

---

## 5. Code-Stil

### Naming Conventions

```typescript
// ═══════════════════════════════════════════════════════════════
// DATEIEN
// ═══════════════════════════════════════════════════════════════

// PascalCase für Klassen/Komponenten
Allocation.ts
CreateAllocationUseCase.ts
AllocationCard.tsx

// camelCase für Utilities
utils.ts
formatDate.ts

// kebab-case für Routes
app/(dashboard)/meine-woche/page.tsx

// ═══════════════════════════════════════════════════════════════
// VARIABLEN & FUNKTIONEN
// ═══════════════════════════════════════════════════════════════

// camelCase, beschreibend
const allocationDate = new Date();
const isUserAvailable = checkAvailability(userId);

// Keine Abkürzungen!
// ❌ const alloc = getAllocs();
// ✅ const allocations = getAllocations();

// ═══════════════════════════════════════════════════════════════
// INTERFACES & TYPES
// ═══════════════════════════════════════════════════════════════

// I-Prefix für Repository/Service Interfaces
interface IAllocationRepository { }
interface IAsanaService { }

// Kein Prefix für Domain Types
interface Allocation { }

// ═══════════════════════════════════════════════════════════════
// STRING LITERAL TYPES (statt Enums!)
// ═══════════════════════════════════════════════════════════════

// WICHTIG: Wir verwenden Union Types, KEINE TypeScript Enums!
// Begründung: Bessere Tree-Shaking, einfachere DB-Kompatibilität

type UserRole = 'admin' | 'planer' | 'gewerblich';
type PhaseBereich = 'produktion' | 'montage';
type ProjectStatus = 'active' | 'planned' | 'completed' | 'archived';
type AbsenceType = 'vacation' | 'sick' | 'holiday' | 'training' | 'other';  // UI: Urlaub, Krank, Feiertag, Fortbildung, Sonstiges
```

### Funktions-Design

```typescript
// ═══════════════════════════════════════════════════════════════
// REINE FUNKTIONEN BEVORZUGEN
// ═══════════════════════════════════════════════════════════════

// ✅ GUT: Pure Function
function calculatePlannedHours(
  weeklyHours: number,
  allocationsOnSameDay: number
): number {
  const dailyHours = weeklyHours / 5;
  return dailyHours / allocationsOnSameDay;
}

// ❌ SCHLECHT: Side Effects
function calculatePlannedHours(allocation: Allocation): number {
  allocation.plannedHours = /* calculation */; // Mutiert Input!
  saveToDatabase(allocation); // Side Effect!
  return allocation.plannedHours;
}

// ═══════════════════════════════════════════════════════════════
// EARLY RETURNS
// ═══════════════════════════════════════════════════════════════

// ✅ GUT: Early Return
function validateAllocation(allocation: Allocation): Result {
  if (!allocation.projectPhaseId) {
    return Result.fail('Phase ist erforderlich');
  }
  
  if (!allocation.userId && !allocation.resourceId) {
    return Result.fail('User oder Resource ist erforderlich');
  }
  
  if (allocation.userId && allocation.resourceId) {
    return Result.fail('Nur User ODER Resource, nicht beide');
  }
  
  return Result.ok(allocation);
}

// ═══════════════════════════════════════════════════════════════
// PARAMETER
// ═══════════════════════════════════════════════════════════════

// ✅ GUT: Maximal 3 Parameter, sonst Object
function createAllocation(request: CreateAllocationRequest): Allocation { }

// ❌ SCHLECHT: Zu viele Parameter
function createAllocation(
  userId: string,
  phaseId: string,
  date: Date,
  hours: number,
  notes: string
): Allocation { }
```

### Error Handling

```typescript
// ═══════════════════════════════════════════════════════════════
// DOMAIN ERRORS NUTZEN
// ═══════════════════════════════════════════════════════════════

// Domain Layer: Errors definieren
class AllocationValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.code = 'ALLOCATION_VALIDATION_ERROR';
  }
}

class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User nicht gefunden: ${userId}`);
    this.code = 'USER_NOT_FOUND';
  }
}

// Use Case: Errors werfen
class CreateAllocationUseCase {
  async execute(request: CreateAllocationRequest): Promise<Allocation> {
    const user = await this.userRepo.findById(request.userId);
    if (!user) {
      throw new UserNotFoundError(request.userId);
    }
    // ...
  }
}

// Presentation Layer: Errors fangen und übersetzen
export async function createAllocation(formData: FormData) {
  try {
    const result = await useCase.execute(request);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { success: false, error: 'Mitarbeiter nicht gefunden' };
    }
    console.error('Unexpected error:', error);
    return { success: false, error: 'Ein Fehler ist aufgetreten' };
  }
}
```

---

## 6. Verbotene Praktiken

### ❌ NIEMALS tun:

```typescript
// ═══════════════════════════════════════════════════════════════
// 1. KEINE direkten DB-Calls in Presentation Layer
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
export async function createAllocation(data: FormData) {
  await supabase.from('allocations').insert({...}); // NEIN!
}

// ✅ RICHTIG
export async function createAllocation(data: FormData) {
  const useCase = container.resolve<CreateAllocationUseCase>(...);
  return useCase.execute(request);
}

// ═══════════════════════════════════════════════════════════════
// 2. KEINE Business Logic in Presentation Layer
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
export async function createAllocation(data: FormData) {
  // Business Logic hier ist FALSCH!
  const existingAllocations = await getAllocationsForDay(userId, date);
  const plannedHours = 8 / (existingAllocations.length + 1);
  // ...
}

// ✅ RICHTIG: Use Case macht die Berechnung

// ═══════════════════════════════════════════════════════════════
// 3. KEINE 'any' Types
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
function process(data: any) { }
const result: any = await fetch(...);

// ✅ RICHTIG
function process(data: AllocationData) { }
const result: ApiResponse<Allocation> = await fetch(...);

// ═══════════════════════════════════════════════════════════════
// 4. KEINE Magic Numbers/Strings
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
if (user.role === 'admin') { }
const dailyHours = weeklyHours / 5;

// ✅ RICHTIG
if (user.role === UserRole.ADMIN) { }
const dailyHours = weeklyHours / WORK_DAYS_PER_WEEK;

// ═══════════════════════════════════════════════════════════════
// 5. KEINE neuen npm Pakete ohne explizite Erlaubnis
// ═══════════════════════════════════════════════════════════════

// Vor Installation IMMER fragen:
// "Darf ich [paket] für [zweck] installieren?"

// ═══════════════════════════════════════════════════════════════
// 6. KEINE Tests überspringen oder auskommentieren
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
it.skip('should validate dates', () => { }); // NEIN!
// it('should validate dates', () => { }); // NEIN!

// Wenn ein Test nicht funktioniert: FIXEN, nicht skippen!

// ═══════════════════════════════════════════════════════════════
// 7. KEINE Teams/Kolonnen implementieren
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN - Teams sind NICHT im MVP
interface Team { }
const team = await createTeam(...);

// ✅ RICHTIG - Nur Einzelpersonen
const allocation = await createAllocation({ userId, ... });

// ═══════════════════════════════════════════════════════════════
// 8. KEINE Projekt-Erstellung in planned.
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN - Projekte kommen NUR aus Asana
export async function createProject(data: FormData) { }

// ✅ RICHTIG - Nur Sync aus Asana
export async function syncProjectsFromAsana() { }
```

---

## 7. UI/UX Regeln

### Sprache

```typescript
// Alle UI-Texte auf DEUTSCH
const labels = {
  save: 'Speichern',
  cancel: 'Abbrechen',
  delete: 'Löschen',
  edit: 'Bearbeiten',
  loading: 'Wird geladen...',
  error: 'Ein Fehler ist aufgetreten',
  success: 'Erfolgreich gespeichert',
  
  // Domänen-spezifisch
  allocation: 'Zuweisung',
  project: 'Projekt',
  phase: 'Phase',
  resource: 'Ressource',
  employee: 'Mitarbeiter',
  absence: 'Abwesenheit',
  production: 'Produktion',
  assembly: 'Montage',
  plannedHours: 'Geplante Stunden',
  budgetHours: 'Soll-Stunden',
  actualHours: 'IST-Stunden',
};

// Fehlermeldungen beschreibend
const errors = {
  required: 'Dieses Feld ist erforderlich',
  invalidDate: 'Bitte geben Sie ein gültiges Datum ein',
  userNotFound: 'Mitarbeiter nicht gefunden',
  phaseNotFound: 'Phase nicht gefunden',
  absenceWarning: 'Mitarbeiter hat an diesem Tag Urlaub',
  multiAllocationWarning: 'Mitarbeiter ist an mehreren Projekten eingeplant',
};
```

### Komponenten

```typescript
// ═══════════════════════════════════════════════════════════════
// SHADCN/UI KOMPONENTEN NUTZEN
// ═══════════════════════════════════════════════════════════════

// ✅ RICHTIG: Shadcn nutzen
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// ❌ FALSCH: Eigene Basis-Komponenten
const MyButton = styled.button`...`; // NEIN!

// ═══════════════════════════════════════════════════════════════
// KEINE INLINE STYLES
// ═══════════════════════════════════════════════════════════════

// ❌ VERBOTEN
<div style={{ marginTop: '20px' }}>

// ✅ RICHTIG
<div className="mt-5">
```

### Warnungen und Indikatoren

```typescript
// ═══════════════════════════════════════════════════════════════
// FARB-CODING FÜR WARNUNGEN
// ═══════════════════════════════════════════════════════════════

// 🔴 Rot: Abwesenheit (Urlaub, Krank)
// ⚠️ Gelb: Mehrfach-Allocation am gleichen Tag
// 🟢 Grün: Alles OK

// Beispiel:
<AllocationChip
  hasAbsenceWarning={hasAbsence}      // → Rot
  hasMultiWarning={allocations > 1}   // → Gelb
/>
```

---

## 8. Git Commit Messages

```bash
# Format
<type>(<scope>): <description>

# Types
feat     # Neues Feature
fix      # Bugfix
test     # Tests hinzufügen/ändern
refactor # Code-Verbesserung ohne Funktionsänderung
docs     # Dokumentation
chore    # Maintenance (deps, config)

# Scopes (planned.-spezifisch)
allocations
projects
phases
resources
users
absences
asana
timetac
auth
ui
settings   # Einstellungen, Tenant-Config
mobile     # Mobile-App (/meine-woche)
dashboard  # Dashboard-KPIs

# Beispiele
test(allocations): add unit tests for PlannedHours calculation
feat(allocations): implement multi-allocation with auto-split
fix(asana): correct debounce timing for sync
refactor(domain): extract AllocationCalculator service
docs(readme): add setup instructions
chore(deps): update supabase to 2.x

# Bei TDD: Separate Commits für Test und Implementation
git commit -m "test(allocations): add tests for absence warning"
git commit -m "feat(allocations): implement absence warning"
git commit -m "refactor(allocations): simplify warning logic"
```

---

## 9. Checkliste vor jedem Commit

```
[ ] Alle Tests geschrieben (TDD: Tests zuerst!)
[ ] Alle Tests grün: npm run test:run
[ ] Keine TypeScript Errors: npm run typecheck
[ ] Keine ESLint Warnings: npm run lint
[ ] Keine console.log Statements
[ ] Keine auskommentierten Code-Blöcke
[ ] Imports aufgeräumt
[ ] Architektur-Regeln eingehalten
[ ] Deutsche UI-Texte verwendet
[ ] Error Handling implementiert
[ ] Keine Teams/Kolonnen implementiert (nicht im MVP!)
[ ] Keine Projekt-Erstellung implementiert (nur Asana-Sync!)
```

---

## 10. Prompt-Template

Nutze dieses Template für JEDEN Prompt:

```markdown
## Kontext
Ich arbeite an planned., einer Kapazitätsplanungs-App für Holzbaubetriebe.
[Was wurde bisher gemacht? Welche Dateien existieren?]

## Tech Stack
- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS + Shadcn/UI
- Supabase (PostgreSQL + Auth + Realtime)
- Vitest + Playwright

## Architektur
Clean Architecture:
- Domain Layer: /src/domain (Entities, keine Abhängigkeiten)
- Application Layer: /src/application (Use Cases, Ports)
- Infrastructure Layer: /src/infrastructure (Repositories, Services)
- Presentation Layer: /src/presentation + /app (Actions, Components)

## Domänen-Regeln
- Allocations sind TAGESBASIERT (ein Eintrag pro Tag)
- PlannedHours werden automatisch aufgeteilt bei Mehrfach-Allocation
- Ressourcen haben KEINE PlannedHours (nur Zuordnung)
- Abwesenheit = Warnung, KEIN Block
- Projekte kommen NUR aus Asana (bidirektional)
- KEINE Teams/Kolonnen (nur Einzelpersonen)

## Aufgabe
[Was soll implementiert werden?]

## TDD Anforderung
Bitte implementiere nach TDD:
1. Schreibe ZUERST die Tests
2. Zeige mir die Tests
3. Führe sie aus (müssen fehlschlagen)
4. Implementiere den Code
5. Tests müssen grün werden

## Erwartetes Ergebnis
[Was soll am Ende existieren?]
```

---

## 11. Schnell-Referenz: Was gehört wohin?

| Ich will... | Gehört in... |
|-------------|--------------|
| PlannedHours berechnen | `domain/services/AllocationCalculator.ts` |
| Allocation validieren | `domain/entities/Allocation.ts` |
| Allocation speichern | `application/use-cases/allocations/CreateAllocationUseCase.ts` |
| Datenbank-Query | `infrastructure/repositories/SupabaseAllocationRepository.ts` |
| API von Asana aufrufen | `infrastructure/services/AsanaService.ts` |
| Server Action | `presentation/actions/allocations.ts` |
| React Component | `presentation/components/` oder `app/` |
| Konstanten (WORK_DAYS_PER_WEEK) | `@/lib/constants.ts` |
| Shared Types | `@/lib/types.ts` |

> **Hinweis:** Der Import-Alias `@/` entspricht `./src/`. Alle Imports sollten mit `@/` beginnen.

---

*Diese Regeln sind VERBINDLICH. Keine Ausnahmen.*

*Version: 2.0*
*Erstellt: 29. Januar 2026*
