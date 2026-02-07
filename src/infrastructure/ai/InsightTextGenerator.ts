import Anthropic from '@anthropic-ai/sdk';

import type { InsightStatus, SuggestedAction } from '@/domain/analytics/types';

import type {
  EnhancedPhaseTextInput,
  GeneratedTexts,
  GeneratedTextsWithAction,
  IInsightTextGenerator,
  PhaseTextInput,
  ProjectTextInput,
} from '@/application/ports/services/IInsightTextGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TEXT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert natürlichsprachige Texte für Phase- und Project-Insights.
 *
 * Nutzt Claude Haiku für schnelle, günstige Textgenerierung.
 * Bei API-Fehlern werden regelbasierte Fallback-Texte verwendet.
 */
export class InsightTextGenerator implements IInsightTextGenerator {
  private client: Anthropic | null = null;
  private readonly model = 'claude-3-haiku-20240307';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new Anthropic({ apiKey: key, timeout: 60_000 });
    }
  }

  /**
   * Generiert Texte für ein Phase-Insight.
   */
  async generatePhaseTexts(input: PhaseTextInput): Promise<GeneratedTexts> {
    // Spezialfälle mit vordefinierten Texten
    if (input.status === 'not_started') {
      return this.getNotStartedTexts(input.phaseName);
    }

    if (input.status === 'completed') {
      return this.getCompletedTexts(input.phaseName, input.sollHours, input.istHours);
    }

    // Versuche KI-generierte Texte
    if (this.client) {
      try {
        return await this.generateWithClaude(input);
      } catch (error) {
        console.error('[InsightTextGenerator] Claude API error:', error);
        // Fallback zu regelbasierten Texten
      }
    }

    return this.generateFallbackTexts(input);
  }

  /**
   * Generiert Texte für ein Project-Insight.
   */
  async generateProjectTexts(input: ProjectTextInput): Promise<GeneratedTexts> {
    if (this.client) {
      try {
        return await this.generateProjectWithClaude(input);
      } catch (error) {
        console.error('[InsightTextGenerator] Claude API error for project:', error);
      }
    }

    return this.generateProjectFallbackTexts(input);
  }

  /**
   * Generiert erweiterte Texte für ein Phase-Insight mit vollem Kontext.
   * Inkludiert Wetter, Verfügbarkeit und konkrete Handlungsempfehlungen.
   */
  async generateEnhancedPhaseTexts(
    input: EnhancedPhaseTextInput
  ): Promise<GeneratedTextsWithAction> {
    // Spezialfälle mit vordefinierten Texten
    if (input.status === 'not_started') {
      return this.getNotStartedTexts(input.phaseName);
    }

    if (input.status === 'completed') {
      return this.getCompletedTexts(input.phaseName, input.sollHours, input.istHours);
    }

    // Versuche KI-generierte Texte
    if (this.client) {
      try {
        return await this.generateEnhancedWithClaude(input);
      } catch (error) {
        console.error('[InsightTextGenerator] Claude API error (enhanced):', error);
      }
    }

    return this.generateEnhancedFallbackTexts(input);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLAUDE API CALLS
  // ═══════════════════════════════════════════════════════════════════════

  private async generateWithClaude(input: PhaseTextInput): Promise<GeneratedTexts> {
    const prompt = this.buildPhasePrompt(input);

    const response = await this.client!.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseJsonResponse(content.text);
  }

  private async generateProjectWithClaude(input: ProjectTextInput): Promise<GeneratedTexts> {
    const prompt = this.buildProjectPrompt(input);

    const response = await this.client!.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseJsonResponse(content.text);
  }

  private async generateEnhancedWithClaude(
    input: EnhancedPhaseTextInput
  ): Promise<GeneratedTextsWithAction> {
    const prompt = this.buildEnhancedPhasePrompt(input);

    const response = await this.client!.messages.create({
      model: this.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseEnhancedJsonResponse(content.text);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROMPT BUILDERS
  // ═══════════════════════════════════════════════════════════════════════

  private buildPhasePrompt(input: PhaseTextInput): string {
    const trendEmoji =
      input.burnRateTrend === 'up' ? '📈' : input.burnRateTrend === 'down' ? '📉' : '➡️';

    return `Du bist ein freundlicher Projektmanagement-Assistent für ein Holzbauunternehmen.
Dein Ton ist locker, motivierend und auf den Punkt. Nutze passende Emojis.

PHASE: ${input.phaseName}
PROJEKT: ${input.projectName}
${input.deadline ? `DEADLINE: ${input.deadline} (in ${input.daysUntilDeadline} Arbeitstagen)` : 'DEADLINE: Nicht definiert'}

STUNDEN:
- SOLL: ${input.sollHours}h
- IST: ${input.istHours}h (${input.progressPercent}%)
- Noch offen: ${input.remainingHours}h
- PLAN: ${input.planHours}h

${input.burnRateIst ? `BURN RATE: ${input.burnRateIst.toFixed(1)}h/Tag ${trendEmoji} (Trend: ${input.burnRateTrend})` : 'BURN RATE: Noch nicht genug Daten'}

STATUS: ${this.statusToGerman(input.status)}
${input.deadlineDeltaIst !== null ? `PROGNOSE: ${input.deadlineDeltaIst > 0 ? input.deadlineDeltaIst + ' Tage Verzug' : Math.abs(input.deadlineDeltaIst) + ' Tage früher'}` : ''}

Generiere genau dieses JSON (keine Erklärung, nur JSON):
{
  "summary_text": "Kurzer Satz (max 80 Zeichen, mit Emoji)",
  "detail_text": "2-3 Sätze mit mehr Details",
  "recommendation_text": "Konkrete Handlungsempfehlung"
}`;
  }

  private buildProjectPrompt(input: ProjectTextInput): string {
    return `Du bist ein freundlicher Projektmanagement-Assistent für ein Holzbauunternehmen.
Dein Ton ist locker, motivierend und auf den Punkt. Nutze passende Emojis.

PROJEKT: ${input.projectName}

STUNDEN:
- SOLL: ${input.totalSollHours}h
- IST: ${input.totalIstHours}h (${input.overallProgressPercent}%)
- Noch offen: ${input.totalRemainingHours}h

PHASEN (${input.phasesCount} gesamt):
- Im Plan: ${input.phasesOnTrack}
- Gefährdet: ${input.phasesAtRisk}
- Verzögert: ${input.phasesBehind}
- Fertig: ${input.phasesCompleted}

STATUS: ${this.statusToGerman(input.status)}
${input.projectedCompletionDate ? `PROJEKTIERTES ENDE: ${input.projectedCompletionDate}` : ''}
${input.projectDeadlineDelta !== null ? `VERZUG: ${input.projectDeadlineDelta > 0 ? input.projectDeadlineDelta + ' Tage' : 'Keiner'}` : ''}

Generiere genau dieses JSON (keine Erklärung, nur JSON):
{
  "summary_text": "Kurzer Satz (max 80 Zeichen, mit Emoji)",
  "detail_text": "2-3 Sätze mit mehr Details",
  "recommendation_text": "Konkrete Handlungsempfehlung"
}`;
  }

  private buildEnhancedPhasePrompt(input: EnhancedPhaseTextInput): string {
    const trendEmoji =
      input.burnRateTrend === 'up' ? '📈' : input.burnRateTrend === 'down' ? '📉' : '➡️';

    // Wetter-Kontext aufbauen
    let weatherSection = '';
    if (input.weatherForecast) {
      const { next3Days, hasRainRisk, hasFrostRisk, hasWindRisk } = input.weatherForecast;
      const risks: string[] = [];
      if (hasRainRisk) risks.push('Regen');
      if (hasFrostRisk) risks.push('Frost');
      if (hasWindRisk) risks.push('Starker Wind');

      const days = next3Days
        .map(
          (d) =>
            `${d.date}: ${d.description}, ${d.tempMin}°-${d.tempMax}°C, Niederschlag ${d.precipitationProbability}%, Wind ${d.windSpeedMax} km/h (${this.ratingToGerman(d.constructionRating)})`
        )
        .join('\n');

      weatherSection = `
WETTER (nächste 3 Tage):
${days}
${risks.length > 0 ? `⚠️ Risiken: ${risks.join(', ')}` : '✅ Gute Arbeitsbedingungen'}`;
    }

    // Verfügbarkeits-Kontext aufbauen
    let availabilitySection = '';
    if (input.availability) {
      const { availableUsers, overloadedUsers } = input.availability;

      if (availableUsers.length > 0) {
        const top3 = availableUsers.slice(0, 3);
        const userList = top3
          .map(
            (u) =>
              `- ${u.name}: ${u.availableDays.length} Tage frei (${u.currentUtilization}% ausgelastet)`
          )
          .join('\n');
        availabilitySection = `
VERFÜGBARE MITARBEITER:
${userList}`;
      }

      if (overloadedUsers.length > 0) {
        const overloadedList = overloadedUsers
          .slice(0, 3)
          .map((u) => `- ${u.name}: ${u.utilizationPercent}% ausgelastet`)
          .join('\n');
        availabilitySection += `
ÜBERLASTETE MITARBEITER:
${overloadedList}`;
      }
    }

    // Projekt-Kontext
    let projectSection = '';
    if (input.projectAddress || input.projectDescription) {
      projectSection = `
PROJEKT-KONTEXT:${input.projectAddress ? `\nAdresse: ${input.projectAddress}` : ''}${input.projectDescription ? `\nBeschreibung: ${input.projectDescription.slice(0, 300)}` : ''}`;
    }

    return `Du bist ein freundlicher Projektmanagement-Assistent für ein Holzbauunternehmen.
Dein Ton ist locker, motivierend und auf den Punkt. Nutze passende Emojis.
Gib KONKRETE Handlungsempfehlungen basierend auf den verfügbaren Daten.

PHASE: ${input.phaseName}
PROJEKT: ${input.projectName}
${input.deadline ? `DEADLINE: ${input.deadline} (in ${input.daysUntilDeadline} Arbeitstagen)` : 'DEADLINE: Nicht definiert'}

STUNDEN:
- SOLL: ${input.sollHours}h
- IST: ${input.istHours}h (${input.progressPercent}%)
- Noch offen: ${input.remainingHours}h
- PLAN: ${input.planHours}h

${input.burnRateIst ? `BURN RATE: ${input.burnRateIst.toFixed(1)}h/Tag ${trendEmoji} (Trend: ${input.burnRateTrend})` : 'BURN RATE: Noch nicht genug Daten'}

STATUS: ${this.statusToGerman(input.status)}
${input.deadlineDeltaIst !== null ? `PROGNOSE: ${input.deadlineDeltaIst > 0 ? input.deadlineDeltaIst + ' Tage Verzug' : Math.abs(input.deadlineDeltaIst) + ' Tage früher'}` : ''}
${projectSection}${weatherSection}${availabilitySection}

WICHTIG: Wenn die Phase "hinter_dem_Zeitplan" oder "gefährdet" ist UND verfügbare Mitarbeiter existieren,
empfehle einen konkreten Mitarbeiter mit seiner Verfügbarkeit!
Wenn schlechtes Wetter droht, berücksichtige das in der Empfehlung.

Generiere genau dieses JSON (keine Erklärung, nur JSON):
{
  "summary_text": "Kurzer Satz (max 80 Zeichen, mit Emoji)",
  "detail_text": "2-3 Sätze mit mehr Details",
  "recommendation_text": "Konkrete Handlungsempfehlung (mit Namen wenn verfügbar)",
  "suggested_action": {
    "type": "assign_user" | "reschedule" | "alert" | "none",
    "user_id": "UUID des empfohlenen Users oder null",
    "user_name": "Name des empfohlenen Users oder null",
    "available_days": ["2026-02-04", "2026-02-05"] oder null,
    "reason": "Kurze Begründung für die Empfehlung"
  }
}`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACK TEXTE
  // ═══════════════════════════════════════════════════════════════════════

  private getNotStartedTexts(phaseName: string): GeneratedTexts {
    return {
      summary_text: `🚀 ${phaseName}: Noch keine Stunden erfasst`,
      detail_text: 'Die Phase wurde noch nicht gestartet. Sobald Stunden erfasst werden, gibt es hier Prognosen und Empfehlungen.',
      recommendation_text: 'Legt los! Sobald es losgeht, seht ihr hier den Fortschritt.',
    };
  }

  private getCompletedTexts(phaseName: string, sollHours: number, istHours: number): GeneratedTexts {
    const diff = sollHours - istHours;
    const emoji = diff >= 0 ? '🎉' : '📊';
    const budgetText =
      diff >= 0
        ? `Sogar ${diff.toFixed(0)}h unter Budget!`
        : `${Math.abs(diff).toFixed(0)}h über Budget.`;

    return {
      summary_text: `✅ ${phaseName}: Fertig! ${emoji}`,
      detail_text: `Die Phase ist abgeschlossen. ${budgetText}`,
      recommendation_text: 'Zeit für einen kurzen Rückblick – was lief gut, was kann besser werden?',
    };
  }

  private generateFallbackTexts(input: PhaseTextInput): GeneratedTexts {
    const { status, phaseName, progressPercent, deadlineDeltaIst, remainingHours } = input;

    switch (status) {
      case 'ahead':
        return {
          summary_text: `🚀 ${phaseName}: ${Math.abs(deadlineDeltaIst || 0)} Tage vor dem Plan!`,
          detail_text: `Mit ${progressPercent}% Fortschritt liegt die Phase deutlich vor dem Zeitplan. Noch ${remainingHours}h offen.`,
          recommendation_text: 'Weiter so! Die gesparten Tage sind wertvoller Puffer.',
        };

      case 'on_track':
        return {
          summary_text: `✅ ${phaseName}: Im Zeitplan!`,
          detail_text: `${progressPercent}% geschafft, noch ${remainingHours}h offen. Alles läuft nach Plan.`,
          recommendation_text: 'Kurs halten, ihr macht das gut! 💪',
        };

      case 'at_risk':
        return {
          summary_text: `⚠️ ${phaseName}: Leicht verzögert`,
          detail_text: `Mit ${progressPercent}% Fortschritt droht ein kleiner Verzug von ${deadlineDeltaIst || 'ein paar'} Tagen.`,
          recommendation_text: 'Prüft, ob zusätzliche Kapazität eingeplant werden kann.',
        };

      case 'behind':
        return {
          summary_text: `🔶 ${phaseName}: ${deadlineDeltaIst || 'Mehrere'} Tage hinter dem Plan`,
          detail_text: `Die Phase ist mit ${progressPercent}% Fortschritt im Verzug. Noch ${remainingHours}h offen.`,
          recommendation_text: 'Zeit für einen Sprint! Ressourcen umverteilen oder Scope prüfen.',
        };

      case 'critical':
        return {
          summary_text: `🔴 ${phaseName}: Kritisch – ${deadlineDeltaIst || 'Starker'} Verzug!`,
          detail_text: `Mit nur ${progressPercent}% Fortschritt und ${remainingHours}h offenen Stunden ist die Lage ernst.`,
          recommendation_text: 'Sofort prüfen: Scope reduzieren oder Team aufstocken.',
        };

      default:
        return {
          summary_text: `📊 ${phaseName}: ${progressPercent}% geschafft`,
          detail_text: `Noch ${remainingHours}h offen. In ein paar Tagen gibt es genauere Prognosen.`,
          recommendation_text: 'Daten sammeln – bald gibt es präzisere Einschätzungen.',
        };
    }
  }

  private generateProjectFallbackTexts(input: ProjectTextInput): GeneratedTexts {
    const { projectName, overallProgressPercent, phasesAtRisk, phasesBehind, status } = input;

    const problemPhases = phasesAtRisk + phasesBehind;

    if (status === 'critical' || status === 'behind') {
      return {
        summary_text: `🔶 ${projectName}: ${problemPhases} Phasen brauchen Aufmerksamkeit`,
        detail_text: `Mit ${overallProgressPercent}% Gesamtfortschritt gibt es Handlungsbedarf. ${phasesBehind} Phasen sind verzögert, ${phasesAtRisk} gefährdet.`,
        recommendation_text: 'Priorisiert die kritischen Phasen und plant Ressourcen um.',
      };
    }

    if (status === 'at_risk') {
      return {
        summary_text: `⚠️ ${projectName}: Einige Phasen im Auge behalten`,
        detail_text: `${overallProgressPercent}% geschafft. ${phasesAtRisk} Phasen könnten Verzögerungen verursachen.`,
        recommendation_text: 'Frühzeitig gegensteuern – kleine Anpassungen jetzt sparen später Zeit.',
      };
    }

    return {
      summary_text: `✅ ${projectName}: ${overallProgressPercent}% – läuft gut!`,
      detail_text: `Das Projekt macht guten Fortschritt. ${input.phasesOnTrack} von ${input.phasesCount} Phasen sind im Plan.`,
      recommendation_text: 'Weiter so! Regelmäßig den Fortschritt im Blick behalten.',
    };
  }

  private generateEnhancedFallbackTexts(input: EnhancedPhaseTextInput): GeneratedTextsWithAction {
    const baseTexts = this.generateFallbackTexts(input);

    // Suggested Action basierend auf Status + Verfügbarkeit
    let suggestedAction: SuggestedAction | undefined;

    // Wetter-Warnung in Empfehlung einbauen
    let weatherWarning = '';
    if (input.weatherForecast) {
      const { hasRainRisk, hasFrostRisk, hasWindRisk } = input.weatherForecast;
      const risks: string[] = [];
      if (hasRainRisk) risks.push('Regen');
      if (hasFrostRisk) risks.push('Frost');
      if (hasWindRisk) risks.push('starkem Wind');

      if (risks.length > 0) {
        weatherWarning = ` ⚠️ In den nächsten Tagen ${risks.join(' und ')} erwartet.`;
      }
    }

    // Bei Verzug oder Gefährdung: Verfügbaren Mitarbeiter empfehlen
    if (
      (input.status === 'behind' || input.status === 'at_risk' || input.status === 'critical') &&
      input.availability?.availableUsers &&
      input.availability.availableUsers.length > 0
    ) {
      const topUser = input.availability.availableUsers[0];
      suggestedAction = {
        type: 'assign_user',
        userId: topUser.id,
        userName: topUser.name,
        availableDays: topUser.availableDays.slice(0, 5), // Max 5 Tage
        reason: `Verfügbar ${topUser.availableDays.length} Tage, ${topUser.currentUtilization}% ausgelastet`,
      };

      baseTexts.recommendation_text = `${topUser.name} ist ${topUser.availableDays.length} Tage verfügbar (${topUser.currentUtilization}% Auslastung).${weatherWarning}`;
    } else if (weatherWarning) {
      // Nur Wetter-Warnung
      baseTexts.recommendation_text = `${baseTexts.recommendation_text}${weatherWarning}`;

      if (input.weatherForecast?.hasRainRisk || input.weatherForecast?.hasFrostRisk) {
        suggestedAction = {
          type: 'alert',
          reason: 'Schlechte Wetterbedingungen in den nächsten Tagen erwartet',
        };
      }
    }

    return { ...baseTexts, suggestedAction };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private parseJsonResponse(text: string): GeneratedTexts {
    // Versuche JSON aus der Antwort zu extrahieren
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary_text: String(parsed.summary_text || ''),
      detail_text: String(parsed.detail_text || ''),
      recommendation_text: String(parsed.recommendation_text || ''),
    };
  }

  private parseEnhancedJsonResponse(text: string): GeneratedTextsWithAction {
    // Versuche JSON aus der Antwort zu extrahieren
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: GeneratedTextsWithAction = {
      summary_text: String(parsed.summary_text || ''),
      detail_text: String(parsed.detail_text || ''),
      recommendation_text: String(parsed.recommendation_text || ''),
    };

    // SuggestedAction parsen, wenn vorhanden
    if (parsed.suggested_action && parsed.suggested_action.type !== 'none') {
      result.suggestedAction = {
        type: parsed.suggested_action.type || 'none',
        userId: parsed.suggested_action.user_id || undefined,
        userName: parsed.suggested_action.user_name || undefined,
        availableDays: parsed.suggested_action.available_days || undefined,
        reason: String(parsed.suggested_action.reason || ''),
      };
    }

    return result;
  }

  private ratingToGerman(rating: 'good' | 'moderate' | 'poor'): string {
    const map: Record<string, string> = {
      good: 'Gut',
      moderate: 'Mäßig',
      poor: 'Schlecht',
    };
    return map[rating] || rating;
  }

  private statusToGerman(status: InsightStatus): string {
    const map: Record<InsightStatus, string> = {
      on_track: 'Im Zeitplan',
      ahead: 'Vor dem Zeitplan',
      at_risk: 'Gefährdet',
      behind: 'Hinter dem Zeitplan',
      critical: 'Kritisch',
      not_started: 'Nicht gestartet',
      completed: 'Abgeschlossen',
      unknown: 'Unbekannt',
    };
    return map[status];
  }
}

/**
 * Factory-Funktion für den Service.
 */
export function createInsightTextGenerator(apiKey?: string): InsightTextGenerator {
  return new InsightTextGenerator(apiKey);
}
