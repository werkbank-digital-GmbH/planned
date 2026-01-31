'use client';

import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/infrastructure/supabase/client';

/**
 * Tenant-Kontext für den aktuell eingeloggten User
 */
export interface TenantContext {
  id: string;
  name: string;
  slug: string;
}

/**
 * Return-Type des useTenant Hooks
 */
export interface UseTenantResult {
  /** Tenant-Daten des aktuellen Users (null wenn nicht eingeloggt) */
  tenant: TenantContext | null;
  /** Lädt die Tenant-Daten */
  isLoading: boolean;
  /** Fehler beim Laden */
  error: Error | null;
}

/** Cache-Zeit für Tenant-Daten (5 Minuten) */
const STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Hook zum Abrufen des Tenant-Kontexts für den aktuell eingeloggten User.
 *
 * Verwendet React Query für Caching und automatische Revalidierung.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { tenant, isLoading } = useTenant();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!tenant) return null;
 *
 *   return <span>{tenant.name}</span>;
 * }
 * ```
 */
export function useTenant(): UseTenantResult {
  const supabase = createBrowserSupabaseClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant'],
    queryFn: async (): Promise<TenantContext | null> => {
      // 1. Aktuellen Auth-User abrufen
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        return null;
      }

      // 2. User mit Tenant-Daten abrufen
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          `
          tenant:tenants!inner(
            id,
            name,
            slug
          )
        `
        )
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) {
        return null;
      }

      // Type assertion für das verschachtelte tenant-Objekt
      const tenant = userData.tenant as unknown as TenantContext;

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      };
    },
    staleTime: STALE_TIME_MS,
    retry: false,
  });

  return {
    tenant: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
