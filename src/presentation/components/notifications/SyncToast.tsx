'use client';

import { ChevronDown, ChevronUp, X, Upload, Download } from 'lucide-react';

import {
  useNotificationStore,
  type SyncDetail,
} from '@/presentation/stores/notificationStore';

import { cn } from '@/lib/utils';

export function SyncToast() {
  const { currentNotification, isExpanded, dismissNotification, toggleExpanded } =
    useNotificationStore();

  if (!currentNotification) return null;

  const isIncoming = currentNotification.direction === 'incoming';
  const Icon = isIncoming ? Download : Upload;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div
        className={cn(
          'bg-white rounded-lg shadow-lg border overflow-hidden',
          'animate-in slide-in-from-bottom-2 duration-300'
        )}
      >
        {/* Header - immer sichtbar */}
        <div className="flex items-center gap-3 p-3">
          <div
            className={cn(
              'p-1.5 rounded-full',
              isIncoming ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <span className="flex-1 text-sm font-medium">
            {currentNotification.summary}
          </span>

          {/* Expand/Collapse Button */}
          {currentNotification.details.length > 0 && (
            <button
              onClick={toggleExpanded}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={dismissNotification}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Details - nur wenn expanded */}
        {isExpanded && currentNotification.details.length > 0 && (
          <div className="px-3 pb-3 border-t bg-gray-50">
            <ul className="mt-2 space-y-1">
              {currentNotification.details.map((detail, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-gray-400">•</span>
                  {formatDetail(detail)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDetail(detail: SyncDetail): string {
  const actionText = {
    created: 'hinzugefügt',
    updated: 'aktualisiert',
    deleted: 'entfernt',
  }[detail.action];

  const typeText = {
    projects: 'Projekt',
    phases: 'Phase',
    users: 'Mitarbeiter',
    absences: 'Abwesenheit',
  }[detail.type];

  if (detail.count && detail.count > 1) {
    const pluralType = {
      projects: 'Projekte',
      phases: 'Phasen',
      users: 'Mitarbeiter',
      absences: 'Abwesenheiten',
    }[detail.type];
    return `${detail.count} ${pluralType} ${actionText}`;
  }

  return `${typeText} "${detail.name}" ${actionText}`;
}
