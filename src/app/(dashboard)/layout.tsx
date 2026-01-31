import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

/**
 * Dashboard Layout
 *
 * Prüft ob der User eingeloggt ist und leitet zur Login-Seite weiter wenn nicht.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: Sidebar/Navigation */}
      <main className="p-6">{children}</main>
    </div>
  );
}
