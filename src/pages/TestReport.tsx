import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, FileCode, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { testMapping, getAllTests } from '@/data/testMapping';
import { useTestResults } from '@/hooks/useTestResults';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';

const TestReport = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: coverageMap } = useAllFilesArtifactCoverage();
  const { testResults, isLoading, stats } = useTestResults();

  const [statusFilter, setStatusFilter] = useState<'all' | 'passing' | 'failing' | 'pending' | 'skipped'>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

  // KPI: coverage från coverageMap + test_results + testMapping
  const coverageSummary = useMemo(() => {
    let totalNodes = 0;
    let implementedNodes = 0;

    if (coverageMap) {
      for (const coverage of coverageMap.values()) {
        totalNodes += coverage.total_nodes;
        implementedNodes += coverage.tests.covered;
      }
    }

    const executedNodeIds = new Set(
      (testResults || [])
        .map((r) => r.node_id)
        .filter((id): id is string => Boolean(id)),
    );

    const implementedCoverage =
      totalNodes > 0 ? (implementedNodes / totalNodes) * 100 : 0;
    const executedCoverage =
      totalNodes > 0 ? (executedNodeIds.size / totalNodes) * 100 : 0;

    const allNodes = Object.keys(elementResourceMapping);
    const nodesWithPlannedScenarios = Object.keys(testMapping);

    return {
      totalNodes,
      implementedNodes,
      executedNodeCount: executedNodeIds.size,
      implementedCoverage,
      executedCoverage,
      plannedNodesCount: nodesWithPlannedScenarios.length,
      passRate: stats.total > 0 ? (stats.passing / stats.total) * 100 : 0,
    };
  }, [coverageMap, testResults, stats]);

  const allTests = useMemo(() => getAllTests(), []);

  const testsWithDerivedProcess = useMemo(() => {
    return testResults.map((result) => {
      // Försök att hitta BPMN-fil via elementResourceMapping
      let inferredFile: string | null = null;
      if (result.node_id && elementResourceMapping[result.node_id]?.bpmnFile) {
        inferredFile = elementResourceMapping[result.node_id]?.bpmnFile || null;
      } else if (result.test_file) {
        // Grov heuristik: plocka ut "mortgage" eller liknande från filnamnet
        const match = result.test_file.match(/([^/]+)\.spec\.ts$/);
        if (match) inferredFile = `${match[1]}.bpmn`;
      }
      return { ...result, inferredFile };
    });
  }, [testResults]);

  const processOptions = useMemo(() => {
    const files = new Set<string>();
    testsWithDerivedProcess.forEach((t) => {
      if (t.inferredFile) files.add(t.inferredFile);
    });
    return Array.from(files).sort();
  }, [testsWithDerivedProcess]);

  const filteredExecutedTests = useMemo(() => {
    return testsWithDerivedProcess
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (processFilter !== 'all' && t.inferredFile !== processFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const aTime = a.executed_at ? new Date(a.executed_at).getTime() : 0;
        const bTime = b.executed_at ? new Date(b.executed_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [testsWithDerivedProcess, statusFilter, processFilter]);

  const processNodes = useMemo(() => {
    // Grupp­era nod‑id per BPMN‑fil utifrån elementResourceMapping
    const mapping: Record<string, string[]> = {};
    Object.entries(elementResourceMapping).forEach(([nodeId, meta]) => {
      const file = meta.bpmnFile || 'Okänd fil';
      if (!mapping[file]) mapping[file] = [];
      mapping[file].push(nodeId);
    });
    return mapping;
  }, []);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'files') navigate('/files');
    else navigate('/test-report');
  };

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

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Top-summary (KPI-rad) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Processnoder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {coverageSummary.totalNodes}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Totalt antal BPMN‑noder som kan ha tester
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Noder med implementerade tester
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {coverageSummary.implementedNodes}
                  </div>
                  <Progress value={coverageSummary.implementedCoverage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    🧪 Implementerad testfil för {coverageSummary.implementedNodes} /{' '}
                    {coverageSummary.totalNodes} noder
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Noder med körda tester
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {coverageSummary.executedNodeCount}
                  </div>
                  <Progress value={coverageSummary.executedCoverage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    ✔ Minst ett testresultat för {coverageSummary.executedNodeCount} noder
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Planerade scenarion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {allTests.reduce(
                      (sum, t) => sum + (t.scenarios?.length ?? 0),
                      0,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scenarion definierade i genererade testfiler (designnivå)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Banner när inga körda tester finns */}
          {stats.total === 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Inga körda tester är rapporterade ännu.
                  </p>
                  <p className="text-xs">
                    Vi visar nu bara planerade scenarion och node‑coverage baserat på
                    genererade testfiler. När Playwright‑körningar börjar rapporteras
                    till <code>test_results</code> kommer denna vy att visa verkliga
                    resultat.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sektion 2: Körda tester (verklighet) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Körda tester
              </CardTitle>
              <CardDescription>
                Sammanställning av verkliga testkörningar från{' '}
                <code>test_results</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto max-w-full">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    Filtrera på status:
                  </span>
                  {(['all', 'passing', 'failing', 'pending', 'skipped'] as const).map(
                    (status) => (
                      <Button
                        key={status}
                        size="xs"
                        variant={statusFilter === status ? 'default' : 'outline'}
                        className="text-xs"
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === 'all' ? 'Alla' : status}
                      </Button>
                    ),
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    Filtrera på BPMN‑fil:
                  </span>
                  <Button
                    size="xs"
                    variant={processFilter === 'all' ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => setProcessFilter('all')}
                  >
                    Alla
                  </Button>
                  {processOptions.map((file) => (
                    <Button
                      key={file}
                      size="xs"
                      variant={processFilter === file ? 'default' : 'outline'}
                      className="text-xs"
                      onClick={() => setProcessFilter(file)}
                    >
                      {file}
                    </Button>
                  ))}
                </div>
              </div>

              {isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Laddar testresultat...
                </div>
              )}

              {!isLoading && stats.total === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Inga körda tester är rapporterade ännu. Kör Playwright‑tester och skriv
                  in resultat i <code>test_results</code> för att se dem här.
                </div>
              )}

              {!isLoading && stats.total > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Process/BPMN‑fil</TableHead>
                      <TableHead>Nod</TableHead>
                      <TableHead>Testfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Senast körd</TableHead>
                      <TableHead>Antal testfall</TableHead>
                      <TableHead>GitHub‑run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExecutedTests.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="text-sm">
                          {result.inferredFile || '–'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {result.node_name || result.node_id || 'Okänd nod'}
                            </span>
                            {result.node_id && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {result.node_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {result.test_file?.replace('tests/', '') || '–'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge
                            variant={
                              result.status === 'passing'
                                ? 'default'
                                : result.status === 'failing'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="gap-1 text-xs"
                          >
                            {result.status === 'passing' && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {result.status === 'failing' && (
                              <XCircle className="h-3 w-3" />
                            )}
                            {result.status === 'pending' && (
                              <Clock className="h-3 w-3" />
                            )}
                            {result.status === 'skipped' && (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            <span className="capitalize">{result.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.executed_at
                            ? new Date(result.executed_at).toLocaleString('sv-SE')
                            : '–'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {typeof result.test_count === 'number'
                            ? result.test_count
                            : '–'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.github_run_url ? (
                            <a
                              href={result.github_run_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Öppna run
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Sektion 3: Planerade scenarion & coverage (designnivå) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Planerade scenarion & coverage
              </CardTitle>
              <CardDescription>
                Jämför BPMN‑noder mot planerade scenarion (design) och körda tester
                (verklighet).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Coverage per BPMN‑fil */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Coverage per BPMN‑fil</p>
                <div className="overflow-x-auto max-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BPMN‑fil</TableHead>
                        <TableHead>Total noder</TableHead>
                        <TableHead>Noder med scenarion</TableHead>
                        <TableHead>Noder med körda tester</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(processNodes)
                        .map(([fileName, nodes]) => {
                          const plannedNodes = nodes.filter((id) => testMapping[id]);
                          const executedNodeIds = new Set(
                            testResults
                              .map((r) => r.node_id)
                              .filter((id): id is string => Boolean(id)),
                          );
                          const executedNodes = nodes.filter((id) =>
                            executedNodeIds.has(id),
                          );
                          return { fileName, nodes, plannedNodes, executedNodes };
                        })
                        .sort((a, b) => a.fileName.localeCompare(b.fileName))
                        .map(({ fileName, nodes, plannedNodes, executedNodes }) => (
                          <TableRow
                            key={fileName}
                            className={
                              selectedProcess === fileName ? 'bg-muted/40' : ''
                            }
                            onClick={() =>
                              setSelectedProcess((prev) =>
                                prev === fileName ? 'all' : fileName,
                              )
                            }
                          >
                            <TableCell className="font-medium text-sm">
                              {fileName}
                            </TableCell>
                            <TableCell className="text-sm">{nodes.length}</TableCell>
                            <TableCell className="text-sm">
                              {plannedNodes.length}
                            </TableCell>
                            <TableCell className="text-sm">
                              {executedNodes.length}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Nod‑läge för vald process */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Nod‑läge{' '}
                  {selectedProcess !== 'all'
                    ? `för ${selectedProcess}`
                    : '(alla processer)'}
                </p>
                <div className="overflow-x-auto max-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nod</TableHead>
                        <TableHead>Planerade scenarion</TableHead>
                        <TableHead>Körda tester</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(elementResourceMapping)
                        .filter(([_, meta]) =>
                          selectedProcess === 'all'
                            ? true
                            : meta.bpmnFile === selectedProcess,
                        )
                        .map(([nodeId, meta]) => {
                          const testInfo = testMapping[nodeId];
                          const plannedScenarioCount =
                            testInfo?.scenarios?.length || 0;
                          const hasExecuted = testResults.some(
                            (r) => r.node_id === nodeId,
                          );

                          return (
                            <TableRow key={nodeId}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {meta.displayName || nodeId}
                                  </span>
                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    {nodeId}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {plannedScenarioCount > 0 ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-blue-500/10 text-blue-700 border-blue-200"
                                  >
                                    {plannedScenarioCount} scenarion
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Inga scenarion definierade
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {hasExecuted ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                  >
                                    Minst ett testresultat
                                  </Badge>
                                ) : plannedScenarioCount > 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    Scenarion finns, men inga körda tester
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Inga tester definierade
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TestReport;

