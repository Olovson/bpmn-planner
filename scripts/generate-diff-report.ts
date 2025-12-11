#!/usr/bin/env tsx
/**
 * Script för att generera diff-rapport mellan två BPMN-mappar
 * 
 * Användning:
 *   tsx scripts/generate-diff-report.ts <gamla-mappen> <nya-mappen>
 * 
 * Exempel:
 *   tsx scripts/generate-diff-report.ts "mortgage-se 2025.11.29" "mortgage-se 2025.12.11 17:44"
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
  type: 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity' | 'SubProcess' | 'Gateway' | 'SequenceFlow';
  attributes?: Record<string, string>;
}

interface BpmnFileAnalysis {
  fileName: string;
  processId: string;
  processName: string;
  serviceTasks: BpmnElement[];
  userTasks: BpmnElement[];
  businessRuleTasks: BpmnElement[];
  callActivities: BpmnElement[];
  subProcesses: BpmnElement[];
  gateways: BpmnElement[];
  sequenceFlows: BpmnElement[];
}

interface ComponentChanges {
  added: BpmnElement[];
  removed: BpmnElement[];
  changed: Array<{ old: BpmnElement; new: BpmnElement }>;
}

interface FileChanges {
  fileName: string;
  processChanged: boolean;
  oldProcessName?: string;
  newProcessName?: string;
  serviceTaskChanges: ComponentChanges;
  userTaskChanges: ComponentChanges;
  businessRuleTaskChanges: ComponentChanges;
  callActivityChanges: ComponentChanges;
  subProcessChanges: ComponentChanges;
  gatewayChanges: ComponentChanges;
  sequenceFlowChanges: ComponentChanges;
}

interface DiffResult {
  newFiles: string[];
  removedFiles: string[];
  modifiedFiles: string[];
  unchangedFiles: string[];
  fileChanges: Map<string, FileChanges>; // filename -> detailed changes
}

/**
 * Extrahera attribut från ett XML-element
 */
function getAttr(element: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
  const match = regex.exec(element);
  return match ? match[1] : '';
}

/**
 * Analysera en BPMN-fil och extrahera komponenter
 */
