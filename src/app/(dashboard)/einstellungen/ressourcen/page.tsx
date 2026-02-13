import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

/**
 * Ressourcen-Verwaltung Seite (Admin only)
 *
 * Placeholder - wird in späterem Prompt implementiert.
 */
export default async function RessourcenPage() {
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
    .select('role')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData || userData.role !== 'admin') {
    redirect('/einstellungen/profil');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-lg border bg-gray-50 p-8 text-center">
        <p className="text-gray-500">
          Diese Funktion wird in einer späteren Version implementiert.
        </p>
      </div>
    </div>
  );
}
