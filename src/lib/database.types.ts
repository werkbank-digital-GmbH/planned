/**
 * Database Types für Supabase
 *
 * Diese Datei wird normalerweise mit `supabase gen types typescript` generiert.
 * Hier ist eine manuelle Version basierend auf dem DATA_MODEL.md Schema.
 *
 * Nach dem Setup der lokalen Supabase-Instanz sollte diese Datei
 * mit dem generierten Output ersetzt werden:
 *
 * ```bash
 * pnpm supabase gen types typescript --local > src/lib/database.types.ts
 * ```
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          tenant_id: string;
          email: string;
          full_name: string;
          role: Database['public']['Enums']['user_role'];
          weekly_hours: number;
          is_active: boolean;
          timetac_id: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          tenant_id: string;
          email: string;
          full_name: string;
          role?: Database['public']['Enums']['user_role'];
          weekly_hours?: number;
          is_active?: boolean;
          timetac_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          tenant_id?: string;
          email?: string;
          full_name?: string;
          role?: Database['public']['Enums']['user_role'];
          weekly_hours?: number;
          is_active?: boolean;
          timetac_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_auth_id_fkey';
            columns: ['auth_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      integration_credentials: {
        Row: {
          id: string;
          tenant_id: string;
          asana_access_token: string | null;
          asana_refresh_token: string | null;
          asana_token_expires_at: string | null;
          asana_workspace_id: string | null;
          asana_webhook_secret: string | null;
          asana_project_status_field_id: string | null;
          asana_soll_produktion_field_id: string | null;
          asana_soll_montage_field_id: string | null;
          asana_phase_bereich_field_id: string | null;
          asana_phase_budget_hours_field_id: string | null;
          timetac_account_id: string | null;
          timetac_api_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          asana_access_token?: string | null;
          asana_refresh_token?: string | null;
          asana_token_expires_at?: string | null;
          asana_workspace_id?: string | null;
          asana_webhook_secret?: string | null;
          asana_project_status_field_id?: string | null;
          asana_soll_produktion_field_id?: string | null;
          asana_soll_montage_field_id?: string | null;
          asana_phase_bereich_field_id?: string | null;
          asana_phase_budget_hours_field_id?: string | null;
          timetac_account_id?: string | null;
          timetac_api_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          asana_access_token?: string | null;
          asana_refresh_token?: string | null;
          asana_token_expires_at?: string | null;
          asana_workspace_id?: string | null;
          asana_webhook_secret?: string | null;
          asana_project_status_field_id?: string | null;
          asana_soll_produktion_field_id?: string | null;
          asana_soll_montage_field_id?: string | null;
          asana_phase_bereich_field_id?: string | null;
          asana_phase_budget_hours_field_id?: string | null;
          timetac_account_id?: string | null;
          timetac_api_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'integration_credentials_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      resource_types: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resource_types_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      resources: {
        Row: {
          id: string;
          tenant_id: string;
          resource_type_id: string;
          name: string;
          license_plate: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          resource_type_id: string;
          name: string;
          license_plate?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          resource_type_id?: string;
          name?: string;
          license_plate?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_resource_type_id_fkey';
            columns: ['resource_type_id'];
            referencedRelation: 'resource_types';
            referencedColumns: ['id'];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          client_name: string | null;
          address: string | null;
          status: Database['public']['Enums']['project_status'];
          asana_gid: string | null;
          synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          client_name?: string | null;
          address?: string | null;
          status?: Database['public']['Enums']['project_status'];
          asana_gid?: string | null;
          synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          client_name?: string | null;
          address?: string | null;
          status?: Database['public']['Enums']['project_status'];
          asana_gid?: string | null;
          synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          bereich: Database['public']['Enums']['phase_bereich'];
          start_date: string | null;
          end_date: string | null;
          sort_order: number;
          budget_hours: number | null;
          planned_hours: number;
          actual_hours: number;
          status: Database['public']['Enums']['phase_status'];
          asana_gid: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          bereich: Database['public']['Enums']['phase_bereich'];
          start_date?: string | null;
          end_date?: string | null;
          sort_order?: number;
          budget_hours?: number | null;
          planned_hours?: number;
          actual_hours?: number;
          status?: Database['public']['Enums']['phase_status'];
          asana_gid?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          bereich?: Database['public']['Enums']['phase_bereich'];
          start_date?: string | null;
          end_date?: string | null;
          sort_order?: number;
          budget_hours?: number | null;
          planned_hours?: number;
          actual_hours?: number;
          status?: Database['public']['Enums']['phase_status'];
          asana_gid?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_phases_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
      allocations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          resource_id: string | null;
          project_phase_id: string;
          date: string;
          planned_hours: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          resource_id?: string | null;
          project_phase_id: string;
          date: string;
          planned_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          resource_id?: string | null;
          project_phase_id?: string;
          date?: string;
          planned_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'allocations_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'allocations_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'allocations_resource_id_fkey';
            columns: ['resource_id'];
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'allocations_project_phase_id_fkey';
            columns: ['project_phase_id'];
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          }
        ];
      };
      time_entries: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          project_phase_id: string | null;
          date: string;
          hours: number;
          description: string | null;
          timetac_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          project_phase_id?: string | null;
          date: string;
          hours: number;
          description?: string | null;
          timetac_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          project_phase_id?: string | null;
          date?: string;
          hours?: number;
          description?: string | null;
          timetac_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_project_phase_id_fkey';
            columns: ['project_phase_id'];
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          }
        ];
      };
      absences: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          type: Database['public']['Enums']['absence_type'];
          start_date: string;
          end_date: string;
          notes: string | null;
          timetac_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          type: Database['public']['Enums']['absence_type'];
          start_date: string;
          end_date: string;
          notes?: string | null;
          timetac_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['absence_type'];
          start_date?: string;
          end_date?: string;
          notes?: string | null;
          timetac_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'absences_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absences_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      sync_logs: {
        Row: {
          id: string;
          tenant_id: string;
          service: Database['public']['Enums']['sync_service'];
          operation: string;
          status: Database['public']['Enums']['sync_status'];
          result: Json | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service: Database['public']['Enums']['sync_service'];
          operation: string;
          status?: Database['public']['Enums']['sync_status'];
          result?: Json | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          service?: Database['public']['Enums']['sync_service'];
          operation?: string;
          status?: Database['public']['Enums']['sync_status'];
          result?: Json | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      absence_conflicts: {
        Row: {
          id: string;
          tenant_id: string;
          allocation_id: string;
          absence_id: string;
          user_id: string;
          date: string;
          absence_type: Database['public']['Enums']['absence_type'];
          resolved_at: string | null;
          resolved_by: string | null;
          resolution: Database['public']['Enums']['conflict_resolution'] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          allocation_id: string;
          absence_id: string;
          user_id: string;
          date: string;
          absence_type: Database['public']['Enums']['absence_type'];
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution?: Database['public']['Enums']['conflict_resolution'] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          allocation_id?: string;
          absence_id?: string;
          user_id?: string;
          date?: string;
          absence_type?: Database['public']['Enums']['absence_type'];
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution?: Database['public']['Enums']['conflict_resolution'] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'absence_conflicts_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absence_conflicts_allocation_id_fkey';
            columns: ['allocation_id'];
            referencedRelation: 'allocations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absence_conflicts_absence_id_fkey';
            columns: ['absence_id'];
            referencedRelation: 'absences';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absence_conflicts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absence_conflicts_resolved_by_fkey';
            columns: ['resolved_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      integration_mappings: {
        Row: {
          id: string;
          tenant_id: string;
          service: string;
          mapping_type: string;
          external_id: string;
          internal_id: string;
          external_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service: string;
          mapping_type: string;
          external_id: string;
          internal_id: string;
          external_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          service?: string;
          mapping_type?: string;
          external_id?: string;
          internal_id?: string;
          external_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'integration_mappings_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_current_user_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_current_user_planer_or_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      create_user_for_auth: {
        Args: {
          p_auth_id: string;
          p_tenant_id: string;
          p_email: string;
          p_full_name: string;
          p_role?: Database['public']['Enums']['user_role'];
        };
        Returns: string;
      };
      create_tenant_with_admin: {
        Args: {
          p_auth_id: string;
          p_tenant_name: string;
          p_tenant_slug: string;
          p_admin_email: string;
          p_admin_full_name: string;
        };
        Returns: {
          tenant_id: string;
          user_id: string;
        }[];
      };
      get_current_user_with_tenant: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          auth_id: string;
          email: string;
          full_name: string;
          role: Database['public']['Enums']['user_role'];
          weekly_hours: number;
          avatar_url: string | null;
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          tenant_settings: Json;
        }[];
      };
      check_user_absence_conflict: {
        Args: {
          p_user_id: string;
          p_date: string;
        };
        Returns: {
          has_conflict: boolean;
          absence_type: Database['public']['Enums']['absence_type'] | null;
          absence_id: string | null;
        }[];
      };
      get_allocations_for_week: {
        Args: {
          p_tenant_id: string;
          p_week_start: string;
        };
        Returns: {
          allocation_id: string;
          date: string;
          planned_hours: number | null;
          notes: string | null;
          user_id: string | null;
          user_name: string | null;
          user_weekly_hours: number | null;
          user_avatar_url: string | null;
          resource_id: string | null;
          resource_name: string | null;
          resource_type_name: string | null;
          resource_type_icon: string | null;
          resource_type_color: string | null;
          phase_id: string;
          phase_name: string;
          phase_bereich: Database['public']['Enums']['phase_bereich'];
          phase_budget_hours: number | null;
          phase_actual_hours: number;
          phase_start_date: string | null;
          phase_end_date: string | null;
          project_id: string;
          project_name: string;
          project_address: string | null;
          project_status: Database['public']['Enums']['project_status'];
          has_absence_conflict: boolean;
          absence_type: Database['public']['Enums']['absence_type'] | null;
        }[];
      };
    };
    Enums: {
      user_role: 'admin' | 'planer' | 'gewerblich';
      project_status: 'planning' | 'active' | 'paused' | 'completed';
      phase_bereich: 'produktion' | 'montage';
      phase_status: 'active' | 'deleted';
      absence_type: 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
      sync_service: 'asana' | 'timetac';
      sync_status: 'running' | 'success' | 'partial' | 'failed';
      conflict_resolution: 'moved' | 'deleted' | 'ignored';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper Types für einfacheren Zugriff
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Convenience Aliases
export type Tenant = Tables<'tenants'>;
export type User = Tables<'users'>;
export type IntegrationCredentials = Tables<'integration_credentials'>;
export type ResourceType = Tables<'resource_types'>;
export type Resource = Tables<'resources'>;
export type Project = Tables<'projects'>;
export type ProjectPhase = Tables<'project_phases'>;
export type Allocation = Tables<'allocations'>;
export type TimeEntry = Tables<'time_entries'>;
export type Absence = Tables<'absences'>;
export type SyncLog = Tables<'sync_logs'>;

export type UserRole = Enums<'user_role'>;
export type ProjectStatus = Enums<'project_status'>;
export type PhaseBereich = Enums<'phase_bereich'>;
export type PhaseStatus = Enums<'phase_status'>;
export type AbsenceType = Enums<'absence_type'>;
export type SyncService = Enums<'sync_service'>;
export type SyncStatus = Enums<'sync_status'>;
export type ConflictResolution = Enums<'conflict_resolution'>;

export type AbsenceConflict = Tables<'absence_conflicts'>;
export type IntegrationMapping = Tables<'integration_mappings'>;
