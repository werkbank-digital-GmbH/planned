/**
 * Base class for all domain errors.
 *
 * Domain Errors werden in der Domain- und Application-Schicht geworfen
 * und in der Presentation-Schicht zu ActionResult konvertiert.
 *
 * Wichtig: Diese Klasse darf KEINE externen Abhängigkeiten haben,
 * da sie in der Domain-Schicht liegt.
 */
export abstract class DomainError extends Error {
  /** Maschinenlesbarer Error-Code */
  abstract readonly code: string;

  /** Zusätzliche Informationen zum Fehler */
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;

    // Für korrekte Prototype-Chain in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
