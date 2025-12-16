import React, { useMemo } from 'react';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ProcessTreeNode } from '@/lib/processTree';
import { getProcessNodeStyle } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

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
    // Annars, fortsätt rekursivt med alla barn
    for (const child of node.children) {
      rows.push(...flattenToPaths(child, scenarios, selectedScenarioId, newPath));
    }
  }

  return rows;
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

export function TestCoverageTable({ tree, scenarios, selectedScenarioId }: TestCoverageTableProps) {
  // Beräkna max djup för att veta hur många kolumner vi behöver
  const maxDepth = useMemo(() => calculateMaxDepth(tree), [tree]);

  // Flattena trädet till paths
  const pathRows = useMemo(
    () => flattenToPaths(tree, scenarios, selectedScenarioId),
    [tree, scenarios, selectedScenarioId],
  );

  // Skapa kolumn-headers dynamiskt
  const columnHeaders = useMemo(() => {
    const hierarchyHeaders = Array.from({ length: maxDepth }, (_, i) => `Nivå ${i}`);
    return [...hierarchyHeaders, 'Given', 'When', 'Then'];
  }, [maxDepth]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full caption-bottom text-sm" style={{ minWidth: 'max-content' }}>
        <TableHeader>
          <TableRow>
            {columnHeaders.map((header, idx) => (
              <TableHead key={idx} className="min-w-[200px]">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pathRows.map((row, rowIdx) => {
            const { path, testInfoByCallActivity } = row;
            const rowKey = `path-${rowIdx}-${path.map((n) => n.id).join('-')}`;

            // Hämta alla callActivities i sökvägen med deras test-information
            const callActivitiesWithTestInfo = path
              .filter((node) => node.type === 'callActivity' && node.bpmnElementId)
              .map((node) => ({
                node,
                testInfo: testInfoByCallActivity.get(node.bpmnElementId!) || [],
              }));

            // Om det finns callActivities med test-information, skapa en rad per callActivity
            // Om selectedScenarioId är angivet, visa endast första matchningen (ingen duplicering)
            if (callActivitiesWithTestInfo.length > 0) {
              return callActivitiesWithTestInfo.map(({ node: callActivityNode, testInfo }) => {
                // Om selectedScenarioId är angivet eller bara ett scenario matchar, använd första
                const info = testInfo[0];
                if (!info) return null;

                const uniqueRowKey = `${rowKey}-${callActivityNode.bpmnElementId}-${info.scenarioId}`;
                return (
                    <TableRow key={uniqueRowKey}>
                      {/* Hierarki-kolumner */}
                      {Array.from({ length: maxDepth }, (_, colIdx) => {
                        const node = path[colIdx];
                        if (!node) {
                          return (
                            <TableCell key={colIdx} className="align-top">
                              <span className="text-xs text-muted-foreground">–</span>
                            </TableCell>
                          );
                        }

                        const nodeStyle = getProcessNodeStyle(node.type);
                        const isCallActivity = node.type === 'callActivity' && node.bpmnElementId === callActivityNode.bpmnElementId;

                        return (
                          <TableCell
                            key={colIdx}
                            className="align-top"
                            style={isCallActivity ? { backgroundColor: 'rgba(59, 130, 246, 0.1)' } : undefined}
                          >
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
                          </TableCell>
                        );
                      })}
                      {/* Test-information kolumner */}
                      <TableCell className="align-top min-w-[300px]">
                        {renderBulletList(info.subprocessStep.given)}
                      </TableCell>
                      <TableCell className="align-top min-w-[300px]">
                        {renderBulletList(info.subprocessStep.when)}
                      </TableCell>
                      <TableCell className="align-top min-w-[300px]">
                        {renderBulletList(info.subprocessStep.then)}
                      </TableCell>
                    </TableRow>
                  );
              }).filter(Boolean);
            }

            // Om inga callActivities med test-information, visa bara hierarki
            return (
              <TableRow key={rowKey}>
                {Array.from({ length: maxDepth }, (_, colIdx) => {
                  const node = path[colIdx];
                  if (!node) {
                    return (
                      <TableCell key={colIdx} className="align-top">
                        <span className="text-xs text-muted-foreground">–</span>
                      </TableCell>
                    );
                  }

                  const nodeStyle = getProcessNodeStyle(node.type);

                  return (
                    <TableCell key={colIdx} className="align-top">
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
                    </TableCell>
                  );
                })}
                {/* Tomma test-information kolumner */}
                <TableCell className="align-top">
                  <span className="text-xs text-muted-foreground">–</span>
                </TableCell>
                <TableCell className="align-top">
                  <span className="text-xs text-muted-foreground">–</span>
                </TableCell>
                <TableCell className="align-top">
                  <span className="text-xs text-muted-foreground">–</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
