import { FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HierarchyBuildResult } from '../types';

interface HierarchyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hierarchyResult: HierarchyBuildResult | null;
}

export function HierarchyReportDialog({
  open,
  onOpenChange,
  hierarchyResult,
}: HierarchyReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Hierarkisammanställning - {hierarchyResult?.fileName}
          </DialogTitle>
          <DialogDescription>
            Uppdatera strukturdata separat och verifiera i processträdet innan du genererar dokumentation och tester.
          </DialogDescription>
        </DialogHeader>

        {hierarchyResult ? (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-card">
                <p className="text-xs text-muted-foreground uppercase">BPMN-filer</p>
                <p className="text-2xl font-bold">{hierarchyResult.totalFiles}</p>
                <p className="text-xs text-muted-foreground mt-1">Analyserade filer</p>
              </div>
              <div className="border rounded-lg p-4 bg-card">
                <p className="text-xs text-muted-foreground uppercase">Noder</p>
                <p className="text-2xl font-bold">{hierarchyResult.totalNodes}</p>
                <p className="text-xs text-muted-foreground mt-1">Totalt i hierarkin</p>
              </div>
              <div className="border rounded-lg p-4 bg-card">
                <p className="text-xs text-muted-foreground uppercase">Djup</p>
                <p className="text-2xl font-bold">{hierarchyResult.hierarchyDepth}</p>
                <p className="text-xs text-muted-foreground mt-1">Maximala nivåer</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Filer i hierarkin ({hierarchyResult.filesAnalyzed.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {hierarchyResult.filesAnalyzed.map(fileName => (
                  <Badge key={fileName} variant="secondary">
                    {fileName}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Saknade subprocess-filer
              </h4>
              {hierarchyResult.missingDependencies.length > 0 ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {hierarchyResult.missingDependencies.map((dep, idx) => (
                    <li key={`${dep.parent}-${dep.childProcess}-${idx}`}>
                      • {dep.parent} refererar till "{dep.childProcess}" utan uppladdad fil
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Inga saknade subprocess-referenser hittades.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Öppna nod-matrisen eller registreringsstatusen i nya flikar för att dubbelkolla strukturen visuellt.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open('#/node-matrix', '_blank')}>
                  Visa nod-matris
                </Button>
                <Button variant="outline" onClick={() => window.open('#/registry-status', '_blank')}>
                  Statusvy
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ingen hierarkidata att visa.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

