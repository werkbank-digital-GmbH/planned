/**
 * Typen für das projekt-zentrierte Planning Grid.
 *
 * Das Grid zeigt Projekte als aufklappbare Hauptzeilen,
 * mit Phasen als Unterzeilen und Allocations in Tageszellen.
 */

import type { PhaseBereich, ProjectStatus } from '@/domain/types';

import type { AllocationWithDetails } from '@/application/queries';

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ROW DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Daten für eine Projekt-Zeile im Grid.
 */
export interface ProjectRowData {
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    address?: string;
  };
  phases: PhaseRowData[];
  // KPIs für diese Woche
  weeklyPlannedHours: number; // Geplant diese Woche
  totalBudgetHours: number; // Gesamt-SOLL aller Phasen
  remainingHours: number; // Verbleibend (SOLL - IST)
  // Timeline
  timelineStart?: Date;
  timelineEnd?: Date;
  // UI State
  isExpanded: boolean;
  hasActivePhasesThisWeek: boolean;
}

/**
 * Daten für eine Phasen-Zeile (unter dem Projekt).
 */
export interface PhaseRowData {
  phase: {
    id: string;
    name: string;
    bereich: PhaseBereich;
    startDate?: Date;
    endDate?: Date;
    budgetHours?: number;
    plannedHours?: number;
    actualHours?: number;
  };
  // Allocations pro Tag (key = "YYYY-MM-DD")
  dayAllocations: Record<string, AllocationWithDetails[]>;
  // Ob diese Phase in der aktuellen Woche aktiv ist
  isActiveThisWeek: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE POOL DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verfügbarkeits-Status für einen Tag.
 */
export type AvailabilityStatus = 'available' | 'partial' | 'busy' | 'absence';

/**
 * Verfügbarkeit für einen einzelnen Tag.
 */
export interface DayAvailability {
  date: Date;
  status: AvailabilityStatus;
  allocationsCount: number;
}

/**
 * Ein Element im Ressourcen-Pool (Mitarbeiter oder Ressource).
 */
export interface PoolItem {
  type: 'user' | 'resource';
  id: string;
  name: string;
  role?: string; // Für User: Position/Rolle
  resourceType?: string; // Für Resource: Typ (Transporter, Kran, etc.)
  weeklyHours?: number; // Nur für User
  availability: DayAvailability[]; // 5 Tage (Mo-Fr)
  hasAbsence: boolean;
  absenceLabel?: string; // z.B. "Urlaub Di-Mi"
}

/**
 * Filter-Tab für den Ressourcen-Pool.
 */
export type PoolFilterTab = 'all' | 'users' | 'resources';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Datum in einem Bereich liegt.
 */
export function isDateInRange(date: Date, start?: Date, end?: Date): boolean {
  if (!start && !end) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/**
 * Prüft ob sich zwei Datumsbereiche überschneiden.
 */
export function doRangesOverlap(
  range1Start: Date,
  range1End: Date,
  range2Start?: Date,
  range2End?: Date
): boolean {
  if (!range2Start && !range2End) return true;
  if (!range2Start) return range1Start <= range2End!;
  if (!range2End) return range1End >= range2Start;
  return range1Start <= range2End && range1End >= range2Start;
}
