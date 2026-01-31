/**
 * Error Codes Katalog
 *
 * Maschinenlesbare Error-Codes für alle Fehler in der Anwendung.
 * Basierend auf API_SPEC.md.
 */

export const ErrorCodes = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION (AUTH_*)
  // ═══════════════════════════════════════════════════════════════════════════
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION (VALIDATION_*)
  // ═══════════════════════════════════════════════════════════════════════════
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_RANGE: 'VALIDATION_INVALID_RANGE',
  VALIDATION_INVALID_UUID: 'VALIDATION_INVALID_UUID',
  VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  VALIDATION_MIN_LENGTH: 'VALIDATION_MIN_LENGTH',
  VALIDATION_MAX_LENGTH: 'VALIDATION_MAX_LENGTH',
  VALIDATION_MIN_VALUE: 'VALIDATION_MIN_VALUE',
  VALIDATION_MAX_VALUE: 'VALIDATION_MAX_VALUE',

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOURCE NOT FOUND (NOT_FOUND_*)
  // ═══════════════════════════════════════════════════════════════════════════
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PHASE_NOT_FOUND: 'PHASE_NOT_FOUND',
  ALLOCATION_NOT_FOUND: 'ALLOCATION_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_TYPE_NOT_FOUND: 'RESOURCE_TYPE_NOT_FOUND',
  ABSENCE_NOT_FOUND: 'ABSENCE_NOT_FOUND',
  TIME_ENTRY_NOT_FOUND: 'TIME_ENTRY_NOT_FOUND',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',

  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOCATION (ALLOCATION_*)
  // ═══════════════════════════════════════════════════════════════════════════
  ALLOCATION_USER_OR_RESOURCE_REQUIRED: 'ALLOCATION_USER_OR_RESOURCE_REQUIRED',
  ALLOCATION_CANNOT_HAVE_BOTH: 'ALLOCATION_CANNOT_HAVE_BOTH',
  ALLOCATION_PHASE_NOT_FOUND: 'ALLOCATION_PHASE_NOT_FOUND',
  ALLOCATION_USER_INACTIVE: 'ALLOCATION_USER_INACTIVE',
  ALLOCATION_USER_HAS_ABSENCE: 'ALLOCATION_USER_HAS_ABSENCE',
  ALLOCATION_ALREADY_EXISTS: 'ALLOCATION_ALREADY_EXISTS',
  ALLOCATION_OUTSIDE_PHASE_DATES: 'ALLOCATION_OUTSIDE_PHASE_DATES',
  ALLOCATION_PHASE_DELETED: 'ALLOCATION_PHASE_DELETED',

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT (PROJECT_*)
  // ═══════════════════════════════════════════════════════════════════════════
  PROJECT_INVALID_DATES: 'PROJECT_INVALID_DATES',
  PROJECT_ALREADY_EXISTS: 'PROJECT_ALREADY_EXISTS',
  PROJECT_HAS_ALLOCATIONS: 'PROJECT_HAS_ALLOCATIONS',

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE (PHASE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  PHASE_OUTSIDE_PROJECT_DATES: 'PHASE_OUTSIDE_PROJECT_DATES',
  PHASE_INVALID_DATES: 'PHASE_INVALID_DATES',
  PHASE_HAS_ALLOCATIONS: 'PHASE_HAS_ALLOCATIONS',
  PHASE_ALREADY_DELETED: 'PHASE_ALREADY_DELETED',

  // ═══════════════════════════════════════════════════════════════════════════
  // USER (USER_*)
  // ═══════════════════════════════════════════════════════════════════════════
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_CANNOT_DELETE_SELF: 'USER_CANNOT_DELETE_SELF',
  USER_LAST_ADMIN: 'USER_LAST_ADMIN',
  USER_HAS_ALLOCATIONS: 'USER_HAS_ALLOCATIONS',

  // ═══════════════════════════════════════════════════════════════════════════
  // ABSENCE (ABSENCE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  ABSENCE_INVALID_DATES: 'ABSENCE_INVALID_DATES',
  ABSENCE_OVERLAPPING: 'ABSENCE_OVERLAPPING',
  ABSENCE_HAS_ALLOCATIONS: 'ABSENCE_HAS_ALLOCATIONS',

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOURCE (RESOURCE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_HAS_ALLOCATIONS: 'RESOURCE_HAS_ALLOCATIONS',
  RESOURCE_TYPE_HAS_RESOURCES: 'RESOURCE_TYPE_HAS_RESOURCES',

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT (CONFLICT_*)
  // ═══════════════════════════════════════════════════════════════════════════
  CONFLICT: 'CONFLICT',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL SERVICES (ASANA_*, TIMETAC_*)
  // ═══════════════════════════════════════════════════════════════════════════
  ASANA_ERROR: 'ASANA_ERROR',
  ASANA_RATE_LIMIT: 'ASANA_RATE_LIMIT',
  ASANA_NOT_CONNECTED: 'ASANA_NOT_CONNECTED',
  ASANA_TOKEN_EXPIRED: 'ASANA_TOKEN_EXPIRED',
  ASANA_INVALID_RESPONSE: 'ASANA_INVALID_RESPONSE',
  ASANA_WEBHOOK_INVALID: 'ASANA_WEBHOOK_INVALID',

  TIMETAC_ERROR: 'TIMETAC_ERROR',
  TIMETAC_NOT_CONNECTED: 'TIMETAC_NOT_CONNECTED',
  TIMETAC_INVALID_CREDENTIALS: 'TIMETAC_INVALID_CREDENTIALS',
  TIMETAC_RATE_LIMIT: 'TIMETAC_RATE_LIMIT',

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC (SYNC_*)
  // ═══════════════════════════════════════════════════════════════════════════
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  SYNC_FAILED: 'SYNC_FAILED',
  SYNC_PARTIAL: 'SYNC_PARTIAL',

  // ═══════════════════════════════════════════════════════════════════════════
  // RATE LIMITING (RATE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL (INTERNAL_*)
  // ═══════════════════════════════════════════════════════════════════════════
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
} as const;

/**
 * Type für Error Codes
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Deutsche Fehlermeldungen für alle Error Codes
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'Ungültige Anmeldedaten',
  AUTH_SESSION_EXPIRED: 'Sitzung abgelaufen. Bitte erneut anmelden.',
  AUTH_UNAUTHORIZED: 'Nicht autorisiert',
  AUTH_FORBIDDEN: 'Keine Berechtigung',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'Dieses Feld ist erforderlich',
  VALIDATION_INVALID_FORMAT: 'Ungültiges Format',
  VALIDATION_INVALID_DATE: 'Ungültiges Datum',
  VALIDATION_INVALID_RANGE: 'Ungültiger Bereich',
  VALIDATION_INVALID_UUID: 'Ungültige ID',
  VALIDATION_INVALID_EMAIL: 'Ungültige E-Mail-Adresse',
  VALIDATION_MIN_LENGTH: 'Eingabe zu kurz',
  VALIDATION_MAX_LENGTH: 'Eingabe zu lang',
  VALIDATION_MIN_VALUE: 'Wert zu klein',
  VALIDATION_MAX_VALUE: 'Wert zu groß',

  // Not Found
  NOT_FOUND: 'Nicht gefunden',
  USER_NOT_FOUND: 'Mitarbeiter nicht gefunden',
  PROJECT_NOT_FOUND: 'Projekt nicht gefunden',
  PHASE_NOT_FOUND: 'Projektphase nicht gefunden',
  ALLOCATION_NOT_FOUND: 'Zuweisung nicht gefunden',
  RESOURCE_NOT_FOUND: 'Ressource nicht gefunden',
  RESOURCE_TYPE_NOT_FOUND: 'Ressourcentyp nicht gefunden',
  ABSENCE_NOT_FOUND: 'Abwesenheit nicht gefunden',
  TIME_ENTRY_NOT_FOUND: 'Zeiteintrag nicht gefunden',
  TENANT_NOT_FOUND: 'Mandant nicht gefunden',

  // Allocation
  ALLOCATION_USER_OR_RESOURCE_REQUIRED:
    'Entweder Mitarbeiter oder Ressource muss ausgewählt werden',
  ALLOCATION_CANNOT_HAVE_BOTH:
    'Es kann nicht gleichzeitig Mitarbeiter und Ressource ausgewählt werden',
  ALLOCATION_PHASE_NOT_FOUND: 'Die ausgewählte Projektphase existiert nicht',
  ALLOCATION_USER_INACTIVE: 'Mitarbeiter ist deaktiviert',
  ALLOCATION_USER_HAS_ABSENCE: 'Mitarbeiter hat an diesem Tag eine Abwesenheit',
  ALLOCATION_ALREADY_EXISTS: 'Diese Zuweisung existiert bereits',
  ALLOCATION_OUTSIDE_PHASE_DATES:
    'Datum liegt außerhalb des Phasenzeitraums',
  ALLOCATION_PHASE_DELETED: 'Die Projektphase wurde gelöscht',

  // Project
  PROJECT_INVALID_DATES: 'Ungültiger Projektzeitraum',
  PROJECT_ALREADY_EXISTS: 'Ein Projekt mit diesem Namen existiert bereits',
  PROJECT_HAS_ALLOCATIONS: 'Projekt kann nicht gelöscht werden (hat Zuweisungen)',

  // Phase
  PHASE_OUTSIDE_PROJECT_DATES: 'Phase liegt außerhalb des Projektzeitraums',
  PHASE_INVALID_DATES: 'Ungültiger Phasenzeitraum',
  PHASE_HAS_ALLOCATIONS: 'Phase kann nicht gelöscht werden (hat Zuweisungen)',
  PHASE_ALREADY_DELETED: 'Phase wurde bereits gelöscht',

  // User
  USER_ALREADY_EXISTS: 'Ein Benutzer mit dieser E-Mail existiert bereits',
  USER_EMAIL_TAKEN: 'Diese E-Mail-Adresse ist bereits vergeben',
  USER_INACTIVE: 'Mitarbeiter ist deaktiviert',
  USER_CANNOT_DELETE_SELF: 'Sie können sich nicht selbst löschen',
  USER_LAST_ADMIN: 'Der letzte Admin kann nicht entfernt werden',
  USER_HAS_ALLOCATIONS:
    'Mitarbeiter kann nicht gelöscht werden (hat Zuweisungen)',

  // Absence
  ABSENCE_INVALID_DATES: 'Ungültiger Abwesenheitszeitraum',
  ABSENCE_OVERLAPPING: 'Abwesenheit überschneidet sich mit bestehender',
  ABSENCE_HAS_ALLOCATIONS:
    'Im Abwesenheitszeitraum existieren Zuweisungen',

  // Resource
  RESOURCE_ALREADY_EXISTS: 'Eine Ressource mit diesem Namen existiert bereits',
  RESOURCE_HAS_ALLOCATIONS:
    'Ressource kann nicht gelöscht werden (hat Zuweisungen)',
  RESOURCE_TYPE_HAS_RESOURCES:
    'Ressourcentyp kann nicht gelöscht werden (hat Ressourcen)',

  // Conflict
  CONFLICT: 'Konflikt mit bestehenden Daten',
  CONCURRENT_MODIFICATION: 'Der Datensatz wurde zwischenzeitlich geändert',

  // External Services
  ASANA_ERROR: 'Asana-Fehler',
  ASANA_RATE_LIMIT: 'Asana-Rate-Limit erreicht. Bitte später erneut versuchen.',
  ASANA_NOT_CONNECTED: 'Asana ist nicht verbunden',
  ASANA_TOKEN_EXPIRED: 'Asana-Token abgelaufen. Bitte erneut verbinden.',
  ASANA_INVALID_RESPONSE: 'Ungültige Antwort von Asana',
  ASANA_WEBHOOK_INVALID: 'Ungültiger Asana-Webhook',

  TIMETAC_ERROR: 'TimeTac-Fehler',
  TIMETAC_NOT_CONNECTED: 'TimeTac ist nicht verbunden',
  TIMETAC_INVALID_CREDENTIALS: 'Ungültige TimeTac-Anmeldedaten',
  TIMETAC_RATE_LIMIT:
    'TimeTac-Rate-Limit erreicht. Bitte später erneut versuchen.',

  // Sync
  SYNC_IN_PROGRESS: 'Synchronisierung läuft bereits',
  SYNC_FAILED: 'Synchronisierung fehlgeschlagen',
  SYNC_PARTIAL: 'Synchronisierung teilweise fehlgeschlagen',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',

  // Internal
  INTERNAL_ERROR: 'Ein unerwarteter Fehler ist aufgetreten',
  DATABASE_ERROR: 'Datenbankfehler',
  ENCRYPTION_ERROR: 'Verschlüsselungsfehler',
};

/**
 * Gibt die Fehlermeldung für einen Error Code zurück
 */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] ?? ErrorMessages.INTERNAL_ERROR;
}
