import { redirect } from 'next/navigation';

import type { UserRole } from '@/domain/types';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

import { SettingsSidebar } from '@/presentation/components/settings';

/**
 * Settings Layout
 *
 * Layout für alle Einstellungs-Seiten.
 * Zeigt Sidebar mit Navigation basierend auf Benutzerrolle.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // User-Rolle aus DB holen
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authUser.id)
    .single();

  const userRole = (userData?.role as UserRole) ?? 'gewerblich';

  return (
    <div className="flex h-full">
      <SettingsSidebar userRole={userRole} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
