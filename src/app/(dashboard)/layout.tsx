import { redirect } from 'next/navigation';

import type { UserRole } from '@/domain/types';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import { FloatingNav } from '@/presentation/components/navigation';
import { SyncNotificationListener } from '@/presentation/components/notifications/SyncNotificationListener';
import { SyncToast } from '@/presentation/components/notifications/SyncToast';

/**
 * Dashboard Layout
 *
 * Prüft ob der User eingeloggt ist und leitet zur Login-Seite weiter wenn nicht.
 * Zeigt die FloatingNav mit schwebendem Hamburger-Menü.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // User-Daten aus der Datenbank holen
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, avatar_url, role')
    .eq('auth_id', authUser.id)
    .single();

  const user = {
    name: userData?.full_name || authUser.email?.split('@')[0] || 'Benutzer',
    email: authUser.email || '',
    avatarUrl: userData?.avatar_url,
  };

  const userRole = (userData?.role as UserRole) ?? 'gewerblich';

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav user={user} userRole={userRole} />
      <main className="p-4">{children}</main>

      {/* Sync Notifications */}
      <SyncNotificationListener />
      <SyncToast />
    </div>
  );
}
