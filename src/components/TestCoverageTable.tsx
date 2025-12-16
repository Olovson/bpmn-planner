import React, { useMemo, useRef, useEffect } from 'react';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ProcessTreeNode } from '@/lib/processTree';
import { getProcessNodeStyle } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';

interface TestCoverageTableProps {
  tree: ProcessTreeNode;
  scenarios: E2eScenario[];
  selectedScenarioId?: string; // Om angivet, visa endast detta scenario
}

interface TestInfo {
  scenarioId: string;
  scenarioName: string;
  subprocessStep: E2eScenario['subprocessSteps'][0];
}

interface PathRow {
  path: ProcessTreeNode[]; // Fullständig sökväg från root till leaf
  testInfoByCallActivity: Map<string, TestInfo[]>; // Map från callActivityId till test-information
}

// Beräkna max djup i trädet
function calculateMaxDepth(node: ProcessTreeNode, currentDepth: number = 0): number {
  if (node.children.length === 0) {
    return currentDepth + 1;
  }
  const childDepths = node.children.map((child) => calculateMaxDepth(child, currentDepth + 1));
  return Math.max(currentDepth + 1, ...childDepths);
}

// Hitta test-information för en callActivity
function findTestInfoForCallActivity(
  callActivityId: string,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): TestInfo[] {
  const testInfo: TestInfo[] = [];

  for (const scenario of scenarios) {
    // Om selectedScenarioId är angivet, hoppa över andra scenarion
    if (selectedScenarioId && scenario.id !== selectedScenarioId) {
      continue;
    }

    const subprocessStep = scenario.subprocessSteps.find(
      (step) => step.callActivityId === callActivityId,
    );
    if (subprocessStep) {
      testInfo.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subprocessStep,
      });
    }
  }

  return testInfo;
}

// Bygg map över test-information för alla callActivities i sökvägen
function buildTestInfoMap(
  path: ProcessTreeNode[],
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): Map<string, TestInfo[]> {
  const testInfoMap = new Map<string, TestInfo[]>();

  for (const node of path) {
    if (node.type === 'callActivity' && node.bpmnElementId) {
      const testInfo = findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId);
      if (testInfo.length > 0) {
        testInfoMap.set(node.bpmnElementId, testInfo);
      }
    }
  }

  return testInfoMap;
}

// Flattena trädet till paths (varje path = en rad i tabellen)
function flattenToPaths(
  node: ProcessTreeNode,
  scenarios: E2eScenario[],
  selectedScenarioId: string | undefined,
  currentPath: ProcessTreeNode[] = [],
): PathRow[] {
  const newPath = [...currentPath, node];
  const rows: PathRow[] = [];

  // Om noden är en leaf (inga barn), skapa en rad
  if (node.children.length === 0) {
    const testInfoByCallActivity = buildTestInfoMap(newPath, scenarios, selectedScenarioId);
    rows.push({ path: newPath, testInfoByCallActivity });
  } else {
    // Sortera barnen baserat på ProcessTree-ordningen (samma som Process Explorer)
    const sortedChildren = sortCallActivities(node.children);
    // Annars, fortsätt rekursivt med alla barn (i sorterad ordning)
    for (const child of sortedChildren) {
      rows.push(...flattenToPaths(child, scenarios, selectedScenarioId, newPath));
    }
  }

  return rows;
}

// Sortera paths baserat på ProcessTree-ordningen (samma logik som Process Explorer)
function sortPathsByProcessTreeOrder(pathRows: PathRow[]): PathRow[] {
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
}

const renderBulletList = (text?: string) => {
  if (!text) return <span className="text-xs text-muted-foreground">–</span>;
  const items = text.split('. ').filter((item) => item.trim().length > 0);
  if (items.length <= 1) {
    return <p className="text-xs text-muted-foreground whitespace-pre-line break-words">{text}</p>;
  }
  return (
    <ul className="list-disc ml-4 space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="text-xs text-muted-foreground whitespace-pre-line break-words">
          {item}
        </li>
      ))}
    </ul>
  );
};

