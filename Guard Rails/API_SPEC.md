# planned. – API Spezifikation

> Server Actions, Endpoints & Request/Response Formate

**Version:** 1.5
**Datum:** 29. Januar 2026

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#architektur-übersicht)
2. [Environment Validation](#environment-validation)
3. [Supabase Client Setup](#supabase-client-setup)
4. [Dependency Injection Container](#dependency-injection-container)
5. [ActionResult Pattern](#actionresult-pattern)
6. [Error Handling Strategie](#error-handling-strategie)
7. [Error Codes Katalog](#error-codes-katalog)
8. [Server Actions](#server-actions)
9. [External APIs](#external-apis)
10. [Webhook Endpoints](#webhook-endpoints)
11. [Realtime Subscriptions](#realtime-subscriptions)
12. [React Query Provider Setup](#react-query-provider-setup)
13. [State Management](#state-management)
14. [Validation Schemas](#validation-schemas-zod)
15. [UI-spezifische TypeScript Types](#ui-spezifische-typescript-types)
16. [Rate Limiting](#rate-limiting)
17. [Encryption Utility](#encryption-utility)

---

## Architektur-Übersicht

planned. nutzt **Next.js Server Actions** als primäre API-Schicht. Externe Integrationen (Asana, TimeTac) werden über dedizierte Services abgewickelt.

```
+-------------------------------------------------------------------+
|  CLIENT (React Components)                                        |
|                                                                   |
|  +-- Ruft Server Actions auf                                      |
|  +-- Subscribt zu Realtime Channels                               |
+--------------------------------+----------------------------------+
                                 |
+--------------------------------v----------------------------------+
|  SERVER ACTIONS (src/presentation/actions/)                       |
|                                                                   |
|  +-- Validiert Input (Zod)                                        |
|  +-- Prüft Authentifizierung & Autorisierung                      |
|  +-- Ruft Use Cases auf (via DI Container)                        |
|  +-- Formatiert Response (ActionResult)                           |
+--------------------------------+----------------------------------+
                                 |
+--------------------------------v----------------------------------+
|  USE CASES (src/application/use-cases/)                           |
|                                                                   |
|  +-- Business-Logik                                               |
|  +-- Ruft Repositories/Services auf (via Ports)                   |
|  +-- Orchestriert Transaktionen                                   |
+--------------------------------+----------------------------------+
                                 |
     +---------------------------+---------------------------+
     v                                                       v
+--------------------+                    +------------------------+
|  REPOSITORIES      |                    |  EXTERNAL SERVICES     |
|  (Supabase)        |                    |  (Asana, TimeTac)      |
+--------------------+                    +------------------------+
```

---

## Environment Validation

Alle Environment Variables werden beim Start validiert. Fehlende oder ungültige Werte führen zu einem sofortigen Abbruch.

```typescript
// src/lib/env.ts

import { z } from 'zod';

/**
 * Environment Variable Schema
 * 
 * Validiert alle erforderlichen Umgebungsvariablen beim App-Start.
 * Bei fehlenden/ungültigen Werten wird ein aussagekräftiger Fehler geworfen.
 */
const envSchema = z.object({
  // ===============================================================
  // SUPABASE (Required)
  // ===============================================================
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL muss eine gültige URL sein'),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY ist erforderlich'),
  
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY ist erforderlich'),
  
  // ===============================================================
  // APP
  // ===============================================================
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  
  // ===============================================================
  // ASANA INTEGRATION (Optional in Dev)
  // ===============================================================
  ASANA_CLIENT_ID: z
    .string()
    .min(1)
    .optional(),
  
  ASANA_CLIENT_SECRET: z
    .string()
    .min(1)
    .optional(),
  
  ASANA_REDIRECT_URI: z
    .string()
    .url()
    .optional(),
  
  // ===============================================================
  // SECURITY
  // ===============================================================
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY muss mindestens 32 Zeichen haben (Base64)')
    .optional(),
  
  // ===============================================================
  // CRON JOBS (Vercel)
  // ===============================================================
  CRON_SECRET: z
    .string()
    .min(16)
    .optional(),
  
  // ===============================================================
  // ERROR TRACKING (Optional)
  // ===============================================================
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .url()
    .optional(),
});

// ===========================================================================
// VALIDATION & EXPORT
// ===========================================================================

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('Œ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
}

/**
 * Validated environment variables.
 * Import this instead of using process.env directly.
 * 
 * @example
 * import { env } from '@/lib/env';
 * const url = env.NEXT_PUBLIC_SUPABASE_URL;
 */
export const env = validateEnv();

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if Asana integration is configured
 */
export const isAsanaConfigured = !!(
  env.ASANA_CLIENT_ID && 
  env.ASANA_CLIENT_SECRET && 
  env.ASANA_REDIRECT_URI
);

/**
 * Check if encryption is configured
 */
export const isEncryptionConfigured = !!env.ENCRYPTION_KEY;
```

**.env.example:**

```bash
# ===========================================================================
# planned. Environment Variables
# ===========================================================================

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Asana Integration (Optional for development)
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=
ASANA_REDIRECT_URI=http://localhost:3000/api/auth/asana/callback

# Security (Required for production)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=

# Cron Jobs (Vercel)
CRON_SECRET=

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Supabase Client Setup

Verschiedene Supabase Clients für verschiedene Kontexte:

### Server Components Client

```typescript
// src/infrastructure/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Supabase Client für Server Components.
 * 
 * Verwendung:
 * - Server Components (async)
 * - Route Handlers
 * - Server Actions (Alternative zu actions.ts)
 * 
 * @example
 * // In einem Server Component
 * const supabase = await createServerSupabaseClient();
 * const { data } = await supabase.from('users').select('*');
 */
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
            // Ignore errors in Server Components (read-only)
          }
        },
      },
    }
  );
}

/**
 * Helper: Get current authenticated user
 */
export async function getAuthUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Helper: Get current app user with tenant
 */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    return null;
  }
  
  const { data: appUser, error: userError } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('auth_id', authUser.id)
    .single();
  
  if (userError || !appUser) {
    return null;
  }
  
  return appUser;
}
```

### Client Components Client

```typescript
// src/infrastructure/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Supabase Client für Client Components.
 * 
 * Verwendung:
 * - Client Components ('use client')
 * - Hooks
 * - Event Handlers
 * 
 * @example
 * // In einem Client Component
 * const supabase = createClientSupabaseClient();
 * const channel = supabase.channel('allocations');
 */
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Singleton für Client-Side (um mehrere Instanzen zu vermeiden)
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getClientSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClientSupabaseClient();
  }
  return clientInstance;
}
```

### Server Actions Client

```typescript
// src/infrastructure/supabase/actions.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Supabase Client für Server Actions.
 * 
 * Kann Cookies setzen (im Gegensatz zu Server Components).
 * 
 * @example
 * // In einer Server Action
 * 'use server';
 * const supabase = await createActionSupabaseClient();
 * const { data } = await supabase.from('allocations').insert(...);
 */
export async function createActionSupabaseClient() {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### Admin Client (Service Role)

```typescript
// src/infrastructure/supabase/admin.ts

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Supabase Admin Client mit Service Role Key.
 * 
 * š ï¸ ACHTUNG: Umgeht RLS! Nur für Admin-Operationen verwenden:
 * - User erstellen/löschen
 * - Cron Jobs
 * - Migrations
 * 
 * @example
 * // In einem Cron Job
 * const supabase = createAdminSupabaseClient();
 * await supabase.auth.admin.createUser({ ... });
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Client Usage Summary

| Context | Client | Cookies | RLS |
|---------|--------|---------|-----|
| Server Components | `createServerSupabaseClient()` | Read-only | [OK] |
| Client Components | `createClientSupabaseClient()` | Browser | [OK] |
| Server Actions | `createActionSupabaseClient()` | Read/Write | [OK] |
| Admin Operations | `createAdminSupabaseClient()` | None | Œ Bypassed |

---

## Dependency Injection Container

Der DI Container verbindet Interfaces (Ports) mit konkreten Implementierungen.

```typescript
// src/infrastructure/container/index.ts

import { env } from '@/lib/env';

// Ports (Interfaces)
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectRepository } from '@/application/ports/repositories/IProjectRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { IResourceRepository } from '@/application/ports/repositories/IResourceRepository';
import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { ITimeEntryRepository } from '@/application/ports/repositories/ITimeEntryRepository';
import type { ITenantRepository } from '@/application/ports/repositories/ITenantRepository';
import type { ISyncLogRepository } from '@/application/ports/repositories/ISyncLogRepository';
import type { IIntegrationCredentialsRepository } from '@/application/ports/repositories/IIntegrationCredentialsRepository';

import type { IAsanaService } from '@/application/ports/services/IAsanaService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

// Implementations
import { SupabaseAllocationRepository } from '../repositories/SupabaseAllocationRepository';
import { SupabaseProjectRepository } from '../repositories/SupabaseProjectRepository';
import { SupabaseProjectPhaseRepository } from '../repositories/SupabaseProjectPhaseRepository';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { SupabaseResourceRepository } from '../repositories/SupabaseResourceRepository';
import { SupabaseAbsenceRepository } from '../repositories/SupabaseAbsenceRepository';
import { SupabaseTimeEntryRepository } from '../repositories/SupabaseTimeEntryRepository';
import { SupabaseTenantRepository } from '../repositories/SupabaseTenantRepository';
import { SupabaseSyncLogRepository } from '../repositories/SupabaseSyncLogRepository';
import { SupabaseIntegrationCredentialsRepository } from '../repositories/SupabaseIntegrationCredentialsRepository';

import { AsanaSyncService } from '../services/AsanaSyncService';
import { TimeTacService } from '../services/TimeTacService';
import { EncryptionService } from '../services/EncryptionService';

// ===========================================================================
// CONTAINER INTERFACE
// ===========================================================================

export interface Container {
  // Repositories
  allocationRepository: IAllocationRepository;
  projectRepository: IProjectRepository;
  projectPhaseRepository: IProjectPhaseRepository;
  userRepository: IUserRepository;
  resourceRepository: IResourceRepository;
  absenceRepository: IAbsenceRepository;
  timeEntryRepository: ITimeEntryRepository;
  tenantRepository: ITenantRepository;
  syncLogRepository: ISyncLogRepository;
  integrationCredentialsRepository: IIntegrationCredentialsRepository;
  
  // Services
  asanaService: IAsanaService;
  timeTacService: ITimeTacService;
  encryptionService: IEncryptionService;
}

// ===========================================================================
// CONTAINER SINGLETON
// ===========================================================================

let containerInstance: Container | null = null;

/**
 * Creates or returns the DI container singleton.
 * 
 * @example
 * import { getContainer } from '@/infrastructure/container';
 * 
 * const container = getContainer();
 * const allocations = await container.allocationRepository.findByWeek(tenantId, weekStart);
 */
export function getContainer(): Container {
  if (!containerInstance) {
    // Initialize services first (some repos might depend on them)
    const encryptionService = new EncryptionService(env.ENCRYPTION_KEY);
    
    containerInstance = {
      // Repositories
      allocationRepository: new SupabaseAllocationRepository(),
      projectRepository: new SupabaseProjectRepository(),
      projectPhaseRepository: new SupabaseProjectPhaseRepository(),
      userRepository: new SupabaseUserRepository(),
      resourceRepository: new SupabaseResourceRepository(),
      absenceRepository: new SupabaseAbsenceRepository(),
      timeEntryRepository: new SupabaseTimeEntryRepository(),
      tenantRepository: new SupabaseTenantRepository(),
      syncLogRepository: new SupabaseSyncLogRepository(),
      integrationCredentialsRepository: new SupabaseIntegrationCredentialsRepository(encryptionService),
      
      // Services
      encryptionService,
      asanaService: new AsanaSyncService(encryptionService),
      timeTacService: new TimeTacService(encryptionService),
    };
  }
  
  return containerInstance;
}

/**
 * Reset container (for testing)
 */
export function resetContainer(): void {
  containerInstance = null;
}

// ===========================================================================
// CONVENIENCE EXPORTS
// ===========================================================================

// For direct access in Use Cases
export const container = {
  get allocationRepository() { return getContainer().allocationRepository; },
  get projectRepository() { return getContainer().projectRepository; },
  get projectPhaseRepository() { return getContainer().projectPhaseRepository; },
  get userRepository() { return getContainer().userRepository; },
  get resourceRepository() { return getContainer().resourceRepository; },
  get absenceRepository() { return getContainer().absenceRepository; },
  get timeEntryRepository() { return getContainer().timeEntryRepository; },
  get tenantRepository() { return getContainer().tenantRepository; },
  get syncLogRepository() { return getContainer().syncLogRepository; },
  get integrationCredentialsRepository() { return getContainer().integrationCredentialsRepository; },
  get asanaService() { return getContainer().asanaService; },
  get timeTacService() { return getContainer().timeTacService; },
  get encryptionService() { return getContainer().encryptionService; },
};
```

### Usage in Use Cases

```typescript
// src/application/use-cases/allocations/CreateAllocationUseCase.ts

import { container } from '@/infrastructure/container';
import type { Allocation } from '@/domain/entities';
import type { CreateAllocationDTO } from '@/application/dtos';
import { AllocationError } from '@/domain/errors';

export class CreateAllocationUseCase {
  async execute(dto: CreateAllocationDTO, tenantId: string): Promise<Allocation> {
    const { allocationRepository, absenceRepository, userRepository } = container;
    
    // 1. Validate user exists and is active
    if (dto.userId) {
      const user = await userRepository.findById(dto.userId, tenantId);
      if (!user || !user.isActive) {
        throw new AllocationError('USER_NOT_FOUND', 'Mitarbeiter nicht gefunden');
      }
      
      // 2. Check for absences
      const absences = await absenceRepository.findByUserAndDate(
        dto.userId, 
        dto.date, 
        tenantId
      );
      
      if (absences.length > 0) {
        // Still create, but flag as warning
        dto.hasAbsenceWarning = true;
      }
    }
    
    // 3. Create allocation
    const allocation = await allocationRepository.create(dto, tenantId);
    
    return allocation;
  }
}
```

---

## ActionResult Pattern

Alle Server Actions geben ein typisiertes `ActionResult<T>` zurück.

```typescript
// src/lib/action-result.ts

/**
 * Standardisiertes Result-Pattern für alle Server Actions.
 * Ermöglicht typsichere Fehlerbehandlung ohne try/catch im Client.
 */
export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ActionError };

export interface ActionError {
  code: ErrorCode;           // Maschinenlesbarer Error-Code
  message: string;           // Benutzerfreundliche Nachricht (deutsch)
  details?: ErrorDetails;    // Zusätzliche Informationen
  timestamp: string;         // ISO-8601 Timestamp
  requestId?: string;        // Für Support/Debugging
}

export interface ErrorDetails {
  field?: string;            // Bei Validation: betroffenes Feld
  value?: unknown;           // Der ungültige Wert
  constraint?: string;       // Die verletzte Regel
  resourceType?: string;     // z.B. "allocation", "user"
  resourceId?: string;       // ID der betroffenen Ressource
  conflictWith?: string;     // Bei Konflikten: ID der kollidierenden Ressource
  retryable?: boolean;       // Kann der Request wiederholt werden?
  retryAfterMs?: number;     // Wenn ja, nach wie vielen ms?
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Create a success result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<T>(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails
): ActionResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}

/**
 * Create an error result from an exception
 */
export function fromException<T>(error: unknown): ActionResult<T> {
  if (error instanceof DomainError) {
    return failure(error.code, error.message, error.details);
  }
  
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    return failure(
      'VALIDATION_ERROR',
      firstError?.message ?? 'Validierungsfehler',
      {
        field: firstError?.path.join('.'),
        constraint: firstError?.code,
      }
    );
  }
  
  // Unknown error
  console.error('Unexpected error:', error);
  return failure(
    'INTERNAL_ERROR',
    'Ein unerwarteter Fehler ist aufgetreten',
    { retryable: true }
  );
}
```

---

## Error Handling Strategie

### Domain Errors

```typescript
// src/domain/errors/DomainError.ts

import type { ErrorCode, ErrorDetails } from '@/lib/action-result';

/**
 * Base class for all domain errors.
 * Thrown in domain layer, caught in presentation layer.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly details?: ErrorDetails;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

```typescript
// src/domain/errors/AllocationError.ts

import { DomainError } from './DomainError';
import type { ErrorCode, ErrorDetails } from '@/lib/action-result';

export class AllocationError extends DomainError {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;
  
  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.code = code;
    this.details = details;
  }
  
  // Factory methods
  static userNotFound(userId: string): AllocationError {
    return new AllocationError(
      'USER_NOT_FOUND',
      'Mitarbeiter nicht gefunden',
      { resourceType: 'user', resourceId: userId }
    );
  }
  
  static phaseNotFound(phaseId: string): AllocationError {
    return new AllocationError(
      'PHASE_NOT_FOUND',
      'Projektphase nicht gefunden',
      { resourceType: 'project_phase', resourceId: phaseId }
    );
  }
  
  static alreadyExists(date: string, phaseId: string): AllocationError {
    return new AllocationError(
      'ALLOCATION_ALREADY_EXISTS',
      'Diese Zuweisung existiert bereits',
      { field: 'date', value: date, conflictWith: phaseId }
    );
  }
}
```

### Error Codes Katalog (Auszug)

```typescript
// src/lib/error-codes.ts

export type ErrorCode =
  // Auth (1xx)
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  
  // Validation (2xx)
  | 'VALIDATION_ERROR'
  | 'INVALID_DATE'
  | 'INVALID_DATE_RANGE'
  | 'INVALID_UUID'
  
  // Resource (3xx)
  | 'NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'PROJECT_NOT_FOUND'
  | 'PHASE_NOT_FOUND'
  | 'ALLOCATION_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  
  // Conflict (4xx)
  | 'ALLOCATION_ALREADY_EXISTS'
  | 'USER_ALREADY_EXISTS'
  | 'CONCURRENT_MODIFICATION'
  
  // Business Logic (5xx)
  | 'USER_INACTIVE'
  | 'USER_HAS_ABSENCE'
  | 'PHASE_OUTSIDE_PROJECT_DATES'
  
  // External Services (6xx)
  | 'ASANA_ERROR'
  | 'ASANA_RATE_LIMIT'
  | 'ASANA_NOT_CONNECTED'
  | 'TIMETAC_ERROR'
  | 'TIMETAC_NOT_CONNECTED'

  // Rate Limiting (7xx)
  | 'RATE_LIMIT_EXCEEDED'

  // Internal (9xx)
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Nicht autorisiert',
  FORBIDDEN: 'Keine Berechtigung',
  SESSION_EXPIRED: 'Sitzung abgelaufen',
  INVALID_CREDENTIALS: 'Ungültige Anmeldedaten',
  VALIDATION_ERROR: 'Validierungsfehler',
  INVALID_DATE: 'Ungültiges Datum',
  INVALID_DATE_RANGE: 'Ungültiger Datumsbereich',
  INVALID_UUID: 'Ungültige ID',
  NOT_FOUND: 'Nicht gefunden',
  USER_NOT_FOUND: 'Mitarbeiter nicht gefunden',
  PROJECT_NOT_FOUND: 'Projekt nicht gefunden',
  PHASE_NOT_FOUND: 'Projektphase nicht gefunden',
  ALLOCATION_NOT_FOUND: 'Zuweisung nicht gefunden',
  RESOURCE_NOT_FOUND: 'Ressource nicht gefunden',
  ALLOCATION_ALREADY_EXISTS: 'Diese Zuweisung existiert bereits',
  USER_ALREADY_EXISTS: 'Ein Benutzer mit dieser E-Mail existiert bereits',
  CONCURRENT_MODIFICATION: 'Der Datensatz wurde zwischenzeitlich geändert',
  USER_INACTIVE: 'Mitarbeiter ist deaktiviert',
  USER_HAS_ABSENCE: 'Mitarbeiter hat an diesem Tag eine Abwesenheit',
  PHASE_OUTSIDE_PROJECT_DATES: 'Phase liegt außerhalb des Projektzeitraums',
  ASANA_ERROR: 'Asana-Fehler',
  ASANA_RATE_LIMIT: 'Asana-Rate-Limit erreicht',
  ASANA_NOT_CONNECTED: 'Asana ist nicht verbunden',
  TIMETAC_ERROR: 'TimeTac-Fehler',
  TIMETAC_NOT_CONNECTED: 'TimeTac ist nicht verbunden',
  RATE_LIMIT_EXCEEDED: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
  INTERNAL_ERROR: 'Ein unerwarteter Fehler ist aufgetreten',
  DATABASE_ERROR: 'Datenbankfehler',
};
```

---

## React Query Provider Setup

```typescript
// src/app/providers.tsx

'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Query Client Configuration
 * 
 * - staleTime: 30s - Data is considered fresh for 30 seconds
 * - gcTime: 5min - Unused data is garbage collected after 5 minutes
 * - retry: 1 - Retry failed requests once
 * - refetchOnWindowFocus: true - Refetch when window regains focus
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

// Singleton for browser
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => getQueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

### Root Layout Integration

```typescript
// src/app/layout.tsx

import { Providers } from './providers';
import { Toaster } from '@/presentation/components/ui/toaster';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

---

## Realtime Subscriptions

### Channel Configuration

```typescript
// src/lib/realtime-channels.ts

/**
 * Realtime Channel-Namen und Filter für Supabase Realtime.
 * Alle Channels sind tenant-isoliert via RLS.
 */
export const REALTIME_CHANNELS = {
  /**
   * Allocations Channel
   * Events: INSERT, UPDATE, DELETE
   * Filter: tenant_id
   */
  allocations: (tenantId: string) => ({
    channel: `allocations:tenant_id=eq.${tenantId}`,
    table: 'allocations',
    filter: `tenant_id=eq.${tenantId}`,
  }),

  /**
   * Projects Channel
   * Events: INSERT, UPDATE, DELETE
   * Filter: tenant_id
   */
  projects: (tenantId: string) => ({
    channel: `projects:tenant_id=eq.${tenantId}`,
    table: 'projects',
    filter: `tenant_id=eq.${tenantId}`,
  }),

  /**
   * Project Phases Channel
   * Events: UPDATE (für actual_hours Änderungen)
   * Filter: via projects.tenant_id (JOIN)
   */
  projectPhases: (tenantId: string) => ({
    channel: `project_phases:tenant_id=eq.${tenantId}`,
    table: 'project_phases',
    // Filter über das Projekt
    schema: 'public',
  }),

  /**
   * Absences Channel
   * Events: INSERT, UPDATE, DELETE
   * Filter: tenant_id
   */
  absences: (tenantId: string) => ({
    channel: `absences:tenant_id=eq.${tenantId}`,
    table: 'absences',
    filter: `tenant_id=eq.${tenantId}`,
  }),

  /**
   * Users Channel (nur für Admins)
   * Events: UPDATE (weekly_hours, is_active Änderungen)
   * Filter: tenant_id
   */
  users: (tenantId: string) => ({
    channel: `users:tenant_id=eq.${tenantId}`,
    table: 'users',
    filter: `tenant_id=eq.${tenantId}`,
  }),
};

/**
 * Broadcast-Channel für optimistische Updates.
 * Sendet Client-zu-Client Events ohne DB-Persistenz.
 */
export const BROADCAST_CHANNELS = {
  /**
   * Drag-Operation Channel
   * Events: drag_start, drag_end
   * Payload: { userId, phaseId, date }
   */
  dragOperation: (tenantId: string) => `drag:${tenantId}`,
};
```

### Realtime Allocations Hook

```typescript
// src/presentation/hooks/useRealtimeAllocations.ts

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getClientSupabaseClient } from '@/infrastructure/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type AllocationRow = Database['public']['Tables']['allocations']['Row'];
type AllocationPayload = RealtimePostgresChangesPayload<AllocationRow>;

interface UseRealtimeAllocationsOptions {
  weekStart: Date;
  tenantId: string;
  enabled?: boolean;
}

/**
 * Hook for realtime allocation updates.
 * 
 * Subscribes to PostgreSQL changes and invalidates React Query cache.
 * 
 * @example
 * useRealtimeAllocations({
 *   weekStart: new Date('2026-02-03'),
 *   tenantId: 'tenant-123',
 * });
 */
export function useRealtimeAllocations({
  weekStart,
  tenantId,
  enabled = true,
}: UseRealtimeAllocationsOptions) {
  const queryClient = useQueryClient();
  const supabase = getClientSupabaseClient();
  
  const handleChange = useCallback(
    (payload: AllocationPayload) => {
      console.log('Allocation change:', payload.eventType, payload);
      
      // Invalidate allocations query to refetch
      queryClient.invalidateQueries({
        queryKey: ['allocations', tenantId, weekStart.toISOString()],
      });
      
      // Also invalidate user availability (for resource pool)
      queryClient.invalidateQueries({
        queryKey: ['userAvailability', tenantId],
      });
      
      // Optional: Show toast notification
      // toast.info('Planung wurde aktualisiert');
    },
    [queryClient, tenantId, weekStart]
  );
  
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase
      .channel(`allocations:${tenantId}`)
      .on<AllocationRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'allocations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        handleChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to allocations realtime');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to allocations');
        }
      });
    
    return () => {
      console.log('Unsubscribing from allocations realtime');
      supabase.removeChannel(channel);
    };
  }, [supabase, tenantId, enabled, handleChange]);
}
```

### Realtime Absences Hook

```typescript
// src/presentation/hooks/useRealtimeAbsences.ts

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getClientSupabaseClient } from '@/infrastructure/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type AbsenceRow = Database['public']['Tables']['absences']['Row'];
type AbsencePayload = RealtimePostgresChangesPayload<AbsenceRow>;

