/**
 * Formatierungs-Utilities für einheitliche Darstellung im gesamten System.
 */

/**
 * Formatiert Stunden auf maximal 2 Dezimalstellen.
 * Entfernt trailing zeros (2.50 → 2.5, 3.00 → 3)
 *
 * @example
 * formatHours(27.200000000000003) // → "27.2"
 * formatHours(8.5) // → "8.5"
 * formatHours(24.0) // → "24"
 * formatHours(3.125) // → "3.13"
 */
export function formatHours(hours: number): string {
  return parseFloat(hours.toFixed(2)).toString();
}

/**
 * Formatiert Stunden mit "h" Suffix.
 *
 * @example
 * formatHoursWithUnit(8.5) // → "8.5h"
 * formatHoursWithUnit(24) // → "24h"
 */
export function formatHoursWithUnit(hours: number): string {
  return `${formatHours(hours)}h`;
}
