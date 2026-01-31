/**
 * ProjectStatus Type
 *
 * Definiert die möglichen Status eines Projekts.
 * Verwendet Union Type statt Enum (siehe Rules.md).
 *
 * @see Prompts/07-project-entity.md
 */

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'planning',
  'active',
  'paused',
  'completed',
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planung',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
};

export function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && PROJECT_STATUSES.includes(value as ProjectStatus);
}
