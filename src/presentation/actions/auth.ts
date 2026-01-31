'use server';

/**
 * Auth Server Actions
 *
 * Server Actions für Authentifizierung:
 * - Login mit E-Mail/Passwort
 * - Logout
 * - Passwort vergessen
 * - Passwort zurücksetzen
 *
 * @see FEATURES.md F1.1-F1.5 für Akzeptanzkriterien
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Result, type ActionResult } from '@/application/common';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  rememberMe: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  confirmPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Login mit E-Mail und Passwort
 *
 * @param formData - FormData mit email, password, rememberMe
 * @returns ActionResult<{ redirectTo: string }> mit Redirect-URL basierend auf Rolle
 */
export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe') === 'on',
  });

  if (!validatedFields.success) {
    return Result.fail(
      'VALIDATION_ERROR',
      validatedFields.error.errors[0].message
    );
  }

  const supabase = await createActionSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  });

  if (error) {
    // Generische Fehlermeldung für Sicherheit (kein Hinweis ob E-Mail existiert)
    return Result.fail('AUTH_INVALID_CREDENTIALS', 'Ungültige Anmeldedaten');
  }

  // User-Rolle aus Datenbank holen für Redirect
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return Result.fail('AUTH_INVALID_CREDENTIALS', 'Ungültige Anmeldedaten');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authUser.id)
    .single();

  const role = userData?.role ?? 'gewerblich';

  // Redirect-URL basierend auf Rolle
  const redirectTo = role === 'gewerblich' ? '/meine-woche' : '/dashboard';

  return Result.ok({ redirectTo });
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGOUT ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logout - Session serverseitig invalidieren
 *
 * Redirected automatisch zur Login-Seite nach erfolgreichem Logout.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createActionSupabaseClient();

  await supabase.auth.signOut();

  redirect('/login');
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET PASSWORD ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Passwort-Reset E-Mail anfordern
 *
 * @param formData - FormData mit email
 * @returns ActionResult<void> - Immer erfolgreich (Sicherheit: kein Hinweis ob E-Mail existiert)
 */
export async function resetPasswordAction(
  formData: FormData
): Promise<ActionResult<void>> {
  const validatedFields = resetPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return Result.fail(
      'VALIDATION_ERROR',
      validatedFields.error.errors[0].message
    );
  }

  const supabase = await createActionSupabaseClient();

  // E-Mail senden - wir geben keinen Fehler zurück wenn die E-Mail nicht existiert
  // Dies verhindert E-Mail-Enumeration-Angriffe
  await supabase.auth.resetPasswordForEmail(validatedFields.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
  });

  // Immer erfolgreich zurückgeben (Sicherheit)
  return Result.ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PASSWORD ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Neues Passwort setzen (nach Reset-Link)
 *
 * @param formData - FormData mit password, confirmPassword
 * @returns ActionResult<void>
 */
export async function updatePasswordAction(
  formData: FormData
): Promise<ActionResult<void>> {
  const validatedFields = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return Result.fail(
      'VALIDATION_ERROR',
      validatedFields.error.errors[0].message
    );
  }

  const { password, confirmPassword } = validatedFields.data;

  if (password !== confirmPassword) {
    return Result.fail(
      'VALIDATION_ERROR',
      'Passwörter stimmen nicht überein'
    );
  }

  const supabase = await createActionSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return Result.fail('AUTH_SESSION_EXPIRED', 'Link abgelaufen. Bitte erneut anfordern.');
  }

  return Result.ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD ACTION
// ═══════════════════════════════════════════════════════════════════════════

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen haben'),
});

/**
 * Ändert das Passwort des eingeloggten Users.
 * Erfordert das aktuelle Passwort zur Verifizierung.
 */
export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult<void>> {
  const validatedFields = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  const { currentPassword, newPassword } = validatedFields.data;

  const supabase = await createActionSupabaseClient();

  // Aktuelle E-Mail holen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Result.fail('AUTH_REQUIRED', 'Nicht eingeloggt');
  }

  // Aktuelles Passwort verifizieren durch erneuten Login
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return Result.fail('AUTH_INVALID_CREDENTIALS', 'Aktuelles Passwort ist falsch');
  }

  // Neues Passwort setzen
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return Result.fail('INTERNAL_ERROR', 'Passwort konnte nicht geändert werden');
  }

  return Result.ok(undefined);
}
