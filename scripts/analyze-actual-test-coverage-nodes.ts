/**
 * Analysera vilka noder som kommer att läggas till i TestCoverageTable
 * genom att jämföra nuvarande logik (bara leaf-noder) med ny logik (alla noder)
 * 
 * Detta script simulerar logiken och visar skillnaden.
 */

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
): Array<{ path: ProcessTreeNode[]; node: ProcessTreeNode }> {
  const newPath = [...currentPath, node];
  const rows: Array<{ path: ProcessTreeNode[]; node: ProcessTreeNode }> = [];

  // Om noden är en leaf (inga barn), skapa en rad
  if (node.children.length === 0) {
    rows.push({ path: newPath, node });
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
): Array<{ path: ProcessTreeNode[]; node: ProcessTreeNode }> {
  const newPath = [...currentPath, node];
  const rows: Array<{ path: ProcessTreeNode[]; node: ProcessTreeNode }> = [];

  // Skapa ALLTID en rad för denna nod
  rows.push({ path: newPath, node });

  // Fortsätt sedan rekursivt med alla barn
  for (const child of node.children) {
    rows.push(...flattenToPathsNew(child, newPath));
  }

  return rows;
}

// Bygg ett mer komplett exempelträd baserat på BPMN-strukturen
// Detta är en approximation av den faktiska strukturen
function buildRealisticTree(): ProcessTreeNode {
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
              {
                id: 'fetch-engagements',
                label: 'Fetch Engagements',
                type: 'serviceTask',
                bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
                bpmnElementId: 'fetch-engagements',
                children: [],
              },
            ],
          },
          {
            id: 'stakeholder',
            label: 'Stakeholder',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'stakeholder',
            children: [
              {
                id: 'fetch-personal-info',
                label: 'Fetch Personal Information',
                type: 'serviceTask',
                bpmnFile: 'mortgage-se-stakeholder.bpmn',
                bpmnElementId: 'fetch-personal-information',
                children: [],
              },
              {
                id: 'register-personal-economy',
                label: 'Register Personal Economy',
                type: 'userTask',
                bpmnFile: 'mortgage-se-stakeholder.bpmn',
                bpmnElementId: 'register-personal-economy-information',
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
            id: 'object',
            label: 'Object',
            type: 'callActivity',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'object',
            children: [
              {
                id: 'valuate-property',
                label: 'Valuate Property',
                type: 'serviceTask',
                bpmnFile: 'mortgage-se-object.bpmn',
                bpmnElementId: 'valuate-property',
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
        id: 'mortgage-commitment',
        label: 'Mortgage Commitment',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'mortgage-commitment',
        children: [
          {
            id: 'decide-mortgage-commitment',
            label: 'Decide Mortgage Commitment',
            type: 'userTask',
            bpmnFile: 'mortgage.bpmn',
            bpmnElementId: 'decide-mortgage-commitment',
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
      {
        id: 'credit-decision',
        label: 'Credit Decision',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'credit-decision',
        children: [],
      },
      {
        id: 'offer',
        label: 'Offer',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'offer',
        children: [],
      },
      {
        id: 'signing',
        label: 'Signing',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'signing',
        children: [],
      },
      {
        id: 'disbursement',
        label: 'Disbursement',
        type: 'callActivity',
        bpmnFile: 'mortgage.bpmn',
        bpmnElementId: 'disbursement',
        children: [],
      },
    ],
  };
}

function formatPath(path: ProcessTreeNode[]): string {
  return path.map((n) => n.label).join(' → ');
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'callActivity':
      return '📦';
    case 'userTask':
      return '👤';
    case 'serviceTask':
      return '⚙️';
    case 'businessRuleTask':
      return '📋';
    case 'process':
      return '🏢';
    default:
      return '📄';
  }
}

function main() {
  const tree = buildRealisticTree();

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
  const currentPathKeys = new Set(
    currentRows.map((r) => r.path.map((n) => n.id).join('|')),
  );

  const addedNodes = newRows
    .filter((r) => !currentPathKeys.has(r.path.map((n) => n.id).join('|')))
    .map((r) => ({
      node: r.node,
      path: r.path,
      depth: r.path.length - 1,
      pathKey: r.path.map((n) => n.id).join('|'),
    }));

  console.log('='.repeat(80));
  console.log('NODER SOM KOMMER ATT LÄGGAS TILL:');
  console.log('='.repeat(80));
  console.log();

  if (addedNodes.length === 0) {
    console.log('Inga nya noder kommer att läggas till.');
  } else {
    addedNodes.forEach((item, idx) => {
      const { node, path, depth } = item;
      const indent = '  '.repeat(depth);
      const typeIcon = getTypeIcon(node.type);

      console.log(
        `${idx + 1}. ${indent}${typeIcon} ${node.label} (${node.type})`,
      );
      console.log(`${indent}   Sökväg: ${formatPath(path)}`);
      console.log(
        `${indent}   BPMN-fil: ${node.bpmnFile}${node.bpmnElementId ? ` | Element-ID: ${node.bpmnElementId}` : ''}`,
      );
      console.log(
        `${indent}   Har ${node.children.length} barn | Är leaf: ${node.children.length === 0 ? 'Ja' : 'Nej'}`,
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
  addedNodes.forEach((item) => {
    const count = byType.get(item.node.type) || 0;
    byType.set(item.node.type, count + 1);
  });

  console.log('Fördelning per nodtyp:');
  Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log();

  // Gruppera efter om de har barn
  const withChildren = addedNodes.filter((item) => item.node.children.length > 0).length;
  const withoutChildren = addedNodes.filter((item) => item.node.children.length === 0).length;

  console.log('Fördelning:');
  console.log(`  Noder med barn: ${withChildren}`);
  console.log(`  Noder utan barn: ${withoutChildren}`);
  console.log();

  // Visa djupfördelning
  const byDepth = new Map<number, number>();
  addedNodes.forEach((item) => {
    const count = byDepth.get(item.depth) || 0;
    byDepth.set(item.depth, count + 1);
  });

  console.log('Fördelning per djup (hierarkinivå):');
  Array.from(byDepth.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([depth, count]) => {
      console.log(`  Nivå ${depth}: ${count} noder`);
    });
  console.log();
}

main();

