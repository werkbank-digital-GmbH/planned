import {
  useNotificationStore,
  type SyncDetail,
  type SyncDirection,
} from '@/presentation/stores/notificationStore';

export function useSyncNotification() {
  const showNotification = useNotificationStore((s) => s.showNotification);

  const notifySync = (direction: SyncDirection, details: SyncDetail[]) => {
    const summary =
      direction === 'incoming'
        ? 'Asana hat ein Update gesendet'
        : 'Update an Asana gesendet';

    showNotification({ direction, summary, details });
  };

  return { notifySync };
}

/**
 * Erstellt ein Notification-Payload für Server-seitige Verwendung.
 * Wird im Webhook-Handler verwendet und via Supabase Realtime gebroadcastet.
 */
export function createSyncNotificationPayload(
  direction: SyncDirection,
  details: SyncDetail[]
) {
  return {
    direction,
    summary:
      direction === 'incoming'
        ? 'Asana hat ein Update gesendet'
        : 'Update an Asana gesendet',
    details,
  };
}
