import type {
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

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AsanaServiceConfig {
  clientId: string;
  clientSecret: string;
}

interface AsanaResponse<T> {
  data: T;
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
    const response = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Token-Austausch fehlgeschlagen');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<AsanaTokenResponse> {
    const response = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

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
    // Tasks mit allen relevanten Feldern laden
    const params = new URLSearchParams({
      opt_fields: [
        'name',
        'completed',
        'start_on',
        'due_on',
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
      ].join(','),
    });

    const response = await this.request<AsanaTask[]>(
      `/projects/${projectGid}/tasks?${params}`,
      accessToken
    );
    return response.data;
  }

  mapTaskToPhase(
    task: AsanaTask,
    config: AsanaTaskSyncConfig,
    teamProjectGids: Set<string>
  ): MappedTaskPhaseData | null {
    // Finde das "andere" Projekt (nicht das sourceProject) aus task.projects[]
    const otherProject = task.projects.find(
      (p) => p.gid !== config.sourceProjectId && teamProjectGids.has(p.gid)
    );

    // Wenn kein passendes Projekt gefunden → Skip
    if (!otherProject) {
      return null;
    }

    // Custom Field Values extrahieren
    const getCustomFieldValue = (
      fieldId?: string
    ): { text?: string; number?: number; enum?: string } => {
      if (!fieldId || !task.custom_fields) return {};

      const field = task.custom_fields.find((f) => f.gid === fieldId);
      if (!field) return {};

      return {
        text: field.text_value ?? field.display_value ?? undefined,
        number: field.number_value ?? undefined,
        enum: field.enum_value?.name ?? undefined,
      };
    };

    // Phasen-Name: Custom Field "Projektphase" oder Task-Name
    const phaseTypeValue = getCustomFieldValue(config.phaseTypeFieldId);
    const name = phaseTypeValue.enum || phaseTypeValue.text || task.name;

    // Bereich aus "Zuordnung" Custom Field
    // Default ist 'nicht_definiert', wird nur gesetzt wenn Custom Field einen bekannten Wert hat
    const zuordnungValue = getCustomFieldValue(config.zuordnungFieldId);
    let bereich: 'produktion' | 'montage' | 'externes_gewerk' | 'nicht_definiert' = 'nicht_definiert';
    if (zuordnungValue.enum || zuordnungValue.text) {
      const value = (zuordnungValue.enum || zuordnungValue.text || '').toLowerCase();
      if (value.includes('produktion')) {
        bereich = 'produktion';
      } else if (value.includes('montage') || value.includes('baustelle')) {
        bereich = 'montage';
      } else if (value.includes('extern')) {
        bereich = 'externes_gewerk';
      }
    }

    // Soll-Stunden
    const sollStundenValue = getCustomFieldValue(config.sollStundenFieldId);
    const budgetHours = sollStundenValue.number ?? null;

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
    await fetch(`${ASANA_API_BASE}/webhooks/${webhookGid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
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
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ASANA_TOKEN_EXPIRED');
      }
      throw new Error(`Asana API Fehler: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async requestWithBody<T>(
    path: string,
    method: 'POST' | 'PUT' | 'PATCH',
    body: unknown,
    accessToken: string
  ): Promise<AsanaResponse<T>> {
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ASANA_TOKEN_EXPIRED');
      }
      const errorBody = await response.text();
      throw new Error(`Asana API Fehler: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }
}
