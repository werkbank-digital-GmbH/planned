import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/infrastructure/supabase';

import {
  PasswordChangeSection,
  ProfileForm,
} from '@/presentation/components/settings';

/**
 * Profil-Seite
 *
 * Zeigt und ermöglicht die Bearbeitung des eigenen Profils.
 */
export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email, role, weekly_hours')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    redirect('/login');
  }

  const user = {
    id: userData.id,
    fullName: userData.full_name,
    email: userData.email,
    role: userData.role,
    weeklyHours: userData.weekly_hours,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ProfileForm user={user} />

      <hr />

      <PasswordChangeSection />
    </div>
  );
}
