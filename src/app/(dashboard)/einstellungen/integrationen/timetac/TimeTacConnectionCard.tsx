'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Key, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { connectTimeTac, disconnectTimeTac } from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const connectSchema = z.object({
  apiKey: z.string().min(10, 'API-Key muss mindestens 10 Zeichen haben'),
});

type ConnectFormData = z.infer<typeof connectSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TimeTacConnectionCardProps {
  isConnected: boolean;
  accountId?: string;
}

/**
 * Zeigt den TimeTac-Verbindungsstatus und ermöglicht Verbinden/Trennen.
 */
export function TimeTacConnectionCard({ isConnected, accountId }: TimeTacConnectionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(!isConnected);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
  });

  const onConnect = (data: ConnectFormData) => {
    startTransition(async () => {
      const result = await connectTimeTac(data.apiKey);

      if (result.success) {
        toast.success(`TimeTac verbunden: ${result.data.accountName}`);
        reset();
        setShowForm(false);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectTimeTac();

      if (result.success) {
        toast.success('TimeTac-Verbindung getrennt');
        setShowForm(true);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  // Nicht verbunden - Formular anzeigen
  if (!isConnected || showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-400" />
            {isConnected ? 'Verbindung ändern' : 'Nicht verbunden'}
          </CardTitle>
          <CardDescription>
            Geben Sie Ihren TimeTac API-Key ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onConnect)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API-Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Ihr TimeTac API-Key..."
                  className={`pl-10 ${errors.apiKey ? 'border-red-500' : ''}`}
                  {...register('apiKey')}
                />
              </div>
              {errors.apiKey && (
                <p className="text-sm text-red-500">{errors.apiKey.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Verbinde...' : 'Verbinden'}
              </Button>
              {isConnected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Verbunden - Status anzeigen
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Verbunden
        </CardTitle>
        <CardDescription>
          Account ID: {accountId ?? 'Unbekannt'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
        >
          API-Key ändern
        </Button>
        <Button
          variant="destructive"
          onClick={handleDisconnect}
          disabled={isPending}
        >
          {isPending ? 'Trennen...' : 'Verbindung trennen'}
        </Button>
      </CardContent>
    </Card>
  );
}
