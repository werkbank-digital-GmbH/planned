export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absence_conflicts: {
        Row: {
          absence_id: string
          absence_type: Database["public"]["Enums"]["absence_type"]
          allocation_id: string
          created_at: string
          date: string
          id: string
          resolution: Database["public"]["Enums"]["conflict_resolution"] | null
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          absence_id: string
          absence_type: Database["public"]["Enums"]["absence_type"]
          allocation_id: string
          created_at?: string
          date: string
          id?: string
          resolution?: Database["public"]["Enums"]["conflict_resolution"] | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          absence_id?: string
          absence_type?: Database["public"]["Enums"]["absence_type"]
          allocation_id?: string
          created_at?: string
          date?: string
          id?: string
          resolution?: Database["public"]["Enums"]["conflict_resolution"] | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_conflicts_absence_id_fkey"
            columns: ["absence_id"]
            isOneToOne: false
            referencedRelation: "absences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_conflicts_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_conflicts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_conflicts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      absences: {
        Row: {
          asana_gid: string | null
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          start_date: string
          tenant_id: string
          timetac_id: string | null
          type: Database["public"]["Enums"]["absence_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          asana_gid?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          tenant_id: string
          timetac_id?: string | null
          type: Database["public"]["Enums"]["absence_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          asana_gid?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          tenant_id?: string
          timetac_id?: string | null
          type?: Database["public"]["Enums"]["absence_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          planned_hours: number | null
          project_phase_id: string
          resource_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          planned_hours?: number | null
          project_phase_id: string
          resource_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          planned_hours?: number | null
          project_phase_id?: string
          resource_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_project_phase_id_fkey"
            columns: ["project_phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          asana_absence_project_id: string | null
          asana_access_token: string | null
          asana_ist_stunden_field_id: string | null
          asana_phase_bereich_field_id: string | null
          asana_phase_budget_hours_field_id: string | null
          asana_phase_type_field_id: string | null
          asana_project_status_field_id: string | null
          asana_refresh_token: string | null
          asana_soll_montage_field_id: string | null
          asana_soll_produktion_field_id: string | null
          asana_soll_stunden_field_id: string | null
          asana_source_project_id: string | null
          asana_team_id: string | null
          asana_token_expires_at: string | null
          asana_webhook_secret: string | null
          asana_workspace_id: string | null
          asana_zuordnung_field_id: string | null
          created_at: string | null
          id: string
          tenant_id: string
          timetac_account_id: string | null
          timetac_api_token: string | null
          updated_at: string | null
        }
        Insert: {
          asana_absence_project_id?: string | null
          asana_access_token?: string | null
          asana_ist_stunden_field_id?: string | null
          asana_phase_bereich_field_id?: string | null
          asana_phase_budget_hours_field_id?: string | null
          asana_phase_type_field_id?: string | null
          asana_project_status_field_id?: string | null
          asana_refresh_token?: string | null
          asana_soll_montage_field_id?: string | null
          asana_soll_produktion_field_id?: string | null
          asana_soll_stunden_field_id?: string | null
          asana_source_project_id?: string | null
          asana_team_id?: string | null
          asana_token_expires_at?: string | null
          asana_webhook_secret?: string | null
          asana_workspace_id?: string | null
          asana_zuordnung_field_id?: string | null
          created_at?: string | null
          id?: string
          tenant_id: string
          timetac_account_id?: string | null
          timetac_api_token?: string | null
          updated_at?: string | null
        }
        Update: {
          asana_absence_project_id?: string | null
          asana_access_token?: string | null
          asana_ist_stunden_field_id?: string | null
          asana_phase_bereich_field_id?: string | null
          asana_phase_budget_hours_field_id?: string | null
          asana_phase_type_field_id?: string | null
          asana_project_status_field_id?: string | null
          asana_refresh_token?: string | null
          asana_soll_montage_field_id?: string | null
          asana_soll_produktion_field_id?: string | null
          asana_soll_stunden_field_id?: string | null
          asana_source_project_id?: string | null
          asana_team_id?: string | null
          asana_token_expires_at?: string | null
          asana_webhook_secret?: string | null
          asana_workspace_id?: string | null
          asana_zuordnung_field_id?: string | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          timetac_account_id?: string | null
          timetac_api_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_mappings: {
        Row: {
          created_at: string
          external_id: string
          external_name: string | null
          id: string
          internal_id: string
          mapping_type: string
          service: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id: string
          external_name?: string | null
          id?: string
          internal_id: string
          mapping_type: string
          service: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          external_name?: string | null
          id?: string
          internal_id?: string
          mapping_type?: string
          service?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          actual_hours: number | null
          asana_gid: string | null
          bereich: Database["public"]["Enums"]["phase_bereich"]
          budget_hours: number | null
          created_at: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          name: string
          planned_hours: number | null
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          asana_gid?: string | null
          bereich: Database["public"]["Enums"]["phase_bereich"]
          budget_hours?: number | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          planned_hours?: number | null
          project_id: string
          sort_order?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          asana_gid?: string | null
          bereich?: Database["public"]["Enums"]["phase_bereich"]
          budget_hours?: number | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          planned_hours?: number | null
          project_id?: string
          sort_order?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          asana_gid: string | null
          client_name: string | null
          created_at: string | null
          drive_folder_url: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"] | null
          synced_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          asana_gid?: string | null
          client_name?: string | null
          created_at?: string | null
          drive_folder_url?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"] | null
          synced_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          asana_gid?: string | null
          client_name?: string | null
          created_at?: string | null
          drive_folder_url?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          license_plate: string | null
          name: string
          resource_type_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name: string
          resource_type_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name?: string
          resource_type_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          operation: string
          result: Json | null
          service: Database["public"]["Enums"]["sync_service"]
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          operation: string
          result?: Json | null
          service: Database["public"]["Enums"]["sync_service"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          result?: Json | null
          service?: Database["public"]["Enums"]["sync_service"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          hours: number
          id: string
          project_phase_id: string | null
          tenant_id: string
          timetac_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          hours: number
          id?: string
          project_phase_id?: string | null
          tenant_id: string
          timetac_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          hours?: number
          id?: string
          project_phase_id?: string | null
          tenant_id?: string
          timetac_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_phase_id_fkey"
            columns: ["project_phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          timetac_id: string | null
          updated_at: string | null
          weekly_hours: number | null
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          timetac_id?: string | null
          updated_at?: string | null
          weekly_hours?: number | null
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          timetac_id?: string | null
          updated_at?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_absence_conflict: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          absence_id: string
          absence_type: Database["public"]["Enums"]["absence_type"]
          has_conflict: boolean
        }[]
      }
      create_tenant_with_admin: {
        Args: {
          p_admin_email: string
          p_admin_full_name: string
          p_auth_id: string
          p_tenant_name: string
          p_tenant_slug: string
        }
        Returns: {
          tenant_id: string
          user_id: string
        }[]
      }
      create_user_for_auth: {
        Args: {
          p_auth_id: string
          p_email: string
          p_full_name: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_tenant_id: string
        }
        Returns: string
      }
      get_allocations_for_week: {
        Args: { p_tenant_id: string; p_week_start: string }
        Returns: {
          absence_type: Database["public"]["Enums"]["absence_type"]
          allocation_id: string
          date: string
          has_absence_conflict: boolean
          notes: string
          phase_actual_hours: number
          phase_bereich: Database["public"]["Enums"]["phase_bereich"]
          phase_budget_hours: number
          phase_end_date: string
          phase_id: string
          phase_name: string
          phase_start_date: string
          planned_hours: number
          project_address: string
          project_id: string
          project_name: string
          project_status: Database["public"]["Enums"]["project_status"]
          resource_id: string
          resource_name: string
          resource_type_color: string
          resource_type_icon: string
          resource_type_name: string
          user_avatar_url: string
          user_id: string
          user_name: string
          user_weekly_hours: number
        }[]
      }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_user_with_tenant: {
        Args: never
        Returns: {
          auth_id: string
          avatar_url: string
          email: string
          full_name: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          tenant_name: string
          tenant_settings: Json
          tenant_slug: string
          user_id: string
          weekly_hours: number
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_planer_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      absence_type: "vacation" | "sick" | "holiday" | "training" | "other"
      conflict_resolution: "moved" | "deleted" | "ignored"
      phase_bereich: "produktion" | "montage" | "externes_gewerk" | "nicht_definiert"
      phase_status: "active" | "deleted"
      project_status: "planning" | "active" | "paused" | "completed"
      sync_service: "asana" | "timetac"
      sync_status: "running" | "success" | "partial" | "failed"
      user_role: "admin" | "planer" | "gewerblich"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_type: ["vacation", "sick", "holiday", "training", "other"],
      conflict_resolution: ["moved", "deleted", "ignored"],
      phase_bereich: ["produktion", "montage", "externes_gewerk", "nicht_definiert"],
      phase_status: ["active", "deleted"],
      project_status: ["planning", "active", "paused", "completed"],
      sync_service: ["asana", "timetac"],
      sync_status: ["running", "success", "partial", "failed"],
      user_role: ["admin", "planer", "gewerblich"],
    },
  },
} as const

// Convenience type exports for use in application code
export type AbsenceType = Database["public"]["Enums"]["absence_type"];
export type ConflictResolution = Database["public"]["Enums"]["conflict_resolution"];
export type PhaseBereich = Database["public"]["Enums"]["phase_bereich"];
export type PhaseStatus = Database["public"]["Enums"]["phase_status"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type SyncService = Database["public"]["Enums"]["sync_service"];
export type SyncStatus = Database["public"]["Enums"]["sync_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];
