import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, User, RotateCcw, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { useVersionControl, Version } from '@/hooks/useVersionControl';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
}: VersionHistoryDialogProps) {
  const { versions, isLoading, fetchVersions, createVersion, restoreVersion } =
    useVersionControl();
  const [description, setDescription] = useState('');
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open]);

  const handleCreateVersion = async () => {
    if (!description.trim()) return;
    await createVersion(description);
    setDescription('');
  };

  const handleRestore = async () => {
    if (!restoreVersionId) return;
    await restoreVersion(restoreVersionId);
    setRestoreVersionId(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of your BPMN mappings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create Version */}
            <div className="flex gap-2">
              <Input
                placeholder="Description for new version..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateVersion();
                }}
              />
              <Button
                onClick={handleCreateVersion}
                disabled={!description.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>

            {/* Version List */}
            <ScrollArea className="h-[400px] rounded-md border">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading versions...
                </div>
              ) : versions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No versions yet. Create your first version above.
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {versions.map((version) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      onRestore={() => setRestoreVersionId(version.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreVersionId}
        onOpenChange={(open) => !open && setRestoreVersionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a backup of your current state and then restore
              all BPMN mappings to the selected version. The page will reload
              after restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VersionCard({
  version,
  onRestore,
}: {
  version: Version;
  onRestore: () => void;
}) {
  const snapshotData = version.snapshot_data as { mappings?: any[]; timestamp?: string };
  const mappingCount = snapshotData?.mappings?.length || 0;

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(version.created_at), 'PPpp')}
            </span>
          </div>

          <p className="text-sm">{version.description}</p>

          <Badge variant="secondary" className="text-xs">
            {mappingCount} mapping{mappingCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        <Button variant="outline" size="sm" onClick={onRestore}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restore
        </Button>
      </div>
    </div>
  );
}
