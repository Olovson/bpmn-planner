/**
 * Identifiera valideringsfel för E2E_BR001 och E2E_BR006
 * 
 * Detta script analyserar scenarion direkt och identifierar:
 * - ServiceTasks som saknar API-anrop
 * - UserTasks som saknar UI-interaktion
 * - BusinessRuleTasks som saknar DMN-beslut
 * - SubprocessSteps som saknar Given/When/Then
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ValidationError {
  scenario: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location: string;
  suggestion?: string;
}

function extractTaskNamesFromSummary(summary?: string): Set<string> {
  const taskNames = new Set<string>();
  
  if (!summary || summary.trim().length === 0) {
    return taskNames;
  }
  
  const parts = summary.split('. ').map((p) => p.trim()).filter((p) => p.length > 0);
  
  parts.forEach((part) => {
    const cleanPart = part.replace(/\.$/, '');
    const match = cleanPart.match(/^([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*)\s*\(/);
    if (match) {
      const taskName = match[1].trim();
      taskNames.add(taskName.toLowerCase());
    } else {
      const taskName = cleanPart.split(/\s+/)[0].trim();
      if (taskName.length > 0) {
        taskNames.add(taskName.toLowerCase());
      }
    }
  });
  
  return taskNames;
}

function analyzeScenario(content: string, scenarioId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Hitta scenario-definitionen
  const scenarioMatch = content.match(new RegExp(`id:\\s*['"]${scenarioId}['"][\\s\\S]*?subprocessSteps:\\s*\\[([\\s\\S]*?)\\],`));
  if (!scenarioMatch) {
    console.error(`Kunde inte hitta scenario ${scenarioId}`);
    return errors;
  }
  
  // Analysera bankProjectTestSteps
  const testStepsMatch = content.match(new RegExp(`id:\\s*['"]${scenarioId}['"][\\s\\S]*?bankProjectTestSteps:\\s*\\[([\\s\\S]*?)\\],`));
  if (testStepsMatch) {
    const testStepsText = testStepsMatch[1];
    const stepBlocks = testStepsText.split(/\{\s*bpmnNodeId:/);
    
    stepBlocks.forEach((block, idx) => {
      if (idx === 0) return;
      
      const nodeTypeMatch = block.match(/bpmnNodeType:\s*['"]([^'"]+)['"]/);
      const nodeIdMatch = block.match(/bpmnNodeId:\s*['"]([^'"]+)['"]/);
      const nodeNameMatch = block.match(/bpmnNodeName:\s*['"]([^'"]+)['"]/);
      
      if (!nodeTypeMatch || !nodeIdMatch || !nodeNameMatch) return;
      
      const nodeType = nodeTypeMatch[1];
      const nodeId = nodeIdMatch[1];
      const nodeName = nodeNameMatch[1];
      
      if (nodeType === 'ServiceTask') {
        const apiCallMatch = block.match(/apiCall:\s*([^,}]+)/);
        const apiCall = apiCallMatch ? apiCallMatch[1].trim() : '';
        if (!apiCall || apiCall === 'undefined' || apiCall.length === 0) {
          errors.push({
            scenario: scenarioId,
            severity: 'error',
            category: 'ServiceTask Documentation',
            message: `ServiceTask "${nodeName}" (${nodeId}) saknar API-anrop`,
            location: `bankProjectTestSteps[${idx - 1}].apiCall`,
            suggestion: 'Lägg till API-anrop baserat på Feature Goal eller BPMN-nodens syfte',
          });
        }
      }
      
      if (nodeType === 'UserTask') {
        const uiInteractionMatch = block.match(/uiInteraction:\s*([^,}]+)/);
        const uiInteraction = uiInteractionMatch ? uiInteractionMatch[1].trim() : '';
        if (!uiInteraction || uiInteraction === 'undefined' || uiInteraction.length === 0) {
          errors.push({
            scenario: scenarioId,
            severity: 'error',
            category: 'UserTask Documentation',
            message: `UserTask "${nodeName}" (${nodeId}) saknar UI-interaktion`,
            location: `bankProjectTestSteps[${idx - 1}].uiInteraction`,
            suggestion: 'Lägg till UI-interaktion baserat på Feature Goal',
          });
        }
      }
      
      if (nodeType === 'BusinessRuleTask') {
        const dmnDecisionMatch = block.match(/dmnDecision:\s*([^,}]+)/);
        const dmnDecision = dmnDecisionMatch ? dmnDecisionMatch[1].trim() : '';
        if (!dmnDecision || dmnDecision === 'undefined' || dmnDecision.length === 0) {
          errors.push({
            scenario: scenarioId,
            severity: 'error',
            category: 'BusinessRuleTask Documentation',
            message: `BusinessRuleTask "${nodeName}" (${nodeId}) saknar DMN-beslut`,
            location: `bankProjectTestSteps[${idx - 1}].dmnDecision`,
            suggestion: 'Lägg till DMN-beslut baserat på BPMN-nodens syfte',
          });
        }
      }
    });
  }
  
  // Analysera subprocessSteps
  const subprocessStepsText = scenarioMatch[1];
  const subprocessBlocks = subprocessStepsText.split(/\{\s*order:/);
  
  subprocessBlocks.forEach((block, idx) => {
    if (idx === 0) return;
    
    const orderMatch = block.match(/order:\s*(\d+)/);
    const descriptionMatch = block.match(/description:\s*['"]([^'"]+)['"]/);
    
    if (!orderMatch || !descriptionMatch) return;
    
    const order = parseInt(orderMatch[1], 10);
    const description = descriptionMatch[1];
    
    // Kolla given
    const givenMatch = block.match(/given:\s*['"]([^'"]+)['"]/);
    if (!givenMatch || !givenMatch[1] || givenMatch[1].trim().length === 0) {
      errors.push({
        scenario: scenarioId,
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${description}" (order ${order}) saknar Given`,
        location: `subprocessSteps[${idx - 1}].given`,
        suggestion: 'Lägg till Given-beskrivning baserat på Feature Goal',
      });
    }
    
    // Kolla when
    const whenMatch = block.match(/when:\s*['"]([^'"]+)['"]/);
    if (!whenMatch || !whenMatch[1] || whenMatch[1].trim().length === 0) {
      errors.push({
        scenario: scenarioId,
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${description}" (order ${order}) saknar When`,
        location: `subprocessSteps[${idx - 1}].when`,
        suggestion: 'Lägg till When-beskrivning baserat på Feature Goal',
      });
    }
    
    // Kolla then
    const thenMatch = block.match(/then:\s*['"]([^'"]+)['"]/);
    if (!thenMatch || !thenMatch[1] || thenMatch[1].trim().length === 0) {
      errors.push({
        scenario: scenarioId,
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${description}" (order ${order}) saknar Then`,
        location: `subprocessSteps[${idx - 1}].then`,
        suggestion: 'Lägg till Then-beskrivning baserat på Feature Goal',
      });
    }
  });
  
  return errors;
}

async function main() {
  const filePath = join(process.cwd(), 'src/pages/E2eTestsOverviewPage.tsx');
  const content = readFileSync(filePath, 'utf-8');
  
  console.log('=== Analysera valideringsfel ===\n');
  
  const scenarios = ['E2E_BR001', 'E2E_BR006'];
  const allErrors: ValidationError[] = [];
  
  for (const scenarioId of scenarios) {
    console.log(`\n=== ${scenarioId} ===\n`);
    const errors = analyzeScenario(content, scenarioId);
    allErrors.push(...errors);
    
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    const infoCount = errors.filter(e => e.severity === 'info').length;
    
    console.log(`Errors: ${errorCount}`);
    console.log(`Warnings: ${warningCount}`);
    console.log(`Info: ${infoCount}`);
    console.log(`Total: ${errors.length}\n`);
    
    if (errors.length > 0) {
      console.log('Detaljer:');
      errors.forEach((error, idx) => {
        const icon = error.severity === 'error' ? '❌' : error.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`\n${idx + 1}. ${icon} [${error.category}] ${error.message}`);
        console.log(`   📍 ${error.location}`);
        if (error.suggestion) {
          console.log(`   💡 ${error.suggestion}`);
        }
      });
    } else {
      console.log('✅ Inga errors eller warnings hittade i direkt analys!');
    }
  }
  
  console.log(`\n\n=== Sammanfattning ===`);
  console.log(`Total errors: ${allErrors.filter(e => e.severity === 'error').length}`);
  console.log(`Total warnings: ${allErrors.filter(e => e.severity === 'warning').length}`);
  console.log(`Total info: ${allErrors.filter(e => e.severity === 'info').length}`);
  console.log(`\nNotering: Errors från BPMN → Scenarios mapping kräver process tree och kan inte identifieras i detta script.`);
  console.log(`Dessa errors kommer från tasks i BPMN-filer som saknas i dokumentation.`);
}

main().catch(console.error);

