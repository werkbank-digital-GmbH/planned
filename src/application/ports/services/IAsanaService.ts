/**
 * Asana API Response Types
 */

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaCustomField {
  gid: string;
  name: string;
  display_value: string | null;
  number_value: number | null;
  text_value: string | null;
}

export interface AsanaSection {
  gid: string;
  name: string;
}

/**
 * Custom Field Definition aus Workspace
 */
export interface AsanaCustomFieldDefinition {
  gid: string;
  name: string;
  resource_subtype: 'text' | 'number' | 'enum' | 'multi_enum' | 'date' | 'people';
}

export interface AsanaProject {
  gid: string;
  name: string;
  archived: boolean;
  custom_fields?: AsanaCustomField[];
  sections?: AsanaSection[];
}

export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
}

/**
 * Konfiguration für Asana Sync
 */
export interface AsanaSyncConfig {
  workspaceId: string;
  /** Custom Field GID für Projektnummer */
  projectNumberFieldId?: string;
  /** Custom Field GID für SOLL Produktion */
  sollProduktionFieldId?: string;
  /** Custom Field GID für SOLL Montage */
  sollMontageFieldId?: string;
  /** Custom Field GID für Phase Bereich */
  phaseBereichFieldId?: string;
  /** Custom Field GID für Phase Budget Hours */
  phaseBudgetHoursFieldId?: string;
}

/**
 * Gemappte Projekt-Daten für Import
 */
export interface MappedProjectData {
  asanaGid: string;
  name: string;
  projectNumber?: string;
  sollProduktion?: number;
  sollMontage?: number;
  isArchived: boolean;
}

/**
 * Gemappte Phasen-Daten für Import
 */
export interface MappedPhaseData {
  asanaGid: string;
  name: string;
  bereich: 'produktion' | 'montage';
  budgetHours?: number;
}

/**
 * Asana OAuth Token Response
 */
export interface AsanaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  data: {
    gid: string;
    name: string;
    email: string;
  };
}

/**
 * Interface für Asana API Service.
 *
 * Abstrahiert die Kommunikation mit der Asana API.
 * Wird in Infrastructure implementiert.
 */
export interface IAsanaService {
  /**
   * Tauscht Authorization Code gegen Tokens.
   */
  exchangeCodeForToken(code: string, redirectUri: string): Promise<AsanaTokenResponse>;

  /**
   * Erneuert Access Token mit Refresh Token.
   */
  refreshAccessToken(refreshToken: string): Promise<AsanaTokenResponse>;

  /**
   * Lädt alle Workspaces des authentifizierten Users.
   */
  getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]>;

  /**
   * Lädt alle Custom Field Definitionen eines Workspaces.
   */
  getCustomFields(
    workspaceId: string,
    accessToken: string
  ): Promise<AsanaCustomFieldDefinition[]>;

  /**
   * Lädt alle Projekte eines Workspaces.
   */
  getProjects(
    workspaceId: string,
    accessToken: string,
    options?: { archived?: boolean }
  ): Promise<AsanaProject[]>;

  /**
   * Lädt Details eines einzelnen Projekts.
   */
  getProjectDetails(projectId: string, accessToken: string): Promise<AsanaProject>;

  /**
   * Lädt alle Sections eines Projekts.
   */
  getSections(projectId: string, accessToken: string): Promise<AsanaSection[]>;

  /**
   * Mappt ein Asana-Projekt auf interne Projektdaten.
   */
  mapToProject(asanaProject: AsanaProject, config: AsanaSyncConfig): MappedProjectData;

  /**
   * Mappt eine Asana-Section auf interne Phasendaten.
   */
  mapSectionToPhase(section: AsanaSection, config?: AsanaSyncConfig): MappedPhaseData;
}
