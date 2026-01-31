# Prompt 14a: Supabase Realtime Subscriptions

**Phase:** 3 – Kern-Domain & Use Cases
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 2-3 Stunden

---

## Kontext

Die Queries für Allocations sind implementiert. Jetzt implementieren wir Realtime-Updates für die Multi-User-Planung.

**KRITISCH:** Dieses Feature ist essentiell für die gleichzeitige Nutzung durch mehrere Planer. Ohne Realtime würden User veraltete Daten sehen und Konflikte entstehen.

**Bereits vorhanden:**
- GetAllocationsForWeekQuery
- CreateAllocationUseCase
- MoveAllocationUseCase
- DeleteAllocationUseCase
- Supabase Client Infrastruktur

---

## Ziel

Implementiere Realtime Subscriptions für Allocations, damit Änderungen sofort bei allen verbundenen Clients sichtbar werden.

---

## Referenz-Dokumentation

- `API_SPEC.md` – Realtime Channels, Subscription Pattern
- `FEATURES.md` – F3.9 (Multi-User Collaboration)
- Supabase Realtime Docs

---

## Akzeptanzkriterien

```gherkin
Feature: Realtime Allocations

Scenario: Neue Allocation erscheint bei anderen Usern
  Given Planer A und Planer B sehen beide KW 6
  When Planer A eine neue Allocation erstellt
  Then erscheint sie sofort bei Planer B
  And ohne Page Refresh
  And mit visueller Einblend-Animation

Scenario: Verschobene Allocation wird aktualisiert
  Given Planer A und Planer B sehen beide KW 6
  When Planer A eine Allocation auf einen anderen Tag verschiebt
  Then sieht Planer B:
    | Altes Datum | Allocation verschwindet |
    | Neues Datum | Allocation erscheint    |
  And die Änderung animiert sich

Scenario: Gelöschte Allocation verschwindet
  Given Planer A und Planer B sehen beide KW 6
  When Planer A eine Allocation löscht
  Then verschwindet sie sofort bei Planer B
  And mit Ausblend-Animation

Scenario: Konflikt-Erkennung bei gleichzeitiger Änderung
  Given Planer A und B bearbeiten dieselbe Allocation
  When Planer A speichert zuerst
  Then sieht Planer B eine Warnung "Allocation wurde extern geändert"
  And kann seine Änderungen verwerfen oder überschreiben

Scenario: Subscription für aktuelle Woche
  Given ich bin auf der Planungsseite für KW 6
  When ich zu KW 7 wechsle
  Then wird die Subscription für KW 6 beendet
  And eine neue Subscription für KW 7 gestartet

Scenario: Reconnect bei Verbindungsabbruch
  Given ich habe eine aktive Subscription
  When die Verbindung kurz unterbrochen wird
  Then verbindet sich der Client automatisch wieder
  And lädt die aktuellen Daten nach
```

---

## Technische Anforderungen

### Realtime Channel aus API_SPEC.md

```typescript
// Channel-Name Format
const ALLOCATION_CHANNEL = `allocations:tenant-${tenantId}:week-${yearWeek}`;

// Beispiel: allocations:tenant-abc123:week-2026-06
```

### Subscription Events

```typescript
interface AllocationRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  allocation: AllocationWithDetails | null;  // null bei DELETE
  oldAllocation?: AllocationWithDetails;      // Bei UPDATE
  timestamp: string;
  changedBy: string;  // User ID der Änderung
}
```

### Hook Interface

```typescript
interface UseAllocationSubscriptionOptions {
  weekStart: Date;
  onInsert?: (allocation: AllocationWithDetails) => void;
  onUpdate?: (allocation: AllocationWithDetails, old: AllocationWithDetails) => void;
  onDelete?: (allocationId: string) => void;
  onError?: (error: Error) => void;
}

function useAllocationSubscription(options: UseAllocationSubscriptionOptions): {
  isConnected: boolean;
  reconnect: () => void;
};
```

---

## Implementierungsschritte

### 🔴 RED: Test für Realtime Hook

```typescript
// src/presentation/hooks/__tests__/useAllocationSubscription.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAllocationSubscription } from '../useAllocationSubscription';

// Mock Supabase Realtime
vi.mock('@/infrastructure/supabase/client', () => ({
  getClientSupabaseClient: () => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }),
}));

describe('useAllocationSubscription', () => {
  it('should subscribe to allocation changes', async () => {
    const onInsert = vi.fn();

    const { result } = renderHook(() =>
      useAllocationSubscription({
        weekStart: new Date('2026-02-02'),
        onInsert,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should cleanup subscription on unmount', async () => {
    const { unmount } = renderHook(() =>
      useAllocationSubscription({
        weekStart: new Date('2026-02-02'),
      })
    );

    unmount();

    // Verify channel was removed
    // ... assertion depends on mock setup
  });

  it('should resubscribe when weekStart changes', async () => {
    const { rerender } = renderHook(
      ({ weekStart }) =>
        useAllocationSubscription({ weekStart }),
      { initialProps: { weekStart: new Date('2026-02-02') } }
    );

    rerender({ weekStart: new Date('2026-02-09') });

    // Should have unsubscribed from old week and subscribed to new
  });
});
```

