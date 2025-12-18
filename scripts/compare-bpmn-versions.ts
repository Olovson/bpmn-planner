#!/usr/bin/env tsx
/**
 * Script för att jämföra BPMN-filer mellan två versioner
 * 
 * Detta script identifierar:
 * - Nya/borttagna filer
 * - Nya/borttagna tasks/callActivities
 * - Ändrade task-namn (samma ID, annat namn)
 * - Omnamngivna tasks/callActivities (samma namn, annat ID) - KRITISKT
 * 
 * Användning:
 *   tsx scripts/compare-bpmn-versions.ts [sökväg-till-gamla-arkivmapp] [sökväg-till-nya-arkivmapp]
 * 
 * Om inga sökvägar anges, jämförs den senaste archive-mappen med den näst senaste
 * 
 * Detta script är en given startpunkt för den manuella arbetsprocessen när BPMN-filer uppdateras.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BpmnElement {
  id: string;
  name: string;
  type: 'CallActivity' | 'SubProcess' | 'ServiceTask' | 'UserTask' | 'BusinessRuleTask';
  calledElement?: string | null;
}

interface BpmnFileAnalysis {
  fileName: string;
  processId: string;
  processName: string;
  callActivities: BpmnElement[];
  subProcesses: BpmnElement[];
  serviceTasks: BpmnElement[];
  userTasks: BpmnElement[];
  businessRuleTasks: BpmnElement[];
}

function getAttr(element: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
  const match = regex.exec(element);
  return match ? match[1] : '';
}

function parseBpmnFile(filePath: string): BpmnFileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Extract process info
  const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(content);
  const processId = processMatch ? getAttr(processMatch[0], 'id') : '';
  const processName = processMatch ? (getAttr(processMatch[0], 'name') || processId) : '';

  // Extract CallActivities
  const callActivities: BpmnElement[] = [];
  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  let match;
  while ((match = callActivityRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const calledElement = getAttr(match[0], 'calledElement') || null;
    if (id) {
      callActivities.push({ id, name, type: 'CallActivity', calledElement });
    }
  }

  // Extract SubProcesses
  const subProcesses: BpmnElement[] = [];
  const subProcessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
  while ((match = subProcessRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      subProcesses.push({ id, name, type: 'SubProcess' });
    }
  }

  // Extract Tasks
  const serviceTasks: BpmnElement[] = [];
  const userTasks: BpmnElement[] = [];
  const businessRuleTasks: BpmnElement[] = [];

  const taskPatterns = [
    { regex: /<(?:bpmn:)?serviceTask[^>]*>/gi, type: 'ServiceTask' as const, array: serviceTasks },
    { regex: /<(?:bpmn:)?userTask[^>]*>/gi, type: 'UserTask' as const, array: userTasks },
    { regex: /<(?:bpmn:)?businessRuleTask[^>]*>/gi, type: 'BusinessRuleTask' as const, array: businessRuleTasks },
  ];

  for (const { regex, type, array } of taskPatterns) {
    while ((match = regex.exec(content)) !== null) {
      const id = getAttr(match[0], 'id');
      const name = getAttr(match[0], 'name') || id;
      if (id) {
        array.push({ id, name, type });
      }
    }
  }

  return {
    fileName,
    processId,
    processName,
    callActivities,
    subProcesses,
    serviceTasks,
    userTasks,
    businessRuleTasks,
  };
}

function compareElements(
  oldElements: BpmnElement[],
  newElements: BpmnElement[],
  elementType: string
): {
  added: BpmnElement[];
  removed: BpmnElement[];
  changed: Array<{ old: BpmnElement; new: BpmnElement }>;
} {
  const oldMap = new Map(oldElements.map(e => [e.id, e]));
  const newMap = new Map(newElements.map(e => [e.id, e]));

  const added: BpmnElement[] = [];
  const removed: BpmnElement[] = [];
  const changed: Array<{ old: BpmnElement; new: BpmnElement }> = [];

  // Find added and changed
  for (const newEl of newElements) {
    const oldEl = oldMap.get(newEl.id);
    if (!oldEl) {
      added.push(newEl);
    } else if (oldEl.name !== newEl.name || oldEl.calledElement !== newEl.calledElement) {
      changed.push({ old: oldEl, new: newEl });
    }
  }

  // Find removed
  for (const oldEl of oldElements) {
    if (!newMap.has(oldEl.id)) {
      removed.push(oldEl);
    }
  }

  return { added, removed, changed };
}

function formatElementList(elements: BpmnElement[]): string {
  if (elements.length === 0) return '  (inga)';
  return elements.map(e => {
    const calledInfo = e.calledElement ? ` → ${e.calledElement}` : '';
    return `  - ${e.name} (${e.id})${calledInfo}`;
  }).join('\n');
}

/**
 * Hitta archive-mappar
 */
