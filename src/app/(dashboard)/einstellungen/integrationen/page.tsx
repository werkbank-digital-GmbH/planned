import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import { AbsenceSyncCard } from './AbsenceSyncCard';
import { ProjectSyncCard } from './ProjectSyncCard';
import { UserSyncCard } from './UserSyncCard';
import { AsanaConnectionCard } from './asana/AsanaConnectionCard';

/**
 * Integrationen Seite (Admin only)
 *
 * Zeigt alle Integrations-Funktionen auf einer Seite:
 * - Asana Verbindung (oben, immer sichtbar)
 * - Projekte & Phasen
 * - Mitarbeiter
 * - Abwesenheiten
 */
export default async function IntegrationenPage() {
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
      {/* 1. Asana Verbindung (immer sichtbar) */}
      <AsanaConnectionCard isConnected={isConnected} workspaceId={workspaceId ?? undefined} />

      {/* 2. Funktions-Karten (nur wenn verbunden) */}
      {isConnected && (
        <>
          {/* Projekte & Phasen */}
          <ProjectSyncCard />

          {/* Mitarbeiter */}
          <UserSyncCard />

          {/* Abwesenheiten */}
          <AbsenceSyncCard />
        </>
      )}
    </div>
  );
}
