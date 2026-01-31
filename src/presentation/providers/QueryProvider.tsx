'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider für die App.
 *
 * Konfiguriert den QueryClient mit sinnvollen Defaults:
 * - staleTime: 1 Minute (Daten gelten 1 Minute als frisch)
 * - retry: 1 (nur 1 Retry bei Fehlern)
 * - refetchOnWindowFocus: false (kein automatisches Refetch)
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
