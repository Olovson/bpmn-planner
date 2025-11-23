// Global test report page:
// - Aggregated view over all BPMN-filer och noder
// - Filtrering på provider (local/chatgpt/ollama), process, status m.m.
// - Ska INTE vara nodspecifik – det hanteras av NodeTestsPage (/node-tests)
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, FileCode, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { testMapping, getAllTests, type TestScenario } from '@/data/testMapping';
import { useTestResults } from '@/hooks/useTestResults';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';
import { SUBPROCESS_REGISTRY, type NodeType } from '@/data/subprocessRegistry';
import { useFilePlannedScenarios } from '@/hooks/useFilePlannedScenarios';
import { useBpmnFileTestableNodes } from '@/hooks/useBpmnFileTestableNodes';
import { useGlobalPlannedScenarios } from '@/hooks/useGlobalPlannedScenarios';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';

type UiScenario = TestScenario & { _source?: string };
type ProviderScope = 'local-fallback' | 'chatgpt' | 'ollama';
import {
  TestReportFilters,
  type TestDocTypeFilter,
  type TestStatusFilter,
} from '@/components/TestReportFilters';
import {
  applyExecutedTestsFilter,
  applyPlannedNodesFilter,
} from '@/lib/testReportFiltering';
import { DocVariantBadges } from '@/components/DocVariantBadges';
import { getNodeDocViewerPath } from '@/lib/nodeArtifactPaths';

