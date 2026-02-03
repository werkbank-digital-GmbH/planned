import type { SupabaseClient } from '@supabase/supabase-js';

import type { IAnalyticsRepository } from '@/domain/analytics/IAnalyticsRepository';
import type { CreatePhaseSnapshotDTO } from '@/domain/analytics/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseWithMetrics {
  id: string;
  tenant_id: string;
  ist_hours: number;
  soll_hours: number;
  plan_hours: number;
  allocations_count: number;
  allocated_users_count: number;
}

export interface GenerateSnapshotsResult {
  success: boolean;
  tenants_processed: number;
  phases_processed: number;
  snapshots_created: number;
  skipped_existing: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert tägliche Snapshots für alle aktiven Phasen.
 *
 * Wird vom Cron-Job täglich um 05:00 UTC aufgerufen.
 *
 * Für jede Phase wird ein Snapshot mit den aktuellen Metriken erstellt:
 * - IST-Stunden (aus Asana Custom Field, in project_phases.actual_hours)
 * - PLAN-Stunden (Summe aller Allocations, in project_phases.planned_hours)
 * - SOLL-Stunden (Budget aus Asana, in project_phases.budget_hours)
 * - Anzahl Allocations und zugewiesene User
 *
 * Der Use Case ist idempotent: Bereits existierende Snapshots für heute
 * werden übersprungen.
 *
 * HINWEIS: Nutzt `any` casts für die neuen Tabellen, da die database.types.ts
 * erst nach Anwendung der Migration aktualisiert werden.
 */
export class GeneratePhaseSnapshotsUseCase {
  constructor(
    private readonly analyticsRepository: IAnalyticsRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly supabase: SupabaseClient<any>
  ) {}

  async execute(snapshotDate?: string): Promise<GenerateSnapshotsResult> {
    const today = snapshotDate || new Date().toISOString().split('T')[0];
    const result: GenerateSnapshotsResult = {
      success: true,
      tenants_processed: 0,
      phases_processed: 0,
      snapshots_created: 0,
      skipped_existing: 0,
      errors: [],
    };

    try {
      // 1. Alle Tenants laden
      const tenants = await this.getAllTenants();
      result.tenants_processed = tenants.length;

      // 2. Für jeden Tenant: aktive Phasen mit Metriken laden
      for (const tenant of tenants) {
        try {
          const phases = await this.getActivePhasesWithMetrics(tenant.id, today);

          const snapshotsToCreate: CreatePhaseSnapshotDTO[] = [];

          for (const phase of phases) {
            result.phases_processed++;

            // Prüfen ob bereits Snapshot existiert (für das angegebene Datum)
            const exists = await this.hasSnapshotForDate(phase.id, today);
            if (exists) {
              result.skipped_existing++;
              continue;
            }

            snapshotsToCreate.push({
              tenant_id: phase.tenant_id,
              phase_id: phase.id,
              snapshot_date: today,
              ist_hours: phase.ist_hours,
              plan_hours: phase.plan_hours,
              soll_hours: phase.soll_hours,
              allocations_count: phase.allocations_count,
              allocated_users_count: phase.allocated_users_count,
            });
          }

          // Batch Insert
          if (snapshotsToCreate.length > 0) {
            await this.analyticsRepository.createSnapshots(snapshotsToCreate);
            result.snapshots_created += snapshotsToCreate.length;
          }
        } catch (error) {
          const message = `Tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(message);
          console.error('[GeneratePhaseSnapshotsUseCase]', message);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Lädt alle Tenants
   */
  private async getAllTenants(): Promise<{ id: string }[]> {
    const { data, error } = await this.supabase.from('tenants').select('id');

    if (error) throw error;
    return data || [];
  }

  /**
   * Lädt alle aktiven Phasen eines Tenants mit berechneten Metriken.
   *
   * Nutzt die Datenbank-Funktion get_active_phases_with_metrics für performante
   * Aggregation.
   *
   * "Aktiv" bedeutet:
   * - Phase hat status = 'active'
   * - Phase hat ein End-Datum in der Zukunft ODER noch offene Stunden (SOLL > IST)
   */
  private async getActivePhasesWithMetrics(
    tenantId: string,
    today: string
  ): Promise<PhaseWithMetrics[]> {
    const { data, error } = await this.supabase.rpc('get_active_phases_with_metrics', {
      p_tenant_id: tenantId,
      p_today: today,
    });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      ist_hours: Number(row.ist_hours),
      soll_hours: Number(row.soll_hours),
      plan_hours: Number(row.plan_hours),
      allocations_count: Number(row.allocations_count),
      allocated_users_count: Number(row.allocated_users_count),
    }));
  }

  /**
   * Prüft ob für eine Phase bereits ein Snapshot für das angegebene Datum existiert.
   */
  private async hasSnapshotForDate(phaseId: string, date: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('phase_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('phase_id', phaseId)
      .eq('snapshot_date', date);

    if (error) throw error;
    return (count || 0) > 0;
  }
}
