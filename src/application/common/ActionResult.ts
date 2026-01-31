/**
 * ActionResult Pattern
 *
 * Standardisiertes Result-Pattern für alle Server Actions.
 * Ermöglicht typsichere Fehlerbehandlung ohne try/catch im Client.
 */

/**
 * Erfolgreiches Ergebnis mit Daten
 */
export type ActionSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Fehlerhaftes Ergebnis mit Error-Informationen
 */
export type ActionFailure = {
  success: false;
  error: ActionError;
};

/**
 * Union-Type für alle möglichen Ergebnisse
 */
export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

/**
 * Error-Struktur für ActionFailure
 */
export interface ActionError {
  /** Maschinenlesbarer Error-Code */
  code: string;
  /** Benutzerfreundliche Nachricht (deutsch) */
  message: string;
  /** Zusätzliche Informationen */
  details?: Record<string, unknown>;
}

/**
 * Helper-Objekt zum Erstellen von ActionResults
 *
 * @example
 * // Erfolg
 * return Result.ok({ id: '123', name: 'Test' });
 *
 * // Fehler
 * return Result.fail('NOT_FOUND', 'Ressource nicht gefunden');
 *
 * // Fehler mit Details
 * return Result.fail('VALIDATION_ERROR', 'Ungültig', { field: 'email' });
 */
export const Result = {
  /**
   * Erstellt ein erfolgreiches Ergebnis
   */
  ok<T>(data: T): ActionSuccess<T> {
    return { success: true, data };
  },

  /**
   * Erstellt ein fehlerhaftes Ergebnis
   */
  fail(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ActionFailure {
    return {
      success: false,
      error: { code, message, details },
    };
  },
};
