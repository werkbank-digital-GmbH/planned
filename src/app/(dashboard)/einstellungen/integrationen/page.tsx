import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

/**
 * Integrationen Übersicht Seite (Admin only)
 *
 * Zeigt Links zu den verschiedenen Integration-Konfigurationen.
 */
export default async function IntegrationenPage() {
  const supabase = await createActionSupabaseClient();

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

  // Integration Credentials Status laden
  const { data: credentials } = await supabase
    .from('integration_credentials')
    .select('asana_access_token, timetac_api_token')
    .eq('tenant_id', userData.tenant_id)
    .single();

  const asanaActive = !!credentials?.asana_access_token;
  const timetacActive = !!credentials?.timetac_api_token;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrationen</h1>
        <p className="text-gray-500">
          Verbinden Sie externe Dienste mit Planned
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/einstellungen/integrationen/asana">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Asana</CardTitle>
              <StatusBadge active={asanaActive} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Projekte und Phasen aus Asana synchronisieren
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/einstellungen/integrationen/timetac">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">TimeTac</CardTitle>
              <StatusBadge active={timetacActive} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Abwesenheiten und Zeiteinträge synchronisieren
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Aktiv' : 'Nicht verbunden'}
    </span>
  );
}
