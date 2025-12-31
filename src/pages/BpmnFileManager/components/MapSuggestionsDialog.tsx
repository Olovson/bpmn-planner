import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MapSuggestion } from '@/lib/bpmn/bpmnMapSuggestions';

interface MapSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapSuggestions: MapSuggestion[];
  acceptedSuggestions: Set<string>;
  onAcceptedSuggestionsChange: (suggestions: Set<string>) => void;
  onExport: () => void;
  onSave: (syncToGitHub: boolean) => void;
  totalFiles?: number; // Antal filer som användes för matchning
  hasEnoughFilesForReliableMatching?: boolean; // Om det finns tillräckligt med filer
}

export function MapSuggestionsDialog({
  open,
  onOpenChange,
  mapSuggestions,
  acceptedSuggestions,
  onAcceptedSuggestionsChange,
  onExport,
  onSave,
  totalFiles,
  hasEnoughFilesForReliableMatching = true,
}: MapSuggestionsDialogProps) {
  const showWarning = totalFiles !== undefined && !hasEnoughFilesForReliableMatching;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Föreslagna uppdateringar till bpmn-map.json</DialogTitle>
          <DialogDescription>
            Nya filer har analyserats och matchningar har gjorts automatiskt. Välj vilka uppdateringar du vill inkludera.
          </DialogDescription>
        </DialogHeader>
        {showWarning && (
          <Alert className="mt-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertTitle>Opålitliga matchningar</AlertTitle>
            <AlertDescription>
              Det finns bara {totalFiles} filer i systemet, vilket gör att matchningarna kan vara opålitliga. 
              Matchningar med konfidens under 30% har döljts. Överväg att ladda upp fler filer för mer pålitliga matchningar.
            </AlertDescription>
          </Alert>
        )}
        {mapSuggestions.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {mapSuggestions.length} föreslagna matchningar
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allKeys = new Set(mapSuggestions.map(s => `${s.bpmn_file}::${s.bpmn_id}`));
                    onAcceptedSuggestionsChange(allKeys);
                  }}
                >
                  Välj alla
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcceptedSuggestionsChange(new Set())}
                >
                  Avmarkera alla
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mapSuggestions.map((suggestion, idx) => {
                const key = `${suggestion.bpmn_file}::${suggestion.bpmn_id}`;
                const isAccepted = acceptedSuggestions.has(key);
                const confidenceColor = 
                  suggestion.matchStatus === 'matched' ? 'text-green-600' :
                  suggestion.matchStatus === 'ambiguous' ? 'text-yellow-600' :
                  'text-orange-600';
                
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 ${isAccepted ? 'bg-muted' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={(e) => {
                          const newSet = new Set(acceptedSuggestions);
                          if (e.target.checked) {
                            newSet.add(key);
                          } else {
                            newSet.delete(key);
                          }
                          onAcceptedSuggestionsChange(newSet);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1 rounded">{suggestion.bpmn_file}</code>
                          <span className="text-sm font-medium">{suggestion.name}</span>
                          <Badge variant="outline" className={confidenceColor}>
                            {suggestion.matchStatus === 'matched' ? 'Hög konfidens' :
                             suggestion.matchStatus === 'ambiguous' ? 'Tvetydig' :
                             'Låg konfidens'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          → <code>{suggestion.suggested_subprocess_bpmn_file}</code>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.reason} (konfidens: {(suggestion.confidence * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Avbryt
              </Button>
              <Button
                variant="outline"
                onClick={onExport}
                disabled={acceptedSuggestions.size === 0}
              >
                Exportera som fil
              </Button>
              <Button
                onClick={() => onSave(false)}
                disabled={acceptedSuggestions.size === 0}
              >
                Spara i storage ({acceptedSuggestions.size} valda)
              </Button>
              <Button
                onClick={() => onSave(true)}
                disabled={acceptedSuggestions.size === 0}
              >
                Spara + synka till GitHub ({acceptedSuggestions.size} valda)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

