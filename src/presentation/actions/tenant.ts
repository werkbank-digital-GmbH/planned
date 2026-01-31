'use server';

/**
 * Tenant Server Actions
 *
 * Server Actions für Unternehmens-Einstellungen.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { Result, type ActionResult } from '@/application/common';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  defaultDailyHours: number;
  workDays: number[];
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const updateTenantSchema = z.object({
  name: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen haben'),
  slug: z
    .string()
    .min(2, 'URL-Kürzel muss mindestens 2 Zeichen haben')
    .regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt'),
  defaultDailyHours: z.coerce.number().min(1).max(24),
});

// ═══════════════════════════════════════════════════════════════════════════
// GET TENANT ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt die Tenant-Daten des aktuellen Users.
 */
export async function getTenantAction(): Promise<ActionResult<TenantDTO>> {
  try {
    const supabase = await createActionSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return Result.fail('AUTH_REQUIRED', 'Nicht eingeloggt');
    }

    // User mit Tenant-ID laden
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) {
      return Result.fail('NOT_FOUND', 'User nicht gefunden');
    }

    // Tenant laden
    const { data: tenantData, error } = await supabase
      .from('tenants')
      .select('id, name, slug, settings')
      .eq('id', userData.tenant_id)
      .single();

    if (error || !tenantData) {
      return Result.fail('NOT_FOUND', 'Unternehmen nicht gefunden');
    }

    const settings = tenantData.settings as {
      defaultDailyHours?: number;
      workDays?: number[];
    } | null;

    return Result.ok({
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug,
      defaultDailyHours: settings?.defaultDailyHours ?? 8,
      workDays: settings?.workDays ?? [1, 2, 3, 4, 5],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE TENANT ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Tenant-Einstellungen.
 * Nur für Admins erlaubt.
 */
export async function updateTenantAction(
  formData: FormData
): Promise<ActionResult<void>> {
  const validatedFields = updateTenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    defaultDailyHours: formData.get('defaultDailyHours'),
  });

  if (!validatedFields.success) {
    return Result.fail('VALIDATION_ERROR', validatedFields.error.errors[0].message);
  }

  try {
    const supabase = await createActionSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return Result.fail('AUTH_REQUIRED', 'Nicht eingeloggt');
    }

    // User mit Rolle und Tenant-ID laden
    const { data: userData } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return Result.fail('UNAUTHORIZED', 'Nur Administratoren können Unternehmens-Einstellungen ändern');
    }

    // Aktuelle Settings laden
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', userData.tenant_id)
      .single();

    const currentSettings = (tenantData?.settings as Record<string, unknown>) ?? {};

    // Tenant aktualisieren
    const { error } = await supabase
      .from('tenants')
      .update({
        name: validatedFields.data.name,
        slug: validatedFields.data.slug,
        settings: {
          ...currentSettings,
          defaultDailyHours: validatedFields.data.defaultDailyHours,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.tenant_id);

    if (error) {
      if (error.code === '23505') {
        return Result.fail('CONFLICT', 'Diese URL ist bereits vergeben');
      }
      return Result.fail('INTERNAL_ERROR', 'Einstellungen konnten nicht aktualisiert werden');
    }

    revalidatePath('/einstellungen/unternehmen');

    return Result.ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
