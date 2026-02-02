import { create } from 'zustand';

export type SyncDirection = 'incoming' | 'outgoing';
export type SyncType = 'projects' | 'phases' | 'users' | 'absences';

export interface SyncDetail {
  type: SyncType;
  action: 'created' | 'updated' | 'deleted';
  name: string;
  count?: number;
}

export interface SyncNotification {
  id: string;
  direction: SyncDirection;
  timestamp: Date;
  summary: string;
  details: SyncDetail[];
}

interface NotificationState {
  currentNotification: SyncNotification | null;
  isExpanded: boolean;

  showNotification: (notification: Omit<SyncNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: () => void;
  toggleExpanded: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentNotification: null,
  isExpanded: false,

  showNotification: (notification) => {
    const id = crypto.randomUUID();
    set({
      currentNotification: {
        ...notification,
        id,
        timestamp: new Date(),
      },
      isExpanded: false,
    });

    // Auto-dismiss nach 5 Sekunden (nur wenn nicht expanded)
    setTimeout(() => {
      set((state) => {
        if (state.currentNotification?.id === id && !state.isExpanded) {
          return { currentNotification: null };
        }
        return state;
      });
    }, 5000);
  },

  dismissNotification: () => set({ currentNotification: null, isExpanded: false }),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
}));
