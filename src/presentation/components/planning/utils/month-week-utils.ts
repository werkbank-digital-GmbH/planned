/**
 * Utility für die Aufteilung eines Monats in Wochen.
 *
 * Berechnet alle Kalenderwochen, die einen Monat berühren,
 * und liefert jeweils die 5 Werktage (Mo-Fr) pro Woche.
 */

import type { PoolItem } from '@/application/queries';

import {
  formatDateISO,
  getCalendarWeek,
  getMonday,
  getWeekDates,
} from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MonthWeek {
  /** Eindeutiger Key, z.B. "2026-KW7" */
  weekKey: string;
  /** Kalenderwochennummer (ISO 8601) */
  calendarWeek: number;
  /** 5 Werktage (Mo-Fr) als Date-Objekte */
  weekDates: Date[];
  /** Montag dieser Woche als ISO-String für Server-Fetch */
  mondayISO: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet alle Wochen, die einen Monat berühren.
 *
 * Liefert immer volle Wochen (Mo-Fr), auch wenn nur ein Teil der
 * Woche im Monat liegt. Die erste Woche ist die Woche des 1.,
 * die letzte die Woche des letzten Monatstags.
 *
 * @param monthStart - Ein beliebiges Datum im gewünschten Monat
 * @returns Array von MonthWeek (typischerweise 4-6 Wochen)
 */
export function groupMonthIntoWeeks(monthStart: Date): MonthWeek[] {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));

  const firstMonday = getMonday(firstOfMonth);
  const lastMonday = getMonday(lastOfMonth);

  const weeks: MonthWeek[] = [];
  const current = new Date(firstMonday);

  while (current <= lastMonday) {
    const monday = new Date(current);
    const cw = getCalendarWeek(monday);
    const cwYear = monday.getUTCFullYear();
    const weekDates = getWeekDates(monday);

    weeks.push({
      weekKey: `${cwYear}-KW${cw}`,
      calendarWeek: cw,
      weekDates,
      mondayISO: formatDateISO(monday),
    });

    // Nächste Woche
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return weeks;
}

// ═══════════════════════════════════════════════════════════════════════════
// ABSENCE LABEL
// ═══════════════════════════════════════════════════════════════════════════

const DAY_ABBREVS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

/**
 * Berechnet ein kompaktes Abwesenheits-Label für ein Pool-Item in einer Woche.
 *
 * @param item - PoolItem mit Verfügbarkeitsdaten
 * @param weekDates - Die 5 Werktage der Ziel-Woche
 * @param allDates - Alle Werktage des Datenarrays (für Index-Berechnung)
 * @returns null wenn keine Abwesenheit, sonst z.B. "Mo", "Mo/Di", "Mo-Mi", "Mo-Fr"
 */
export function getAbsenceDaysLabel(
  item: PoolItem,
  weekDates: Date[],
  allDates: Date[]
): string | null {
  // Finde die Indizes der Wochentage in allDates, prüfe Abwesenheitsstatus
  const absentDayIndices: number[] = [];

  for (let dayIdx = 0; dayIdx < weekDates.length; dayIdx++) {
    const dateISO = formatDateISO(weekDates[dayIdx]);
    const globalIndex = allDates.findIndex(
      (d) => formatDateISO(d) === dateISO
    );

    if (globalIndex >= 0) {
      const availability = item.availability[globalIndex];
      if (availability?.status === 'absence') {
        absentDayIndices.push(dayIdx);
      }
    }
  }

  if (absentDayIndices.length === 0) return null;
  if (absentDayIndices.length === 1) {
    return DAY_ABBREVS[absentDayIndices[0]];
  }

  // Prüfe ob zusammenhängend
  const isConsecutive = absentDayIndices.every(
    (val, i) => i === 0 || val === absentDayIndices[i - 1] + 1
  );

  if (isConsecutive && absentDayIndices.length >= 3) {
    // Zusammenhängendes Intervall: "Mo-Mi", "Mo-Fr"
    const first = DAY_ABBREVS[absentDayIndices[0]];
    const last = DAY_ABBREVS[absentDayIndices[absentDayIndices.length - 1]];
    return `${first}-${last}`;
  }

  // Nicht zusammenhängend oder nur 2 Tage: "Mo/Di", "Mo/Mi"
  return absentDayIndices.map((i) => DAY_ABBREVS[i]).join('/');
}
