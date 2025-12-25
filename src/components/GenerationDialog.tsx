import { useState, useEffect } from 'react';
import { Loader2, X, CheckCircle2, FileText, FileCode, GitBranch, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export interface GenerationPlan {
  files: string[];
  totalNodes: number;
  totalFiles: number;
  hierarchyDepth: number;
  llmMode?: string;
  mode: 'llm';
}

export interface GenerationProgress {
  totalProgress: number; // 0-100
  currentStep: string;
  currentStepDetail?: string;
  docs: { completed: number; total: number };
  htmlUpload: { completed: number; total: number };
  tests: { completed: number; total: number };
  dorDod?: { completed: number; total: number };
  // Time estimation
  startTime?: number; // Timestamp when generation started
  estimatedTotalTime?: number; // Estimated total time in seconds
  estimatedTimeRemaining?: number; // Estimated time remaining in seconds
}

export interface GenerationResult {
  fileName: string;
  filesAnalyzed: string[];
  // Playwright-testfiler har tagits bort - all testinformation finns nu i E2E scenarios och Feature Goal-test scenarios
  docFiles: string[];
  jiraMappings: Array<{ elementName: string; jiraType: string; jiraName: string }>;
  subprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
  skippedSubprocesses?: string[];
}

interface GenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: GenerationPlan;
  progress?: GenerationProgress;
  result?: GenerationResult;
  onStart?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  showCancel?: boolean;
}

