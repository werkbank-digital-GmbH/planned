'use server';

/**
 * Allocation Management Server Actions
 *
 * Server Actions für die Allocations-Verwaltung:
 * - Allocation erstellen (User oder Resource)
 *
 * Business Rules:
 * - PlannedHours werden automatisch aus weeklyHours berechnet
 * - Bei Mehrfach-Allocations erfolgt Redistribution
 * - Abwesenheits-Konflikte warnen, blockieren aber nicht
 * - Phase-Datum wird automatisch erweitert wenn nötig
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { AbsenceType } from '@/domain/entities/Absence';
import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import {
  GetAllocationsForWeekQuery,
  type WeekAllocationData,
} from '@/application/queries';
import { AbsenceConflictChecker } from '@/application/services';
import {
  CreateAllocationUseCase,
  DeleteAllocationUseCase,
  MoveAllocationUseCase,
  type AllocationWarning,
  type MoveAllocationWarning,
} from '@/application/use-cases/allocations';

import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseResourceRepository } from '@/infrastructure/repositories/SupabaseResourceRepository';
import { SupabaseTimeEntryRepository } from '@/infrastructure/repositories/SupabaseTimeEntryRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AllocationDTO {
  id: string;
  tenantId: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: string;
  plannedHours?: number;
  notes?: string;
}

export interface AllocationWarningDTO {
  type: 'absence_conflict' | 'multi_allocation' | 'phase_extended' | 'phase_preponed';
  message: string;
  details?: {
    absenceType?: AbsenceType;
    count?: number;
    newDate?: string;
  };
}

export interface CreateAllocationResultDTO {
  allocation: AllocationDTO;
  warnings: AllocationWarningDTO[];
}

export interface MoveAllocationResultDTO {
  allocation: AllocationDTO;
  warnings: AllocationWarningDTO[];
  redistributedCount: number;
}

export interface DeleteAllocationResultDTO {
  deletedId: string;
  redistributedCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const createAllocationSchema = z
  .object({
    userId: z.string().uuid('Ungültige User-ID').optional(),
    resourceId: z.string().uuid('Ungültige Resource-ID').optional(),
    projectPhaseId: z.string().uuid('Ungültige Phase-ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum (YYYY-MM-DD)'),
    notes: z.string().max(500, 'Notizen dürfen maximal 500 Zeichen haben').optional(),
  })
  .refine((data) => data.userId || data.resourceId, {
    message: 'Entweder userId oder resourceId muss angegeben werden',
  })
  .refine((data) => !(data.userId && data.resourceId), {
    message: 'Nur userId ODER resourceId, nicht beides',
  });

const moveAllocationSchema = z
  .object({
    allocationId: z.string().uuid('Ungültige Allocation-ID'),
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum (YYYY-MM-DD)').optional(),
    newProjectPhaseId: z.string().uuid('Ungültige Phase-ID').optional(),
  })
  .refine((data) => data.newDate || data.newProjectPhaseId, {
    message: 'Neues Datum oder neue Phase erforderlich',
  });

const deleteAllocationSchema = z.object({
  allocationId: z.string().uuid('Ungültige Allocation-ID'),
  confirmed: z.boolean().optional(),
});

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
 * Konvertiert Domain-Warnings zu DTOs mit lesbaren Nachrichten.
 */
function mapWarningsToDTO(warnings: AllocationWarning[]): AllocationWarningDTO[] {
  return warnings.map((warning) => {
    switch (warning.type) {
      case 'absence_conflict':
        return {
          type: 'absence_conflict' as const,
          message: `Mitarbeiter ist an diesem Tag abwesend (${getAbsenceTypeLabel(warning.absence.type)})`,
          details: {
            absenceType: warning.absence.type,
          },
        };

      case 'multi_allocation':
        return {
          type: 'multi_allocation' as const,
          message: `Mitarbeiter hat ${warning.count} Allocations an diesem Tag - Stunden wurden aufgeteilt`,
          details: {
            count: warning.count,
          },
        };

      case 'phase_extended':
        return {
          type: 'phase_extended' as const,
          message: `Phase-Enddatum wurde auf ${formatDate(warning.newEndDate)} erweitert`,
          details: {
            newDate: warning.newEndDate.toISOString().split('T')[0],
          },
        };

      case 'phase_preponed':
        return {
          type: 'phase_preponed' as const,
          message: `Phase-Startdatum wurde auf ${formatDate(warning.newStartDate)} vorverlegt`,
          details: {
            newDate: warning.newStartDate.toISOString().split('T')[0],
          },
        };
    }
  });
}

