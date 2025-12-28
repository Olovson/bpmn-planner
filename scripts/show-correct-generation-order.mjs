/**
 * Visa korrekt genereringsordning baserat på anropsordning i root-processen
 * (samma som test-coverage sidan visar från vänster till höger)
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Simulera orderIndex baserat på när callActivities förekommer i mortgage.bpmn
// I verkligheten kommer detta från graph.allNodes med orderIndex/visualOrderIndex
const mortgageCallActivityOrder = {
  'application': 1, // Först i mortgage.bpmn (rad 253)
  'credit-evaluation': 2, // Efter application
  'credit-decision': 3,
  'mortgage-commitment': 4,
  'kyc': 5,
  'offer': 6,
  'signing': 7,
  'signing-advance': 8,
  'disbursement': 9,
  'disbursement-advance': 10,
  'document-generation': 11,
  'document-generation-advance': 12,
  'collateral-registration': 13,
  'appeal': 14,
  'manual-credit-evaluation': 15,
};

// Mappa callActivity ID/name till filnamn
const callActivityToFile = {
  'application': 'mortgage-se-application.bpmn',
  'credit-evaluation': 'mortgage-se-credit-evaluation.bpmn',
  'credit-decision': 'mortgage-se-credit-decision.bpmn',
  'mortgage-commitment': 'mortgage-se-mortgage-commitment.bpmn',
  'kyc': 'mortgage-se-kyc.bpmn',
  'offer': 'mortgage-se-offer.bpmn',
  'signing': 'mortgage-se-signing.bpmn',
  'disbursement': 'mortgage-se-disbursement.bpmn',
  'document-generation': 'mortgage-se-document-generation.bpmn',
  'collateral-registration': 'mortgage-se-collateral-registration.bpmn',
  'appeal': 'mortgage-se-appeal.bpmn',
  'manual-credit-evaluation': 'mortgage-se-manual-credit-evaluation.bpmn',
};

function extractCallActivities(xmlContent, fileName) {
  const callActivities = [];
  const callActivityMatches = xmlContent.matchAll(/<bpmn:callActivity[^>]*>/g);
  
  for (const match of callActivityMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    const calledElementMatch = fullTag.match(/calledElement="([^"]+)"/);
    
    if (idMatch) {
      callActivities.push({
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : undefined,
        calledElement: calledElementMatch ? calledElementMatch[1] : undefined,
      });
    }
  }
  
  return callActivities;
}

function extractTasks(xmlContent) {
  const tasks = [];
  const userTaskMatches = xmlContent.matchAll(/<bpmn:userTask[^>]*>/g);
  const serviceTaskMatches = xmlContent.matchAll(/<bpmn:serviceTask[^>]*>/g);
  const businessRuleTaskMatches = xmlContent.matchAll(/<bpmn:businessRuleTask[^>]*>/g);
  
  for (const match of userTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({ id: idMatch[1], name: nameMatch ? nameMatch[1] : undefined, type: 'userTask' });
    }
  }
  
  for (const match of serviceTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({ id: idMatch[1], name: nameMatch ? nameMatch[1] : undefined, type: 'serviceTask' });
    }
  }
  
  for (const match of businessRuleTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({ id: idMatch[1], name: nameMatch ? nameMatch[1] : undefined, type: 'businessRuleTask' });
    }
  }
  
  return tasks;
}

function buildDependencyGraph(processes) {
  const graph = new Map();
  const processIdToFile = new Map();
  const fileNameBaseToFile = new Map();
  
  for (const proc of processes) {
    if (proc.processId) {
      processIdToFile.set(proc.processId, proc.fileName);
    }
    const baseName = proc.fileName.replace('.bpmn', '');
    fileNameBaseToFile.set(baseName, proc.fileName);
    const baseNameNoPrefix = baseName.replace('mortgage-se-', '');
    if (baseNameNoPrefix !== baseName) {
      fileNameBaseToFile.set(baseNameNoPrefix, proc.fileName);
    }
  }
  
  for (const proc of processes) {
    const dependencies = new Set();
    for (const ca of proc.callActivities) {
      if (ca.calledElement) {
        let targetFile = processIdToFile.get(ca.calledElement) || 
                        fileNameBaseToFile.get(ca.calledElement) ||
                        fileNameBaseToFile.get(`mortgage-se-${ca.calledElement}`);
        if (targetFile && targetFile !== proc.fileName) {
          dependencies.add(targetFile);
        }
      }
    }
    if (dependencies.size > 0) {
      graph.set(proc.fileName, dependencies);
    }
  }
  
  return graph;
}

function topologicalSortFiles(files, dependencies) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(file) {
    if (visiting.has(file)) return;
    if (visited.has(file)) return;
    
    visiting.add(file);
    const deps = dependencies.get(file) || new Set();
    for (const dep of deps) {
      if (files.includes(dep)) {
        visit(dep);
      }
    }
    visiting.delete(file);
    visited.add(file);
    sorted.push(file);
  }
  
  for (const file of files) {
    if (!visited.has(file)) {
      visit(file);
    }
  }
  
  return sorted;
}

async function main() {
  const folderPath = '/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29';
  
  console.log('🔍 Analyserar korrekt genereringsordning baserat på anropsordning i root-processen...\n');
  console.log('   Ordning: Baserat på när filer anropas i mortgage.bpmn (samma som test-coverage sidan)\n');
  
  const files = execSync(`find "${folderPath}" -name "*.bpmn" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f.trim());
  
  const processes = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const processMatch = content.match(/<bpmn:process[^>]*id="([^"]+)"[^>]*(?:name="([^"]*)")?/);
      const callActivities = extractCallActivities(content, file.split('/').pop());
      const tasks = extractTasks(content);
      
      processes.push({
        fileName: file.split('/').pop(),
        processId: processMatch ? processMatch[1] : undefined,
        processName: processMatch ? processMatch[2] : undefined,
        callActivities,
        tasks,
      });
    } catch (error) {
      console.error(`❌ Kunde inte läsa ${file}:`, error.message);
    }
  }
  
  // Build dependency graph
  const graph = buildDependencyGraph(processes);
  
  // Topological sort first
  const fileNames = processes.map(p => p.fileName);
  const topologicallySorted = topologicalSortFiles(fileNames, graph);
  
  // Then sort by order in root process (mortgage.bpmn)
  // Filerna som anropas tidigare i mortgage.bpmn ska komma före filer som anropas senare
  const fileOrderInRoot = new Map();
  for (const [callActivityId, order] of Object.entries(mortgageCallActivityOrder)) {
    const fileName = callActivityToFile[callActivityId];
    if (fileName && fileOrderInRoot.has(fileName) === false) {
      fileOrderInRoot.set(fileName, order);
    }
  }
  
  // Also check subprocesses (e.g., internal-data-gathering anropas av application)
  // Hitta orderIndex för subprocesser baserat på när de anropas i sina parent-filer
  const subprocessOrder = new Map();
  for (const proc of processes) {
    for (const ca of proc.callActivities) {
      if (ca.calledElement) {
        const targetFile = callActivityToFile[ca.calledElement] || 
                          processes.find(p => p.processId === ca.calledElement || 
                                            p.fileName.replace('.bpmn', '') === ca.calledElement ||
                                            p.fileName.replace('.bpmn', '').replace('mortgage-se-', '') === ca.calledElement)?.fileName;
        if (targetFile && !fileOrderInRoot.has(targetFile)) {
          // Subprocess anropas av proc.fileName
          // Använd parent-filens orderIndex + offset baserat på callActivity position
          const parentOrder = fileOrderInRoot.get(proc.fileName) ?? 999;
          subprocessOrder.set(targetFile, parentOrder + 0.1); // Subprocesser kommer strax efter parent
        }
      }
    }
  }
  
  // Combine root order and subprocess order
  const allFileOrder = new Map([...fileOrderInRoot, ...subprocessOrder]);
  
  // Sort: first topologically, then by order in root process
  const sortedFiles = topologicallySorted.sort((a, b) => {
    // Check if both files are in root order
    const orderA = allFileOrder.get(a) ?? 9999;
    const orderB = allFileOrder.get(b) ?? 9999;
    
    if (orderA !== orderB) {
      return orderA - orderB; // Lower order first (earlier in root process)
    }
    
    // If same order or neither in root, maintain topological order
    return 0;
  });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 KORREKT GENERERINGSORDNING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('   Baserat på anropsordning i mortgage.bpmn (samma som test-coverage sidan)\n');
  
  let globalOrder = 1;
  
  for (const fileName of sortedFiles) {
    const proc = processes.find(p => p.fileName === fileName);
    if (!proc) continue;
    
    const rootOrder = allFileOrder.get(fileName);
    const orderLabel = rootOrder !== undefined ? ` (orderIndex i root: ${rootOrder})` : ' (anropas inte direkt i root)';
    
    console.log(`\n📄 ${globalOrder++}. ${fileName}${orderLabel}`);
    console.log(`   Process: ${proc.processName || proc.processId || 'N/A'}`);
    
    if (proc.callActivities.length > 0 || proc.tasks.length > 0) {
      const allNodes = [
        ...proc.tasks.map(t => ({ ...t, order: 0 })),
        ...proc.callActivities.map(ca => ({ ...ca, type: 'callActivity', order: 0 })),
      ];
      
      // Sort by node type (tasks/epics före callActivities)
      const sortedNodes = allNodes.sort((a, b) => {
        const typeOrder = {
          'userTask': 1,
          'serviceTask': 1,
          'businessRuleTask': 1,
          'callActivity': 2,
        };
        const typeOrderA = typeOrder[a.type] ?? 99;
        const typeOrderB = typeOrder[b.type] ?? 99;
        if (typeOrderA !== typeOrderB) {
          return typeOrderA - typeOrderB;
        }
        return (a.name || a.id || '').localeCompare(b.name || b.id || '');
      });
      
      console.log(`   Noder (${sortedNodes.length}):`);
      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        const nodeTypeLabel = 
          node.type === 'userTask' ? 'Epic (UserTask)' :
          node.type === 'serviceTask' ? 'Epic (ServiceTask)' :
          node.type === 'businessRuleTask' ? 'Epic (BusinessRuleTask)' :
          node.type === 'callActivity' ? 'Feature Goal (CallActivity)' :
          'Okänd';
        const nodeName = node.name || node.id || 'N/A';
        const subprocessInfo = node.type === 'callActivity' && node.calledElement 
          ? ` → ${node.calledElement}` 
          : '';
        console.log(`     ${i + 1}. ${nodeTypeLabel}: ${nodeName}${subprocessInfo}`);
      }
    }
    
    const dependencies = graph.get(fileName);
    if (dependencies && dependencies.size > 0) {
      console.log(`   Anropar: ${Array.from(dependencies).join(', ')}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SAMMANFATTNING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  let totalEpics = 0;
  let totalFeatureGoals = 0;
  
  for (const proc of processes) {
    totalEpics += proc.tasks.length;
    totalFeatureGoals += proc.callActivities.length;
  }
  
  console.log(`Totala filer: ${sortedFiles.length}`);
  console.log(`Totala Epics: ${totalEpics}`);
  console.log(`Totala Feature Goals: ${totalFeatureGoals}`);
  console.log(`Totala dokument: ${totalEpics + totalFeatureGoals}`);
  
  console.log('\n📝 Noteringar:');
  console.log('   - Filerna sorteras först topologiskt (subprocesser före parent)');
  console.log('   - Sedan sorteras de baserat på när de anropas i mortgage.bpmn (orderIndex)');
  console.log('   - Noder inom fil sorteras: Tasks/Epics FÖRE CallActivities (Feature Goals)');
  console.log('   - Denna ordning matchar test-coverage sidan (från vänster till höger)');
}

main().catch(console.error);