### 🟢 GREEN: useAllocationSubscription Hook implementieren

```typescript
// src/presentation/hooks/useAllocationSubscription.ts
'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/infrastructure/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useTenant } from './useTenant';
import { getCalendarWeek } from '@/lib/date-utils';

export interface AllocationRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

export interface UseAllocationSubscriptionOptions {
  weekStart: Date;
  onInsert?: (allocation: AllocationWithDetails) => void;
  onUpdate?: (allocation: AllocationWithDetails, old: AllocationWithDetails) => void;
  onDelete?: (allocationId: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useAllocationSubscription(options: UseAllocationSubscriptionOptions) {
  const {
    weekStart,
    onInsert,
    onUpdate,
    onDelete,
    onError,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tenant = useTenant();
  const supabase = getClientSupabaseClient();

  const weekKey = `${weekStart.getFullYear()}-${String(getCalendarWeek(weekStart)).padStart(2, '0')}`;

  const handlePayload = useCallback(
    async (payload: AllocationRealtimePayload) => {
      try {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
          case 'INSERT':
            if (newRecord && onInsert) {
              const enriched = await enrichAllocation(newRecord);
              onInsert(enriched);
            }
            break;

          case 'UPDATE':
            if (newRecord && oldRecord && onUpdate) {
              const [enrichedNew, enrichedOld] = await Promise.all([
                enrichAllocation(newRecord),
                enrichAllocation(oldRecord),
              ]);
              onUpdate(enrichedNew, enrichedOld);
            }
            break;

          case 'DELETE':
            if (oldRecord && onDelete) {
              onDelete(oldRecord.id as string);
            }
            break;
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    },
    [onInsert, onUpdate, onDelete, onError]
  );

  useEffect(() => {
    if (!enabled || !tenant?.tenantId) {
      return;
    }

    const channelName = `allocations:tenant-${tenant.tenantId}:week-${weekKey}`;

    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'allocations',
          filter: `tenant_id=eq.${tenant.tenantId}`,
        },
        (payload) => {
          // Filter für relevante Woche
          const date = payload.new?.date || payload.old?.date;
          if (date && isInWeek(new Date(date as string), weekStart)) {
            handlePayload(payload as AllocationRealtimePayload);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          onError?.(new Error('Realtime channel error'));
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enabled, tenant?.tenantId, weekKey, handlePayload, supabase, onError, weekStart]);

  const reconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current.subscribe();
    }
  }, []);

  return {
    isConnected,
    reconnect,
  };
}

// Helper: Prüft ob Datum in der Woche liegt
function isInWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4); // Freitag

  return date >= weekStart && date <= weekEnd;
}

// Helper: Allocation mit verknüpften Daten anreichern
async function enrichAllocation(
  record: Record<string, unknown>
): Promise<AllocationWithDetails> {
  // Für Performance: Entweder cached Daten nutzen oder
  // minimale Daten aus dem Record verwenden
  // Vollständige Daten werden beim nächsten Query-Refresh geladen

  return {
    id: record.id as string,
    date: new Date(record.date as string),
    plannedHours: record.planned_hours as number,
    actualHours: 0, // Wird beim Query-Refresh aktualisiert
    notes: record.notes as string | undefined,
    user: undefined, // Wird beim Query-Refresh geladen
    resource: undefined,
    projectPhase: {
      id: record.project_phase_id as string,
      name: '', // Wird beim Query-Refresh geladen
      bereich: 'produktion',
    },
    project: {
      id: '',
      name: '',
      number: '',
    },
    hasAbsenceConflict: false,
  };
}
```

### 🟢 GREEN: Integration in Planungs-Context

```typescript
// src/presentation/contexts/PlanningContext.tsx
'use client';

import { createContext, useContext, useCallback, useReducer } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllocationsForWeek } from '@/presentation/actions/allocations';
import { useAllocationSubscription } from '@/presentation/hooks/useAllocationSubscription';

interface PlanningState {
  weekStart: Date;
  allocations: WeekAllocationData | null;
  isLoading: boolean;
  pendingChanges: Map<string, 'insert' | 'update' | 'delete'>;
}

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(planningReducer, initialState);

  // Query für Wochendaten
  const { data, isLoading } = useQuery({
    queryKey: ['allocations', 'week', state.weekStart.toISOString()],
    queryFn: () => getAllocationsForWeek({ weekStart: state.weekStart }),
  });

  // Realtime Subscription
  const { isConnected } = useAllocationSubscription({
    weekStart: state.weekStart,
    onInsert: useCallback((allocation) => {
      // Optimistic Update: Allocation sofort hinzufügen
      dispatch({ type: 'REALTIME_INSERT', allocation });

      // Cache invalidieren für vollständige Daten
      queryClient.invalidateQueries({
        queryKey: ['allocations', 'week', state.weekStart.toISOString()],
      });
    }, [queryClient, state.weekStart]),

    onUpdate: useCallback((allocation, old) => {
      dispatch({ type: 'REALTIME_UPDATE', allocation, oldAllocation: old });

      queryClient.invalidateQueries({
        queryKey: ['allocations', 'week', state.weekStart.toISOString()],
      });
    }, [queryClient, state.weekStart]),

    onDelete: useCallback((allocationId) => {
      dispatch({ type: 'REALTIME_DELETE', allocationId });

      queryClient.invalidateQueries({
        queryKey: ['allocations', 'week', state.weekStart.toISOString()],
      });
    }, [queryClient, state.weekStart]),

    onError: useCallback((error) => {
      console.error('Realtime error:', error);
      // Optional: Toast-Notification
    }, []),
  });

  // ...rest of context implementation
}
```

