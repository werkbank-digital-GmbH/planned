import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import { createSnapshot } from '@/domain/analytics/__tests__/test-helpers';
import type { PhaseInsight, PhaseSnapshot, ProjectInsight } from '@/domain/analytics/types';

import type { IWeatherCacheRepository } from '@/application/ports/repositories/IWeatherCacheRepository';
import type {
  IInsightTextGenerator,
  GeneratedTexts,
  GeneratedTextsWithAction,
} from '@/application/ports/services/IInsightTextGenerator';
import type { IWeatherService } from '@/application/ports/services/IWeatherService';
import type { AvailabilityAnalyzer } from '@/application/services/AvailabilityAnalyzer';


import { GenerateInsightsUseCase } from '../GenerateInsightsUseCase';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createMockAnalyticsRepo(): IAnalyticsRepository {
  return {
    createSnapshot: vi.fn(),
    createSnapshots: vi.fn(),
    getSnapshotsForPhase: vi.fn(),
    getSnapshotsForDateRange: vi.fn(),
    getSnapshotsForPhasesInDateRange: vi.fn().mockResolvedValue(new Map()),
    hasSnapshotForToday: vi.fn(),
    upsertPhaseInsight: vi.fn().mockImplementation((insight) =>
      Promise.resolve({ id: `pi-${Date.now()}`, created_at: new Date().toISOString(), ...insight } as PhaseInsight)
    ),
    getLatestPhaseInsight: vi.fn(),
    getLatestInsightsForPhases: vi.fn(),
    upsertProjectInsight: vi.fn().mockImplementation((insight) =>
      Promise.resolve({ id: `proj-${Date.now()}`, created_at: new Date().toISOString(), ...insight } as ProjectInsight)
    ),
    getLatestProjectInsight: vi.fn(),
    cleanupOldSnapshots: vi.fn(),
    getTenantInsightsSummary: vi.fn(),
  };
}

function createMockTextGenerator(): IInsightTextGenerator {
  return {
    generatePhaseTexts: vi.fn().mockResolvedValue({
      summary_text: 'Test summary',
      detail_text: 'Test detail',
      recommendation_text: 'Test recommendation',
    } satisfies GeneratedTexts),
    generateProjectTexts: vi.fn().mockResolvedValue({
      summary_text: 'Project summary',
      detail_text: 'Project detail',
      recommendation_text: 'Project recommendation',
    } satisfies GeneratedTexts),
    generateEnhancedPhaseTexts: vi.fn().mockResolvedValue({
      summary_text: 'Enhanced summary',
      detail_text: 'Enhanced detail',
      recommendation_text: 'Enhanced recommendation',
      suggestedAction: undefined,
    } satisfies GeneratedTextsWithAction),
  };
}

function createMockSupabase(options: {
  tenants?: { id: string }[];
  projectsByTenant?: Record<string, Array<{
    id: string;
    tenant_id: string;
    name: string;
    address?: string | null;
    address_lat?: number | null;
    address_lng?: number | null;
    project_phases: Array<{
      id: string;
      name: string;
      start_date: string | null;
      end_date: string | null;
      budget_hours: number | null;
      actual_hours: number | null;
      planned_hours: number | null;
      description: string | null;
    }>;
  }>>;
  tenantsError?: Error;
}) {
  const { tenants = [], projectsByTenant = {}, tenantsError } = options;

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockResolvedValue(
            tenantsError
              ? { data: null, error: tenantsError }
              : { data: tenants, error: null }
          ),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_field: string, tenantId: string) => ({
              eq: vi.fn().mockResolvedValue({
                data: projectsByTenant[tenantId] || [],
                error: null,
              }),
            })),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    }),
  } as unknown as SupabaseClient;
}

