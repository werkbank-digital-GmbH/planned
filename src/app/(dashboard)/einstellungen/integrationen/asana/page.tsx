import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { AsanaConnectionCard } from './AsanaConnectionCard';
import { AsanaFieldMappingCard } from './AsanaFieldMappingCard';
import { AsanaSyncCard } from './AsanaSyncCard';

/**
 * Asana Integration Konfigurationsseite (Admin only)
 */
export default async function AsanaIntegrationPage() {
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
    .select('asana_access_token, asana_workspace_id')
    .eq('tenant_id', userData.tenant_id)
    .single();

  const isConnected = !!credentials?.asana_access_token;
  const workspaceId = credentials?.asana_workspace_id;

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
          <h1 className="text-2xl font-bold">Asana Integration</h1>
          <p className="text-gray-500">
            Verbinden Sie Asana um Projekte und Phasen zu synchronisieren
          </p>
        </div>
      </div>

      {/* Verbindungs-Status */}
      <AsanaConnectionCard isConnected={isConnected} workspaceId={workspaceId ?? undefined} />

      {/* Sync und Mapping nur wenn verbunden */}
      {isConnected && (
        <>
          <AsanaSyncCard />
          <AsanaFieldMappingCard />
        </>
      )}

      {/* Info-Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">So funktioniert die Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>1. Verbinden:</strong> Autorisieren Sie Planned für Ihren Asana Workspace.
          </p>
          <p>
            <strong>2. Synchronisieren:</strong> Projekte und deren Sections werden als Phasen importiert.
          </p>
          <p>
            <strong>3. Field Mapping:</strong> Ordnen Sie Asana Custom Fields Planned-Feldern zu.
          </p>
          <p>
            <strong>4. Bidirektional:</strong> Änderungen in Planned werden zurück zu Asana synchronisiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
