'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useLocalStorageToggle } from '@/presentation/hooks/useLocalStorageToggle';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface EmptyFilterContextValue {
  /** Wenn true: Projekte ohne Allocations in der aktuellen Periode ausblenden */
  hideEmptyProjects: boolean;
  /** Wenn true: Phasen ohne Allocations in der aktuellen Periode ausblenden */
  hideEmptyPhases: boolean;
  toggleHideEmptyProjects: () => void;
  toggleHideEmptyPhases: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const EmptyFilterContext = createContext<EmptyFilterContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function EmptyFilterProvider({ children }: { children: ReactNode }) {
  const [hideEmptyProjects, toggleHideEmptyProjects] = useLocalStorageToggle(
    'planned.hideEmptyProjects',
    false
  );
  const [hideEmptyPhases, toggleHideEmptyPhases] = useLocalStorageToggle(
    'planned.hideEmptyPhases',
    false
  );

  return (
    <EmptyFilterContext.Provider
      value={{
        hideEmptyProjects,
        hideEmptyPhases,
        toggleHideEmptyProjects,
        toggleHideEmptyPhases,
      }}
    >
      {children}
    </EmptyFilterContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useEmptyFilter(): EmptyFilterContextValue {
  const context = useContext(EmptyFilterContext);
  if (!context) {
    throw new Error('useEmptyFilter must be used within an EmptyFilterProvider');
  }
  return context;
}
