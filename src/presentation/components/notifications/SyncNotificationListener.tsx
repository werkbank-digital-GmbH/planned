'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from '@/infrastructure/supabase/client';

import { useTenant } from '@/presentation/hooks/useTenant';
import { useNotificationStore } from '@/presentation/stores/notificationStore';

/**
 * Listener für Sync-Benachrichtigungen via Supabase Realtime.
 *
 * Muss einmal im Dashboard-Layout eingebunden werden.
 * Empfängt Broadcasts vom Webhook-Handler und zeigt Toast-Benachrichtigungen an.
 */
export function SyncNotificationListener() {
  const [isMounted, setIsMounted] = useState(false);
  const { tenant } = useTenant();
  const showNotification = useNotificationStore((s) => s.showNotification);

  // Hydration-Guard: Erst nach Client-Mount ausführen
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Nicht ausführen bis hydrated und tenant vorhanden
    if (!isMounted || !tenant?.id) return;

    let channel: ReturnType<
      ReturnType<typeof createBrowserSupabaseClient>['channel']
    > | null = null;

    try {
      const supabase = createBrowserSupabaseClient();
      channel = supabase.channel(`tenant:${tenant.id}`);

      channel
        .on('broadcast', { event: 'sync_notification' }, ({ payload }) => {
          showNotification(payload);
        })
        .subscribe();
    } catch (error) {
      console.error('[SyncNotificationListener] Error:', error);
    }

    return () => {
      if (channel) {
        const supabase = createBrowserSupabaseClient();
        supabase.removeChannel(channel);
      }
    };
  }, [isMounted, tenant?.id, showNotification]);

  return null;
}
