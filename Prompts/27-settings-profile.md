# Prompt 27: Settings & Profile

**Phase:** 6 – Dashboard, Mobile & Finishing
**Komplexität:** M (Medium)
**Geschätzte Zeit:** 3-4 Stunden

---

## Kontext

Mobile Ansicht ist fertig. Jetzt implementieren wir Einstellungen und Profil-Seiten.

**Bereits vorhanden:**
- User Entity
- User Management (Admin)
- Tenant Context
- Integration Settings (Asana, TimeTac)

---

## Ziel

Implementiere Einstellungs-Seiten und Benutzer-Profil.

---

## Referenz-Dokumentation

- `FEATURES.md` – F6 (Mitarbeiter-Verwaltung), F11 (Einstellungen)
- **UI-Screens:**
  - `stitch_planned./settings_-_integration_settings/settings_-_integration_settings.png`
  - `stitch_planned./settings_-_employee_management/settings_-_employee_management.png`

---

## Akzeptanzkriterien

```gherkin
Feature: Einstellungen

Scenario: Einstellungen Navigation (Admin)
  Given ich bin Admin
  When ich zu Einstellungen navigiere
  Then sehe ich folgende Bereiche:
    | Bereich        | Beschreibung              |
    | Mitarbeiter    | User CRUD                 |
    | Ressourcen     | Ressourcen CRUD           |
    | Integrationen  | Asana, TimeTac            |
    | Unternehmen    | Tenant-Einstellungen      |

Scenario: Einstellungen Navigation (Planer)
  Given ich bin Planer (nicht Admin)
  When ich zu Einstellungen navigiere
  Then sehe ich nur mein Profil
  And keine Mitarbeiter/Ressourcen-Verwaltung

Feature: Profil

Scenario: Eigenes Profil anzeigen
  Given ich bin eingeloggt
  When ich zu Profil navigiere
  Then sehe ich meine Daten:
    | Feld          | Bearbeitbar |
    | Name          | Ja          |
    | E-Mail        | Nein        |
    | Wochenstunden | Nein        |
    | Rolle         | Nein        |

Scenario: Profil bearbeiten
  Given ich bin auf meinem Profil
  When ich meinen Namen ändere
  And auf "Speichern" klicke
  Then wird der Name aktualisiert
  And ich sehe eine Bestätigung

Scenario: Passwort ändern
  Given ich bin auf meinem Profil
  When ich auf "Passwort ändern" klicke
  Then öffnet sich ein Dialog
  And ich muss das aktuelle Passwort eingeben
  And das neue Passwort zweimal eingeben
  After Erfolg: Passwort ist geändert

Feature: Unternehmens-Einstellungen

Scenario: Unternehmens-Name ändern (Admin)
  Given ich bin Admin
  When ich zu Einstellungen > Unternehmen gehe
  Then kann ich den Firmennamen ändern
  And den Firmen-Slug ändern (URL)

Scenario: Arbeitszeiten konfigurieren
  Given ich bin Admin
  When ich zu Einstellungen > Unternehmen gehe
  Then kann ich Standard-Arbeitstage definieren
  And Standard-Tagesstunden (Default: 8h)
```

---

## Implementierungsschritte

### 🟢 GREEN: Settings Layout

```typescript
// src/app/(dashboard)/einstellungen/layout.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/presentation/actions/auth';
import { SettingsSidebar } from '@/presentation/components/settings/SettingsSidebar';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-full">
      <SettingsSidebar userRole={user.role} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
```

### 🟢 GREEN: Settings Sidebar

```typescript
// src/presentation/components/settings/SettingsSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Truck, Link2, Building, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/domain/entities/User';

interface SettingsSidebarProps {
  userRole: UserRole;
}

const ADMIN_ITEMS = [
  { href: '/einstellungen/mitarbeiter', label: 'Mitarbeiter', icon: Users },
  { href: '/einstellungen/ressourcen', label: 'Ressourcen', icon: Truck },
  { href: '/einstellungen/integrationen', label: 'Integrationen', icon: Link2 },
  { href: '/einstellungen/unternehmen', label: 'Unternehmen', icon: Building },
];

export function SettingsSidebar({ userRole }: SettingsSidebarProps) {
  const pathname = usePathname();

  const items = userRole === 'admin' ? ADMIN_ITEMS : [];

  return (
    <aside className="w-64 border-r bg-gray-50">
      <div className="p-4">
        <h2 className="font-semibold text-lg">Einstellungen</h2>
      </div>

      <nav className="px-2 space-y-1">
        {/* Profil für alle */}
        <SidebarItem
          href="/einstellungen/profil"
          label="Mein Profil"
          icon={User}
          isActive={pathname === '/einstellungen/profil'}
        />

        {/* Admin Items */}
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-accent text-white'
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
```

