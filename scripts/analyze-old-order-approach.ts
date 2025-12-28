/**
 * Analysera vilken ordning BPMN-filer skulle få med den gamla approachen
 * (indegree-baserad sortering baserat på calledElement)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseBpmnFile } from '../src/lib/bpmnParser';

interface CallActivityInfo {
  id: string;
  name?: string;
  calledElement?: string;
}

interface ProcessInfo {
  fileName: string;
  processId?: string;
  processName?: string;
  callActivities: CallActivityInfo[];
}

async function parseBpmnFileToProcessInfo(filePath: string): Promise<ProcessInfo> {
  // Create data URL from file content
  const content = readFileSync(filePath, 'utf-8');
  const base64 = Buffer.from(content).toString('base64');
  const dataUrl = `data:application/xml;base64,${base64}`;
  
  const parseResult = await parseBpmnFile(dataUrl);
  
  const callActivities: CallActivityInfo[] = [];
  
  for (const ca of parseResult.callActivities || []) {
    callActivities.push({
      id: ca.id,
      name: ca.name,
      calledElement: (ca as any).calledElement,
    });
  }
  
  // Get process info
  const processes = parseResult.processes || [];
  const mainProcess = processes[0] || processes.find(p => p.isExecutable !== false);
  
  return {
    fileName: filePath.split('/').pop() || filePath,
    processId: mainProcess?.id,
    processName: mainProcess?.name,
    callActivities,
  };
}

function buildDependencyGraph(processes: ProcessInfo[]): Map<string, Set<string>> {
  // Map: fileName → Set of fileNames it calls
  const graph = new Map<string, Set<string>>();
  
  // First, build a map of processId → fileName and processName → fileName
  const processIdToFile = new Map<string, string>();
  const processNameToFile = new Map<string, string>();
  const fileNameBaseToFile = new Map<string, string>();
  
  for (const proc of processes) {
    if (proc.processId) {
      processIdToFile.set(proc.processId, proc.fileName);
    }
    if (proc.processName) {
      processNameToFile.set(proc.processName, proc.fileName);
    }
    const baseName = proc.fileName.replace('.bpmn', '');
    fileNameBaseToFile.set(baseName, proc.fileName);
    // Also try without mortgage-se- prefix
    const baseNameNoPrefix = baseName.replace('mortgage-se-', '');
    if (baseNameNoPrefix !== baseName) {
      fileNameBaseToFile.set(baseNameNoPrefix, proc.fileName);
    }
  }
  
  // Build graph based on calledElement
  for (const proc of processes) {
    const dependencies = new Set<string>();
    
    for (const ca of proc.callActivities) {
      if (ca.calledElement) {
        // Try multiple matching strategies (same as old approach)
        let targetFile: string | undefined;
        
        // 1. Exact processId match
        if (processIdToFile.has(ca.calledElement)) {
          targetFile = processIdToFile.get(ca.calledElement);
        }
        // 2. ProcessName match
        else if (processNameToFile.has(ca.calledElement)) {
          targetFile = processNameToFile.get(ca.calledElement);
        }
        // 3. Filename base match
        else if (fileNameBaseToFile.has(ca.calledElement)) {
          targetFile = fileNameBaseToFile.get(ca.calledElement);
        }
        // 4. Try with mortgage-se- prefix
        else if (fileNameBaseToFile.has(`mortgage-se-${ca.calledElement}`)) {
          targetFile = fileNameBaseToFile.get(`mortgage-se-${ca.calledElement}`);
        }
        // 5. Try exact filename match
        else {
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

function calculateIndegree(
  processes: ProcessInfo[],
  graph: Map<string, Set<string>>
): Map<string, number> {
  const indegree = new Map<string, number>();
  
  // Initialize all processes with indegree 0
  for (const proc of processes) {
    indegree.set(proc.fileName, 0);
  }
  
  // Calculate indegree: how many processes call this one
  for (const [caller, dependencies] of graph.entries()) {
    for (const dependency of dependencies) {
      const current = indegree.get(dependency) || 0;
      indegree.set(dependency, current + 1);
    }
  }
  
  return indegree;
}

function sortByIndegree(
  processes: ProcessInfo[],
  indegree: Map<string, number>
): ProcessInfo[] {
  return [...processes].sort((a, b) => {
    const indegreeA = indegree.get(a.fileName) || 0;
    const indegreeB = indegree.get(b.fileName) || 0;
    
    // Lower indegree comes first (subprocesses before parents)
    if (indegreeA !== indegreeB) {
      return indegreeA - indegreeB;
    }
    
    // If same indegree, sort alphabetically
    return a.fileName.localeCompare(b.fileName);
  });
}

async function main() {
  const folderPath = '/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29';
  
  console.log('🔍 Analyserar BPMN-filer med gamla approachen (indegree-baserad sortering)...\n');
  console.log('   Approach: Baserat på calledElement från BPMN-filer (ingen bpmn-map.json)\n');
  
  // Find all BPMN files
  const { execSync } = await import('child_process');
  const files = execSync(`find "${folderPath}" -name "*.bpmn" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f.trim());
  
  console.log(`📁 Hittade ${files.length} BPMN-filer\n`);
  
  // Parse all files
  const processes: ProcessInfo[] = [];
  for (const file of files) {
    try {
      const proc = await parseBpmnFileToProcessInfo(file);
      processes.push(proc);
    } catch (error) {
      console.error(`❌ Kunde inte parsa ${file}:`, error);
    }
  }
  
  console.log('📊 Processer och deras call activities (baserat på calledElement):\n');
  for (const proc of processes) {
    console.log(`  ${proc.fileName}`);
    console.log(`    Process ID: ${proc.processId || 'N/A'}`);
    console.log(`    Process Name: ${proc.processName || 'N/A'}`);
    if (proc.callActivities.length > 0) {
      console.log(`    Call Activities (${proc.callActivities.length}):`);
      for (const ca of proc.callActivities) {
        console.log(`      - ${ca.id} (${ca.name || 'N/A'}) → calledElement: ${ca.calledElement || 'N/A'}`);
      }
    } else {
      console.log(`    Call Activities: Inga`);
    }
    console.log('');
  }
  
  // Build dependency graph based on calledElement
  const graph = buildDependencyGraph(processes);
  
  console.log('🔗 Dependency Graph (baserat på calledElement):\n');
  for (const [caller, dependencies] of graph.entries()) {
    console.log(`  ${caller} anropar:`);
    for (const dep of dependencies) {
      console.log(`    → ${dep}`);
    }
    console.log('');
  }
  
  // Calculate indegree
  const indegree = calculateIndegree(processes, graph);
  
  console.log('📈 Indegree (antal processer som anropar varje fil):\n');
  const sortedByIndegree = [...processes].sort((a, b) => {
    const indegreeA = indegree.get(a.fileName) || 0;
    const indegreeB = indegree.get(b.fileName) || 0;
    return indegreeA - indegreeB;
  });
  
  for (const proc of sortedByIndegree) {
    const indegreeValue = indegree.get(proc.fileName) || 0;
    const isRoot = indegreeValue === 0;
    console.log(`  ${proc.fileName}: indegree = ${indegreeValue} ${isRoot ? '(ROOT)' : ''}`);
  }
  console.log('');
  
  // Sort by indegree (old approach)
  const sorted = sortByIndegree(processes, indegree);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 ORDNING MED GAMLA APPROACHEN (indegree-baserad sortering)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('   Subprocesser (lägre indegree) → Parent-processer (högre indegree) → Root (indegree = 0)\n');
  
  for (let i = 0; i < sorted.length; i++) {
    const proc = sorted[i];
    const indegreeValue = indegree.get(proc.fileName) || 0;
    const isRoot = indegreeValue === 0;
    const dependencies = graph.get(proc.fileName);
    
    console.log(`  ${i + 1}. ${proc.fileName}`);
    console.log(`     Process: ${proc.processName || proc.processId || 'N/A'}`);
    console.log(`     Indegree: ${indegreeValue} ${isRoot ? '(ROOT - ingen anropar denna)' : ''}`);
    if (dependencies && dependencies.size > 0) {
      console.log(`     Anropar: ${Array.from(dependencies).join(', ')}`);
    }
    if (proc.callActivities.length > 0) {
      console.log(`     Call Activities:`);
      for (const ca of proc.callActivities) {
        const targetFile = Array.from(dependencies || []).find(f => 
          f.includes(ca.calledElement || '') || 
          f.replace('.bpmn', '') === ca.calledElement ||
          f.replace('.bpmn', '').replace('mortgage-se-', '') === ca.calledElement
        ) || (ca.calledElement ? `[${ca.calledElement}]` : 'N/A');
        console.log(`       - ${ca.name || ca.id} → ${targetFile}`);
      }
    }
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📄 INNEHÅLL SOM SKULLE PROCESSAS (i ordning)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  for (let i = 0; i < sorted.length; i++) {
    const proc = sorted[i];
    const indegreeValue = indegree.get(proc.fileName) || 0;
    
    console.log(`${i + 1}. ${proc.fileName} (indegree: ${indegreeValue})`);
    console.log(`   Process: ${proc.processName || proc.processId || 'N/A'}`);
    
    if (proc.callActivities.length > 0) {
      console.log(`   Call Activities (Feature Goals):`);
      for (const ca of proc.callActivities) {
        const dependencies = graph.get(proc.fileName);
        const targetFile = dependencies ? Array.from(dependencies).find(f => 
          f.includes(ca.calledElement || '') || 
          f.replace('.bpmn', '') === ca.calledElement ||
          f.replace('.bpmn', '').replace('mortgage-se-', '') === ca.calledElement
        ) : null;
        console.log(`     - ${ca.name || ca.id} → ${targetFile || ca.calledElement || 'N/A'}`);
      }
    }
    
    console.log(`   (Andra noder: UserTasks, ServiceTasks, BusinessRuleTasks skulle också processas)`);
    console.log('');
  }
}

main().catch(console.error);
