#!/usr/bin/env tsx

/**
 * Script för att analysera E2E-scenarion och identifiera kvalitetsbrister
 * 
 * Detta script simulerar vad kvalitetsvalideringssidan gör:
 * 1. Läser scenarion från E2eTestsOverviewPage.tsx
 * 2. Analyserar bankProjectTestSteps för brister
 * 3. Genererar en rapport med issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BankProjectTestStep {
  bpmnNodeId: string;
  bpmnNodeType: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity' | 'BoundaryEvent' | 'Gateway';
  bpmnNodeName: string;
  action: string;
  uiInteraction?: string;
  apiCall?: string;
  dmnDecision?: string;
  assertion: string;
  backendState?: string;
}

interface E2eScenario {
  id: string;
  name: string;
  bankProjectTestSteps: BankProjectTestStep[];
  subprocessSteps: Array<{
    order: number;
    description: string;
    given?: string;
    when?: string;
    then?: string;
  }>;
}

interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location: string;
  suggestion: string;
}

function analyzeScenario(scenario: E2eScenario): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Analysera bankProjectTestSteps
  scenario.bankProjectTestSteps.forEach((step, index) => {
    // Validera UserTasks
    if (step.bpmnNodeType === 'UserTask') {
      if (!step.uiInteraction || step.uiInteraction.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'UserTask Documentation',
          message: `UserTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar UI-interaktion`,
          location: `bankProjectTestSteps[${index}].uiInteraction`,
          suggestion: 'Lägg till UI-interaktion baserat på Feature Goal',
        });
      }
    }

    // Validera ServiceTasks
    if (step.bpmnNodeType === 'ServiceTask') {
      if (!step.apiCall || step.apiCall.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'ServiceTask Documentation',
          message: `ServiceTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar API-anrop`,
          location: `bankProjectTestSteps[${index}].apiCall`,
          suggestion: 'Lägg till API-anrop baserat på Feature Goal eller BPMN-nodens syfte',
        });
      }
    }

    // Validera BusinessRuleTasks
    if (step.bpmnNodeType === 'BusinessRuleTask') {
      if (!step.dmnDecision || step.dmnDecision.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'BusinessRuleTask Documentation',
          message: `BusinessRuleTask "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar DMN-beslut`,
          location: `bankProjectTestSteps[${index}].dmnDecision`,
          suggestion: 'Lägg till DMN-beslut baserat på BPMN-nodens syfte',
        });
      }
    }

    // Validera Gateways
    if (step.bpmnNodeType === 'Gateway') {
      if (!step.dmnDecision || step.dmnDecision.trim().length === 0) {
        issues.push({
          severity: 'warning',
          category: 'Gateway Documentation',
          message: `Gateway "${step.bpmnNodeName}" (${step.bpmnNodeId}) saknar DMN-beslut`,
          location: `bankProjectTestSteps[${index}].dmnDecision`,
          suggestion: 'Lägg till DMN-beslut eller gateway-beslut för tydlighet',
        });
      }
    }
  });

  // Analysera subprocessSteps
  scenario.subprocessSteps.forEach((step, index) => {
    if (!step.given || step.given.trim().length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Given`,
        location: `subprocessSteps[${index}].given`,
        suggestion: 'Lägg till Given-beskrivning baserat på Feature Goal',
      });
    }

    if (!step.when || step.when.trim().length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar When`,
        location: `subprocessSteps[${index}].when`,
        suggestion: 'Lägg till When-beskrivning baserat på Feature Goal',
      });
    }

    if (!step.then || step.then.trim().length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Subprocess Documentation',
        message: `Subprocess "${step.description}" (order ${step.order}) saknar Then`,
        location: `subprocessSteps[${index}].then`,
        suggestion: 'Lägg till Then-beskrivning baserat på Feature Goal',
      });
    }
  });

  return issues;
}

async function main() {
  try {
    // Läs E2eTestsOverviewPage.tsx
    const filePath = resolve(__dirname, '../src/pages/E2eTestsOverviewPage.tsx');
    const content = readFileSync(filePath, 'utf-8');

    // Extrahera scenarios array (förenklad - vi använder regex)
    // I en riktig implementation skulle vi använda TypeScript compiler eller AST parser
    console.log('⚠️  Detta script är en förenklad analys.');
    console.log('För fullständig analys, använd kvalitetsvalideringssidan på /e2e-quality-validation\n');

    // Räkna UserTasks, ServiceTasks, BusinessRuleTasks i koden
    const userTaskMatches = content.matchAll(/bpmnNodeType:\s*'UserTask'/g);
    const serviceTaskMatches = content.matchAll(/bpmnNodeType:\s*'ServiceTask'/g);
    const businessRuleTaskMatches = content.matchAll(/bpmnNodeType:\s*'BusinessRuleTask'/g);
    const gatewayMatches = content.matchAll(/bpmnNodeType:\s*'Gateway'/g);

    const userTaskCount = Array.from(userTaskMatches).length;
    const serviceTaskCount = Array.from(serviceTaskMatches).length;
    const businessRuleTaskCount = Array.from(businessRuleTaskMatches).length;
    const gatewayCount = Array.from(gatewayMatches).length;

    console.log('📊 Analys av E2eTestsOverviewPage.tsx:');
    console.log(`UserTasks: ${userTaskCount}`);
    console.log(`ServiceTasks: ${serviceTaskCount}`);
    console.log(`BusinessRuleTasks: ${businessRuleTaskCount}`);
    console.log(`Gateways: ${gatewayCount}\n`);

    // Kontrollera om UserTasks har uiInteraction
    const userTaskWithUI = content.matchAll(/bpmnNodeType:\s*'UserTask'[\s\S]*?uiInteraction:\s*([^\n,}]+)/g);
    const userTaskWithUICount = Array.from(userTaskWithUI).length;
    
    console.log(`UserTasks med UI-interaktion: ${userTaskWithUICount} / ${userTaskCount}`);
    if (userTaskCount > 0 && userTaskWithUICount < userTaskCount) {
      console.log(`⚠️  ${userTaskCount - userTaskWithUICount} UserTasks saknar UI-interaktion\n`);
    }

    // Kontrollera om ServiceTasks har apiCall
    const serviceTaskWithAPI = content.matchAll(/bpmnNodeType:\s*'ServiceTask'[\s\S]*?apiCall:\s*([^\n,}]+)/g);
    const serviceTaskWithAPICount = Array.from(serviceTaskWithAPI).length;
    
    console.log(`ServiceTasks med API-anrop: ${serviceTaskWithAPICount} / ${serviceTaskCount}`);
    if (serviceTaskCount > 0 && serviceTaskWithAPICount < serviceTaskCount) {
      console.log(`⚠️  ${serviceTaskCount - serviceTaskWithAPICount} ServiceTasks saknar API-anrop\n`);
    }

    // Kontrollera om BusinessRuleTasks har dmnDecision
    const businessRuleTaskWithDMN = content.matchAll(/bpmnNodeType:\s*'BusinessRuleTask'[\s\S]*?dmnDecision:\s*([^\n,}]+)/g);
    const businessRuleTaskWithDMNCount = Array.from(businessRuleTaskWithDMN).length;
    
    console.log(`BusinessRuleTasks med DMN-beslut: ${businessRuleTaskWithDMNCount} / ${businessRuleTaskCount}`);
    if (businessRuleTaskCount > 0 && businessRuleTaskWithDMNCount < businessRuleTaskCount) {
      console.log(`⚠️  ${businessRuleTaskCount - businessRuleTaskWithDMNCount} BusinessRuleTasks saknar DMN-beslut\n`);
    }

    // Kontrollera subprocessSteps
    const subprocessGiven = content.matchAll(/given:\s*['"]([^'"]+)['"]/g);
    const subprocessWhen = content.matchAll(/when:\s*['"]([^'"]+)['"]/g);
    const subprocessThen = content.matchAll(/then:\s*['"]([^'"]+)['"]/g);
    
    const givenCount = Array.from(subprocessGiven).length;
    const whenCount = Array.from(subprocessWhen).length;
    const thenCount = Array.from(subprocessThen).length;

    console.log(`SubprocessSteps Given: ${givenCount}`);
    console.log(`SubprocessSteps When: ${whenCount}`);
    console.log(`SubprocessSteps Then: ${thenCount}\n`);

    console.log('✅ Analys klar!');
    console.log('\n💡 För detaljerad analys med BPMN-filer, använd kvalitetsvalideringssidan:');
    console.log('   http://localhost:8080/e2e-quality-validation');

  } catch (error) {
    console.error('❌ Fel vid analys:', error);
    process.exit(1);
  }
}

main();

