import { User } from 'lucide-react';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

/**
 * Profil Page (Placeholder)
 *
 * Wird in Prompt 27 vollständig implementiert.
 * Zeigt vorerst nur Name und E-Mail des Users.
 */
export default async function ProfilPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let userData: { fullName: string; email: string; role: string } | null = null;

  if (authUser) {
    const { data } = await supabase
      .from('users')
      .select('full_name, email, role')
      .eq('auth_id', authUser.id)
      .single();

    if (data) {
      userData = {
        fullName: data.full_name,
        email: data.email,
        role: data.role,
      };
    }
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="mb-6 text-xl font-bold">Profil</h1>

      {userData ? (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <div className="font-medium">{userData.fullName}</div>
              <div className="text-sm text-gray-500">{userData.email}</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-500">Rolle</div>
            <div className="font-medium capitalize">{userData.role}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4 text-center text-gray-500">
          Nicht eingeloggt
        </div>
      )}

      <p className="mt-4 text-center text-sm text-gray-400">
        Weitere Einstellungen folgen in Prompt 27
      </p>
    </div>
  );
}