function findArchiveFolders(): string[] {
  const fixturesDir = path.join(__dirname, '../tests/fixtures/bpmn');
  if (!fs.existsSync(fixturesDir)) {
    return [];
  }

  const entries = fs.readdirSync(fixturesDir, { withFileTypes: true });
  const folders = entries
    .filter(e => e.isDirectory() && e.name.startsWith('mortgage-se'))
    .map(e => path.join(fixturesDir, e.name))
    .sort()
    .reverse(); // Senaste först

  return folders;
}

async function main() {
  const args = process.argv.slice(2);
  
  let oldDir: string;
  let newDir: string;

  if (args.length >= 2) {
    oldDir = args[0];
    newDir = args[1];
  } else {
    const folders = findArchiveFolders();
    if (folders.length < 2) {
      console.error('❌ Kunde inte hitta tillräckligt många archive-mappar');
      console.error('   Använd: tsx scripts/compare-bpmn-versions.ts [gamla-mappen] [nya-mappen]');
      process.exit(1);
    }
    newDir = folders[0]; // Senaste
    oldDir = folders[1]; // Näst senaste
  }

  if (!fs.existsSync(oldDir)) {
    console.error(`❌ Kunde inte hitta mappen: ${oldDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(newDir)) {
    console.error(`❌ Kunde inte hitta mappen: ${newDir}`);
    process.exit(1);
  }

  // Get all BPMN files
  const oldFiles = fs.readdirSync(oldDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();
  const newFiles = fs.readdirSync(newDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();

  // Find new and removed files
  const oldFileSet = new Set(oldFiles);
  const newFileSet = new Set(newFiles);
  const newFileNames = newFiles.filter(f => !oldFileSet.has(f));
  const removedFileNames = oldFiles.filter(f => !newFileSet.has(f));
  const commonFiles = oldFiles.filter(f => newFileSet.has(f));

  console.log('='.repeat(80));
  console.log('BPMN FILER - JÄMFÖRELSE');
  console.log('='.repeat(80));
  console.log(`\n📁 Gamla mappen: ${path.basename(oldDir)} (${oldFiles.length} filer)`);
  console.log(`📁 Nya mappen: ${path.basename(newDir)} (${newFiles.length} filer)\n`);

  // New files
  if (newFileNames.length > 0) {
    console.log('🆕 NYA FILER:');
    for (const fileName of newFileNames) {
      const filePath = path.join(newDir, fileName);
      const analysis = parseBpmnFile(filePath);
      console.log(`\n  📄 ${fileName}`);
      console.log(`     Process: ${analysis.processName} (${analysis.processId})`);
      console.log(`     CallActivities: ${analysis.callActivities.length}`);
      console.log(`     SubProcesses: ${analysis.subProcesses.length}`);
      console.log(`     ServiceTasks: ${analysis.serviceTasks.length}`);
      console.log(`     UserTasks: ${analysis.userTasks.length}`);
      console.log(`     BusinessRuleTasks: ${analysis.businessRuleTasks.length}`);
    }
    console.log('');
  } else {
    console.log('✅ Inga nya filer\n');
  }

  // Removed files
  if (removedFileNames.length > 0) {
    console.log('🗑️  BORTRAGNA FILER:');
    for (const fileName of removedFileNames) {
      console.log(`  - ${fileName}`);
    }
    console.log('');
  } else {
    console.log('✅ Inga borttagna filer\n');
  }

  // Compare common files
  console.log('='.repeat(80));
  console.log('ÄNDRINGAR I GEMENSAMMA FILER');
  console.log('='.repeat(80));

  let totalChanges = 0;

  for (const fileName of commonFiles) {
    const oldPath = path.join(oldDir, fileName);
    const newPath = path.join(newDir, fileName);
    const oldAnalysis = parseBpmnFile(oldPath);
    const newAnalysis = parseBpmnFile(newPath);

    // Check if process name changed
    const processChanged = oldAnalysis.processName !== newAnalysis.processName ||
                          oldAnalysis.processId !== newAnalysis.processId;

    // Compare each element type
    const callActivityChanges = compareElements(oldAnalysis.callActivities, newAnalysis.callActivities, 'CallActivity');
    const subProcessChanges = compareElements(oldAnalysis.subProcesses, newAnalysis.subProcesses, 'SubProcess');
    const serviceTaskChanges = compareElements(oldAnalysis.serviceTasks, newAnalysis.serviceTasks, 'ServiceTask');
    const userTaskChanges = compareElements(oldAnalysis.userTasks, newAnalysis.userTasks, 'UserTask');
    const businessRuleChanges = compareElements(oldAnalysis.businessRuleTasks, newAnalysis.businessRuleTasks, 'BusinessRuleTask');

    const hasChanges = processChanged ||
      callActivityChanges.added.length > 0 || callActivityChanges.removed.length > 0 || callActivityChanges.changed.length > 0 ||
      subProcessChanges.added.length > 0 || subProcessChanges.removed.length > 0 || subProcessChanges.changed.length > 0 ||
      serviceTaskChanges.added.length > 0 || serviceTaskChanges.removed.length > 0 || serviceTaskChanges.changed.length > 0 ||
      userTaskChanges.added.length > 0 || userTaskChanges.removed.length > 0 || userTaskChanges.changed.length > 0 ||
      businessRuleChanges.added.length > 0 || businessRuleChanges.removed.length > 0 || businessRuleChanges.changed.length > 0;

    if (hasChanges) {
      totalChanges++;
      console.log(`\n📄 ${fileName}`);
      console.log('-'.repeat(80));

      if (processChanged) {
        console.log(`  🔄 Process ändrat:`);
        console.log(`     Gammalt: ${oldAnalysis.processName} (${oldAnalysis.processId})`);
        console.log(`     Nytt: ${newAnalysis.processName} (${newAnalysis.processId})`);
      }

      // CallActivities
      if (callActivityChanges.added.length > 0 || callActivityChanges.removed.length > 0 || callActivityChanges.changed.length > 0 || callActivityChanges.renamed.length > 0) {
        console.log(`\n  📞 CallActivities:`);
        if (callActivityChanges.added.length > 0) {
          console.log(`     ➕ Tillagda (${callActivityChanges.added.length}):`);
          console.log(formatElementList(callActivityChanges.added));
        }
        if (callActivityChanges.removed.length > 0) {
          console.log(`     ➖ Borttagna (${callActivityChanges.removed.length}):`);
          console.log(formatElementList(callActivityChanges.removed));
          console.log(`     ⚠️  Uppdatera: Ta bort från subprocessSteps i E2eTestsOverviewPage.tsx`);
        }
        if (callActivityChanges.renamed.length > 0) {
          console.log(`     🔄 Omnamngivna (${callActivityChanges.renamed.length}) - KRITISKT:`);
          for (const { old, new: newEl } of callActivityChanges.renamed) {
            console.log(`       - "${old.name}": ${old.id} → ${newEl.id}`);
            console.log(`         ⚠️  Uppdatera callActivityId i subprocessSteps från "${old.id}" till "${newEl.id}"`);
          }
        }
        if (callActivityChanges.changed.length > 0) {
          console.log(`     🔄 Ändrade (${callActivityChanges.changed.length}):`);
          for (const { old, new: newEl } of callActivityChanges.changed) {
            const changes: string[] = [];
            if (old.name !== newEl.name) changes.push(`namn: "${old.name}" → "${newEl.name}"`);
            if (old.calledElement !== newEl.calledElement) {
              changes.push(`calledElement: "${old.calledElement || 'null'}" → "${newEl.calledElement || 'null'}"`);
            }
            console.log(`       - ${old.id}: ${changes.join(', ')}`);
          }
        }
      }

      // SubProcesses
      if (subProcessChanges.added.length > 0 || subProcessChanges.removed.length > 0 || subProcessChanges.changed.length > 0) {
        console.log(`\n  🔄 SubProcesses:`);
        if (subProcessChanges.added.length > 0) {
          console.log(`     ➕ Tillagda (${subProcessChanges.added.length}):`);
          console.log(formatElementList(subProcessChanges.added));
        }
        if (subProcessChanges.removed.length > 0) {
          console.log(`     ➖ Borttagna (${subProcessChanges.removed.length}):`);
          console.log(formatElementList(subProcessChanges.removed));
        }
        if (subProcessChanges.changed.length > 0) {
          console.log(`     🔄 Ändrade (${subProcessChanges.changed.length}):`);
          for (const { old, new: newEl } of subProcessChanges.changed) {
            console.log(`       - ${old.id}: namn "${old.name}" → "${newEl.name}"`);
          }
        }
      }

      // ServiceTasks
      if (serviceTaskChanges.added.length > 0 || serviceTaskChanges.removed.length > 0 || serviceTaskChanges.changed.length > 0 || serviceTaskChanges.renamed.length > 0) {
        console.log(`\n  ⚙️  ServiceTasks:`);
        if (serviceTaskChanges.added.length > 0) {
          console.log(`     ➕ Tillagda (${serviceTaskChanges.added.length}):`);
          console.log(formatElementList(serviceTaskChanges.added));
          console.log(`     ⚠️  Uppdatera: Lägg till i bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (serviceTaskChanges.removed.length > 0) {
          console.log(`     ➖ Borttagna (${serviceTaskChanges.removed.length}):`);
          console.log(formatElementList(serviceTaskChanges.removed));
          console.log(`     ⚠️  Uppdatera: Ta bort från bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (serviceTaskChanges.renamed.length > 0) {
          console.log(`     🔄 Omnamngivna (${serviceTaskChanges.renamed.length}) - KRITISKT:`);
          for (const { old, new: newEl } of serviceTaskChanges.renamed) {
            console.log(`       - "${old.name}": ${old.id} → ${newEl.id}`);
            console.log(`         ⚠️  Uppdatera bpmnNodeId i bankProjectTestSteps från "${old.id}" till "${newEl.id}"`);
          }
        }
        if (serviceTaskChanges.changed.length > 0) {
          console.log(`     🔄 Ändrade (${serviceTaskChanges.changed.length}):`);
          for (const { old, new: newEl } of serviceTaskChanges.changed) {
            console.log(`       - ${old.id}: namn "${old.name}" → "${newEl.name}"`);
            console.log(`         ⚠️  Uppdatera bpmnNodeName i bankProjectTestSteps`);
          }
        }
      }

      // UserTasks
      if (userTaskChanges.added.length > 0 || userTaskChanges.removed.length > 0 || userTaskChanges.changed.length > 0 || userTaskChanges.renamed.length > 0) {
        console.log(`\n  👤 UserTasks:`);
        if (userTaskChanges.added.length > 0) {
          console.log(`     ➕ Tillagda (${userTaskChanges.added.length}):`);
          console.log(formatElementList(userTaskChanges.added));
          console.log(`     ⚠️  Uppdatera: Lägg till i bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (userTaskChanges.removed.length > 0) {
          console.log(`     ➖ Borttagna (${userTaskChanges.removed.length}):`);
          console.log(formatElementList(userTaskChanges.removed));
          console.log(`     ⚠️  Uppdatera: Ta bort från bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (userTaskChanges.renamed.length > 0) {
          console.log(`     🔄 Omnamngivna (${userTaskChanges.renamed.length}) - KRITISKT:`);
          for (const { old, new: newEl } of userTaskChanges.renamed) {
            console.log(`       - "${old.name}": ${old.id} → ${newEl.id}`);
            console.log(`         ⚠️  Uppdatera bpmnNodeId i bankProjectTestSteps från "${old.id}" till "${newEl.id}"`);
          }
        }
        if (userTaskChanges.changed.length > 0) {
          console.log(`     🔄 Ändrade (${userTaskChanges.changed.length}):`);
          for (const { old, new: newEl } of userTaskChanges.changed) {
            console.log(`       - ${old.id}: namn "${old.name}" → "${newEl.name}"`);
            console.log(`         ⚠️  Uppdatera bpmnNodeName i bankProjectTestSteps`);
          }
        }
      }

      // BusinessRuleTasks
      if (businessRuleChanges.added.length > 0 || businessRuleChanges.removed.length > 0 || businessRuleChanges.changed.length > 0 || businessRuleChanges.renamed.length > 0) {
        console.log(`\n  📋 BusinessRuleTasks:`);
        if (businessRuleChanges.added.length > 0) {
          console.log(`     ➕ Tillagda (${businessRuleChanges.added.length}):`);
          console.log(formatElementList(businessRuleChanges.added));
          console.log(`     ⚠️  Uppdatera: Lägg till i bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (businessRuleChanges.removed.length > 0) {
          console.log(`     ➖ Borttagna (${businessRuleChanges.removed.length}):`);
          console.log(formatElementList(businessRuleChanges.removed));
          console.log(`     ⚠️  Uppdatera: Ta bort från bankProjectTestSteps i E2eTestsOverviewPage.tsx`);
        }
        if (businessRuleChanges.renamed.length > 0) {
          console.log(`     🔄 Omnamngivna (${businessRuleChanges.renamed.length}) - KRITISKT:`);
          for (const { old, new: newEl } of businessRuleChanges.renamed) {
            console.log(`       - "${old.name}": ${old.id} → ${newEl.id}`);
            console.log(`         ⚠️  Uppdatera bpmnNodeId i bankProjectTestSteps från "${old.id}" till "${newEl.id}"`);
          }
        }
        if (businessRuleChanges.changed.length > 0) {
          console.log(`     🔄 Ändrade (${businessRuleChanges.changed.length}):`);
          for (const { old, new: newEl } of businessRuleChanges.changed) {
            console.log(`       - ${old.id}: namn "${old.name}" → "${newEl.name}"`);
            console.log(`         ⚠️  Uppdatera bpmnNodeName i bankProjectTestSteps`);
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 SAMMANFATTNING`);
  console.log('='.repeat(80));
  console.log(`  🆕 Nya filer: ${newFileNames.length}`);
  console.log(`  🗑️  Borttagna filer: ${removedFileNames.length}`);
  console.log(`  🔄 Filer med ändringar: ${totalChanges}`);
  console.log(`  ✅ Oförändrade filer: ${commonFiles.length - totalChanges}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

