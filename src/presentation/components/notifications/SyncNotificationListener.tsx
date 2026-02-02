'use client';

import { useEffect } from 'react';

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
  const { tenant } = useTenant();
  const showNotification = useNotificationStore((s) => s.showNotification);

  useEffect(() => {
    if (!tenant?.id) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`tenant:${tenant.id}`);

    channel
      .on('broadcast', { event: 'sync_notification' }, ({ payload }) => {
        showNotification(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, showNotification]);

  return null;
}