interface UseRealtimeAbsencesOptions {
  tenantId: string;
  enabled?: boolean;
}

/**
 * Hook for realtime absence updates.
 */
export function useRealtimeAbsences({
  tenantId,
  enabled = true,
}: UseRealtimeAbsencesOptions) {
  const queryClient = useQueryClient();
  const supabase = getClientSupabaseClient();
  
  const handleChange = useCallback(
    (payload: AbsencePayload) => {
      console.log('Absence change:', payload.eventType, payload);
      
      // Invalidate absences query
      queryClient.invalidateQueries({
        queryKey: ['absences', tenantId],
      });
      
      // Also invalidate user availability (for resource pool)
      queryClient.invalidateQueries({
        queryKey: ['userAvailability', tenantId],
      });
    },
    [queryClient, tenantId]
  );
  
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase
      .channel(`absences:${tenantId}`)
      .on<AbsenceRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'absences',
          filter: `tenant_id=eq.${tenantId}`,
        },
        handleChange
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, tenantId, enabled, handleChange]);
}
```

### Combined Realtime Hook

```typescript
// src/presentation/hooks/useRealtimePlanning.ts

'use client';

import { useRealtimeAllocations } from './useRealtimeAllocations';
import { useRealtimeAbsences } from './useRealtimeAbsences';

