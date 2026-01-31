'use server';

/**
 * User Management Server Actions
 *
 * Server Actions für die Mitarbeiter-Verwaltung:
 * - Mitarbeiter-Liste laden
 * - Neuen Mitarbeiter anlegen
 * - Mitarbeiter bearbeiten
 * - Mitarbeiter deaktivieren
 * - Einladung erneut senden
 *
 * @see FEATURES.md F6.1-F6.5 für Akzeptanzkriterien
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { UserRole } from '@/domain/types';
import { isValidUserRole } from '@/domain/types';

import { Result, type ActionResult } from '@/application/common';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  GetUsersUseCase,
  DeactivateUserUseCase,
} from '@/application/use-cases/users';

import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { SupabaseAuthService } from '@/infrastructure/services';
import { createActionSupabaseClient } from '@/infrastructure/supabase';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive: boolean;
  avatarUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const createUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  fullName: z.string().min(1, 'Name ist erforderlich'),
  role: z.string().refine((val) => isValidUserRole(val), 'Ungültige Rolle'),
  weeklyHours: z.coerce
    .number()
    .min(0, 'Wochenstunden müssen mindestens 0 sein')
    .max(60, 'Wochenstunden dürfen maximal 60 sein'),
});

const updateUserSchema = z.object({
  userId: z.string().uuid('Ungültige User-ID'),
  fullName: z.string().min(1, 'Name ist erforderlich').optional(),
  role: z
    .string()
    .refine((val) => isValidUserRole(val), 'Ungültige Rolle')
    .optional(),
  weeklyHours: z.coerce
    .number()
    .min(0, 'Wochenstunden müssen mindestens 0 sein')
    .max(60, 'Wochenstunden dürfen maximal 60 sein')
    .optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den aktuellen User mit Tenant-Daten.
 * Wirft einen Error wenn kein User eingeloggt ist.
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
    .select(
      `
      id,
      role,
      tenant_id
    `
    )
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

// ═══════════════════════════════════════════════════════════════════════════
// GET USERS ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle Mitarbeiter des aktuellen Tenants.
 *
 * @param activeOnly - Nur aktive Mitarbeiter laden
 */
