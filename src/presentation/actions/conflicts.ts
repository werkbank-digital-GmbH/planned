'use server';

/**
 * Conflict Management Server Actions
 *
 * Server Actions für die Abwesenheits-Konflikt-Verwaltung:
 * - Ungelöste Konflikte abrufen
 * - Konflikt lösen (moved, deleted, ignored)
 * - Konflikt-Anzahl abrufen
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { UserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import type {
  AbsenceConflictWithUser,
} from '@/application/ports/repositories/IAbsenceConflictRepository';
import { ResolveConflictUseCase } from '@/application/use-cases/conflicts';

import { SupabaseAbsenceConflictRepository } from '@/infrastructure/repositories/SupabaseAbsenceConflictRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import type { AbsenceType, ConflictResolution } from '@/lib/database.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConflictDTO {
  id: string;
  allocationId: string;
  absenceId: string;
  userId: string;
  userName: string;
  date: string;
  absenceType: AbsenceType;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: ConflictResolution;
  createdAt: string;
}

export interface ConflictsResultDTO {
  conflicts: ConflictDTO[];
  total: number;
}

export interface ResolveConflictResultDTO {
  conflict: ConflictDTO;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const resolveConflictSchema = z.object({
  conflictId: z.string().uuid('Ungültige Konflikt-ID'),
  resolution: z.enum(['moved', 'deleted', 'ignored'], {
    errorMap: () => ({ message: 'Ungültige Auflösungsart' }),
  }),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum').optional(),
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
 * Konvertiert Domain-Entity zu DTO.
 */
function mapConflictToDTO(conflict: AbsenceConflictWithUser): ConflictDTO {
  return {
    id: conflict.id,
    allocationId: conflict.allocationId,
    absenceId: conflict.absenceId,
    userId: conflict.userId,
    userName: conflict.userName,
    date: conflict.date.toISOString().split('T')[0],
    absenceType: conflict.absenceType,
    resolvedAt: conflict.resolvedAt?.toISOString(),
    resolvedBy: conflict.resolvedBy,
    resolution: conflict.resolution,
    createdAt: conflict.createdAt.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET UNRESOLVED CONFLICTS ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle ungelösten Konflikte des aktuellen Tenants.
 *
 * @returns Liste der ungelösten Konflikte
 */
export async function getUnresolvedConflicts(): Promise<ActionResult<ConflictsResultDTO>> {
  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    const conflictRepo = new SupabaseAbsenceConflictRepository(supabase);

    const conflicts = await conflictRepo.findUnresolvedByTenant(currentUser.tenantId);

    return Result.ok({
      conflicts: conflicts.map(mapConflictToDTO),
      total: conflicts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET CONFLICT COUNT ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zählt ungelöste Konflikte des aktuellen Tenants.
 *
 * @returns Anzahl der ungelösten Konflikte
 */
export async function getConflictCount(): Promise<ActionResult<{ count: number }>> {
  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    const conflictRepo = new SupabaseAbsenceConflictRepository(supabase);

    const count = await conflictRepo.countUnresolvedByTenant(currentUser.tenantId);

    return Result.ok({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE CONFLICT ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Löst einen Abwesenheits-Konflikt.
 *
 * @param input - Die Konflikt-ID und Auflösungsart
 * @returns Der gelöste Konflikt
 */
export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution,
  newDate?: string
): Promise<ActionResult<ResolveConflictResultDTO>> {
  const validatedFields = resolveConflictSchema.safeParse({
    conflictId,
    resolution,
    newDate,
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin können Konflikte lösen
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung zum Lösen von Konflikten');
    }

    const supabase = await createActionSupabaseClient();

    const conflictRepo = new SupabaseAbsenceConflictRepository(supabase);
    const allocationRepo = new SupabaseAllocationRepository(supabase);

    const useCase = new ResolveConflictUseCase(conflictRepo, allocationRepo);

    const result = await useCase.execute({
      conflictId: validatedFields.data.conflictId,
      resolution: validatedFields.data.resolution,
      resolvedBy: currentUser.id,
      newDate: validatedFields.data.newDate
        ? new Date(validatedFields.data.newDate)
        : undefined,
    });

    if (!result.success) {
      return Result.fail(result.error.code, result.error.message);
    }

    // Paths revalidieren
    revalidatePath('/planung');

    // Konflikt mit User-Name laden für DTO
    const conflictWithUser = await conflictRepo.findUnresolvedByTenant(currentUser.tenantId);
    const updatedConflict = conflictWithUser.find((c) => c.id === result.data!.conflict.id);

    // Falls nicht gefunden (weil resolved), bauen wir den DTO selbst
    const conflictDTO: ConflictDTO = updatedConflict
      ? mapConflictToDTO(updatedConflict)
      : {
          id: result.data!.conflict.id,
          allocationId: result.data!.conflict.allocationId,
          absenceId: result.data!.conflict.absenceId,
          userId: result.data!.conflict.userId,
          userName: 'Unbekannt',
          date: result.data!.conflict.date.toISOString().split('T')[0],
          absenceType: result.data!.conflict.absenceType,
          resolvedAt: result.data!.conflict.resolvedAt?.toISOString(),
          resolvedBy: result.data!.conflict.resolvedBy,
          resolution: result.data!.conflict.resolution,
          createdAt: result.data!.conflict.createdAt.toISOString(),
        };

    return Result.ok({ conflict: conflictDTO });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
