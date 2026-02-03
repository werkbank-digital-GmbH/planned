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

  // Tenant-Daten laden (neue Felder noch nicht in Supabase-Typen)
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id, name, slug, settings')
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

  // Adress-Daten für CompanyAddressForm (separate Query für neue Felder)
  // TODO: Nach Regenerierung der Supabase-Typen in obige Query integrieren
  const { data: addressRow } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userData.tenant_id)
    .single();

  const typedAddressRow = addressRow as unknown as {
    company_address: string | null;
    company_lat: number | null;
    company_lng: number | null;
  } | null;

  const addressData = typedAddressRow
    ? {
        companyAddress: typedAddressRow.company_address ?? null,
        companyLat: typedAddressRow.company_lat ?? null,
        companyLng: typedAddressRow.company_lng ?? null,
      }
    : { companyAddress: null, companyLat: null, companyLng: null };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Unternehmens-Einstellungen</h1>
        <p className="text-gray-500">
          Verwalten Sie die Einstellungen Ihres Unternehmens
        </p>
      </div>

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