function getAbsenceTypeLabel(type: AbsenceType): string {
  const labels: Record<AbsenceType, string> = {
    vacation: 'Urlaub',
    sick: 'Krank',
    holiday: 'Feiertag',
    training: 'Schulung',
    other: 'Sonstige',
  };
  return labels[type];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Konvertiert MoveAllocation-Warnings zu DTOs.
 */
function mapMoveWarningsToDTO(warnings: MoveAllocationWarning[]): AllocationWarningDTO[] {
  return warnings.map((warning) => {
    switch (warning.type) {
      case 'absence_conflict':
        return {
          type: 'absence_conflict' as const,
          message: `Mitarbeiter ist an diesem Tag abwesend (${getAbsenceTypeLabel(warning.absence.type)})`,
          details: {
            absenceType: warning.absence.type,
          },
        };

      case 'phase_extended':
        return {
          type: 'phase_extended' as const,
          message: `Phase-Enddatum wurde auf ${formatDate(warning.newEndDate)} erweitert`,
          details: {
            newDate: warning.newEndDate.toISOString().split('T')[0],
          },
        };

      case 'phase_preponed':
        return {
          type: 'phase_preponed' as const,
          message: `Phase-Startdatum wurde auf ${formatDate(warning.newStartDate)} vorverlegt`,
          details: {
            newDate: warning.newStartDate.toISOString().split('T')[0],
          },
        };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE ALLOCATION ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine neue Allocation für einen User oder eine Resource.
 *
 * @param input - Die Allocation-Daten
 * @returns Die erstellte Allocation mit eventuellen Warnungen
 */
export async function createAllocationAction(input: {
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: string;
  notes?: string;
}): Promise<ActionResult<CreateAllocationResultDTO>> {
  const validatedFields = createAllocationSchema.safeParse(input);

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    // Repositories erstellen
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);
    const phaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const resourceRepo = new SupabaseResourceRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);

    // AbsenceConflictChecker erstellen
    const absenceChecker = new AbsenceConflictChecker(absenceRepo);

    // UseCase erstellen und ausführen
    const useCase = new CreateAllocationUseCase(
      allocationRepo,
      userRepo,
      phaseRepo,
      resourceRepo,
      absenceChecker
    );

    const result = await useCase.execute({
      tenantId: currentUser.tenantId,
      userId: validatedFields.data.userId,
      resourceId: validatedFields.data.resourceId,
      projectPhaseId: validatedFields.data.projectPhaseId,
      date: new Date(validatedFields.data.date),
      notes: validatedFields.data.notes,
    });

    // Paths revalidieren
    revalidatePath('/planung');

    // Result zurückgeben
    return Result.ok({
      allocation: {
        id: result.allocation.id,
        tenantId: result.allocation.tenantId,
        userId: result.allocation.userId,
        resourceId: result.allocation.resourceId,
        projectPhaseId: result.allocation.projectPhaseId,
        date: result.allocation.dateString,
        plannedHours: result.allocation.plannedHours,
        notes: result.allocation.notes,
      },
      warnings: mapWarningsToDTO(result.warnings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden') || message.includes('NotFoundError')) {
      return Result.fail('NOT_FOUND', message);
    }

    if (message.includes('deaktiviert')) {
      return Result.fail('VALIDATION_ERROR', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE ALLOCATION ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verschiebt eine Allocation zu einem neuen Datum und/oder einer neuen Phase.
 *
 * @param input - Die Move-Daten
 * @returns Die verschobene Allocation mit eventuellen Warnungen
 */
export async function moveAllocationAction(input: {
  allocationId: string;
  newDate?: string;
  newProjectPhaseId?: string;
}): Promise<ActionResult<MoveAllocationResultDTO>> {
  const validatedFields = moveAllocationSchema.safeParse(input);

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    // Repositories erstellen
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);
    const phaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);

    // AbsenceConflictChecker erstellen
    const absenceChecker = new AbsenceConflictChecker(absenceRepo);

    // UseCase erstellen und ausführen
    const useCase = new MoveAllocationUseCase(
      allocationRepo,
      userRepo,
      phaseRepo,
      absenceChecker
    );

    const result = await useCase.execute({
      allocationId: validatedFields.data.allocationId,
      newDate: validatedFields.data.newDate
        ? new Date(validatedFields.data.newDate)
        : undefined,
      newProjectPhaseId: validatedFields.data.newProjectPhaseId,
    });

    // Paths revalidieren
    revalidatePath('/planung');

    // Result zurückgeben
    return Result.ok({
      allocation: {
        id: result.allocation.id,
        tenantId: result.allocation.tenantId,
        userId: result.allocation.userId,
        resourceId: result.allocation.resourceId,
        projectPhaseId: result.allocation.projectPhaseId,
        date: result.allocation.dateString,
        plannedHours: result.allocation.plannedHours,
        notes: result.allocation.notes,
      },
      warnings: mapMoveWarningsToDTO(result.warnings),
      redistributedCount: result.redistributedAllocations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden') || message.includes('NotFoundError')) {
      return Result.fail('NOT_FOUND', message);
    }

    if (message.includes('erforderlich')) {
      return Result.fail('VALIDATION_ERROR', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE ALLOCATION ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Löscht eine Allocation.
 *
 * @param input - Die Delete-Daten
 * @returns Die ID der gelöschten Allocation
 */
export async function deleteAllocationAction(input: {
  allocationId: string;
  confirmed?: boolean;
}): Promise<ActionResult<DeleteAllocationResultDTO>> {
  const validatedFields = deleteAllocationSchema.safeParse(input);

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    // Repositories erstellen
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);

    // UseCase erstellen und ausführen
    const useCase = new DeleteAllocationUseCase(allocationRepo, userRepo);

    const result = await useCase.execute({
      allocationId: validatedFields.data.allocationId,
      confirmed: validatedFields.data.confirmed,
    });

    // Paths revalidieren
    revalidatePath('/planung');

    // Result zurückgeben
    return Result.ok({
      deletedId: result.deletedId,
      redistributedCount: result.redistributedAllocations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden') || message.includes('NotFoundError')) {
      return Result.fail('NOT_FOUND', message);
    }

    if (message.includes('Bestätigung erforderlich')) {
      return Result.fail('CONFIRMATION_REQUIRED', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ALLOCATIONS FOR WEEK ACTION
// ═══════════════════════════════════════════════════════════════════════════

const getAllocationsForWeekSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum (YYYY-MM-DD)'),
  projectId: z.string().uuid('Ungültige Projekt-ID').optional(),
  userId: z.string().uuid('Ungültige User-ID').optional(),
});

/**
 * Lädt alle Allocations für eine Kalenderwoche.
 *
 * @param input - Die Query-Parameter
 * @returns Die Wochendaten mit Allocations und Aggregationen
 */
export async function getAllocationsForWeekAction(input: {
  weekStart: string;
  projectId?: string;
  userId?: string;
}): Promise<ActionResult<WeekAllocationData>> {
  const validatedFields = getAllocationsForWeekSchema.safeParse(input);

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    // Repositories erstellen
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);
    const phaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const timeEntryRepo = new SupabaseTimeEntryRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);

    // Query erstellen und ausführen
    const query = new GetAllocationsForWeekQuery(
      allocationRepo,
      userRepo,
      phaseRepo,
      timeEntryRepo,
      absenceRepo
    );

    const result = await query.execute({
      tenantId: currentUser.tenantId,
      weekStart: new Date(validatedFields.data.weekStart),
      projectId: validatedFields.data.projectId,
      userId: validatedFields.data.userId,
    });

    return Result.ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
