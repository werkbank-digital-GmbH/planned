/**
 * PhaseBereich Type
 *
 * Definiert den Bereich einer Projektphase.
 * Produktion = Fertigung in der Werkhalle
 * Montage = Aufbau auf der Baustelle
 * Externes Gewerk = Fremdleistungen (Elektriker, Heizung, etc.)
 *
 * @see Prompts/08-projectphase-entity.md
 */

export type PhaseBereich = 'produktion' | 'montage' | 'externes_gewerk';

export const PHASE_BEREICHE: readonly PhaseBereich[] = [
  'produktion',
  'montage',
  'externes_gewerk',
] as const;

export const PHASE_BEREICH_LABELS: Record<PhaseBereich, string> = {
  produktion: 'PRODUKTION',
  montage: 'MONTAGE',
  externes_gewerk: 'EXTERNES GEWERK',
};

export const PHASE_BEREICH_COLORS: Record<PhaseBereich, string> = {
  produktion: 'green',
  montage: 'orange',
  externes_gewerk: 'blue',
};

export function isValidPhaseBereich(value: unknown): value is PhaseBereich {
  return typeof value === 'string' && PHASE_BEREICHE.includes(value as PhaseBereich);
}