interface GroupedRow {
  pathRow: PathRow;
  callActivityNode: ProcessTreeNode | null;
  testInfo: TestInfo | null;
  groupKey: string;
}

export function TestCoverageTable({ tree, scenarios, selectedScenarioId }: TestCoverageTableProps) {
  // Beräkna max djup för att veta hur många kolumner vi behöver
  const maxDepth = useMemo(() => calculateMaxDepth(tree), [tree]);

  // Flattena trädet till paths och sortera baserat på ProcessTree-ordningen
  const pathRows = useMemo(() => {
    const rows = flattenToPaths(tree, scenarios, selectedScenarioId);
    // Sortera paths baserat på ProcessTree-ordningen (samma som Process Explorer)
    return sortPathsByProcessTreeOrder(rows);
  }, [tree, scenarios, selectedScenarioId]);

  // Bygg en set över alla callActivityIds som faktiskt har entries i subprocessSteps
  const callActivityIdsWithTestInfo = useMemo(() => {
    const ids = new Set<string>();
    scenarios.forEach((scenario) => {
      if (selectedScenarioId && scenario.id !== selectedScenarioId) {
        return;
      }
      scenario.subprocessSteps.forEach((step) => {
        if (step.callActivityId) {
          ids.add(step.callActivityId);
        }
      });
    });
    return ids;
  }, [scenarios, selectedScenarioId]);

  // Gruppera rader efter den lägsta callActivity med test-information (närmast leaf-noden)
  // VIKTIGT: Vi visar bara test-information för callActivities som faktiskt har en entry i subprocessSteps
  // För varje leaf-nod, gå igenom sökvägen från lägsta till högsta nivå och hitta den första callActivity med test-info
  const groupedRows = useMemo(() => {
    const groups: GroupedRow[] = [];

    pathRows.forEach((pathRow) => {
      // Hitta den lägsta callActivity med test-information (börja från slutet av sökvägen, dvs. närmast leaf-noden)
      // Gå igenom sökvägen från lägsta till högsta nivå (från leaf mot root)
      let callActivityNode: ProcessTreeNode | null = null;
      let testInfo: TestInfo | null = null;

      // Gå igenom sökvägen från slutet (leaf-noden) och hitta den första callActivity med test-information
      // OCH som finns i callActivityIdsWithTestInfo (dvs. har en entry i subprocessSteps)
      for (let i = pathRow.path.length - 1; i >= 0; i--) {
        const node = pathRow.path[i];
        if (node.type === 'callActivity' && node.bpmnElementId) {
          // Kontrollera att denna callActivity faktiskt har en entry i subprocessSteps
          if (callActivityIdsWithTestInfo.has(node.bpmnElementId)) {
            const testInfoArray = pathRow.testInfoByCallActivity.get(node.bpmnElementId);
            if (testInfoArray && testInfoArray.length > 0) {
              // Hittat den första (lägsta, närmast leaf-noden) callActivity med test-information
              callActivityNode = node;
              testInfo = testInfoArray[0];
              break; // Stoppa här - vi vill bara ha den lägsta
            }
          }
        }
      }

      // Skapa groupKey baserat på callActivity (eller path om ingen callActivity)
      // Alla leaf-noder som delar samma callActivity med test-info får samma groupKey
      const groupKey = callActivityNode?.bpmnElementId || `no-test-info-${pathRow.path.map((n) => n.id).join('-')}`;

      groups.push({
        pathRow,
        callActivityNode,
        testInfo,
        groupKey,
      });
    });

    // Sortera grupper baserat på path:ens faktiska ordning (samma som Process Explorer)
    // Men gruppera rader med samma groupKey tillsammans för rowspan
    groups.sort((a, b) => {
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

    return groups;
  }, [pathRows, callActivityIdsWithTestInfo]);

  // Beräkna rowspan för varje grupp
  const rowspanByGroup = useMemo(() => {
    const rowspanMap = new Map<string, number>();
    groupedRows.forEach((group) => {
      const count = rowspanMap.get(group.groupKey) || 0;
      rowspanMap.set(group.groupKey, count + 1);
    });
    return rowspanMap;
  }, [groupedRows]);

  // Håll koll på om vi redan visat test-information för en grupp (återställ när groupedRows ändras)
  const shownGroupsRef = useRef<Set<string>>(new Set());
  // Återställ när groupedRows ändras
  useEffect(() => {
    shownGroupsRef.current.clear();
  }, [groupedRows]);

  // Skapa kolumn-headers dynamiskt
  const columnHeaders = useMemo(() => {
    const hierarchyHeaders = Array.from({ length: maxDepth }, (_, i) => `Nivå ${i}`);
    return [...hierarchyHeaders, 'Given', 'When', 'Then'];
  }, [maxDepth]);

  // Generera bakgrundsfärg för varje callActivity
  // Lägre subprocesser får ljus färg, högre processer som innehåller dem får starkare version
  const callActivityColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    const baseColors = [
      { r: 59, g: 130, b: 246 },   // Blå
      { r: 16, g: 185, b: 129 },   // Smaragd
      { r: 245, g: 158, b: 11 },   // Gul
      { r: 239, g: 68, b: 68 },    // Röd
      { r: 139, g: 92, b: 246 },    // Lila
      { r: 236, g: 72, b: 153 },    // Rödrosa
      { r: 14, g: 165, b: 233 },    // Kornblå
      { r: 34, g: 197, b: 94 },     // Grön
    ];

    // Samla alla callActivities från alla paths
    const allCallActivities = new Set<string>();
    pathRows.forEach((pathRow) => {
      pathRow.path.forEach((node) => {
        if (node.type === 'callActivity' && node.bpmnElementId) {
          allCallActivities.add(node.bpmnElementId);
        }
      });
    });

    // Ge varje callActivity en unik färg
    let colorIndex = 0;
    allCallActivities.forEach((callActivityId) => {
      const baseColor = baseColors[colorIndex % baseColors.length];
      // Lägre subprocesser får ljus färg (0.08 opacity)
      colorMap.set(callActivityId, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.08)`);
      colorIndex++;
    });

    return colorMap;
  }, [pathRows]);

  // Hjälpfunktion för att hitta alla callActivities i en path och deras hierarkiska relationer
  const getCallActivitiesInPath = (path: ProcessTreeNode[]): Array<{ node: ProcessTreeNode; depth: number }> => {
    const callActivities: Array<{ node: ProcessTreeNode; depth: number }> = [];
    path.forEach((node, index) => {
      if (node.type === 'callActivity' && node.bpmnElementId) {
        callActivities.push({ node, depth: index });
      }
    });
    return callActivities;
  };

  // Förbered data för transponerad tabell
  // Rader blir: Nivå 0, Nivå 1, ..., Given, When, Then
  // Kolumner blir: Varje path
  const transposedData = useMemo(() => {
    const rows: Array<Array<{ content: React.ReactNode; backgroundColor?: string }>> = [];
    
    // Skapa rader för varje nivå + Given/When/Then
    const rowCount = maxDepth + 3; // maxDepth nivåer + Given + When + Then
    
    // Initiera rader
    for (let i = 0; i < rowCount; i++) {
      rows.push([]);
    }
    
    // Fyll i data för varje kolumn (path)
    groupedRows.forEach((groupedRow, colIdx) => {
      const { pathRow, callActivityNode, testInfo } = groupedRow;
      const { path } = pathRow;
      
      // Hitta alla callActivities i denna path
      const callActivitiesInPath = getCallActivitiesInPath(path);
      
      // Hitta den lägsta callActivity (närmast leaf-noden) för att bestämma basfärgen
      const lowestCallActivity = callActivitiesInPath.length > 0 
        ? callActivitiesInPath[callActivitiesInPath.length - 1] 
        : null;
      
      // Hämta basfärg för den lägsta callActivity
      const baseColor = lowestCallActivity?.node.bpmnElementId 
        ? callActivityColors.get(lowestCallActivity.node.bpmnElementId)
        : undefined;
      
      // Fyll i hierarki-kolumner (Nivå 0, Nivå 1, etc.)
      for (let level = 0; level < maxDepth; level++) {
        const node = path[level];
        let cellBackgroundColor: string | undefined = undefined;
        
        if (node) {
          if (baseColor) {
            if (node.type === 'callActivity' && node.bpmnElementId) {
              if (node.bpmnElementId === lowestCallActivity?.node.bpmnElementId) {
                cellBackgroundColor = baseColor;
              } else {
                const rgbaMatch = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                if (rgbaMatch) {
                  const [, r, g, b] = rgbaMatch;
                  cellBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
                }
              }
            } else {
              cellBackgroundColor = baseColor;
            }
          }
          
          const nodeStyle = getProcessNodeStyle(node.type);
          rows[level].push({
            content: (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: nodeStyle.hexColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={node.label}>
                    {node.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={node.bpmnFile}>
                    {node.bpmnFile}
                  </div>
                  {node.bpmnElementId && (
                    <div className="text-xs font-mono text-muted-foreground truncate" title={node.bpmnElementId}>
                      {node.bpmnElementId}
                    </div>
                  )}
                </div>
              </div>
            ),
            backgroundColor: cellBackgroundColor,
          });
        } else {
          rows[level].push({
            content: <span className="text-xs text-muted-foreground">–</span>,
          });
        }
      }
      
      // Fyll i Given/When/Then kolumner
      if (testInfo) {
        // Given
        rows[maxDepth].push({
          content: renderBulletList(testInfo.subprocessStep.given),
        });
        // When
        rows[maxDepth + 1].push({
          content: renderBulletList(testInfo.subprocessStep.when),
        });
        // Then
        rows[maxDepth + 2].push({
          content: renderBulletList(testInfo.subprocessStep.then),
        });
      } else {
        rows[maxDepth].push({
          content: <span className="text-xs text-muted-foreground">–</span>,
        });
        rows[maxDepth + 1].push({
          content: <span className="text-xs text-muted-foreground">–</span>,
        });
        rows[maxDepth + 2].push({
          content: <span className="text-xs text-muted-foreground">–</span>,
        });
      }
    });
    
    return rows;
  }, [groupedRows, maxDepth, callActivityColors, rowspanByGroup]);

  // Skapa rad-headers
  const rowHeaders = useMemo(() => {
    const headers = Array.from({ length: maxDepth }, (_, i) => `Nivå ${i}`);
    return [...headers, 'Given', 'When', 'Then'];
  }, [maxDepth]);

  return (
    <div className="overflow-x-auto">
      <table className="table-fixed w-full caption-bottom text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px] sticky left-0 bg-background z-10">Rad</TableHead>
            {groupedRows.map((groupedRow, colIdx) => {
              const { pathRow } = groupedRow;
              const { path } = pathRow;
              const leafNode = path[path.length - 1];
              return (
                <TableHead key={colIdx} className="w-[300px]">
                  <div className="text-xs font-medium truncate" title={leafNode?.label || `Path ${colIdx + 1}`}>
                    {leafNode?.label || `Path ${colIdx + 1}`}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transposedData.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              <TableCell className="min-w-[150px] sticky left-0 bg-background z-10 font-medium">
                {rowHeaders[rowIdx]}
              </TableCell>
              {row.map((cell, colIdx) => (
                <TableCell
                  key={colIdx}
                  className="align-top w-[300px]"
                  style={cell.backgroundColor ? { backgroundColor: cell.backgroundColor } : undefined}
                >
                  {cell.content}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}