interface UseRealtimePlanningOptions {
  weekStart: Date;
  tenantId: string;
  enabled?: boolean;
}

/**
 * Combined hook for all planning-related realtime updates.
 * 
 * @example
 * // In PlanningPage
 * useRealtimePlanning({
 *   weekStart: currentWeekStart,
 *   tenantId: user.tenantId,
 * });
 */
export function useRealtimePlanning({
  weekStart,
  tenantId,
  enabled = true,
}: UseRealtimePlanningOptions) {
  useRealtimeAllocations({ weekStart, tenantId, enabled });
  useRealtimeAbsences({ tenantId, enabled });
}
```

---

## State Management

### Zustand Store für UI-State

```typescript
// src/presentation/store/planningStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { getStartOfWeek } from '@/lib/utils';

// ===========================================================================
// TYPES
// ===========================================================================

interface PlanningFilters {
  bereich: 'produktion' | 'montage' | null;
  status: ('planned' | 'active' | 'paused' | 'completed')[];
  search: string;
  onlyWithAllocations: boolean;
}

interface UndoAction {
  type: 'CREATE_ALLOCATION' | 'DELETE_ALLOCATION' | 'MOVE_ALLOCATION';
  payload: unknown;
  timestamp: number;
}

interface PlanningState {
  // View State
  viewMode: 'day' | 'week';
  currentWeekStart: Date;
  expandedProjects: Set<string>;
  
