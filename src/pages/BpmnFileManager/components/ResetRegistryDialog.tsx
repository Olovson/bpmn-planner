import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResetRegistryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isResetting: boolean;
  onConfirm: () => void;
}

export function ResetRegistryDialog({
  open,
  onOpenChange,
  isResetting,
  onConfirm,
}: ResetRegistryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reset registret?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Detta rensar genererade artefakter och jobbhistorik (BPMN/DMN-källfiler behålls) och loggar ut dig.
          </AlertDialogDescription>
          <div className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Genererad dokumentation, tester, DoR/DoD, node references, llm-debug, testresultat</li>
              <li>Jobbkön och jobbhistorik (generation_jobs, llm_generation_logs m.fl.)</li>
              <li>Element-mappningar, Jira-metadata och beroenden</li>
              <li>Cache/session rensas – du loggas ut efter reset</li>
            </ul>
            <p className="mt-4">
              BPMN- och DMN-källfiler sparas. Använd "Radera alla filer" om källfiler också ska tas bort.
            </p>
            <p className="mt-4">
              <strong className="text-destructive">Denna åtgärd stoppar alla jobb och kan inte ångras!</strong>
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isResetting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Återställer...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset registret
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

