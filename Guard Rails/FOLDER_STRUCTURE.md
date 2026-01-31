# planned. – Ordnerstruktur

> Vollständige Projektstruktur für Clean Architecture mit Next.js 15

**Version:** 1.1  
**Datum:** 29. Januar 2026

---

## Übersicht

Diese Struktur folgt den Prinzipien der Clean Architecture mit klarer Schichtentrennung. Jede Schicht hat definierte Abhängigkeitsregeln.

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOMAIN                                  │
│                    (keine Abhängigkeiten)                       │
├─────────────────────────────────────────────────────────────────┤
│                       APPLICATION                               │
│                    (kennt nur Domain)                           │
├─────────────────────────────────────────────────────────────────┤
│          INFRASTRUCTURE              PRESENTATION               │
│        (implementiert Ports)        (nutzt Use Cases)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vollständige Projektstruktur

```
planned./
├── .env.local                    # Lokale Environment Variables (NICHT committen!)
├── .env.example                  # Template für Environment Variables
├── .eslintrc.json               # ESLint Konfiguration
├── .gitignore
├── middleware.ts                 # Next.js Middleware (Auth, Route Protection)
├── next.config.ts               # Next.js Konfiguration
├── package.json
├── tailwind.config.ts           # Tailwind mit Custom Colors
├── tsconfig.json                # TypeScript strict mode
├── vitest.config.ts             # Vitest Konfiguration
├── playwright.config.ts         # Playwright E2E Konfiguration
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│
├── supabase/
│   ├── config.toml              # Supabase CLI Konfiguration
│   ├── seed.sql                 # Testdaten
│   ├── migrations/
│   │   ├── 20260128000000_initial_schema.sql
│   │   ├── 20260128000001_rls_policies.sql
│   │   ├── 20260128000002_triggers.sql
│   │   └── 20260128000003_helper_functions.sql
│   └── functions/
│       └── handle-auth-signup/
│           └── index.ts
│
├── tests/
│   ├── e2e/
│   │   ├── setup/
│   │   │   └── global-setup.ts
│   │   ├── fixtures/
│   │   │   └── seed-data.ts
│   │   ├── .auth/               # Gespeicherte Auth Sessions
│   │   │   └── .gitkeep
│   │   ├── allocations.spec.ts
│   │   ├── auth.spec.ts
│   │   └── projects.spec.ts
│   └── mocks/
│       └── handlers.ts          # MSW Handler
│
└── src/
    │
    ├── domain/                   # ══════════════════════════════════════
    │   │                         # KEINE externen Abhängigkeiten!
    │   │                         # Nur Standard-TypeScript
    │   │                         # ══════════════════════════════════════
    │   │
    │   ├── entities/
    │   │   ├── index.ts                      # Re-exports
    │   │   ├── Allocation.ts
    │   │   ├── Allocation.test.ts
    │   │   ├── Project.ts
    │   │   ├── Project.test.ts
    │   │   ├── ProjectPhase.ts
    │   │   ├── ProjectPhase.test.ts
    │   │   ├── User.ts
    │   │   ├── User.test.ts
    │   │   ├── Resource.ts
    │   │   ├── Resource.test.ts
    │   │   ├── ResourceType.ts
    │   │   ├── Absence.ts
    │   │   ├── Absence.test.ts
    │   │   ├── TimeEntry.ts
    │   │   └── Tenant.ts
    │   │
    │   ├── value-objects/
    │   │   ├── index.ts
    │   │   ├── DateRange.ts
    │   │   ├── DateRange.test.ts
    │   │   ├── PlannedHours.ts
    │   │   ├── PlannedHours.test.ts
    │   │   ├── Email.ts
    │   │   └── Email.test.ts
    │   │
    │   ├── enums/
    │   │   ├── index.ts
    │   │   ├── UserRole.ts
    │   │   ├── ProjectStatus.ts
    │   │   ├── PhaseBereich.ts
    │   │   ├── PhaseStatus.ts
    │   │   ├── AbsenceType.ts
    │   │   └── SyncStatus.ts
    │   │
    │   ├── errors/
    │   │   ├── index.ts
    │   │   ├── DomainError.ts
    │   │   ├── AllocationError.ts
    │   │   ├── ValidationError.ts
    │   │   └── ConflictError.ts
    │   │
    │   └── services/
    │       ├── index.ts
    │       ├── AllocationCalculator.ts
    │       ├── AllocationCalculator.test.ts
    │       ├── AvailabilityChecker.ts
    │       └── AvailabilityChecker.test.ts
    │
    ├── application/              # ══════════════════════════════════════
    │   │                         # Darf NUR @/domain importieren
    │   │                         # ══════════════════════════════════════
    │   │
    │   ├── ports/
    │   │   ├── repositories/
    │   │   │   ├── index.ts
    │   │   │   ├── IAllocationRepository.ts
    │   │   │   ├── IProjectRepository.ts
    │   │   │   ├── IProjectPhaseRepository.ts
    │   │   │   ├── IUserRepository.ts
    │   │   │   ├── IResourceRepository.ts
    │   │   │   ├── IAbsenceRepository.ts
    │   │   │   ├── ITimeEntryRepository.ts
    │   │   │   ├── ITenantRepository.ts
    │   │   │   └── ISyncLogRepository.ts
    │   │   │
    │   │   └── services/
    │   │       ├── index.ts
    │   │       ├── IAsanaService.ts
    │   │       ├── ITimeTacService.ts
    │   │       └── IEncryptionService.ts
    │   │
    │   ├── use-cases/
    │   │   ├── allocations/
    │   │   │   ├── index.ts
    │   │   │   ├── CreateAllocationUseCase.ts
    │   │   │   ├── DeleteAllocationUseCase.ts
    │   │   │   ├── MoveAllocationUseCase.ts
    │   │   │   ├── GetAllocationsForWeekUseCase.ts
    │   │   │   ├── CreateAllocationsRangeUseCase.ts
    │   │   │   └── __tests__/
    │   │   │       ├── CreateAllocationUseCase.test.ts
    │   │   │       ├── DeleteAllocationUseCase.test.ts
    │   │   │       └── GetAllocationsForWeekUseCase.test.ts
    │   │   │
    │   │   ├── projects/
    │   │   │   ├── index.ts
    │   │   │   ├── GetProjectsUseCase.ts
    │   │   │   ├── GetProjectDetailsUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   ├── phases/
    │   │   │   ├── index.ts
    │   │   │   ├── UpdatePhaseDatesUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   ├── users/
    │   │   │   ├── index.ts
    │   │   │   ├── CreateUserUseCase.ts
    │   │   │   ├── UpdateUserUseCase.ts
    │   │   │   ├── DeactivateUserUseCase.ts
    │   │   │   ├── GetUsersUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   ├── resources/
    │   │   │   ├── index.ts
    │   │   │   ├── CreateResourceUseCase.ts
    │   │   │   ├── UpdateResourceUseCase.ts
    │   │   │   ├── GetResourcesUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   ├── absences/
    │   │   │   ├── index.ts
    │   │   │   ├── GetAbsencesForWeekUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   ├── auth/
    │   │   │   ├── index.ts
    │   │   │   ├── GetCurrentUserUseCase.ts
    │   │   │   ├── ChangePasswordUseCase.ts
    │   │   │   └── __tests__/
    │   │   │
    │   │   └── sync/
    │   │       ├── index.ts
    │   │       ├── SyncAsanaProjectsUseCase.ts
    │   │       ├── SyncTimeTacAbsencesUseCase.ts
    │   │       ├── SyncTimeTacTimeEntriesUseCase.ts
    │   │       └── __tests__/
    │   │
    │   └── dtos/
    │       ├── index.ts
    │       ├── AllocationDTO.ts
    │       ├── ProjectDTO.ts
    │       ├── ProjectPhaseDTO.ts
    │       ├── UserDTO.ts
    │       ├── ResourceDTO.ts
    │       └── AbsenceDTO.ts
    │
    ├── infrastructure/           # ══════════════════════════════════════
    │   │                         # Implementiert Ports aus Application
    │   │                         # Darf @/domain und @/application/ports
    │   │                         # ══════════════════════════════════════
    │   │
    │   ├── supabase/
    │   │   ├── client.ts                     # Browser Client
    │   │   ├── server.ts                     # Server Components Client
    │   │   ├── actions.ts                    # Server Actions Client
    │   │   ├── admin.ts                      # Service Role Client (Admin)
    │   │   └── middleware.ts                 # Middleware Client
    │   │
    │   ├── repositories/
    │   │   ├── index.ts
    │   │   ├── SupabaseAllocationRepository.ts
    │   │   ├── SupabaseProjectRepository.ts
    │   │   ├── SupabaseProjectPhaseRepository.ts
    │   │   ├── SupabaseUserRepository.ts
    │   │   ├── SupabaseResourceRepository.ts
    │   │   ├── SupabaseAbsenceRepository.ts
    │   │   ├── SupabaseTimeEntryRepository.ts
    │   │   ├── SupabaseTenantRepository.ts
    │   │   ├── SupabaseSyncLogRepository.ts
    │   │   └── SupabaseIntegrationCredentialsRepository.ts
    │   │
    │   ├── services/
    │   │   ├── index.ts
    │   │   ├── AsanaAuthService.ts
    │   │   ├── AsanaSyncService.ts
    │   │   ├── AsanaWebhookService.ts
    │   │   ├── TimeTacService.ts
    │   │   └── EncryptionService.ts
    │   │
    │   ├── mappers/
    │   │   ├── index.ts
    │   │   ├── AllocationMapper.ts
    │   │   ├── ProjectMapper.ts
    │   │   ├── UserMapper.ts
    │   │   └── ResourceMapper.ts
    │   │
    │   └── container/
    │       └── index.ts                      # Dependency Injection Container
    │
    ├── presentation/             # ══════════════════════════════════════
    │   │                         # UI-Logik, Server Actions, Hooks
    │   │                         # Darf alle Layer importieren
    │   │                         # ══════════════════════════════════════
    │   │
    │   ├── actions/
    │   │   ├── utils/
    │   │   │   └── withActionHandler.ts      # Wrapper für Auth/Validation
    │   │   ├── allocations.ts
    │   │   ├── projects.ts
    │   │   ├── phases.ts
    │   │   ├── users.ts
    │   │   ├── resources.ts
    │   │   ├── auth.ts
    │   │   ├── settings.ts
    │   │   └── integrations/
    │   │       ├── asana.ts
    │   │       └── timetac.ts
    │   │
    │   ├── hooks/
    │   │   ├── useAllocations.ts
    │   │   ├── useProjects.ts
    │   │   ├── useUsers.ts
    │   │   ├── useResources.ts
    │   │   ├── useAbsences.ts
    │   │   ├── useCurrentUser.ts
    │   │   ├── useRealtimeAllocations.ts
    │   │   ├── useRealtimeAbsences.ts
    │   │   └── useActionHandler.ts           # Client-Side Error Handling
    │   │
    │   ├── store/
    │   │   ├── planningStore.ts              # Zustand Store für UI State
    │   │   └── uiStore.ts                    # Sidebar, Modals, etc.
    │   │
    │   └── components/
    │       ├── ui/                           # Shadcn/UI Basis-Komponenten
    │       │   ├── button.tsx
    │       │   ├── dialog.tsx
    │       │   ├── dropdown-menu.tsx
    │       │   ├── form.tsx
    │       │   ├── input.tsx
    │       │   ├── select.tsx
    │       │   ├── table.tsx
    │       │   ├── toast.tsx
    │       │   ├── toaster.tsx
    │       │   └── ...
    │       │
    │       ├── layout/
    │       │   ├── AppShell.tsx
    │       │   ├── Sidebar.tsx
    │       │   ├── Header.tsx
    │       │   ├── SkipLinks.tsx
    │       │   └── UserNav.tsx
    │       │
    │       ├── planning/
    │       │   ├── PlanningGrid.tsx
    │       │   ├── PlanningHeader.tsx
    │       │   ├── ProjectRow.tsx
    │       │   ├── PhaseRow.tsx
    │       │   ├── GridCell.tsx
    │       │   ├── AllocationChip.tsx
    │       │   ├── AllocationPopover.tsx
    │       │   ├── WeekNavigator.tsx
    │       │   ├── FilterPanel.tsx
    │       │   └── DateHeader.tsx
    │       │
    │       ├── resource-pool/
    │       │   ├── ResourcePool.tsx
    │       │   ├── ResourceCard.tsx
    │       │   ├── AvailabilityIndicator.tsx
    │       │   └── ResourceSearch.tsx
    │       │
    │       ├── dashboard/
    │       │   ├── KPICards.tsx
    │       │   ├── AlertsList.tsx
    │       │   ├── SyncStatus.tsx
    │       │   └── QuickActions.tsx
    │       │
    │       ├── projects/
    │       │   ├── ProjectList.tsx
    │       │   ├── ProjectCard.tsx
    │       │   └── PhaseDetails.tsx
    │       │
    │       ├── users/
    │       │   ├── UserList.tsx
    │       │   ├── UserForm.tsx
    │       │   └── UserCard.tsx
    │       │
    │       ├── resources/
    │       │   ├── ResourceList.tsx
    │       │   ├── ResourceForm.tsx
    │       │   └── ResourceTypeManager.tsx
    │       │
    │       ├── settings/
    │       │   ├── IntegrationStatus.tsx
    │       │   ├── AsanaOnboarding.tsx
    │       │   ├── TimeTacSetup.tsx
    │       │   ├── UserMapping.tsx
    │       │   └── TenantSettings.tsx
    │       │
    │       ├── mobile/
    │       │   ├── MobileShell.tsx
    │       │   ├── MobileNavigation.tsx
    │       │   ├── MobileAllocationCard.tsx
    │       │   └── MobileWeekView.tsx
    │       │
    │       ├── feedback/
    │       │   ├── LoadingSpinner.tsx
    │       │   ├── Skeleton.tsx
    │       │   ├── EmptyState.tsx
    │       │   └── ScreenReaderAnnounce.tsx
    │       │
    │       └── shared/
    │           ├── Avatar.tsx
    │           ├── Badge.tsx
    │           ├── BereichBadge.tsx
    │           ├── StatusBadge.tsx
    │           ├── ConfirmDialog.tsx
    │           └── FormField.tsx
    │
    ├── app/                      # ══════════════════════════════════════
    │   │                         # Next.js App Router
    │   │                         # Nur Page-Komponenten und Layouts
    │   │                         # ══════════════════════════════════════
    │   │
    │   ├── layout.tsx                        # Root Layout
    │   ├── providers.tsx                     # React Query, Zustand
    │   ├── error.tsx                         # Global Error Boundary
    │   ├── not-found.tsx                     # 404 Page
    │   ├── loading.tsx                       # Global Loading
    │   │
    │   ├── (auth)/
    │   │   ├── layout.tsx                    # Auth Layout (zentriert)
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   ├── reset-password/
    │   │   │   └── page.tsx
    │   │   └── update-password/
    │   │       └── page.tsx
    │   │
    │   ├── (dashboard)/
    │   │   ├── layout.tsx                    # Dashboard Layout (Sidebar)
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── planung/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── projekte/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── [id]/
    │   │   │       └── page.tsx
    │   │   ├── ressourcen/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── mitarbeiter/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   └── einstellungen/
    │   │       ├── page.tsx
    │   │       ├── loading.tsx
    │   │       ├── integrationen/
    │   │       │   ├── page.tsx
    │   │       │   ├── asana/
    │   │       │   │   └── page.tsx
    │   │       │   └── timetac/
    │   │       │       └── page.tsx
    │   │       └── profil/
    │   │           └── page.tsx
    │   │
    │   ├── (mobile)/
    │   │   ├── layout.tsx                    # Mobile Layout
    │   │   └── meine-woche/
    │   │       ├── page.tsx
    │   │       └── loading.tsx
    │   │
    │   └── api/
    │       ├── auth/
    │       │   └── asana/
    │       │       └── callback/
    │       │           └── route.ts          # Asana OAuth Callback
    │       ├── webhooks/
    │       │   └── asana/
    │       │       └── route.ts              # Asana Webhook Handler
    │       └── cron/
    │           ├── refresh-asana-tokens/
    │           │   └── route.ts
    │           ├── sync-timetac-absences/
    │           │   └── route.ts
    │           ├── sync-timetac-hours/
    │           │   └── route.ts
    │           ├── sync-asana/
    │           │   └── route.ts
    │           └── cleanup-sync-logs/
    │               └── route.ts
    │
    └── lib/                      # ══════════════════════════════════════
        │                         # Shared Utilities
        │                         # Keine Business-Logik!
        │                         # ══════════════════════════════════════
        │
        ├── constants.ts                      # WORK_DAYS_PER_WEEK, etc.
        ├── types.ts                          # Shared TypeScript Types
        ├── utils.ts                          # cn(), formatDate(), etc.
        ├── action-result.ts                  # ActionResult Pattern
        ├── validations.ts                    # Zod Schemas
        ├── env.ts                            # Environment Validation
        ├── encryption.ts                     # Encrypt/Decrypt Tokens
        ├── database.types.ts                 # Supabase Generated Types
        └── keyboard.ts                       # Keyboard Shortcuts
```

