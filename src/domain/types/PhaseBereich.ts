/**
 * PhaseBereich Type
 *
 * Definiert den Bereich einer Projektphase.
 * Produktion = Fertigung in der Werkhalle
 * Montage = Aufbau auf der Baustelle
 *
 * @see Prompts/08-projectphase-entity.md
 */

export type PhaseBereich = 'produktion' | 'montage';

export const PHASE_BEREICHE: readonly PhaseBereich[] = ['produktion', 'montage'] as const;

export const PHASE_BEREICH_LABELS: Record<PhaseBereich, string> = {
  produktion: 'PRODUKTION',
  montage: 'MONTAGE',
};

export const PHASE_BEREICH_COLORS: Record<PhaseBereich, string> = {
  produktion: 'green',
  montage: 'orange',
};

export function isValidPhaseBereich(value: unknown): value is PhaseBereich {
  return typeof value === 'string' && PHASE_BEREICHE.includes(value as PhaseBereich);
}
