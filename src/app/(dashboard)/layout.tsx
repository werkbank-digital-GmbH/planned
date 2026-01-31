import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import { DesktopNavigation } from '@/presentation/components/navigation';

/**
 * Dashboard Layout
 *
 * Prüft ob der User eingeloggt ist und leitet zur Login-Seite weiter wenn nicht.
 * Zeigt die Desktop-Navigation für Admin und Planer.
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
    .select('full_name, avatar_url')
    .eq('auth_id', authUser.id)
    .single();

  const user = {
    name: userData?.full_name || authUser.email?.split('@')[0] || 'Benutzer',
    email: authUser.email || '',
    avatarUrl: userData?.avatar_url,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopNavigation user={user} />
      <main className="p-6">{children}</main>
    </div>
  );
}
