import type {
  AsanaAbsenceTask,
  AsanaCustomFieldDefinition,
  AsanaProject,
  AsanaSection,
  AsanaSyncConfig,
  AsanaTask,
  AsanaTaskSyncConfig,
  AsanaTeam,
  AsanaTokenResponse,
  AsanaWorkspace,
  IAsanaService,
  MappedPhaseData,
  MappedProjectData,
  MappedTaskPhaseData,
} from '@/application/ports/services/IAsanaService';

import { fetchWithTimeout } from '@/infrastructure/http';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';

/** Minimum delay between API calls to respect Asana rate limits */
const MIN_REQUEST_DELAY_MS = 100;

/** Maximum number of retry attempts for transient errors */
const MAX_RETRIES = 3;

/** HTTP status codes that are safe to retry */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AsanaServiceConfig {
  clientId: string;
  clientSecret: string;
}

interface AsanaResponse<T> {
  data: T;
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Asana API Service Implementation.
 *
 * Kommuniziert mit der Asana REST API für:
 * - OAuth Token Management
 * - Workspace/Project/Section Abfragen
 * - Daten-Mapping für Import
 */
export class AsanaService implements IAsanaService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private lastRequestTime = 0;

  constructor(config: AsanaServiceConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OAUTH
  // ─────────────────────────────────────────────────────────────────────────

  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<AsanaTokenResponse> {
    const response = await fetchWithTimeout(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    }, 30_000);

    if (!response.ok) {
      throw new Error('Token-Austausch fehlgeschlagen');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<AsanaTokenResponse> {
    const response = await fetchWithTimeout(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    }, 30_000);

    if (!response.ok) {
      throw new Error('Token-Erneuerung fehlgeschlagen');
    }

    return response.json();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API CALLS
  // ─────────────────────────────────────────────────────────────────────────

  async getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
    const response = await this.request<AsanaWorkspace[]>('/workspaces', accessToken);
    return response.data;
  }

  async getCustomFields(
    workspaceId: string,
    accessToken: string
  ): Promise<AsanaCustomFieldDefinition[]> {
    const params = new URLSearchParams({
      opt_fields: 'name,resource_subtype',
    });

    const response = await this.request<AsanaCustomFieldDefinition[]>(
      `/workspaces/${workspaceId}/custom_field_settings?${params}`,
      accessToken
    );

    // custom_field_settings gibt ein Wrapper-Objekt zurück
    // mit custom_field darin, daher müssen wir ggf. mappen
    // Asana API gibt aber bei /custom_field_settings das Feld direkt
    return response.data;
  }

  async getProjectCustomFields(
    projectGid: string,
    accessToken: string
  ): Promise<AsanaCustomFieldDefinition[]> {
    // Projekt-spezifische Custom Fields laden
    // Die API /projects/{gid}/custom_field_settings gibt die Felder mit custom_field Wrapper zurück
    const params = new URLSearchParams({
      opt_fields: 'custom_field,custom_field.gid,custom_field.name,custom_field.resource_subtype,custom_field.enum_options,custom_field.enum_options.gid,custom_field.enum_options.name',
    });

    interface CustomFieldSettingResponse {
      gid: string;
      custom_field: AsanaCustomFieldDefinition;
    }

    const response = await this.request<CustomFieldSettingResponse[]>(
      `/projects/${projectGid}/custom_field_settings?${params}`,
      accessToken
    );

    // Extrahiere die custom_field Objekte aus den Wrapper-Objekten
    return response.data.map((setting) => setting.custom_field);
  }

  async getProjects(
    workspaceId: string,
    accessToken: string,
    options?: { archived?: boolean }
  ): Promise<AsanaProject[]> {
    const params = new URLSearchParams({
      opt_fields: 'name,archived,custom_fields,custom_fields.gid,custom_fields.name,custom_fields.display_value,custom_fields.number_value,custom_fields.text_value',
    });

    if (options?.archived !== undefined) {
      params.set('archived', String(options.archived));
    }

    const response = await this.request<AsanaProject[]>(
      `/workspaces/${workspaceId}/projects?${params}`,
      accessToken
    );
    return response.data;
  }

  async getProjectDetails(
    projectId: string,
    accessToken: string
  ): Promise<AsanaProject> {
    const params = new URLSearchParams({
      opt_fields: 'name,archived,custom_fields,custom_fields.gid,custom_fields.name,custom_fields.display_value,custom_fields.number_value,sections,sections.gid,sections.name',
    });

    const response = await this.request<AsanaProject>(
      `/projects/${projectId}?${params}`,
      accessToken
    );
    return response.data;
  }

  async getSections(
    projectId: string,
    accessToken: string
  ): Promise<AsanaSection[]> {
    const response = await this.request<AsanaSection[]>(
      `/projects/${projectId}/sections`,
      accessToken
    );
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NEU: TEAM & TASK API (für Task-basierte Phasen)
  // ─────────────────────────────────────────────────────────────────────────

  async getTeams(workspaceId: string, accessToken: string): Promise<AsanaTeam[]> {
    const response = await this.request<AsanaTeam[]>(
      `/workspaces/${workspaceId}/teams`,
      accessToken
    );
    return response.data;
  }

  async getWorkspaceUsers(
    workspaceId: string,
    accessToken: string
  ): Promise<Array<{ gid: string; name: string; email: string }>> {
    const params = new URLSearchParams({
      opt_fields: 'gid,name,email',
    });

    const response = await this.request<Array<{ gid: string; name: string; email: string }>>(
      `/workspaces/${workspaceId}/users?${params}`,
      accessToken
    );
    return response.data;
  }

  async getTeamProjects(
    teamGid: string,
    accessToken: string,
    options?: { archived?: boolean }
  ): Promise<AsanaProject[]> {
    const params = new URLSearchParams({
      opt_fields: 'name,archived,custom_fields,custom_fields.gid,custom_fields.name,custom_fields.display_value,custom_fields.number_value,custom_fields.text_value',
    });

    if (options?.archived !== undefined) {
      params.set('archived', String(options.archived));
    }

    const response = await this.request<AsanaProject[]>(
      `/teams/${teamGid}/projects?${params}`,
      accessToken
    );
    return response.data;
  }

  async getTasksFromProject(
    projectGid: string,
    accessToken: string
  ): Promise<AsanaTask[]> {
    // Tasks mit allen relevanten Feldern laden (mit Pagination)
    const optFields = [
      'name',
      'completed',
      'start_on',
      'due_on',
      'notes',           // Plain-Text Beschreibung
      'html_notes',      // Rich-Text Beschreibung (HTML)
      'custom_fields',
      'custom_fields.gid',
      'custom_fields.name',
      'custom_fields.display_value',
      'custom_fields.number_value',
      'custom_fields.text_value',
      'custom_fields.enum_value',
      'custom_fields.enum_value.gid',
      'custom_fields.enum_value.name',
      'projects',
      'projects.gid',
      'projects.name',
    ].join(',');

    return this.requestAllPages<AsanaTask>(
      `/projects/${projectGid}/tasks`,
      accessToken,
      { opt_fields: optFields, limit: '100' }
    );
  }

  async getAbsenceTasks(
    projectGid: string,
    accessToken: string
  ): Promise<AsanaAbsenceTask[]> {
    // Tasks mit Assignee für Abwesenheiten laden (mit Pagination)
    const optFields = [
      'gid',
      'name',
      'completed',
      'start_on',
      'due_on',
      'assignee',
      'assignee.gid',
      'assignee.email',
    ].join(',');

    return this.requestAllPages<AsanaAbsenceTask>(
      `/projects/${projectGid}/tasks`,
      accessToken,
      { opt_fields: optFields, limit: '100' }
    );
  }

  mapTaskToPhase(
    task: AsanaTask,
    config: AsanaTaskSyncConfig,
    teamProjectGids: Set<string>
  ): MappedTaskPhaseData | null {
    // Finde das "andere" Projekt (nicht das sourceProject) aus task.projects[]
    // Graceful: task.projects kann undefined/leer sein
    if (!task.projects || task.projects.length === 0) {
      return null;
    }

    const otherProject = task.projects.find(
      (p) => p.gid !== config.sourceProjectId && teamProjectGids.has(p.gid)
    );

    // Wenn kein passendes Projekt gefunden → Skip
    if (!otherProject) {
      return null;
    }

    // Custom Field Values extrahieren - graceful bei fehlenden Feldern
    const getCustomFieldValue = (
      fieldId?: string
    ): { text?: string; number?: number; enum?: string } => {
      if (!fieldId) return {};

      // Graceful: custom_fields kann undefined oder leer sein
      if (!task.custom_fields || task.custom_fields.length === 0) {
        return {};
      }

      const field = task.custom_fields.find((f) => f.gid === fieldId);
      if (!field) {
        // Custom Field konfiguriert aber nicht am Task vorhanden → OK, Default nutzen
        return {};
      }

      return {
        text: field.text_value ?? field.display_value ?? undefined,
        number: field.number_value ?? undefined,
        enum: field.enum_value?.name ?? undefined,
      };
    };

    // Phasen-Name: Custom Field "Projektphase" oder Task-Name (Fallback)
    const phaseTypeValue = getCustomFieldValue(config.phaseTypeFieldId);
    const name = phaseTypeValue.enum || phaseTypeValue.text || task.name;

    // Bereich aus "Zuordnung" Custom Field
    // Default ist 'nicht_definiert', wird nur gesetzt wenn Custom Field einen bekannten Wert hat
    const zuordnungValue = getCustomFieldValue(config.zuordnungFieldId);
    let bereich: 'produktion' | 'montage' | 'externes_gewerk' | 'nicht_definiert' | 'vertrieb' = 'nicht_definiert';
    if (zuordnungValue.enum || zuordnungValue.text) {
      const value = (zuordnungValue.enum || zuordnungValue.text || '').toLowerCase();
      if (value.includes('produktion')) {
        bereich = 'produktion';
      } else if (value.includes('montage') || value.includes('baustelle')) {
        bereich = 'montage';
      } else if (value.includes('extern')) {
        bereich = 'externes_gewerk';
      } else if (value.includes('vertrieb')) {
        bereich = 'vertrieb';
      }
    }

    // Soll-Stunden - graceful: null wenn Feld fehlt oder nicht konfiguriert
    const sollStundenValue = getCustomFieldValue(config.sollStundenFieldId);
    const budgetHours = sollStundenValue.number ?? null;

    // Ist-Stunden - graceful: null wenn Feld fehlt oder nicht konfiguriert
    const istStundenValue = getCustomFieldValue(config.istStundenFieldId);
    const actualHours = istStundenValue.number ?? null;

    // Projektadresse aus Custom Field - graceful: undefined wenn Feld fehlt
    const addressValue = getCustomFieldValue(config.addressFieldId);
    const projectAddress = addressValue.text ?? undefined;

    // Beschreibung: html_notes bevorzugen, fallback auf notes
    // HTML-Tags für Speicherung entfernen
    let description: string | undefined;
    if (task.html_notes) {
      description = task.html_notes
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .trim();
    } else if (task.notes) {
      description = task.notes.trim();
    }

    // Dates parsen
    const startDate = task.start_on ? new Date(task.start_on) : null;
    const endDate = task.due_on ? new Date(task.due_on) : null;

    return {
      asanaGid: task.gid,
      name,
      bereich,
      startDate,
      endDate,
      budgetHours,
      actualHours,
      description: description || undefined,
      projectAddress,
      projectAsanaGid: otherProject.gid,
      projectName: otherProject.name,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEGACY MAPPING (Section-basiert)
  // ─────────────────────────────────────────────────────────────────────────

  mapToProject(
    asanaProject: AsanaProject,
    config: AsanaSyncConfig
  ): MappedProjectData {
    const getCustomFieldValue = (
      fieldId?: string
    ): string | number | undefined => {
      if (!fieldId || !asanaProject.custom_fields) return undefined;

      const field = asanaProject.custom_fields.find((f) => f.gid === fieldId);
      if (!field) return undefined;

      // Priorität: number_value > text_value > display_value
      if (field.number_value !== null && field.number_value !== undefined) {
        return field.number_value;
      }
      if (field.text_value) {
        return field.text_value;
      }
      return field.display_value ?? undefined;
    };

    const projectNumber = getCustomFieldValue(config.projectNumberFieldId);
    const sollProduktion = getCustomFieldValue(config.sollProduktionFieldId);
    const sollMontage = getCustomFieldValue(config.sollMontageFieldId);

    return {
      asanaGid: asanaProject.gid,
      name: asanaProject.name,
      projectNumber:
        typeof projectNumber === 'string' ? projectNumber : undefined,
      sollProduktion:
        typeof sollProduktion === 'number' ? sollProduktion : undefined,
      sollMontage: typeof sollMontage === 'number' ? sollMontage : undefined,
      isArchived: asanaProject.archived,
    };
  }

  mapSectionToPhase(
    section: AsanaSection,
    _config?: AsanaSyncConfig
  ): MappedPhaseData {
    // Bereich aus Section-Name ableiten
    const nameLower = section.name.toLowerCase();
    let bereich: 'produktion' | 'montage' = 'produktion';

    if (
      nameLower.includes('montage') ||
      nameLower.includes('baustelle')
    ) {
      bereich = 'montage';
    }

    return {
      asanaGid: section.gid,
      name: section.name,
      bereich,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WRITE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async updateSection(
    sectionGid: string,
    data: { name?: string },
    accessToken: string
  ): Promise<AsanaSection> {
    const response = await this.requestWithBody<AsanaSection>(
      `/sections/${sectionGid}`,
      'PUT',
      { data },
      accessToken
    );
    return response.data;
  }

  async updateProjectCustomField(
    projectGid: string,
    fieldGid: string,
    value: string | number,
    accessToken: string
  ): Promise<void> {
    // Asana setzt Custom Fields über das Projekt-Update
    await this.requestWithBody(
      `/projects/${projectGid}`,
      'PUT',
      {
        data: {
          custom_fields: {
            [fieldGid]: value,
          },
        },
      },
      accessToken
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEBHOOKS
  // ─────────────────────────────────────────────────────────────────────────

  async createWebhook(
    resourceGid: string,
    targetUrl: string,
    accessToken: string
  ): Promise<{ gid: string; secret: string }> {
    // Asana gibt beim Webhook-Erstellen das Secret im Response zurück
    const response = await this.requestWithBody<{
      gid: string;
      resource: { gid: string };
      target: string;
    }>(
      '/webhooks',
      'POST',
      {
        data: {
          resource: resourceGid,
          target: targetUrl,
        },
      },
      accessToken
    );

    // Das Secret kommt als X-Hook-Secret Header in der ersten Webhook-Anfrage
    // Hier geben wir vorerst nur die GID zurück
    return {
      gid: response.data.gid,
      secret: '', // Secret wird später über Handshake gesetzt
    };
  }

  async deleteWebhook(webhookGid: string, accessToken: string): Promise<void> {
    await fetchWithTimeout(`${ASANA_API_BASE}/webhooks/${webhookGid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, 30_000);
  }

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    // Asana verwendet HMAC-SHA256
    // In Node.js würden wir crypto.createHmac verwenden
    // Im Browser/Edge Runtime ist SubtleCrypto verfügbar
    // Für einfache Implementierung nutzen wir einen synchronen Vergleich
    // In Produktion sollte timing-safe comparison verwendet werden

    // Asana Signatur-Format: sha256=<hex>
    if (!signature.startsWith('sha256=')) {
      return false;
    }

    // Hinweis: Vollständige Implementierung erfordert crypto-Modul
    // Diese Methode wird im Webhook-Handler mit entsprechender Crypto-Bibliothek aufgerufen
    // Hier nur Placeholder für Interface-Konformität
    return signature.length > 0 && secret.length > 0 && body.length > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    accessToken: string
  ): Promise<AsanaResponse<T>> {
    return this.executeWithRetry<AsanaResponse<T>>(
      () => fetchWithTimeout(`${ASANA_API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }, 30_000),
      `GET ${path}`
    );
  }

  /**
   * Lädt alle Seiten einer paginierten Asana-API-Antwort.
   * Asana gibt max. 100 Items pro Seite + next_page.offset für die nächste Seite.
   */
  private async requestAllPages<T>(
    basePath: string,
    accessToken: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const allItems: T[] = [];
    let offset: string | undefined;

    do {
      const searchParams = new URLSearchParams(params);
      if (offset) {
        searchParams.set('offset', offset);
      }

      const response = await this.request<T[]>(
        `${basePath}?${searchParams}`,
        accessToken
      );

      allItems.push(...response.data);
      offset = response.next_page?.offset;
    } while (offset);

    return allItems;
  }

  private async requestWithBody<T>(
    path: string,
    method: 'POST' | 'PUT' | 'PATCH',
    body: unknown,
    accessToken: string
  ): Promise<AsanaResponse<T>> {
    return this.executeWithRetry<AsanaResponse<T>>(
      () => fetchWithTimeout(`${ASANA_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }, 30_000),
      `${method} ${path}`
    );
  }

  /**
   * Führt einen API-Call mit Retry-Logik und Exponential Backoff aus.
   *
   * Retried werden:
   * - 429 (Rate Limit) → wartet Retry-After Header ab
   * - 500, 502, 503 (Server-Fehler) → Exponential Backoff (1s, 2s, 4s)
   * - Netzwerk-/Timeout-Fehler → Exponential Backoff
   *
   * Nicht retried:
   * - 401 (Token abgelaufen) → sofortiger Throw für Token-Refresh
   * - 4xx Client-Fehler → sofortiger Throw
   */
  private async executeWithRetry<T>(
    fn: () => Promise<Response>,
    context: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.enforceRateLimit();
        const response = await fn();

        if (response.ok) {
          return response.json() as Promise<T>;
        }

        // 401 → Token abgelaufen, nicht retrybar
        if (response.status === 401) {
          throw new Error('ASANA_TOKEN_EXPIRED');
        }

        // Retryable HTTP-Fehler
        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
          const delay = response.status === 429
            ? parseInt(response.headers.get('Retry-After') || '5', 10) * 1000
            : Math.pow(2, attempt - 1) * 1000;
          console.warn(
            `[Asana] ${context}: HTTP ${response.status}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`
          );
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Nicht retrybar oder letzter Versuch
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `Asana API Fehler: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 401 sofort weiterwerfen (Token-Refresh Logik)
        if (lastError.message === 'ASANA_TOKEN_EXPIRED') {
          throw lastError;
        }

        // Netzwerk-/Timeout-Fehler retrybar
        const isNetworkError =
          lastError.message.includes('timed out') ||
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('ENOTFOUND');

        if (isNetworkError && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.warn(
            `[Asana] ${context}: ${lastError.message}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`
          );
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Nicht retrybar oder letzter Versuch → werfen
        throw lastError;
      }
    }

    throw lastError ?? new Error(`[Asana] ${context}: Max retries exceeded`);
  }

  /**
   * Erzwingt minimalen Abstand zwischen API-Requests.
   * Verhindert Rate-Limit-Fehler bei schnellen Sync-Durchläufen.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_DELAY_MS - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }
}