---

## Import-Regeln (Enforcement via ESLint)

### Domain Layer
```typescript
// ✅ ERLAUBT
import { UserRole } from './enums/UserRole';
import { PlannedHours } from './value-objects/PlannedHours';

// ❌ VERBOTEN
import { supabase } from '@/infrastructure/supabase/client';  // NEIN!
import { useAllocations } from '@/presentation/hooks';        // NEIN!
```

### Application Layer
```typescript
// ✅ ERLAUBT
import { Allocation } from '@/domain/entities';
import { IAllocationRepository } from './ports/repositories';

// ❌ VERBOTEN
import { SupabaseAllocationRepository } from '@/infrastructure';  // NEIN!
import { PlanningGrid } from '@/presentation/components';         // NEIN!
```

### Infrastructure Layer
```typescript
// ✅ ERLAUBT
import { Allocation } from '@/domain/entities';
import { IAllocationRepository } from '@/application/ports/repositories';
import { createClient } from '@/infrastructure/supabase/server';

// ❌ VERBOTEN
import { CreateAllocationUseCase } from '@/application/use-cases';  // NEIN!
import { PlanningGrid } from '@/presentation/components';           // NEIN!
```

### Presentation Layer
```typescript
// ✅ ERLAUBT
import { UserRole } from '@/domain/enums';                          // Nur Types!
import { CreateAllocationUseCase } from '@/application/use-cases';
import { container } from '@/infrastructure/container';
import { PlanningGrid } from './components/planning';

// ❌ VERBOTEN
import { SupabaseAllocationRepository } from '@/infrastructure';    // Use container!
```

