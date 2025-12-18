import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProcessTreeNode } from '@/lib/processTree';
import { getProcessNodeStyle } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import {
  type TestInfo,
  type PathRow,
  findTestInfoForCallActivity,
  buildTestInfoMap,
  flattenToPaths,
  sortPathsByProcessTreeOrder,
} from '@/lib/testCoverageHelpers';

interface TestCoverageTableProps {
  tree: ProcessTreeNode;
  scenarios: E2eScenario[];
  selectedScenarioId?: string; // Om angivet, visa endast detta scenario
  viewMode?: 'condensed' | 'hierarchical' | 'full'; // Om angivet, använd denna vy (annars använd intern state)
  searchQuery?: string; // Söksträng för att filtrera rader
}

// Beräkna max djup i trädet
function calculateMaxDepth(node: ProcessTreeNode, currentDepth: number = 0): number {
  if (node.children.length === 0) {
    return currentDepth + 1;
  }
  const childDepths = node.children.map((child) => calculateMaxDepth(child, currentDepth + 1));
  return Math.max(currentDepth + 1, ...childDepths);
}


const renderBulletList = (text?: string, options?: { isCode?: boolean }) => {
  if (!text) return <span className="text-xs text-muted-foreground">–</span>;
  const isCode = options?.isCode ?? false;
  const items = text.split('. ').filter((item) => item.trim().length > 0);
  if (items.length <= 1) {
    return (
      <p
        className={
          isCode
            ? 'text-[11px] font-mono break-all whitespace-pre-line'
            : 'text-[11px] text-muted-foreground whitespace-pre-line break-words'
        }
      >
        {text}
      </p>
    );
  }
  return (
    <ul className="list-disc ml-4 space-y-1">
      {items.map((item, idx) => (
        <li
          key={idx}
          className={
            isCode
              ? 'text-[11px] font-mono break-all whitespace-pre-line'
              : 'text-[11px] text-muted-foreground whitespace-pre-line break-words'
          }
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

// Konvertera nodtyp till läsbart namn
// Hjälpfunktion för att avgöra om en User Task är kund- eller handläggaraktivitet
const isCustomerUserTask = (node: ProcessTreeNode): boolean => {
  if (node.type !== 'userTask') {
    return false; // Inte relevant för andra typer
  }

  const label = (node.label || '').toLowerCase();

  // Nyckelord som tydligt indikerar interna/handläggar-uppgifter
  const internalKeywords = [
    'review',
    'granska',
    'assess',
    'utvärdera',
    'advanced-underwriting',
    'board',
    'committee',
    'four eyes',
    'four-eyes',
    'manual',
    'distribute',
    'distribuera',
    'archive',
    'arkivera',
    'verify',
    'handläggare',
  ];

  // Om den matchar interna ord → behandla som intern/backoffice
  if (internalKeywords.some((keyword) => label.includes(keyword))) {
    return false;
  }

  // Default: kund- eller stakeholder-interaktion (t.ex. "register ...", "consent to credit check" osv.)
  return true;
};

const getNodeTypeLabel = (node: ProcessTreeNode): string => {
  const typeMap: Record<string, string> = {
    process: 'Process',
    callActivity: 'Call Activity',
    userTask: 'User Task',
    serviceTask: 'Service Task',
    businessRuleTask: 'Business Rule Task',
    dmnDecision: 'DMN Decision',
    gateway: 'Gateway',
    boundaryEvent: 'Boundary Event',
  };
  
  const baseLabel = typeMap[node.type] || node.type.charAt(0).toUpperCase() + node.type.slice(1).replace(/([A-Z])/g, ' $1');
  
  // För User Tasks, lägg till (kund) eller (handläggare)
  if (node.type === 'userTask') {
    const isCustomer = isCustomerUserTask(node);
    return `${baseLabel} (${isCustomer ? 'kund' : 'handläggare'})`;
  }
  
  return baseLabel;
};

interface GroupedRow {
  pathRow: PathRow;
  callActivityNode: ProcessTreeNode | null;
  testInfo: TestInfo | null;
  groupKey: string;
}

// Hjälpfunktion för att samla alla aktiviteter per callActivity
function collectActivitiesPerCallActivity(
  tree: ProcessTreeNode,
  scenarios: E2eScenario[],
  selectedScenarioId?: string,
): Map<string, {
  callActivityNode: ProcessTreeNode;
  activities: {
    serviceTasks: ProcessTreeNode[];
    userTasksCustomer: ProcessTreeNode[];
    userTasksEmployee: ProcessTreeNode[];
    businessRules: ProcessTreeNode[];
  };
  testInfo: TestInfo | null;
}> {
  const result = new Map();
  
  // Rekursivt gå igenom trädet och samla aktiviteter per callActivity
  function traverse(node: ProcessTreeNode, currentCallActivity: ProcessTreeNode | null = null) {
    // Om detta är en callActivity, använd den som ny currentCallActivity
    if (node.type === 'callActivity' && node.bpmnElementId) {
      // Kontrollera om denna callActivity har test-info
      const testInfoArray = findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId);
      if (testInfoArray.length > 0) {
        // Skapa entry för denna callActivity om den inte redan finns
        if (!result.has(node.bpmnElementId)) {
          result.set(node.bpmnElementId, {
            callActivityNode: node,
            activities: {
              serviceTasks: [],
              userTasksCustomer: [],
              userTasksEmployee: [],
              businessRules: [],
            },
            testInfo: testInfoArray[0],
          });
        }
        // Fortsätt med denna callActivity som ny currentCallActivity
        currentCallActivity = node;
      }
    }
    
    // Om vi har en currentCallActivity och detta är en aktivitet (inte callActivity eller process)
    if (currentCallActivity && currentCallActivity.bpmnElementId) {
      const entry = result.get(currentCallActivity.bpmnElementId);
      if (entry) {
        if (node.type === 'serviceTask') {
          entry.activities.serviceTasks.push(node);
        } else if (node.type === 'userTask') {
          if (isCustomerUserTask(node)) {
            entry.activities.userTasksCustomer.push(node);
          } else {
            entry.activities.userTasksEmployee.push(node);
          }
        } else if (node.type === 'businessRuleTask' || node.type === 'dmnDecision') {
          entry.activities.businessRules.push(node);
        }
      }
    }
    
    // Rekursivt gå igenom barnen
    node.children.forEach(child => traverse(child, currentCallActivity));
  }
  
  traverse(tree);
  return result;
}

export function TestCoverageTable({ tree, scenarios, selectedScenarioId, viewMode: viewModeProp, searchQuery }: TestCoverageTableProps) {
  // State för att välja vy: 'condensed' (kondenserad), 'hierarchical' (hierarkisk), eller 'full' (fullständig)
  // Om viewModeProp anges, använd den (för export), annars använd intern state
  const [viewModeState, setViewMode] = useState<'condensed' | 'hierarchical' | 'full'>('condensed');
  const viewMode = viewModeProp ?? viewModeState;
  
  // Beräkna max djup för att veta hur många kolumner vi behöver
  const maxDepth = useMemo(() => calculateMaxDepth(tree), [tree]);

  // Samla aktiviteter per callActivity
  const activitiesPerCallActivity = useMemo(() => {
    return collectActivitiesPerCallActivity(tree, scenarios, selectedScenarioId);
  }, [tree, scenarios, selectedScenarioId]);

  // Flattena trädet till paths och sortera baserat på ProcessTree-ordningen
  const pathRows = useMemo(() => {
    const rows = flattenToPaths(tree, scenarios, selectedScenarioId);
    // Sortera paths baserat på ProcessTree-ordningen (samma som Process Explorer)
    return sortPathsByProcessTreeOrder(rows);
  }, [tree, scenarios, selectedScenarioId]);

  // Filtrera pathRows baserat på searchQuery
  const filteredPathRows = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return pathRows;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return pathRows.filter((pathRow) => {
      // Sök i node labels
      const nodeLabels = pathRow.path.map((node) => node.label.toLowerCase());
      if (nodeLabels.some((label) => label.includes(query))) {
        return true;
      }
      
      // Sök i BPMN element IDs
      const bpmnElementIds = pathRow.path
        .map((node) => node.bpmnElementId?.toLowerCase())
        .filter((id): id is string => !!id);
      if (bpmnElementIds.some((id) => id.includes(query))) {
        return true;
      }
      
      // Sök i BPMN filnamn
      const bpmnFiles = pathRow.path
        .map((node) => node.bpmnFile?.toLowerCase())
        .filter((file): file is string => !!file);
      if (bpmnFiles.some((file) => file.includes(query))) {
        return true;
      }
      
      // Sök i test information (Given, When, Then, UI, API, DMN)
      const testInfoValues = Array.from(pathRow.testInfoByCallActivity.values())
        .flat()
        .map((info) => [
          info.given?.toLowerCase(),
          info.when?.toLowerCase(),
          info.then?.toLowerCase(),
          info.ui?.toLowerCase(),
          info.api?.toLowerCase(),
          info.dmn?.toLowerCase(),
        ])
        .flat()
        .filter((text): text is string => !!text);
      if (testInfoValues.some((text) => text.includes(query))) {
        return true;
      }
      
      return false;
    });
  }, [pathRows, searchQuery]);

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

    filteredPathRows.forEach((pathRow) => {
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

      // Skapa groupKey baserat på callActivity OCH dess position i path:en
      // Detta säkerställer att olika subprocesser med samma callActivity-ID får olika groupKeys
      // Om callActivity finns, använd callActivityId + depth i path för att göra den unik
      // Annars använd hela path:en
      let groupKey: string;
      if (callActivityNode && callActivityNode.bpmnElementId) {
        const callActivityDepth = pathRow.path.findIndex((n) => n.id === callActivityNode.id);
        // Använd callActivityId + depth + parent path för att göra den unik
        // Om callActivity är på depth 0 eller 1, använd bara callActivityId (toppnivå)
        // Annars inkludera parent-noderna för att skilja mellan olika instanser
        if (callActivityDepth <= 1) {
          groupKey = callActivityNode.bpmnElementId;
        } else {
          // För djupare callActivities, inkludera parent-path för att göra den unik
          const parentPath = pathRow.path.slice(0, callActivityDepth).map((n) => n.id).join('-');
          groupKey = `${callActivityNode.bpmnElementId}-${parentPath}`;
        }
      } else {
        groupKey = `no-test-info-${pathRow.path.map((n) => n.id).join('-')}`;
      }

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
  }, [filteredPathRows, callActivityIdsWithTestInfo]);

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

  // Identifiera toppnivå-callActivities (callActivities på nivå 1, direkt under root)
  const topLevelCallActivities = useMemo(() => {
    const topLevel = new Map<string, { node: ProcessTreeNode; colorIndex: number }>();
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

    // Hitta alla callActivities på nivå 1 (direkt under root)
    pathRows.forEach((pathRow) => {
      if (pathRow.path.length > 1) {
        const level1Node = pathRow.path[1]; // Nivå 1 (root är nivå 0)
        if (level1Node.type === 'callActivity' && level1Node.bpmnElementId) {
          if (!topLevel.has(level1Node.bpmnElementId)) {
            topLevel.set(level1Node.bpmnElementId, {
              node: level1Node,
              colorIndex: topLevel.size,
            });
          }
        }
      }
    });

    return { topLevel, baseColors };
  }, [pathRows]);

  // Hjälpfunktion för att hitta toppnivå-callActivity för en given callActivity i en path
  const findTopLevelCallActivity = (path: ProcessTreeNode[], callActivityId: string, depth: number): string | null => {
    // Om callActivity är på nivå 1 (toppnivå), använd sin egen ID
    if (depth === 1) {
      return callActivityId;
    }
    
    // Annars, hitta den första callActivity på nivå 1 (toppnivå) i samma path
    if (path.length > 1) {
      const level1Node = path[1];
      if (level1Node.type === 'callActivity' && level1Node.bpmnElementId) {
        return level1Node.bpmnElementId;
      }
    }
    
    return null;
  };

  // Generera färg för en callActivity baserat på dess toppnivå-callActivity och djup
  const getCallActivityColor = useCallback((
    path: ProcessTreeNode[],
    callActivityId: string,
    depth: number,
  ): string | undefined => {
    const topLevelId = findTopLevelCallActivity(path, callActivityId, depth);
    if (!topLevelId) return undefined;
    
    const topLevelInfo = topLevelCallActivities.topLevel.get(topLevelId);
    if (!topLevelInfo) return undefined;
    
    const baseColor = topLevelCallActivities.baseColors[topLevelInfo.colorIndex % topLevelCallActivities.baseColors.length];
    
    // Beräkna opacity baserat på djup (djupare = ljusare)
    // Toppnivå (depth 1): 0.15 opacity
    // Nivå 2: 0.12 opacity
    // Nivå 3: 0.10 opacity
    // Nivå 4+: 0.08 opacity
    let opacity = 0.08;
    if (depth === 1) opacity = 0.15;
    else if (depth === 2) opacity = 0.12;
    else if (depth === 3) opacity = 0.10;
    
    return `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
  }, [topLevelCallActivities]);

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

  // Gruppera kolumner efter groupKey för att kunna merga testinfo-cellerna
  const groupedColumns = useMemo(() => {
    const groups = new Map<string, Array<{ colIdx: number; groupedRow: GroupedRow }>>();
    
    groupedRows.forEach((groupedRow, colIdx) => {
      const groupKey = groupedRow.groupKey;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push({ colIdx, groupedRow });
    });
    
    // Sortera grupperna efter:
    // 1. Depth (lägsta subprocess först, sedan uppåt) - så att lägre subprocesser skrivs först
    // 2. Sedan efter kolumnindex (för att behålla tabellordningen)
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const aRow = a[1][0].groupedRow;
      const bRow = b[1][0].groupedRow;
      
      // Om ingen callActivityNode, sätt längst ned (högst depth)
      if (!aRow.callActivityNode && !bRow.callActivityNode) {
        // Om båda saknar callActivityNode, sortera efter kolumnindex
        return a[1][0].colIdx - b[1][0].colIdx;
      }
      if (!aRow.callActivityNode) return 1;
      if (!bRow.callActivityNode) return -1;
      
      // Hitta depth för callActivityNode i path:en
      const aDepth = aRow.pathRow.path.findIndex((n) => n.id === aRow.callActivityNode!.id);
      const bDepth = bRow.pathRow.path.findIndex((n) => n.id === bRow.callActivityNode!.id);
      
      // Sortera efter depth (högre depth = lägre subprocess = kommer först)
      if (aDepth !== bDepth) {
        return bDepth - aDepth;
      }
      
      // Om samma depth, sortera efter kolumnindex för att behålla tabellordningen
      return a[1][0].colIdx - b[1][0].colIdx;
    });
    
    return sortedGroups;
  }, [groupedRows]);

  // Skapa en lista över alla callActivities (sorterade) - endast de med test-info (för kondenserad vy)
  const callActivitiesList = useMemo(() => {
    return Array.from(activitiesPerCallActivity.values()).sort((a, b) => {
      // Sortera baserat på callActivity-nodens position i trädet
      const aOrder = a.callActivityNode.visualOrderIndex ?? a.callActivityNode.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.callActivityNode.visualOrderIndex ?? b.callActivityNode.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.callActivityNode.label.localeCompare(b.callActivityNode.label);
    });
  }, [activitiesPerCallActivity]);

  // Skapa en lista över alla callActivities i hierarkisk ordning (för hierarkisk vy)
  // Använder samma logik som collectActivitiesPerCallActivity men för alla callActivities
  // Behåller hierarkisk ordning genom att samla i rätt ordning direkt från trädet
  const hierarchicalCallActivitiesList = useMemo(() => {
    const result = new Map<string, {
      callActivityNode: ProcessTreeNode;
      activities: {
        serviceTasks: ProcessTreeNode[];
        userTasksCustomer: ProcessTreeNode[];
        userTasksEmployee: ProcessTreeNode[];
        businessRules: ProcessTreeNode[];
      };
      testInfo: TestInfo | null;
      depth: number;
      path: ProcessTreeNode[]; // Behåll path för att kunna sortera hierarkiskt
    }>();
    const orderedList: Array<{
      callActivityNode: ProcessTreeNode;
      activities: {
        serviceTasks: ProcessTreeNode[];
        userTasksCustomer: ProcessTreeNode[];
        userTasksEmployee: ProcessTreeNode[];
        businessRules: ProcessTreeNode[];
      };
      testInfo: TestInfo | null;
      depth: number;
      path: ProcessTreeNode[];
    }> = [];

    // Rekursivt samla alla callActivities med deras aktiviteter i hierarkisk ordning
    function traverse(node: ProcessTreeNode, currentCallActivity: ProcessTreeNode | null = null, depth: number = 0, path: ProcessTreeNode[] = []) {
      const currentPath = [...path, node];
      
      // Om detta är en callActivity
      if (node.type === 'callActivity' && node.bpmnElementId) {
        const testInfoArray = findTestInfoForCallActivity(node.bpmnElementId, scenarios, selectedScenarioId);
        const testInfo = testInfoArray.length > 0 ? testInfoArray[0] : null;
        
        // Skapa entry för denna callActivity om den inte redan finns
        if (!result.has(node.bpmnElementId)) {
          const entry = {
            callActivityNode: node,
            activities: {
              serviceTasks: [] as ProcessTreeNode[],
              userTasksCustomer: [] as ProcessTreeNode[],
              userTasksEmployee: [] as ProcessTreeNode[],
              businessRules: [] as ProcessTreeNode[],
            },
            testInfo,
            depth,
            path: currentPath,
          };
          result.set(node.bpmnElementId, entry);
          orderedList.push(entry);
        }
        
        // Fortsätt med denna callActivity som ny currentCallActivity
        currentCallActivity = node;
      }
      
      // Om vi har en currentCallActivity och detta är en aktivitet (inte callActivity eller process)
      if (currentCallActivity && currentCallActivity.bpmnElementId) {
        const entry = result.get(currentCallActivity.bpmnElementId);
        if (entry) {
          if (node.type === 'serviceTask') {
            entry.activities.serviceTasks.push(node);
          } else if (node.type === 'userTask') {
            if (isCustomerUserTask(node)) {
              entry.activities.userTasksCustomer.push(node);
            } else {
              entry.activities.userTasksEmployee.push(node);
            }
          } else if (node.type === 'businessRuleTask' || node.type === 'dmnDecision') {
            entry.activities.businessRules.push(node);
          }
        }
      }
      
      // Sortera barnen med sortCallActivities för att behålla rätt ordning
      const sortedChildren = sortCallActivities(node.children, node.type === 'process' ? 'root' : 'subprocess');
      
      // Rekursivt gå igenom barnen i sorterad ordning
      sortedChildren.forEach(child => {
        const newDepth = (node.type === 'callActivity' && node.bpmnElementId) ? depth + 1 : depth;
        traverse(child, currentCallActivity, newDepth, currentPath);
      });
    }

    traverse(tree);
    
    // Returnera i samma ordning som de hittades (hierarkisk ordning bevarad)
    return orderedList;
  }, [tree, scenarios, selectedScenarioId]);

  // Förbered data för kondenserad vy (en kolumn per callActivity med grupperade aktiviteter)
  const transposedDataCondensed = useMemo(() => {
    const rows: Array<Array<{ content: React.ReactNode; backgroundColor?: string; colspan?: number; skip?: boolean }>> = [];
    
    // Skapa rader för varje nivå + Aktiviteter (grupperade) + Given/When/Then + UI-interaktion + API-anrop + DMN-beslut
    const rowCount = maxDepth + 7; // maxDepth nivåer + 1 (Aktiviteter) + 3 (G/W/T) + 3 (UI/API/DMN)
    const activitiesRowIdx = maxDepth;
    const givenRowIdx = maxDepth + 1;
    const whenRowIdx = maxDepth + 2;
    const thenRowIdx = maxDepth + 3;
    const uiRowIdx = maxDepth + 4;
    const apiRowIdx = maxDepth + 5;
    const dmnRowIdx = maxDepth + 6;
    
    // Initiera rader
    for (let i = 0; i < rowCount; i++) {
      rows.push([]);
    }
    
    // Fyll i data för varje kolumn (callActivity)
    callActivitiesList.forEach((callActivityData, colIdx) => {
      const { callActivityNode, activities, testInfo } = callActivityData;
      
      // Hitta path för denna callActivity (för att kunna visa hierarki)
      const findPathToNode = (node: ProcessTreeNode, targetId: string, currentPath: ProcessTreeNode[] = []): ProcessTreeNode[] | null => {
        const newPath = [...currentPath, node];
        if (node.id === targetId) {
          return newPath;
        }
        for (const child of node.children) {
          const found = findPathToNode(child, targetId, newPath);
          if (found) return found;
        }
        return null;
      };
      const path = findPathToNode(tree, callActivityNode.id) || [callActivityNode];
      
      // Fyll i hierarki-kolumner (Nivå 0, Nivå 1, etc.) - visa bara callActivity-noden
      for (let level = 0; level < maxDepth; level++) {
        const node = path[level];
        let cellBackgroundColor: string | undefined = undefined;
        
        if (node) {
          if (node.type === 'callActivity' && node.bpmnElementId) {
            cellBackgroundColor = getCallActivityColor(path, node.bpmnElementId, level);
          }
          
          const nodeStyle = getProcessNodeStyle(node.type);
          const isLeafNode = level === path.length - 1;
          
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
                  {isLeafNode && node.bpmnElementId && (
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
      
      // Beräkna bakgrundsfärg för denna callActivity
      const cellBackgroundColor = callActivityNode.bpmnElementId 
        ? getCallActivityColor(path, callActivityNode.bpmnElementId, path.findIndex(n => n.id === callActivityNode.id))
        : undefined;
      
      // Fyll i Aktiviteter-raden (grupperade)
      // Använd callActivity-id i keys för att göra dem unika mellan kolumner
      const callActivityId = callActivityNode.bpmnElementId || callActivityNode.id;
      const activityGroups: React.ReactNode[] = [];
      
      if (activities.serviceTasks.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-serviceTasks`} className="mb-2">
            <div className="text-xs font-semibold text-amber-600 mb-1">Service Tasks:</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.serviceTasks.map((task, idx) => (
                <li key={`${callActivityId}-serviceTask-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.userTasksCustomer.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-userTasksCustomer`} className="mb-2">
            <div className="text-xs font-semibold text-red-600 mb-1">User Tasks (kund):</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.userTasksCustomer.map((task, idx) => (
                <li key={`${callActivityId}-userTaskCustomer-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.userTasksEmployee.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-userTasksEmployee`} className="mb-2">
            <div className="text-xs font-semibold text-red-800 mb-1">User Tasks (handläggare):</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.userTasksEmployee.map((task, idx) => (
                <li key={`${callActivityId}-userTaskEmployee-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.businessRules.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-businessRules`} className="mb-2">
            <div className="text-xs font-semibold text-cyan-600 mb-1">Business Rules / DMN:</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.businessRules.map((task, idx) => (
                <li key={`${callActivityId}-businessRule-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      rows[activitiesRowIdx].push({
        content: activityGroups.length > 0 ? <div className="space-y-1">{activityGroups}</div> : <span className="text-xs text-muted-foreground">–</span>,
        backgroundColor: cellBackgroundColor,
      });
      
      // Fyll i Given/When/Then + UI/API/DMN
      
      if (testInfo) {
        rows[givenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.given),
          backgroundColor: cellBackgroundColor,
        });
        
        rows[whenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.when),
          backgroundColor: cellBackgroundColor,
        });
        
        rows[thenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.then),
          backgroundColor: cellBackgroundColor,
        });
        
        if (testInfo.bankProjectStep) {
          rows[uiRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.uiInteraction),
            backgroundColor: cellBackgroundColor,
          });
          
          rows[apiRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.apiCall, { isCode: true }),
            backgroundColor: cellBackgroundColor,
          });
          
          rows[dmnRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.dmnDecision),
            backgroundColor: cellBackgroundColor,
          });
        } else {
          rows[uiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
          rows[apiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
          rows[dmnRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
        }
      } else {
        rows[givenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[whenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[thenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[uiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[apiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[dmnRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      }
    });
    
    return rows;
  }, [callActivitiesList, maxDepth, topLevelCallActivities, getCallActivityColor, tree, scenarios, selectedScenarioId]);

  // Förbered data för hierarkisk vy (en kolumn per callActivity i hierarkin, med grupperade aktiviteter)
  const transposedDataHierarchical = useMemo(() => {
    const rows: Array<Array<{ content: React.ReactNode; backgroundColor?: string; colspan?: number; skip?: boolean }>> = [];
    
    // Skapa rader för varje nivå + Aktiviteter (grupperade) + Given/When/Then + UI-interaktion + API-anrop + DMN-beslut
    const rowCount = maxDepth + 7; // maxDepth nivåer + 1 (Aktiviteter) + 3 (G/W/T) + 3 (UI/API/DMN)
    const activitiesRowIdx = maxDepth;
    const givenRowIdx = maxDepth + 1;
    const whenRowIdx = maxDepth + 2;
    const thenRowIdx = maxDepth + 3;
    const uiRowIdx = maxDepth + 4;
    const apiRowIdx = maxDepth + 5;
    const dmnRowIdx = maxDepth + 6;
    
    // Initiera rader
    for (let i = 0; i < rowCount; i++) {
      rows.push([]);
    }
    
    // Fyll i data för varje kolumn (callActivity)
    hierarchicalCallActivitiesList.forEach((callActivityData, colIdx) => {
      const { callActivityNode, activities, testInfo, depth } = callActivityData;
      
      // Hitta path för denna callActivity (för att kunna visa hierarki)
      const findPathToNode = (node: ProcessTreeNode, targetId: string, currentPath: ProcessTreeNode[] = []): ProcessTreeNode[] | null => {
        const newPath = [...currentPath, node];
        if (node.id === targetId) {
          return newPath;
        }
        for (const child of node.children) {
          const found = findPathToNode(child, targetId, newPath);
          if (found) return found;
        }
        return null;
      };
      const path = findPathToNode(tree, callActivityNode.id) || [callActivityNode];
      
      // Fyll i hierarki-kolumner (Nivå 0, Nivå 1, etc.) - visa hela path:en
      for (let level = 0; level < maxDepth; level++) {
        const node = path[level];
        let cellBackgroundColor: string | undefined = undefined;
        
        if (node) {
          if (node.type === 'callActivity' && node.bpmnElementId) {
            cellBackgroundColor = getCallActivityColor(path, node.bpmnElementId, level);
          }
          
          const nodeStyle = getProcessNodeStyle(node.type);
          const isLeafNode = level === path.length - 1;
          
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
                  {isLeafNode && node.bpmnElementId && (
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
      
      // Beräkna bakgrundsfärg för denna callActivity
      const cellBackgroundColor = callActivityNode.bpmnElementId 
        ? getCallActivityColor(path, callActivityNode.bpmnElementId, path.findIndex(n => n.id === callActivityNode.id))
        : undefined;
      
      // Fyll i Aktiviteter-raden (grupperade) - samma som condensed
      // Använd callActivity-id i keys för att göra dem unika mellan kolumner
      const callActivityId = callActivityNode.bpmnElementId || callActivityNode.id;
      const activityGroups: React.ReactNode[] = [];
      
      if (activities.serviceTasks.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-serviceTasks`} className="mb-2">
            <div className="text-xs font-semibold text-amber-600 mb-1">Service Tasks:</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.serviceTasks.map((task, idx) => (
                <li key={`${callActivityId}-serviceTask-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.userTasksCustomer.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-userTasksCustomer`} className="mb-2">
            <div className="text-xs font-semibold text-red-600 mb-1">User Tasks (kund):</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.userTasksCustomer.map((task, idx) => (
                <li key={`${callActivityId}-userTaskCustomer-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.userTasksEmployee.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-userTasksEmployee`} className="mb-2">
            <div className="text-xs font-semibold text-red-800 mb-1">User Tasks (handläggare):</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.userTasksEmployee.map((task, idx) => (
                <li key={`${callActivityId}-userTaskEmployee-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      if (activities.businessRules.length > 0) {
        activityGroups.push(
          <div key={`${callActivityId}-businessRules`} className="mb-2">
            <div className="text-xs font-semibold text-cyan-600 mb-1">Business Rules / DMN:</div>
            <ul className="list-disc ml-4 space-y-0.5">
              {activities.businessRules.map((task, idx) => (
                <li key={`${callActivityId}-businessRule-${task.id}-${idx}`} className="text-xs text-muted-foreground">{task.label}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      rows[activitiesRowIdx].push({
        content: activityGroups.length > 0 ? <div className="space-y-1">{activityGroups}</div> : <span className="text-xs text-muted-foreground">–</span>,
        backgroundColor: cellBackgroundColor,
      });
      
      // Fyll i Given/When/Then + UI/API/DMN - samma som condensed
      if (testInfo) {
        rows[givenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.given),
          backgroundColor: cellBackgroundColor,
        });
        
        rows[whenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.when),
          backgroundColor: cellBackgroundColor,
        });
        
        rows[thenRowIdx].push({
          content: renderBulletList(testInfo.subprocessStep.then),
          backgroundColor: cellBackgroundColor,
        });
        
        if (testInfo.bankProjectStep) {
          rows[uiRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.uiInteraction),
            backgroundColor: cellBackgroundColor,
          });
          
          rows[apiRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.apiCall, { isCode: true }),
            backgroundColor: cellBackgroundColor,
          });
          
          rows[dmnRowIdx].push({
            content: renderBulletList(testInfo.bankProjectStep.dmnDecision),
            backgroundColor: cellBackgroundColor,
          });
        } else {
          rows[uiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
          rows[apiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
          rows[dmnRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span>, backgroundColor: cellBackgroundColor });
        }
      } else {
        rows[givenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[whenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[thenRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[uiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[apiRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
        rows[dmnRowIdx].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      }
    });
    
    return rows;
  }, [hierarchicalCallActivitiesList, maxDepth, topLevelCallActivities, getCallActivityColor, tree, scenarios, selectedScenarioId]);

  // Förbered data för fullständig vy (en kolumn per path/aktivitet)
  const transposedDataFull = useMemo(() => {
    const rows: Array<Array<{ content: React.ReactNode; backgroundColor?: string; colspan?: number; skip?: boolean }>> = [];
    
    // Skapa rader för varje nivå + Given/When/Then + UI-interaktion + API-anrop + DMN-beslut
    const rowCount = maxDepth + 6; // maxDepth nivåer + 3 (G/W/T) + 3 (UI/API/DMN)
    
    // Initiera rader
    for (let i = 0; i < rowCount; i++) {
      rows.push([]);
    }
    
    // Fyll i data för varje kolumn (path)
    groupedRows.forEach((groupedRow, colIdx) => {
      const { pathRow, callActivityNode, testInfo } = groupedRow;
      const { path } = pathRow;
      
      // Fyll i hierarki-kolumner (Nivå 0, Nivå 1, etc.)
      for (let level = 0; level < maxDepth; level++) {
        const node = path[level];
        let cellBackgroundColor: string | undefined = undefined;
        
        if (node) {
          // Om detta är en callActivity, hämta färg baserat på toppnivå-callActivity
          if (node.type === 'callActivity' && node.bpmnElementId) {
            cellBackgroundColor = getCallActivityColor(path, node.bpmnElementId, level);
          } else {
            // För icke-callActivity noder, hitta den närmaste callActivity i path:en
            // och använd samma färgfamilj
            const callActivitiesInPath = getCallActivitiesInPath(path);
            if (callActivitiesInPath.length > 0) {
              // Hitta den callActivity som är närmast denna nod (före denna nod i path:en)
              const nearestCallActivity = callActivitiesInPath
                .filter((ca) => ca.depth < level)
                .sort((a, b) => b.depth - a.depth)[0]; // Hitta den närmaste (högsta depth)
              
              if (nearestCallActivity && nearestCallActivity.node.bpmnElementId) {
                cellBackgroundColor = getCallActivityColor(
                  path,
                  nearestCallActivity.node.bpmnElementId,
                  nearestCallActivity.depth,
                );
              }
            }
          }
          
          const nodeStyle = getProcessNodeStyle(node.type);
          // Kolla om detta är en leaf-nod (sista noden i path:en)
          const isLeafNode = level === path.length - 1;
          
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
                  {isLeafNode ? (
                    <div className="text-xs text-muted-foreground truncate" title={getNodeTypeLabel(node)}>
                      {getNodeTypeLabel(node)}
                    </div>
                  ) : (
                    node.bpmnElementId && (
                      <div className="text-xs font-mono text-muted-foreground truncate" title={node.bpmnElementId}>
                        {node.bpmnElementId}
                      </div>
                    )
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
      
      // För Given/When/Then och UI/API/DMN, vi hanterar dem separat nedan med colspan
      // Sätt placeholder för nu (kommer att skrivas över)
      rows[maxDepth].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      rows[maxDepth + 1].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      rows[maxDepth + 2].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      rows[maxDepth + 3].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      rows[maxDepth + 4].push({ content: <span className="text-xs text-muted-foreground">–</span> });
      rows[maxDepth + 5].push({ content: <span className="text-xs text-muted-foreground">–</span> });
    });
    
    // Fyll i Given/When/Then + UI/API/DMN med merged cells baserat på groupedColumns
    groupedColumns.forEach(([groupKey, columns]) => {
      const firstCol = columns[0];
      const { callActivityNode, testInfo } = firstCol.groupedRow;
      const { path } = firstCol.groupedRow.pathRow;
      const colspan = columns.length;
      const startColIdx = firstCol.colIdx;
      
      // Hämta färg för testinfo-raderna baserat på callActivityNode
      let testInfoBackgroundColor: string | undefined = undefined;
      if (callActivityNode && callActivityNode.bpmnElementId) {
        const callActivityDepth = path.findIndex((n) => n.id === callActivityNode.id);
        if (callActivityDepth >= 0) {
          testInfoBackgroundColor = getCallActivityColor(
            path,
            callActivityNode.bpmnElementId,
            callActivityDepth,
          );
        }
      }
      
      const givenRowIdx = maxDepth;
      const whenRowIdx = maxDepth + 1;
      const thenRowIdx = maxDepth + 2;
      const uiRowIdx = maxDepth + 3;
      const apiRowIdx = maxDepth + 4;
      const dmnRowIdx = maxDepth + 5;

      if (testInfo) {
        // Given - skriv över första cellen och sätt colspan
        rows[givenRowIdx][startColIdx] = {
          content: renderBulletList(testInfo.subprocessStep.given),
          backgroundColor: testInfoBackgroundColor,
          colspan,
        };
        // Markera övriga celler i gruppen som ska hoppas över
        for (let i = 1; i < colspan; i++) {
          rows[givenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }
        
        // When
        rows[whenRowIdx][startColIdx] = {
          content: renderBulletList(testInfo.subprocessStep.when),
          backgroundColor: testInfoBackgroundColor,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[whenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }
        
        // Then
        rows[thenRowIdx][startColIdx] = {
          content: renderBulletList(testInfo.subprocessStep.then),
          backgroundColor: testInfoBackgroundColor,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[thenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }

        // UI-interaktion / API-anrop / DMN-beslut kommer från bankProjectStep (om den finns)
        if (testInfo.bankProjectStep) {
          const { uiInteraction, apiCall, dmnDecision } = testInfo.bankProjectStep;

          // UI-interaktion
          rows[uiRowIdx][startColIdx] = {
            content: renderBulletList(uiInteraction),
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          for (let i = 1; i < colspan; i++) {
            rows[uiRowIdx][startColIdx + i] = { content: <></>, skip: true };
          }

          // API-anrop
          rows[apiRowIdx][startColIdx] = {
            content: renderBulletList(apiCall, { isCode: true }),
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          for (let i = 1; i < colspan; i++) {
            rows[apiRowIdx][startColIdx + i] = { content: <></>, skip: true };
          }

          // DMN-beslut
          rows[dmnRowIdx][startColIdx] = {
            content: renderBulletList(dmnDecision),
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          for (let i = 1; i < colspan; i++) {
            rows[dmnRowIdx][startColIdx + i] = { content: <></>, skip: true };
          }
        } else {
          // Ingen bankProjectStep kopplad – sätt placeholders för UI/API/DMN
          rows[uiRowIdx][startColIdx] = {
            content: <span className="text-xs text-muted-foreground">–</span>,
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          rows[apiRowIdx][startColIdx] = {
            content: <span className="text-xs text-muted-foreground">–</span>,
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          rows[dmnRowIdx][startColIdx] = {
            content: <span className="text-xs text-muted-foreground">–</span>,
            backgroundColor: testInfoBackgroundColor,
            colspan,
          };
          for (let i = 1; i < colspan; i++) {
            rows[uiRowIdx][startColIdx + i] = { content: <></>, skip: true };
            rows[apiRowIdx][startColIdx + i] = { content: <></>, skip: true };
            rows[dmnRowIdx][startColIdx + i] = { content: <></>, skip: true };
          }
        }
      } else {
        // Ingen testinfo - sätt tomma celler med colspan
        rows[givenRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[givenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }
        
        rows[whenRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[whenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }
        
        rows[thenRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[thenRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }

        // UI-interaktion, API-anrop och DMN-beslut placeholders
        rows[uiRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        rows[apiRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        rows[dmnRowIdx][startColIdx] = {
          content: <span className="text-xs text-muted-foreground">–</span>,
          colspan,
        };
        for (let i = 1; i < colspan; i++) {
          rows[uiRowIdx][startColIdx + i] = { content: <></>, skip: true };
          rows[apiRowIdx][startColIdx + i] = { content: <></>, skip: true };
          rows[dmnRowIdx][startColIdx + i] = { content: <></>, skip: true };
        }
      }
    });
    
    return rows;
  }, [groupedRows, maxDepth, topLevelCallActivities, getCallActivityColor, groupedColumns]);

  // Välj rätt data baserat på viewMode
  const transposedData = viewMode === 'condensed' 
    ? transposedDataCondensed 
    : viewMode === 'hierarchical'
    ? transposedDataHierarchical
    : transposedDataFull;
  
  // Skapa rad-headers baserat på viewMode
  const rowHeaders = useMemo(() => {
    const headers = Array.from({ length: maxDepth }, (_, i) => `Nivå ${i}`);
    if (viewMode === 'condensed' || viewMode === 'hierarchical') {
      return [...headers, 'Aktiviteter', 'Given', 'When', 'Then', 'UI-interaktion', 'API-anrop', 'DMN-beslut'];
    } else {
      return [...headers, 'Given', 'When', 'Then', 'UI-interaktion', 'API-anrop', 'DMN-beslut'];
    }
  }, [maxDepth, viewMode]);

  // Kolumner baserat på viewMode
  const columns = viewMode === 'condensed' 
    ? callActivitiesList.map((callActivityData) => ({
        callActivityNode: callActivityData.callActivityNode,
        label: callActivityData.callActivityNode.label,
        bpmnFile: callActivityData.callActivityNode.bpmnFile,
      }))
    : viewMode === 'hierarchical'
    ? hierarchicalCallActivitiesList.map((callActivityData) => ({
        callActivityNode: callActivityData.callActivityNode,
        label: callActivityData.callActivityNode.label,
        bpmnFile: callActivityData.callActivityNode.bpmnFile,
      }))
    : groupedRows.map((groupedRow) => {
        const leafNode = groupedRow.pathRow.path[groupedRow.pathRow.path.length - 1];
        return {
          callActivityNode: null,
          label: leafNode?.label || 'Path',
          bpmnFile: leafNode?.bpmnFile || '',
        };
      });

  return (
    <div className="space-y-4">
      {/* View mode selector - bara visa om vi använder intern state (inte vid export) */}
      {!viewModeProp && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Vy:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={viewMode === 'condensed' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setViewMode('condensed')}
            >
              Kondenserad (per subprocess)
            </Button>
            <Button
              variant={viewMode === 'hierarchical' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setViewMode('hierarchical')}
            >
              Hierarkisk (alla subprocesser)
            </Button>
            <Button
              variant={viewMode === 'full' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setViewMode('full')}
            >
              Fullständig (per aktivitet)
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table 
          className="table-fixed w-full caption-bottom text-sm"
          data-view-mode={viewMode}
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] sticky left-0 bg-background z-10">Rad</TableHead>
              {columns.map((col, colIdx) => (
                <TableHead key={colIdx} className="w-[300px]">
                  <div className="text-xs font-medium truncate" title={col.label}>
                    {col.label}
                  </div>
                  {col.bpmnFile && (
                    <div className="text-xs text-muted-foreground truncate" title={col.bpmnFile}>
                      {col.bpmnFile}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transposedData.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell className="w-[100px] sticky left-0 bg-background z-10 font-medium">
                  {rowHeaders[rowIdx]}
                </TableCell>
                {row.map((cell, colIdx) => {
                  // Hoppa över celler som är markerade som skip (de är del av en merged cell)
                  if (cell.skip) {
                    return null;
                  }
                  
                  // Identifiera om detta är en testinfo-rad (Given, When, Then, UI, API, DMN)
                  const isTestInfoRow = (viewMode === 'condensed' || viewMode === 'hierarchical')
                    ? rowIdx >= maxDepth + 1 
                    : rowIdx >= maxDepth;
                  
                  return (
                    <TableCell
                      key={colIdx}
                      className="align-top"
                      style={{
                        backgroundColor: cell.backgroundColor,
                        padding: isTestInfoRow ? '4px 8px' : undefined,
                      }}
                      colSpan={cell.colspan}
                    >
                      {isTestInfoRow ? (
                        <div 
                          className="overflow-y-auto"
                          style={{
                            maxHeight: '150px',
                          }}
                        >
                          {cell.content}
                        </div>
                      ) : (
                        cell.content
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

// OLD CODE REMOVED - using callActivitiesList instead
