/**
 * FileUploadArea component
 * Handles drag & drop and file selection UI
 */

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface FileUploadAreaProps {
  dragActive: boolean;
  pendingFiles: File[];
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFiles: (fileList: FileList) => Promise<void>;
  onUploadPending: () => void;
  onCancelPending: () => void;
  onSyncFromGithub?: () => void;
  syncPending?: boolean;
}

export function FileUploadArea({
  dragActive,
  pendingFiles,
  onDrag,
  onDrop,
  onFiles,
  onUploadPending,
  onCancelPending,
  onSyncFromGithub,
  syncPending = false,
}: FileUploadAreaProps) {
  return (
    <Card className="p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Ladda upp filer</h2>
          <p className="text-sm text-muted-foreground">
            Dra och släpp eller välj filer att ladda upp
          </p>
        </div>
        {onSyncFromGithub && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncFromGithub}
            disabled={syncPending}
            className="gap-2"
          >
            {syncPending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>📥</span>
            )}
            {syncPending ? 'Synkar...' : 'Synka från GitHub'}
          </Button>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          Släpp .bpmn eller .dmn filer här
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          eller klicka för att välja filer eller en mapp
        </p>
        <div className="flex gap-2 justify-center">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".bpmn,.dmn"
            multiple
            onChange={(e) => e.target.files && onFiles(e.target.files)}
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Välj filer
            </label>
          </Button>
          <input
            type="file"
            id="folder-upload"
            className="hidden"
            // @ts-ignore - webkitdirectory is a valid HTML attribute
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => e.target.files && onFiles(e.target.files)}
          />
          <Button variant="outline" asChild>
            <label htmlFor="folder-upload" className="cursor-pointer">
              Välj mapp (rekursivt)
            </label>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Mappval hittar automatiskt alla .bpmn och .dmn filer rekursivt i vald mapp
        </p>
        {pendingFiles.length > 0 && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Bekräfta uppladdning</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                Hittade <strong>{pendingFiles.length} filer</strong> i vald mapp.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onUploadPending}
                >
                  Ladda upp alla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelPending}
                >
                  Avbryt
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}