const TestReport = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: coverageMap } = useAllFilesArtifactCoverage();
  const { testResults, isLoading, stats } = useTestResults();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProvider = searchParams.get('provider') as ProviderScope | null;

  const providerScope: ProviderScope = urlProvider || 'local-fallback';

  const [statusFilter, setStatusFilter] = useState<TestStatusFilter>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [executedTypeFilter, setExecutedTypeFilter] =
    useState<TestDocTypeFilter>('all');
  const [plannedStatusFilter, setPlannedStatusFilter] =
    useState<TestStatusFilter>('all');
  const [plannedTypeFilter, setPlannedTypeFilter] =
    useState<TestDocTypeFilter>('all');
  const [plannedProcessFilter, setPlannedProcessFilter] = useState<string>('all');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const activeBpmnFile =
    plannedProcessFilter !== 'all' ? plannedProcessFilter : null;

  const { summary: plannedSummary } = useFilePlannedScenarios(activeBpmnFile);
  const { nodes: testableNodes } = useBpmnFileTestableNodes(activeBpmnFile || undefined);
  const { summary: globalPlannedSummary } = useGlobalPlannedScenarios();
  const { nodes: allBpmnNodes } = useAllBpmnNodes();

  const setProviderScope = (provider: ProviderScope) => {
    const next = new URLSearchParams(searchParams);
    next.set('provider', provider);
    setSearchParams(next, { replace: false });
  };

  const nodeTypeById = useMemo(() => {
    const map: Record<string, NodeType> = {};
    SUBPROCESS_REGISTRY.forEach((sp) => {
      map[sp.id] = sp.nodeType;
    });
    return map;
  }, []);

  // Används för att aktivera/inaktivera provider-knappar baserat på om det finns data
  const providerHasData = useMemo(() => {
    const flags: Record<ProviderScope, boolean> = {
      'local-fallback': false,
      chatgpt: false,
      ollama: false,
    };

    // Körda tester
    (testResults || []).forEach((r) => {
      const p = (r.script_provider ?? null) as ProviderScope | null;
      if (p && p in flags) {
        flags[p] = true;
      }
    });

    // Planerade scenarion per fil
    if (plannedSummary) {
      plannedSummary.byNode.forEach((node) => {
        node.byProvider.forEach((p) => {
          const prov = p.provider as ProviderScope;
          if (prov in flags && (p.scenarios?.length ?? 0) > 0) {
            flags[prov] = true;
          }
        });
      });
    }

    // Globala planerade scenarion
    if (globalPlannedSummary) {
      globalPlannedSummary.nodes.forEach((node) => {
        node.byProvider.forEach((p) => {
          const prov = p.provider as ProviderScope;
          if (prov in flags && (p.scenarios?.length ?? 0) > 0) {
            flags[prov] = true;
          }
        });
      });
    }

    return flags;
  }, [testResults, plannedSummary, globalPlannedSummary]);

  // KPI: coverage från coverageMap + test_results + node_planned_scenarios (per fil om vald, annars global)
  const coverageSummary = useMemo(() => {
    let totalNodes = 0;
    let implementedNodes = 0;

    if (coverageMap) {
      if (activeBpmnFile && coverageMap.has(activeBpmnFile)) {
        const coverage = coverageMap.get(activeBpmnFile)!;
        totalNodes = coverage.total_nodes;
        implementedNodes = coverage.tests.covered;
      } else {
        for (const coverage of coverageMap.values()) {
          totalNodes += coverage.total_nodes;
          implementedNodes += coverage.tests.covered;
        }
      }
    }

    const filteredResults = (testResults || []).filter((r) => {
      const matchesFile = activeBpmnFile ? r.bpmn_file === activeBpmnFile : true;
      const provider = (r.script_provider ?? null) as ProviderScope | null;
      const matchesProvider = provider === providerScope;
      return matchesFile && matchesProvider;
    });

    const executedNodeIds = new Set(
      filteredResults
        .map((r) => r.node_id)
        .filter((id): id is string => Boolean(id)),
    );

    const implementedCoverage =
      totalNodes > 0 ? (implementedNodes / totalNodes) * 100 : 0;
    const executedCoverage =
      totalNodes > 0 ? (executedNodeIds.size / totalNodes) * 100 : 0;

    let plannedNodesCount = 0;
    if (activeBpmnFile && plannedSummary) {
      plannedNodesCount = plannedSummary.byNode.filter((node) =>
        node.byProvider.some(
          (p) =>
            p.provider === providerScope &&
            (p.scenarios?.length ?? 0) > 0,
        ),
      ).length;
    } else if (globalPlannedSummary) {
      plannedNodesCount = globalPlannedSummary.nodes.filter((node) =>
        node.byProvider.some(
          (p) =>
            p.provider === providerScope &&
            (p.scenarios?.length ?? 0) > 0,
        ),
      ).length;
    } else {
      plannedNodesCount = 0;
    }

    const latestRun =
      filteredResults.length
        ? filteredResults
            .slice()
            .sort((a, b) => {
              const aTime = a.last_run ? new Date(a.last_run).getTime() : 0;
              const bTime = b.last_run ? new Date(b.last_run).getTime() : 0;
              return bTime - aTime;
            })[0].last_run
        : null;

    const passingCount = filteredResults.filter(
      (r) => r.status === 'passing',
    ).length;

    return {
      totalNodes,
      implementedNodes,
      executedNodeCount: executedNodeIds.size,
      implementedCoverage,
      executedCoverage,
      plannedNodesCount,
      passRate:
        filteredResults.length > 0
          ? (passingCount / filteredResults.length) * 100
          : 0,
      latestRun,
    };
  }, [coverageMap, testResults, activeBpmnFile, plannedSummary, providerScope]);

  const allTests = useMemo(() => getAllTests(), []);

  const plannedScenarioTotal = useMemo(() => {
    if (activeBpmnFile && plannedSummary) {
      return plannedSummary.byNode.reduce((sum, node) => {
        const providerEntry = node.byProvider.find(
          (p) => p.provider === providerScope,
        );
        return sum + (providerEntry?.scenarios?.length ?? 0);
      }, 0);
    }

    if (globalPlannedSummary) {
      return globalPlannedSummary.nodes.reduce((sum, node) => {
        const providerEntry = node.byProvider.find(
          (p) => p.provider === providerScope,
        );
        return sum + (providerEntry?.scenarios?.length ?? 0);
      }, 0);
    }

    return allTests.reduce(
      (sum, t) => sum + (t.scenarios?.length ?? 0),
      0,
    );
  }, [plannedSummary, globalPlannedSummary, allTests, activeBpmnFile, providerScope]);

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

      // Primär BPMN-fil för filtret: använd bpmn_file från backend om den finns,
      // annars fall tillbaka till inferredFile-heuristiken.
      const bpmnFile =
        (result as any).bpmn_file && typeof (result as any).bpmn_file === 'string'
          ? (result as any).bpmn_file
          : inferredFile;

      // Härleder typ (Feature Goal / Epic / Business Rule) från nodeType
      let docType: 'feature-goal' | 'epic' | 'business-rule' | null = null;
      if (result.node_id) {
        const nodeType = nodeTypeById[result.node_id];
        if (nodeType === 'CallActivity') {
          docType = 'feature-goal';
        } else if (nodeType === 'UserTask' || nodeType === 'ServiceTask') {
          docType = 'epic';
        } else if (nodeType === 'BusinessRuleTask') {
          docType = 'business-rule';
        }
      }

      return { ...result, inferredFile, bpmnFile, docType };
    });
  }, [testResults, nodeTypeById]);

  const processOptions = useMemo(() => {
    const files = new Set<string>();
    testsWithDerivedProcess.forEach((t) => {
      if (t.bpmnFile) files.add(t.bpmnFile);
    });
    return Array.from(files).sort();
  }, [testsWithDerivedProcess]);

  const filteredExecutedTests = useMemo(() => {
    const base = applyExecutedTestsFilter(
      testsWithDerivedProcess,
      statusFilter,
      executedTypeFilter,
      processFilter,
    );

    return base.filter((t) => {
      if (!('script_provider' in t)) return false;
      const provider = (t as any).script_provider as
        | 'local-fallback'
        | 'chatgpt'
        | 'ollama'
        | null
        | undefined;
      return provider === providerScope;
    });
  }, [
    testsWithDerivedProcess,
    statusFilter,
    processFilter,
    executedTypeFilter,
    providerScope,
  ]);

  const plannedProcessOptions = useMemo(() => {
    const files = new Set<string>();
    if (coverageMap) {
      for (const key of coverageMap.keys()) {
        files.add(key);
      }
    }
    return Array.from(files).sort();
  }, [coverageMap]);

  const plannedNodesForView = useMemo(() => {
    // När vi har en aktiv fil och DB-data + BPMN-noder, använd dessa som sanning.
    if (activeBpmnFile && plannedSummary && testableNodes.length > 0) {
      const plannedById = new Map(
        plannedSummary.byNode.map((n) => [n.elementId, n]),
      );

      return testableNodes
        .filter((node) => {
          // Filtrera på typ
          const nodeType = node.type;
          if (
            plannedTypeFilter === 'feature-goal' &&
            nodeType !== 'CallActivity'
          ) {
            return false;
          }
          if (
            plannedTypeFilter === 'epic' &&
            nodeType !== 'UserTask' &&
            nodeType !== 'ServiceTask'
          ) {
            return false;
          }
          if (
            plannedTypeFilter === 'business-rule' &&
            nodeType !== 'BusinessRuleTask'
          ) {
            return false;
          }

          const planned = plannedById.get(node.id);
          const providerScopedCount =
            planned?.byProvider
              .filter((p) => p.provider === providerScope)
              .reduce(
                (sum, p) => sum + (p.scenarios?.length ?? 0),
                0,
              ) ?? 0;
          const hasPlanned = providerScopedCount > 0;

          if (plannedStatusFilter === 'all') {
            return true;
          }
          if (plannedStatusFilter === 'pending') {
            return hasPlanned;
          }
          if (plannedStatusFilter === 'passing') {
            // För planerade scenarion finns ännu inget explicit statusbegrepp,
            // så vi behandlar alla med scenarion som "aktiva".
            return hasPlanned;
          }
          if (plannedStatusFilter === 'failing') {
            return hasPlanned;
          }
          if (plannedStatusFilter === 'skipped') {
            return hasPlanned;
          }

          return true;
        })
        .map((node) => {
          const planned = plannedById.get(node.id);

          const plannedScenarios: UiScenario[] = [];
          if (planned) {
            for (const providerSet of planned.byProvider) {
              if (providerSet.provider !== providerScope) continue;
              const sourceLabel = `${providerSet.origin}/${providerSet.provider}`;
              for (const scenario of providerSet.scenarios) {
                plannedScenarios.push({
                  ...scenario,
                  _source: sourceLabel,
                });
              }
            }
          }
          const hasExecuted = testResults.some(
            (r) =>
              r.bpmn_file === activeBpmnFile &&
              r.node_id === node.id &&
              ((r.script_provider ?? null) as ProviderScope | null) ===
                providerScope,
          );

          const meta = elementResourceMapping[node.id];
          const docId =
            (meta?.bpmnFile || activeBpmnFile) && node.id
              ? getNodeDocViewerPath(
                  meta?.bpmnFile || activeBpmnFile,
                  node.id,
                )
              : null;

          return {
            id: node.id,
            displayName: node.name || node.id,
            plannedScenarios,
            hasExecuted,
            docId,
          };
        });
    }

    // Global vy: använd globalPlannedSummary + alla BPMN-noder när ingen aktiv fil är vald.
    if (globalPlannedSummary && allBpmnNodes.length > 0) {
      const nodesByKey = new Map(
        allBpmnNodes.map((n) => [
          `${n.bpmnFile}::${n.elementId}`,
          n,
        ]),
      );

      return globalPlannedSummary.nodes
        .filter((node) => {
          // Filfilter
          if (
            plannedProcessFilter !== 'all' &&
            node.bpmnFile !== plannedProcessFilter
          ) {
            return false;
          }

          const bpmnNode = nodesByKey.get(
            `${node.bpmnFile}::${node.elementId}`,
          );
          const nodeType = bpmnNode?.nodeType;

          if (
            plannedTypeFilter === 'feature-goal' &&
            nodeType !== 'CallActivity'
          ) {
            return false;
          }
          if (
            plannedTypeFilter === 'epic' &&
            nodeType !== 'UserTask' &&
            nodeType !== 'ServiceTask'
          ) {
            return false;
          }
          if (
            plannedTypeFilter === 'business-rule' &&
            nodeType !== 'BusinessRuleTask'
          ) {
            return false;
          }

          const providerScopedCount =
            node.byProvider
              .filter((p) => p.provider === providerScope)
              .reduce(
                (sum, p) => sum + (p.scenarios?.length ?? 0),
                0,
              ) ?? 0;
          const hasPlanned = providerScopedCount > 0;

          if (plannedStatusFilter === 'all') {
            return true;
          }
          if (plannedStatusFilter === 'pending') {
            return hasPlanned;
          }
          if (plannedStatusFilter === 'passing') {
            return hasPlanned;
          }
          if (plannedStatusFilter === 'failing') {
            return hasPlanned;
          }
          if (plannedStatusFilter === 'skipped') {
            return hasPlanned;
          }

          return true;
        })
        .map((node) => {
          const bpmnNode = nodesByKey.get(
            `${node.bpmnFile}::${node.elementId}`,
          );

          const plannedScenarios: UiScenario[] = [];
          for (const providerSet of node.byProvider) {
            if (providerSet.provider !== providerScope) continue;
            const sourceLabel = `${providerSet.origin}/${providerSet.provider}`;
            for (const scenario of providerSet.scenarios) {
              plannedScenarios.push({
                ...scenario,
                _source: sourceLabel,
              });
            }
          }

          const hasExecuted = testResults.some((r) => {
            const matchesFile =
              (r as any).bpmn_file === node.bpmnFile;
            const matchesNode = r.node_id === node.elementId;
            const provider = (r.script_provider ??
              null) as ProviderScope | null;
            const matchesProvider = provider === providerScope;
            return matchesFile && matchesNode && matchesProvider;
          });

          const docId =
            bpmnNode &&
            getNodeDocViewerPath(
              bpmnNode.bpmnFile,
              bpmnNode.elementId,
            );

          return {
            id: node.elementId,
            displayName:
              bpmnNode?.elementName || node.elementId,
            plannedScenarios,
            hasExecuted,
            docId,
          };
        });
    }

    // Fallback: använd legacy elementResourceMapping/testMapping om inget annat finns.
    const filteredNodeIds = applyPlannedNodesFilter(
      elementResourceMapping,
      nodeTypeById,
      plannedTypeFilter,
      plannedProcessFilter,
    );

    return filteredNodeIds.map((nodeId) => {
      const meta = elementResourceMapping[nodeId];
      const testInfo = testMapping[nodeId];
      const plannedScenarios: UiScenario[] =
        testInfo?.scenarios?.map((s) => ({
          ...s,
          _source: 'design/local-fallback',
        })) ?? [];
      const hasExecuted = testResults.some((r) => r.node_id === nodeId);
      const docId =
        meta?.bpmnFile && nodeId
          ? getNodeDocViewerPath(meta.bpmnFile, nodeId)
          : null;

      return {
        id: nodeId,
        displayName: meta?.displayName || nodeId,
        plannedScenarios,
        hasExecuted,
        docId,
      };
    });
  }, [
    activeBpmnFile,
    plannedSummary,
    testableNodes,
    globalPlannedSummary,
    allBpmnNodes,
    plannedTypeFilter,
    plannedStatusFilter,
    nodeTypeById,
    plannedProcessFilter,
    testResults,
    providerScope,
  ]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'files') navigate('/files');
    else navigate('/test-report');
  };

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
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-foreground">
              Testrapport
            </h1>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant="outline" className="text-xs">
                {activeBpmnFile
                  ? `Scope: ${activeBpmnFile}`
                  : 'Scope: alla BPMN-filer'}
              </Badge>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Provider:</span>
                <button
                  type="button"
                  className={`px-2 py-1 rounded border ${
                    providerScope === 'local-fallback'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                  onClick={() => setProviderScope('local-fallback')}
                >
                  Lokal fallback
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded border ${
                    providerScope === 'chatgpt'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                  onClick={() => providerHasData['chatgpt'] && setProviderScope('chatgpt')}
                  disabled={!providerHasData['chatgpt']}
                >
                  ChatGPT
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded border ${
                    providerScope === 'ollama'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                  onClick={() => providerHasData['ollama'] && setProviderScope('ollama')}
                  disabled={!providerHasData['ollama']}
                >
                  Ollama
                </button>
              </div>
            </div>
          </div>
          {/* Top-summary (KPI-rad) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Planerade scenarion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {plannedScenarioTotal}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scenarion definierade för valda BPMN-filen
                    {activeBpmnFile ? '' : ' (global designnivå)'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Noder med scenarion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {coverageSummary.plannedNodesCount}
                  </div>
                  <Progress
                    value={
                      coverageSummary.totalNodes > 0
                        ? (coverageSummary.plannedNodesCount / coverageSummary.totalNodes) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Noder med minst ett planerat scenario av{' '}
                    {coverageSummary.totalNodes} möjliga
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
                  <p className="text-[11px] text-muted-foreground">
                    {coverageSummary.latestRun
                      ? `Senaste körning: ${new Date(
                          coverageSummary.latestRun,
                        ).toLocaleString()} – pass-rate ca ${coverageSummary.passRate.toFixed(
                          0,
                        )}%`
                      : 'Inga körda tester ännu'}
                  </p>
                </div>
              </CardContent>
            </Card>

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
          </div>

          {/* Sektion 2: Planerade scenarion & coverage (designnivå) */}
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
              <TestReportFilters
                status={plannedStatusFilter}
                type={plannedTypeFilter}
                bpmnFile={plannedProcessFilter}
                bpmnOptions={plannedProcessOptions}
                onStatusChange={setPlannedStatusFilter}
                onTypeChange={setPlannedTypeFilter}
                onBpmnChange={setPlannedProcessFilter}
              />

              {/* Nod‑läge för vald process */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Nod‑läge{' '}
                  {plannedProcessFilter !== 'all'
                    ? `för ${plannedProcessFilter}`
                    : '(alla processer)'}
                </p>
                <div className="overflow-x-auto max-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>Nod</TableHead>
                        <TableHead>Planerade scenarion</TableHead>
                        <TableHead>Körda tester</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plannedNodesForView.map((node) => {
                        const plannedScenarioCount = node.plannedScenarios.length;
                        const isExpanded = expandedNodeId === node.id;

                        return (
                          <>
                            <TableRow
                              key={node.id}
                              className="cursor-pointer"
                              onClick={() => {
                                setExpandedNodeId((prev) =>
                                  prev === node.id ? null : node.id,
                                );
                              }}
                            >
                              <TableCell className="w-8 align-top text-center">
                                <span className="text-xs text-muted-foreground">
                                  {isExpanded ? '▾' : '▸'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {node.displayName}
                                    </span>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                      {node.id}
                                    </span>
                                  </div>
                                  {node.docId && (
                                    <DocVariantBadges docId={node.docId} compact />
                                  )}
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
                                {node.hasExecuted ? (
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
                            {isExpanded && plannedScenarioCount > 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="bg-muted/40">
                                  <div className="py-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Planerade scenarion för denna nod
                                    </p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-24 text-xs">
                                            Scenario-ID
                                          </TableHead>
                                          <TableHead className="text-xs">
                                            Beskrivning
                                          </TableHead>
                                          <TableHead className="w-24 text-xs">
                                            Typ
                                          </TableHead>
                                          <TableHead className="w-40 text-xs">
                                            Källa
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {node.plannedScenarios.map(
                                          (scenario) => (
                                            <TableRow
                                              key={scenario.id || scenario.name}
                                            >
                                              <TableCell className="text-xs font-mono">
                                                {scenario.id || '–'}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {scenario.description ||
                                                  scenario.name ||
                                                  '–'}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {scenario.type || '–'}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {scenario._source || '–'}
                                              </TableCell>
                                            </TableRow>
                                          ),
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banner när inga körda tester finns – placerad under Planerade scenarion & coverage */}
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

          {/* Sektion 3: Körda tester (verklighet) – sist på sidan */}
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
              <TestReportFilters
                status={statusFilter}
                type={executedTypeFilter}
                bpmnFile={processFilter}
                bpmnOptions={processOptions}
                onStatusChange={setStatusFilter}
                onTypeChange={setExecutedTypeFilter}
                onBpmnChange={setProcessFilter}
              />

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
                      <TableHead>Provider</TableHead>
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
                          {result.bpmnFile || result.inferredFile || '–'}
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
                          {(() => {
                            const provider = (result as any).script_provider as
                              | 'local-fallback'
                              | 'chatgpt'
                              | 'ollama'
                              | null
                              | undefined;
                            if (provider === 'local-fallback') return 'Lokal fallback';
                            if (provider === 'chatgpt') return 'ChatGPT';
                            if (provider === 'ollama') return 'Ollama';
                            return '–';
                          })()}
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
        </div>
      </main>
    </div>
  );
};

export default TestReport;
