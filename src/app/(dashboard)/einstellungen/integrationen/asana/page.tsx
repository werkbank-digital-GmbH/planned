import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { AsanaConnectionCard } from './AsanaConnectionCard';
import { AsanaSourceConfigCard } from './AsanaSourceConfigCard';
import { AsanaSyncCard } from './AsanaSyncCard';
import { AsanaTaskFieldMappingCard } from './AsanaTaskFieldMappingCard';

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

  // User-Rolle prufen
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
    .select('asana_access_token, asana_workspace_id, asana_source_project_id, asana_team_id')
    .eq('tenant_id', userData.tenant_id)
    .single();

  const isConnected = !!credentials?.asana_access_token;
  const workspaceId = credentials?.asana_workspace_id;
  const isConfigured = !!(credentials?.asana_source_project_id && credentials?.asana_team_id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header mit Zuruck-Link */}
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

      {/* Konfiguration und Sync nur wenn verbunden */}
      {isConnected && (
        <>
          {/* Quell-Konfiguration */}
          <AsanaSourceConfigCard />

          {/* Custom Field Mapping */}
          <AsanaTaskFieldMappingCard />

          {/* Sync - nur wenn konfiguriert */}
          {isConfigured ? (
            <AsanaSyncCard />
          ) : (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-800">
                  Konfiguration erforderlich
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-700">
                <p>
                  Bitte wahlen Sie oben ein Quell-Projekt und ein Team aus, bevor Sie synchronisieren konnen.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info-Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">So funktioniert die Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>1. Verbinden:</strong> Autorisieren Sie Planned fur Ihren Asana Workspace.
          </p>
          <p>
            <strong>2. Quell-Konfiguration:</strong> Wahlen Sie das Projekt mit Ihren Phasen-Tasks (z.B. &quot;Jahresplanung&quot;) und das Team mit Ihren Bauvorhaben.
          </p>
          <p>
            <strong>3. Field Mapping:</strong> Ordnen Sie Asana Custom Fields den Phasen-Eigenschaften zu.
          </p>
          <p>
            <strong>4. Synchronisieren:</strong> Tasks werden als Phasen importiert, zugehorige Projekte als Bauvorhaben.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
