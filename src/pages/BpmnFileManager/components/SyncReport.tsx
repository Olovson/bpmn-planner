import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SyncResult } from '@/hooks/useSyncFromGithub';

interface SyncReportProps {
  syncResult: SyncResult;
  showSyncReport: boolean;
  onToggle: (open: boolean) => void;
}

export function SyncReport({ syncResult, showSyncReport, onToggle }: SyncReportProps) {
  if (!showSyncReport) return null;

  return (
    <Card className="p-6 mb-8">
      <Collapsible open={showSyncReport} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <h3 className="text-lg font-semibold">Synk-rapport från GitHub</h3>
            <Button variant="ghost" size="sm">
              {showSyncReport ? 'Dölj' : 'Visa'}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          {syncResult.added.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Tillagda filer ({syncResult.added.length})
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {syncResult.added.map((f) => (
                  <li key={f.file_name}>• {f.file_name}</li>
                ))}
              </ul>
            </div>
          )}

          {syncResult.updated.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Uppdaterade filer ({syncResult.updated.length})
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {syncResult.updated.map((f) => (
                  <li key={f.file_name}>• {f.file_name}</li>
                ))}
              </ul>
            </div>
          )}

          {syncResult.unchanged.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                Oförändrade filer ({syncResult.unchanged.length})
              </h4>
              <p className="text-sm text-muted-foreground">
                {syncResult.unchanged.length} filer är redan uppdaterade
              </p>
            </div>
          )}

          {syncResult.orphanedInDb.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Endast i databasen ({syncResult.orphanedInDb.length})
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Dessa filer finns i databasen men inte längre i GitHub:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {syncResult.orphanedInDb.map((f) => (
                  <li key={f.file_name}>• {f.file_name}</li>
                ))}
              </ul>
            </div>
          )}

          {syncResult.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Fel ({syncResult.errors.length})
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {syncResult.errors.map((e) => (
                  <li key={e.file_name}>
                    • {e.file_name}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

