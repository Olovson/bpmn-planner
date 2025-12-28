/**
 * Visa genereringsordning med nya ändringarna (orderIndex-baserad sortering)
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function extractCallActivities(xmlContent, fileName) {
  const callActivities = [];
  
  const callActivityMatches = xmlContent.matchAll(/<bpmn:callActivity[^>]*>/g);
  
  for (const match of callActivityMatches) {
    const fullTag = match[0];
    
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : null;
    
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;
    
    const calledElementMatch = fullTag.match(/calledElement="([^"]+)"/);
    const calledElement = calledElementMatch ? calledElementMatch[1] : undefined;
    
    if (id) {
      callActivities.push({
        id,
        name,
        calledElement,
      });
    }
  }
  
  const callActivityMatches2 = xmlContent.matchAll(/<callActivity[^>]*>/g);
  
  for (const match of callActivityMatches2) {
    const fullTag = match[0];
    
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : null;
    
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;
    
    const calledElementMatch = fullTag.match(/calledElement="([^"]+)"/);
    const calledElement = calledElementMatch ? calledElementMatch[1] : undefined;
    
    if (id && !callActivities.find(ca => ca.id === id)) {
      callActivities.push({
        id,
        name,
        calledElement,
      });
    }
  }
  
  return callActivities;
}

function extractTasks(xmlContent, fileName) {
  const tasks = [];
  
  // Extract userTasks
  const userTaskMatches = xmlContent.matchAll(/<bpmn:userTask[^>]*>/g);
  for (const match of userTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : undefined,
        type: 'userTask',
      });
    }
  }
  
  // Extract serviceTasks
  const serviceTaskMatches = xmlContent.matchAll(/<bpmn:serviceTask[^>]*>/g);
  for (const match of serviceTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : undefined,
        type: 'serviceTask',
      });
    }
  }
  
  // Extract businessRuleTasks
  const businessRuleTaskMatches = xmlContent.matchAll(/<bpmn:businessRuleTask[^>]*>/g);
  for (const match of businessRuleTaskMatches) {
    const fullTag = match[0];
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    if (idMatch) {
      tasks.push({
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : undefined,
        type: 'businessRuleTask',
      });
    }
  }
  
  return tasks;
}

function extractProcessInfo(xmlContent, fileName) {
  const processMatch = xmlContent.match(/<bpmn:process[^>]*id="([^"]+)"[^>]*(?:name="([^"]*)")?/);
  const processId = processMatch ? processMatch[1] : undefined;
  const processName = processMatch ? processMatch[2] : undefined;
  
  const callActivities = extractCallActivities(xmlContent, fileName);
  const tasks = extractTasks(xmlContent, fileName);
  
  return {
    fileName,
    processId,
    processName,
    callActivities,
    tasks,
  };
}

function buildDependencyGraph(processes) {
  const graph = new Map();
  
  const processIdToFile = new Map();
  const processNameToFile = new Map();
  const fileNameBaseToFile = new Map();
  
  for (const proc of processes) {
    if (proc.processId) {
      processIdToFile.set(proc.processId, proc.fileName);
    }
    if (proc.processName) {
      processNameToFile.set(proc.processName, proc.fileName);
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
        let targetFile;
        
        if (processIdToFile.has(ca.calledElement)) {
          targetFile = processIdToFile.get(ca.calledElement);
        } else if (processNameToFile.has(ca.calledElement)) {
          targetFile = processNameToFile.get(ca.calledElement);
        } else if (fileNameBaseToFile.has(ca.calledElement)) {
          targetFile = fileNameBaseToFile.get(ca.calledElement);
        } else if (fileNameBaseToFile.has(`mortgage-se-${ca.calledElement}`)) {
          targetFile = fileNameBaseToFile.get(`mortgage-se-${ca.calledElement}`);
        } else {
          const exactMatch = processes.find(p => 
            p.fileName === ca.calledElement || 
            p.fileName === `${ca.calledElement}.bpmn` ||
            p.fileName === `mortgage-se-${ca.calledElement}.bpmn`
          );
          if (exactMatch) {
            targetFile = exactMatch.fileName;
          }
        }
        
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
  const cycleFiles = new Set();
  
  function visit(file, path = []) {
    if (visiting.has(file)) {
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        cycle.push(file);
        cycle.forEach(f => cycleFiles.add(f));
      }
      return;
    }
    if (visited.has(file)) {
      return;
    }
    
    visiting.add(file);
    const deps = dependencies.get(file) || new Set();
    for (const dep of deps) {
      if (files.includes(dep)) {
        visit(dep, [...path, file]);
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
  
  const nonCycleFiles = sorted.filter(f => !cycleFiles.has(f));
  const cycleFilesList = files.filter(f => cycleFiles.has(f)).sort((a, b) => a.localeCompare(b));
  
  return [...nonCycleFiles, ...cycleFilesList];
}

async function main() {
  const folderPath = '/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29';
  
  console.log('🔍 Analyserar genereringsordning med nya ändringarna...\n');
  console.log('   Ny sortering: OrderIndex → VisualOrderIndex → Node Type → Depth\n');
  
  const files = execSync(`find "${folderPath}" -name "*.bpmn" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f.trim());
  
  console.log(`📁 Hittade ${files.length} BPMN-filer\n`);
  
  const processes = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const proc = extractProcessInfo(content, file.split('/').pop());
      processes.push(proc);
    } catch (error) {
      console.error(`❌ Kunde inte läsa ${file}:`, error.message);
    }
  }
  
  // Build dependency graph
  const graph = buildDependencyGraph(processes);
  
  // Topological sort files (subprocesser före parent)
  const fileNames = processes.map(p => p.fileName);
  const sortedFiles = topologicalSortFiles(fileNames, graph);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 GENERERINGSORDNING MED NYA ÄNDRINGARNA');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('   Fil-sortering: Topologisk (subprocesser före parent)');
  console.log('   Node-sortering: OrderIndex → VisualOrderIndex → Node Type → Depth\n');
  
  let globalOrder = 1;
  
  for (const fileName of sortedFiles) {
    const proc = processes.find(p => p.fileName === fileName);
    if (!proc) continue;
    
    console.log(`\n📄 ${globalOrder++}. Fil: ${fileName}`);
    console.log(`   Process: ${proc.processName || proc.processId || 'N/A'}`);
    
    // Simulera node-sortering baserat på anropsordning
    // I verkligheten skulle vi ha orderIndex/visualOrderIndex från BPMN-parsning
    // Här simulerar vi baserat på hur noder förekommer i XML (ungefärlig ordning)
    
    const allNodes = [
      ...proc.callActivities.map(ca => ({ ...ca, type: 'callActivity', order: 0 })),
      ...proc.tasks.map(t => ({ ...t, order: 0 })),
    ];
    
    // Simulera sortering: tasks/epics före callActivities (node type-sortering)
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
        return typeOrderA - typeOrderB; // Tasks/epics (1) före callActivities (2)
      }
      
      // Alfabetiskt som fallback
      return (a.name || a.id || '').localeCompare(b.name || b.id || '');
    });
    
    if (sortedNodes.length === 0) {
      console.log(`   (Inga noder att generera)`);
      continue;
    }
    
    console.log(`   Noder (sorterade efter Node Type → Alfabetiskt):`);
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
    
    // Visa dependencies
    const dependencies = graph.get(fileName);
    if (dependencies && dependencies.size > 0) {
      console.log(`   Anropar subprocesser: ${Array.from(dependencies).join(', ')}`);
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
  console.log(`Totala Epics (tasks): ${totalEpics}`);
  console.log(`Totala Feature Goals (callActivities): ${totalFeatureGoals}`);
  console.log(`Totala dokument: ${totalEpics + totalFeatureGoals}`);
  
  console.log('\n📝 Noteringar:');
  console.log('   - Filerna sorteras topologiskt (subprocesser före parent)');
  console.log('   - Noder inom fil sorteras: Tasks/Epics FÖRE CallActivities (Feature Goals)');
  console.log('   - I verkligheten används orderIndex/visualOrderIndex för exakt anropsordning');
  console.log('   - Denna simulering visar ungefärlig ordning baserat på node type');
}

main().catch(console.error);

