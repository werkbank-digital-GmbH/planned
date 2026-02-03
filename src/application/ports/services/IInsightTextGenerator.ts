import type { InsightStatus, BurnRateTrend } from '@/domain/analytics/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GeneratedTexts {
  summary_text: string;
  detail_text: string;
  recommendation_text: string;
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
}