### 🟢 GREEN: Konflikt-Erkennung

```typescript
// src/presentation/hooks/useAllocationConflict.ts
'use client';

import { useState, useCallback } from 'react';

interface ConflictState {
  hasConflict: boolean;
  conflictingAllocation?: AllocationWithDetails;
  localVersion?: AllocationWithDetails;
}

export function useAllocationConflict() {
  const [conflict, setConflict] = useState<ConflictState>({ hasConflict: false });

  const checkConflict = useCallback(
    (localAllocation: AllocationWithDetails, serverAllocation: AllocationWithDetails) => {
      // Vergleiche updatedAt Timestamps
      if (localAllocation.updatedAt < serverAllocation.updatedAt) {
        setConflict({
          hasConflict: true,
          conflictingAllocation: serverAllocation,
          localVersion: localAllocation,
        });
        return true;
      }
      return false;
    },
    []
  );

  const resolveConflict = useCallback((keepLocal: boolean) => {
    setConflict({ hasConflict: false });
    return keepLocal ? conflict.localVersion : conflict.conflictingAllocation;
  }, [conflict]);

  const dismissConflict = useCallback(() => {
    setConflict({ hasConflict: false });
  }, []);

  return {
    conflict,
    checkConflict,
    resolveConflict,
    dismissConflict,
  };
}
```

### 🟢 GREEN: Conflict Dialog Component

```typescript
// src/presentation/components/planning/ConflictDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConflictDialogProps {
  isOpen: boolean;
  localVersion: AllocationWithDetails;
  serverVersion: AllocationWithDetails;
  onKeepLocal: () => void;
  onUseServer: () => void;
  onDismiss: () => void;
}

export function ConflictDialog({
  isOpen,
  localVersion,
  serverVersion,
  onKeepLocal,
  onUseServer,
  onDismiss,
}: ConflictDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Allocation wurde extern geändert
          </DialogTitle>
          <DialogDescription>
            Ein anderer Benutzer hat diese Allocation bearbeitet.
            Wie möchten Sie fortfahren?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-sm mb-2">Ihre Version</h4>
            <p className="text-sm">{localVersion.plannedHours}h</p>
            <p className="text-xs text-gray-500">{localVersion.notes}</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-sm mb-2">Server Version</h4>
            <p className="text-sm">{serverVersion.plannedHours}h</p>
            <p className="text-xs text-gray-500">{serverVersion.notes}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onUseServer}>
            Server-Version übernehmen
          </Button>
          <Button onClick={onKeepLocal}>
            Meine Version behalten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Erwartete Dateien

```
src/
├── presentation/
│   ├── hooks/
│   │   ├── useAllocationSubscription.ts
│   │   ├── useAllocationConflict.ts
│   │   └── __tests__/
│   │       └── useAllocationSubscription.test.ts
│   ├── contexts/
│   │   └── PlanningContext.tsx
│   └── components/
│       └── planning/
│           └── ConflictDialog.tsx
```

---

## Hinweise

- Supabase Realtime muss in der Supabase-Console aktiviert sein
- Channel-Name beinhaltet tenantId UND weekKey für Isolation
- Optimistic Updates für sofortige UI-Reaktion
- Cache-Invalidierung für vollständige Daten nach Realtime-Event
- Konflikt-Erkennung basiert auf `updatedAt` Timestamp
- Bei Verbindungsabbruch: automatischer Reconnect
- Animations für Insert/Delete (CSS Transitions)

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Realtime Subscription funktioniert
- [ ] INSERT Events erscheinen bei anderen Clients
- [ ] UPDATE Events aktualisieren UI
- [ ] DELETE Events entfernen Allocation
- [ ] Subscription wechselt bei Wochenwechsel
- [ ] Konflikt-Dialog erscheint bei Concurrent Edit
- [ ] Reconnect nach Verbindungsabbruch

---

*Vorheriger Prompt: 14 – GetAllocationsForWeek Query*
*Nächster Prompt: 15 – Planungsansicht UI*
