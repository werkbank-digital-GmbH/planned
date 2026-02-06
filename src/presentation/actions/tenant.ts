'use server';

/**
 * Tenant Server Actions
 *
 * Server Actions für Unternehmens-Einstellungen.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { Result, type ActionResult } from '@/application/common';

import { createGeocodingService } from '@/infrastructure/services/GeocodingService';
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
  companyAddress: string | null;
  companyLat: number | null;
  companyLng: number | null;
}

export interface CompanyAddressDTO {
  address: string;
  lat: number;
  lng: number;
  displayName: string;
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

    // Tenant laden (select * da neue Felder noch nicht in Supabase-Types)
    const { data: tenantData, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userData.tenant_id)
      .single();

    if (error || !tenantData) {
      return Result.fail('NOT_FOUND', 'Unternehmen nicht gefunden');
    }

    // Type cast für Felder, die noch nicht in den generierten Types sind
    const extendedTenant = tenantData as typeof tenantData & {
      company_address?: string | null;
      company_lat?: number | null;
      company_lng?: number | null;
    };

    const settings = (tenantData as { settings?: { defaultDailyHours?: number; workDays?: number[] } | null }).settings;

    return Result.ok({
      id: extendedTenant.id as string,
      name: extendedTenant.name as string,
      slug: extendedTenant.slug as string,
      defaultDailyHours: settings?.defaultDailyHours ?? 8,
      workDays: settings?.workDays ?? [1, 2, 3, 4, 5],
      companyAddress: extendedTenant.company_address ?? null,
      companyLat: extendedTenant.company_lat != null ? Number(extendedTenant.company_lat) : null,
      companyLng: extendedTenant.company_lng != null ? Number(extendedTenant.company_lng) : null,
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

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE COMPANY ADDRESS ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Firmenadresse inkl. Geocoding.
 * Nur für Admins erlaubt.
 */
export async function updateCompanyAddressAction(
  address: string
): Promise<ActionResult<CompanyAddressDTO>> {
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
      return Result.fail('UNAUTHORIZED', 'Nur Administratoren können die Firmenadresse ändern');
    }

    // Geocoding durchführen
    const geocodingService = createGeocodingService();
    const geoResult = await geocodingService.geocode(address);

    if (!geoResult) {
      return Result.fail(
        'VALIDATION_ERROR',
        'Adresse nicht gefunden. Bitte prüfe das Format: "Straße Nr, PLZ Stadt" (z.B. "Musterstraße 1, 70173 Stuttgart")'
      );
    }

    // Tenant aktualisieren mit Type-Cast für neue Felder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tenants') as any)
      .update({
        company_address: address,
        company_lat: geoResult.lat,
        company_lng: geoResult.lng,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.tenant_id);

    if (error) {
      return Result.fail('INTERNAL_ERROR', 'Adresse konnte nicht gespeichert werden');
    }

    revalidatePath('/einstellungen/unternehmen');

    return Result.ok({
      address,
      lat: geoResult.lat,
      lng: geoResult.lng,
      displayName: geoResult.displayName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return Result.fail('INTERNAL_ERROR', message);
  }
}