  // Filter State
  filters: PlanningFilters;
  
  // Selection State
  selectedAllocationIds: Set<string>;
  
  // Undo/Redo
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  
  // Actions
  setViewMode: (mode: 'day' | 'week') => void;
  setCurrentWeek: (date: Date) => void;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
  toggleProjectExpanded: (projectId: string) => void;
  expandAllProjects: (projectIds: string[]) => void;
  collapseAllProjects: () => void;
  setFilters: (filters: Partial<PlanningFilters>) => void;
  resetFilters: () => void;
  selectAllocation: (id: string) => void;
  deselectAllocation: (id: string) => void;
  toggleAllocationSelection: (id: string) => void;
  clearSelection: () => void;
  pushUndo: (action: UndoAction) => void;
  undo: () => UndoAction | undefined;
  redo: () => UndoAction | undefined;
}

// ===========================================================================
// INITIAL STATE
// ===========================================================================

const initialFilters: PlanningFilters = {
  bereich: null,
  status: ['active'],
  search: '',
  onlyWithAllocations: false,
};

// ===========================================================================
// STORE
// ===========================================================================

export const usePlanningStore = create<PlanningState>()(
  devtools(
    persist(
      (set, get) => ({
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // Initial State
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        viewMode: 'day',
        currentWeekStart: getStartOfWeek(new Date()),
        expandedProjects: new Set<string>(),
        filters: initialFilters,
        selectedAllocationIds: new Set<string>(),
        undoStack: [],
        redoStack: [],
        
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // View Actions
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        setViewMode: (mode) => set({ viewMode: mode }),
        
        setCurrentWeek: (date) => set({ 
          currentWeekStart: getStartOfWeek(date),
          selectedAllocationIds: new Set(), // Clear selection on week change
        }),
        
        goToNextWeek: () => set((state) => ({
          currentWeekStart: new Date(
            state.currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000
          ),
          selectedAllocationIds: new Set(),
        })),
        
        goToPrevWeek: () => set((state) => ({
          currentWeekStart: new Date(
            state.currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000
          ),
          selectedAllocationIds: new Set(),
        })),
        
        goToToday: () => set({
          currentWeekStart: getStartOfWeek(new Date()),
          selectedAllocationIds: new Set(),
        }),
        
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // Project Expand/Collapse
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        toggleProjectExpanded: (projectId) => set((state) => {
          const expanded = new Set(state.expandedProjects);
          if (expanded.has(projectId)) {
            expanded.delete(projectId);
          } else {
            expanded.add(projectId);
          }
          return { expandedProjects: expanded };
        }),
        
        expandAllProjects: (projectIds) => set({
          expandedProjects: new Set(projectIds),
        }),
        
        collapseAllProjects: () => set({
          expandedProjects: new Set(),
        }),
        
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // Filters
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
        
        resetFilters: () => set({ filters: initialFilters }),
        
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // Selection
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        selectAllocation: (id) => set((state) => ({
          selectedAllocationIds: new Set([...state.selectedAllocationIds, id]),
        })),
        
        deselectAllocation: (id) => set((state) => {
          const selected = new Set(state.selectedAllocationIds);
          selected.delete(id);
          return { selectedAllocationIds: selected };
        }),
        
        toggleAllocationSelection: (id) => set((state) => {
          const selected = new Set(state.selectedAllocationIds);
          if (selected.has(id)) {
            selected.delete(id);
          } else {
            selected.add(id);
          }
          return { selectedAllocationIds: selected };
        }),
        
        clearSelection: () => set({ selectedAllocationIds: new Set() }),
        
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        // Undo/Redo
        // ”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€”€
        pushUndo: (action) => set((state) => ({
          undoStack: [...state.undoStack, action].slice(-50), // Max 50
          redoStack: [], // Clear redo on new action
        })),
        
        undo: () => {
          const state = get();
          const action = state.undoStack[state.undoStack.length - 1];
          
          if (!action) return undefined;
          
          set({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, action],
          });
          
          return action;
        },
        
        redo: () => {
          const state = get();
          const action = state.redoStack[state.redoStack.length - 1];
          
          if (!action) return undefined;
          
          set({
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, action],
          });
          
          return action;
        },
      }),
      {
        name: 'planning-store',
        // Only persist certain fields
        partialize: (state) => ({
          viewMode: state.viewMode,
          expandedProjects: Array.from(state.expandedProjects),
          filters: state.filters,
        }),
        // Convert Set to/from Array for storage
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<PlanningState>),
          expandedProjects: new Set(
            (persisted as { expandedProjects?: string[] })?.expandedProjects ?? []
          ),
        }),
      }
    ),
    { name: 'PlanningStore' }
  )
);
```

---

## Validation Schemas (Zod)

```typescript
// src/lib/validations.ts

