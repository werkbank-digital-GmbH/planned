import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  Database,
  Tables,
  UserRole,
  ProjectStatus,
  PhaseBereich,
  PhaseStatus,
  AbsenceType,
  SyncService,
  SyncStatus,
} from '@/lib/database.types';

// Mock next/headers für Server-Tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

// Typen für Tabellen-Rows
type Tenant = Tables<'tenants'>;
type User = Tables<'users'>;
type Project = Tables<'projects'>;
type ProjectPhase = Tables<'project_phases'>;
type Allocation = Tables<'allocations'>;
type TimeEntry = Tables<'time_entries'>;
type Absence = Tables<'absences'>;
type SyncLog = Tables<'sync_logs'>;
type Resource = Tables<'resources'>;
type ResourceType = Tables<'resource_types'>;
type IntegrationCredentials = Tables<'integration_credentials'>;

describe('Supabase Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should have database types defined', () => {
    // TypeScript wird den Import validieren - wenn kompiliert, existieren die Typen
    const dbType: Database | null = null;
    expect(dbType).toBeNull();
  });

  it('should have all table types defined', () => {
    // Prüfe dass alle wichtigen Typen existieren durch TypeScript-Kompilierung
    const tenant: Tenant | null = null;
    const user: User | null = null;
    const project: Project | null = null;
    const phase: ProjectPhase | null = null;
    const allocation: Allocation | null = null;
    const timeEntry: TimeEntry | null = null;
    const absence: Absence | null = null;
    const syncLog: SyncLog | null = null;
    const resource: Resource | null = null;
    const resourceType: ResourceType | null = null;
    const credentials: IntegrationCredentials | null = null;

    // Alle null - nur TypeScript-Validierung
    expect(tenant).toBeNull();
    expect(user).toBeNull();
    expect(project).toBeNull();
    expect(phase).toBeNull();
    expect(allocation).toBeNull();
    expect(timeEntry).toBeNull();
    expect(absence).toBeNull();
    expect(syncLog).toBeNull();
    expect(resource).toBeNull();
    expect(resourceType).toBeNull();
    expect(credentials).toBeNull();
  });

  it('should have all enum types defined', () => {
    const userRole: UserRole | null = null;
    const projectStatus: ProjectStatus | null = null;
    const phaseBereich: PhaseBereich | null = null;
    const phaseStatus: PhaseStatus | null = null;
    const absenceType: AbsenceType | null = null;
    const syncService: SyncService | null = null;
    const syncStatus: SyncStatus | null = null;

    // Alle null - nur TypeScript-Validierung
    expect(userRole).toBeNull();
    expect(projectStatus).toBeNull();
    expect(phaseBereich).toBeNull();
    expect(phaseStatus).toBeNull();
    expect(absenceType).toBeNull();
    expect(syncService).toBeNull();
    expect(syncStatus).toBeNull();
  });
});

describe('Supabase Client Exports', () => {
  it('should export all client factory functions', async () => {
    const supabase = await import('@/infrastructure/supabase');

    expect(typeof supabase.createServerSupabaseClient).toBe('function');
    expect(typeof supabase.createBrowserSupabaseClient).toBe('function');
    expect(typeof supabase.createActionSupabaseClient).toBe('function');
    expect(typeof supabase.createAdminSupabaseClient).toBe('function');
    expect(typeof supabase.getBrowserSupabaseClient).toBe('function');
  });
});

describe('Environment Validation', () => {
  it('should export env and clientEnv', async () => {
    // Setze Test-Umgebungsvariablen
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
    process.env.SUPABASE_SECRET_KEY = 'test-secret';

    vi.resetModules();
    const { env, clientEnv } = await import('@/lib/env');

    expect(env).toBeDefined();
    expect(clientEnv).toBeDefined();
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
  });
});
