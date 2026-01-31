'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createAllocationAction } from '@/presentation/actions/allocations';
import { Button } from '@/presentation/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { usePlanning } from '@/presentation/contexts/PlanningContext';
import { useUndo } from '@/presentation/contexts/UndoContext';

import { formatDateISO, getWeekDates, isSameDay } from '@/lib/date-utils';

import { DateMultiSelect } from './DateMultiSelect';
import { PhaseSelector } from './PhaseSelector';
import { ProjectSearch } from './ProjectSearch';
import { UserResourceSelector } from './UserResourceSelector';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const quickAddSchema = z
  .object({
    projectId: z.string().min(1, 'Bitte wählen Sie ein Projekt'),
    projectPhaseId: z.string().min(1, 'Bitte wählen Sie eine Phase'),
    userId: z.string().optional(),
    resourceId: z.string().optional(),
    dates: z.array(z.date()).min(1, 'Mindestens ein Datum auswählen'),
    notes: z.string().max(500, 'Maximal 500 Zeichen').optional(),
  })
  .refine((data) => data.userId || data.resourceId, {
    message: 'Mitarbeiter oder Ressource erforderlich',
    path: ['userId'],
  });

type QuickAddFormData = z.infer<typeof quickAddSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface QuickAddDialogProps {
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback zum Schließen */
  onClose: () => void;
  /** Vorausgefüllte Werte */
  defaultValues?: {
    userId?: string;
    resourceId?: string;
    date?: Date;
    projectPhaseId?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick-Add Dialog für neue Allocations.
 *
 * Ermöglicht schnelles Erstellen von Allocations mit:
 * - Projekt-Suche
 * - Phase-Auswahl (gruppiert nach Bereich)
 * - Mitarbeiter/Ressourcen-Auswahl
 * - Mehrfach-Datums-Auswahl
 * - Optionale Notizen
 */
export function QuickAddDialog({
  isOpen,
  onClose,
  defaultValues,
}: QuickAddDialogProps) {
  const { weekStart, refresh } = usePlanning();
  const { pushAction } = useUndo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ermittle initiale Daten basierend auf defaultValues
  const getInitialDates = useCallback((): Date[] => {
    if (defaultValues?.date) {
      return [defaultValues.date];
    }
    // Standard: Heute wenn in aktueller Woche, sonst erster Tag der Woche
    const weekDays = getWeekDates(weekStart);
    const today = new Date();
    const todayInWeek = weekDays.find((d) => isSameDay(d, today));
    return [todayInWeek ?? weekDays[0]];
  }, [defaultValues?.date, weekStart]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      dates: getInitialDates(),
      userId: defaultValues?.userId,
      resourceId: defaultValues?.resourceId,
      projectPhaseId: defaultValues?.projectPhaseId ?? '',
      projectId: '',
      notes: '',
    },
  });

  const selectedProjectId = watch('projectId');
  const selectedUserId = watch('userId');
  const selectedResourceId = watch('resourceId');
  const selectedDates = watch('dates');
  const selectedPhaseId = watch('projectPhaseId');
  const notes = watch('notes');

  // Fokus auf Suchfeld wenn Dialog öffnet
  useEffect(() => {
    if (isOpen) {
      // Reset mit neuen Default-Werten
      reset({
        dates: getInitialDates(),
        userId: defaultValues?.userId,
        resourceId: defaultValues?.resourceId,
        projectPhaseId: defaultValues?.projectPhaseId ?? '',
        projectId: '',
        notes: '',
      });

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultValues, reset, getInitialDates]);

  const onSubmit = async (data: QuickAddFormData) => {
    setIsSubmitting(true);

    try {
      // Für jeden ausgewählten Tag eine Allocation erstellen
      const results = await Promise.all(
        data.dates.map((date) =>
          createAllocationAction({
            projectPhaseId: data.projectPhaseId,
            userId: data.userId,
            resourceId: data.resourceId,
            date: formatDateISO(date),
            notes: data.notes,
          })
        )
      );

      const successfulResults = results.filter((r) => r.success);
      const failedCount = results.length - successfulResults.length;

      if (failedCount > 0) {
        toast.error(
          `${failedCount} von ${data.dates.length} Allocations konnten nicht erstellt werden`
        );
      } else {
        toast.success(
          data.dates.length > 1
            ? `${data.dates.length} Allocations erstellt`
            : 'Allocation erstellt'
        );
      }

      // Push Undo Action für erfolgreiche Allocations
      if (successfulResults.length > 0) {
        const snapshots = successfulResults
          .filter((r) => r.success)
          .map((r) => ({
            id: r.data.allocation.id,
            tenantId: r.data.allocation.tenantId,
            userId: r.data.allocation.userId,
            resourceId: r.data.allocation.resourceId,
            projectPhaseId: r.data.allocation.projectPhaseId,
            date: r.data.allocation.date,
            plannedHours: r.data.allocation.plannedHours ?? 8,
            notes: r.data.allocation.notes,
          }));

        if (snapshots.length === 1) {
          pushAction({
            type: 'CREATE_ALLOCATION',
            allocation: snapshots[0],
          });
        } else {
          pushAction({
            type: 'BATCH_CREATE',
            allocations: snapshots,
          });
        }
      }

      await refresh();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Erstellen', {
        description:
          error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Allocation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Projekt Suche */}
          <div className="space-y-2">
            <Label>Projekt *</Label>
            <ProjectSearch
              ref={searchInputRef}
              onSelect={(project) => {
                setValue('projectId', project.id);
                setValue('projectPhaseId', ''); // Reset Phase
              }}
              error={errors.projectId?.message}
            />
          </div>

          {/* Phase Auswahl */}
          {selectedProjectId && (
            <div className="space-y-2">
              <Label>Phase *</Label>
              <PhaseSelector
                projectId={selectedProjectId}
                value={selectedPhaseId}
                onChange={(phaseId) => setValue('projectPhaseId', phaseId)}
                error={errors.projectPhaseId?.message}
              />
            </div>
          )}

          {/* User/Ressource Auswahl */}
          <div className="space-y-2">
            <Label>Mitarbeiter *</Label>
            <UserResourceSelector
              userId={selectedUserId}
              resourceId={selectedResourceId}
              onUserSelect={(id) => {
                setValue('userId', id);
                setValue('resourceId', undefined);
              }}
              onResourceSelect={(id) => {
                setValue('resourceId', id);
                setValue('userId', undefined);
              }}
              error={errors.userId?.message}
            />
          </div>

          {/* Datum Auswahl */}
          <div className="space-y-2">
            <Label>Datum *</Label>
            <DateMultiSelect
              weekStart={weekStart}
              value={selectedDates}
              onChange={(dates) => setValue('dates', dates)}
              error={errors.dates?.message}
            />
          </div>

          {/* Notiz */}
          <div className="space-y-2">
            <Label>Notiz (optional)</Label>
            <Textarea
              value={notes ?? ''}
              onChange={(e) => setValue('notes', e.target.value)}
              placeholder="Optionale Notiz..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