function analyzeBpmnFile(filePath: string): BpmnFileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Extract process info
  const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(content);
  const processId = processMatch ? getAttr(processMatch[0], 'id') : '';
  const processName = processMatch ? (getAttr(processMatch[0], 'name') || processId) : '';

  // Extract ServiceTasks
  const serviceTasks: BpmnElement[] = [];
  const serviceTaskRegex = /<(?:bpmn:)?serviceTask[^>]*>/gi;
  let match;
  while ((match = serviceTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      serviceTasks.push({
        id,
        name,
        type: 'ServiceTask',
        attributes: {
          implementation: getAttr(match[0], 'camunda:delegateExpression') || getAttr(match[0], 'camunda:class') || getAttr(match[0], 'camunda:type') || '',
          topic: getAttr(match[0], 'camunda:topic') || '',
        },
      });
    }
  }

  // Extract UserTasks
  const userTasks: BpmnElement[] = [];
  const userTaskRegex = /<(?:bpmn:)?userTask[^>]*>/gi;
  while ((match = userTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      userTasks.push({
        id,
        name,
        type: 'UserTask',
        attributes: {
          assignee: getAttr(match[0], 'camunda:assignee') || '',
          formKey: getAttr(match[0], 'camunda:formKey') || '',
        },
      });
    }
  }

  // Extract BusinessRuleTasks
  const businessRuleTasks: BpmnElement[] = [];
  const businessRuleTaskRegex = /<(?:bpmn:)?businessRuleTask[^>]*>/gi;
  while ((match = businessRuleTaskRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      businessRuleTasks.push({
        id,
        name,
        type: 'BusinessRuleTask',
        attributes: {
          decisionRef: getAttr(match[0], 'camunda:decisionRef') || '',
        },
      });
    }
  }

  // Extract CallActivities
  const callActivities: BpmnElement[] = [];
  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  while ((match = callActivityRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const calledElement = getAttr(match[0], 'calledElement') || null;
    if (id) {
      callActivities.push({
        id,
        name,
        type: 'CallActivity',
        attributes: {
          calledElement: calledElement || '',
        },
      });
    }
  }

  // Extract SubProcesses
  const subProcesses: BpmnElement[] = [];
  const subProcessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
  while ((match = subProcessRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      subProcesses.push({
        id,
        name,
        type: 'SubProcess',
      });
    }
  }

  // Extract Gateways
  const gateways: BpmnElement[] = [];
  const gatewayRegex = /<(?:bpmn:)?(?:exclusiveGateway|inclusiveGateway|parallelGateway|eventBasedGateway)[^>]*>/gi;
  while ((match = gatewayRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const gatewayType = match[0].match(/<(?:bpmn:)?(\w+Gateway)/i)?.[1] || 'Gateway';
    if (id) {
      gateways.push({
        id,
        name,
        type: 'Gateway',
        attributes: {
          gatewayType: gatewayType,
        },
      });
    }
  }

  // Extract SequenceFlows (simplified - just count and key ones)
  const sequenceFlows: BpmnElement[] = [];
  const sequenceFlowRegex = /<(?:bpmn:)?sequenceFlow[^>]*>/gi;
  while ((match = sequenceFlowRegex.exec(content)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || '';
    const sourceRef = getAttr(match[0], 'sourceRef');
    const targetRef = getAttr(match[0], 'targetRef');
    if (id) {
      sequenceFlows.push({
        id,
        name: name || `${sourceRef} → ${targetRef}`,
        type: 'SequenceFlow',
        attributes: {
          sourceRef: sourceRef || '',
          targetRef: targetRef || '',
        },
      });
    }
  }

  return {
    fileName,
    processId,
    processName,
    serviceTasks,
    userTasks,
    businessRuleTasks,
    callActivities,
    subProcesses,
    gateways,
    sequenceFlows,
  };
}

/**
 * Jämför två listor av BPMN-element
 */
function compareElements(
  oldElements: BpmnElement[],
  newElements: BpmnElement[]
): ComponentChanges {
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
    } else {
      // Check if changed (name or attributes)
      const nameChanged = oldEl.name !== newEl.name;
      const attrsChanged = JSON.stringify(oldEl.attributes || {}) !== JSON.stringify(newEl.attributes || {});
      if (nameChanged || attrsChanged) {
        changed.push({ old: oldEl, new: newEl });
      }
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

/**
 * Jämför två mappar och skapar diff-rapport
 */
function compareFolders(oldDir: string, newDir: string): DiffResult {
  const oldFiles = fs.readdirSync(oldDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();
  const newFiles = fs.readdirSync(newDir)
    .filter(f => f.endsWith('.bpmn'))
    .sort();

  const oldFileSet = new Set(oldFiles);
  const newFileSet = new Set(newFiles);

  const newFilesList = newFiles.filter(f => !oldFileSet.has(f));
  const removedFilesList = oldFiles.filter(f => !newFileSet.has(f));
  const commonFiles = oldFiles.filter(f => newFileSet.has(f));

  const modifiedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const fileChanges = new Map<string, FileChanges>();

  for (const fileName of commonFiles) {
    const oldPath = path.join(oldDir, fileName);
    const newPath = path.join(newDir, fileName);

    const oldAnalysis = analyzeBpmnFile(oldPath);
    const newAnalysis = analyzeBpmnFile(newPath);

    // Check if process changed
    const processChanged = oldAnalysis.processName !== newAnalysis.processName ||
                          oldAnalysis.processId !== newAnalysis.processId;

    // Compare components
    const serviceTaskChanges = compareElements(oldAnalysis.serviceTasks, newAnalysis.serviceTasks);
    const userTaskChanges = compareElements(oldAnalysis.userTasks, newAnalysis.userTasks);
    const businessRuleTaskChanges = compareElements(oldAnalysis.businessRuleTasks, newAnalysis.businessRuleTasks);
    const callActivityChanges = compareElements(oldAnalysis.callActivities, newAnalysis.callActivities);
    const subProcessChanges = compareElements(oldAnalysis.subProcesses, newAnalysis.subProcesses);
    const gatewayChanges = compareElements(oldAnalysis.gateways, newAnalysis.gateways);
    const sequenceFlowChanges = compareElements(oldAnalysis.sequenceFlows, newAnalysis.sequenceFlows);

    // Check if file has any changes
    const hasChanges = processChanged ||
      serviceTaskChanges.added.length > 0 || serviceTaskChanges.removed.length > 0 || serviceTaskChanges.changed.length > 0 ||
      userTaskChanges.added.length > 0 || userTaskChanges.removed.length > 0 || userTaskChanges.changed.length > 0 ||
      businessRuleTaskChanges.added.length > 0 || businessRuleTaskChanges.removed.length > 0 || businessRuleTaskChanges.changed.length > 0 ||
      callActivityChanges.added.length > 0 || callActivityChanges.removed.length > 0 || callActivityChanges.changed.length > 0 ||
      subProcessChanges.added.length > 0 || subProcessChanges.removed.length > 0 || subProcessChanges.changed.length > 0 ||
      gatewayChanges.added.length > 0 || gatewayChanges.removed.length > 0 || gatewayChanges.changed.length > 0 ||
      sequenceFlowChanges.added.length > 0 || sequenceFlowChanges.removed.length > 0 || sequenceFlowChanges.changed.length > 0;

    if (hasChanges) {
      modifiedFiles.push(fileName);
      fileChanges.set(fileName, {
        fileName,
        processChanged,
        oldProcessName: oldAnalysis.processName,
        newProcessName: newAnalysis.processName,
        serviceTaskChanges,
        userTaskChanges,
        businessRuleTaskChanges,
        callActivityChanges,
        subProcessChanges,
        gatewayChanges,
        sequenceFlowChanges,
      });
    } else {
      unchangedFiles.push(fileName);
    }
  }

  return {
    newFiles: newFilesList,
    removedFiles: removedFilesList,
    modifiedFiles,
    unchangedFiles,
    fileChanges,
  };
}

/**
 * Formatera elementlista för rapport
 */
function formatElementList(elements: BpmnElement[], showAttributes: boolean = false): string {
  if (elements.length === 0) return '  (inga)';
  return elements.map(e => {
    let line = `  - **${e.name}** (\`${e.id}\`)`;
    if (showAttributes && e.attributes) {
      const attrs: string[] = [];
      if (e.attributes.implementation) attrs.push(`implementation: ${e.attributes.implementation}`);
      if (e.attributes.topic) attrs.push(`topic: ${e.attributes.topic}`);
      if (e.attributes.assignee) attrs.push(`assignee: ${e.attributes.assignee}`);
      if (e.attributes.formKey) attrs.push(`formKey: ${e.attributes.formKey}`);
      if (e.attributes.decisionRef) attrs.push(`decisionRef: ${e.attributes.decisionRef}`);
      if (e.attributes.calledElement) attrs.push(`calledElement: ${e.attributes.calledElement}`);
      if (attrs.length > 0) {
        line += `\n    - ${attrs.join(', ')}`;
      }
    }
    return line;
  }).join('\n');
}

/**
 * Skapa sammanfattning för en fil
 */
function createFileSummary(changes: FileChanges): string {
  const parts: string[] = [];
  
  const serviceCount = changes.serviceTaskChanges.added.length + 
                      changes.serviceTaskChanges.removed.length + 
                      changes.serviceTaskChanges.changed.length;
  const userCount = changes.userTaskChanges.added.length + 
                   changes.userTaskChanges.removed.length + 
                   changes.userTaskChanges.changed.length;
  const businessRuleCount = changes.businessRuleTaskChanges.added.length + 
                           changes.businessRuleTaskChanges.removed.length + 
                           changes.businessRuleTaskChanges.changed.length;
  const callActivityCount = changes.callActivityChanges.added.length + 
                           changes.callActivityChanges.removed.length + 
                           changes.callActivityChanges.changed.length;
  const gatewayCount = changes.gatewayChanges.added.length + 
                      changes.gatewayChanges.removed.length + 
                      changes.gatewayChanges.changed.length;
  const sequenceFlowCount = changes.sequenceFlowChanges.added.length + 
                           changes.sequenceFlowChanges.removed.length + 
                           changes.sequenceFlowChanges.changed.length;

  if (serviceCount > 0) parts.push(`${serviceCount} service task${serviceCount > 1 ? 's' : ''}`);
  if (userCount > 0) parts.push(`${userCount} user task${userCount > 1 ? 's' : ''}`);
  if (businessRuleCount > 0) parts.push(`${businessRuleCount} business rule${businessRuleCount > 1 ? 's' : ''}`);
  if (callActivityCount > 0) parts.push(`${callActivityCount} call activit${callActivityCount > 1 ? 'ies' : 'y'}`);
  if (gatewayCount > 0) parts.push(`${gatewayCount} gateway${gatewayCount > 1 ? 's' : ''}`);
  if (sequenceFlowCount > 0) parts.push(`${sequenceFlowCount} sequence flow${sequenceFlowCount > 1 ? 's' : ''}`);
  if (changes.processChanged) parts.push('processnamn/ID');

  return parts.length > 0 ? parts.join(', ') : 'Inga ändringar';
}

/**
 * Skapa diff-rapport som markdown
 */
function generateDiffReport(
  oldDir: string,
  newDir: string,
  diffResult: DiffResult
): string {
  const oldFolderName = path.basename(oldDir);
  const newFolderName = path.basename(newDir);

  const report: string[] = [];

  report.push('# BPMN Diff-rapport');
  report.push('');
  report.push(`**Från:** ${oldFolderName}`);
  report.push(`**Till:** ${newFolderName}`);
  report.push(`**Genererad:** ${new Date().toISOString()}`);
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 📊 Sammanfattning');
  report.push('');
  report.push(`- 🆕 **Nya filer:** ${diffResult.newFiles.length}`);
  report.push(`- 🗑️ **Borttagna filer:** ${diffResult.removedFiles.length}`);
  report.push(`- 🔄 **Modifierade filer:** ${diffResult.modifiedFiles.length}`);
  report.push(`- ✅ **Oförändrade filer:** ${diffResult.unchangedFiles.length}`);
  report.push('');

  // Nya filer
  if (diffResult.newFiles.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🆕 Nya filer');
    report.push('');
    diffResult.newFiles.forEach(file => {
      report.push(`- \`${file}\``);
    });
    report.push('');
  }

  // Borttagna filer
  if (diffResult.removedFiles.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🗑️ Borttagna filer');
    report.push('');
    diffResult.removedFiles.forEach(file => {
      report.push(`- \`${file}\``);
    });
    report.push('');
  }

  // Modifierade filer - detaljerad analys
  if (diffResult.modifiedFiles.length > 0) {
    report.push('---');
    report.push('');
    report.push('## 🔄 Modifierade filer');
    report.push('');

    for (const fileName of diffResult.modifiedFiles) {
      const changes = diffResult.fileChanges.get(fileName);
      if (!changes) continue;

      report.push(`### 📄 ${fileName}`);
      report.push('');
      report.push(`**Sammanfattning:** ${createFileSummary(changes)}`);
      report.push('');

      // Processnivå
      if (changes.processChanged) {
        report.push('#### Process');
        report.push(`- **Namn:** "${changes.oldProcessName}" → "${changes.newProcessName}"`);
        report.push('');
      }

      // PRIORITERADE KOMPONENTER

      // Service Tasks
      if (changes.serviceTaskChanges.added.length > 0 || 
          changes.serviceTaskChanges.removed.length > 0 || 
          changes.serviceTaskChanges.changed.length > 0) {
        report.push('#### ⚙️ Service Tasks');
        if (changes.serviceTaskChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.serviceTaskChanges.added.length}):**`);
          report.push(formatElementList(changes.serviceTaskChanges.added, true));
          report.push('');
        }
        if (changes.serviceTaskChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.serviceTaskChanges.removed.length}):**`);
          report.push(formatElementList(changes.serviceTaskChanges.removed));
          report.push('');
        }
        if (changes.serviceTaskChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.serviceTaskChanges.changed.length}):**`);
          changes.serviceTaskChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`)`);
            if (oldEl.name !== newEl.name) {
              report.push(`    - Namn: "${oldEl.name}" → "${newEl.name}"`);
            }
            if (oldEl.attributes?.implementation !== newEl.attributes?.implementation) {
              report.push(`    - Implementation: "${oldEl.attributes?.implementation || 'none'}" → "${newEl.attributes?.implementation || 'none'}"`);
            }
            if (oldEl.attributes?.topic !== newEl.attributes?.topic) {
              report.push(`    - Topic: "${oldEl.attributes?.topic || 'none'}" → "${newEl.attributes?.topic || 'none'}"`);
            }
          });
          report.push('');
        }
      }

      // User Tasks
      if (changes.userTaskChanges.added.length > 0 || 
          changes.userTaskChanges.removed.length > 0 || 
          changes.userTaskChanges.changed.length > 0) {
        report.push('#### 👤 User Tasks');
        if (changes.userTaskChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.userTaskChanges.added.length}):**`);
          report.push(formatElementList(changes.userTaskChanges.added, true));
          report.push('');
        }
        if (changes.userTaskChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.userTaskChanges.removed.length}):**`);
          report.push(formatElementList(changes.userTaskChanges.removed));
          report.push('');
        }
        if (changes.userTaskChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.userTaskChanges.changed.length}):**`);
          changes.userTaskChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`)`);
            if (oldEl.name !== newEl.name) {
              report.push(`    - Namn: "${oldEl.name}" → "${newEl.name}"`);
            }
            if (oldEl.attributes?.assignee !== newEl.attributes?.assignee) {
              report.push(`    - Assignee: "${oldEl.attributes?.assignee || 'none'}" → "${newEl.attributes?.assignee || 'none'}"`);
            }
            if (oldEl.attributes?.formKey !== newEl.attributes?.formKey) {
              report.push(`    - FormKey: "${oldEl.attributes?.formKey || 'none'}" → "${newEl.attributes?.formKey || 'none'}"`);
            }
          });
          report.push('');
        }
      }

      // Business Rule Tasks
      if (changes.businessRuleTaskChanges.added.length > 0 || 
          changes.businessRuleTaskChanges.removed.length > 0 || 
          changes.businessRuleTaskChanges.changed.length > 0) {
        report.push('#### 📋 Business Rule Tasks');
        if (changes.businessRuleTaskChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.businessRuleTaskChanges.added.length}):**`);
          report.push(formatElementList(changes.businessRuleTaskChanges.added, true));
          report.push('');
        }
        if (changes.businessRuleTaskChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.businessRuleTaskChanges.removed.length}):**`);
          report.push(formatElementList(changes.businessRuleTaskChanges.removed));
          report.push('');
        }
        if (changes.businessRuleTaskChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.businessRuleTaskChanges.changed.length}):**`);
          changes.businessRuleTaskChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`)`);
            if (oldEl.name !== newEl.name) {
              report.push(`    - Namn: "${oldEl.name}" → "${newEl.name}"`);
            }
            if (oldEl.attributes?.decisionRef !== newEl.attributes?.decisionRef) {
              report.push(`    - DecisionRef: "${oldEl.attributes?.decisionRef || 'none'}" → "${newEl.attributes?.decisionRef || 'none'}"`);
            }
          });
          report.push('');
        }
      }

      // SEKUNDÄRA KOMPONENTER

      // Call Activities
      if (changes.callActivityChanges.added.length > 0 || 
          changes.callActivityChanges.removed.length > 0 || 
          changes.callActivityChanges.changed.length > 0) {
        report.push('#### 📞 Call Activities');
        if (changes.callActivityChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.callActivityChanges.added.length}):**`);
          report.push(formatElementList(changes.callActivityChanges.added, true));
          report.push('');
        }
        if (changes.callActivityChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.callActivityChanges.removed.length}):**`);
          report.push(formatElementList(changes.callActivityChanges.removed));
          report.push('');
        }
        if (changes.callActivityChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.callActivityChanges.changed.length}):**`);
          changes.callActivityChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`)`);
            if (oldEl.name !== newEl.name) {
              report.push(`    - Namn: "${oldEl.name}" → "${newEl.name}"`);
            }
            if (oldEl.attributes?.calledElement !== newEl.attributes?.calledElement) {
              report.push(`    - CalledElement: "${oldEl.attributes?.calledElement || 'none'}" → "${newEl.attributes?.calledElement || 'none'}"`);
            }
          });
          report.push('');
        }
      }

      // SubProcesses
      if (changes.subProcessChanges.added.length > 0 || 
          changes.subProcessChanges.removed.length > 0 || 
          changes.subProcessChanges.changed.length > 0) {
        report.push('#### 🔄 SubProcesses');
        if (changes.subProcessChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.subProcessChanges.added.length}):**`);
          report.push(formatElementList(changes.subProcessChanges.added));
          report.push('');
        }
        if (changes.subProcessChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.subProcessChanges.removed.length}):**`);
          report.push(formatElementList(changes.subProcessChanges.removed));
          report.push('');
        }
        if (changes.subProcessChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.subProcessChanges.changed.length}):**`);
          changes.subProcessChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`): "${oldEl.name}" → "${newEl.name}"`);
          });
          report.push('');
        }
      }

      // Gateways
      if (changes.gatewayChanges.added.length > 0 || 
          changes.gatewayChanges.removed.length > 0 || 
          changes.gatewayChanges.changed.length > 0) {
        report.push('#### 🔀 Gateways');
        if (changes.gatewayChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.gatewayChanges.added.length}):**`);
          report.push(formatElementList(changes.gatewayChanges.added, true));
          report.push('');
        }
        if (changes.gatewayChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.gatewayChanges.removed.length}):**`);
          report.push(formatElementList(changes.gatewayChanges.removed));
          report.push('');
        }
        if (changes.gatewayChanges.changed.length > 0) {
          report.push(`**Ändrade (${changes.gatewayChanges.changed.length}):**`);
          changes.gatewayChanges.changed.forEach(({ old: oldEl, new: newEl }) => {
            report.push(`  - **${oldEl.name}** (\`${oldEl.id}\`): "${oldEl.name}" → "${newEl.name}"`);
          });
          report.push('');
        }
      }

      // Sequence Flows (visa bara sammanfattning om det är många)
      if (changes.sequenceFlowChanges.added.length > 0 || 
          changes.sequenceFlowChanges.removed.length > 0) {
        report.push('#### ➡️ Sequence Flows');
        if (changes.sequenceFlowChanges.added.length > 0) {
          report.push(`**Tillagda (${changes.sequenceFlowChanges.added.length}):**`);
          if (changes.sequenceFlowChanges.added.length <= 10) {
            report.push(formatElementList(changes.sequenceFlowChanges.added, true));
          } else {
            report.push(`  ${changes.sequenceFlowChanges.added.length} nya sequence flows`);
            report.push(formatElementList(changes.sequenceFlowChanges.added.slice(0, 5), true));
            report.push(`  ... och ${changes.sequenceFlowChanges.added.length - 5} fler`);
          }
          report.push('');
        }
        if (changes.sequenceFlowChanges.removed.length > 0) {
          report.push(`**Borttagna (${changes.sequenceFlowChanges.removed.length}):**`);
          if (changes.sequenceFlowChanges.removed.length <= 10) {
            report.push(formatElementList(changes.sequenceFlowChanges.removed, true));
          } else {
            report.push(`  ${changes.sequenceFlowChanges.removed.length} borttagna sequence flows`);
            report.push(formatElementList(changes.sequenceFlowChanges.removed.slice(0, 5), true));
            report.push(`  ... och ${changes.sequenceFlowChanges.removed.length - 5} fler`);
          }
          report.push('');
        }
      }

      report.push('---');
      report.push('');
    }
  }

  // Oförändrade filer (visa bara om det är få)
  if (diffResult.unchangedFiles.length > 0 && diffResult.unchangedFiles.length <= 20) {
    report.push('---');
    report.push('');
    report.push('## ✅ Oförändrade filer');
    report.push('');
    diffResult.unchangedFiles.forEach(file => {
      report.push(`- \`${file}\``);
    });
    report.push('');
  } else if (diffResult.unchangedFiles.length > 20) {
    report.push('---');
    report.push('');
    report.push(`## ✅ Oförändrade filer (${diffResult.unchangedFiles.length} filer)`);
    report.push('');
    report.push('*För många att lista individuellt*');
    report.push('');
  }

  report.push('---');
  report.push('');
  report.push('*Rapporten genereras automatiskt av generate-diff-report.ts*');

  return report.join('\n');
}

