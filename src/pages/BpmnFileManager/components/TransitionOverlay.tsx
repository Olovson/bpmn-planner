import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TransitionOverlayProps {
  show: boolean;
  message: string;
  description: string;
  currentStep: { step: string; detail?: string } | null;
  graphTotals: { files: number; nodes: number };
  docgenProgress: { completed: number; total: number };
  docUploadProgress: { planned: number; completed: number };
  activeOperation: 'llm' | 'hierarchy' | null;
  cancelGeneration: boolean;
  onCancel: () => void;
}

export function TransitionOverlay({
  show,
  message,
  description,
  currentStep,
  graphTotals,
  docgenProgress,
  docUploadProgress,
  activeOperation,
  cancelGeneration,
  onCancel,
}: TransitionOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border shadow-lg rounded-lg p-8 flex flex-col items-center gap-4 text-center max-w-sm">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <p className="font-semibold text-lg">{message || 'Arbetar...'}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {description || 'Vi synkar struktur och artefakter.'}
          </p>
        </div>
        {currentStep && (
          <div className="w-full text-left text-sm bg-muted/30 rounded-md p-3">
            <p className="font-medium text-foreground">Pågående steg</p>
            <p className="text-muted-foreground">{currentStep.step}</p>
            {currentStep.detail && (
              <p className="text-xs text-muted-foreground/80 mt-1">{currentStep.detail}</p>
            )}
          </div>
        )}
        {(graphTotals.nodes > 0 || docUploadProgress.planned > 0) && (
          <div className="w-full text-xs bg-muted/30 rounded-md p-3 space-y-3">
            {graphTotals.nodes > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dokumentation</span>
                  <span className="font-medium">
                    {docgenProgress.completed} av {docgenProgress.total || graphTotals.nodes} noder
                    {(docgenProgress.total || graphTotals.nodes) > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({Math.round((docgenProgress.completed / Math.max(docgenProgress.total || graphTotals.nodes, 1)) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
                {(docgenProgress.total || graphTotals.nodes) > 0 && (
                  <Progress
                    value={(docgenProgress.completed / Math.max(docgenProgress.total || graphTotals.nodes, 1)) * 100}
                    className="h-2"
                  />
                )}
              </div>
            )}
            {docUploadProgress.planned > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dokumentation (HTML-filer)</span>
                  <span className="font-medium">
                    {docUploadProgress.completed}/{docUploadProgress.planned}
                    {docUploadProgress.planned > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({Math.round((docUploadProgress.completed / docUploadProgress.planned) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
                <Progress
                  value={(docUploadProgress.completed / docUploadProgress.planned) * 100}
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}
        {(activeOperation === 'llm' || activeOperation === 'local') && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onCancel}
            disabled={cancelGeneration}
          >
            {cancelGeneration ? 'Avbryter...' : 'Avbryt körning'}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Du kan luta dig tillbaka under tiden.
        </p>
      </div>
    </div>
  );
}

