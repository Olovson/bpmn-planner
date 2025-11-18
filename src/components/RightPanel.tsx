import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, ExternalLink, AlertCircle, FileCode, CheckCircle2, LayoutList, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { useTestResults } from '@/hooks/useTestResults';
import { useTestsForNode } from '@/hooks/useTestsForNode';
import { useToast } from '@/hooks/use-toast';
import { useBpmnMappings, type JiraIssue } from '@/hooks/useBpmnMappings';
import { matchDmnFile } from '@/lib/dmnParser';
import { DmnViewer } from '@/components/DmnViewer';
import { NodeReferencesCard } from '@/components/NodeReferencesCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDocumentationUrl, getTestFileUrl } from '@/lib/artifactUrls';
import { supabase } from '@/integrations/supabase/client';

interface RightPanelProps {
  selectedElement?: string | null;
  selectedElementType?: string | null;
  bpmnFile?: string;
}

// Node types that should show content in the sidebar
const SUPPORTED_NODE_TYPES = [
  'bpmn:CallActivity',
  'bpmn:ServiceTask',
  'bpmn:UserTask',
  'bpmn:BusinessRuleTask'
];

export const RightPanel = ({ selectedElement, selectedElementType, bpmnFile = 'mortgage.bpmn' }: RightPanelProps) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dmnFileInput, setDmnFileInput] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [jiraType, setJiraType] = useState<'feature goal' | 'epic' | ''>('');
  const { toast } = useToast();
  
  const { mappings, loading, saveMapping } = useBpmnMappings(bpmnFile);
  const { getTestResultByNodeId } = useTestResults();
  const { tests: nodeTests, stats: testStats, isLoading: testsLoading } = useTestsForNode({
    bpmnFile,
    bpmnElementId: selectedElement,
  });

  // Get test file URL from node_test_links
  const [testFileUrl, setTestFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedElement || !bpmnFile) {
      setTestFileUrl(null);
      return;
    }

    const fetchTestFileUrl = async () => {
      const { data } = await supabase
        .from('node_test_links')
        .select('test_file_path')
        .eq('bpmn_file', bpmnFile)
        .eq('bpmn_element_id', selectedElement)
        .limit(1)
        .single();

      if (data?.test_file_path) {
        setTestFileUrl(getTestFileUrl(data.test_file_path));
      } else {
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



  const jiraIssues = useMemo(() => {
    if (!selectedElement) return [];
    
    const mapping = mappings[selectedElement];
    if (mapping) {
      // If a mapping record exists, use only its issues (even if empty)
      return mapping.jira_issues || [];
    }
    
    // Fall back to default only when no mapping record exists
    const defaultResources = elementResourceMapping[selectedElement] || {};
    const defaultIssues = defaultResources.jiraUrl ? [{
      id: 'default',
      url: defaultResources.jiraUrl,
      title: 'Standard issue'
    }] : [];
    
    return defaultIssues;
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

  const handleSaveJiraType = async (value: 'feature goal' | 'epic' | '') => {
    if (!selectedElement) return;

    try {
      await saveMapping(selectedElement, {
        jira_type: value || null,
      });
      setJiraType(value);

      toast({
        title: 'Jira-typ sparad',
        description: `Jira-typ uppdaterad till ${value || 'ingen'}`,
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
    if (mapping) {
      // If a mapping record exists, honor its explicit value (even if empty)
      return mapping.subprocess_bpmn_file || '';
    }
    // Fall back to default only when no mapping record exists
    return elementResources?.bpmnFile || '';
  }, [selectedElement, mappings, elementResources]);

  const displayConfluenceUrl = useMemo(() => {
    if (!selectedElement) return '';
    const mapping = mappings[selectedElement];
    const savedConfluenceUrl = mapping?.confluence_url || '';
    // Documentation is generated per BPMN file, not per element
    // Fall back to the generated HTML docs for this BPMN file
    const defaultDocUrl = getDocumentationUrl(bpmnFile);
    // Use saved URL if it exists, otherwise fall back to generated HTML docs
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

  const testResult = selectedElement ? getTestResultByNodeId(selectedElement) : null;

  const isBusinessRuleTask = selectedElementType === 'bpmn:BusinessRuleTask';

  // Get DMN file for BusinessRuleTask - prioritize manual link from mappings
  const dmnFile = useMemo(() => {
    if (!isBusinessRuleTask || !selectedElement) return null;
    
    // First check for manual DMN link in mappings
    const mapping = mappings[selectedElement];
    if (mapping?.dmn_file) {
      return mapping.dmn_file;
    }
    
    // Fall back to automatic matching if no manual link
    const dmnFiles: string[] = [
      // Add DMN files here as they are created
      // Example: 'pre-screen-party.dmn',
    ];
    
    const matched = matchDmnFile(selectedElement, dmnFiles);
    return matched && dmnFiles.includes(matched) ? matched : null;
  }, [isBusinessRuleTask, selectedElement, mappings]);

  const shouldShowPanel = selectedElement && selectedElementType && SUPPORTED_NODE_TYPES.includes(selectedElementType);

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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-foreground">Node Details</h2>
              {selectedElementType && (
                <Badge variant="secondary" className="text-xs">
                  {selectedElementType.replace('bpmn:', '')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              {selectedElement}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => {
                navigate(`/dor-dod?subprocess=${selectedElement}&bpmn=${bpmnFile}`);
              }}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Öppna DoR/DoD
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Laddar...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sub-process Section - only for CallActivity nodes (Read-only) */}
              {selectedElementType === 'bpmn:CallActivity' && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="h-4 w-4 text-purple-500" />
                    <h3 className="font-medium text-sm">Sub-process</h3>
                    {displaySubprocessFile && <Badge variant="secondary" className="text-xs">Länkad</Badge>}
                  </div>

                  {displaySubprocessFile ? (
                    <div
                      onDoubleClick={() => {
                        const event = new CustomEvent('loadBpmnFile', {
                          detail: { fileName: displaySubprocessFile }
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full text-left p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {displaySubprocessFile}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Double-click to open
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ingen sub-process länkad</p>
                  )}
                </Card>
              )}

              {/* Documentation Section (Read-only) */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCode className="h-4 w-4 text-purple-500" />
                  <h3 className="font-medium text-sm">
                    {isBusinessRuleTask ? 'DMN Documentation' : 'Documentation'}
                  </h3>
                  {displayConfluenceUrl && <Badge variant="secondary" className="text-xs">Länkad</Badge>}
                </div>

                {isBusinessRuleTask && (
                  <div className="mb-3 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">
                      Dokumentera beslutslogik, DMN-tabellstruktur, affärsregler och testfall för denna Business Rule Task.
                    </p>
                  </div>
                )}

                {displayConfluenceUrl ? (
                  <div className="w-full p-3 rounded-md bg-muted/50">
                    <a
                      href={displayConfluenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="break-all">{displayConfluenceUrl}</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Ingen dokumentation länkad</p>
                )}
              </Card>

              {/* Figma Design Section - Hidden for BusinessRuleTask */}
              {!isBusinessRuleTask && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="h-4 w-4 text-pink-500" />
                    <h3 className="font-medium text-sm">Figma Design</h3>
                    {displayFigmaUrl && <Badge variant="secondary" className="text-xs">Länkad</Badge>}
                  </div>

                  {displayFigmaUrl && (
                    <div className="w-full p-3 mb-3 rounded-md bg-muted/50 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <a
                            href={displayFigmaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="break-all">{displayFigmaUrl}</span>
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteFigmaUrl()}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Input
                      placeholder="https://www.figma.com/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      onClick={handleSaveFigmaUrl}
                      size="sm"
                      className="w-full h-8"
                    >
                      {displayFigmaUrl ? 'Update' : 'Add'} Figma Link
                    </Button>
                  </div>
                </Card>
              )}

              {/* Jira Section - Show jira_name and jira_type (Read-only) */}
              {currentMapping && (currentMapping.jira_name || currentMapping.jira_type) && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="h-4 w-4 text-blue-500" />
                    <h3 className="font-medium text-sm">Jira Ticket</h3>
                    <Badge variant="secondary" className="text-xs">Auto-genererad</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {currentMapping.jira_name && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Jira Namn</p>
                        <p className="text-sm font-medium p-2 rounded-md bg-muted/50">
                          {currentMapping.jira_name}
                        </p>
                      </div>
                    )}
                    
                    {currentMapping.jira_type && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Jira Typ</p>
                        <span className="inline-block text-sm px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          {currentMapping.jira_type === 'feature goal' ? 'Feature Goal' : 'Epic'}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* DMN Decision Table Section - Only for BusinessRuleTask */}
              {isBusinessRuleTask && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="h-4 w-4 text-purple-500" />
                    <h3 className="font-medium text-sm">DMN Decision Table</h3>
                    {dmnFile && <Badge variant="secondary" className="text-xs">Länkad</Badge>}
                  </div>

                  <DmnViewer 
                    businessRuleTaskName={selectedElement}
                    manualDmnFile={dmnFile || undefined}
                  />
                  
                  {dmnFile && (
                    <div 
                      className="mt-3 p-2 bg-muted/50 rounded group cursor-pointer hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {dmnFile}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Manuellt länkad DMN-fil
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={handleDeleteDmnFile}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mt-3">
                    <Input
                      placeholder="decision-table.dmn"
                      value={dmnFileInput}
                      onChange={(e) => setDmnFileInput(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      onClick={handleSaveDmnFile}
                      size="sm"
                      className="w-full h-8"
                    >
                      {dmnFile ? 'Update' : 'Add'} DMN File
                    </Button>
                  </div>
                </Card>
              )}

              {/* Jira Issues Section (Read-only for issues, editable for type) */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <h3 className="font-medium text-sm">Jira Issues</h3>
                  {jiraIssues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {jiraIssues.length}
                    </Badge>
                  )}
                </div>

                {/* Jira Type Selection - Still editable */}
                <div className="mb-4 pb-3 border-b">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Jira Type
                  </label>
                  <Select
                    value={jiraType || 'none'}
                    onValueChange={(value) => handleSaveJiraType(value === 'none' ? '' : value as 'feature goal' | 'epic')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen</SelectItem>
                      <SelectItem value="feature goal">Feature Goal</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Jira Issues - Read-only display */}
                <div className="space-y-3">
                  {jiraIssues.length > 0 ? (
                    jiraIssues.map((issue) => (
                      <div key={issue.id} className="p-2 rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0">
                          {issue.title && (
                            <p className="text-sm font-medium mb-1">{issue.title}</p>
                          )}
                          <a
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {issue.url}
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Inga Jira issues länkade</p>
                  )}
                </div>
              </Card>

              {/* Test Information Section */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h3 className="font-medium text-sm">Test</h3>
                  {testFileUrl && <Badge variant="secondary" className="text-xs">Länkad</Badge>}
                </div>

                {/* Test file link (from Supabase Storage) */}
                {testFileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3"
                    onClick={() => window.open(testFileUrl, '_blank')}
                  >
                    <FileCode className="h-3 w-3 mr-2" />
                    Öppna testfil
                  </Button>
                )}

                {testResult && (
                  <div className="space-y-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={testResult.status === 'passing' ? 'default' : 'destructive'} className="text-xs">
                        {testResult.status}
                      </Badge>
                      <p className="text-sm font-medium">{testResult.node_name || selectedElement}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {testResult.test_count} test{testResult.test_count !== 1 ? 's' : ''} {testResult.duration ? `• ${testResult.duration.toFixed(1)}s` : ''}
                    </p>

                    {testResult.scenarios && testResult.scenarios.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Test Scenarios:</p>
                        {testResult.scenarios.map((scenario) => (
                          <div key={scenario.id} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                            <Badge
                              variant={scenario.status === 'passing' ? 'default' : 'destructive'}
                              className="text-[10px] h-4 px-1"
                            >
                              {scenario.status}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{scenario.name}</p>
                              <p className="text-muted-foreground text-[10px] mt-0.5">
                                {scenario.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Test List for Node - Always show section with feedback */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Specifika tester</span>
                    {nodeTests.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {testStats.passed} ✅ {testStats.failed} ❌ {testStats.pending} ⏺
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Playwright-tester kopplade till denna BPMN-nod
                  </p>
                  
                  {/* Debug info - remove after testing */}
                  <div className="text-[9px] text-muted-foreground mb-1 p-1 bg-muted/20 rounded">
                    Debug: Element ID = "{selectedElement}" | Hittade {nodeTests.length} tester
                  </div>
                  
                  <div>
                    {testsLoading && (
                      <div className="text-[11px] text-muted-foreground py-2">Laddar tester…</div>
                    )}
                    
                    {!testsLoading && nodeTests.length === 0 && (
                      <div className="text-[11px] text-muted-foreground py-2">
                        Inga tester är kopplade direkt till denna nod ännu.
                      </div>
                    )}
                    
                    {!testsLoading && nodeTests.map((test) => (
                      <button
                        key={test.id}
                        className="w-full text-left text-[11px] py-1.5 px-2 rounded hover:bg-muted flex justify-between items-center group transition-colors"
                        onClick={() => {
                          navigate(`/node-tests?nodeId=${selectedElement}`);
                        }}
                      >
                        <span className="flex-1 min-w-0">
                          <div className="truncate font-medium">{test.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {test.fileName}
                          </div>
                        </span>
                        <span className="ml-2 shrink-0">
                          {test.status === 'passing' && '✅'}
                          {test.status === 'failing' && '❌'}
                          {test.status === 'pending' && '⏺'}
                          {test.status === 'skipped' && '⏭️'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {!testFileUrl && (
                  <p className="text-xs text-muted-foreground">
                    Ingen testfil genererad ännu
                  </p>
                )}
              </Card>

              {/* Node References Section - New! */}
              <NodeReferencesCard bpmnFile={bpmnFile} elementId={selectedElement} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