/**
 * Huvudfunktion
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Fel: Två mappar krävs');
    console.error('');
    console.error('Användning:');
    console.error('  tsx scripts/generate-diff-report.ts <gamla-mappen> <nya-mappen>');
    console.error('');
    console.error('Exempel:');
    console.error('  tsx scripts/generate-diff-report.ts "mortgage-se 2025.11.29" "mortgage-se 2025.12.11 17:44"');
    process.exit(1);
  }

  // Försök hitta mapparna - först i bpmn-planner, sedan i mortgage-template-main
  const bpmnPlannerDir = path.join(__dirname, '../tests/fixtures/bpmn');
  const mortgageTemplateDir = '/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules';
  
  let oldDir = path.join(bpmnPlannerDir, args[0]);
  let newDir = path.join(bpmnPlannerDir, args[1]);
  
  // Om inte i bpmn-planner, försök i mortgage-template-main
  if (!fs.existsSync(oldDir)) {
    oldDir = path.join(mortgageTemplateDir, args[0]);
  }
  if (!fs.existsSync(newDir)) {
    newDir = path.join(mortgageTemplateDir, args[1]);
  }

  if (!fs.existsSync(oldDir)) {
    console.error(`❌ Fel: Gamla mappen finns inte: ${oldDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(newDir)) {
    console.error(`❌ Fel: Nya mappen finns inte: ${newDir}`);
    process.exit(1);
  }

  try {
    console.log('='.repeat(80));
    console.log('BPMN DIFF-RAPPORT');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📁 Gamla mappen: ${path.basename(oldDir)}`);
    console.log(`📁 Nya mappen: ${path.basename(newDir)}`);
    console.log('');

    const diffResult = compareFolders(oldDir, newDir);
    const reportContent = generateDiffReport(oldDir, newDir, diffResult);
    const reportPath = path.join(newDir, 'diff-report.md');
    
    fs.writeFileSync(reportPath, reportContent, 'utf-8');

    console.log('='.repeat(80));
    console.log('✅ DIFF-RAPPORT GENERERAD');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📄 Rapport sparad: ${reportPath}`);
    console.log('');
    console.log('📊 Sammanfattning:');
    console.log(`   🆕 Nya filer: ${diffResult.newFiles.length}`);
    console.log(`   🗑️  Borttagna filer: ${diffResult.removedFiles.length}`);
    console.log(`   🔄 Modifierade filer: ${diffResult.modifiedFiles.length}`);
    console.log(`   ✅ Oförändrade filer: ${diffResult.unchangedFiles.length}`);
    console.log('');

    if (diffResult.modifiedFiles.length > 0) {
      console.log('🔄 Modifierade filer:');
      diffResult.modifiedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }

    if (diffResult.newFiles.length > 0) {
      console.log('🆕 Nya filer:');
      diffResult.newFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }

    if (diffResult.removedFiles.length > 0) {
      console.log('🗑️  Borttagna filer:');
      diffResult.removedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }

    console.log('='.repeat(80));
  } catch (error) {
    console.error('');
    console.error('❌ Fel uppstod:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    console.error('');
    process.exit(1);
  }
}

main().catch(console.error);

