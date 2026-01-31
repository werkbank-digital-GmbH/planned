'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateTenantAction } from '@/presentation/actions/tenant';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CompanyFormProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    defaultDailyHours: number;
    workDays: number[];
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const companySchema = z.object({
  name: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen haben'),
  slug: z
    .string()
    .min(2, 'URL-Kürzel muss mindestens 2 Zeichen haben')
    .regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt'),
  defaultDailyHours: z.coerce.number().min(1).max(24),
});

type CompanyFormData = z.infer<typeof companySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Unternehmens-Einstellungen Formular
 *
 * Features:
 * - Firmenname ändern
 * - URL-Slug ändern
 * - Standard-Tagesstunden setzen
 */
export function CompanyForm({ tenant }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: tenant?.name ?? '',
      slug: tenant?.slug ?? '',
      defaultDailyHours: tenant?.defaultDailyHours ?? 8,
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    const formData = new FormData();
    formData.set('name', data.name);
    formData.set('slug', data.slug);
    formData.set('defaultDailyHours', String(data.defaultDailyHours));

    const result = await updateTenantAction(formData);

    if (result.success) {
      toast.success('Unternehmens-Einstellungen aktualisiert');
    } else {
      toast.error(result.error.message);
    }
  };

  if (!tenant) {
    return (
      <div className="rounded-lg border bg-gray-50 p-4 text-center text-gray-500">
        Unternehmensdaten nicht verfügbar
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium">Allgemein</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Firmenname</Label>
          <Input
            id="name"
            {...register('name')}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">URL-Kürzel</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">planned.app/</span>
            <Input
              id="slug"
              {...register('slug')}
              className={errors.slug ? 'border-red-500' : ''}
            />
          </div>
          {errors.slug && (
            <p className="text-sm text-red-500">{errors.slug.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Arbeitszeiten</h3>

        <div className="space-y-2">
          <Label htmlFor="defaultDailyHours">Standard-Tagesstunden</Label>
          <Input
            id="defaultDailyHours"
            type="number"
            min={1}
            max={24}
            {...register('defaultDailyHours')}
            className={errors.defaultDailyHours ? 'border-red-500' : ''}
          />
          {errors.defaultDailyHours && (
            <p className="text-sm text-red-500">
              {errors.defaultDailyHours.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Wird als Standard für neue Allocations verwendet
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Speichern...' : 'Speichern'}
      </Button>
    </form>
  );
}
