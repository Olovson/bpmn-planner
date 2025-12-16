import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simulera ProcessTreeNode typen
interface ProcessTreeNode {
  id: string;
  label: string;
  type: string;
  bpmnFile: string;
  bpmnElementId?: string;
  children: ProcessTreeNode[];
}

// Nuvarande logik: bara leaf-noder
function flattenToPathsCurrent(
  node: ProcessTreeNode,
  currentPath: ProcessTreeNode[] = [],
): Array<{ path: ProcessTreeNode[]; isLeaf: boolean }> {
  const newPath = [...currentPath, node];
  const rows: Array<{ path: ProcessTreeNode[]; isLeaf: boolean }> = [];

  // Om noden är en leaf (inga barn), skapa en rad
  if (node.children.length === 0) {
    rows.push({ path: newPath, isLeaf: true });
  } else {
    // Annars, fortsätt rekursivt med alla barn
    for (const child of node.children) {
      rows.push(...flattenToPathsCurrent(child, newPath));
    }
  }

  return rows;
}

// Ny logik: alla noder
function flattenToPathsNew(
  node: ProcessTreeNode,
  currentPath: ProcessTreeNode[] = [],
): Array<{ path: ProcessTreeNode[]; isLeaf: boolean; hasChildren: boolean }> {
  const newPath = [...currentPath, node];
  const rows: Array<{ path: ProcessTreeNode[]; isLeaf: boolean; hasChildren: boolean }> = [];

  // Skapa ALLTID en rad för denna nod
  rows.push({
    path: newPath,
    isLeaf: node.children.length === 0,
    hasChildren: node.children.length > 0,
  });

  // Fortsätt sedan rekursivt med alla barn
  for (const child of node.children) {
    rows.push(...flattenToPathsNew(child, newPath));
  }

  return rows;
}

// Funktion för att bygga ett exempelträd baserat på BPMN-strukturen
function buildExampleTree(): ProcessTreeNode {
  return {
    id: 'mortgage-root',
    label: 'mortgage',
    type: 'process',
    bpmnFile: 'mortgage.bpmn',
    bpmnElementId: 'mortgage',
    children: [
      {
        id: 'application',
        label: 'Application',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'application',
        children: [
          {
            id: 'internal-data-gathering',
            label: 'Internal Data Gathering',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'internal-data-gathering',
            children: [
              {
                id: 'fetch-party-info',
                label: 'Fetch Party Information',
                type: 'serviceTask',
                bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
                bpmnElementId: 'fetch-party-information',
                children: [],
              },
            ],
          },
          {
            id: 'household',
            label: 'Household',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'household',
            children: [
              {
                id: 'register-household',
                label: 'Register Household Economy',
                type: 'userTask',
                bpmnFile: 'mortgage-se-household.bpmn',
                bpmnElementId: 'register-household-economy-information',
                children: [],
              },
            ],
          },
          {
            id: 'confirm-application',
            label: 'Confirm Application',
            type: 'userTask',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'confirm-application',
            children: [],
          },
        ],
      },
      {
        id: 'kyc',
        label: 'KYC',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'kyc',
        children: [
          {
            id: 'self-declaration',
            label: 'Self Declaration',
            type: 'userTask',
            bpmnFile: 'mortgage-se-kyc.bpmn',
            bpmnElementId: 'self-declaration',
            children: [],
          },
        ],
      },
      {
        id: 'credit-evaluation',
        label: 'Credit Evaluation',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'credit-evaluation',
        children: [
          {
            id: 'fetch-credit-info',
            label: 'Fetch Credit Information',
            type: 'serviceTask',
            bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
            bpmnElementId: 'fetch-credit-information',
            children: [],
          },
        ],
      },
    ],
  };
}

function formatPath(path: ProcessTreeNode[]): string {
  return path.map((n) => n.label).join(' → ');
}

function main() {
  const tree = buildExampleTree();

  console.log('='.repeat(80));
  console.log('ANALYS: Noder som kommer att läggas till i TestCoverageTable');
  console.log('='.repeat(80));
  console.log();

  const currentRows = flattenToPathsCurrent(tree);
  const newRows = flattenToPathsNew(tree);

  console.log(`Nuvarande antal rader (bara leaf-noder): ${currentRows.length}`);
  console.log(`Nytt antal rader (alla noder): ${newRows.length}`);
  console.log(`Skillnad: +${newRows.length - currentRows.length} rader`);
  console.log();

  // Hitta noder som finns i newRows men inte i currentRows
  const currentPaths = new Set(
    currentRows.map((r) => r.path.map((n) => n.id).join('|')),
  );
  const newPaths = newRows.map((r) => ({
    path: r.path,
    isLeaf: r.isLeaf,
    hasChildren: r.hasChildren,
    pathKey: r.path.map((n) => n.id).join('|'),
  }));

  const addedNodes = newPaths.filter((r) => !currentPaths.has(r.pathKey));

  console.log('='.repeat(80));
  console.log('NODER SOM KOMMER ATT LÄGGAS TILL:');
  console.log('='.repeat(80));
  console.log();

  if (addedNodes.length === 0) {
    console.log('Inga nya noder kommer att läggas till.');
  } else {
    addedNodes.forEach((node, idx) => {
      const lastNode = node.path[node.path.length - 1];
      const depth = node.path.length - 1;
      const indent = '  '.repeat(depth);
      const typeIcon =
        lastNode.type === 'callActivity'
          ? '📦'
          : lastNode.type === 'userTask'
            ? '👤'
            : lastNode.type === 'serviceTask'
              ? '⚙️'
              : lastNode.type === 'process'
                ? '🏢'
                : '📄';

      console.log(
        `${idx + 1}. ${indent}${typeIcon} ${lastNode.label} (${lastNode.type})`,
      );
      console.log(`${indent}   Sökväg: ${formatPath(node.path)}`);
      console.log(
        `${indent}   BPMN-fil: ${lastNode.bpmnFile}${lastNode.bpmnElementId ? ` | Element-ID: ${lastNode.bpmnElementId}` : ''}`,
      );
      console.log(
        `${indent}   Har barn: ${node.hasChildren ? 'Ja' : 'Nej'} | Är leaf: ${node.isLeaf ? 'Ja' : 'Nej'}`,
      );
      console.log();
    });
  }

  console.log('='.repeat(80));
  console.log('SAMMANFATTNING:');
  console.log('='.repeat(80));
  console.log();
  console.log(`Totalt antal noder som kommer att läggas till: ${addedNodes.length}`);
  console.log();

  // Gruppera efter typ
  const byType = new Map<string, number>();
  addedNodes.forEach((node) => {
    const lastNode = node.path[node.path.length - 1];
    const count = byType.get(lastNode.type) || 0;
    byType.set(lastNode.type, count + 1);
  });

  console.log('Fördelning per nodtyp:');
  Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log();

  // Gruppera efter om de har barn
  const withChildren = addedNodes.filter((n) => n.hasChildren).length;
  const withoutChildren = addedNodes.filter((n) => !n.hasChildren).length;

  console.log('Fördelning:');
  console.log(`  Noder med barn: ${withChildren}`);
  console.log(`  Noder utan barn: ${withoutChildren}`);
  console.log();
}

main();

