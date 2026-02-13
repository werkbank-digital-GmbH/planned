import { describe, it, expect } from 'vitest';

import { ProjectInsightAggregator } from '../ProjectInsightAggregator';
import type { ProjectAggregationInput } from '../ProjectInsightAggregator';
import { createPhaseInsight } from './test-helpers';

describe('ProjectInsightAggregator', () => {
  const agg = new ProjectInsightAggregator();
  const insightDate = '2025-02-03';

  function createInput(
    overrides: Partial<ProjectAggregationInput> = {}
  ): ProjectAggregationInput {
    return {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      projectName: 'Holzhaus Test',
      phaseInsights: [],
      phaseDeadlines: new Map(),
      ...overrides,
    };
  }

  describe('aggregate()', () => {
    it('returns minimal insight for empty phases', () => {
      const result = agg.aggregate(createInput(), insightDate);

      expect(result.status).toBe('unknown');
      expect(result.phases_count).toBe(0);
      expect(result.summary_text).toBe('Keine aktiven Phasen vorhanden.');
      expect(result.total_remaining_hours).toBe(0);
    });

    it('aggregates one phase at 50% progress', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({
            phase_id: 'p1',
            remaining_hours: 50,
            progress_percent: 50,
            status: 'on_track',
          }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.total_remaining_hours).toBe(50);
      expect(result.phases_count).toBe(1);
      expect(result.phases_on_track).toBe(1);
    });

    it('uses worst status from mixed phases', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'on_track', remaining_hours: 30, progress_percent: 70 }),
          createPhaseInsight({ phase_id: 'p2', status: 'behind', remaining_hours: 50, progress_percent: 50 }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.total_remaining_hours).toBe(80);
      expect(result.status).toBe('behind');
    });

    it('back-calculates SOLL from remaining and progress', () => {
      // remaining=60, progress=40% → SOLL = 60/(1-0.4) = 100, IST = 40
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ remaining_hours: 60, progress_percent: 40 }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.total_soll_hours).toBe(100);
      expect(result.total_ist_hours).toBe(40);
    });

    it('handles 100% progress without division by zero', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ remaining_hours: 0, progress_percent: 100, status: 'completed' }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.total_remaining_hours).toBe(0);
      expect(result.phases_completed).toBe(1);
    });

    it('counts phase statuses correctly', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'on_track', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', status: 'ahead', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p3', status: 'at_risk', remaining_hours: 10, progress_percent: 50 }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      // on_track + ahead → phases_on_track
      expect(result.phases_on_track).toBe(2);
      expect(result.phases_at_risk).toBe(1);
      expect(result.phases_behind).toBe(0);
    });

    it('counts behind + critical together in phases_behind', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'behind', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', status: 'critical', remaining_hours: 10, progress_percent: 50 }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.phases_behind).toBe(2);
    });

    it('finds the latest deadline', () => {
      const deadlines = new Map<string, Date | null>([
        ['p1', new Date('2025-02-14')],
        ['p2', new Date('2025-03-01')],
      ]);
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', remaining_hours: 10, progress_percent: 50 }),
        ],
        phaseDeadlines: deadlines,
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.latest_phase_deadline).toBe('2025-03-01');
    });

    it('finds projected completion from latest completion_date_ist', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', completion_date_ist: '2025-02-14', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', completion_date_ist: '2025-03-05', remaining_hours: 10, progress_percent: 50 }),
        ],
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.projected_completion_date).toBe('2025-03-05');
    });

    it('calculates project deadline delta', () => {
      const deadlines = new Map<string, Date | null>([
        ['p1', new Date('2025-03-01')],
      ]);
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({
            phase_id: 'p1',
            completion_date_ist: '2025-03-05',
            remaining_hours: 10,
            progress_percent: 50,
          }),
        ],
        phaseDeadlines: deadlines,
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.project_deadline_delta).toBe(4);
    });

    it('returns null delta without projected completion', () => {
      const deadlines = new Map<string, Date | null>([
        ['p1', new Date('2025-03-01')],
      ]);
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({
            phase_id: 'p1',
            completion_date_ist: null,
            remaining_hours: 10,
            progress_percent: 50,
          }),
        ],
        phaseDeadlines: deadlines,
      });

      const result = agg.aggregate(input, insightDate);

      expect(result.projected_completion_date).toBeNull();
      expect(result.project_deadline_delta).toBeNull();
    });
  });

  describe('determineProjectStatus() via aggregate()', () => {
    it('critical wins over other statuses', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'on_track', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', status: 'critical', remaining_hours: 10, progress_percent: 50 }),
        ],
      });
      expect(agg.aggregate(input, insightDate).status).toBe('critical');
    });

    it('behind wins over at_risk', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'at_risk', remaining_hours: 10, progress_percent: 50 }),
          createPhaseInsight({ phase_id: 'p2', status: 'behind', remaining_hours: 10, progress_percent: 50 }),
        ],
      });
      expect(agg.aggregate(input, insightDate).status).toBe('behind');
    });

    it('all completed → completed', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'completed', remaining_hours: 0, progress_percent: 100 }),
          createPhaseInsight({ phase_id: 'p2', status: 'completed', remaining_hours: 0, progress_percent: 100 }),
        ],
      });
      expect(agg.aggregate(input, insightDate).status).toBe('completed');
    });

    it('all not_started → not_started', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'not_started', remaining_hours: 100, progress_percent: 0 }),
          createPhaseInsight({ phase_id: 'p2', status: 'not_started', remaining_hours: 50, progress_percent: 0 }),
        ],
      });
      expect(agg.aggregate(input, insightDate).status).toBe('not_started');
    });

    it('not_started wins over completed (per priority)', () => {
      const input = createInput({
        phaseInsights: [
          createPhaseInsight({ phase_id: 'p1', status: 'not_started', remaining_hours: 100, progress_percent: 0 }),
          createPhaseInsight({ phase_id: 'p2', status: 'completed', remaining_hours: 0, progress_percent: 100 }),
        ],
      });
      expect(agg.aggregate(input, insightDate).status).toBe('not_started');
    });
  });
});
