import { XCircle } from 'lucide-react';
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
import type { BpmnFile } from '@/hooks/useBpmnFiles';

interface DeleteFileDialogProps {
  deleteFile: BpmnFile | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteFileDialog({ deleteFile, onOpenChange, onConfirm }: DeleteFileDialogProps) {
  return (
    <AlertDialog open={!!deleteFile} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort fil?</AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill ta bort <strong>{deleteFile?.file_name}</strong>?
          </AlertDialogDescription>
          {deleteFile?.usage && deleteFile.usage.testsCount > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-md">
              <p className="font-medium text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Varning: Denna fil används av:
              </p>
              <ul className="mt-2 text-sm space-y-1">
                {deleteFile.usage.testsCount > 0 && (
                  <li>• {deleteFile.usage.testsCount} tester</li>
                )}
              </ul>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