import { z } from 'zod';

// ===========================================================================
// COMMON
// ===========================================================================

export const uuidSchema = z.string().uuid('Ungültige ID');

export const dateSchema = z.coerce.date();

export const dateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Datum muss im Format YYYY-MM-DD sein'
);

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine(
  data => data.startDate <= data.endDate,
  { message: 'Startdatum muss vor oder gleich Enddatum sein' }
);

// ===========================================================================
// ALLOCATIONS
// ===========================================================================

export const createAllocationSchema = z.object({
  userId: uuidSchema.optional(),
  resourceId: uuidSchema.optional(),
  projectPhaseId: uuidSchema,
  date: dateStringSchema,
  notes: z.string().max(500).optional(),
}).refine(
  data => (data.userId && !data.resourceId) || (!data.userId && data.resourceId),
  { message: 'Entweder userId oder resourceId muss gesetzt sein (XOR)' }
);

export const createAllocationsRangeSchema = z.object({
  userId: uuidSchema.optional(),
  resourceId: uuidSchema.optional(),
  projectPhaseId: uuidSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  excludeWeekends: z.boolean().default(true),
  notes: z.string().max(500).optional(),
}).refine(
  data => (data.userId && !data.resourceId) || (!data.userId && data.resourceId),
  { message: 'Entweder userId oder resourceId muss gesetzt sein (XOR)' }
);