---

## ESLint Import-Boundaries Konfiguration

```javascript
// .eslintrc.json (Auszug)
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          // Domain darf nichts importieren
          {
            "target": "./src/domain",
            "from": "./src/application"
          },
          {
            "target": "./src/domain",
            "from": "./src/infrastructure"
          },
          {
            "target": "./src/domain",
            "from": "./src/presentation"
          },
          // Application darf nur Domain
          {
            "target": "./src/application",
            "from": "./src/infrastructure"
          },
          {
            "target": "./src/application",
            "from": "./src/presentation"
          }
        ]
      }
    ]
  }
}
```

---

## Datei-Naming Conventions

| Typ | Konvention | Beispiel |
|-----|------------|----------|
| **Entity** | PascalCase | `Allocation.ts` |
| **Use Case** | PascalCase + UseCase | `CreateAllocationUseCase.ts` |
| **Repository Interface** | I + PascalCase | `IAllocationRepository.ts` |
| **Repository Impl** | Supabase + PascalCase | `SupabaseAllocationRepository.ts` |
| **Component** | PascalCase | `PlanningGrid.tsx` |
| **Hook** | use + PascalCase | `useAllocations.ts` |
| **Server Action** | camelCase (Datei) | `allocations.ts` |
| **Test** | Original + .test | `Allocation.test.ts` |
| **Page** | page.tsx | `app/planung/page.tsx` |

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial - Vollständige Projektstruktur für Antigravity |
| 1.1 | Januar 2026 | **Rebranding: "bänk" → "planned."** |

---

*Version: 1.1 für Antigravity*  
*Erstellt: 29. Januar 2026*
