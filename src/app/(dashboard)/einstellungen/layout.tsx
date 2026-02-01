import { redirect } from 'next/navigation';

import type { UserRole } from '@/domain/types';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import { SettingsTabs } from '@/presentation/components/settings';

/**
 * Settings Layout
 *
 * Layout für alle Einstellungs-Seiten.
 * Zeigt horizontale Tabs-Navigation basierend auf Benutzerrolle.
 */
export default async function SettingsLayout({
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

  // User-Rolle aus DB holen
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authUser.id)
    .single();

  const userRole = (userData?.role as UserRole) ?? 'gewerblich';

  return (
    <div className="-m-6">
      <SettingsTabs userRole={userRole} />
      <div className="p-6">{children}</div>
    </div>
  );
}