function createProject(overrides: Partial<{
  id: string;
  name: string;
  address_lat: number | null;
  address_lng: number | null;
  phases: Array<{
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    budget_hours: number | null;
    actual_hours: number | null;
    planned_hours: number | null;
    description: string | null;
  }>;
}> = {}) {
  return {
    id: overrides.id ?? 'project-1',
    tenant_id: 'tenant-1',
    name: overrides.name ?? 'Holzhaus Müller',
    address: null,
    address_lat: overrides.address_lat ?? null,
    address_lng: overrides.address_lng ?? null,
    project_phases: overrides.phases ?? [
      {
        id: 'phase-1',
        name: 'Rohbau',
        start_date: '2025-01-06',
        end_date: '2025-03-28',
        budget_hours: 200,
        actual_hours: 80,
        planned_hours: 120,
        description: null,
      },
    ],
  };
}

/**
 * Creates a series of linearly progressing snapshots for a phase.
 */
function createLinearSnapshots(phaseId: string, count: number): PhaseSnapshot[] {
  return Array.from({ length: count }, (_, i) =>
    createSnapshot({
      id: `snap-${phaseId}-${i}`,
      phase_id: phaseId,
      snapshot_date: `2025-01-${String(20 + i).padStart(2, '0')}`,
      ist_hours: i * 8,
      plan_hours: i * 8,
      soll_hours: 200,
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('GenerateInsightsUseCase', () => {
  let repo: IAnalyticsRepository;
  let textGen: IInsightTextGenerator;

  beforeEach(() => {
    repo = createMockAnalyticsRepo();
    textGen = createMockTextGenerator();
  });

  describe('basic scenarios (without enhanced deps)', () => {
    it('returns success with 0 counts when no tenants', async () => {
      const supabase = createMockSupabase({ tenants: [] });
      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);

      const result = await useCase.execute('2025-02-03');

      expect(result.success).toBe(true);
      expect(result.tenants_processed).toBe(0);
    });

    it('handles tenant with no projects', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [] },
      });
      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);

      const result = await useCase.execute('2025-02-03');

      expect(result.phases_processed).toBe(0);
      expect(result.phase_insights_created).toBe(0);
    });

    it('creates not_started insight for phase without snapshots', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });
      // Empty snapshot map → not_started
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(new Map());

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      const result = await useCase.execute('2025-02-03');

      expect(result.phase_insights_created).toBe(1);
      expect(repo.upsertPhaseInsight).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'not_started' })
      );
    });

    it('creates normal insight for phase with snapshots', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshots = createLinearSnapshots('phase-1', 5);
      const snapshotMap = new Map([['phase-1', snapshots]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      const result = await useCase.execute('2025-02-03');

      expect(result.phase_insights_created).toBe(1);
      // Should NOT be not_started since we have snapshots
      expect(repo.upsertPhaseInsight).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: 'not_started' })
      );
    });

    it('calls generatePhaseTexts for non-enhanced mode', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      await useCase.execute('2025-02-03');

      expect(textGen.generatePhaseTexts).toHaveBeenCalled();
      expect(textGen.generateEnhancedPhaseTexts).not.toHaveBeenCalled();
    });

    it('creates project insight after phase insights', async () => {
      const project = createProject({
        phases: [
          { id: 'p1', name: 'Rohbau', start_date: '2025-01-06', end_date: '2025-03-28', budget_hours: 200, actual_hours: 80, planned_hours: 120, description: null },
          { id: 'p2', name: 'Innenausbau', start_date: '2025-02-01', end_date: '2025-04-15', budget_hours: 150, actual_hours: 30, planned_hours: 50, description: null },
        ],
      });
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map([
        ['p1', createLinearSnapshots('p1', 5)],
        ['p2', createLinearSnapshots('p2', 5)],
      ]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      const result = await useCase.execute('2025-02-03');

      expect(result.project_insights_created).toBe(1);
      expect(repo.upsertProjectInsight).toHaveBeenCalled();
    });

    it('calls generateProjectTexts for project insight', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      await useCase.execute('2025-02-03');

      expect(textGen.generateProjectTexts).toHaveBeenCalled();
    });

    it('catches phase-level errors without aborting', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      // Make upsert throw
      (repo.upsertPhaseInsight as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB write failed'));

      // Need text generator to also fail since the error happens in generateTextsAndSave
      (textGen.generatePhaseTexts as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('AI failed'));

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      const result = await useCase.execute('2025-02-03');

      expect(result.errors.length).toBeGreaterThan(0);
      // Use case itself should still succeed
      expect(result.success).toBe(true);
    });

    it('processes phases in batches of 10 for AI calls', async () => {
      // Create project with 12 phases
      const phases = Array.from({ length: 12 }, (_, i) => ({
        id: `p-${i}`,
        name: `Phase ${i}`,
        start_date: '2025-01-06',
        end_date: '2025-03-28',
        budget_hours: 100,
        actual_hours: 40,
        planned_hours: 60,
        description: null,
      }));
      const project = createProject({ phases });

      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map(
        phases.map((p) => [p.id, createLinearSnapshots(p.id, 5)])
      );
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      const result = await useCase.execute('2025-02-03');

      // All 12 phases should get insights
      expect(result.phase_insights_created).toBe(12);
      // generatePhaseTexts called 12 times (in batches of 10+2)
      expect(textGen.generatePhaseTexts).toHaveBeenCalledTimes(12);
    });

    it('uses custom insightDate', async () => {
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(new Map());

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen);
      await useCase.execute('2025-06-15');

      // Snapshot range should be 14 days before 2025-06-15
      expect(repo.getSnapshotsForPhasesInDateRange).toHaveBeenCalledWith(
        ['phase-1'],
        '2025-06-01',
        '2025-06-15'
      );
    });
  });

  describe('enhanced scenarios (with enhanced deps)', () => {
    function createEnhancedDeps() {
      const availabilityAnalyzer = {
        getTenantAvailabilityContext: vi.fn().mockResolvedValue({
          availableUsers: [
            { id: 'u1', name: 'Max', email: 'max@test.de', availableDays: ['2025-02-03'], availableHours: 8, currentUtilization: 50 },
          ],
          overloadedUsers: [],
        }),
      } as unknown as AvailabilityAnalyzer;

      const weatherService: IWeatherService = {
        getForecast: vi.fn().mockResolvedValue([
          { date: new Date('2025-02-03'), weatherDescription: 'Sonnig', tempMin: 2, tempMax: 8, precipitationProbability: 10, windSpeedMax: 15, weatherCode: 0, constructionRating: 'good' as const },
          { date: new Date('2025-02-04'), weatherDescription: 'Bewölkt', tempMin: 1, tempMax: 6, precipitationProbability: 30, windSpeedMax: 20, weatherCode: 3, constructionRating: 'good' as const },
          { date: new Date('2025-02-05'), weatherDescription: 'Regen', tempMin: 3, tempMax: 7, precipitationProbability: 80, windSpeedMax: 25, weatherCode: 61, constructionRating: 'poor' as const },
        ]),
        evaluateForConstruction: vi.fn(),
      };

      const weatherCacheRepository: IWeatherCacheRepository = {
        getForecasts: vi.fn().mockResolvedValue([]),
        saveForecasts: vi.fn().mockResolvedValue(undefined),
        deleteOldEntries: vi.fn().mockResolvedValue(0),
      };

      return { availabilityAnalyzer, weatherService, weatherCacheRepository };
    }

    it('calls generateEnhancedPhaseTexts instead of basic', async () => {
      const enhanced = createEnhancedDeps();
      const project = createProject({ address_lat: 47.07, address_lng: 15.44 });

      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      await useCase.execute('2025-02-03');

      expect(textGen.generateEnhancedPhaseTexts).toHaveBeenCalled();
      expect(textGen.generatePhaseTexts).not.toHaveBeenCalled();
    });

    it('loads availability context from analyzer', async () => {
      const enhanced = createEnhancedDeps();
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      await useCase.execute('2025-02-03');

      expect(enhanced.availabilityAnalyzer.getTenantAvailabilityContext).toHaveBeenCalled();
    });

    it('loads weather for project with coordinates', async () => {
      const enhanced = createEnhancedDeps();
      const project = createProject({ address_lat: 47.07, address_lng: 15.44 });

      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      await useCase.execute('2025-02-03');

      // Cache was empty → getForecast should be called
      expect(enhanced.weatherService.getForecast).toHaveBeenCalled();
      expect(enhanced.weatherCacheRepository.saveForecasts).toHaveBeenCalled();
    });

    it('uses cached weather and skips API call', async () => {
      const enhanced = createEnhancedDeps();
      // Cache has forecasts → no API call needed
      (enhanced.weatherCacheRepository.getForecasts as ReturnType<typeof vi.fn>)
        .mockResolvedValue([
          { date: new Date('2025-02-03'), weatherDescription: 'Cached', tempMin: 0, tempMax: 5, precipitationProbability: 20, windSpeedMax: 10, weatherCode: 0, constructionRating: 'good' as const },
          { date: new Date('2025-02-04'), weatherDescription: 'Cached', tempMin: 1, tempMax: 6, precipitationProbability: 30, windSpeedMax: 15, weatherCode: 3, constructionRating: 'good' as const },
          { date: new Date('2025-02-05'), weatherDescription: 'Cached', tempMin: 2, tempMax: 7, precipitationProbability: 40, windSpeedMax: 20, weatherCode: 3, constructionRating: 'moderate' as const },
        ]);

      const project = createProject({ address_lat: 47.07, address_lng: 15.44 });
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      await useCase.execute('2025-02-03');

      expect(enhanced.weatherService.getForecast).not.toHaveBeenCalled();
    });

    it('stores suggested action from enhanced text generation', async () => {
      const enhanced = createEnhancedDeps();
      const suggestedAction = {
        type: 'assign_user' as const,
        userId: 'u1',
        userName: 'Max',
        availableDays: ['2025-02-03'],
        reason: 'Max hat Kapazität frei',
      };

      (textGen.generateEnhancedPhaseTexts as ReturnType<typeof vi.fn>).mockResolvedValue({
        summary_text: 'Enhanced summary',
        detail_text: 'Enhanced detail',
        recommendation_text: 'Enhanced recommendation',
        suggestedAction,
      });

      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject({ address_lat: 47.07, address_lng: 15.44 })] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      await useCase.execute('2025-02-03');

      expect(repo.upsertPhaseInsight).toHaveBeenCalledWith(
        expect.objectContaining({
          suggested_action: suggestedAction,
        })
      );
    });

    it('handles availability error gracefully', async () => {
      const enhanced = createEnhancedDeps();
      (enhanced.availabilityAnalyzer.getTenantAvailabilityContext as ReturnType<typeof vi.fn>)
        .mockRejectedValue(new Error('Availability DB error'));

      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [createProject()] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      const result = await useCase.execute('2025-02-03');

      // Should still create insight (without availability data)
      expect(result.phase_insights_created).toBe(1);
      expect(result.success).toBe(true);
    });

    it('handles weather error gracefully', async () => {
      const enhanced = createEnhancedDeps();
      (enhanced.weatherService.getForecast as ReturnType<typeof vi.fn>)
        .mockRejectedValue(new Error('Weather API down'));

      const project = createProject({ address_lat: 47.07, address_lng: 15.44 });
      const supabase = createMockSupabase({
        tenants: [{ id: 'tenant-1' }],
        projectsByTenant: { 'tenant-1': [project] },
      });

      const snapshotMap = new Map([['phase-1', createLinearSnapshots('phase-1', 5)]]);
      (repo.getSnapshotsForPhasesInDateRange as ReturnType<typeof vi.fn>)
        .mockResolvedValue(snapshotMap);

      const useCase = new GenerateInsightsUseCase(repo, supabase, textGen, enhanced);
      const result = await useCase.execute('2025-02-03');

      // Should still create insight (without weather data)
      expect(result.phase_insights_created).toBe(1);
      expect(result.success).toBe(true);
    });
  });
});
