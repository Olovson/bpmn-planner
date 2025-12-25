import { Trash2, Loader2 } from 'lucide-react';
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

interface DeleteAllFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filesCount: number;
  deletingAll: boolean;
  deleteProgress: { current: number; total: number };
  onConfirm: () => void;
}

export function DeleteAllFilesDialog({
  open,
  onOpenChange,
  filesCount,
  deletingAll,
  deleteProgress,
  onConfirm,
}: DeleteAllFilesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Radera alla filer?</AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill radera <strong>alla {filesCount} filer</strong>?
          </AlertDialogDescription>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Detta kommer att:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Ta bort alla filer från databasen</li>
              <li>Ta bort alla filer från Supabase Storage</li>
              <li>Ta bort alla filer från GitHub</li>
            </ul>
            <p className="mt-4">
              <strong className="text-destructive">Denna åtgärd kan inte ångras!</strong>
            </p>
          </div>
        </AlertDialogHeader>
        {deletingAll && (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">
                Raderar filer... ({deleteProgress.current} av {deleteProgress.total})
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-destructive h-2 rounded-full transition-all duration-300"
                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingAll}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deletingAll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Raderar...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Radera alla
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