export async function getUsersAction(
  activeOnly = false
): Promise<ActionResult<UserDTO[]>> {
  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();
    const userRepository = new SupabaseUserRepository(supabase);

    const useCase = new GetUsersUseCase(userRepository);

    const users = await useCase.execute({
      tenantId: currentUser.tenantId,
      currentUserRole: currentUser.role,
      activeOnly,
    });

    const userDTOs: UserDTO[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      weeklyHours: user.weeklyHours,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
    }));

    return Result.ok(userDTOs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE USER ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt einen neuen Mitarbeiter und sendet eine Einladungs-E-Mail.
 */
export async function createUserAction(
  formData: FormData
): Promise<ActionResult<UserDTO>> {
  const validatedFields = createUserSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    role: formData.get('role'),
    weeklyHours: formData.get('weeklyHours'),
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();

    // Admin-Client für User-Erstellung und Auth-Operationen
    const adminSupabase = createAdminSupabaseClient();
    const userRepository = new SupabaseUserRepository(adminSupabase);
    const authService = new SupabaseAuthService(adminSupabase);

    const useCase = new CreateUserUseCase(userRepository, authService);

    const user = await useCase.execute({
      email: validatedFields.data.email,
      fullName: validatedFields.data.fullName,
      role: validatedFields.data.role as UserRole,
      weeklyHours: validatedFields.data.weeklyHours,
      tenantId: currentUser.tenantId,
      currentUserRole: currentUser.role,
    });

    revalidatePath('/einstellungen/mitarbeiter');

    return Result.ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      weeklyHours: user.weeklyHours,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('E-Mail-Adresse bereits vergeben')) {
      return Result.fail('CONFLICT', message);
    }

    if (message.includes('Nur Administratoren')) {
      return Result.fail('UNAUTHORIZED', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE USER ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert einen bestehenden Mitarbeiter.
 */
export async function updateUserAction(
  formData: FormData
): Promise<ActionResult<UserDTO>> {
  const validatedFields = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    fullName: formData.get('fullName') || undefined,
    role: formData.get('role') || undefined,
    weeklyHours: formData.get('weeklyHours') || undefined,
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();
    const userRepository = new SupabaseUserRepository(supabase);

    const useCase = new UpdateUserUseCase(userRepository);

    const user = await useCase.execute({
      userId: validatedFields.data.userId,
      tenantId: currentUser.tenantId,
      currentUserRole: currentUser.role,
      fullName: validatedFields.data.fullName,
      role: validatedFields.data.role as UserRole | undefined,
      weeklyHours: validatedFields.data.weeklyHours,
    });

    revalidatePath('/einstellungen/mitarbeiter');

    return Result.ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      weeklyHours: user.weeklyHours,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden') || message.includes('Mitarbeiter')) {
      return Result.fail('NOT_FOUND', 'Mitarbeiter nicht gefunden');
    }

    if (message.includes('Nur Administratoren')) {
      return Result.fail('UNAUTHORIZED', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEACTIVATE USER ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deaktiviert einen Mitarbeiter.
 */
export async function deactivateUserAction(
  userId: string
): Promise<ActionResult<UserDTO>> {
  if (!userId) {
    return Result.fail('VALIDATION_ERROR', 'User-ID ist erforderlich');
  }

  try {
    const currentUser = await getCurrentUserWithTenant();
    const adminSupabase = createAdminSupabaseClient();
    const userRepository = new SupabaseUserRepository(adminSupabase);
    const authService = new SupabaseAuthService(adminSupabase);

    const useCase = new DeactivateUserUseCase(userRepository, authService);

    const user = await useCase.execute({
      userId,
      tenantId: currentUser.tenantId,
      currentUserRole: currentUser.role,
      currentUserId: currentUser.id,
    });

    revalidatePath('/einstellungen/mitarbeiter');

    return Result.ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      weeklyHours: user.weeklyHours,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';

    if (message.includes('nicht gefunden')) {
      return Result.fail('NOT_FOUND', 'Mitarbeiter nicht gefunden');
    }

    if (message.includes('selbst deaktivieren')) {
      return Result.fail('VALIDATION_ERROR', message);
    }

    if (message.includes('Nur Administratoren')) {
      return Result.fail('UNAUTHORIZED', message);
    }

    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESEND INVITATION ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sendet die Einladungs-E-Mail erneut an einen Mitarbeiter.
 */
export async function resendInvitationAction(
  userId: string
): Promise<ActionResult<void>> {
  if (!userId) {
    return Result.fail('VALIDATION_ERROR', 'User-ID ist erforderlich');
  }

  try {
    const currentUser = await getCurrentUserWithTenant();

    // Nur Admins können Einladungen senden
    if (currentUser.role !== 'admin') {
      return Result.fail('UNAUTHORIZED', 'Nur Administratoren können Einladungen senden');
    }

    const supabase = await createActionSupabaseClient();
    const userRepository = new SupabaseUserRepository(supabase);

    // User laden
    const user = await userRepository.findById(userId);

    if (!user || user.tenantId !== currentUser.tenantId) {
      return Result.fail('NOT_FOUND', 'Mitarbeiter nicht gefunden');
    }

    // Einladung senden
    const adminSupabase = createAdminSupabaseClient();
    const authService = new SupabaseAuthService(adminSupabase);

    const success = await authService.resendInvitation(user.email);

    if (!success) {
      return Result.fail('INTERNAL_ERROR', 'Einladung konnte nicht gesendet werden');
    }

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE ACTION
// ═══════════════════════════════════════════════════════════════════════════

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
});

/**
 * Aktualisiert das eigene Profil (nur Name).
 */
export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult<void>> {
  const validatedFields = updateProfileSchema.safeParse({
    fullName: formData.get('fullName'),
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const currentUser = await getCurrentUserWithTenant();
    const supabase = await createActionSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({
        full_name: validatedFields.data.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (error) {
      return Result.fail('INTERNAL_ERROR', 'Profil konnte nicht aktualisiert werden');
    }

    revalidatePath('/einstellungen/profil');

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
