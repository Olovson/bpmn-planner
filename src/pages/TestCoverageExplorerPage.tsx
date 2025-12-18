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

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
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

  // Export-funktion - exporterar som HTML med exakt samma formatering
  const exportToHtml = () => {
    if (!tree) return;

    try {
      // Hämta tabellens DOM-element
      const tableElement = document.querySelector('table.table-fixed');
      if (!tableElement) {
        toast({
          title: 'Export misslyckades',
          description: 'Kunde inte hitta tabellen på sidan',
          variant: 'destructive',
        });
        return;
      }

      // Klona tabellen för att behålla alla styles
      const clonedTable = tableElement.cloneNode(true) as HTMLElement;
      
      // Kopiera alla inline styles från originaltabellen
      const copyStyles = (source: Element, target: Element) => {
        if (source instanceof HTMLElement && target instanceof HTMLElement) {
          const computedStyle = window.getComputedStyle(source);
          const styleProps = ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'padding', 'textAlign', 'verticalAlign', 'border', 'width', 'minWidth', 'maxHeight', 'overflowY', 'overflow'];
          
          styleProps.forEach((prop) => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'none' && value !== 'normal') {
              // Konvertera camelCase till kebab-case för CSS
              const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
              target.style.setProperty(cssProp, value);
            }
          });
          
          // Kopiera inline style attribute om det finns (detta har högst prioritet)
          if (source.getAttribute('style')) {
            const existingStyle = target.getAttribute('style') || '';
            target.setAttribute('style', existingStyle + '; ' + source.getAttribute('style'));
          }
        }
        
        // Rekursivt kopiera för barn
        const sourceChildren = Array.from(source.children);
        const targetChildren = Array.from(target.children);
        sourceChildren.forEach((sourceChild, index) => {
          if (targetChildren[index]) {
            copyStyles(sourceChild, targetChildren[index]);
          }
        });
      };
      
      copyStyles(tableElement, clonedTable);
      
      // Se till att alla div-element inuti testinfo-cellerna får rätt max-height
      // Detektera vilken vy som är aktiv baserat på data-attribut
      const viewMode = tableElement.getAttribute('data-view-mode') || 'condensed';
      const maxDepth = calculateMaxDepth(tree);
      const tbody = clonedTable.querySelector('tbody');
      if (tbody) {
        const rows = Array.from(tbody.children);
        
        // Hitta testinfo-rader dynamiskt baserat på rad-headers istället för att anta position
        // Testinfo-rader är: Given, When, Then, UI-interaktion, API-anrop, DMN-beslut
        const testInfoRowHeaders = ['Given', 'When', 'Then', 'UI-interaktion', 'API-anrop', 'DMN-beslut'];
        if (viewMode === 'condensed' || viewMode === 'hierarchical') {
          // I kondenserad och hierarkisk vy finns också "Aktiviteter" rad
          testInfoRowHeaders.unshift('Aktiviteter');
        }
        
        rows.forEach((row, rowIndex) => {
          // Hitta första cellen (rad-header) för att identifiera rad-typen
          const firstCell = row.querySelector('td:first-child, th:first-child');
          if (firstCell) {
            const rowHeader = firstCell.textContent?.trim() || '';
            // Om detta är en testinfo-rad, sätt max-height på divs i cellerna
            if (testInfoRowHeaders.includes(rowHeader) || rowIndex >= maxDepth) {
              const cells = Array.from(row.children);
              // Hoppa över första cellen (rad-header)
              cells.slice(1).forEach((cell) => {
                const divs = cell.querySelectorAll('div');
                divs.forEach((div) => {
                  // Sätt max-height och overflow-y om de inte redan är satta
                  const divEl = div as HTMLElement;
                  if (!divEl.style.maxHeight || divEl.style.maxHeight === 'none') {
                    divEl.style.setProperty('max-height', '150px');
                    divEl.style.setProperty('overflow-y', 'auto');
                  }
                });
              });
            }
          }
        });
      }

      // Hämta valt scenario-namn
      const selectedScenario = e2eScenarios.find((s) => s.id === selectedScenarioId);
      const scenarioName = selectedScenario ? `${selectedScenario.id} – ${selectedScenario.name}` : '';
      
      // viewMode och tbody är redan deklarerade ovan
      const viewModeLabel = viewMode === 'condensed' 
        ? 'Kondenserad (per subprocess)' 
        : viewMode === 'hierarchical'
        ? 'Hierarkisk (alla subprocesser)'
        : 'Fullständig (per aktivitet)';

      // Förbered scenario-data för export (endast nödvändig data)
      const scenariosData = e2eScenarios.map((s) => ({
        id: s.id,
        name: s.name,
      }));

      // Lägg till data-attribut på kolumner och celler för att kunna filtrera
      // I kondenserad vy: kolumner är per callActivity, test-info kan komma från olika scenarion
      // I fullständig vy: kolumner är per path, varje kolumn kan tillhöra olika scenarion
      const thead = clonedTable.querySelector('thead');
      
      // Bygg en map över vilka callActivities som tillhör vilka scenarion
      const callActivityToScenarios = new Map<string, Set<string>>();
      e2eScenarios.forEach((scenario) => {
        scenario.subprocessSteps.forEach((step) => {
          if (step.callActivityId) {
            if (!callActivityToScenarios.has(step.callActivityId)) {
              callActivityToScenarios.set(step.callActivityId, new Set());
            }
            callActivityToScenarios.get(step.callActivityId)!.add(scenario.id);
          }
        });
      });
      
      if (thead && tbody) {
        const headerRow = thead.querySelector('tr');
        const dataRows = Array.from(tbody.querySelectorAll('tr'));
        
        if (headerRow) {
          const headerCells = Array.from(headerRow.querySelectorAll('th'));
          
          // För kondenserad och hierarkisk vy: kolumner är callActivities
          if (viewMode === 'condensed' || viewMode === 'hierarchical') {
            const allScenarioIds = Array.from(new Set(Array.from(callActivityToScenarios.values()).flatMap(s => Array.from(s))));
            headerCells.forEach((cell, idx) => {
              if (idx > 0) {
                // Markera alla kolumner som kan innehålla data från alla scenarion
                cell.setAttribute('data-scenarios', JSON.stringify(allScenarioIds));
                cell.setAttribute('data-exported-scenario', selectedScenarioId || 'all');
              }
            });
          } else {
            // För fullständig vy: varje kolumn kan tillhöra olika scenarion
            // Detta är mer komplext och kräver att vi vet vilket scenario varje path tillhör
            // För nu, markerar vi alla kolumner som kan innehålla data från alla scenarion
            const allScenarioIds = Array.from(new Set(Array.from(callActivityToScenarios.values()).flatMap(s => Array.from(s))));
            headerCells.forEach((cell, idx) => {
              if (idx > 0) {
                cell.setAttribute('data-scenarios', JSON.stringify(allScenarioIds));
                cell.setAttribute('data-exported-scenario', selectedScenarioId || 'all');
              }
            });
          }
        }
      }

      // Skapa komplett HTML-dokument med interaktiv filtrering
      const htmlContent = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Coverage - ${scenarioName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: #ffffff;
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header p {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .filters {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .filter-group label {
      font-weight: 500;
      font-size: 14px;
      color: #374151;
      min-width: 80px;
    }
    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .filter-button {
      padding: 4px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 12px;
      background-color: white;
      color: #1f2937;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-button:hover {
      border-color: #9ca3af;
      background-color: #f9fafb;
    }
    .filter-button.active {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    .filter-button.active:hover {
      background-color: #2563eb;
      border-color: #2563eb;
    }
    .table-container {
      overflow-x: auto;
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    th {
      background-color: #f9fafb;
      font-weight: 600;
    }
    /* Testinfo-cellerna (Given, When, Then) ska ha max-höjd */
    td > div {
      max-height: 150px;
      overflow-y: auto;
    }
    td > div ul {
      margin: 0;
      padding-left: 20px;
    }
    td > div li {
      margin-bottom: 4px;
    }
    @media print {
      body {
        padding: 0;
      }
      .header {
        page-break-after: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Test Coverage Explorer</h1>
    <p><strong>Exporterad:</strong> ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
  </div>
  <div class="filters">
    <div class="filter-group">
      <label>Scenario:</label>
      <div class="filter-buttons">
        <button class="filter-button ${!selectedScenarioId ? 'active' : ''}" data-scenario="all">Alla scenarion</button>
        ${scenariosData.map((s) => `<button class="filter-button ${selectedScenarioId === s.id ? 'active' : ''}" data-scenario="${s.id}">${s.id} – ${s.name}</button>`).join('')}
      </div>
    </div>
    <div class="filter-group">
      <label>Vy:</label>
      <div class="filter-buttons">
        <button class="filter-button ${viewMode === 'condensed' ? 'active' : ''}" data-view-mode="condensed">Kondenserad (per subprocess)</button>
        <button class="filter-button ${viewMode === 'hierarchical' ? 'active' : ''}" data-view-mode="hierarchical">Hierarkisk (alla subprocesser)</button>
        <button class="filter-button ${viewMode === 'full' ? 'active' : ''}" data-view-mode="full">Fullständig (per aktivitet)</button>
      </div>
    </div>
  </div>
  <div class="table-container">
    ${clonedTable.outerHTML}
  </div>
  <script>
    // Scenario-data
    const scenariosData = ${JSON.stringify(scenariosData)};
    const currentScenarioId = '${selectedScenarioId || 'all'}';
    const currentViewMode = '${viewMode}';
    
    // Filtrera baserat på scenario
    function filterByScenario(scenarioId) {
      const table = document.querySelector('table');
      if (!table) return;
      
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      if (!thead || !tbody) return;
      
      const headerRow = thead.querySelector('tr');
      if (!headerRow) return;
      
      const headerCells = Array.from(headerRow.querySelectorAll('th'));
      const dataRows = Array.from(tbody.querySelectorAll('tr'));
      
      headerCells.forEach((cell, colIdx) => {
        if (colIdx === 0) return; // Hoppa över "Rad"-kolumnen
        
        const exportedScenario = cell.getAttribute('data-exported-scenario');
        let shouldShow = true;
        
        // Om filen exporterades med ett specifikt scenario, visa bara om det matchar
        if (exportedScenario && exportedScenario !== 'all') {
          shouldShow = scenarioId === 'all' || scenarioId === exportedScenario;
        } else {
          // Om filen exporterades med "Alla scenarion", filtrera baserat på scenario
          const scenariosAttr = cell.getAttribute('data-scenarios');
          if (scenarioId !== 'all' && scenariosAttr) {
            try {
              const scenarios = JSON.parse(scenariosAttr);
              shouldShow = scenarios.includes(scenarioId);
            } catch (e) {
              shouldShow = true;
            }
          }
        }
        
        // Visa/dölj kolumn
        cell.style.display = shouldShow ? '' : 'none';
        
        // Visa/dölj motsvarande celler i data-rader
        dataRows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells[colIdx]) {
            cells[colIdx].style.display = shouldShow ? '' : 'none';
          }
        });
      });
    }
    
    // Växla vy (detta kräver att vi har båda vyerna exporterade, vilket vi inte har ännu)
    // För nu, visa bara en varning om användaren försöker växla
    function changeViewMode(viewMode) {
      if (viewMode !== currentViewMode) {
        alert('Vy-växling kräver att filen exporteras med båda vyerna. Exportera igen med önskad vy vald.');
        // Återställ dropdown till nuvarande värde
        document.getElementById('view-mode-select').value = currentViewMode;
        return;
      }
    }
    
    // Event listeners för scenario-knappar
    document.querySelectorAll('.filter-button[data-scenario]').forEach(button => {
      button.addEventListener('click', function() {
        const scenarioId = this.getAttribute('data-scenario') === 'all' ? 'all' : this.getAttribute('data-scenario');
        
        // Uppdatera aktiva knappar
        document.querySelectorAll('.filter-button[data-scenario]').forEach(btn => {
          btn.classList.remove('active');
        });
        this.classList.add('active');
        
        filterByScenario(scenarioId);
      });
    });
    
    // Event listeners för view mode-knappar
    document.querySelectorAll('.filter-button[data-view-mode]').forEach(button => {
      button.addEventListener('click', function() {
        const viewMode = this.getAttribute('data-view-mode');
        
        if (viewMode !== currentViewMode) {
          alert('Vy-växling kräver att filen exporteras med båda vyerna. Exportera igen med önskad vy vald.');
          return;
        }
        
        // Uppdatera aktiva knappar
        document.querySelectorAll('.filter-button[data-view-mode]').forEach(btn => {
          btn.classList.remove('active');
        });
        this.classList.add('active');
      });
    });
    
    // Initial filtrering
    filterByScenario(currentScenarioId);
  </script>
</body>
</html>`;

      // Skapa blob och ladda ner
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      link.download = `test-coverage_${timestamp}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export slutförd',
        description: `Tabellen exporterad som HTML`,
      });
    } catch (error) {
      toast({
        title: 'Export misslyckades',
        description: error instanceof Error ? error.message : 'Ett fel uppstod vid export',
        variant: 'destructive',
      });
    }
  };

  // Export-funktion - exporterar i transponerad struktur (samma som tabellen)
  const exportToExcel = () => {
    if (!tree) return;

    try {
      // Detektera vilken vy som är aktiv
      const tableElement = document.querySelector('table.table-fixed');
      const viewMode = tableElement?.getAttribute('data-view-mode') || 'condensed';
      
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
      groupedRows.sort((a, b) => {
        const pathA = a.pathRow.path;
        const pathB = b.pathRow.path;
        const minLength = Math.min(pathA.length, pathB.length);

        for (let i = 0; i < minLength; i++) {
          const nodeA = pathA[i];
          const nodeB = pathB[i];

          if (nodeA.id === nodeB.id) {
            continue;
          }

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

        return pathA.length - pathB.length;
      });

      // Identifiera toppnivå-callActivities för färgning
      const topLevelCallActivities = new Map<string, { node: ProcessTreeNode; colorIndex: number }>();
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

      pathRows.forEach((pathRow) => {
        if (pathRow.path.length > 1) {
          const level1Node = pathRow.path[1];
          if (level1Node.type === 'callActivity' && level1Node.bpmnElementId) {
            if (!topLevelCallActivities.has(level1Node.bpmnElementId)) {
              topLevelCallActivities.set(level1Node.bpmnElementId, {
                node: level1Node,
                colorIndex: topLevelCallActivities.size,
              });
            }
          }
        }
      });

      // Hjälpfunktion för att hitta toppnivå-callActivity
      const findTopLevelCallActivity = (path: ProcessTreeNode[], callActivityId: string, depth: number): string | null => {
        if (depth === 1) {
          return callActivityId;
        }
        if (path.length > 1) {
          const level1Node = path[1];
          if (level1Node.type === 'callActivity' && level1Node.bpmnElementId) {
            return level1Node.bpmnElementId;
          }
        }
        return null;
      };

      // Hjälpfunktion för att hitta alla callActivities i en path
      const getCallActivitiesInPath = (path: ProcessTreeNode[]): Array<{ node: ProcessTreeNode; depth: number }> => {
        const callActivities: Array<{ node: ProcessTreeNode; depth: number }> = [];
        path.forEach((node, index) => {
          if (node.type === 'callActivity' && node.bpmnElementId) {
            callActivities.push({ node, depth: index });
          }
        });
        return callActivities;
      };

      // Hjälpfunktion för att få färg
      const getCallActivityColor = (
        path: ProcessTreeNode[],
        callActivityId: string,
        depth: number,
      ): string | undefined => {
        const topLevelId = findTopLevelCallActivity(path, callActivityId, depth);
        if (!topLevelId) return undefined;
        
        const topLevelInfo = topLevelCallActivities.get(topLevelId);
        if (!topLevelInfo) return undefined;
        
        const baseColor = baseColors[topLevelInfo.colorIndex % baseColors.length];
        
        let opacity = 0.08;
        if (depth === 1) opacity = 0.15;
        else if (depth === 2) opacity = 0.12;
        else if (depth === 3) opacity = 0.10;
        
        return `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
      };

      // Gruppera kolumner efter groupKey för att hantera merged cells
      const groupedColumns = new Map<string, Array<{ colIdx: number; groupedRow: typeof groupedRows[0] }>>();
      groupedRows.forEach((groupedRow, colIdx) => {
        const groupKey = groupedRow.groupKey;
        if (!groupedColumns.has(groupKey)) {
          groupedColumns.set(groupKey, []);
        }
        groupedColumns.get(groupKey)!.push({ colIdx, groupedRow });
      });

      // Förbered transponerad data (rader = Nivå 0, Nivå 1, ..., Given, When, Then; kolumner = paths)
      const exportRows: Array<Array<{ value: string; backgroundColor?: string }>> = [];
      const rowCount = maxDepth + 3; // maxDepth nivåer + Given + When + Then

      // Initiera rader
      for (let i = 0; i < rowCount; i++) {
        exportRows.push([]);
      }

      // Fyll i data för varje kolumn (path)
      groupedRows.forEach((groupedRow, colIdx) => {
        const { pathRow, callActivityNode, testInfo } = groupedRow;
        const { path } = pathRow;

        // Fyll i hierarki-kolumner (Nivå 0, Nivå 1, etc.)
        for (let level = 0; level < maxDepth; level++) {
          const node = path[level];
          let backgroundColor: string | undefined = undefined;

          if (node) {
            if (node.type === 'callActivity' && node.bpmnElementId) {
              backgroundColor = getCallActivityColor(path, node.bpmnElementId, level);
            } else {
              const callActivitiesInPath = getCallActivitiesInPath(path);
              if (callActivitiesInPath.length > 0) {
                const nearestCallActivity = callActivitiesInPath
                  .filter((ca) => ca.depth < level)
                  .sort((a, b) => b.depth - a.depth)[0];
                
                if (nearestCallActivity && nearestCallActivity.node.bpmnElementId) {
                  backgroundColor = getCallActivityColor(
                    path,
                    nearestCallActivity.node.bpmnElementId,
                    nearestCallActivity.depth,
                  );
                }
              }
            }

            const nodeLabel = node.label || '';
            exportRows[level].push({ value: nodeLabel, backgroundColor });
          } else {
            exportRows[level].push({ value: '' });
          }
        }

        // Fyll i Given/When/Then
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

        if (testInfo) {
          exportRows[maxDepth].push({
            value: testInfo.subprocessStep.given || '',
            backgroundColor: testInfoBackgroundColor,
          });
          exportRows[maxDepth + 1].push({
            value: testInfo.subprocessStep.when || '',
            backgroundColor: testInfoBackgroundColor,
          });
          exportRows[maxDepth + 2].push({
            value: testInfo.subprocessStep.then || '',
            backgroundColor: testInfoBackgroundColor,
          });
        } else {
          exportRows[maxDepth].push({ value: '' });
          exportRows[maxDepth + 1].push({ value: '' });
          exportRows[maxDepth + 2].push({ value: '' });
        }
      });

      // Konvertera till Excel-format
      const excelData: any[][] = [];
      
      // Rad-header (första kolumnen)
      const rowHeaders = Array.from({ length: maxDepth }, (_, i) => `Nivå ${i}`);
      rowHeaders.push('Given', 'When', 'Then');

      // Kolumn-headers (första raden)
      const headerRow: any[] = ['Rad'];
      groupedRows.forEach((groupedRow) => {
        const leafNode = groupedRow.pathRow.path[groupedRow.pathRow.path.length - 1];
        headerRow.push(leafNode?.label || '');
      });
      excelData.push(headerRow);

      // Data-rader
      exportRows.forEach((row, rowIdx) => {
        const excelRow: any[] = [rowHeaders[rowIdx]];
        row.forEach((cell) => {
          excelRow.push(cell.value);
        });
        excelData.push(excelRow);
      });

      // Skapa worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Sätt kolumnbredder
      const colWidths: any[] = [{ wch: 12 }]; // Rad-header
      for (let i = 0; i < groupedRows.length; i++) {
        colWidths.push({ wch: 30 }); // Varje path-kolumn
      }
      ws['!cols'] = colWidths;

      // Applicera färger på celler
      // Excel stöder inte rgba med opacity, så vi konverterar till RGB och gör färgerna lite mörkare för bättre synlighet
      for (let rowIdx = 0; rowIdx < exportRows.length; rowIdx++) {
        const row = exportRows[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];
          if (cell.backgroundColor) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx + 1 }); // +1 för header-rad
            if (!ws[cellRef]) continue;
            
            // Konvertera rgba till RGB och gör färgen lite mörkare för bättre synlighet i Excel
            const rgbMatch = cell.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
              let r = parseInt(rgbMatch[1]);
              let g = parseInt(rgbMatch[2]);
              let b = parseInt(rgbMatch[3]);
              
              // Gör färgen lite mörkare för bättre synlighet (blend med vit bakgrund)
              // Formel: result = original * opacity + white * (1 - opacity)
              // För opacity ~0.1-0.15, gör vi färgen mer synlig
              r = Math.min(255, Math.round(r + (255 - r) * 0.7)); // Gör 70% mer synlig
              g = Math.min(255, Math.round(g + (255 - g) * 0.7));
              b = Math.min(255, Math.round(b + (255 - b) * 0.7));
              
              const hexColor = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
              
              // Sätt färg
              if (!ws[cellRef].s) ws[cellRef].s = {};
              ws[cellRef].s.fill = {
                fgColor: { rgb: hexColor },
                patternType: 'solid',
              };
            }
          }
        }
      }

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
        description: `Tabellen exporterad till ${filename}`,
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
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Scenario:</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={!selectedScenarioId ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSelectedScenarioId('')}
                        >
                          Alla scenarion
                        </Button>
                        {e2eScenarios.map((s) => (
                          <Button
                            key={s.id}
                            variant={selectedScenarioId === s.id ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSelectedScenarioId(s.id)}
                          >
                            {s.id} – {s.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToExcel} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportera till Excel
                    </Button>
                    <Button onClick={exportToHtml} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportera till HTML
                    </Button>
                  </div>
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