export const moveAllocationSchema = z.object({
  allocationId: uuidSchema,
  newDate: dateStringSchema,
  newPhaseId: uuidSchema.optional(),
});

// ===========================================================================
// USERS
// ===========================================================================

export const createUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(100),
  role: z.enum(['admin', 'planer', 'gewerblich']),
  weeklyHours: z.number().min(0).max(60).default(40),
  sendInvite: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'planer', 'gewerblich']).optional(),
  weeklyHours: z.number().min(0).max(60).optional(),
});

// ===========================================================================
// RESOURCES
// ===========================================================================

export const createResourceSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  resourceTypeId: uuidSchema,
  licensePlate: z.string().max(20).optional(),
});

export const createResourceTypeSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50),
  icon: z.string().max(50).default('package'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültige Farbe').default('#6D6D6D'),
});

// ===========================================================================
// AUTH
// ===========================================================================

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
  rememberMe: z.boolean().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

// ===========================================================================
// TYPE EXPORTS
// ===========================================================================

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type CreateAllocationsRangeInput = z.infer<typeof createAllocationsRangeSchema>;
export type MoveAllocationInput = z.infer<typeof moveAllocationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type CreateResourceTypeInput = z.infer<typeof createResourceTypeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

---

## UI-spezifische TypeScript Types

