'use client';

/**
 * QuickAssignDialog
 *
 * Dialog für schnelle Mitarbeiter-Zuweisung basierend auf KI-Empfehlungen.
 * Wird aus den Phase-Insights heraus geöffnet.
 */

import { Calendar, Check, Loader2, UserPlus, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { quickAssignUserToPhaseAction } from '@/presentation/actions/quick-assign';
import { Button } from '@/presentation/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface QuickAssignDialogProps {
  open: boolean;
  onClose: () => void;
  phaseId: string;
  phaseName: string;
  suggestedUserId: string | null;
  suggestedUserName: string | null;
  suggestedDays: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return 'Keine Tage vorgeschlagen';
  if (dates.length === 1) return formatDate(dates[0]);

  const sorted = [...dates].sort();
  const first = formatDate(sorted[0]);
  const last = formatDate(sorted[sorted.length - 1]);

  if (dates.length === 2) {
    return `${first} und ${last}`;
  }

  return `${first} - ${last} (${dates.length} Tage)`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function QuickAssignDialog({
  open,
  onClose,
  phaseId,
  phaseName,
  suggestedUserId,
  suggestedUserName,
  suggestedDays,
}: QuickAssignDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selected days für die Zuweisung (default: alle vorgeschlagenen)
  const [selectedDays, setSelectedDays] = useState<string[]>(suggestedDays);

  const handleQuickAssign = () => {
    if (!suggestedUserId || selectedDays.length === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await quickAssignUserToPhaseAction({
        phaseId,
        userId: suggestedUserId,
        dates: selectedDays,
      });

      if (!result.success) {
        setError(result.error?.message ?? 'Fehler bei der Zuweisung');
        return;
      }

      setSuccess(true);
      // Nach kurzer Verzögerung schließen
      setTimeout(() => {
        onClose();
        setSuccess(false);
        router.refresh();
      }, 1500);
    });
  };

  const handleOpenInPlanning = () => {
    // Navigiere zur Planungsansicht mit Pre-Selection
    const firstDay = selectedDays[0] ?? new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
      phaseId,
      userId: suggestedUserId ?? '',
      date: firstDay,
    });

    router.push(`/planung?${params.toString()}`);
    onClose();
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Reset state wenn Dialog geschlossen wird
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setSelectedDays(suggestedDays);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Schnellzuweisung
          </DialogTitle>
          <DialogDescription>
            {suggestedUserName
              ? `${suggestedUserName} zur Phase "${phaseName}" zuweisen`
              : `Mitarbeiter zur Phase "${phaseName}" zuweisen`}
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 font-medium text-green-700">Erfolgreich zugewiesen!</p>
          </div>
        ) : (
          <>
            {/* Day Selection */}
            {suggestedDays.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Vorgeschlagene Tage:</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {suggestedDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        selectedDays.includes(day)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {formatDate(day)}
                    </button>
                  ))}
                </div>

                {selectedDays.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {selectedDays.length} Tag(e) ausgewählt: {formatDateRange(selectedDays)}
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!success && (
            <>
              <Button
                variant="outline"
                onClick={handleOpenInPlanning}
                className="w-full gap-2 sm:w-auto"
              >
                <ExternalLink className="h-4 w-4" />
                In Planung öffnen
              </Button>

              <Button
                onClick={handleQuickAssign}
                disabled={isPending || !suggestedUserId || selectedDays.length === 0}
                className="w-full gap-2 sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird zugewiesen...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Jetzt zuweisen
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
