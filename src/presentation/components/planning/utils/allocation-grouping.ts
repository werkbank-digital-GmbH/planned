/**
 * Utility für die Gruppierung aufeinanderfolgender Allocations.
 *
 * Gruppiert Allocations desselben Users/Ressource über aufeinanderfolgende
 * Tage zu einem "Span", der als ein visueller Block dargestellt werden kann.
 */

import type { AllocationWithDetails } from '@/application/queries';

import { formatDateISO } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ein Span repräsentiert aufeinanderfolgende Allocations
 * desselben Users/Ressource in derselben Phase.
 */
export interface AllocationSpan {
  /** Alle Allocations in diesem Span (sortiert nach Datum) */
  allocations: AllocationWithDetails[];
  /** User-ID wenn User-Allocation */
  userId?: string;
  /** Resource-ID wenn Resource-Allocation */
  resourceId?: string;
  /** Phase-ID */
  phaseId: string;
  /** Erstes Datum des Spans */
  startDate: Date;
  /** Letztes Datum des Spans */
  endDate: Date;
  /** Index des Start-Tages (0-4 für Mo-Fr) */
  startDayIndex: number;
  /** Anzahl der aufeinanderfolgenden Tage */
  spanDays: number;
  /** Gesamtstunden über alle Tage */
  totalHours: number;
  /** Display-Name (User-Name oder Resource-Name) */
  displayName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert einen eindeutigen Key für eine Allocation basierend auf User/Resource.
 */
function getAllocationKey(allocation: AllocationWithDetails): string {
  if (allocation.user) {
    return `user-${allocation.user.id}`;
  }
  if (allocation.resource) {
    return `resource-${allocation.resource.id}`;
  }
  return 'unknown';
}

/**
 * Extrahiert den Display-Namen aus einer Allocation.
 */
function getDisplayName(allocation: AllocationWithDetails): string {
  if (allocation.user) {
    // Kürze den Namen: "Thomas Müller" → "T. Müller"
    const parts = allocation.user.fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
    }
    return allocation.user.fullName;
  }
  if (allocation.resource) {
    return allocation.resource.name;
  }
  return 'Unbekannt';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gruppiert aufeinanderfolgende Allocations zu Spans.
 *
 * Regeln:
 * - Allocations mit gleichem User/Resource werden gruppiert
 * - Nur aufeinanderfolgende Tage (keine Lücken)
 * - Gibt sowohl einzelne Allocations (spanDays=1) als auch Multi-Tag-Spans zurück
 *
 * @param dayAllocations - Record von Datum (ISO) → Allocations
 * @param weekDates - Array der 5 Werktage (Mo-Fr)
 * @returns Array von AllocationSpans
 */
export function groupConsecutiveAllocations(
  dayAllocations: Record<string, AllocationWithDetails[]>,
  weekDates: Date[]
): AllocationSpan[] {
  // 1. Sammle alle Allocations mit ihrem Tages-Index
  const allAllocations: { allocation: AllocationWithDetails; dayIndex: number }[] = [];

  for (const [dateKey, allocations] of Object.entries(dayAllocations)) {
    const dayIndex = weekDates.findIndex((d) => formatDateISO(d) === dateKey);
    if (dayIndex === -1) continue;

    for (const allocation of allocations) {
      allAllocations.push({ allocation, dayIndex });
    }
  }

  // 2. Gruppiere nach User/Resource
  const grouped = new Map<string, { allocation: AllocationWithDetails; dayIndex: number }[]>();

  for (const item of allAllocations) {
    const key = getAllocationKey(item.allocation);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  // 3. Für jede Gruppe: Finde aufeinanderfolgende Sequenzen
  const spans: AllocationSpan[] = [];

  for (const [, items] of grouped) {
    // Sortiere nach Tages-Index
    items.sort((a, b) => a.dayIndex - b.dayIndex);

    // Finde aufeinanderfolgende Sequenzen
    let currentSpan: { allocation: AllocationWithDetails; dayIndex: number }[] = [];

    for (const item of items) {
      if (currentSpan.length === 0) {
        // Start einer neuen Sequenz
        currentSpan.push(item);
      } else {
        const lastItem = currentSpan[currentSpan.length - 1];
        // Prüfe ob aufeinanderfolgend (Tages-Index-Differenz = 1)
        if (item.dayIndex === lastItem.dayIndex + 1) {
          currentSpan.push(item);
        } else {
          // Lücke gefunden → aktuelle Sequenz abschließen
          spans.push(createSpan(currentSpan));
          currentSpan = [item];
        }
      }
    }

    // Letzte Sequenz abschließen
    if (currentSpan.length > 0) {
      spans.push(createSpan(currentSpan));
    }
  }

  // Sortiere Spans nach Start-Tag-Index
  spans.sort((a, b) => a.startDayIndex - b.startDayIndex);

  return spans;
}

/**
 * Erstellt einen AllocationSpan aus einer Sequenz von Allocations.
 */
function createSpan(
  items: { allocation: AllocationWithDetails; dayIndex: number }[]
): AllocationSpan {
  const allocations = items.map((i) => i.allocation);
  const firstAllocation = allocations[0];

  return {
    allocations,
    userId: firstAllocation.user?.id,
    resourceId: firstAllocation.resource?.id,
    phaseId: firstAllocation.projectPhase.id,
    startDate: firstAllocation.date,
    endDate: allocations[allocations.length - 1].date,
    startDayIndex: items[0].dayIndex,
    spanDays: items.length,
    totalHours: allocations.reduce((sum, a) => sum + (a.plannedHours ?? 0), 0),
    displayName: getDisplayName(firstAllocation),
  };
}

/**
 * Filtert Spans die über mehrere Tage gehen (spanDays > 1).
 */
export function getMultiDaySpans(spans: AllocationSpan[]): AllocationSpan[] {
  return spans.filter((span) => span.spanDays > 1);
}

/**
 * Filtert einzelne Allocations (spanDays = 1).
 */
export function getSingleDaySpans(spans: AllocationSpan[]): AllocationSpan[] {
  return spans.filter((span) => span.spanDays === 1);
}

/**
 * Gibt alle Allocation-IDs zurück, die Teil eines Multi-Tag-Spans sind.
 */
export function getSpannedAllocationIds(spans: AllocationSpan[]): Set<string> {
  const ids = new Set<string>();
  for (const span of getMultiDaySpans(spans)) {
    for (const allocation of span.allocations) {
      ids.add(allocation.id);
    }
  }
  return ids;
}
