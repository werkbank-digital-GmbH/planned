import { describe, it, expect } from 'vitest';
import type { Database } from '@/lib/database.types';

describe('Database Types', () => {
  it('should have tenants table type', () => {
    type TenantsTable = Database['public']['Tables']['tenants'];
    type TenantsRow = TenantsTable['Row'];

    // TypeScript-Kompilierung validiert die Struktur
    const mockTenant: TenantsRow = {
      id: 'uuid',
      name: 'Test Tenant',
      slug: 'test-tenant',
      settings: { defaultWeeklyHours: 40 },
      company_address: null,
      company_lat: null,
      company_lng: null,
      insights_last_refresh_at: null,
      created_at: '2026-01-29T00:00:00Z',
      updated_at: '2026-01-29T00:00:00Z',
    };

    expect(mockTenant.name).toBe('Test Tenant');
  });

  it('should have users table type', () => {
    type UsersTable = Database['public']['Tables']['users'];
    type UsersRow = UsersTable['Row'];

    const mockUser: UsersRow = {
      id: 'uuid',
      auth_id: 'auth-uuid',
      tenant_id: 'tenant-uuid',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      weekly_hours: 40,
      is_active: true,
      timetac_id: null,
      avatar_url: null,
      created_at: '2026-01-29T00:00:00Z',
      updated_at: '2026-01-29T00:00:00Z',
    };

    expect(mockUser.role).toBe('admin');
  });

  it('should have allocations table type', () => {
    type AllocationsTable = Database['public']['Tables']['allocations'];
    type AllocationsRow = AllocationsTable['Row'];

    const mockAllocation: AllocationsRow = {
      id: 'uuid',
      tenant_id: 'tenant-uuid',
      user_id: 'user-uuid',
      resource_id: null,
      project_phase_id: 'phase-uuid',
      date: '2026-01-29',
      planned_hours: 8,
      notes: null,
      created_at: '2026-01-29T00:00:00Z',
      updated_at: '2026-01-29T00:00:00Z',
    };

    expect(mockAllocation.planned_hours).toBe(8);
  });

  it('should have project_phases table type', () => {
    type PhasesTable = Database['public']['Tables']['project_phases'];
    type PhasesRow = PhasesTable['Row'];

    const mockPhase: PhasesRow = {
      id: 'uuid',
      project_id: 'project-uuid',
      name: 'Elementierung',
      bereich: 'produktion',
      start_date: '2026-01-29',
      end_date: '2026-02-05',
      sort_order: 0,
      budget_hours: 80,
      planned_hours: 40,
      actual_hours: 20,
      status: 'active',
      asana_gid: 'asana-123',
      description: null,
      deleted_at: null,
      created_at: '2026-01-29T00:00:00Z',
      updated_at: '2026-01-29T00:00:00Z',
    };

    expect(mockPhase.bereich).toBe('produktion');
  });

  it('should have correct enum values for user_role', () => {
    type UserRole = Database['public']['Enums']['user_role'];

    const roles: UserRole[] = ['admin', 'planer', 'gewerblich'];
    expect(roles).toContain('admin');
    expect(roles).toContain('planer');
    expect(roles).toContain('gewerblich');
  });

  it('should have correct enum values for project_status', () => {
    type ProjectStatus = Database['public']['Enums']['project_status'];

    const statuses: ProjectStatus[] = ['planning', 'active', 'paused', 'completed'];
    expect(statuses).toContain('planning');
    expect(statuses).toContain('active');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('completed');
  });

  it('should have correct enum values for phase_bereich', () => {
    type PhaseBereich = Database['public']['Enums']['phase_bereich'];

    const bereiche: PhaseBereich[] = ['produktion', 'montage', 'externes_gewerk', 'nicht_definiert', 'vertrieb'];
    expect(bereiche).toContain('produktion');
    expect(bereiche).toContain('montage');
    expect(bereiche).toContain('vertrieb');
  });

  it('should have correct enum values for absence_type', () => {
    type AbsenceType = Database['public']['Enums']['absence_type'];

    const types: AbsenceType[] = ['vacation', 'sick', 'holiday', 'training', 'other'];
    expect(types).toContain('vacation');
    expect(types).toContain('sick');
    expect(types).toContain('holiday');
  });

  it('should have functions defined', () => {
    type Functions = Database['public']['Functions'];
    type GetCurrentTenantIdFn = Functions['get_current_tenant_id'];
    type GetCurrentUserRoleFn = Functions['get_current_user_role'];

    // Prüfe dass die Funktions-Return-Types korrekt sind
    type TenantIdReturn = GetCurrentTenantIdFn['Returns'];
    type UserRoleReturn = GetCurrentUserRoleFn['Returns'];
    type CreateUserArgs = Functions['create_user_for_auth']['Args'];
    type AllocationsWeekArgs = Functions['get_allocations_for_week']['Args'];

    // TypeScript-Kompilierung validiert dies
    const tenantId: TenantIdReturn = 'uuid';
    const userRole: UserRoleReturn = 'admin';
    const createUserArgs: CreateUserArgs = {
      p_auth_id: 'uuid',
      p_tenant_id: 'uuid',
      p_email: 'test@test.com',
      p_full_name: 'Test User',
    };
    const allocationsArgs: AllocationsWeekArgs = {
      p_tenant_id: 'uuid',
      p_week_start: '2026-01-27',
    };

    expect(tenantId).toBe('uuid');
    expect(userRole).toBe('admin');
    expect(createUserArgs.p_email).toBe('test@test.com');
    expect(allocationsArgs.p_week_start).toBe('2026-01-27');
  });
});
