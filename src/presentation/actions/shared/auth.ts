'use server';

import type { UserRole } from '@/domain/types';

import { createActionSupabaseClient } from '@/infrastructure/supabase';

export interface CurrentUser {
  id: string;
  role: UserRole;
  tenantId: string;
}

/**
 * Holt den aktuellen User mit Tenant-Daten.
 * Wirft einen Error wenn kein User eingeloggt ist.
 */
export async function getCurrentUserWithTenant(): Promise<CurrentUser> {
  const supabase = await createActionSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Nicht eingeloggt');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (!userData) {
    throw new Error('User nicht gefunden');
  }

  return {
    id: userData.id,
    role: userData.role as UserRole,
    tenantId: userData.tenant_id,
  };
}
