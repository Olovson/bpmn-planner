/**
 * Analysera vilken ordning BPMN-filer skulle få med den gamla approachen
 * (indegree-baserad sortering baserat på calledElement)
 * 
 * Enkel version som läser XML direkt med regex
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function extractCallActivities(xmlContent, fileName) {
  const callActivities = [];
  
  // Match callActivity elements - need to handle attributes in any order
  // First, find all callActivity elements
  const callActivityMatches = xmlContent.matchAll(/<bpmn:callActivity[^>]*>/g);
  
  for (const match of callActivityMatches) {
    const fullTag = match[0];
    
    // Extract id
    const idMatch = fullTag.match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : null;
    
    // Extract name
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;
    
    // Extract calledElement
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
  
  // Also try without bpmn: prefix
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

function extractProcessInfo(xmlContent, fileName) {
  // Extract process ID and name
  const processMatch = xmlContent.match(/<bpmn:process[^>]*id="([^"]+)"[^>]*(?:name="([^"]*)")?/);
  const processId = processMatch ? processMatch[1] : undefined;
  const processName = processMatch ? processMatch[2] : undefined;
  
  const callActivities = extractCallActivities(xmlContent, fileName);
  
  return {
    fileName,
    processId,
    processName,
    callActivities,
  };
}

function buildDependencyGraph(processes) {
  const graph = new Map();
  
  // Build maps for matching
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
  
  // Build graph based on calledElement
  for (const proc of processes) {
    const dependencies = new Set();
    
    for (const ca of proc.callActivities) {
      if (ca.calledElement) {
        let targetFile;
        
        // Try multiple matching strategies
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

function calculateIndegree(processes, graph) {
  const indegree = new Map();
  
  for (const proc of processes) {
    indegree.set(proc.fileName, 0);
  }
  
  for (const [caller, dependencies] of graph.entries()) {
    for (const dependency of dependencies) {
      const current = indegree.get(dependency) || 0;
      indegree.set(dependency, current + 1);
    }
  }
  
  return indegree;
}

function sortByIndegree(processes, indegree) {
  return [...processes].sort((a, b) => {
    const indegreeA = indegree.get(a.fileName) || 0;
    const indegreeB = indegree.get(b.fileName) || 0;
    
    if (indegreeA !== indegreeB) {
      return indegreeA - indegreeB;
    }
    
    return a.fileName.localeCompare(b.fileName);
  });
}

async function main() {
  const folderPath = '/Users/magnusolovson/Documents/Projects/bpmn packe/mortgage-se 2025.11.29';
  
  console.log('🔍 Analyserar BPMN-filer med gamla approachen (indegree-baserad sortering)...\n');
  console.log('   Approach: Baserat på calledElement från BPMN-filer (ingen bpmn-map.json)\n');
  
  // Find all BPMN files
  const files = execSync(`find "${folderPath}" -name "*.bpmn" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f.trim());
  
  console.log(`📁 Hittade ${files.length} BPMN-filer\n`);
  
  // Parse all files
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
        const targetFile = dependencies ? Array.from(dependencies).find(f => 
          f.includes(ca.calledElement || '') || 
          f.replace('.bpmn', '') === ca.calledElement ||
          f.replace('.bpmn', '').replace('mortgage-se-', '') === ca.calledElement
        ) : null;
        console.log(`       - ${ca.name || ca.id} → ${targetFile || ca.calledElement || 'N/A'}`);
      }
    }
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📄 SAMMANFATTNING: INNEHÅLL SOM SKULLE PROCESSAS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  for (let i = 0; i < sorted.length; i++) {
    const proc = sorted[i];
    const indegreeValue = indegree.get(proc.fileName) || 0;
    
    console.log(`${i + 1}. ${proc.fileName} (indegree: ${indegreeValue})`);
    console.log(`   - Process: ${proc.processName || proc.processId || 'N/A'}`);
    console.log(`   - Call Activities: ${proc.callActivities.length}`);
    if (proc.callActivities.length > 0) {
      const dependencies = graph.get(proc.fileName);
      proc.callActivities.forEach(ca => {
        const targetFile = dependencies ? Array.from(dependencies).find(f => 
          f.includes(ca.calledElement || '') || 
          f.replace('.bpmn', '') === ca.calledElement ||
          f.replace('.bpmn', '').replace('mortgage-se-', '') === ca.calledElement
        ) : null;
        console.log(`     • ${ca.name || ca.id} → ${targetFile || ca.calledElement || 'N/A'}`);
      });
    }
    console.log(`   - (UserTasks, ServiceTasks, BusinessRuleTasks skulle också processas)`);
    console.log('');
  }
}

main().catch(console.error);

