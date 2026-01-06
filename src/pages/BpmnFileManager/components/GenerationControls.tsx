import { FileCode, Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertCircle, GitBranch, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { LlmGenerationMode } from '@/lib/llmMode';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

export interface LlmHealth {
  local: {
    available: boolean;
    error?: string;
    latencyMs?: number;
  };
}

export interface GenerationControlsProps {
  generationMode: LlmGenerationMode;
  llmProvider: LlmProvider;
  onModeChange: (mode: LlmGenerationMode, provider: LlmProvider) => void;
  generatingFile: string | null;
  isLoading: boolean;
  selectedFile: BpmnFile | null;
  files: BpmnFile[];
  rootFileName: string | null;
  onGenerateSelected: () => void;
  onGenerateAll: () => void;
  onGenerateTestsSelected: () => void;
  onGenerateTestsAll: () => void;
  llmHealth?: LlmHealth | null;
  llmHealthLoading: boolean;
  showAdvancedTools: boolean;
  onToggleAdvancedTools: (open: boolean) => void;
  onValidateBpmnMap: () => void;
  onOpenMappingDialog: () => void;
  onReset: () => void;
  onDeleteAll: () => void;
  validatingMap: boolean;
  isResetting: boolean;
  currentGenerationLabel: string;
}

export function GenerationControls({
  generationMode,
  llmProvider,
  onModeChange,
  generatingFile,
  isLoading,
  selectedFile,
  files,
  rootFileName,
  onGenerateSelected,
  onGenerateAll,
  onGenerateTestsSelected,
  onGenerateTestsAll,
  llmHealth,
  llmHealthLoading,
  showAdvancedTools,
  onToggleAdvancedTools,
  onValidateBpmnMap,
  onOpenMappingDialog,
  onReset,
  onDeleteAll,
  validatingMap,
  isResetting,
  currentGenerationLabel,
}: GenerationControlsProps) {
  return (
    <Card className="p-6 mb-8 border-dashed border-muted-foreground/40 bg-muted/10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Genereringsläge</h2>
          <Badge variant="outline">
            {currentGenerationLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Primary actions will be moved below */}
        </div>
        
        {/* Advanced Tools - Collapsible */}
        <Collapsible open={showAdvancedTools} onOpenChange={onToggleAdvancedTools}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-2 text-muted-foreground hover:text-foreground"
            >
              {showAdvancedTools ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Dölj avancerade verktyg
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Visa avancerade verktyg
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                disabled={validatingMap}
                onClick={onValidateBpmnMap}
                className="gap-2"
                title="Validera bpmn-map.json mot aktuella BPMN-filer"
              >
                {validatingMap ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Validerar BPMN-karta…
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Validera BPMN-karta
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenMappingDialog}
                className="gap-2"
                title="Granska och justera hur call activities är kopplade till subprocess‑filer"
              >
                <Sparkles className="w-3 h-3" />
                Hantera BPMN‑mappning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.hash = '/registry-status')}
                className="gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Registry Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.hash = '/graph-debug')}
                className="gap-2"
                title="Debug ProcessGraph (nodes, edges, cycles, missing dependencies)"
              >
                <GitBranch className="w-4 h-4" />
                Graph Debug
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.hash = '/tree-debug')}
                className="gap-2"
                title="Debug ProcessTree (hierarchy, orderIndex, diagnostics)"
              >
                <GitBranch className="w-4 h-4" />
                Tree Debug
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onReset}
                disabled={isResetting}
                className="gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Återställer...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reset registret
                  </>
                )}
              </Button>
              {files.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteAll}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Radera alla filer
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            variant={generationMode === 'slow' && llmProvider === 'cloud' ? 'default' : 'outline'}
            className={`gap-2 ${
              generationMode === 'slow' && llmProvider === 'cloud'
                ? 'ring-2 ring-primary shadow-sm'
                : 'opacity-80'
            }`}
            onClick={() => onModeChange('slow', 'cloud')}
            aria-pressed={generationMode === 'slow' && llmProvider === 'cloud'}
          >
            <Sparkles className="w-4 h-4" />
            Claude (moln-LLM)
          </Button>
          <Button
            size="sm"
            variant={generationMode === 'slow' && llmProvider === 'ollama' ? 'default' : 'outline'}
            className={`gap-2 ${
              generationMode === 'slow' && llmProvider === 'ollama'
                ? 'ring-2 ring-primary shadow-sm'
                : 'opacity-80'
            }`}
            onClick={() => onModeChange('slow', 'ollama')}
            aria-pressed={generationMode === 'slow' && llmProvider === 'ollama'}
            title={
              !llmHealth?.local.available
                ? `Kan inte nå lokal LLM-motor – kontrollera att Ollama körs. ${llmHealth?.local.error ? `Fel: ${llmHealth.local.error}` : ''}`
                : undefined
            }
          >
            <FileCode className="w-4 h-4" />
            Ollama (lokal LLM)
            {llmHealthLoading ? (
              <Loader2 className="w-3 h-3 animate-spin ml-1" />
            ) : llmHealth?.local.available ? (
              <Badge variant="outline" className="ml-1 text-xs bg-green-50 text-green-700 border-green-200">
                Tillgänglig
                {llmHealth.local.latencyMs && ` (${llmHealth.local.latencyMs}ms)`}
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1 text-xs bg-red-50 text-red-700 border-red-200">
                Ej tillgänglig
              </Badge>
            )}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            size="sm"
            variant={
              generatingFile !== null ||
              isLoading ||
              !selectedFile ||
              (selectedFile.file_type !== 'bpmn' &&
                !selectedFile.file_name.toLowerCase().endsWith('.bpmn'))
                ? 'outline'
                : 'default'
            }
            disabled={
              generatingFile !== null ||
              isLoading ||
              !selectedFile ||
              (selectedFile.file_type !== 'bpmn' &&
                !selectedFile.file_name.toLowerCase().endsWith('.bpmn'))
            }
            onClick={() => {
              console.log('[GenerationControls] Button clicked, selectedFile:', selectedFile);
              onGenerateSelected();
            }}
            className="gap-2"
            title={!selectedFile ? 'Välj en BPMN-fil i listan för att generera dokumentation' : 'Generera dokumentation och DoR/DoD för vald fil. Testgenerering sker i separat steg.'}
          >
            {generatingFile && selectedFile ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Genererar information…
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Generera information för vald fil
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={generatingFile !== null || isLoading || files.length === 0 || !rootFileName}
            onClick={onGenerateAll}
            className="gap-2"
            title="Generera dokumentation och DoR/DoD för alla BPMN-filer. Hierarkin byggs automatiskt först. Testgenerering sker i separat steg."
          >
            <Sparkles className="w-4 h-4" />
            Generera information (alla filer)
          </Button>
        </div>
        
        {/* Test Generation Buttons */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            disabled={
              generatingFile !== null ||
              isLoading ||
              !selectedFile ||
              (selectedFile.file_type !== 'bpmn' &&
                !selectedFile.file_name.toLowerCase().endsWith('.bpmn'))
            }
            onClick={onGenerateTestsSelected}
            className="gap-2"
            title={!selectedFile ? 'Välj en BPMN-fil i listan för att generera tester' : 'Genererar Feature Goal‑testscenarier för vald fil. E2E‑scenarier genereras endast om vald fil är root enligt bpmn‑map.json. Kräver att dokumentation redan är genererad.'}
          >
            {generatingFile && selectedFile ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Genererar tester…
              </>
            ) : (
              <>
                <FileCode className="w-3 h-3" />
                Generera testinformation för vald fil
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={generatingFile !== null || isLoading || files.length === 0}
            onClick={onGenerateTestsAll}
            className="gap-2"
            title="Generera Feature Goal‑testscenarier för alla uppladdade BPMN‑filer. E2E‑scenarier genereras endast för root‑filen enligt bpmn‑map.json. Kräver att dokumentation redan är genererad."
          >
            <FileCode className="w-4 h-4" />
            Generera testinformation (alla filer)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          E2E‑scenarier skapas endast för root‑filen enligt bpmn‑map.json. Feature Goal‑scenarier genereras för de filer du kör testgenerering på.
        </p>
      </div>
    </Card>
  );
}
