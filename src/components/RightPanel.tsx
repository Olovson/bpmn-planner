import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, ExternalLink, AlertCircle, FileCode, CheckCircle2, LayoutList, Clock, XCircle, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { useTestResults } from '@/hooks/useTestResults';
import { useToast } from '@/hooks/use-toast';
import type { BpmnMapping } from '@/hooks/useBpmnMappings';
import { useDynamicBpmnFiles, useDynamicDmnFiles } from '@/hooks/useDynamicBpmnFiles';
import { matchDmnFile } from '@/lib/dmnParser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDocumentationUrl, getTestFileUrl, getNodeDocStoragePath, getNodeTestReportUrl } from '@/lib/artifactUrls';
import { supabase } from '@/integrations/supabase/client';
import { checkDocsAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';
import { useNodeTests } from '@/hooks/useNodeTests';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NodeSummaryCard } from '@/components/NodeSummaryCard';

interface RightPanelProps {
  selectedElement?: string | null;
  selectedElementType?: string | null;
  selectedElementName?: string | null;
  bpmnFile?: string;
  mappings: Record<string, BpmnMapping>;
  saveMapping: (elementId: string, data: Partial<BpmnMapping>) => Promise<BpmnMapping | undefined>;
}

// Node types that should show content in the sidebar
const SUPPORTED_NODE_TYPES = [
  'bpmn:CallActivity',
  'bpmn:ServiceTask',
  'bpmn:UserTask',
  'bpmn:BusinessRuleTask'
];

const slugifyName = (value?: string | null) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/mortgage\s*-\s*/g, '')
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const slugFromBpmnFile = (fileName?: string | null) => {
  if (!fileName) return '';
  return fileName.replace('.bpmn', '').replace(/^mortgage-se-/, '').toLowerCase();
};