### 🟢 GREEN: Profile Page

```typescript
// src/app/(dashboard)/einstellungen/profil/page.tsx
import { getCurrentUser } from '@/presentation/actions/auth';
import { ProfileForm } from '@/presentation/components/settings/ProfileForm';
import { PasswordChangeSection } from '@/presentation/components/settings/PasswordChangeSection';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mein Profil</h1>
        <p className="text-gray-500">Verwalten Sie Ihre persönlichen Daten</p>
      </div>

      <ProfileForm user={user} />

      <hr />

      <PasswordChangeSection />
    </div>
  );
}
```

### 🟢 GREEN: ProfileForm Component

```typescript
// src/presentation/components/settings/ProfileForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { updateProfile } from '@/presentation/actions/users';
import { toast } from 'sonner';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
});

interface ProfileFormProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    weeklyHours: number;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
    },
  });

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    const result = await updateProfile(data);
    if (result.success) {
      toast.success('Profil aktualisiert');
    } else {
      toast.error(result.error.message);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator',
    planer: 'Planer',
    gewerblich: 'Gewerblich',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Name</Label>
        <Input
          id="fullName"
          {...register('fullName')}
          className={errors.fullName ? 'border-error' : ''}
        />
        {errors.fullName && (
          <p className="text-sm text-error">{errors.fullName.message}</p>
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
          <Input value={ROLE_LABELS[user.role]} disabled className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Wochenstunden</Label>
          <Input value={`${user.weeklyHours}h`} disabled className="bg-gray-50" />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Speichern...' : 'Speichern'}
      </Button>
    </form>
  );
}
```

### 🟢 GREEN: PasswordChangeSection Component

```typescript
// src/presentation/components/settings/PasswordChangeSection.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/ui/dialog';
import { changePassword } from '@/presentation/actions/auth';
import { toast } from 'sonner';
import { Key } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string().min(8, 'Mindestens 8 Zeichen'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

export function PasswordChangeSection() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: z.infer<typeof passwordSchema>) => {
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result.success) {
      toast.success('Passwort geändert');
      setIsOpen(false);
      reset();
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Sicherheit</h2>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Key className="h-4 w-4 mr-2" />
            Passwort ändern
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-error">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-error">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Wird geändert...' : 'Passwort ändern'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 🟢 GREEN: Company Settings Page (Admin only)

```typescript
// src/app/(dashboard)/einstellungen/unternehmen/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/presentation/actions/auth';
import { getTenant } from '@/presentation/actions/tenant';
import { CompanyForm } from '@/presentation/components/settings/CompanyForm';

export default async function CompanySettingsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/einstellungen/profil');
  }

  const tenant = await getTenant();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Unternehmens-Einstellungen</h1>
        <p className="text-gray-500">Verwalten Sie die Einstellungen Ihres Unternehmens</p>
      </div>

      <CompanyForm tenant={tenant.data} />
    </div>
  );
}
```

---

## Erwartete Dateien

```
src/
├── app/
│   └── (dashboard)/
│       └── einstellungen/
│           ├── layout.tsx
│           ├── page.tsx  # Redirect zu /profil
│           ├── profil/
│           │   └── page.tsx
│           ├── mitarbeiter/
│           │   └── page.tsx  # Aus Prompt 06
│           ├── ressourcen/
│           │   └── page.tsx  # Aus Prompt 10
│           ├── integrationen/
│           │   └── page.tsx  # Aus Prompts 20-24
│           └── unternehmen/
│               └── page.tsx
└── presentation/
    └── components/
        └── settings/
            ├── SettingsSidebar.tsx
            ├── ProfileForm.tsx
            ├── PasswordChangeSection.tsx
            └── CompanyForm.tsx
```

---

## Hinweise

- Settings nur für eingeloggte User
- Admin sieht alle Bereiche, Planer/Gewerblich nur Profil
- Passwort-Änderung über Supabase Auth
- E-Mail kann nicht geändert werden
- Rolle und Wochenstunden nur von Admin änderbar
- Sidebar zeigt aktiven Bereich

---

## Validierung

Nach Abschluss dieses Prompts:

- [ ] Settings Sidebar zeigt korrekte Items per Rolle
- [ ] Profil kann bearbeitet werden
- [ ] Passwort kann geändert werden
- [ ] Admin kann Unternehmens-Daten ändern
- [ ] Non-Admin sieht nur Profil
- [ ] Navigation funktioniert

---

*Vorheriger Prompt: 26 – Mobile "Meine Woche" View*
*Nächster Prompt: 28 – Testing & Polish*
