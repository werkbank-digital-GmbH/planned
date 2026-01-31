'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateProfileAction } from '@/presentation/actions/users';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProfileFormProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    weeklyHours: number | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  planer: 'Planer',
  gewerblich: 'Gewerblich',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profil-Formular
 *
 * Features:
 * - Name bearbeitbar
 * - E-Mail, Rolle, Wochenstunden nur lesend
 * - Validierung und Feedback
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    const formData = new FormData();
    formData.set('fullName', data.fullName);

    const result = await updateProfileAction(formData);

    if (result.success) {
      toast.success('Profil aktualisiert');
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Name</Label>
        <Input
          id="fullName"
          {...register('fullName')}
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>E-Mail</Label>
        <Input value={user.email} disabled className="bg-gray-50" />
        <p className="text-xs text-gray-500">
          E-Mail-Adresse kann nicht geändert werden
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rolle</Label>
          <Input
            value={ROLE_LABELS[user.role] ?? user.role}
            disabled
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label>Wochenstunden</Label>
          <Input value={user.weeklyHours ? `${user.weeklyHours}h` : '-'} disabled className="bg-gray-50" />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Speichern...' : 'Speichern'}
      </Button>
    </form>
  );
}
