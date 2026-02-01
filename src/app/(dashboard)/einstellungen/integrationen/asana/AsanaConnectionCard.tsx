'use client';

import { CheckCircle, ExternalLink, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { disconnectAsana } from '@/presentation/actions/integrations';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';

interface AsanaConnectionCardProps {
  isConnected: boolean;
  workspaceId?: string;
}

/**
 * Zeigt den Asana-Verbindungsstatus und ermöglicht Verbinden/Trennen.
 */
export function AsanaConnectionCard({ isConnected, workspaceId }: AsanaConnectionCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectAsana();

      if (result.success) {
        toast.success('Asana-Verbindung getrennt');
      } else {
        toast.error(result.error.message);
      }
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-400" />
            Nicht verbunden
          </CardTitle>
          <CardDescription>
            Verbinden Sie Planned mit Ihrem Asana Workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/api/integrations/asana/authorize">
              <ExternalLink className="mr-2 h-4 w-4" />
              Mit Asana verbinden
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Verbunden
        </CardTitle>
        <CardDescription>
          Workspace: {workspaceId ?? 'Unbekannt'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
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
