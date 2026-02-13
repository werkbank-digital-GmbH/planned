import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import { CompanyAddressForm, CompanyForm } from '@/presentation/components/settings';

/**
 * Unternehmens-Einstellungen Seite (Admin only)
 *
 * Ermöglicht die Bearbeitung der Unternehmens-Daten.
 */
export default async function CompanySettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // User-Rolle prüfen
  const { data: userData } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData || userData.role !== 'admin') {
    redirect('/einstellungen/profil');
  }

  // Tenant-Daten laden
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id, name, slug, settings, company_address, company_lat, company_lng')
    .eq('id', userData.tenant_id)
    .single();

  const tenant = tenantData
    ? {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        defaultDailyHours:
          (tenantData.settings as { defaultDailyHours?: number })?.defaultDailyHours ?? 8,
        workDays: (tenantData.settings as { workDays?: number[] })?.workDays ?? [1, 2, 3, 4, 5],
      }
    : null;

  const addressData = tenantData
    ? {
        companyAddress: tenantData.company_address ?? null,
        companyLat: tenantData.company_lat ?? null,
        companyLng: tenantData.company_lng ?? null,
      }
    : { companyAddress: null, companyLat: null, companyLng: null };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <CompanyForm tenant={tenant} />

      {/* Firmenstandort für Wetter-Fallback */}
      <CompanyAddressForm
        currentAddress={addressData.companyAddress}
        currentLat={addressData.companyLat}
        currentLng={addressData.companyLng}
      />
    </div>
  );
}
