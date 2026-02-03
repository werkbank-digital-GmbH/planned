import type { SupabaseClient } from '@supabase/supabase-js';

import { BurnRateCalculator } from '@/domain/analytics/BurnRateCalculator';
import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import { ProgressionCalculator } from '@/domain/analytics/ProgressionCalculator';
import { ProjectInsightAggregator } from '@/domain/analytics/ProjectInsightAggregator';
import type { PhaseInsight, ProjectInsight, SuggestedAction } from '@/domain/analytics/types';

import type { IWeatherCacheRepository } from '@/application/ports/repositories/IWeatherCacheRepository';
import type {
  EnhancedPhaseTextInput,
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

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert Insights für alle aktiven Phasen und Projekte.
 *
 * Wird vom Cron-Job täglich um 05:15 UTC aufgerufen (nach den Snapshots).
 *
 * Für jede Phase:
 * 1. Snapshots der letzten 14 Tage laden
 * 2. Burn Rate berechnen
 * 3. Progression berechnen
 * 4. KI-Texte generieren (oder Fallback)
 * 5. Phase-Insight speichern
 *
 * Für jedes Projekt:
 * 1. Phase-Insights aggregieren
 * 2. Project-Insight mit KI-Texten erstellen
 * 3. Project-Insight speichern
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
   */
  private async processTenant(
    tenantId: string,
    today: string,
    result: GenerateInsightsResult
  ): Promise<void> {
    // Projekte mit Phasen laden
    const projects = await this.getProjectsWithPhases(tenantId);

    for (const project of projects) {
      result.projects_processed++;
      const phaseInsights: PhaseInsight[] = [];
      const phaseDeadlines = new Map<string, Date | null>();

      // Für jede Phase ein Insight erstellen
      for (const phase of project.phases) {
        result.phases_processed++;

        try {
          const insight = await this.processPhase(
            tenantId,
            project,
            phase,
            today
          );

          if (insight) {
            phaseInsights.push(insight);
            result.phase_insights_created++;
          }

          // Deadline speichern für Project-Aggregation
          phaseDeadlines.set(
            phase.id,
            phase.end_date ? new Date(phase.end_date) : null
          );
        } catch (error) {
          result.errors.push(
            `Phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }

      // Project-Insight erstellen
      try {
        if (phaseInsights.length > 0) {
          await this.createProjectInsight(
            tenantId,
            project,
            phaseInsights,
            phaseDeadlines,
            today
          );
          result.project_insights_created++;
        }
      } catch (error) {
        result.errors.push(
          `Project ${project.id}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }
  }

  /**
   * Verarbeitet eine einzelne Phase und erstellt ein Insight.
   */
  private async processPhase(
    tenantId: string,
    project: ProjectWithPhases,
    phase: PhaseData,
    today: string
  ): Promise<PhaseInsight | null> {
    // Snapshots der letzten 14 Tage laden
    const twoWeeksAgo = this.subtractDays(today, 14);
    const snapshots = await this.analyticsRepository.getSnapshotsForDateRange(
      phase.id,
      twoWeeksAgo,
      today
    );

    // Neuester Snapshot für aktuelle Werte
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    if (!latestSnapshot) {
      // Keine Snapshots vorhanden, Insight mit not_started Status erstellen
      return this.createNotStartedInsight(tenantId, phase, project.name, today);
    }

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

    // Texte generieren - mit oder ohne Enhanced Context
    let suggestedAction: SuggestedAction | null = null;
    let texts;

    if (this.enhancedDeps) {
      // Enhanced Mode: Mit Verfügbarkeit und Wetter
      const enhancedInput = await this.buildEnhancedInput(
        tenantId,
        project,
        phase,
        baseTextInput
      );
      const enhancedTexts = await this.textGenerator.generateEnhancedPhaseTexts(enhancedInput);
      texts = enhancedTexts;
      suggestedAction = enhancedTexts.suggestedAction ?? null;
    } else {
      // Standard Mode: Nur Basis-Texte
      texts = await this.textGenerator.generatePhaseTexts(baseTextInput);
    }

    // Insight erstellen und speichern
    const insight: Omit<PhaseInsight, 'id' | 'created_at'> = {
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
      summary_text: texts.summary_text,
      detail_text: texts.detail_text,
      recommendation_text: texts.recommendation_text,
      data_quality: dataQuality,
      data_points_count: snapshots.length,
      suggested_action: suggestedAction,
    };

    return this.analyticsRepository.upsertPhaseInsight(insight);
  }

  /**
   * Baut den erweiterten Input für die KI-Textgenerierung.
   */
  private async buildEnhancedInput(
    tenantId: string,
    project: ProjectWithPhases,
    phase: PhaseData,
    baseInput: PhaseTextInput
  ): Promise<EnhancedPhaseTextInput> {
    const enhancedInput: EnhancedPhaseTextInput = {
      ...baseInput,
      projectAddress: project.address ?? undefined,
      projectDescription: phase.description?.slice(0, 300) ?? undefined,
    };

    // Verfügbarkeit laden (wenn Phase-Zeitraum bekannt)
    if (this.enhancedDeps && phase.start_date && phase.end_date) {
      try {
        const availableUsers = await this.enhancedDeps.availabilityAnalyzer.findAvailableUsers(
          tenantId,
          new Date(phase.start_date),
          new Date(phase.end_date),
          8 // min 8h verfügbar
        );

        const overloadedUsers = await this.enhancedDeps.availabilityAnalyzer.findOverloadedUsers(
          tenantId,
          new Date(phase.start_date),
          new Date(phase.end_date)
        );

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
      } catch {
        // Fehler bei Verfügbarkeit ignorieren, nicht kritisch
      }
    }

    // Wetter laden (wenn Koordinaten vorhanden)
    if (this.enhancedDeps && project.address_lat && project.address_lng) {
      try {
        const weatherForecast = await this.getWeatherContext(
          project.address_lat,
          project.address_lng
        );
        if (weatherForecast) {
          enhancedInput.weatherForecast = weatherForecast;
        }
      } catch {
        // Fehler bei Wetter ignorieren, nicht kritisch
      }
    }

    return enhancedInput;
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
      suggested_action: null, // Will be populated by D7-2
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
}
