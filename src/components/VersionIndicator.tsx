/**
 * Global Version Indicator Component
 * Shows which version is currently selected across the app
 */

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Hash, Clock } from 'lucide-react';
import { useVersionSelection } from '@/hooks/useVersionSelection';
import { getVersionByHash, getCurrentVersion } from '@/lib/bpmnVersioning';
import { formatDistanceToNow } from 'date-fns';

export function VersionIndicator() {
  const { selection } = useVersionSelection();

  // Only show if a specific version is selected
  if (!selection.selectedFileName || !selection.selectedVersionHash) {
    return null;
  }

  const { data: selectedVersion } = useQuery({
    queryKey: ['bpmn-version', selection.selectedFileName, selection.selectedVersionHash],
    queryFn: async () => {
      return await getVersionByHash(selection.selectedFileName!, selection.selectedVersionHash!);
    },
    enabled: !!selection.selectedFileName && !!selection.selectedVersionHash,
  });

  const { data: currentVersion } = useQuery({
    queryKey: ['bpmn-current-version', selection.selectedFileName],
    queryFn: async () => {
      return await getCurrentVersion(selection.selectedFileName!);
    },
    enabled: !!selection.selectedFileName,
  });

  const isCurrentVersion = selectedVersion?.content_hash === currentVersion?.content_hash;
  const fileName = selection.selectedFileName.replace('.bpmn', '');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant={isCurrentVersion ? 'secondary' : 'outline'}
          className={`cursor-pointer ${!isCurrentVersion ? 'border-amber-500 text-amber-700' : ''}`}
        >
          {!isCurrentVersion && <AlertCircle className="h-3 w-3 mr-1" />}
          {fileName} v{selectedVersion?.version_number || '?'}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Aktiv version</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Fil:</span>
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">{selectedVersion?.version_number || '?'}</span>
                {isCurrentVersion && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Nuvarande
                  </Badge>
                )}
              </div>
              {selectedVersion && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(selectedVersion.uploaded_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
              {selectedVersion?.change_summary && (
                <div className="mt-2 pt-2 border-t">
                  <span className="text-muted-foreground text-xs">Ändring:</span>
                  <p className="text-sm mt-1">{selectedVersion.change_summary}</p>
                </div>
              )}
            </div>
          </div>
          {!isCurrentVersion && (
            <div className="pt-2 border-t">
              <p className="text-xs text-amber-700">
                ⚠️ Du arbetar med en äldre version. Vissa funktioner kan visa data från nuvarande version.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

