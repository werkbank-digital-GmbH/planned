import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import type { CreatePhaseSnapshotDTO, PhaseSnapshot } from '@/domain/analytics/types';

import { GeneratePhaseSnapshotsUseCase } from '../GeneratePhaseSnapshotsUseCase';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createMockAnalyticsRepo(): IAnalyticsRepository {
  return {
    createSnapshot: vi.fn().mockResolvedValue({} as PhaseSnapshot),
    createSnapshots: vi.fn().mockResolvedValue([]),
    getSnapshotsForPhase: vi.fn().mockResolvedValue([]),
    getSnapshotsForDateRange: vi.fn().mockResolvedValue([]),
    getSnapshotsForPhasesInDateRange: vi.fn().mockResolvedValue(new Map()),
    hasSnapshotForToday: vi.fn().mockResolvedValue(false),
    upsertPhaseInsight: vi.fn(),
    getLatestPhaseInsight: vi.fn(),
    getLatestInsightsForPhases: vi.fn(),
    upsertProjectInsight: vi.fn(),
    getLatestProjectInsight: vi.fn(),
    cleanupOldSnapshots: vi.fn(),
    getTenantInsightsSummary: vi.fn(),
  };
}

/**
 * Creates a mock SupabaseClient that supports chaining for the queries
 * used by GeneratePhaseSnapshotsUseCase:
 *  - supabase.from('tenants').select('id')
 *  - supabase.rpc('get_active_phases_with_metrics', ...)
 *  - supabase.from('phase_snapshots').select('id', { count, head }).eq().eq()
 */
