import type { SupabaseClient } from '@supabase/supabase-js';

import { BurnRateCalculator } from '@/domain/analytics/BurnRateCalculator';
import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import { ProgressionCalculator } from '@/domain/analytics/ProgressionCalculator';
import { ProjectInsightAggregator } from '@/domain/analytics/ProjectInsightAggregator';
import type {
  AvailableUser,
  OverloadedUser,
  PhaseInsight,
  PhaseSnapshot,
  ProjectInsight,
  SuggestedAction,
} from '@/domain/analytics/types';

import type { IWeatherCacheRepository } from '@/application/ports/repositories/IWeatherCacheRepository';
import type {
  EnhancedPhaseTextInput,
  GeneratedTexts,
  GeneratedTextsWithAction,
  IInsightTextGenerator,
  PhaseTextInput,
  ProjectTextInput,
  WeatherForecastContext,
} from '@/application/ports/services/IInsightTextGenerator';
import type { IWeatherService } from '@/application/ports/services/IWeatherService';
import type { AvailabilityAnalyzer } from '@/application/services/AvailabilityAnalyzer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectWithPhases {
  id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  address_lat?: number | null;
  address_lng?: number | null;
  phases: PhaseData[];
}

interface PhaseData {
  id: string;
  name: string;
  end_date: string | null;
  start_date: string | null;
  budget_hours: number | null;
  actual_hours: number | null;
  planned_hours: number | null;
  description: string | null;
}

interface EnhancedDependencies {
  availabilityAnalyzer: AvailabilityAnalyzer;
  weatherService: IWeatherService;
  weatherCacheRepository: IWeatherCacheRepository;
}

export interface GenerateInsightsResult {
  success: boolean;
  tenants_processed: number;
  phases_processed: number;
  phase_insights_created: number;
  projects_processed: number;
  project_insights_created: number;
  errors: string[];
}

/**
 * Vorberechnetes Insight für eine Phase (noch ohne KI-Texte).
 */
interface PreparedPhaseInsight {
  phase: PhaseData;
  project: ProjectWithPhases;
  snapshots: PhaseSnapshot[];
  baseTextInput: PhaseTextInput;
  enhancedInput?: EnhancedPhaseTextInput;
  insightData: Omit<PhaseInsight, 'id' | 'created_at' | 'summary_text' | 'detail_text' | 'recommendation_text' | 'suggested_action'>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Max parallel Claude API Calls pro Batch */
const AI_BATCH_SIZE = 10;

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert Insights für alle aktiven Phasen und Projekte.
 *
 * Wird vom Cron-Job täglich um 05:15 UTC aufgerufen (nach den Snapshots).
 *
 * Performance-Optimierungen:
 * - Snapshots werden batch-geladen (1 Query statt N)
 * - Verfügbarkeit wird einmal pro Tenant geladen (statt pro Phase)
 * - Wetter wird pro Koordinaten-Paar gecacht (statt pro Phase)
 * - Claude API Calls laufen parallel in Batches von 10
 */
export class GenerateInsightsUseCase {
  private readonly burnRateCalculator = new BurnRateCalculator();
  private readonly progressionCalculator = new ProgressionCalculator();
  private readonly projectAggregator = new ProjectInsightAggregator();
  private readonly enhancedDeps?: EnhancedDependencies;

  constructor(
    private readonly analyticsRepository: IAnalyticsRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly supabase: SupabaseClient<any>,
    private readonly textGenerator: IInsightTextGenerator,
    enhancedDeps?: EnhancedDependencies
  ) {
    this.enhancedDeps = enhancedDeps;
  }

