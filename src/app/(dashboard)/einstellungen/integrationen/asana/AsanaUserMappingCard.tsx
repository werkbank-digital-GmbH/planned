'use client';

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  syncAsanaUsers,
  type UserMappingDTO,
} from '@/presentation/actions/integrations';
import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/presentation/components/ui/card';

/**
 * User-Mapping Card fur Asana-Integration.
 * Synchronisiert User zwischen Asana und planned per E-Mail-Prefix-Matching.
 */
export function AsanaUserMappingCard() {
  const [isPending, startTransition] = useTransition();
  const [mappings, setMappings] = useState<UserMappingDTO[] | null>(null);
  const [stats, setStats] = useState<{
    matched: number;
    unmatchedPlanned: number;
    unmatchedAsana: number;
  } | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncAsanaUsers();

      if (result.success) {
        setMappings(result.data.mappings);
        setStats({
          matched: result.data.matched,
          unmatchedPlanned: result.data.unmatchedPlanned,
          unmatchedAsana: result.data.unmatchedAsana,
        });
        toast.success(`${result.data.matched} User erfolgreich gemappt`);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User-Mapping
            </CardTitle>
            <CardDescription>
              Automatisches Mapping von Asana-Usern zu Planned-Mitarbeitern per E-Mail-Prefix
            </CardDescription>
          </div>
          <Button onClick={handleSync} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Synchronisiere...' : 'User synchronisieren'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Erklarung */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            <strong>So funktioniert das Matching:</strong> User werden anhand des E-Mail-Prefixes
            (vor dem @) abgeglichen. Beispiel: <code>max.muster@firma.de</code> in Asana wird
            automatisch <code>max.muster@andere-domain.com</code> in Planned zugeordnet.
          </p>
        </div>

        {/* Statistik */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.matched}</div>
              <div className="text-xs text-green-600">Gemappt</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.unmatchedPlanned}</div>
              <div className="text-xs text-amber-600">Planned ohne Match</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.unmatchedAsana}</div>
              <div className="text-xs text-gray-600">Asana ohne Match</div>
            </div>
          </div>
        )}

        {/* Mapping-Liste */}
        {mappings && mappings.length > 0 && (
          <div className="rounded-lg border divide-y">
            {mappings.map((mapping) => (
              <div
                key={mapping.plannedUserId}
                className="flex items-center justify-between p-3 text-sm"
              >
                {/* Planned User */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{mapping.plannedUserName}</div>
                  <div className="text-xs text-gray-500 truncate">{mapping.plannedUserEmail}</div>
                </div>

                {/* Pfeil */}
                <div className="px-3 text-gray-400 flex-shrink-0">→</div>

                {/* Asana User */}
                <div className="flex-1 min-w-0">
                  {mapping.asanaUserName ? (
                    <>
                      <div className="font-medium truncate">{mapping.asanaUserName}</div>
                      {mapping.asanaUserEmail && (
                        <div className="text-xs text-gray-500 truncate">{mapping.asanaUserEmail}</div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Kein Match gefunden</span>
                  )}
                </div>

                {/* Status */}
                <div className="pl-3 flex-shrink-0">
                  {mapping.asanaUserGid ? (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Gemappt
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Offen
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keine Mappings */}
        {mappings === null && (
          <p className="text-center text-sm text-gray-500">
            Klicken Sie auf &quot;User synchronisieren&quot; um die User abzugleichen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
