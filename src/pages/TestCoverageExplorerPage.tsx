import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs, type ViewKey } from '@/components/AppHeaderWithTabs';
import { navigateToView } from '@/utils/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, X, ChevronDown, ChevronUp, GitBranch } from 'lucide-react';
import { TestCoverageTable } from '@/components/TestCoverageTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';
import { sortCallActivities } from '@/lib/ganttDataConverter';
import { loadAllE2eScenarios } from '@/lib/e2eScenarioStorage';

export default function TestCoverageExplorerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: rootFile, isLoading: isLoadingRoot } = useRootBpmnFile();
  const { data: tree, isLoading: isLoadingTree, error } = useProcessTree(rootFile || 'mortgage.bpmn');

  // Ladda E2E-scenarios från storage
  const [e2eScenarios, setE2eScenarios] = useState<E2eScenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  const isLoading = isLoadingRoot || isLoadingTree || isLoadingScenarios;

  useEffect(() => {
    const loadScenarios = async () => {
      setIsLoadingScenarios(true);
      try {
        const scenarios = await loadAllE2eScenarios();
        setE2eScenarios(scenarios);
      } catch (error) {
        console.error('[TestCoverageExplorerPage] Failed to load E2E scenarios:', error);
      } finally {
        setIsLoadingScenarios(false);
      }
    };
    
    loadScenarios();
  }, []);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'condensed' | 'hierarchical' | 'full'>('condensed');
  const [expandedScenarioDetails, setExpandedScenarioDetails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Sätt första scenariot som standard när e2eScenarios är tillgängligt
  useEffect(() => {
    if (e2eScenarios.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(e2eScenarios[0].id);
    }
  }, [e2eScenarios, selectedScenarioId]);


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
      // Hämta alla tre tabellerna (från dolda div:er)
      const condensedTableElement = document.querySelector('[data-export-view="condensed"] table.table-fixed');
      const hierarchicalTableElement = document.querySelector('[data-export-view="hierarchical"] table.table-fixed');
      const fullTableElement = document.querySelector('[data-export-view="full"] table.table-fixed');
      
      if (!condensedTableElement || !hierarchicalTableElement || !fullTableElement) {
        toast({
          title: 'Export misslyckades',
          description: 'Kunde inte hitta alla tabeller. Vänta några sekunder och försök igen.',
          variant: 'destructive',
        });
        return;
      }

      // Klona alla tre tabellerna för att behålla alla styles
      const clonedCondensedTable = condensedTableElement.cloneNode(true) as HTMLElement;
      const clonedHierarchicalTable = hierarchicalTableElement.cloneNode(true) as HTMLElement;
      const clonedFullTable = fullTableElement.cloneNode(true) as HTMLElement;
      
      // Lägg till data-attribut för att identifiera vyerna
      clonedCondensedTable.setAttribute('data-view-mode', 'condensed');
      clonedHierarchicalTable.setAttribute('data-view-mode', 'hierarchical');
      clonedFullTable.setAttribute('data-view-mode', 'full');
      
      // Dölj alla tabeller först (JavaScript kommer att visa rätt en)
      clonedCondensedTable.style.display = 'none';
      clonedHierarchicalTable.style.display = 'none';
      clonedFullTable.style.display = 'none';
      
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
      
      // Kopiera styles för alla tre tabellerna
      const copyStylesForTable = (source: Element, target: HTMLElement, viewMode: string) => {
        copyStyles(source, target);
        
        const maxDepth = calculateMaxDepth(tree);
        const tbody = target.querySelector('tbody');
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
      };
      
      copyStylesForTable(condensedTableElement, clonedCondensedTable, 'condensed');
      copyStylesForTable(hierarchicalTableElement, clonedHierarchicalTable, 'hierarchical');
      copyStylesForTable(fullTableElement, clonedFullTable, 'full');

      // Hämta valt scenario-namn (använd första scenariot om inget är valt)
      const effectiveScenarioId = selectedScenarioId || (e2eScenarios.length > 0 ? e2eScenarios[0].id : '');
      const selectedScenario = e2eScenarios.find((s) => s.id === effectiveScenarioId);
      const scenarioName = selectedScenario ? `${selectedScenario.id} – ${selectedScenario.name}` : '';
      
      // Standardvy är condensed
      const defaultViewMode = 'condensed';

      // Förbered scenario-data för export (endast nödvändig data)
      const scenariosData = e2eScenarios.map((s) => ({
        id: s.id,
        name: s.name,
      }));


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
    .filter-button.disabled,
    .filter-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: #f3f4f6;
      color: #9ca3af;
      border-color: #e5e7eb;
    }
    .filter-button.disabled:hover,
    .filter-button:disabled:hover {
      background-color: #f3f4f6;
      border-color: #e5e7eb;
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
        ${scenariosData.map((s) => `<button class="filter-button ${effectiveScenarioId === s.id ? 'active' : ''}" data-scenario="${s.id}">${s.id} – ${s.name}</button>`).join('')}
      </div>
    </div>
    <div class="filter-group">
      <label>Vy:</label>
      <div class="filter-buttons">
        <button class="filter-button ${defaultViewMode === 'condensed' ? 'active' : ''}" data-view-mode="condensed">Kondenserad (per subprocess)</button>
        <button class="filter-button ${defaultViewMode === 'hierarchical' ? 'active' : ''}" data-view-mode="hierarchical">Hierarkisk (alla subprocesser)</button>
        <button class="filter-button ${defaultViewMode === 'full' ? 'active' : ''}" data-view-mode="full">Fullständig (per aktivitet)</button>
      </div>
    </div>
  </div>
  <div class="table-container">
    ${clonedCondensedTable.outerHTML}
    ${clonedHierarchicalTable.outerHTML}
    ${clonedFullTable.outerHTML}
  </div>
  <script>
    // Scenario-data
    const scenariosData = ${JSON.stringify(scenariosData)};
    let currentScenarioId = '${effectiveScenarioId}';
    let currentViewMode = '${defaultViewMode}';
    
    // Hitta alla tabeller
    const tables = {
      condensed: document.querySelector('table[data-view-mode="condensed"]'),
      hierarchical: document.querySelector('table[data-view-mode="hierarchical"]'),
      full: document.querySelector('table[data-view-mode="full"]')
    };
    
    // Visa/dölj tabeller baserat på vald vy
    function showViewMode(viewMode) {
      Object.keys(tables).forEach(mode => {
        if (tables[mode]) {
          tables[mode].style.display = mode === viewMode ? '' : 'none';
        }
      });
      currentViewMode = viewMode;
    }
    
    // Filtrera baserat på scenario
    function filterByScenario(scenarioId) {
      // Om inget scenario är valt, använd första scenariot
      if (!scenarioId && scenariosData.length > 0) {
        scenarioId = scenariosData[0].id;
        currentScenarioId = scenarioId;
        // Uppdatera aktiva knappar
        document.querySelectorAll('.filter-button[data-scenario]').forEach(btn => {
          btn.classList.remove('active');
          if (btn.getAttribute('data-scenario') === scenarioId) {
            btn.classList.add('active');
          }
        });
      }
      
      const activeTable = tables[currentViewMode];
      if (!activeTable) return;
      
      const thead = activeTable.querySelector('thead');
      const tbody = activeTable.querySelector('tbody');
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
          shouldShow = scenarioId === exportedScenario;
        } else {
          // Om filen exporterades med flera scenarion, filtrera baserat på scenario
          const scenariosAttr = cell.getAttribute('data-scenarios');
          if (scenarioId && scenariosAttr) {
            try {
              const scenarios = JSON.parse(scenariosAttr);
              shouldShow = scenarios.includes(scenarioId);
            } catch (e) {
              shouldShow = true;
            }
          } else if (!scenarioId) {
            // Om inget scenario är valt, visa inget
            shouldShow = false;
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
      
      currentScenarioId = scenarioId;
    }
    
    // Växla vy
    function changeViewMode(viewMode) {
      showViewMode(viewMode);
      // Filtrera igen med nuvarande scenario när vi växlar vy
      filterByScenario(currentScenarioId);
    }
    
    // Event listeners för scenario-knappar
    document.querySelectorAll('.filter-button[data-scenario]').forEach(button => {
      button.addEventListener('click', function() {
        const scenarioId = this.getAttribute('data-scenario');
        
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
        
        // Uppdatera aktiva knappar
        document.querySelectorAll('.filter-button[data-view-mode]').forEach(btn => {
          btn.classList.remove('active');
        });
        this.classList.add('active');
        
        changeViewMode(viewMode);
      });
    });
    
    // Initial filtrering och vy
    showViewMode(currentViewMode);
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
    navigateToView(navigate, view as ViewKey);
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
              {/* Dolda tabeller för export - alla tre vyerna */}
              <div style={{ display: 'none' }}>
                <div data-export-view="condensed">
                  <TestCoverageTable
                    tree={tree}
                    scenarios={e2eScenarios}
                    selectedScenarioId={selectedScenarioId}
                    viewMode="condensed"
                    searchQuery={searchQuery}
                  />
                </div>
                <div data-export-view="hierarchical">
                  <TestCoverageTable
                    tree={tree}
                    scenarios={e2eScenarios}
                    selectedScenarioId={selectedScenarioId}
                    viewMode="hierarchical"
                    searchQuery={searchQuery}
                  />
                </div>
                <div data-export-view="full">
                  <TestCoverageTable
                    tree={tree}
                    scenarios={e2eScenarios}
                    selectedScenarioId={selectedScenarioId}
                    viewMode="full"
                    searchQuery={searchQuery}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* E2E Scenario Details Section */}
          {e2eScenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>E2E Scenario-detaljer</CardTitle>
                <CardDescription>
                  Detaljerad information om E2E-scenarierna. Expandera för att se given/when/then och subprocessSteps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {e2eScenarios.map((scenario) => {
                  const isExpanded = expandedScenarioDetails.has(scenario.id);
                  const isSelected = selectedScenarioId === scenario.id;
                  
                  return (
                    <Collapsible
                      key={scenario.id}
                      open={isExpanded}
                      onOpenChange={(open) => {
                        const newSet = new Set(expandedScenarioDetails);
                        if (open) {
                          newSet.add(scenario.id);
                        } else {
                          newSet.delete(scenario.id);
                        }
                        setExpandedScenarioDetails(newSet);
                      }}
                    >
                      <div className={`border rounded-lg ${isSelected ? 'border-primary' : 'border-border'}`}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                                  <h3 className="font-semibold text-base">{scenario.name}</h3>
                                  {isSelected && (
                                    <Badge variant="default" className="text-xs">Valt</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">{scenario.id}</Badge>
                                  <Badge variant="outline" className="text-xs">{scenario.priority}</Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {scenario.type === 'happy-path' ? 'Happy path' : scenario.type === 'alt-path' ? 'Alt path' : 'Error'}
                                  </Badge>
                                  {scenario.iteration && (
                                    <Badge variant="outline" className="text-xs">{scenario.iteration}</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{scenario.summary}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-4 border-t">
                            {/* Summary */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Beskrivning</h4>
                              <p className="text-sm text-muted-foreground">{scenario.summary}</p>
                            </div>

                            {/* Given/When/Then på root-nivå */}
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">Given</h4>
                                <div className="text-sm whitespace-pre-line">{scenario.given}</div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">When</h4>
                                <div className="text-sm whitespace-pre-line">{scenario.when}</div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">Then</h4>
                                <div className="text-sm whitespace-pre-line">{scenario.then}</div>
                              </div>
                            </div>

                            {/* SubprocessSteps */}
                            {scenario.subprocessSteps && scenario.subprocessSteps.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                  Subprocesser / Feature Goals i scenariot ({scenario.subprocessSteps.length} steg)
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="min-w-[200px]">BPMN-fil</TableHead>
                                        <TableHead className="min-w-[150px]">Feature Goal</TableHead>
                                        <TableHead className="min-w-[200px]">Beskrivning</TableHead>
                                        <TableHead className="min-w-[200px]">Given</TableHead>
                                        <TableHead className="min-w-[200px]">When</TableHead>
                                        <TableHead className="min-w-[200px]">Then</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {scenario.subprocessSteps.map((step) => (
                                        <TableRow key={`${scenario.id}-step-${step.order}`}>
                                          <TableCell className="text-xs text-muted-foreground">{step.order}</TableCell>
                                          <TableCell className="text-xs font-mono">{step.bpmnFile}</TableCell>
                                          <TableCell className="text-xs">
                                            {step.callActivityId ? (
                                              <code className="text-[11px] font-mono">{step.callActivityId}</code>
                                            ) : (
                                              <span className="text-muted-foreground">–</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-xs">{step.description || '–'}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                            {step.given ? (
                                              <div className="whitespace-pre-line line-clamp-3">{step.given}</div>
                                            ) : (
                                              '–'
                                            )}
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                            {step.when ? (
                                              <div className="whitespace-pre-line line-clamp-3">{step.when}</div>
                                            ) : (
                                              '–'
                                            )}
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                            {step.then ? (
                                              <div className="whitespace-pre-line line-clamp-3">{step.then}</div>
                                            ) : (
                                              '–'
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Bank Project Test Steps */}
                            {scenario.bankProjectTestSteps && scenario.bankProjectTestSteps.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                  Teststeg för bankprojektet ({scenario.bankProjectTestSteps.length} steg)
                                </h4>
                                <div className="space-y-2">
                                  {scenario.bankProjectTestSteps.map((testStep, idx) => (
                                    <div key={`${scenario.id}-teststep-${idx}`} className="border rounded p-3 bg-muted/30">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs">{testStep.bpmnNodeName}</Badge>
                                        <span className="text-xs text-muted-foreground font-mono">{testStep.bpmnNodeId}</span>
                                      </div>
                                      <div className="grid gap-2 md:grid-cols-2 text-xs">
                                        <div>
                                          <span className="font-semibold text-muted-foreground">Action: </span>
                                          <span>{testStep.action}</span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-muted-foreground">Assertion: </span>
                                          <span>{testStep.assertion}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {scenario.notesForBankProject && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Implementeringsnoteringar</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{scenario.notesForBankProject}</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}


