/**
 * Integration Credentials für einen Tenant
 */
export interface IntegrationCredentialsData {
  id: string;
  tenantId: string;

  // Asana - Auth
  asanaAccessToken: string | null;
  asanaRefreshToken: string | null;
  asanaTokenExpiresAt: Date | null;
  asanaWorkspaceId: string | null;
  asanaWebhookSecret: string | null;

  // Asana - Source Config (NEU)
  asanaSourceProjectId: string | null;  // GID des Quell-Projekts (z.B. "Jahresplanung")
  asanaTeamId: string | null;           // GID des Teams für Bauvorhaben

  // Asana - Custom Field Mappings (Legacy)
  asanaProjectStatusFieldId: string | null;
  asanaSollProduktionFieldId: string | null;
  asanaSollMontageFieldId: string | null;
  asanaPhaseBereichFieldId: string | null;
  asanaPhaseBudgetHoursFieldId: string | null;

  // Asana - Custom Field Mappings (NEU für Task-basierte Phasen)
  asanaPhaseTypeFieldId: string | null;     // "Projektphase" Dropdown
  asanaZuordnungFieldId: string | null;     // "Zuordnung" Dropdown (Bereich)
  asanaSollStundenFieldId: string | null;   // "Soll-Stunden" Number

  // TimeTac
  timetacAccountId: string | null;
  timetacApiToken: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update-Daten für Integration Credentials
 */
export interface IntegrationCredentialsUpdate {
  asanaAccessToken?: string | null;
  asanaRefreshToken?: string | null;
  asanaTokenExpiresAt?: Date | null;
  asanaWorkspaceId?: string | null;
  asanaWebhookSecret?: string | null;

  // Source Config (NEU)
  asanaSourceProjectId?: string | null;
  asanaTeamId?: string | null;

  // Legacy Field Mappings
  asanaProjectStatusFieldId?: string | null;
  asanaSollProduktionFieldId?: string | null;
  asanaSollMontageFieldId?: string | null;
  asanaPhaseBereichFieldId?: string | null;
  asanaPhaseBudgetHoursFieldId?: string | null;

  // NEU Field Mappings
  asanaPhaseTypeFieldId?: string | null;
  asanaZuordnungFieldId?: string | null;
  asanaSollStundenFieldId?: string | null;

  timetacAccountId?: string | null;
  timetacApiToken?: string | null;
}

/**
 * Repository Interface für Integration Credentials.
 *
 * Speichert OAuth-Tokens und API-Keys für externe Integrationen.
 * Tokens werden verschlüsselt gespeichert.
 */
export interface IIntegrationCredentialsRepository {
  /**
   * Findet Credentials für einen Tenant.
   */
  findByTenantId(tenantId: string): Promise<IntegrationCredentialsData | null>;

  /**
   * Erstellt oder aktualisiert Credentials für einen Tenant.
   */
  upsert(
    tenantId: string,
    data: IntegrationCredentialsUpdate
  ): Promise<IntegrationCredentialsData>;

  /**
   * Aktualisiert Credentials.
   */
  update(tenantId: string, data: IntegrationCredentialsUpdate): Promise<void>;

  /**
   * Löscht alle Asana-Credentials (Verbindung trennen).
   */
  clearAsanaCredentials(tenantId: string): Promise<void>;

  /**
   * Löscht alle TimeTac-Credentials.
   */
  clearTimeTacCredentials(tenantId: string): Promise<void>;

  /**
   * Prüft ob Asana verbunden ist.
   */
  hasAsanaConnection(tenantId: string): Promise<boolean>;

  /**
   * Prüft ob TimeTac verbunden ist.
   */
  hasTimeTacConnection(tenantId: string): Promise<boolean>;
}
