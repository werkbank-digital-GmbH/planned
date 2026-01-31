import type { AbsenceType } from '@/lib/database.types';

/**
 * TimeTac User
 */
export interface TimeTacUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  active: boolean;
}

/**
 * TimeTac Abwesenheit
 */
export interface TimeTacAbsence {
  id: number;
  user_id: number;
  absence_type_id: number;
  date_from: string; // YYYY-MM-DD
  date_to: string;
  hours: number;
  approved: boolean;
}

/**
 * TimeTac Abwesenheitstyp
 */
export interface TimeTacAbsenceType {
  id: number;
  name: string;
}

/**
 * TimeTac Zeiteintrag
 */
export interface TimeTacTimeEntry {
  id: number;
  user_id: number;
  date: string;
  task_id?: number;
  project_id?: number;
  duration_hours: number;
  note?: string;
}

/**
 * TimeTac Projekt
 */
export interface TimeTacProject {
  id: number;
  name: string;
  number?: string;
  active: boolean;
}

/**
 * TimeTac Account Info
 */
export interface TimeTacAccount {
  id: number;
  name: string;
}

/**
 * Konfiguration für TimeTac Sync
 */
export interface TimeTacSyncConfig {
  /** Mapping von TimeTac Absence Type IDs zu Planned Absence Types */
  absenceTypeMapping: Record<number, AbsenceType>;
  /** Mapping von TimeTac Project IDs zu Planned Project IDs */
  projectMapping?: Record<number, string>;
}

/**
 * Interface für TimeTac API Service.
 *
 * Kommuniziert mit der TimeTac REST API für:
 * - API-Key Validierung
 * - User-Abfragen
 * - Abwesenheits-Import
 * - Zeiterfassungs-Import
 */
export interface ITimeTacService {
  /**
   * Validiert einen API-Key.
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Lädt Account-Informationen.
   */
  getAccount(apiKey: string): Promise<TimeTacAccount>;

  /**
   * Lädt alle aktiven User.
   */
  getUsers(apiKey: string): Promise<TimeTacUser[]>;

  /**
   * Lädt Abwesenheitstypen.
   */
  getAbsenceTypes(apiKey: string): Promise<TimeTacAbsenceType[]>;

  /**
   * Lädt Abwesenheiten für einen Zeitraum.
   */
  getAbsences(
    apiKey: string,
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TimeTacAbsence[]>;

  /**
   * Lädt Zeiteinträge für einen Zeitraum.
   */
  getTimeEntries(
    apiKey: string,
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TimeTacTimeEntry[]>;

  /**
   * Lädt alle Projekte.
   */
  getProjects(apiKey: string): Promise<TimeTacProject[]>;

  /**
   * Mappt einen TimeTac Abwesenheitstyp auf einen Planned Typ.
   */
  mapAbsenceType(timetacTypeId: number, config: TimeTacSyncConfig): AbsenceType;
}
