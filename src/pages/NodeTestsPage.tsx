// Node-specific test report page:
// - Detaljerad vy för en enskild nod (bpmnFile + elementId/nodeId)
// - Visar planerade scenarion och körda tester för just den noden
// - Kompletterar den globala rapporten i TestReport (/test-report)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileCode, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNodeTests } from '@/hooks/useNodeTests';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';

const NodeTestsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const nodeId = searchParams.get('nodeId');
  const bpmnFile = searchParams.get('bpmnFile');
  const elementId = searchParams.get('elementId');

  const { tests, nodeInfo, plannedScenariosByProvider, isLoading } = useNodeTests({ 
    nodeId: nodeId || undefined,
    bpmnFile: bpmnFile || undefined,
    elementId: elementId || undefined,
  });
  const [implementedTestFile, setImplementedTestFile] = useState<string | null>(null);
  // Gemensamt läge för provider (matchar dokumentationsvyerna: Lokal fallback / ChatGPT / Ollama)
  const [providerMode, setProviderMode] = useState<'local-fallback' | 'chatgpt' | 'ollama'>('local-fallback');

  const filteredTests = useMemo(
    () =>
      tests.filter((test) => {
        if (providerMode === 'local-fallback') {
          return test.variant === 'local-fallback' || test.scriptProvider === 'local-fallback';
        }
        if (providerMode === 'chatgpt') {
          return test.scriptProvider === 'chatgpt';
        }
        if (providerMode === 'ollama') {
          return test.scriptProvider === 'ollama';
        }
        return true;
      }),
    [tests, providerMode],
  );

  const plannedScenarioCountForCurrentProvider = useMemo(() => {
    return plannedScenariosByProvider
      .filter((set) => set.provider === providerMode)
      .reduce((sum, set) => sum + (set.scenarios?.length ?? 0), 0);
  }, [plannedScenariosByProvider, providerMode]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passing':
        return '✅';
      case 'failing':
        return '❌';
      case 'pending':
        return '⏺';
      case 'skipped':
        return '⏭';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: sv });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    if (!bpmnFile || !elementId) {
      setImplementedTestFile(null);
      return;
    }

    let cancelled = false;

    const fetchTestLink = async () => {
      try {
        const { data, error, status } = await supabase
          .from('node_test_links')
          .select('test_file_path')
          .eq('bpmn_file', bpmnFile)
          .eq('bpmn_element_id', elementId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error && status !== 406) {
          console.warn('[NodeTestsPage] node_test_links error', error);
          setImplementedTestFile(null);
          return;
        }

        if (data?.test_file_path) {
          setImplementedTestFile(data.test_file_path);
        } else {
          setImplementedTestFile(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[NodeTestsPage] Failed to read node_test_links', err);
          setImplementedTestFile(null);
        }
      }
    };

    fetchTestLink();

    return () => {
      cancelled = true;
    };
  }, [bpmnFile, elementId]);

  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'files') navigate('/files');
    else if (view === 'project') navigate('/project-plan');
    else if (view === 'timeline') navigate('/timeline');
    else navigate('/test-report');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? ''}
          currentView="tests"
          onViewChange={handleViewChange}
          onOpenVersions={() => navigate('/')}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
          isTestsEnabled={hasTests}
        />
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <div className="text-muted-foreground">Laddar tester...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="tests"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Testrapport (nod)
              </p>
              <p className="text-sm text-foreground mt-1">
                {nodeInfo?.name || elementId || nodeId || 'Okänd nod'}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {elementId && <span className="font-mono">{elementId}</span>}
                {bpmnFile && (
                  <>
                    {elementId && <span>•</span>}
                    <span>{bpmnFile}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  size="sm"
                  variant={providerMode === 'local-fallback' ? 'default' : 'outline'}
                  onClick={() => setProviderMode('local-fallback')}
                >
                  Lokal fallback
                </Button>
                <Button
                  size="sm"
                  variant={providerMode === 'chatgpt' ? 'default' : 'outline'}
                  onClick={() => setProviderMode('chatgpt')}
                >
                  ChatGPT
                </Button>
                <Button
                  size="sm"
                  variant={providerMode === 'ollama' ? 'default' : 'outline'}
                  onClick={() => setProviderMode('ollama')}
                >
                  Ollama
                </Button>
              </div>
            </div>
          </div>

          {/* Summary section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{filteredTests.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {filteredTests.length === 1 ? 'Kört test' : 'Körda tester'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {filteredTests.filter(t => t.status === 'passing').length} passerade • {filteredTests.filter(t => t.status === 'failing').length} misslyckade
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{implementedTestFile ? 1 : 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Implementerade testfiler
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {implementedTestFile && tests.length === 0 ? 'Ej körda ännu' : implementedTestFile ? 'Körda' : 'Inga'}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {plannedScenarioCountForCurrentProvider}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Planerade scenarion (vald provider)
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Designade men ej implementerade
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {tests.length === 0 && !implementedTestFile && plannedScenariosByProvider.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Inga tester är kopplade till den här noden ännu.
                </div>
              </CardContent>
            </Card>
          )}

          {implementedTestFile && tests.length === 0 && (
            <Card className="mb-6 border-dashed border-amber-400/70 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span>🧪 Test implementerat men ej kört</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Det finns en genererad testfil för denna nod, men inga körda testresultat är inrapporterade ännu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs truncate">{implementedTestFile}</p>
                  {bpmnFile && elementId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        navigate(
                          `/node-test-script?bpmnFile=${encodeURIComponent(
                            bpmnFile,
                          )}&elementId=${encodeURIComponent(elementId)}`,
                        )
                      }
                    >
                      Visa testscript
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {tests.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      Testfall ({filteredTests.length})
                    </CardTitle>
                    <CardDescription>
                      Detaljerad lista över alla testfall som är kopplade till denna BPMN-nod
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Testnamn</TableHead>
                    <TableHead>Fil</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Senast körd</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map(test => (
                    <TableRow 
                      key={test.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        if (test.bpmnFile && test.bpmnElementId) {
                          navigate(`/?file=${encodeURIComponent(test.bpmnFile)}&element=${test.bpmnElementId}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {test.title}
                        {test.variant && (
                          <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-muted text-muted-foreground">
                            {test.scriptProvider === 'local-fallback'
                              ? 'Lokal fallback'
                              : test.scriptProvider === 'chatgpt'
                              ? 'ChatGPT'
                              : test.scriptProvider === 'ollama'
                              ? 'Ollama'
                              : test.variant === 'local-fallback'
                              ? 'Lokal fallback'
                              : test.variant === 'llm'
                              ? 'LLM'
                              : 'Okänd'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            const file = test.bpmnFile || bpmnFile;
                            const element = test.bpmnElementId || elementId;
                            if (file && element) {
                              const variantParam =
                                test.variant === 'local-fallback'
                                  ? 'local'
                                  : test.variant === 'llm'
                                  ? 'llm'
                                  : undefined;
                              const baseUrl = `/node-test-script?bpmnFile=${encodeURIComponent(
                                file,
                              )}&elementId=${encodeURIComponent(element)}`;
                              const url = variantParam
                                ? `${baseUrl}&variant=${variantParam}`
                                : baseUrl;
                              navigate(
                                url,
                              );
                            }
                          }}
                          title="Visa testscript för denna nod"
                        >
                          {test.fileName}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg">{getStatusIcon(test.status)}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDate(test.lastRunAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {test.duration ? `${test.duration}s` : '–'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const file = test.bpmnFile || bpmnFile;
                            const element = test.bpmnElementId || elementId;
                            if (file && element) {
                              const variantParam =
                                test.variant === 'local-fallback'
                                  ? 'local'
                                  : test.variant === 'llm'
                                  ? 'llm'
                                  : undefined;
                              const baseUrl = `/node-test-script?bpmnFile=${encodeURIComponent(
                                file,
                              )}&elementId=${encodeURIComponent(element)}`;
                              const url = variantParam
                                ? `${baseUrl}&variant=${variantParam}`
                                : baseUrl;
                              navigate(
                                url,
                              );
                            }
                          }}
                          title="Visa testscript för denna nod"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

          {plannedScenariosByProvider.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span>📝 Planerade scenarion</span>
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  Designade testscenarion kopplade till denna nod. Dessa representerar målbilden och är
                  inte nödvändigtvis implementerade eller körda ännu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentSet = plannedScenariosByProvider.find(
                    (s) => s.provider === providerMode,
                  );
                  const scenarios = currentSet?.scenarios ?? [];

                  if (!scenarios.length) {
                    return (
                      <div className="text-xs text-muted-foreground py-4">
                        Inga planerade scenarion lagrade för{' '}
                        {providerMode === 'local-fallback'
                          ? 'Lokal fallback'
                          : providerMode === 'chatgpt'
                          ? 'ChatGPT'
                          : 'Ollama'}
                        . Generera dokumentation/tester med denna provider för att fylla dem.
                      </div>
                    );
                  }

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Namn</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Beskrivning</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scenarios.map((scenario) => (
                          <TableRow key={scenario.id}>
                            <TableCell className="font-medium text-sm">
                              {scenario.name}
                              {scenario.contextWarning && (
                                <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800">
                                  Kontext-osäker
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {scenario.category}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {scenario.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default NodeTestsPage;