export const RightPanel = ({
  selectedElement,
  selectedElementType,
  selectedElementName,
  bpmnFile = 'mortgage.bpmn',
  mappings,
  saveMapping,
}: RightPanelProps) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dmnFileInput, setDmnFileInput] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [jiraType, setJiraType] = useState<'feature goal' | 'epic' | ''>('');
  const [subprocessFileInput, setSubprocessFileInput] = useState<string>('');
  const { toast } = useToast();
  const { data: availableBpmnFiles = [] } = useDynamicBpmnFiles();
  const { data: availableDmnFiles = [] } = useDynamicDmnFiles();

  // Get test file URL from node_test_links
  const [testFilePath, setTestFilePath] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedElement || !bpmnFile) {
      setTestFilePath(null);
      return;
    }

    const fetchTestFileUrl = async () => {
      try {
        const { data, error, status } = await supabase
          .from('node_test_links')
          .select('test_file_path')
          .eq('bpmn_file', bpmnFile)
          .eq('bpmn_element_id', selectedElement)
          .limit(1)
          .single();

        if (error) {
          if (status === 406) {
            console.warn('[RightPanel] node_test_links 406 for', bpmnFile, selectedElement);
            setTestFilePath(null);
            return;
          }
          console.error('[RightPanel] node_test_links error', error);
          setTestFilePath(null);
          return;
        }

        if (data?.test_file_path) {
          setTestFilePath(data.test_file_path);
        } else {
          setTestFilePath(null);
        }
      } catch (err) {
        console.error('[RightPanel] node_test_links fetch failed', err);
        setTestFilePath(null);
      }
    };

    fetchTestFileUrl();
  }, [selectedElement, bpmnFile]);

  const testFileUrl = useMemo(() => {
    if (!testFilePath) return null;
    return getTestFileUrl(testFilePath);
  }, [testFilePath]);

  // Update inputs when selected element changes
  useEffect(() => {
    if (selectedElement) {
      const mapping = mappings[selectedElement];
      setDmnFileInput(mapping?.dmn_file || '');
      setFigmaUrl(mapping?.figma_url || '');
      setJiraType(mapping?.jira_type || '');
      setSubprocessFileInput(mapping?.subprocess_bpmn_file || '');
    }
  }, [selectedElement, mappings]);



  const jiraEntries = useMemo(() => {
    if (!selectedElement) return [];
    const entries: { id: string; title: string }[] = [];
    const mapping = mappings[selectedElement];

    if (mapping?.jira_name) {
      entries.push({
        id: mapping.id || mapping.element_id,
        title: mapping.jira_name,
      });
    }

    if (mapping?.jira_issues?.length) {
      mapping.jira_issues.forEach(issue => {
        if (!issue) return;
        entries.push({
          id: issue.id,
          title: issue.title || issue.url || 'Jira issue',
        });
      });
    }

    if (entries.length === 0 && elementResourceMapping[selectedElement]?.jiraUrl) {
      entries.push({
        id: 'default',
        title: elementResourceMapping[selectedElement].jiraUrl,
      });
    }

    return entries;
  }, [selectedElement, mappings]);

  const currentMapping = useMemo(() => {
    if (!selectedElement) return null;
    return mappings[selectedElement];
  }, [selectedElement, mappings]);


  const handleSaveDmnFile = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        dmn_file: dmnFileInput.trim() || '',
      });

      toast({
        title: 'DMN-fil sparad',
        description: `DMN-fil länkad till ${selectedElement}`,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteDmnFile = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        dmn_file: '',
      });
      setDmnFileInput('');

      toast({
        title: 'DMN-fil borttagen',
        description: 'DMN-fil länk har tagits bort',
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveSubprocessFile = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        subprocess_bpmn_file: subprocessFileInput.trim() || '',
      });

      toast({
        title: 'Subprocess-fil sparad',
        description: `Subprocess-BPMN kopplad till ${selectedElement}`,
      });
    } catch (error) {
      // Error handled i hook
    }
  };

  const handleDeleteSubprocessFile = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        subprocess_bpmn_file: '',
      });
      setSubprocessFileInput('');

      toast({
        title: 'Subprocess-fil borttagen',
        description: 'Manuell subprocess-koppling har tagits bort',
      });
    } catch (error) {
      // Error handled i hook
    }
  };

  const handleSaveFigmaUrl = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        figma_url: figmaUrl.trim() || '',
      });

      toast({
        title: 'Figma-länk sparad',
        description: `Figma-design kopplad till ${selectedElement}`,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteFigmaUrl = async () => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        figma_url: '',
      });
      setFigmaUrl('');

      toast({
        title: 'Figma-länk borttagen',
        description: 'Figma-länken har tagits bort',
      });
    } catch (error) {
      // Error handled in hook
    }
  };


  const elementResources = useMemo(() => {
    if (!selectedElement) return null;
    return elementResourceMapping[selectedElement] || null;
  }, [selectedElement]);

  const displaySubprocessFile = useMemo(() => {
    if (!selectedElement) return '';
    const mapping = mappings[selectedElement];
    if (mapping?.subprocess_bpmn_file) {
      return mapping.subprocess_bpmn_file;
    }
    if (elementResources?.bpmnFile) {
      return elementResources.bpmnFile;
    }
    return '';
  }, [selectedElement, mappings, elementResources]);

  const displayConfluenceUrl = useMemo(() => {
    if (!selectedElement) return '';
    const mapping = mappings[selectedElement];
    const savedConfluenceUrl = mapping?.confluence_url || '';
    const defaultDocUrl = getDocumentationUrl(bpmnFile, selectedElement);
    return savedConfluenceUrl || defaultDocUrl;
  }, [selectedElement, mappings, bpmnFile]);

  const displayFigmaUrl = useMemo(() => {
    if (!selectedElement) return '';
    const mapping = mappings[selectedElement];
    if (mapping) {
      return mapping.figma_url || '';
    }
    return elementResources?.figmaUrl || '';
  }, [selectedElement, mappings, elementResources]);

  const { getTestResultByNodeId } = useTestResults();
  const testResult = selectedElement ? getTestResultByNodeId(selectedElement) : null;
  const [hasDocs, setHasDocs] = useState(false);
  const [hasTestReport, setHasTestReport] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  const isBusinessRuleTask = selectedElementType === 'bpmn:BusinessRuleTask';

  useEffect(() => {
    let cancelled = false;
    const loadArtifacts = async () => {
      if (!selectedElement || !bpmnFile) {
        console.debug('[RightPanel] loadArtifacts: missing selection or bpmnFile', {
          selectedElement,
          bpmnFile,
        });
        setHasDocs(false);
        setHasTestReport(false);
        return;
      }
      setLoadingArtifacts(true);
      const mapping = mappings[selectedElement];

      if (typeof getNodeDocStoragePath !== 'function') {
        console.warn('[RightPanel] getNodeDocStoragePath is not available', {
          bpmnFile,
          selectedElement,
        });
        setHasDocs(Boolean(mapping?.confluence_url));
        setHasTestReport(Boolean(mapping?.test_report_url));
        setLoadingArtifacts(false);
        return;
      }

      try {
        const docStoragePath = getNodeDocStoragePath(bpmnFile, selectedElement);
        console.debug('[RightPanel] loadArtifacts: start', {
          bpmnFile,
          selectedElement,
          selectedElementName,
          docStoragePath,
          hasMapping: Boolean(mapping),
        });

        const [docsAvailable, testReportAvailable] = await Promise.all([
          checkDocsAvailable(
            mapping?.confluence_url,
            docStoragePath,
          ),
          checkTestReportAvailable(mapping?.test_report_url),
        ]);

        console.debug('[RightPanel] loadArtifacts: resolved', {
          bpmnFile,
          selectedElement,
          docStoragePath,
          docsAvailable,
          hasTestReport: testReportAvailable,
        });

        if (!cancelled) {
          setHasDocs(docsAvailable);
          setHasTestReport(testReportAvailable);
          setLoadingArtifacts(false);
        }
      } catch (error) {
        console.warn('[RightPanel] Failed to resolve artifacts', {
          error,
          bpmnFile,
          selectedElement,
        });
        if (!cancelled) {
          setHasDocs(Boolean(mapping?.confluence_url));
          setHasTestReport(Boolean(mapping?.test_report_url));
          setLoadingArtifacts(false);
        }
      }
    };
    loadArtifacts();
    return () => {
      cancelled = true;
    };
  }, [selectedElement, selectedElementName, bpmnFile, mappings]);

  // Get DMN file for BusinessRuleTask - prioritize manual link from mappings
  const dmnFile = useMemo(() => {
    if (!isBusinessRuleTask || !selectedElement) return null;
    
    // First check for manual DMN link in mappings
    const mapping = mappings[selectedElement];
    if (mapping?.dmn_file) {
      return mapping.dmn_file;
    }
    
    // Fall back to automatic matching if no manual link
    const matched = matchDmnFile(selectedElement, availableDmnFiles);
    return matched && availableDmnFiles.includes(matched) ? matched : null;
  }, [isBusinessRuleTask, selectedElement, mappings, availableDmnFiles]);

  const shouldShowPanel = selectedElement && selectedElementType && SUPPORTED_NODE_TYPES.includes(selectedElementType);

  const handleOpenSubprocess = () => {
    if (!displaySubprocessFile) return;
    const event = new CustomEvent('loadBpmnFile', {
      detail: { fileName: displaySubprocessFile },
    });
    window.dispatchEvent(event);
  };

  const openExternal = (url?: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Hämta planerade scenarion för denna nod (inkl. fallback från testMapping)
  const { plannedScenariosByProvider } = useNodeTests({
    nodeId: selectedElement || undefined,
    bpmnFile,
    elementId: selectedElement || undefined,
  });

  const allPlannedScenarios = useMemo(() => {
    const result: {
      id: string;
      name: string;
      description?: string;
      category?: string;
      status?: string;
      provider: string;
      origin: string;
    }[] = [];

    plannedScenariosByProvider.forEach((set) => {
      (set.scenarios ?? []).forEach((s: any) => {
        result.push({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          status: s.status,
          provider: set.provider,
          origin: set.origin,
        });
      });
    });

    return result;
  }, [plannedScenariosByProvider]);

  if (!shouldShowPanel) {
    return null;
  }

  return (
    <div
      className={`
        ${isCollapsed ? 'w-12' : 'w-96'}
        transition-all duration-300 ease-in-out
        border-l border-border bg-card
        flex flex-col
        relative
      `}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-4 -translate-x-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md hover:bg-accent"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4 pb-20">
            <NodeSummaryCard
              title={currentMapping?.jira_name || selectedElementName || selectedElement}
              elementId={selectedElement || undefined}
              elementTypeLabel={selectedElementType?.replace('bpmn:', '') || undefined}
              testStatus={testResult?.status ?? null}
              jiraType={jiraType || null}
              hasSubprocess={Boolean(displaySubprocessFile && selectedElementType === 'bpmn:CallActivity')}
              onOpenDocs={
                hasDocs && !loadingArtifacts
                  ? () => {
                      if (displayConfluenceUrl.startsWith('#/')) {
                        navigate(displayConfluenceUrl.replace(/^#/, ''));
                      } else {
                        openExternal(displayConfluenceUrl);
                      }
                    }
                  : undefined
              }
              canOpenDocs={hasDocs && !loadingArtifacts}
              onOpenTestScript={
                bpmnFile && selectedElement && testFilePath
                  ? () =>
                      navigate(
                        `/node-test-script?bpmnFile=${encodeURIComponent(
                          bpmnFile,
                        )}&elementId=${encodeURIComponent(selectedElement)}`,
                      )
                  : undefined
              }
              canOpenTestScript={Boolean(testFilePath)}
              onOpenTestReport={
                selectedElement && bpmnFile
                  ? () =>
                      navigate(
                        getNodeTestReportUrl(bpmnFile, selectedElement).replace('#', ''),
                      )
                  : undefined
              }
              canOpenTestReport={Boolean(selectedElement && !loadingArtifacts)}
              onOpenNodeMatrix={() => navigate('/node-matrix')}
            />

            {selectedElementType === 'bpmn:CallActivity' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subprocess-BPMN</CardTitle>
                  <CardDescription>
                    Automatisk matchning från hierarkin, med möjlighet att manuellt ange BPMN-fil som subprocess.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Automatisk subprocess</p>
                    <p className="text-xs rounded bg-muted/40 px-3 py-2">
                      {displaySubprocessFile || 'Ingen automatisk subprocess matchad ännu.'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Manuell override</p>
                    <Select
                      value={subprocessFileInput || '__none__'}
                      onValueChange={(value) => {
                        if (value === '__none__') setSubprocessFileInput('');
                        else setSubprocessFileInput(value);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Välj BPMN-fil eller lämna tom för auto" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="__none__">(Ingen – använd automatisk matchning)</SelectItem>
                        {availableBpmnFiles.map((file) => (
                          <SelectItem key={file} value={file}>
                            {file}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={!selectedElement}
                      onClick={handleSaveSubprocessFile}
                    >
                      Spara
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedElement || !subprocessFileInput}
                      onClick={handleDeleteSubprocessFile}
                    >
                      Rensa override
                    </Button>
                    {subprocessFileInput && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const event = new CustomEvent('loadBpmnFile', {
                            detail: { fileName: subprocessFileInput },
                          });
                          window.dispatchEvent(event);
                        }}
                      >
                        Öppna subprocess
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jira</CardTitle>
                <CardDescription>Visar typ och Jira-namn kopplat till noden.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Jira-typ</p>
                  <p className="text-sm rounded bg-muted/40 px-3 py-2">
                    {jiraType || 'Ej angiven'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Jira-namn</p>
                  {jiraEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Inga Jira-namn kopplade.</p>
                  ) : (
                    <div className="space-y-1">
                      {jiraEntries.map((entry) => (
                        <p key={entry.id} className="text-sm rounded bg-muted/40 px-3 py-2">
                          {entry.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Figma</CardTitle>
                <CardDescription>
                  Länk till design i Figma för denna nod. Länken sätts manuellt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Figma-URL</p>
                  <Input
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://www.figma.com/..."
                    className="text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!selectedElement || !figmaUrl.trim()}
                    onClick={handleSaveFigmaUrl}
                  >
                    Spara
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!selectedElement || !displayFigmaUrl}
                    onClick={handleDeleteFigmaUrl}
                  >
                    Ta bort
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!displayFigmaUrl}
                    onClick={() => openExternal(displayFigmaUrl)}
                  >
                    Öppna i ny flik
                  </Button>
                </div>
                {displayFigmaUrl && (
                  <p className="text-[11px] text-muted-foreground break-all">
                    Aktiv länk: {displayFigmaUrl}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tester</CardTitle>
                <CardDescription>
                  Datadriven status för tester kopplade till denna nod.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Testfil</p>
                  {testFileUrl ? (
                    <a
                      href={testFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileCode className="h-3 w-3" />
                      <span className="truncate max-w-[220px]">
                        {testFilePath?.replace(/^tests\//, '') || 'Öppna testfil'}
                      </span>
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ingen automatisk testfil är kopplad till denna nod ännu.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Sammanfattning</p>
                  {testResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={testResult.status === 'passing' ? 'default' : 'destructive'}>
                          {testResult.status}
                        </Badge>
                        <p className="text-sm font-medium">
                          {testResult.node_name || selectedElement}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {testResult.test_count} tester
                        {typeof testResult.duration === 'number'
                          ? ` • ${testResult.duration.toFixed(1)}s`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Senast körd:{' '}
                        {testResult.executed_at
                          ? new Date(testResult.executed_at).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {testFileUrl
                        ? 'En testfil finns, men inga testkörningar är registrerade ännu.'
                        : 'Inga tester är kopplade till denna nod ännu.'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Testrapport</p>
                  {selectedElement && bpmnFile && (testResult || hasTestReport) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedElement && bpmnFile) {
                          navigate(
                            getNodeTestReportUrl(bpmnFile, selectedElement).replace('#', ''),
                          );
                        }
                      }}
                      className="justify-start gap-2"
                      title={`Visa testrapport för ${selectedElementName || selectedElement}`}
                    >
                      <Clock className="h-4 w-4" />
                      Öppna testrapport
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ingen testrapport är tillgänglig ännu.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Planerade scenarion
                  </p>
                  {allPlannedScenarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Inga planerade scenarion är kopplade till denna nod ännu.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {allPlannedScenarios.length} scenario
                        {allPlannedScenarios.length > 1 ? 'n' : ''} definierade.
                      </p>
                      <div className="space-y-2">
                        {allPlannedScenarios.map((scenario) => (
                          <div
                            key={scenario.id}
                            className="rounded border border-border/50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium">
                                {scenario.name}
                              </p>
                              <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">
                                {scenario.provider}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {scenario.category} • {scenario.status}
                            </p>
                            {scenario.description && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {scenario.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      )}
    </div>
  );
}
