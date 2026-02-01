import type {
  ITimeTacService,
  TimeTacAbsence,
  TimeTacAbsenceType,
  TimeTacAccount,
  TimeTacProject,
  TimeTacSyncConfig,
  TimeTacTimeEntry,
  TimeTacUser,
} from '@/application/ports/services/ITimeTacService';

import type { AbsenceType } from '@/lib/database.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIMETAC_API_BASE = 'https://go.timetac.com/api/v3';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TimeTacResponse<T> {
  data: T;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TimeTac API Service Implementation.
 *
 * Kommuniziert mit der TimeTac REST API für:
 * - API-Key Validierung
 * - User-Abfragen
 * - Abwesenheits-Import
 * - Zeiterfassungs-Import
 */
export class TimeTacService implements ITimeTacService {
  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.request<TimeTacAccount>('/account', apiKey);
      return !!response.data;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNT
  // ─────────────────────────────────────────────────────────────────────────

  async getAccount(apiKey: string): Promise<TimeTacAccount> {
    const response = await this.request<TimeTacAccount>('/account', apiKey);
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────────────────────

  async getUsers(apiKey: string): Promise<TimeTacUser[]> {
    const response = await this.request<TimeTacUser[]>('/users', apiKey);
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ABSENCE TYPES
  // ─────────────────────────────────────────────────────────────────────────

  async getAbsenceTypes(apiKey: string): Promise<TimeTacAbsenceType[]> {
    const response = await this.request<TimeTacAbsenceType[]>(
      '/absence_types',
      apiKey
    );
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ABSENCES
  // ─────────────────────────────────────────────────────────────────────────

  async getAbsences(
    apiKey: string,
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TimeTacAbsence[]> {
    const params = new URLSearchParams({
      date_from: this.formatDate(startDate),
      date_to: this.formatDate(endDate),
    });

    if (userId !== undefined) {
      params.set('user_id', String(userId));
    }

    const response = await this.request<TimeTacAbsence[]>(
      `/absences?${params}`,
      apiKey
    );
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIME ENTRIES
  // ─────────────────────────────────────────────────────────────────────────

  async getTimeEntries(
    apiKey: string,
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TimeTacTimeEntry[]> {
    const params = new URLSearchParams({
      date_from: this.formatDate(startDate),
      date_to: this.formatDate(endDate),
    });

    if (userId !== undefined) {
      params.set('user_id', String(userId));
    }

    const response = await this.request<TimeTacTimeEntry[]>(
      `/time_entries?${params}`,
      apiKey
    );
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECTS
  // ─────────────────────────────────────────────────────────────────────────

  async getProjects(apiKey: string): Promise<TimeTacProject[]> {
    const response = await this.request<TimeTacProject[]>('/projects', apiKey);
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAPPING
  // ─────────────────────────────────────────────────────────────────────────

  mapAbsenceType(timetacTypeId: number, config: TimeTacSyncConfig): AbsenceType {
    return config.absenceTypeMapping[timetacTypeId] ?? 'other';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    apiKey: string
  ): Promise<TimeTacResponse<T>> {
    const response = await fetch(`${TIMETAC_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('TIMETAC_INVALID_API_KEY');
      }
      throw new Error(`TimeTac API Fehler: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
