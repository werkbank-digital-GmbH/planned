import type {
  AsanaCustomFieldDefinition,
  AsanaProject,
  AsanaSection,
  AsanaSyncConfig,
  AsanaTokenResponse,
  AsanaWorkspace,
  IAsanaService,
  MappedPhaseData,
  MappedProjectData,
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
  // MAPPING
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
}