  async execute(insightDate?: string): Promise<GenerateInsightsResult> {
    const today = insightDate || new Date().toISOString().split('T')[0];
    const result: GenerateInsightsResult = {
      success: true,
      tenants_processed: 0,
      phases_processed: 0,
      phase_insights_created: 0,
      projects_processed: 0,
      project_insights_created: 0,
      errors: [],
    };

    try {
      // 1. Alle Tenants laden
      const tenants = await this.getAllTenants();
      result.tenants_processed = tenants.length;

      // 2. Für jeden Tenant verarbeiten
      for (const tenant of tenants) {
        try {
          await this.processTenant(tenant.id, today, result);
        } catch (error) {
          const message = `Tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(message);
          console.error('[GenerateInsightsUseCase]', message);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Verarbeitet einen einzelnen Tenant.
   *
   * Optimiert: Lädt Snapshots, Availability und Weather einmal für alle Phasen.
   * Dann werden KI-Texte parallel in Batches generiert.
   */
  private async processTenant(
    tenantId: string,
    today: string,
    result: GenerateInsightsResult
  ): Promise<void> {
    // 1. Projekte mit Phasen laden (1 Query dank Supabase Join)
    const projects = await this.getProjectsWithPhases(tenantId);
    if (projects.length === 0) return;

    // 2. Alle Phase-IDs sammeln
    const allPhases: { phase: PhaseData; project: ProjectWithPhases }[] = [];
    for (const project of projects) {
      for (const phase of project.phases) {
        allPhases.push({ phase, project });
      }
    }

    const allPhaseIds = allPhases.map((p) => p.phase.id);

    // 3. Batch: Alle Snapshots in einem Query laden
    const twoWeeksAgo = this.subtractDays(today, 14);
    const snapshotsByPhase = await this.analyticsRepository.getSnapshotsForPhasesInDateRange(
      allPhaseIds,
      twoWeeksAgo,
      today
    );

    // 4. Batch: Tenant-weite Verfügbarkeit + Wetter einmal laden
    let tenantAvailability: {
      availableUsers: AvailableUser[];
      overloadedUsers: OverloadedUser[];
    } | null = null;

    const weatherByCoords = new Map<string, WeatherForecastContext | null>();

    if (this.enhancedDeps) {
      // Verfügbarkeit: Gesamtzeitraum aller Phasen ermitteln
      const { earliest, latest } = this.getDateRange(allPhases.map((p) => p.phase));

      if (earliest && latest) {
        try {
          const context = await this.enhancedDeps.availabilityAnalyzer.getTenantAvailabilityContext(
            tenantId,
            earliest,
            latest,
            8
          );
          tenantAvailability = {
            availableUsers: context.availableUsers,
            overloadedUsers: context.overloadedUsers,
          };
        } catch (error) {
          console.warn('[Insights] Availability check failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Wetter: Pro eindeutigen Koordinaten-Paar einmal laden
      for (const project of projects) {
        if (project.address_lat && project.address_lng) {
          const coordKey = `${project.address_lat.toFixed(2)},${project.address_lng.toFixed(2)}`;
          if (!weatherByCoords.has(coordKey)) {
            try {
              const weather = await this.getWeatherContext(
                project.address_lat,
                project.address_lng
              );
              weatherByCoords.set(coordKey, weather);
            } catch (error) {
              console.warn('[Insights] Weather fetch failed:', error instanceof Error ? error.message : 'Unknown error');
              weatherByCoords.set(coordKey, null);
            }
          }
        }
      }
    }

    // 5. Phase 1: Alle Insights vorberechnen (CPU-bound, schnell)
    const preparedInsights: PreparedPhaseInsight[] = [];
    const notStartedPhases: { phase: PhaseData; project: ProjectWithPhases }[] = [];

    for (const { phase, project } of allPhases) {
      result.phases_processed++;
      const snapshots = snapshotsByPhase.get(phase.id) || [];

      if (snapshots.length === 0) {
        notStartedPhases.push({ phase, project });
        continue;
      }

      try {
        const prepared = this.preparePhaseInsight(
          tenantId,
          project,
          phase,
          snapshots,
          today,
          tenantAvailability,
          weatherByCoords
        );
        preparedInsights.push(prepared);
      } catch (error) {
        result.errors.push(
          `Phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    // 6. Phase 2: KI-Texte parallel in Batches generieren
    const phaseInsightsByProject = new Map<string, PhaseInsight[]>();

    // 6a. Not-started Phasen (kein API-Call nötig, regelbasierte Texte)
    for (const { phase, project } of notStartedPhases) {
      try {
        const insight = await this.createNotStartedInsight(tenantId, phase, project.name, today);
        const projectInsights = phaseInsightsByProject.get(project.id) || [];
        projectInsights.push(insight);
        phaseInsightsByProject.set(project.id, projectInsights);
        result.phase_insights_created++;
      } catch (error) {
        result.errors.push(
          `Phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    // 6b. Aktive Phasen in Batches verarbeiten (parallel Claude API Calls)
    for (let i = 0; i < preparedInsights.length; i += AI_BATCH_SIZE) {
      const batch = preparedInsights.slice(i, i + AI_BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((prepared) => this.generateTextsAndSave(prepared, today))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const batchResult = batchResults[j];
        const prepared = batch[j];

        if (batchResult.status === 'fulfilled' && batchResult.value) {
          const projectInsights = phaseInsightsByProject.get(prepared.project.id) || [];
          projectInsights.push(batchResult.value);
          phaseInsightsByProject.set(prepared.project.id, projectInsights);
          result.phase_insights_created++;
        } else if (batchResult.status === 'rejected') {
          result.errors.push(
            `Phase ${prepared.phase.id}: ${batchResult.reason instanceof Error ? batchResult.reason.message : 'Unknown'}`
          );
        }
      }
    }

    // 7. Project-Insights erstellen (nach allen Phase-Insights)
    for (const project of projects) {
      result.projects_processed++;
      const phaseInsights = phaseInsightsByProject.get(project.id) || [];

      if (phaseInsights.length > 0) {
        try {
          const phaseDeadlines = new Map<string, Date | null>();
          for (const phase of project.phases) {
            phaseDeadlines.set(phase.id, phase.end_date ? new Date(phase.end_date) : null);
          }

          await this.createProjectInsight(
            tenantId,
            project,
            phaseInsights,
            phaseDeadlines,
            today
          );
          result.project_insights_created++;
        } catch (error) {
          result.errors.push(
            `Project ${project.id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    }
  }

  /**
   * Berechnet alle numerischen Werte für eine Phase (ohne KI-Texte).
   */
  private preparePhaseInsight(
    tenantId: string,
    project: ProjectWithPhases,
    phase: PhaseData,
    snapshots: PhaseSnapshot[],
    today: string,
    tenantAvailability: { availableUsers: AvailableUser[]; overloadedUsers: OverloadedUser[] } | null,
    weatherByCoords: Map<string, WeatherForecastContext | null>
  ): PreparedPhaseInsight {
    const latestSnapshot = snapshots[snapshots.length - 1];

    // Burn Rate berechnen
    const burnRate = this.burnRateCalculator.calculate(snapshots);

    // Deadline als Date
    const deadline = phase.end_date ? new Date(phase.end_date) : null;

    // Progression berechnen
    const progression = this.progressionCalculator.calculate(
      latestSnapshot,
      burnRate,
      deadline,
      new Date(today)
    );

    // Status bestimmen
    const hasStarted = latestSnapshot.ist_hours > 0;
    const isCompleted = progression.progressPercent >= 100;
    const status = this.progressionCalculator.determineStatus(
      progression.progressPercent,
      progression.deadlineDeltaIst,
      hasStarted,
      isCompleted
    );

    // Datenqualität
    const dataQuality = this.progressionCalculator.determineDataQuality(
      burnRate?.istDataPoints || 0
    );

    // Basis-Input für Texte
    const baseTextInput: PhaseTextInput = {
      phaseName: phase.name,
      projectName: project.name,
      deadline: phase.end_date,
      daysUntilDeadline: progression.daysUntilDeadline,
      sollHours: latestSnapshot.soll_hours,
      istHours: latestSnapshot.ist_hours,
      remainingHours: progression.remainingHours,
      planHours: latestSnapshot.plan_hours,
      progressPercent: progression.progressPercent,
      burnRateIst: burnRate?.istBurnRate || null,
      burnRateTrend: burnRate?.istTrend || null,
      status,
      deadlineDeltaIst: progression.deadlineDeltaIst,
    };

    // Enhanced Input aufbauen (synchron, alle Daten sind bereits geladen)
    let enhancedInput: EnhancedPhaseTextInput | undefined;

    if (this.enhancedDeps) {
      enhancedInput = {
        ...baseTextInput,
        projectAddress: project.address ?? undefined,
        projectDescription: phase.description?.slice(0, 300) ?? undefined,
      };

      // Verfügbarkeit aus Tenant-Cache
      if (tenantAvailability) {
        const { availableUsers, overloadedUsers } = tenantAvailability;
        if (availableUsers.length > 0 || overloadedUsers.length > 0) {
          enhancedInput.availability = {
            availableUsers: availableUsers.slice(0, 5).map((u) => ({
              id: u.id,
              name: u.name,
              availableDays: u.availableDays.slice(0, 10),
              currentUtilization: u.currentUtilization,
            })),
            overloadedUsers: overloadedUsers.slice(0, 3).map((u) => ({
              id: u.id,
              name: u.name,
              utilizationPercent: u.utilizationPercent,
            })),
          };
        }
      }

      // Wetter aus Koordinaten-Cache
      if (project.address_lat && project.address_lng) {
        const coordKey = `${project.address_lat.toFixed(2)},${project.address_lng.toFixed(2)}`;
        const weather = weatherByCoords.get(coordKey);
        if (weather) {
          enhancedInput.weatherForecast = weather;
        }
      }
    }

    const insightData: PreparedPhaseInsight['insightData'] = {
      tenant_id: tenantId,
      phase_id: phase.id,
      insight_date: today,
      burn_rate_ist: burnRate?.istBurnRate || null,
      burn_rate_ist_trend: burnRate?.istTrend || null,
      days_remaining_ist: progression.daysRemainingIst,
      completion_date_ist: progression.completionDateIst?.toISOString().split('T')[0] || null,
      deadline_delta_ist: progression.deadlineDeltaIst,
      burn_rate_plan: burnRate?.planBurnRate || null,
      days_remaining_plan: progression.daysRemainingPlan,
      completion_date_plan: progression.completionDatePlan?.toISOString().split('T')[0] || null,
      deadline_delta_plan: progression.deadlineDeltaPlan,
      remaining_hours: progression.remainingHours,
      progress_percent: progression.progressPercent,
      capacity_gap_hours: progression.capacityGapHours,
      capacity_gap_days: progression.capacityGapDays,
      status,
      data_quality: dataQuality,
      data_points_count: snapshots.length,
    };

    return { phase, project, snapshots, baseTextInput, enhancedInput, insightData };
  }

  /**
   * Generiert KI-Texte für ein vorberechnetes Insight und speichert es.
   */
  private async generateTextsAndSave(
    prepared: PreparedPhaseInsight,
    _today: string
  ): Promise<PhaseInsight> {
    let suggestedAction: SuggestedAction | null = null;
    let texts: GeneratedTexts | GeneratedTextsWithAction;

    if (prepared.enhancedInput) {
      const enhancedTexts = await this.textGenerator.generateEnhancedPhaseTexts(
        prepared.enhancedInput
      );
      texts = enhancedTexts;
      suggestedAction = enhancedTexts.suggestedAction ?? null;
    } else {
      texts = await this.textGenerator.generatePhaseTexts(prepared.baseTextInput);
    }

    const insight: Omit<PhaseInsight, 'id' | 'created_at'> = {
      ...prepared.insightData,
      summary_text: texts.summary_text,
      detail_text: texts.detail_text,
      recommendation_text: texts.recommendation_text,
      suggested_action: suggestedAction,
    };

    return this.analyticsRepository.upsertPhaseInsight(insight);
  }

  /**
   * Holt den Wetter-Kontext für die nächsten 3 Tage.
   */
  private async getWeatherContext(
    lat: number,
    lng: number
  ): Promise<WeatherForecastContext | null> {
    if (!this.enhancedDeps) return null;

    // Prüfe Cache für die nächsten 3 Tage
    const today = new Date();
    const dates = [0, 1, 2].map((d) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date;
    });

    let forecasts = await this.enhancedDeps.weatherCacheRepository.getForecasts(lat, lng, dates);

    // Wenn Cache unvollständig, neu laden
    if (forecasts.length < 3) {
      forecasts = await this.enhancedDeps.weatherService.getForecast(lat, lng, 7);

      if (forecasts.length > 0) {
        // Cache speichern
        await this.enhancedDeps.weatherCacheRepository.saveForecasts(lat, lng, forecasts);
      }
    }

    if (forecasts.length === 0) return null;

    return this.mapForecastToContext(forecasts.slice(0, 3));
  }

  /**
   * Mappt WeatherForecast[] auf WeatherForecastContext für die Textgenerierung.
   */
  private mapForecastToContext(
    forecasts: Array<{
      date: Date;
      weatherDescription: string;
      tempMin: number;
      tempMax: number;
      precipitationProbability: number;
      windSpeedMax: number;
    }>
  ): WeatherForecastContext {
    let hasRainRisk = false;
    let hasFrostRisk = false;
    let hasWindRisk = false;

    const next3Days = forecasts.map((d) => {
      if (d.precipitationProbability > 50) hasRainRisk = true;
      if (d.tempMin < 0) hasFrostRisk = true;
      if (d.windSpeedMax > 50) hasWindRisk = true;

      // Evaluate construction rating
      let constructionRating: 'good' | 'moderate' | 'poor' = 'good';
      if (d.precipitationProbability > 70 || d.tempMin < 0 || d.windSpeedMax > 50) {
        constructionRating = 'poor';
      } else if (d.precipitationProbability > 40 || d.tempMin < 5 || d.windSpeedMax > 30) {
        constructionRating = 'moderate';
      }

      return {
        date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
        description: d.weatherDescription || 'Keine Daten',
        tempMin: d.tempMin ?? 0,
        tempMax: d.tempMax ?? 0,
        precipitationProbability: d.precipitationProbability ?? 0,
        windSpeedMax: d.windSpeedMax ?? 0,
        constructionRating,
      };
    });

    return {
      next3Days,
      hasRainRisk,
      hasFrostRisk,
      hasWindRisk,
    };
  }

  /**
   * Erstellt ein Insight für eine noch nicht gestartete Phase.
   */
  private async createNotStartedInsight(
    tenantId: string,
    phase: PhaseData,
    projectName: string,
    today: string
  ): Promise<PhaseInsight> {
    const texts = await this.textGenerator.generatePhaseTexts({
      phaseName: phase.name,
      projectName,
      deadline: phase.end_date,
      daysUntilDeadline: phase.end_date
        ? this.progressionCalculator.workingDaysBetween(new Date(today), new Date(phase.end_date))
        : null,
      sollHours: phase.budget_hours || 0,
      istHours: 0,
      remainingHours: phase.budget_hours || 0,
      planHours: phase.planned_hours || 0,
      progressPercent: 0,
      burnRateIst: null,
      burnRateTrend: null,
      status: 'not_started',
      deadlineDeltaIst: null,
    });

    const insight: Omit<PhaseInsight, 'id' | 'created_at'> = {
      tenant_id: tenantId,
      phase_id: phase.id,
      insight_date: today,
      burn_rate_ist: null,
      burn_rate_ist_trend: null,
      days_remaining_ist: null,
      completion_date_ist: null,
      deadline_delta_ist: null,
      burn_rate_plan: null,
      days_remaining_plan: null,
      completion_date_plan: null,
      deadline_delta_plan: null,
      remaining_hours: phase.budget_hours || 0,
      progress_percent: 0,
      capacity_gap_hours: null,
      capacity_gap_days: null,
      status: 'not_started',
      summary_text: texts.summary_text,
      detail_text: texts.detail_text,
      recommendation_text: texts.recommendation_text,
      data_quality: 'insufficient',
      data_points_count: 0,
      suggested_action: null,
    };

    return this.analyticsRepository.upsertPhaseInsight(insight);
  }

  /**
   * Erstellt ein Project-Insight aus den Phase-Insights.
   */
  private async createProjectInsight(
    tenantId: string,
    project: ProjectWithPhases,
    phaseInsights: PhaseInsight[],
    phaseDeadlines: Map<string, Date | null>,
    today: string
  ): Promise<void> {
    // Aggregieren
    const aggregated = this.projectAggregator.aggregate(
      {
        tenantId,
        projectId: project.id,
        projectName: project.name,
        phaseInsights,
        phaseDeadlines,
      },
      today
    );

    // KI-Texte für Projekt generieren
    const textInput: ProjectTextInput = {
      projectName: project.name,
      totalSollHours: aggregated.total_soll_hours || 0,
      totalIstHours: aggregated.total_ist_hours || 0,
      totalRemainingHours: aggregated.total_remaining_hours || 0,
      overallProgressPercent: aggregated.overall_progress_percent || 0,
      phasesCount: aggregated.phases_count || 0,
      phasesOnTrack: aggregated.phases_on_track || 0,
      phasesAtRisk: aggregated.phases_at_risk || 0,
      phasesBehind: aggregated.phases_behind || 0,
      phasesCompleted: aggregated.phases_completed || 0,
      status: aggregated.status,
      projectedCompletionDate: aggregated.projected_completion_date,
      projectDeadlineDelta: aggregated.project_deadline_delta,
    };

    const texts = await this.textGenerator.generateProjectTexts(textInput);

    // Insight mit Texten speichern
    const projectInsight: Omit<ProjectInsight, 'id' | 'created_at'> = {
      ...aggregated,
      summary_text: texts.summary_text,
      detail_text: texts.detail_text,
      recommendation_text: texts.recommendation_text,
    };

    await this.analyticsRepository.upsertProjectInsight(projectInsight);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DATABASE QUERIES
  // ═══════════════════════════════════════════════════════════════════════

  private async getAllTenants(): Promise<{ id: string }[]> {
    const { data, error } = await this.supabase.from('tenants').select('id');
    if (error) throw error;
    return data || [];
  }

  private async getProjectsWithPhases(tenantId: string): Promise<ProjectWithPhases[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select(
        `
        id,
        tenant_id,
        name,
        address,
        address_lat,
        address_lng,
        project_phases!inner (
          id,
          name,
          start_date,
          end_date,
          budget_hours,
          actual_hours,
          planned_hours,
          description
        )
      `
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((p: any) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      name: p.name,
      address: p.address,
      address_lat: p.address_lat,
      address_lng: p.address_lng,
      phases: p.project_phases.map((ph: PhaseData) => ({
        id: ph.id,
        name: ph.name,
        start_date: ph.start_date,
        end_date: ph.end_date,
        budget_hours: ph.budget_hours,
        actual_hours: ph.actual_hours,
        planned_hours: ph.planned_hours,
        description: ph.description,
      })),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private subtractDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Ermittelt den frühesten Start und spätesten Ende aller Phasen.
   */
  private getDateRange(phases: PhaseData[]): { earliest: Date | null; latest: Date | null } {
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const phase of phases) {
      if (phase.start_date) {
        const start = new Date(phase.start_date);
        if (!earliest || start < earliest) earliest = start;
      }
      if (phase.end_date) {
        const end = new Date(phase.end_date);
        if (!latest || end > latest) latest = end;
      }
    }

    return { earliest, latest };
  }
}
