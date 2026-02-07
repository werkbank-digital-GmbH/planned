'use server';

/**
 * Quick Assign Server Actions
 *
 * Server Actions für schnelle Mitarbeiter-Zuweisungen aus den KI-Insights.
 * Nutzt den bestehenden CreateAllocationUseCase für jede einzelne Zuweisung.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { Result, type ActionResult } from '@/application/common';
import { AbsenceConflictChecker } from '@/application/services';
import { CreateAllocationUseCase } from '@/application/use-cases/allocations';

import { SupabaseAbsenceRepository } from '@/infrastructure/repositories/SupabaseAbsenceRepository';
import { SupabaseAllocationRepository } from '@/infrastructure/repositories/SupabaseAllocationRepository';
import { SupabaseProjectPhaseRepository } from '@/infrastructure/repositories/SupabaseProjectPhaseRepository';
import { SupabaseResourceRepository } from '@/infrastructure/repositories/SupabaseResourceRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { getCurrentUserWithTenant } from '@/presentation/actions/shared/auth';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface QuickAssignResultDTO {
  allocationsCreated: number;
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const quickAssignSchema = z.object({
  phaseId: z.string().uuid('Ungültige Phase-ID'),
  userId: z.string().uuid('Ungültige User-ID'),
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum (YYYY-MM-DD)'))
    .min(1, 'Mindestens ein Datum erforderlich'),
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// QUICK ASSIGN ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weist einen User schnell mehreren Tagen einer Phase zu.
 *
 * Erstellt für jeden übergebenen Tag eine Allocation.
 * Nutzt den bestehenden CreateAllocationUseCase.
 *
 * @param input - Phase-ID, User-ID und Array von Datum-Strings
 * @returns Anzahl erstellter Allocations und Warnungen
 */
export async function quickAssignUserToPhaseAction(input: {
  phaseId: string;
  userId: string;
  dates: string[];
}): Promise<ActionResult<QuickAssignResultDTO>> {
  const validatedFields = quickAssignSchema.safeParse(input);

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Planer und Admin dürfen zuweisen
    if (!['planer', 'admin'].includes(currentUser.role)) {
      return Result.fail('FORBIDDEN', 'Keine Berechtigung für Zuweisungen');
    }

    const supabase = await createActionSupabaseClient();

    // Repositories erstellen
    const allocationRepo = new SupabaseAllocationRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);
    const phaseRepo = new SupabaseProjectPhaseRepository(supabase);
    const resourceRepo = new SupabaseResourceRepository(supabase);
    const absenceRepo = new SupabaseAbsenceRepository(supabase);

    // AbsenceConflictChecker erstellen
    const absenceChecker = new AbsenceConflictChecker(absenceRepo);

    // UseCase erstellen
    const useCase = new CreateAllocationUseCase(
      allocationRepo,
      userRepo,
      phaseRepo,
      resourceRepo,
      absenceChecker
    );

    const { phaseId, userId, dates } = validatedFields.data;
    const warnings: string[] = [];
    let allocationsCreated = 0;

    // Für jeden Tag eine Allocation erstellen
    for (const dateStr of dates) {
      try {
        const result = await useCase.execute({
          tenantId: currentUser.tenantId,
          userId,
          projectPhaseId: phaseId,
          date: new Date(dateStr),
        });

        allocationsCreated++;

        // Warnungen sammeln
        for (const warning of result.warnings) {
          if (warning.type === 'absence_conflict') {
            warnings.push(`${dateStr}: Abwesenheit (${warning.absence.type})`);
          } else if (warning.type === 'multi_allocation') {
            warnings.push(`${dateStr}: Mehrfach-Zuweisung`);
          }
        }
      } catch (error) {
        // Bei Fehler für einzelnen Tag: Warning hinzufügen, aber weitermachen
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        warnings.push(`${dateStr}: ${message}`);
      }
    }

    // Keine Allocations erstellt? Fehler zurückgeben
    if (allocationsCreated === 0) {
      return Result.fail(
        'INTERNAL_ERROR',
        `Keine Zuweisungen erstellt. Fehler: ${warnings.join(', ')}`
      );
    }

    // Paths revalidieren
    revalidatePath('/planung');
    revalidatePath('/projekte');

    return Result.ok({
      allocationsCreated,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden') || message.includes('NotFoundError')) {
      return Result.fail('NOT_FOUND', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}
