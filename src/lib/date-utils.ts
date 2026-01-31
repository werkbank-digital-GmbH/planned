/**
 * Datums-Hilfsfunktionen für die Planung.
 *
 * Alle Funktionen arbeiten mit der deutschen Wochennummerierung (ISO 8601):
 * - Woche beginnt am Montag
 * - Woche 1 ist die erste Woche mit mindestens 4 Tagen im neuen Jahr
 *
 * WICHTIG: Alle Funktionen arbeiten in UTC um Zeitzonenprobleme zu vermeiden.
 */

/**
 * Gibt die Wochentage (Mo-Fr) für eine gegebene Woche zurück.
 *
 * @param weekStart - Montag der gewünschten Woche
 * @returns Array mit 5 Date-Objekten (Mo-Fr) in UTC
 */
export function getWeekDates(weekStart: Date): Date[] {
  const monday = getMonday(weekStart);
  const dates: Date[] = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date(
      Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i)
    );
    dates.push(date);
  }

  return dates;
}

/**
 * Findet den Montag der Woche, in der das gegebene Datum liegt.
 * Arbeitet mit UTC um Zeitzonenprobleme zu vermeiden.
 *
 * @param date - Ein beliebiges Datum
 * @returns Montag dieser Woche (UTC Mitternacht)
 */
export function getMonday(date: Date): Date {
  // Erstelle UTC-Datum ohne Zeitanteil
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  // getUTCDay(): 0=Sonntag, 1=Montag, ..., 6=Samstag
  // Wir wollen: 0=Montag (also 1 wird zu 0, 2 wird zu 1, ..., 0 wird zu 6)
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * Gibt den Freitag der Woche zurück.
 *
 * @param date - Ein beliebiges Datum
 * @returns Freitag dieser Woche (UTC Mitternacht)
 */
export function getFriday(date: Date): Date {
  const monday = getMonday(date);
  const friday = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 4)
  );
  return friday;
}

/**
 * Berechnet die Kalenderwoche nach ISO 8601.
 *
 * @param date - Das Datum
 * @returns Kalenderwochennummer (1-53)
 */
export function getCalendarWeek(date: Date): number {
  // Arbeite mit UTC
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO 8601: Woche beginnt am Montag, Woche 1 enthält den 4. Januar
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7
    )
  );
}

/**
 * Formatiert ein Datum als ISO-String ohne Zeitanteil (YYYY-MM-DD).
 *
 * @param date - Das Datum
 * @returns String im Format "YYYY-MM-DD"
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formatiert ein Datum für die deutsche Anzeige.
 *
 * @param date - Das Datum
 * @returns String im Format "DD.MM.YYYY"
 */
export function formatDateDE(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Prüft ob zwei Daten am selben Tag sind (UTC).
 *
 * @param a - Erstes Datum
 * @param b - Zweites Datum
 * @returns true wenn beide Daten am selben UTC-Tag sind
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Prüft ob das Datum heute ist.
 *
 * @param date - Das zu prüfende Datum
 * @returns true wenn das Datum heute ist
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Gibt den deutschen Wochentag zurück.
 *
 * @param dayIndex - 0=Montag, 4=Freitag
 * @returns Deutscher Wochentag (z.B. "Montag")
 */
export function getDayName(dayIndex: number): string {
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  return days[dayIndex] ?? '';
}

/**
 * Gibt den kurzen deutschen Wochentag zurück.
 *
 * @param dayIndex - 0=Montag, 4=Freitag
 * @returns Kurzer Wochentag (z.B. "Mo")
 */
export function getDayNameShort(dayIndex: number): string {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  return days[dayIndex] ?? '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTH UTILITIES (for Month View)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt alle Tage eines Monats zurück.
 *
 * @param date - Ein beliebiges Datum im gewünschten Monat
 * @returns Array mit allen Date-Objekten des Monats (1. bis letzter Tag)
 */
export function getMonthDates(date: Date): Date[] {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0)); // 0 = letzter Tag des Vormonats

  const dates: Date[] = [];
  const current = new Date(firstDay);

  while (current <= lastDay) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Gibt den deutschen Monatsnamen zurück.
 *
 * @param date - Das Datum
 * @returns Deutscher Monatsname (z.B. "Januar")
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long' });
}

/**
 * Gibt den kurzen deutschen Monatsnamen zurück.
 *
 * @param date - Das Datum
 * @returns Kurzer Monatsname (z.B. "Jan")
 */
export function getMonthNameShort(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'short' });
}

/**
 * Gibt den ersten Tag des Monats zurück.
 *
 * @param date - Ein beliebiges Datum
 * @returns Erster Tag des Monats (UTC Mitternacht)
 */
export function getFirstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Gibt den letzten Tag des Monats zurück.
 *
 * @param date - Ein beliebiges Datum
 * @returns Letzter Tag des Monats (UTC Mitternacht)
 */
export function getLastOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/**
 * Addiert oder subtrahiert Monate von einem Datum.
 *
 * @param date - Das Ausgangsdatum
 * @param months - Anzahl der Monate (positiv oder negativ)
 * @returns Neues Datum
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return result;
}

/**
 * Prüft ob ein Datum ein Wochenende ist (Samstag oder Sonntag).
 *
 * @param date - Das zu prüfende Datum
 * @returns true wenn Samstag (6) oder Sonntag (0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Gibt den Wochentag eines Datums zurück (0=Sonntag, 6=Samstag).
 *
 * @param date - Das Datum
 * @returns Wochentag (0-6)
 */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Gibt den deutschen Namen für alle Wochentage zurück (inkl. Wochenende).
 *
 * @param dayOfWeek - 0=Sonntag, 1=Montag, ..., 6=Samstag
 * @returns Kurzer Wochentag (z.B. "Mo", "Sa", "So")
 */
export function getWeekdayShort(dayOfWeek: number): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days[dayOfWeek] ?? '';
}
