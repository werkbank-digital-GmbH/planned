'use server';

/**
 * My Week Server Actions
 *
 * Server Actions für die Mobile "Meine Woche" Ansicht.
 *
 * @see FEATURES.md F10 für Akzeptanzkriterien
 */

import { Result, type ActionResult } from '@/application/common';
import { GetMyWeekQuery, type MyWeekData } from '@/application/queries';

import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { getMonday } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// DTO TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface MyAllocationDTO {
  id: string;
  projectName: string;
  projectNumber?: string;
  phaseName: string;
  plannedHours: number;
  notes?: string;
  bereich: 'produktion' | 'montage';
}

interface MyWeekDayDTO {
  date: string;
  dayName: string;
  allocations: MyAllocationDTO[];
  absence?: {
    type: string;
    note?: string;
  };
}

export interface MyWeekDataDTO {
  weekStart: string;
  weekEnd: string;
  calendarWeek: number;
  days: MyWeekDayDTO[];
  totalPlannedHours: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function mapToDTO(data: MyWeekData): MyWeekDataDTO {
  return {
    weekStart: data.weekStart.toISOString(),
    weekEnd: data.weekEnd.toISOString(),
    calendarWeek: data.calendarWeek,
    days: data.days.map((day) => ({
      date: day.date.toISOString(),
      dayName: day.dayName,
      allocations: day.allocations.map((alloc) => ({
        id: alloc.id,
        projectName: alloc.projectName,
        projectNumber: alloc.projectNumber,
        phaseName: alloc.phaseName,
        plannedHours: alloc.plannedHours,
        notes: alloc.notes,
        bereich: alloc.bereich,
      })),
      absence: day.absence
        ? { type: day.absence.type, note: day.absence.note }
        : undefined,
    })),
    totalPlannedHours: data.totalPlannedHours,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt die Wochendaten für den aktuellen User
 *
 * @param weekStart - ISO-Datum-String für den Wochenstart (optional, default: aktuelle Woche)
 * @returns MyWeekDataDTO
 */
export async function getMyWeek(
  weekStart?: string
): Promise<ActionResult<MyWeekDataDTO>> {
  const supabase = await createActionSupabaseClient();

  // 1. Authentifizierten User holen
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return Result.fail('AUTH_REQUIRED', 'Nicht eingeloggt');
  }

  // 2. User-Daten aus DB holen
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    return Result.fail('USER_NOT_FOUND', 'Benutzer nicht gefunden');
  }

  // 3. Query ausführen
  const allocationRepository = new SupabaseAllocationRepository(supabase);
  const absenceRepository = new SupabaseAbsenceRepository(supabase);
  const projectPhaseRepository = new SupabaseProjectPhaseRepository(supabase);

  const query = new GetMyWeekQuery(
    allocationRepository,
    absenceRepository,
    projectPhaseRepository
  );

  const weekStartDate = weekStart ? getMonday(new Date(weekStart)) : getMonday(new Date());

  const data = await query.execute({
    userId: userData.id,
    weekStart: weekStartDate,
  });

  return Result.ok(mapToDTO(data));
}
