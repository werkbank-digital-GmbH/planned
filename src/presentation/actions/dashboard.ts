'use server';

/**
 * Dashboard Server Actions
 *
 * Server Actions für das Dashboard:
 * - Dashboard-Daten laden
 */

import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import {
  GetDashboardDataQuery,
  type DashboardData,
  type DayUtilization,
  type TeamCapacityMetrics,
  type DashboardProjectSummary,
  type AbsenceSummary,
} from '@/application/queries';

import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DashboardDataDTO {
  weeklyUtilization: DayUtilizationDTO[];
  teamCapacity: TeamCapacityMetrics;
  topProjects: DashboardProjectSummary[];
  upcomingAbsences: AbsenceSummaryDTO[];
  weekStart: string;
  weekEnd: string;
  calendarWeek: number;
}

export interface DayUtilizationDTO {
  date: string;
  dayName: string;
  capacity: number;
  planned: number;
  utilizationPercent: number;
}

export interface AbsenceSummaryDTO {
  id: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den aktuellen User mit Tenant-Daten.
 */
async function getCurrentUserWithTenant() {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Nicht eingeloggt');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    throw new Error('User nicht gefunden');
  }

  return {
    id: userData.id,
    role: userData.role as UserRole,
    tenantId: userData.tenant_id,
  };
}

/**
 * Konvertiert DashboardData zu DTO (Date -> String für Serialisierung)
 */
function toDTO(data: DashboardData): DashboardDataDTO {
  return {
    weeklyUtilization: data.weeklyUtilization.map((d: DayUtilization) => ({
      date: d.date.toISOString(),
      dayName: d.dayName,
      capacity: d.capacity,
      planned: d.planned,
      utilizationPercent: d.utilizationPercent,
    })),
    teamCapacity: data.teamCapacity,
    topProjects: data.topProjects,
    upcomingAbsences: data.upcomingAbsences.map((a: AbsenceSummary) => ({
      id: a.id,
      userName: a.userName,
      type: a.type,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
    })),
    weekStart: data.weekStart.toISOString(),
    weekEnd: data.weekEnd.toISOString(),
    calendarWeek: data.calendarWeek,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt die Dashboard-Daten für die aktuelle Woche.
 */
export async function getDashboardData(): Promise<ActionResult<DashboardDataDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin sehen das Dashboard
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();

    const userRepo = new SupabaseUserRepository(supabase);
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);
    const projectPhaseRepo = new SupabaseProjectPhaseRepository(supabase);

    const query = new GetDashboardDataQuery(
      userRepo,
      allocationRepo,
      absenceRepo,
      projectPhaseRepo
    );

    const data = await query.execute({ tenantId: currentUser.tenantId });

    return Result.ok(toDTO(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

/**
 * Lädt Dashboard-Daten für eine spezifische Woche.
 */
export async function getDashboardDataForWeek(
  weekStart: string
): Promise<ActionResult<DashboardDataDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();

    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung');
    }

    const supabase = await createActionSupabaseClient();

    const userRepo = new SupabaseUserRepository(supabase);
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);
    const projectPhaseRepo = new SupabaseProjectPhaseRepository(supabase);

    const query = new GetDashboardDataQuery(
      userRepo,
      allocationRepo,
      absenceRepo,
      projectPhaseRepo
    );

    const data = await query.execute({
      tenantId: currentUser.tenantId,
      weekStart: new Date(weekStart),
    });

    return Result.ok(toDTO(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
