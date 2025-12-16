import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { TestCoverageTable } from '@/components/TestCoverageTable';
import { scenarios as allScenarios } from '@/pages/E2eTestsOverviewPage';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';

export default function TestCoverageExplorerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: rootFile, isLoading: isLoadingRoot } = useRootBpmnFile();
  const { data: tree, isLoading: isLoadingTree, error } = useProcessTree(rootFile || 'mortgage.bpmn');

  const isLoading = isLoadingRoot || isLoadingTree;

  const e2eScenarios = useMemo(
    () => allScenarios.filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
    [],
  );

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    e2eScenarios.length > 0 ? e2eScenarios[0].id : '',
  );
  const { toast } = useToast();

  // Hjälpfunktion för att hitta test-information för en callActivity
  const findTestInfoForCallActivity = (
    callActivityId: string,
    scenarios: E2eScenario[],
    selectedScenarioId?: string,
  ) => {
    for (const scenario of scenarios) {
      if (selectedScenarioId && scenario.id !== selectedScenarioId) {
        continue;
      }
      const subprocessStep = scenario.subprocessSteps.find(
        (step) => step.callActivityId === callActivityId,
      );
      if (subprocessStep) {
        return { scenarioId: scenario.id, scenarioName: scenario.name, subprocessStep };
      }
    }
    return null;
  };

  // Hjälpfunktion för att bygga test-info map
  const buildTestInfoMap = (
    path: ProcessTreeNode[],
    scenarios: E2eScenario[],
    selectedScenarioId?: string,
  ) => {
    const testInfoMap = new Map();
    for (const node of path) {
      if (node.type === 'callActivity' && node.bpmnElementId) {
        const testInfo = findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId);
        if (testInfo) {
          testInfoMap.set(node.bpmnElementId, testInfo);
        }
      }
    }
    return testInfoMap;
  };

  // Flattena trädet till paths
  const flattenToPaths = (
    node: ProcessTreeNode,
    scenarios: E2eScenario[],
    selectedScenarioId: string | undefined,
    currentPath: ProcessTreeNode[] = [],
  ): Array<{ path: ProcessTreeNode[]; testInfoByCallActivity: Map<string, any> }> => {
    const newPath = [...currentPath, node];
    const rows: Array<{ path: ProcessTreeNode[]; testInfoByCallActivity: Map<string, any> }> = [];

    if (node.children.length === 0) {
      const testInfoByCallActivity = buildTestInfoMap(newPath, scenarios, selectedScenarioId);
      rows.push({ path: newPath, testInfoByCallActivity });
    } else {
      // Sortera barnen baserat på ProcessTree-ordningen (samma som Process Explorer)
      const sortedChildren = sortCallActivities(node.children);
      for (const child of sortedChildren) {
        rows.push(...flattenToPaths(child, scenarios, selectedScenarioId, newPath));
      }
    }

    return rows;
  };

  // Sortera paths baserat på ProcessTree-ordningen (samma logik som Process Explorer)
  const sortPathsByProcessTreeOrder = (
    pathRows: Array<{ path: ProcessTreeNode[]; testInfoByCallActivity: Map<string, any> }>,
  ) => {
    return [...pathRows].sort((a, b) => {
      // Jämför paths nivå för nivå
      const minLength = Math.min(a.path.length, b.path.length);

      for (let i = 0; i < minLength; i++) {
        const nodeA = a.path[i];
        const nodeB = b.path[i];

        // Om samma nod, fortsätt till nästa nivå
        if (nodeA.id === nodeB.id) {
          continue;
        }

        // Sortera baserat på visualOrderIndex, orderIndex, branchId, label (samma som sortCallActivities)
        const aVisual = nodeA.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        const bVisual = nodeB.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
        if (aVisual !== bVisual) {
          return aVisual - bVisual;
        }

        const aOrder = nodeA.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const bOrder = nodeB.orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        if (nodeA.branchId !== nodeB.branchId) {
          if (nodeA.branchId === 'main') return -1;
          if (nodeB.branchId === 'main') return 1;
          return (nodeA.branchId || '').localeCompare(nodeB.branchId || '');
        }

        return nodeA.label.localeCompare(nodeB.label);
      }

      // Om en path är kortare än den andra, den kortare kommer först
      return a.path.length - b.path.length;
    });
  };

  // Beräkna max djup
  const calculateMaxDepth = (node: ProcessTreeNode, currentDepth: number = 0): number => {
    if (node.children.length === 0) {
      return currentDepth + 1;
    }
    const childDepths = node.children.map((child) => calculateMaxDepth(child, currentDepth + 1));
    return Math.max(currentDepth + 1, ...childDepths);
  };

  // Export-funktion
  const exportToExcel = () => {
    if (!tree) return;

    try {
      const maxDepth = calculateMaxDepth(tree);
      let pathRows = flattenToPaths(tree, e2eScenarios, selectedScenarioId);
      
      // Sortera paths baserat på ProcessTree-ordningen (samma som Process Explorer)
      pathRows = sortPathsByProcessTreeOrder(pathRows);

      // Bygg en set över alla callActivityIds som faktiskt har entries i subprocessSteps
      const callActivityIdsWithTestInfo = new Set<string>();
      e2eScenarios.forEach((scenario) => {
        if (selectedScenarioId && scenario.id !== selectedScenarioId) {
          return;
        }
        scenario.subprocessSteps.forEach((step) => {
          if (step.callActivityId) {
            callActivityIdsWithTestInfo.add(step.callActivityId);
          }
        });
      });

      // Gruppera rader efter den lägsta callActivity med test-information
      const groupedRows = pathRows.map((pathRow) => {
        let callActivityNode: ProcessTreeNode | null = null;
        let testInfo: any = null;

        for (let i = pathRow.path.length - 1; i >= 0; i--) {
          const node = pathRow.path[i];
          if (node.type === 'callActivity' && node.bpmnElementId) {
            if (callActivityIdsWithTestInfo.has(node.bpmnElementId)) {
              const testInfoFromMap = pathRow.testInfoByCallActivity.get(node.bpmnElementId);
              if (testInfoFromMap) {
                callActivityNode = node;
                testInfo = testInfoFromMap;
                break;
              }
            }
          }
        }

        const groupKey = callActivityNode?.bpmnElementId || `no-test-info-${pathRow.path.map((n) => n.id).join('-')}`;

        return {
          pathRow,
          callActivityNode,
          testInfo,
          groupKey,
        };
      });

      // Sortera grupper baserat på path:ens faktiska ordning (samma som Process Explorer)
      // Men gruppera rader med samma groupKey tillsammans för rowspan
      groupedRows.sort((a, b) => {
        // Jämför paths nivå för nivå (samma logik som sortPathsByProcessTreeOrder)
        const pathA = a.pathRow.path;
        const pathB = b.pathRow.path;
        const minLength = Math.min(pathA.length, pathB.length);

        for (let i = 0; i < minLength; i++) {
          const nodeA = pathA[i];
          const nodeB = pathB[i];

          // Om samma nod, fortsätt till nästa nivå
          if (nodeA.id === nodeB.id) {
            continue;
          }

          // Sortera baserat på visualOrderIndex, orderIndex, branchId, label (samma som sortCallActivities)
          const aVisual = nodeA.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          const bVisual = nodeB.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          if (aVisual !== bVisual) {
            return aVisual - bVisual;
          }

          const aOrder = nodeA.orderIndex ?? Number.MAX_SAFE_INTEGER;
          const bOrder = nodeB.orderIndex ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          if (nodeA.branchId !== nodeB.branchId) {
            if (nodeA.branchId === 'main') return -1;
            if (nodeB.branchId === 'main') return 1;
            return (nodeA.branchId || '').localeCompare(nodeB.branchId || '');
          }

          return nodeA.label.localeCompare(nodeB.label);
        }

        // Om en path är kortare än den andra, den kortare kommer först
        return pathA.length - pathB.length;
      });

      // Beräkna rowspan för varje grupp
      const rowspanByGroup = new Map<string, number>();
      groupedRows.forEach((group) => {
        const count = rowspanByGroup.get(group.groupKey) || 0;
        rowspanByGroup.set(group.groupKey, count + 1);
      });

      // Förbered data för export
      const exportData: any[] = [];
      const shownGroups = new Set<string>();

      groupedRows.forEach((groupedRow) => {
        const { pathRow, testInfo, groupKey } = groupedRow;
        const { path } = pathRow;
        const isFirstInGroup = !shownGroups.has(groupKey);
        if (isFirstInGroup) {
          shownGroups.add(groupKey);
        }

        const row: any = {};

        // Hierarki-kolumner
        for (let i = 0; i < maxDepth; i++) {
          const node = path[i];
          if (node) {
            row[`Nivå ${i}`] = node.label || '';
            row[`Nivå ${i} - BPMN Fil`] = node.bpmnFile || '';
            row[`Nivå ${i} - Element ID`] = node.bpmnElementId || '';
          } else {
            row[`Nivå ${i}`] = '';
            row[`Nivå ${i} - BPMN Fil`] = '';
            row[`Nivå ${i} - Element ID`] = '';
          }
        }

        // Test-information (bara på första raden i gruppen)
        if (isFirstInGroup && testInfo) {
          row['Given'] = testInfo.subprocessStep.given || '';
          row['When'] = testInfo.subprocessStep.when || '';
          row['Then'] = testInfo.subprocessStep.then || '';
        } else {
          row['Given'] = '';
          row['When'] = '';
          row['Then'] = '';
        }

        exportData.push(row);
      });

      // Skapa worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Sätt kolumnbredder
      const colWidths: any[] = [];
      for (let i = 0; i < maxDepth; i++) {
        colWidths.push({ wch: 30 }); // Nivå X
        colWidths.push({ wch: 25 }); // Nivå X - BPMN Fil
        colWidths.push({ wch: 30 }); // Nivå X - Element ID
      }
      colWidths.push({ wch: 50 }); // Given
      colWidths.push({ wch: 50 }); // When
      colWidths.push({ wch: 50 }); // Then
      ws['!cols'] = colWidths;

      // Skapa workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Test Coverage');

      // Generera filnamn med timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `test-coverage_${timestamp}.xlsx`;

      // Skriv fil
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Export slutförd',
        description: `${exportData.length} rader exporterade till ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export misslyckades',
        description: error instanceof Error ? error.message : 'Ett fel uppstod vid export',
        variant: 'destructive',
      });
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'e2e-tests') navigate('/e2e-tests');
    else if (view === 'test-coverage') navigate('/test-coverage');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/test-coverage');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? null}
          currentView="test-coverage"
          onViewChange={handleViewChange}
          onOpenVersions={() => navigate('/')}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="ml-16 p-6 flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Laddar täckningsvy...</div>
        </main>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? null}
          currentView="test-coverage"
          onViewChange={handleViewChange}
          onOpenVersions={() => navigate('/')}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="ml-16 p-6 flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-lg">
            <AlertDescription>
              Kunde inte ladda processträd: {error ? (error as Error).message : 'Inget träd hittades'}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? null}
        currentView="test-coverage"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />
      <main className="ml-16 flex-1 flex flex-col gap-4 overflow-x-auto">
        <div className="w-full space-y-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Coverage Explorer</CardTitle>
              <CardDescription>
                Visar hela kreditprocessen i tabellform med test coverage och test-information per nod.
                Expandera/kollapsa noder för att navigera hierarkin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="scenario-select" className="text-sm font-medium">
                      Välj scenario:
                    </label>
                    <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                      <SelectTrigger id="scenario-select" className="w-[300px]">
                        <SelectValue placeholder="Välj ett scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        {e2eScenarios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.id} – {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={exportToExcel} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportera till Excel
                  </Button>
                </div>
              </div>
              <div className="px-6 pb-6 overflow-x-auto">
                <TestCoverageTable
                  tree={tree}
                  scenarios={e2eScenarios}
                  selectedScenarioId={selectedScenarioId}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