function createMockSupabase(options: {
  tenants?: { id: string }[];
  phasesByTenant?: Record<string, Array<{
    id: string;
    tenant_id: string;
    ist_hours: number;
    soll_hours: number;
    plan_hours: number;
    allocations_count: number;
    allocated_users_count: number;
  }>>;
  existingSnapshots?: Set<string>; // "phaseId:date" keys
  tenantsError?: Error;
}) {
  const { tenants = [], phasesByTenant = {}, existingSnapshots = new Set(), tenantsError } = options;

  // Build chainable mock for .from().select().eq().eq()
  const snapshotSelectChain = {
    eq: vi.fn().mockImplementation((field: string, value: string) => {
      if (field === 'snapshot_date') {
        // Final .eq() in chain — resolve based on existingSnapshots
        return {
          then: (resolve: (result: { count: number; error: null }) => void) => {
            // We need to check phase_id stored from prior .eq()
            const key = `${snapshotSelectChain._lastPhaseId}:${value}`;
            resolve({ count: existingSnapshots.has(key) ? 1 : 0, error: null });
          },
        };
      }
      // First .eq('phase_id', ...) — store phase_id for later
      snapshotSelectChain._lastPhaseId = value;
      return snapshotSelectChain;
    }),
    _lastPhaseId: '',
  };

  const fromChain = vi.fn().mockImplementation((table: string) => {
    if (table === 'tenants') {
      return {
        select: vi.fn().mockResolvedValue(
          tenantsError
            ? { data: null, error: tenantsError }
            : { data: tenants, error: null }
        ),
      };
    }
    if (table === 'phase_snapshots') {
      return {
        select: vi.fn().mockReturnValue(snapshotSelectChain),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });

  const rpcMock = vi.fn().mockImplementation((_name: string, params: { p_tenant_id: string }) => {
    const phases = phasesByTenant[params.p_tenant_id] || [];
    return Promise.resolve({ data: phases, error: null });
  });

  return { from: fromChain, rpc: rpcMock } as unknown as SupabaseClient;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('GeneratePhaseSnapshotsUseCase', () => {
  let repo: IAnalyticsRepository;

  beforeEach(() => {
    repo = createMockAnalyticsRepo();
  });

  it('returns success with 0 counts when no tenants exist', async () => {
    const supabase = createMockSupabase({ tenants: [] });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.success).toBe(true);
    expect(result.tenants_processed).toBe(0);
    expect(result.snapshots_created).toBe(0);
  });

  it('creates snapshots for one tenant with one phase', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 'tenant-1' }],
      phasesByTenant: {
        'tenant-1': [
          {
            id: 'phase-1',
            tenant_id: 'tenant-1',
            ist_hours: 40,
            soll_hours: 100,
            plan_hours: 60,
            allocations_count: 5,
            allocated_users_count: 2,
          },
        ],
      },
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.snapshots_created).toBe(1);
    expect(result.phases_processed).toBe(1);
    expect(repo.createSnapshots).toHaveBeenCalledWith([
      expect.objectContaining({
        phase_id: 'phase-1',
        ist_hours: 40,
        soll_hours: 100,
        plan_hours: 60,
        snapshot_date: '2025-01-15',
      } satisfies Partial<CreatePhaseSnapshotDTO>),
    ]);
  });

  it('skips existing snapshots (idempotent)', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 'tenant-1' }],
      phasesByTenant: {
        'tenant-1': [
          { id: 'phase-1', tenant_id: 'tenant-1', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
        ],
      },
      existingSnapshots: new Set(['phase-1:2025-01-15']),
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.skipped_existing).toBe(1);
    expect(result.snapshots_created).toBe(0);
    expect(repo.createSnapshots).not.toHaveBeenCalled();
  });

  it('processes multiple tenants with multiple phases', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 't1' }, { id: 't2' }],
      phasesByTenant: {
        t1: [
          { id: 'p1', tenant_id: 't1', ist_hours: 10, soll_hours: 50, plan_hours: 20, allocations_count: 2, allocated_users_count: 1 },
          { id: 'p2', tenant_id: 't1', ist_hours: 20, soll_hours: 80, plan_hours: 40, allocations_count: 3, allocated_users_count: 2 },
        ],
        t2: [
          { id: 'p3', tenant_id: 't2', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
          { id: 'p4', tenant_id: 't2', ist_hours: 50, soll_hours: 50, plan_hours: 50, allocations_count: 5, allocated_users_count: 3 },
        ],
      },
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.tenants_processed).toBe(2);
    expect(result.phases_processed).toBe(4);
    expect(result.snapshots_created).toBe(4);
  });

  it('catches per-tenant errors and continues processing', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 't-error' }, { id: 't-ok' }],
      phasesByTenant: {
        't-ok': [
          { id: 'p1', tenant_id: 't-ok', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
        ],
      },
    });

    // Make rpc throw for first tenant
    (supabase.rpc as ReturnType<typeof vi.fn>).mockImplementation(
      (_name: string, params: { p_tenant_id: string }) => {
        if (params.p_tenant_id === 't-error') {
          return Promise.resolve({ data: null, error: new Error('RPC failed') });
        }
        return Promise.resolve({
          data: [{ id: 'p1', tenant_id: 't-ok', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 }],
          error: null,
        });
      }
    );

    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);
    const result = await useCase.execute('2025-01-15');

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.snapshots_created).toBe(1); // second tenant succeeded
  });

  it('returns success=false when tenant loading fails globally', async () => {
    const supabase = createMockSupabase({
      tenantsError: new Error('Database unreachable'),
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Database unreachable');
  });

  it('uses custom snapshotDate', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 't1' }],
      phasesByTenant: {
        t1: [
          { id: 'p1', tenant_id: 't1', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
        ],
      },
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    await useCase.execute('2025-06-15');

    expect(repo.createSnapshots).toHaveBeenCalledWith([
      expect.objectContaining({ snapshot_date: '2025-06-15' }),
    ]);
  });

  it('creates snapshots for phases with zero metrics', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 't1' }],
      phasesByTenant: {
        t1: [
          { id: 'p1', tenant_id: 't1', ist_hours: 0, soll_hours: 0, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
        ],
      },
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    const result = await useCase.execute('2025-01-15');

    expect(result.snapshots_created).toBe(1);
  });

  it('batch inserts all new snapshots at once per tenant', async () => {
    const supabase = createMockSupabase({
      tenants: [{ id: 't1' }],
      phasesByTenant: {
        t1: [
          { id: 'p1', tenant_id: 't1', ist_hours: 0, soll_hours: 100, plan_hours: 0, allocations_count: 0, allocated_users_count: 0 },
          { id: 'p2', tenant_id: 't1', ist_hours: 10, soll_hours: 50, plan_hours: 10, allocations_count: 1, allocated_users_count: 1 },
          { id: 'p3', tenant_id: 't1', ist_hours: 20, soll_hours: 80, plan_hours: 30, allocations_count: 2, allocated_users_count: 2 },
        ],
      },
    });
    const useCase = new GeneratePhaseSnapshotsUseCase(repo, supabase);

    await useCase.execute('2025-01-15');

    // Should be called once with array of 3 DTOs (batch)
    expect(repo.createSnapshots).toHaveBeenCalledTimes(1);
    const calledWith = (repo.createSnapshots as ReturnType<typeof vi.fn>).mock.calls[0][0] as CreatePhaseSnapshotDTO[];
    expect(calledWith).toHaveLength(3);
  });
});
