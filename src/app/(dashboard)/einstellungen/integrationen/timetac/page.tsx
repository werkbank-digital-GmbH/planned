import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { TimeTacConnectionCard } from './TimeTacConnectionCard';
import { TimeTacMappingCard } from './TimeTacMappingCard';

/**
 * TimeTac Integration Konfigurationsseite (Admin only)
 */
export default async function TimeTacIntegrationPage() {
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
    redirect('/einstellungen/integrationen');
  }

  // Integration Credentials laden
  const { data: credentials } = await supabase
    .from('integration_credentials')
    .select('timetac_api_token, timetac_account_id')
    .eq('tenant_id', userData.tenant_id)
    .single();

  const isConnected = !!credentials?.timetac_api_token;
  const accountId = credentials?.timetac_account_id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header mit Zurück-Link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/einstellungen/integrationen">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">TimeTac Integration</h1>
          <p className="text-gray-500">
            Synchronisieren Sie Abwesenheiten und Zeiteinträge
          </p>
        </div>
      </div>

      {/* Verbindungs-Status */}
      <TimeTacConnectionCard isConnected={isConnected} accountId={accountId ?? undefined} />

      {/* Mapping nur wenn verbunden */}
      {isConnected && <TimeTacMappingCard />}

      {/* Info-Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">So funktioniert die Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>1. API-Key:</strong> Generieren Sie einen API-Key in Ihrem TimeTac Account.
          </p>
          <p>
            <strong>2. Verbinden:</strong> Geben Sie den API-Key hier ein.
          </p>
          <p>
            <strong>3. Mapping:</strong> Ordnen Sie TimeTac Projekte Ihren Planned-Phasen zu.
          </p>
          <p>
            <strong>4. Sync:</strong> Abwesenheiten und Zeiteinträge werden automatisch importiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
