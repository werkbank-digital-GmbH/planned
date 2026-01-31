/**
 * PhaseStatus Type
 *
 * Definiert den Status einer Projektphase.
 * active = Normal sichtbar und planbar
 * deleted = Soft-deleted (nach 90 Tagen hard-delete)
 *
 * @see Prompts/08-projectphase-entity.md
 */

export type PhaseStatus = 'active' | 'deleted';

export const PHASE_STATUSES: readonly PhaseStatus[] = ['active', 'deleted'] as const;

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  active: 'Aktiv',
  deleted: 'Gelöscht',
};

export function isValidPhaseStatus(value: unknown): value is PhaseStatus {
  return typeof value === 'string' && PHASE_STATUSES.includes(value as PhaseStatus);
}
