import type {
  BurnRateTrend,
  InsightStatus,
  SuggestedAction,
} from '@/domain/analytics/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GeneratedTexts {
  summary_text: string;
  detail_text: string;
  recommendation_text: string;
}

export interface GeneratedTextsWithAction extends GeneratedTexts {
  suggestedAction?: SuggestedAction;
}

export interface PhaseTextInput {
  phaseName: string;
  projectName: string;
  deadline: string | null;
  daysUntilDeadline: number | null;
  sollHours: number;
  istHours: number;
  remainingHours: number;
  planHours: number;
  progressPercent: number;
  burnRateIst: number | null;
  burnRateTrend: BurnRateTrend | null;
  status: InsightStatus;
  deadlineDeltaIst: number | null;
}

export interface ProjectTextInput {
  projectName: string;
  totalSollHours: number;
  totalIstHours: number;
  totalRemainingHours: number;
  overallProgressPercent: number;
  phasesCount: number;
  phasesOnTrack: number;
  phasesAtRisk: number;
  phasesBehind: number;
  phasesCompleted: number;
  status: InsightStatus;
  projectedCompletionDate: string | null;
  projectDeadlineDelta: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED TYPES (D7)
// ═══════════════════════════════════════════════════════════════════════════

export interface WeatherDayForecast {
  date: string;
  description: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  windSpeedMax: number;
  constructionRating: 'good' | 'moderate' | 'poor';
}

export interface WeatherForecastContext {
  next3Days: WeatherDayForecast[];
  hasRainRisk: boolean;
  hasFrostRisk: boolean;
  hasWindRisk: boolean;
}

export interface AvailabilityUserContext {
  id: string;
  name: string;
  availableDays: string[];
  currentUtilization: number;
}

export interface OverloadedUserContext {
  id: string;
  name: string;
  utilizationPercent: number;
}

export interface AvailabilityInputContext {
  availableUsers: AvailabilityUserContext[];
  overloadedUsers: OverloadedUserContext[];
}

export interface EnhancedPhaseTextInput extends PhaseTextInput {
  // Projekt-Kontext
  projectAddress?: string;
  projectDescription?: string;

  // Wetter (aus D6)
  weatherForecast?: WeatherForecastContext;

  // Verfügbare Ressourcen
  availability?: AvailabilityInputContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface für den Insight Text Generator.
 *
 * Generiert natürlichsprachige Texte für Phase- und Project-Insights.
 */
export interface IInsightTextGenerator {
  /**
   * Generiert Texte für ein Phase-Insight.
   */
  generatePhaseTexts(input: PhaseTextInput): Promise<GeneratedTexts>;

  /**
   * Generiert Texte für ein Project-Insight.
   */
  generateProjectTexts(input: ProjectTextInput): Promise<GeneratedTexts>;

  /**
   * Generiert erweiterte Texte für ein Phase-Insight mit vollem Kontext.
   * Inkludiert Wetter, Verfügbarkeit und konkrete Handlungsempfehlungen.
   */
  generateEnhancedPhaseTexts(input: EnhancedPhaseTextInput): Promise<GeneratedTextsWithAction>;
}
