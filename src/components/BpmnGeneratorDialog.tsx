import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wand2, FileCode, FileText, CheckSquare, Download, Database, AlertTriangle, Trash2 } from 'lucide-react';
import { useBpmnGenerator } from '@/hooks/useBpmnGenerator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBpmnParser } from '@/hooks/useBpmnParser';
import { validateBpmnWithDatabase, cleanupOrphanedCriteria, ValidationResult } from '@/lib/bpmnValidator';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDynamicBpmnFiles, getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';

type ValidationScope = 'file' | 'project';

interface BpmnGeneratorDialogProps {
  bpmnFile: string;
}

export const BpmnGeneratorDialog = ({ bpmnFile }: BpmnGeneratorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [validationScope, setValidationScope] = useState<ValidationScope>('file');
  const [overwriteDocs, setOverwriteDocs] = useState(true);
  const [overwriteTests, setOverwriteTests] = useState(false);
  const [overwriteDorDod, setOverwriteDorDod] = useState(false);
  const { toast } = useToast();
  const { data: availableBpmnFiles = [] } = useDynamicBpmnFiles();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [resolvingUrl, setResolvingUrl] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    setResolvingUrl(true);
    getBpmnFileUrl(bpmnFile)
      .then(url => {
        if (!cancelled) {
          setFileUrl(url);
        }
      })
      .catch(error => {
        console.error('Failed to resolve BPMN file URL', error);
        if (!cancelled) {
          setFileUrl(null);
          toast({
            title: 'Hittade inte BPMN-fil',
            description: `Kunde inte hitta ${bpmnFile} i lagringen.`,
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResolvingUrl(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bpmnFile, toast]);
  
  const { parseResult, loading: parseLoading } = useBpmnParser(fileUrl);
  const {
    generateAll,
    downloadTests,
    downloadDocs,
    generating,
    generationResult,
  } = useBpmnGenerator(fileUrl);

  // Run validation when dialog opens
  useEffect(() => {
    if (open && parseResult && !validating && !validation) {
      runValidation();
    }
  }, [open, parseResult]);

  const runValidation = async () => {
    if (!parseResult) return;
    
    try {
      setValidating(true);
      
      let parseResults;
      
      const filesToValidate =
        validationScope === 'file' || availableBpmnFiles.length === 0
          ? [bpmnFile]
          : Array.from(new Set(availableBpmnFiles));

      parseResults = await Promise.all(
        filesToValidate.map(async file => {
          const url = await getBpmnFileUrl(file);
          return parseBpmnFile(url);
        })
      );

      const result = await validateBpmnWithDatabase(parseResults);
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Valideringsfel',
        description: 'Kunde inte validera BPMN mot databasen',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCleanup = async () => {
    if (!validation?.orphanedCriteria.length) return;

    try {
      setCleaning(true);
      const subprocessNames = validation.orphanedCriteria.map(c => c.subprocess_name);
      await cleanupOrphanedCriteria(subprocessNames);
      
      toast({
        title: 'Rensning klar!',
        description: `${validation.orphanedCriteria.length} oanvända subprocess-kriterier togs bort`,
      });

      // Re-run validation
      setValidation(null);
      await runValidation();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: 'Rensningsfel',
        description: 'Kunde inte rensa gamla kriterier',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleGenerate = async () => {
    await generateAll({
      overwriteDocs,
      overwriteTests,
      overwriteDorDod,
    });
    // Re-run validation after generation
    setValidation(null);
    await runValidation();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="h-4 w-4 mr-2" />
          Generera
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Automatisk generering från BPMN</DialogTitle>
          <DialogDescription>
            Generera automatiskt tester, dokumentation och DoR/DoD-checklistor från {bpmnFile}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {resolvingUrl && (
            <div className="border border-dashed rounded-md p-3 text-sm text-muted-foreground bg-muted/30">
              Hämtar BPMN-filen från registret …
            </div>
          )}
          {/* Validation Scope Selector */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <Label className="text-sm font-semibold mb-3 block">Valideringsomfång</Label>
            <RadioGroup 
              value={validationScope} 
              onValueChange={(value) => {
                setValidationScope(value as ValidationScope);
                setValidation(null); // Reset validation when scope changes
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="scope-file" />
                <Label htmlFor="scope-file" className="cursor-pointer font-normal">
                  Endast denna fil
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="scope-project" />
                <Label htmlFor="scope-project" className="cursor-pointer font-normal">
                  Hela projektet
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-2">
              {validationScope === 'file' 
                ? 'Validerar endast DoR/DoD för den valda BPMN-filen' 
                : 'Validerar DoR/DoD för alla BPMN-filer i projektet (mortgage + subprocesser)'}
            </p>
          </div>

          {/* Validation Results */}
          {validating && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Validerar BPMN mot databasen...</p>
            </div>
          )}

          {validation && (
            <div className="space-y-3">
              {/* New Nodes */}
              {validation.newNodes.length > 0 && (
                <Alert>
                  <CheckSquare className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <strong>✅ {validation.newNodes.length} nya noder</strong> kommer att få DoR/DoD-kriterier
                    <div className="mt-2 text-xs text-muted-foreground">
                      {validation.newNodes.join(', ')}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Existing Nodes */}
              {validation.existingNodes.length > 0 && (
                <Alert>
                  <Database className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    <strong>🔄 {validation.existingNodes.length} befintliga noder</strong> kommer att uppdateras
                  </AlertDescription>
                </Alert>
              )}

              {/* Orphaned Criteria */}
              {validation.orphanedCriteria.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>⚠️ {validation.orphanedCriteria.length} oanvända subprocesser</strong> har kriterier i databasen men finns inte i BPMN
                        <div className="mt-2 text-xs">
                          {validation.orphanedCriteria.map(c => (
                            <div key={c.subprocess_name}>
                              • {c.subprocess_name} ({c.count} kriterier)
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button 
                        onClick={handleCleanup} 
                        disabled={cleaning}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {cleaning ? 'Rensar...' : 'Rensa'}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Generation Options */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Genereringsalternativ</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Välj vad som ska skrivas över. Tester och DoR/DoD skrivs inte över om du inte aktivt väljer det, 
                vilket skyddar manuellt gjorda ändringar. Dokumentation är normalt säkert att skriva över varje gång.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite-docs"
                  checked={overwriteDocs}
                  onCheckedChange={(checked) => setOverwriteDocs(checked as boolean)}
                />
                <Label htmlFor="overwrite-docs" className="cursor-pointer font-normal text-sm">
                  Skriv över befintlig dokumentation
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite-tests"
                  checked={overwriteTests}
                  onCheckedChange={(checked) => setOverwriteTests(checked as boolean)}
                />
                <Label htmlFor="overwrite-tests" className="cursor-pointer font-normal text-sm">
                  Skriv över befintliga testskelett
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite-dor-dod"
                  checked={overwriteDorDod}
                  onCheckedChange={(checked) => setOverwriteDorDod(checked as boolean)}
                />
                <Label htmlFor="overwrite-dor-dod" className="cursor-pointer font-normal text-sm">
                  Skriv över befintliga DoR/DoD-kriterier
                </Label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={generating || parseLoading || validating}
              size="lg"
              className="w-full max-w-md"
            >
              <Wand2 className="h-5 w-5 mr-2" />
              {generating ? 'Genererar...' : 'Generera allt'}
            </Button>
          </div>

          {/* Results */}
          {generationResult && (
            <div className="space-y-4">
              {/* Test Skeletons */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Test Skeletons</h3>
                    <Badge variant="secondary">{generationResult.tests.size}</Badge>
                  </div>
                  <Button onClick={downloadTests} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Ladda ner
                  </Button>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-1 text-sm">
                    {Array.from(generationResult.tests.keys()).map((filename) => (
                      <div key={filename} className="text-muted-foreground">
                        tests/{filename}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Documentation */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Dokumentation</h3>
                    <Badge variant="secondary">{generationResult.docs.size}</Badge>
                  </div>
                  <Button onClick={downloadDocs} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Ladda ner
                  </Button>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-1 text-sm">
                    {Array.from(generationResult.docs.keys()).map((filename) => (
                      <div key={filename} className="text-muted-foreground">
                        public/docs/{filename}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* DoR/DoD */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">DoR/DoD Checklistor</h3>
                  <Badge variant="secondary">{generationResult.dorDod.size}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  ✅ DoR/DoD-kriterierna nedan har uppdaterats i databasen baserat på BPMN-filen
                </p>
                <ScrollArea className="h-32">
                  <div className="space-y-2 text-sm">
                    {Array.from(generationResult.dorDod.entries()).map(([subprocess, criteria]) => (
                      <div key={subprocess}>
                        <div className="font-medium">{subprocess}</div>
                        <div className="text-muted-foreground text-xs ml-2">
                          {criteria.length} kriterier ({criteria.filter(c => c.criterion_type === 'dor').length} DoR, {criteria.filter(c => c.criterion_type === 'dod').length} DoD)
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Subprocess Mappings */}
              {generationResult.subprocessMappings.size > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold">Subprocess-kopplingar</h3>
                    <Badge variant="secondary">{generationResult.subprocessMappings.size}</Badge>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="space-y-2 text-sm">
                      {Array.from(generationResult.subprocessMappings.entries()).map(([elementId, file]) => (
                        <div key={elementId} className="flex justify-between">
                          <code className="text-xs">{elementId}</code>
                          <span className="text-muted-foreground">→ {file || '❌ Ej hittad'}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!generationResult && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">Vad genereras?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <FileCode className="h-4 w-4 mt-0.5 text-blue-500" />
                  <span><strong>Test skeletons:</strong> Playwright-tester för UserTasks, ServiceTasks, BusinessRuleTasks och CallActivities</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-green-500" />
                  <span><strong>Dokumentation:</strong> HTML-sidor med beskrivningar och metadata för varje nod</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 mt-0.5 text-purple-500" />
                  <span><strong>DoR/DoD:</strong> Definition of Ready och Definition of Done kriterier för subprocesser</span>
                </li>
                <li className="flex items-start gap-2">
                  <Wand2 className="h-4 w-4 mt-0.5 text-orange-500" />
                  <span><strong>Subprocess-koppling:</strong> Automatisk matchning av CallActivity-namn med BPMN-filer</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
