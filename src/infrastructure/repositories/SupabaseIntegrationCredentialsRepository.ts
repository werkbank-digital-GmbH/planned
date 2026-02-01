import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  IIntegrationCredentialsRepository,
  IntegrationCredentialsData,
  IntegrationCredentialsUpdate,
} from '@/application/ports/repositories';

import type { Database } from '@/lib/database.types';

type CredentialsRow = Database['public']['Tables']['integration_credentials']['Row'];

// ═══════════════════════════════════════════════════════════════════════════
// MAPPER
// ═══════════════════════════════════════════════════════════════════════════

function mapToDomain(row: CredentialsRow): IntegrationCredentialsData {
  return {
    id: row.id,
    tenantId: row.tenant_id,

    // Auth
    asanaAccessToken: row.asana_access_token,
    asanaRefreshToken: row.asana_refresh_token,
    asanaTokenExpiresAt: row.asana_token_expires_at
      ? new Date(row.asana_token_expires_at)
      : null,
    asanaWorkspaceId: row.asana_workspace_id,
    asanaWebhookSecret: row.asana_webhook_secret,

    // Source Config (NEU)
    asanaSourceProjectId: row.asana_source_project_id,
    asanaTeamId: row.asana_team_id,

    // Legacy Field Mappings
    asanaProjectStatusFieldId: row.asana_project_status_field_id,
    asanaSollProduktionFieldId: row.asana_soll_produktion_field_id,
    asanaSollMontageFieldId: row.asana_soll_montage_field_id,
    asanaPhaseBereichFieldId: row.asana_phase_bereich_field_id,
    asanaPhaseBudgetHoursFieldId: row.asana_phase_budget_hours_field_id,

    // NEU Field Mappings
    asanaPhaseTypeFieldId: row.asana_phase_type_field_id,
    asanaZuordnungFieldId: row.asana_zuordnung_field_id,
    asanaSollStundenFieldId: row.asana_soll_stunden_field_id,

    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

function mapToDb(
  data: IntegrationCredentialsUpdate
): Partial<Database['public']['Tables']['integration_credentials']['Update']> {
  const result: Partial<
    Database['public']['Tables']['integration_credentials']['Update']
  > = {};

  // Auth
  if (data.asanaAccessToken !== undefined) {
    result.asana_access_token = data.asanaAccessToken;
  }
  if (data.asanaRefreshToken !== undefined) {
    result.asana_refresh_token = data.asanaRefreshToken;
  }
  if (data.asanaTokenExpiresAt !== undefined) {
    result.asana_token_expires_at = data.asanaTokenExpiresAt?.toISOString() ?? null;
  }
  if (data.asanaWorkspaceId !== undefined) {
    result.asana_workspace_id = data.asanaWorkspaceId;
  }
  if (data.asanaWebhookSecret !== undefined) {
    result.asana_webhook_secret = data.asanaWebhookSecret;
  }

  // Source Config (NEU)
  if (data.asanaSourceProjectId !== undefined) {
    result.asana_source_project_id = data.asanaSourceProjectId;
  }
  if (data.asanaTeamId !== undefined) {
    result.asana_team_id = data.asanaTeamId;
  }

  // Legacy Field Mappings
  if (data.asanaProjectStatusFieldId !== undefined) {
    result.asana_project_status_field_id = data.asanaProjectStatusFieldId;
  }
  if (data.asanaSollProduktionFieldId !== undefined) {
    result.asana_soll_produktion_field_id = data.asanaSollProduktionFieldId;
  }
  if (data.asanaSollMontageFieldId !== undefined) {
    result.asana_soll_montage_field_id = data.asanaSollMontageFieldId;
  }
  if (data.asanaPhaseBereichFieldId !== undefined) {
    result.asana_phase_bereich_field_id = data.asanaPhaseBereichFieldId;
  }
  if (data.asanaPhaseBudgetHoursFieldId !== undefined) {
    result.asana_phase_budget_hours_field_id = data.asanaPhaseBudgetHoursFieldId;
  }

  // NEU Field Mappings
  if (data.asanaPhaseTypeFieldId !== undefined) {
    result.asana_phase_type_field_id = data.asanaPhaseTypeFieldId;
  }
  if (data.asanaZuordnungFieldId !== undefined) {
    result.asana_zuordnung_field_id = data.asanaZuordnungFieldId;
  }
  if (data.asanaSollStundenFieldId !== undefined) {
    result.asana_soll_stunden_field_id = data.asanaSollStundenFieldId;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supabase-Implementierung des IIntegrationCredentialsRepository.
 *
 * Speichert OAuth-Tokens und API-Keys für externe Integrationen.
 */
export class SupabaseIntegrationCredentialsRepository
  implements IIntegrationCredentialsRepository
{
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByTenantId(tenantId: string): Promise<IntegrationCredentialsData | null> {
    const { data, error } = await this.supabase
      .from('integration_credentials')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapToDomain(data);
  }

  async upsert(
    tenantId: string,
    data: IntegrationCredentialsUpdate
  ): Promise<IntegrationCredentialsData> {
    const dbData = mapToDb(data);

    const { data: result, error } = await this.supabase
      .from('integration_credentials')
      .upsert(
        {
          tenant_id: tenantId,
          ...dbData,
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Credentials speichern fehlgeschlagen: ${error.message}`);
    }

    return mapToDomain(result);
  }

  async update(tenantId: string, data: IntegrationCredentialsUpdate): Promise<void> {
    const dbData = mapToDb(data);

    const { error } = await this.supabase
      .from('integration_credentials')
      .update(dbData)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Credentials aktualisieren fehlgeschlagen: ${error.message}`);
    }
  }

  async clearAsanaCredentials(tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('integration_credentials')
      .update({
        asana_access_token: null,
        asana_refresh_token: null,
        asana_token_expires_at: null,
        asana_workspace_id: null,
        asana_webhook_secret: null,
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Asana Credentials löschen fehlgeschlagen: ${error.message}`);
    }
  }

  async hasAsanaConnection(tenantId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('integration_credentials')
      .select('asana_access_token')
      .eq('tenant_id', tenantId)
      .single();

    return !!data?.asana_access_token;
  }
}
