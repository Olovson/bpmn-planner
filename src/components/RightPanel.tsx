import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, ExternalLink, AlertCircle, FileCode, CheckCircle2, LayoutList, Clock, XCircle, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { useTestResults } from '@/hooks/useTestResults';
import { useTestsForNode } from '@/hooks/useTestsForNode';
import { useToast } from '@/hooks/use-toast';
import type { BpmnMapping } from '@/hooks/useBpmnMappings';
import { useDynamicBpmnFiles, useDynamicDmnFiles } from '@/hooks/useDynamicBpmnFiles';
import { matchDmnFile } from '@/lib/dmnParser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDocumentationUrl, getTestFileUrl, getNodeDocStoragePath, getNodeTestReportUrl } from '@/lib/artifactUrls';
import { supabase } from '@/integrations/supabase/client';
import { testMapping } from '@/data/testMapping';
import { checkDocsAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';

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
  const { toast } = useToast();
  const { data: availableBpmnFiles = [] } = useDynamicBpmnFiles();
  const { data: availableDmnFiles = [] } = useDynamicDmnFiles();

  // Get test file URL from node_test_links
  const [testFileUrl, setTestFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedElement || !bpmnFile) {
      setTestFileUrl(null);
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
            setTestFileUrl(null);
            return;
          }
          console.error('[RightPanel] node_test_links error', error);
          setTestFileUrl(null);
          return;
        }

        if (data?.test_file_path) {
          setTestFileUrl(getTestFileUrl(data.test_file_path));
        } else {
          setTestFileUrl(null);
        }
      } catch (err) {
        console.error('[RightPanel] node_test_links fetch failed', err);
        setTestFileUrl(null);
      }
    };

    fetchTestFileUrl();
  }, [selectedElement, bpmnFile]);

  // Update inputs when selected element changes
  useEffect(() => {
    if (selectedElement) {
      const mapping = mappings[selectedElement];
      setDmnFileInput(mapping?.dmn_file || '');
      setFigmaUrl(mapping?.figma_url || '');
      setJiraType(mapping?.jira_type || '');
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
    if (selectedElementType === 'bpmn:CallActivity') {
      const sourceName = mapping?.jira_name || selectedElementName || selectedElement;
      const files = Array.isArray(availableBpmnFiles) ? availableBpmnFiles : [];
      if (sourceName && files.length > 0) {
        const normalized = sourceName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/_/g, '-');
        const direct = files.find(file =>
          file.toLowerCase().includes(normalized)
        );
        if (direct) return direct;
        const nameParts = normalized.split('-').filter(part => part.length > 3);
        if (nameParts.length > 0) {
          for (const file of files) {
            const lower = file.toLowerCase();
            const matchedParts = nameParts.filter(part => lower.includes(part));
            if (matchedParts.length >= Math.ceil(nameParts.length / 2)) {
              return file;
            }
          }
        }
      }
    }
    return '';
  }, [selectedElement, selectedElementType, selectedElementName, mappings, elementResources, availableBpmnFiles]);

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
  const nodeSlug = useMemo(() => {
    const candidates: string[] = [];
    if (elementResources?.bpmnFile) {
      candidates.push(slugFromBpmnFile(elementResources.bpmnFile));
    }
    if (displaySubprocessFile) {
      candidates.push(slugFromBpmnFile(displaySubprocessFile));
    }
    if (currentMapping?.jira_name) {
      candidates.push(slugifyName(currentMapping.jira_name));
    }
    if (selectedElementName) {
      candidates.push(slugifyName(selectedElementName));
    }
    const slug = candidates.find(Boolean);
    return slug || '';
  }, [elementResources?.bpmnFile, displaySubprocessFile, currentMapping?.jira_name, selectedElementName]);
  const fallbackTestInfo = nodeSlug ? testMapping[nodeSlug] : undefined;

  const { tests: nodeTests, isLoading: testsLoading } = useTestsForNode({
    bpmnFile,
    bpmnElementId: selectedElement,
    nodeSlug,
  });

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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {currentMapping?.jira_name || selectedElement}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {selectedElement}
                    </CardDescription>
                  </div>
                  {selectedElementType && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedElementType.replace('bpmn:', '')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {testResult && (
                    <Badge variant={testResult.status === 'passing' ? 'default' : 'destructive'}>
                      Test: {testResult.status}
                    </Badge>
                  )}
                  {jiraType && (
                    <Badge variant="outline">Jira: {jiraType}</Badge>
                  )}
                  {displaySubprocessFile && selectedElementType === 'bpmn:CallActivity' && (
                    <Badge variant="outline">Har subprocess</Badge>
                  )}
                </div>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasDocs || loadingArtifacts}
                    onClick={() => hasDocs && openExternal(displayConfluenceUrl)}
                    className="justify-start gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Dokumentation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!testFileUrl}
                    onClick={() => openExternal(testFileUrl)}
                    className="justify-start gap-2"
                  >
                    <FileCode className="h-4 w-4" />
                    Automatisk testfil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!selectedElement || loadingArtifacts}
                    onClick={() => {
                      if (selectedElement && bpmnFile) {
                        navigate(getNodeTestReportUrl(bpmnFile, selectedElement).replace('#', ''));
                      }
                    }}
                    className="justify-start gap-2"
                    title={selectedElement ? `Visa testrapport för ${selectedElementName || selectedElement}` : 'Välj en nod för att visa testrapport'}
                  >
                    <Clock className="h-4 w-4" />
                    Testrapport
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/node-matrix')}
                    className="justify-start gap-2"
                  >
                    <FileCode className="h-4 w-4" />
                    Öppna node-matrix
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                <CardTitle className="text-base">Tester</CardTitle>
                <CardDescription>Sammanfattning av genererade tester och scenarier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResult ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={testResult.status === 'passing' ? 'default' : 'destructive'}>
                          {testResult.status}
                        </Badge>
                        <p className="text-sm font-medium">{testResult.node_name || selectedElement}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {testResult.test_count} tester {testResult.duration ? `• ${testResult.duration.toFixed(1)}s` : ''}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Senaste testkörning</p>
                      <div className="rounded border border-border/60 px-3 py-2 text-xs">
                        <p className="font-medium">{testResult.report_name || 'Genererad testrapport'}</p>
                        <p className="text-muted-foreground">
                          {testResult.executed_at
                            ? new Date(testResult.executed_at).toLocaleString()
                            : 'Tidpunkt saknas'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedElement && bpmnFile) {
                            navigate(getNodeTestReportUrl(bpmnFile, selectedElement).replace('#', ''));
                          }
                        }}
                        className="justify-start gap-2"
                        title={selectedElement && bpmnFile ? `Visa testrapport för ${selectedElementName || selectedElement}` : 'Välj en nod för att visa testrapport'}
                      >
                        <Clock className="h-4 w-4" />
                        Visa testrapport
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Scenarier</p>
                      {testResult.scenarios?.length ? (
                        <div className="space-y-2">
                          {testResult.scenarios.map((scenario) => (
                            <div key={scenario.id} className="flex items-start gap-2 rounded bg-muted/40 px-2 py-1 text-xs">
                              <Badge
                                variant={scenario.status === 'passing' ? 'default' : 'destructive'}
                                className="text-[10px] h-4 px-1"
                              >
                                {scenario.status}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-medium">{scenario.name}</p>
                                {scenario.description && (
                                  <p className="text-muted-foreground text-[10px]">{scenario.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Inga scenarier inrapporterade.</p>
                      )}
                    </div>
                  </div>
                ) : fallbackTestInfo ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={fallbackTestInfo.status === 'passing' ? 'default' : 'destructive'}>
                          {fallbackTestInfo.status}
                        </Badge>
                        <p className="text-sm font-medium">{fallbackTestInfo.nodeName || fallbackTestInfo.nodeId}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fallbackTestInfo.testCount} tester {fallbackTestInfo.duration ? `• ${fallbackTestInfo.duration.toFixed(1)}s` : ''}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Genererad testfil</p>
                      <div className="rounded border border-border/60 px-3 py-2 text-xs">
                        <p className="font-medium">{fallbackTestInfo.testFile || 'tests/' + (fallbackTestInfo.nodeId || '') + '.spec.ts'}</p>
                        <p className="text-muted-foreground">
                          {fallbackTestInfo.lastRun ? new Date(fallbackTestInfo.lastRun).toLocaleString() : 'Ej körd ännu'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Scenarier</p>
                      {fallbackTestInfo.scenarios?.length ? (
                        <div className="space-y-2">
                          {fallbackTestInfo.scenarios.map((scenario) => (
                            <div key={scenario.id} className="flex items-start gap-2 rounded bg-muted/40 px-2 py-1 text-xs">
                              <Badge
                                variant={scenario.status === 'passing' ? 'default' : 'destructive'}
                                className="text-[10px] h-4 px-1"
                              >
                                {scenario.status}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-medium">{scenario.name}</p>
                                {scenario.description && (
                                  <p className="text-muted-foreground text-[10px]">{scenario.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Scenarier genereras när testkörning finns.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-dashed px-3 py-4 text-xs text-muted-foreground">
                    Inga testrapporter registrerade ännu.
                  </div>
                )}

              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      )}
    </div>
  );
}