Zusätzliche Types für die Presentation Layer, die über die DB-Types hinausgehen.

```typescript
// src/domain/types/ui-types.ts

import type { Allocation, User, Resource, ProjectPhase, Project, Absence } from './entities';

// ===========================================================================
// ALLOCATION TYPES
// ===========================================================================

/**
 * Allocation mit berechneten Warnung-Flags für die UI.
 */
export interface AllocationWithWarnings extends Allocation {
  /** User hat an diesem Tag eine Abwesenheit */
  hasAbsenceWarning: boolean;
  /** User ist an diesem Tag mehrfach eingeplant */
  hasMultiWarning: boolean;
  /** Typ der Abwesenheit (falls hasAbsenceWarning = true) - DB-Werte, UI mapped zu deutschen Labels */
  absenceType?: 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
  /** Anzahl der Allocations an diesem Tag (falls hasMultiWarning = true) */
  allocationCount?: number;
}

/**
 * Vollständige Allocation-Daten mit allen Relationen für die Planungsansicht.
 */
export interface AllocationWithDetails extends AllocationWithWarnings {
  user: Pick<User, 'id' | 'fullName' | 'weeklyHours'> | null;
  resource: Pick<Resource, 'id' | 'name'> & {
    resourceType: { name: string; icon: string; color: string }
  } | null;
  phase: Pick<ProjectPhase, 'id' | 'name' | 'bereich' | 'budgetHours' | 'actualHours'>;
  project: Pick<Project, 'id' | 'name' | 'address' | 'status'>;
}

// ===========================================================================
// DASHBOARD TYPES
// ===========================================================================

/**
 * Aggregierte Phase-Daten für Dashboard-KPIs.
 */
export interface PhaseSummary {
  id: string;
  name: string;
  projectName: string;
  bereich: 'produktion' | 'montage';
  budgetHours: number;
  plannedHours: number;
  actualHours: number;
  /** Budget-Auslastung in Prozent */
  budgetUtilization: number;
  /** Verbleibende Stunden (budget - planned) */
  remainingHours: number;
  /** Status basierend auf Auslastung */
  status: 'on_track' | 'at_risk' | 'over_budget';
}

/**
 * Kapazitätsübersicht für einen Tag/Woche.
 */
export interface CapacitySummary {
  /** Gesamte verfügbare Stunden */
  totalCapacity: number;
  /** Bereits verplante Stunden */
  plannedHours: number;
  /** Verfügbare Stunden */
  availableHours: number;
  /** Auslastung in Prozent */
  utilization: number;
  /** Anzahl verfügbarer Mitarbeiter */
  availableUsers: number;
  /** Anzahl Mitarbeiter mit Abwesenheit */
  absentUsers: number;
}

// ===========================================================================
// WEEK VIEW TYPES
// ===========================================================================

/**
 * Strukturierte Daten für die Wochenansicht.
 */
export interface WeekViewData {
  /** Start der Woche (Montag) */
  weekStart: Date;
  /** Array der Wochentage (Mo-So) */
  days: WeekDay[];
  /** Projekte mit ihren Phasen und Allocations */
  projects: WeekViewProject[];
  /** Kapazitätsübersicht pro Tag */
  capacityByDay: Record<string, CapacitySummary>;
}

export interface WeekDay {
  date: Date;
  dayName: string;
  isToday: boolean;
  isWeekend: boolean;
}

export interface WeekViewProject {
  id: string;
  name: string;
  status: string;
  phases: WeekViewPhase[];
}

export interface WeekViewPhase {
  id: string;
  name: string;
  bereich: 'produktion' | 'montage';
  summary: PhaseSummary;
  /** Allocations gruppiert nach Datum (ISO-String als Key) */
  allocationsByDate: Record<string, AllocationWithDetails[]>;
}

// ===========================================================================
// RESOURCE POOL TYPES
// ===========================================================================

/**
 * User mit berechneter Verfügbarkeit für den Resource Pool.
 */
export interface UserWithAvailability extends Pick<User, 'id' | 'fullName' | 'role' | 'weeklyHours'> {
  /** Verfügbarkeit pro Tag der Woche */
  availability: DayAvailability[];
  /** Ist heute verfügbar? */
  isAvailableToday: boolean;
  /** Aktuelle Abwesenheit (falls vorhanden) */
  currentAbsence?: Pick<Absence, 'type' | 'startDate' | 'endDate'>;
}

/**
 * Resource mit berechneter Verfügbarkeit für den Resource Pool.
 */
export interface ResourceWithAvailability extends Pick<Resource, 'id' | 'name' | 'licensePlate'> {
  resourceType: { name: string; icon: string; color: string };
  /** Verfügbarkeit pro Tag der Woche */
  availability: DayAvailability[];
  /** Ist heute verfügbar? */
  isAvailableToday: boolean;
}

export interface DayAvailability {
  date: Date;
  status: 'available' | 'partial' | 'busy' | 'absent';
  /** Bereits geplante Stunden (für Users) */
  plannedHours?: number;
  /** Verbleibende Stunden (für Users) */
  remainingHours?: number;
  /** Tooltip-Text */
  tooltip: string;
}

// ===========================================================================
// FORM TYPES
// ===========================================================================

/**
 * Form State für Allocation-Dialoge.
 */
export interface AllocationFormState {
  type: 'user' | 'resource';
  userId?: string;
  resourceId?: string;
  phaseId: string;
  date: Date;
  plannedHours?: number;
}

/**
 * Drag-Operation State für optimistische Updates.
 */
export interface DragState {
  isDragging: boolean;
  sourcePhaseId?: string;
  sourceDate?: Date;
  allocationId?: string;
  type: 'user' | 'resource';
}
```

---

## Rate Limiting

API-Endpunkte und Server Actions sind durch Rate Limiting geschützt.

### Limits pro Endpunkt

