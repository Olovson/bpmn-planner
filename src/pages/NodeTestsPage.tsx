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
  const [variantFilter, setVariantFilter] = useState<'all' | 'local-fallback' | 'chatgpt' | 'ollama'>('all');
  const [plannedProvider, setPlannedProvider] = useState<'local-fallback' | 'chatgpt' | 'ollama'>('local-fallback');

  const filteredTests = useMemo(
    () =>
      tests.filter((test) => {
        if (variantFilter === 'all') return true;
        if (variantFilter === 'local-fallback') {
          return test.variant === 'local-fallback';
        }
        if (variantFilter === 'chatgpt') {
          return test.scriptProvider === 'chatgpt';
        }
        if (variantFilter === 'ollama') {
          return test.scriptProvider === 'ollama';
        }
        return true;
      }),
    [tests, variantFilter],
  );

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
    else navigate('/test-report');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden">
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
    <div className="flex min-h-screen bg-background overflow-hidden">
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

      <main className="flex-1 min-w-0 overflow-auto container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Testrapport för {nodeInfo?.name || elementId || nodeId || 'okänd nod'}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {elementId && <span className="font-mono">{elementId}</span>}
              {bpmnFile && (
                <>
                  {elementId && <span>•</span>}
                  <span>{bpmnFile}</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/test-report')}
          >
            Tillbaka till testrapport
          </Button>
        </div>

        {/* Summary section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  {plannedScenariosByProvider.reduce(
                    (sum, set) => sum + (set.scenarios?.length ?? 0),
                    0,
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Planerade scenarion (alla providers)
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
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    size="sm"
                    variant={variantFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setVariantFilter('all')}
                  >
                    Alla
                  </Button>
                  <Button
                    size="sm"
                    variant={variantFilter === 'local-fallback' ? 'default' : 'outline'}
                    onClick={() => setVariantFilter('local-fallback')}
                  >
                    Lokal fallback
                  </Button>
                  <Button
                    size="sm"
                    variant={variantFilter === 'chatgpt' ? 'default' : 'outline'}
                    onClick={() => setVariantFilter('chatgpt')}
                  >
                    ChatGPT
                  </Button>
                  <Button
                    size="sm"
                    variant={variantFilter === 'ollama' ? 'default' : 'outline'}
                    onClick={() => setVariantFilter('ollama')}
                  >
                    Ollama
                  </Button>
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
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    size="sm"
                    variant={plannedProvider === 'local-fallback' ? 'default' : 'outline'}
                    onClick={() => setPlannedProvider('local-fallback')}
                  >
                    Lokal fallback
                  </Button>
                  <Button
                    size="sm"
                    variant={plannedProvider === 'chatgpt' ? 'default' : 'outline'}
                    onClick={() => setPlannedProvider('chatgpt')}
                  >
                    ChatGPT
                  </Button>
                  <Button
                    size="sm"
                    variant={plannedProvider === 'ollama' ? 'default' : 'outline'}
                    onClick={() => setPlannedProvider('ollama')}
                  >
                    Ollama
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                Designade testscenarion kopplade till denna nod. Dessa representerar målbilden och är
                inte nödvändigtvis implementerade eller körda ännu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentSet = plannedScenariosByProvider.find(
                  (s) => s.provider === plannedProvider,
                );
                const scenarios = currentSet?.scenarios ?? [];

                if (!scenarios.length) {
                  return (
                    <div className="text-xs text-muted-foreground py-4">
                      Inga planerade scenarion lagrade för{' '}
                      {plannedProvider === 'local-fallback'
                        ? 'Lokal fallback'
                        : plannedProvider === 'chatgpt'
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
      </main>
    </div>
  );
};

export default NodeTestsPage;
