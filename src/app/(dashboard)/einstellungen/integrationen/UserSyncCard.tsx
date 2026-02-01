'use client';

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { syncAsanaUsers, type UserMappingDTO } from '@/presentation/actions/integrations';
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
 * Kombinierte Karte für Mitarbeiter-Synchronisation.
 * Enthält: User-Mapping Tabelle, Sync-Button.
 */
export function UserSyncCard() {
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
        toast.success(`${result.data.matched} Mitarbeiter erfolgreich verknüpft`);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>Mitarbeiter</CardTitle>
              <CardDescription>
                Mitarbeiter zwischen planned. und Asana verknüpfen
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleSync} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Synchronisiere...' : 'Mapping aktualisieren'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Erklärung */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            <strong>So funktioniert das Matching:</strong> Mitarbeiter werden anhand des E-Mail-Prefixes
            (vor dem @) abgeglichen. Beispiel: <code>max.muster@firma.de</code> in Asana wird
            automatisch <code>max.muster@andere-domain.com</code> in planned. zugeordnet.
          </p>
        </div>

        {/* Statistik */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.matched}</div>
              <div className="text-xs text-green-600">Verknüpft</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.unmatchedPlanned}</div>
              <div className="text-xs text-amber-600">planned. ohne Match</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.unmatchedAsana}</div>
              <div className="text-xs text-gray-600">Asana ohne Match</div>
            </div>
          </div>
        )}

        {/* Mapping-Liste */}
        {mappings && mappings.length > 0 && (
          <div className="divide-y rounded-lg border">
            {mappings.map((mapping) => (
              <div
                key={mapping.plannedUserId}
                className="flex items-center justify-between p-3 text-sm"
              >
                {/* Planned User */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{mapping.plannedUserName}</div>
                  <div className="truncate text-xs text-gray-500">{mapping.plannedUserEmail}</div>
                </div>

                {/* Pfeil */}
                <div className="flex-shrink-0 px-3 text-gray-400">→</div>

                {/* Asana User */}
                <div className="min-w-0 flex-1">
                  {mapping.asanaUserName ? (
                    <>
                      <div className="truncate font-medium">{mapping.asanaUserName}</div>
                      {mapping.asanaUserEmail && (
                        <div className="truncate text-xs text-gray-500">{mapping.asanaUserEmail}</div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Kein Match gefunden</span>
                  )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0 pl-3">
                  {mapping.asanaUserGid ? (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verknüpft
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
            Klicken Sie auf &quot;Mapping aktualisieren&quot; um die Mitarbeiter abzugleichen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