| Endpunkt / Action | Limit | Fenster | Scope |
|-------------------|-------|---------|-------|
| **Auth (Login)** | 5 Requests | 15 Min | IP + Email |
| **Auth (Passwort Reset)** | 3 Requests | 60 Min | IP |
| **Server Actions (Standard)** | 100 Requests | 1 Min | User |
| **Server Actions (Bulk)** | 20 Requests | 1 Min | User |
| **Asana Webhook** | Unlimited | - | Signature-Validated |
| **Cron Jobs** | 1 Request | Per Schedule | CRON_SECRET |

### Implementation via Upstash Redis

```typescript
// src/lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

// Redis-Client (Umgebungsvariablen: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITERS
// ═══════════════════════════════════════════════════════════════════════════

/** Login: 5 Versuche pro 15 Minuten */
export const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'ratelimit:login',
});

/** Password Reset: 3 Versuche pro Stunde */
export const passwordResetRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:password-reset',
});

/** Standard Actions: 100 pro Minute */
export const actionRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:action',
});

/** Bulk Actions: 20 pro Minute */
export const bulkActionRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ratelimit:bulk',
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft Rate Limit und gibt Fehler zurück falls überschritten.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset };
}

/**
 * Extrahiert Client-IP aus Request Headers.
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  );
}
```

### Verwendung in Server Actions

```typescript
// src/presentation/actions/auth.actions.ts

'use server';

import { loginRateLimiter, getClientIP } from '@/lib/rate-limit';
import { failure } from '@/lib/action-result';

export async function loginAction(input: LoginInput) {
  const ip = await getClientIP();
  const identifier = `${ip}:${input.email}`;

  const { success, reset } = await loginRateLimiter.limit(identifier);

  if (!success) {
    return failure(
      'RATE_LIMIT_EXCEEDED',
      'Zu viele Anmeldeversuche. Bitte warten Sie.',
      { retryable: true, retryAfterMs: (reset - Date.now()) }
    );
  }

  // ... Login-Logik
}
```

### Fehlermeldung im Client

Bei überschrittenem Rate-Limit wird der Error-Code `RATE_LIMIT_EXCEEDED` zurückgegeben:

```typescript
// In error-codes.ts ergänzen:
RATE_LIMIT_EXCEEDED: 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
```

---

## Encryption Utility

Für sichere Speicherung von API-Tokens (Asana, TimeTac).

```typescript
// src/lib/encryption.ts

import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM.
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (hex encoded)
 * 
 * @example
 * const encrypted = encrypt('my-api-token');
 * // Returns: "a1b2c3...:d4e5f6...:g7h8i9..."
 */
export function encrypt(text: string): string {
  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  
  const key = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded from base64');
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encrypt().
 * 
 * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plain text
 * 
 * @example
 * const decrypted = decrypt(encryptedToken);
 * // Returns: "my-api-token"
 */
export function decrypt(encryptedText: string): string {
  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  
  const key = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded from base64');
  }
  
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const [ivHex, authTagHex, ciphertext] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a new encryption key (for initial setup).
 * 
 * @returns Base64 encoded 256-bit key
 * 
 * @example
 * // Run in terminal: npx tsx -e "console.log(require('./src/lib/encryption').generateKey())"
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
```

### Encryption Service (DI-compatible)

```typescript
// src/infrastructure/services/EncryptionService.ts

import { encrypt, decrypt } from '@/lib/encryption';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

/**
 * Encryption service implementation.
 * Used by repositories to encrypt/decrypt sensitive data.
 */
export class EncryptionService implements IEncryptionService {
  private readonly isConfigured: boolean;
  
  constructor(encryptionKey?: string) {
    this.isConfigured = !!encryptionKey;
  }
  
  encrypt(text: string): string {
    if (!this.isConfigured) {
      console.warn('Encryption not configured, storing in plain text');
      return text;
    }
    return encrypt(text);
  }
  
  decrypt(encryptedText: string): string {
    if (!this.isConfigured) {
      return encryptedText;
    }
    
    // Check if text looks encrypted (has : separators)
    if (!encryptedText.includes(':')) {
      return encryptedText; // Probably plain text from before encryption was configured
    }
    
    return decrypt(encryptedText);
  }
  
  isAvailable(): boolean {
    return this.isConfigured;
  }
}
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | Januar 2026 | Initial für Antigravity |
| 1.1 | Januar 2026 | + Auth Actions, + TimeEntries Actions, + Settings/Tenant Actions, + SyncLogs Actions, + Erweiterte Error Codes, + Realtime Subscriptions, + Environment Variables, + Vollständige Zod Schemas |
| 1.2 | Januar 2026 | + Vollständiger Error Codes Katalog mit 60+ Codes, + ActionResult Pattern vollständig dokumentiert, + Error Handling Strategie mit Recovery-Patterns, + Domain Error Classes, + Client-Side Error Handling mit useActionHandler Hook, + State Management mit Zustand + React Query, + Optimistic Update Pattern, + Error Messages (Deutsch), + HTTP Status Code Mapping |
| 1.3 | Januar 2026 | + **Environment Validation** (env.ts mit Zod), + **Supabase Client Setup** (Server/Client/Actions/Admin), + **DI Container** (vollständige Implementation), + **React Query Provider Setup** (providers.tsx), + **Realtime Subscriptions** (useRealtimeAllocations, useRealtimeAbsences, useRealtimePlanning), + **Encryption Utility** (AES-256-GCM), + EncryptionService für DI, + .env.example Template |
| 1.4 | Januar 2026 | **Rebranding: "bänk" → "planned."**, UTF-8 Encoding korrigiert, Architektur-Diagramm bereinigt |
| 1.5 | Januar 2026 | + **UI-spezifische TypeScript Types** (AllocationWithWarnings, PhaseSummary, WeekViewData, etc.), + **Rate Limiting** (Upstash Redis Implementation, Limits-Tabelle, Verwendungsbeispiele) |

---

*Version: 1.5 für Antigravity*
*Erstellt: 29. Januar 2026*