export function GenerationDialog({
  open,
  onOpenChange,
  plan,
  progress,
  result,
  onStart,
  onCancel,
  onClose,
  showCancel = false,
}: GenerationDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Determine which view to show
  const view = result ? 'result' : progress ? 'progress' : plan ? 'plan' : 'plan';

  // Format time in seconds to human-readable string
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} sek`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes} min ${remainingSeconds} sek` : `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} tim ${remainingMinutes} min` : `${hours} tim`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {view === 'plan' && 'Generera Artefakter'}
            {view === 'progress' && 'Genererar Artefakter'}
            {view === 'result' && 'Generering Klar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan View */}
          {view === 'plan' && plan && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Följande kommer att genereras:
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">Filer</h4>
                  </div>
                  <div className="text-2xl font-bold">{plan.totalFiles}</div>
                  <p className="text-xs text-muted-foreground mt-1">BPMN-filer att analysera</p>
                  {plan.hierarchyDepth > 1 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Hierarki: {plan.hierarchyDepth} nivåer
                    </p>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold text-sm">Noder</h4>
                  </div>
                  <div className="text-2xl font-bold">{plan.totalNodes}</div>
                  <p className="text-xs text-muted-foreground mt-1">Noder att generera</p>
                </Card>
              </div>

              {plan.hierarchyDepth > 1 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold text-sm">Hierarki</h4>
                  </div>
                  <div className="text-2xl font-bold">{plan.hierarchyDepth}</div>
                  <p className="text-xs text-muted-foreground mt-1">Nivåers djup</p>
                </Card>
              )}

              {plan.llmMode && (
                <Card className="p-4 bg-muted/50">
                  <div className="text-sm">
                    <span className="font-medium">LLM-läge:</span> {plan.llmMode}
                  </div>
                </Card>
              )}

              {plan.files.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span>Visa filer som inkluderas ({plan.files.length})</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-muted/30 rounded-md p-3 max-h-48 overflow-y-auto">
                      <ul className="space-y-1 text-xs">
                        {plan.files.map((fileName, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{fileName}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Stäng
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Generering startar automatiskt när planen är klar.
              </p>
            </div>
          )}

          {/* Progress View */}
          {view === 'progress' && progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>

              {/* Total Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress.totalProgress)}%</span>
                </div>
                <Progress value={progress.totalProgress} className="h-3" />
              </div>

              {/* Current Step */}
              <Card className="p-4 bg-muted/30">
                <div className="text-sm">
                  <div className="font-medium text-foreground mb-2">Pågående steg</div>
                  <div className="text-base font-semibold text-foreground mb-1">{progress.currentStep}</div>
                  {progress.currentStepDetail && (
                    <div className="text-sm text-muted-foreground">
                      {progress.currentStepDetail}
                    </div>
                  )}
                  
                  {/* Time estimation */}
                  {(progress.estimatedTimeRemaining !== undefined || progress.estimatedTotalTime !== undefined) && (
                    <div className="mt-3 pt-3 border-t space-y-1.5">
                      {progress.estimatedTotalTime !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Förväntad total tid</span>
                          <span className="font-medium">
                            {formatTime(progress.estimatedTotalTime)}
                          </span>
                        </div>
                      )}
                      {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Återstående tid</span>
                          <span className="font-medium text-blue-600">
                            {formatTime(progress.estimatedTimeRemaining)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Visa snabb översikt om det finns progress-data */}
                  {(progress.docs.total > 0 || progress.htmlUpload.total > 0) && (
                    <div className="mt-3 pt-3 border-t space-y-1.5">
                      {progress.docs.total > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Dokumentation</span>
                          <span className="font-medium">
                            {progress.docs.completed}/{progress.docs.total} noder
                            {progress.docs.total > 0 && progress.docs.completed <= progress.docs.total && (
                              <span className="text-muted-foreground ml-1">
                                ({Math.round((progress.docs.completed / progress.docs.total) * 100)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {progress.htmlUpload.total > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Laddar upp filer</span>
                          <span className="font-medium">
                            {progress.htmlUpload.completed}/{progress.htmlUpload.total}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Detailed Progress */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                  <ChevronDown className="h-4 w-4" />
                  Detaljerad Progress
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  {progress.docs.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Dokumentation</span>
                        <span className="font-medium">
                          {progress.docs.completed} av {progress.docs.total} noder
                          {progress.docs.completed <= progress.docs.total && (
                            <span className="text-muted-foreground ml-1">
                              ({Math.round((progress.docs.completed / progress.docs.total) * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <Progress
                        value={progress.docs.total > 0 && progress.docs.completed <= progress.docs.total 
                          ? (progress.docs.completed / progress.docs.total) * 100 
                          : 0}
                        className="h-2"
                      />
                    </div>
                  )}

                  {progress.htmlUpload.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Dokumentation (HTML-filer)</span>
                        <span className="font-medium">
                          {progress.htmlUpload.completed}/{progress.htmlUpload.total}
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((progress.htmlUpload.completed / progress.htmlUpload.total) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={(progress.htmlUpload.completed / progress.htmlUpload.total) * 100}
                        className="h-2"
                      />
                    </div>
                  )}

                  {progress.tests.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Testfiler</span>
                        <span className="font-medium">
                          {progress.tests.completed}/{progress.tests.total}
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((progress.tests.completed / progress.tests.total) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={(progress.tests.completed / progress.tests.total) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {showCancel && (
                <Button variant="outline" onClick={onCancel} className="w-full" disabled={!onCancel}>
                  Avbryt Körning
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Du kan luta dig tillbaka under tiden.
              </p>
            </div>
          )}

          {/* Result View */}
          {view === 'result' && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold mb-2">Generering Klar!</div>
                <div className="text-sm text-muted-foreground">
                  Alla artefakter har genererats framgångsrikt.
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">Filer</h4>
                  </div>
                  <div className="text-2xl font-bold">{result.filesAnalyzed.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Analyserade</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold text-sm">Tester</h4>
                  </div>
                  <div className="text-2xl font-bold">{result.testFiles.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Testfiler</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold text-sm">Dokumentation</h4>
                  </div>
                  <div className="text-2xl font-bold">{result.docFiles.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">HTML-filer</p>
                </Card>
              </div>

              {/* Detailed Report */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                  <ChevronDown className="h-4 w-4" />
                  Visa Detaljerad Rapport
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Analyzed Files */}
                  {result.filesAnalyzed.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Analyserade BPMN-filer ({result.filesAnalyzed.length})
                      </h3>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {result.filesAnalyzed.map((file, i) => (
                          <li key={i}>• {file}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Skipped Subprocesses */}
                  {result.skippedSubprocesses && result.skippedSubprocesses.length > 0 && (
                    <Card className="p-4 bg-amber-50">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        Saknade subprocesser ({result.skippedSubprocesses.length})
                      </h3>
                      <p className="text-sm text-amber-800 mb-2">
                        Dessa Call Activities saknar BPMN-fil. Dokumentation och tester genererades inte för dem.
                      </p>
                      <ul className="text-sm space-y-1 text-amber-800">
                        {result.skippedSubprocesses.slice(0, 10).map((subprocess, i) => (
                          <li key={i}>• {subprocess}</li>
                        ))}
                      </ul>
                      {result.skippedSubprocesses.length > 10 && (
                        <p className="text-xs text-amber-700 mt-1">
                          ...och {result.skippedSubprocesses.length - 10} till
                        </p>
                      )}
                    </Card>
                  )}

                  {/* Playwright-testfiler har tagits bort - all testinformation finns nu i E2E scenarios och Feature Goal-test scenarios */}

                  {/* Documentation Files */}
                  {result.docFiles.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dokumentationsfiler ({result.docFiles.length})
                      </h3>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {result.docFiles.slice(0, 20).map((doc, i) => (
                          <li key={i}>• {doc}</li>
                        ))}
                        {result.docFiles.length > 20 && (
                          <li className="text-xs italic">...och {result.docFiles.length - 20} fler</li>
                        )}
                      </ul>
                    </Card>
                  )}

                  {/* Jira Mappings */}
                  {result.jiraMappings.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Jira-mappningar ({result.jiraMappings.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.jiraMappings.slice(0, 10).map((mapping, i) => (
                          <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                            <div className="font-medium">{mapping.elementName}</div>
                            <div className="text-xs text-muted-foreground">
                              Type: {mapping.jiraType} | Jira: {mapping.jiraName}
                            </div>
                          </div>
                        ))}
                        {result.jiraMappings.length > 10 && (
                          <p className="text-xs text-muted-foreground italic">
                            ...och {result.jiraMappings.length - 10} fler
                          </p>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Subprocess Mappings */}
                  {result.subprocessMappings.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Subprocess-mappningar ({result.subprocessMappings.length})
                      </h3>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {result.subprocessMappings.slice(0, 10).map((mapping, i) => (
                          <li key={i}>
                            • {mapping.callActivity} → {mapping.subprocessFile}
                          </li>
                        ))}
                        {result.subprocessMappings.length > 10 && (
                          <li className="text-xs italic">
                            ...och {result.subprocessMappings.length - 10} fler
                          </li>
                        )}
                      </ul>
                    </Card>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Button onClick={onClose || (() => onOpenChange(false))} className="w-full">
                Stäng
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
