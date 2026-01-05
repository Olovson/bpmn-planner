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
import { useMemo, useState } from 'react';

interface MapSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapSuggestions: MapSuggestion[];
  onSuggestionsChange?: (suggestions: MapSuggestion[]) => void;
  acceptedSuggestions: Set<string>;
  onAcceptedSuggestionsChange: (suggestions: Set<string>) => void;
  onSave: (syncToGitHub: boolean) => void;
  totalFiles?: number; // Antal filer som användes för matchning
  hasEnoughFilesForReliableMatching?: boolean; // Om det finns tillräckligt med filer
  canUseLlm?: boolean;
}

export function MapSuggestionsDialog({
  open,
  onOpenChange,
  mapSuggestions,
  onSuggestionsChange,
  acceptedSuggestions,
  onAcceptedSuggestionsChange,
  onSave,
  totalFiles,
  hasEnoughFilesForReliableMatching = true,
  canUseLlm = false,
}: MapSuggestionsDialogProps) {
  const showWarning = totalFiles !== undefined && !hasEnoughFilesForReliableMatching;
  const [isRefiningWithLlm, setIsRefiningWithLlm] = useState(false);
  const [refineSummary, setRefineSummary] = useState<string | null>(null);

  const suggestions = mapSuggestions;

  const { totalCount, matchedCount, ambiguousCount } = useMemo(() => {
    const total = suggestions.length;
    const matched = suggestions.filter(s => s.matchStatus === 'matched').length;
    return {
      totalCount: total,
      matchedCount: matched,
      ambiguousCount: total - matched,
    };
  }, [suggestions]);

  const handleRefineWithClaude = async () => {
    if (!canUseLlm || ambiguousCount === 0 || isRefiningWithLlm) return;

    try {
      setIsRefiningWithLlm(true);
      setRefineSummary(null);

      const [{ loadBpmnMapFromStorageSimple }, { refineBpmnMapWithLlm }] = await Promise.all([
        import('@/lib/bpmn/bpmnMapStorage'),
        import('@/lib/bpmn/bpmnMapLlmRefinement'),
      ]);

      const currentMap = await loadBpmnMapFromStorageSimple();

      // Skapa en kopia av map:en och applicera nuvarande förslag som heuristiklager
      const mapCopy = JSON.parse(JSON.stringify(currentMap)) as typeof currentMap;

      for (const s of suggestions) {
        let proc = mapCopy.processes.find(p => p.bpmn_file === s.bpmn_file);
        if (!proc) {
          // Minimal processdefinition om den inte finns
          proc = {
            id: s.bpmn_file.replace('.bpmn', ''),
            bpmn_file: s.bpmn_file,
            process_id: s.bpmn_file.replace('.bpmn', ''),
            alias: s.bpmn_file,
            description: s.bpmn_file,
            call_activities: [],
          } as any;
          mapCopy.processes.push(proc);
        }

        if (!proc.call_activities) {
          proc.call_activities = [];
        }

        let ca = proc.call_activities.find((ca: any) => ca.bpmn_id === s.bpmn_id);
        if (!ca) {
          ca = {
            bpmn_id: s.bpmn_id,
            name: s.name,
          };
          proc.call_activities.push(ca);
        }

        ca.name = s.name;
        ca.called_element = s.called_element ?? ca.called_element ?? null;
        ca.subprocess_bpmn_file = s.suggested_subprocess_bpmn_file;
        ca.match_status = s.matchStatus;
        ca.source = ca.source ?? 'heuristic';
      }

      const refinedMap = await refineBpmnMapWithLlm(mapCopy);

      let upgraded = 0;
      const updatedSuggestions: MapSuggestion[] = suggestions.map(s => {
        const proc = refinedMap.processes.find(p => p.bpmn_file === s.bpmn_file);
        const ca = proc?.call_activities?.find((ca: any) => ca.bpmn_id === s.bpmn_id) as any;
        if (!ca) return s;

        const newStatus = (ca.match_status as MapSuggestion['matchStatus']) ?? s.matchStatus;
        const newFile = (ca.subprocess_bpmn_file as string | undefined) ?? s.suggested_subprocess_bpmn_file;

        const updated: MapSuggestion = {
          ...s,
          suggested_subprocess_bpmn_file: newFile,
          matchStatus: newStatus,
          reason:
            newFile !== s.suggested_subprocess_bpmn_file
              ? `${s.reason}; Claude föreslog ny subprocess`
              : s.reason,
        };

        if (s.matchStatus !== 'matched' && newStatus === 'matched') {
          upgraded += 1;
        }

        return updated;
      });

      onSuggestionsChange?.(updatedSuggestions);
      setRefineSummary(
        upgraded > 0
          ? `Claude uppgraderade ${upgraded} förslag till hög konfidens.`
          : 'Claude hittade inga tydligare matchningar – granska manuellt.',
      );
    } catch (e) {
      console.warn('[MapSuggestionsDialog] Claude refinement failed:', e);
      setRefineSummary('Kunde inte köra Claude‑förbättring (se konsolloggar).');
    } finally {
      setIsRefiningWithLlm(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Föreslagna uppdateringar till bpmn-map.json</DialogTitle>
          <DialogDescription>
            Nya filer har analyserats och matchningar har gjorts automatiskt. Välj vilka uppdateringar du vill inkludera.
            Varje rad visar: <strong>Fil</strong> → <strong>Call Activity</strong> → <strong>föreslagen subprocess‑fil</strong>.
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
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {suggestions.length} föreslagna matchningar
                </p>
                <p className="text-xs text-muted-foreground">
                  Call activities totalt: {totalCount} · Klara: {matchedCount} · Otydliga: {ambiguousCount}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allKeys = new Set(suggestions.map(s => `${s.bpmn_file}::${s.bpmn_id}`));
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

            <div className="mt-2 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Steg 1: Granska de automatiska förslagen. Steg 2 (valfritt): låt Claude försöka förbättra de otydliga.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canUseLlm || ambiguousCount === 0 || isRefiningWithLlm}
                  onClick={handleRefineWithClaude}
                  title={
                    !canUseLlm
                      ? 'Claude är inte aktiverad i denna miljö (VITE_USE_LLM=false)'
                      : ambiguousCount === 0
                      ? 'Det finns inga otydliga förslag att förbättra'
                      : 'Be Claude analysera de otydliga förslagen'
                  }
                >
                  {isRefiningWithLlm
                    ? 'Förbättrar med Claude...'
                    : `Förbättra otydliga med Claude (${ambiguousCount})`}
                </Button>
              </div>
              {refineSummary && (
                <p className="text-xs text-muted-foreground">{refineSummary}</p>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, idx) => {
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Fil:</span>
                          <code className="text-xs bg-muted px-1 rounded">{suggestion.bpmn_file}</code>
                          <Badge variant="outline" className={confidenceColor}>
                            {suggestion.matchStatus === 'matched' ? 'Hög konfidens' :
                             suggestion.matchStatus === 'ambiguous' ? 'Tvetydig' :
                             'Låg konfidens'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Call Activity:</span>{' '}
                          {suggestion.name}
                          {suggestion.called_element && (
                            <> <span className="opacity-70">(calledElement: {suggestion.called_element})</span></>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Föreslagen subprocess:</span>{' '}
                          <code>{suggestion.suggested_subprocess_bpmn_file}</code>
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
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                1) Markera raderna du vill acceptera. 2) Klicka &quot;Spara i appen&quot; för att uppdatera bpmn-map.json.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={() => onSave(false)}
                  disabled={acceptedSuggestions.size === 0}
                  title="Uppdatera bpmn-map.json i Supabase (appen) med de valda ändringarna"
                >
                  Spara i appen ({acceptedSuggestions.size} valda)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
