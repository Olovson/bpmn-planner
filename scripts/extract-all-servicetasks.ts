#!/usr/bin/env tsx
/**
 * Script för att systematiskt extrahera alla ServiceTasks från BPMN-filer
 * för ett specifikt E2E-scenario
 * 
 * Användning:
 *   tsx scripts/extract-all-servicetasks.ts E2E_BR001
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServiceTask {
  id: string;
  name: string;
  bpmnFile: string;
  processId: string;
  processName: string;
  parentCallActivity?: string; // Om denna ServiceTask finns i en subprocess
}

interface BpmnFileInfo {
  fileName: string;
  filePath: string;
  processId: string;
  processName: string;
  serviceTasks: ServiceTask[];
}

/**
 * Extraherar alla ServiceTasks från en BPMN-fil
 */
function extractServiceTasksFromBpmn(filePath: string): BpmnFileInfo {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Extrahera process ID och namn
  const processMatch = content.match(/<bpmn:process id="([^"]+)"[^>]*name="([^"]*)"/);
  const processId = processMatch ? processMatch[1] : '';
  const processName = processMatch ? processMatch[2] || processId : '';
  
  const serviceTasks: ServiceTask[] = [];
  
  // Extrahera ServiceTasks
  const serviceTaskRegex = /<bpmn:serviceTask id="([^"]+)"[^>]*name="([^"]*)"/g;
  let match;
  while ((match = serviceTaskRegex.exec(content)) !== null) {
    serviceTasks.push({
      id: match[1],
      name: match[2] || match[1],
      bpmnFile: fileName,
      processId,
      processName,
    });
  }
  
  return {
    fileName,
    filePath,
    processId,
    processName,
    serviceTasks,
  };
}

/**
 * Hittar alla BPMN-filer som används i E2E_BR001
 * Baserat på dokumentationen i E2E_BR001_MANUAL_ANALYSIS.md
 */
function getBpmnFilesForE2eBr001(): string[] {
  const bpmnDir = path.join(__dirname, '../tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11');
  
  // Lista alla BPMN-filer som används i E2E_BR001
  // Baserat på E2E_BR001_MANUAL_ANALYSIS.md
  const files = [
    'mortgage.bpmn', // Root process
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
    'mortgage-se-object.bpmn',
    'mortgage-se-household.bpmn',
    'mortgage-se-stakeholder.bpmn',
    'mortgage-se-mortgage-commitment.bpmn',
    'mortgage-se-object-information.bpmn',
    'mortgage-se-object-valuation.bpmn',
    'mortgage-se-credit-evaluation.bpmn',
    'mortgage-se-kyc.bpmn',
    'mortgage-se-credit-decision.bpmn',
    'mortgage-se-offer.bpmn',
    'mortgage-se-document-generation.bpmn',
    'mortgage-se-signing.bpmn',
    'mortgage-se-disbursement.bpmn',
  ];
  
  return files.map(f => path.join(bpmnDir, f)).filter(f => fs.existsSync(f));
}

/**
 * Huvudfunktion
 */
function main() {
  const scenarioId = process.argv[2] || 'E2E_BR001';
  
  console.log(`\n🔍 Extraherar alla ServiceTasks för ${scenarioId}\n`);
  console.log('='.repeat(80));
  
  const bpmnFiles = getBpmnFilesForE2eBr001();
  
  if (bpmnFiles.length === 0) {
    console.error('❌ Inga BPMN-filer hittades!');
    process.exit(1);
  }
  
  console.log(`\n📁 Hittade ${bpmnFiles.length} BPMN-filer\n`);
  
  const allServiceTasks: ServiceTask[] = [];
  const fileInfos: BpmnFileInfo[] = [];
  
  for (const filePath of bpmnFiles) {
    try {
      const info = extractServiceTasksFromBpmn(filePath);
      fileInfos.push(info);
      allServiceTasks.push(...info.serviceTasks);
      
      if (info.serviceTasks.length > 0) {
        console.log(`\n📄 ${info.fileName}`);
        console.log(`   Process: ${info.processName} (${info.processId})`);
        console.log(`   ServiceTasks: ${info.serviceTasks.length}`);
        info.serviceTasks.forEach(st => {
          console.log(`     - ${st.name} (${st.id})`);
        });
      }
    } catch (error) {
      console.error(`❌ Fel vid läsning av ${filePath}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 SAMMANFATTNING`);
  console.log(`\nTotalt antal ServiceTasks: ${allServiceTasks.length}`);
  console.log(`\nFördelning per fil:\n`);
  
  fileInfos.forEach(info => {
    if (info.serviceTasks.length > 0) {
      console.log(`  ${info.fileName}: ${info.serviceTasks.length} ServiceTasks`);
    }
  });
  
  // Skriv till fil för vidare analys
  const outputFile = path.join(__dirname, `../docs/E2E_BR001_SERVICETASKS.md`);
  const output = `# ServiceTasks i E2E_BR001

**Genererad:** ${new Date().toISOString()}
**Scenario:** ${scenarioId}

## Totalt antal ServiceTasks: ${allServiceTasks.length}

## ServiceTasks per BPMN-fil

${fileInfos.map(info => {
  if (info.serviceTasks.length === 0) return '';
  return `### ${info.fileName}
**Process:** ${info.processName} (${info.processId})

| ID | Name |
|----|------|
${info.serviceTasks.map(st => `| \`${st.id}\` | ${st.name} |`).join('\n')}
`;
}).filter(Boolean).join('\n')}

## Alla ServiceTasks (alfabetiskt)

${allServiceTasks
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(st => `- **${st.name}** (\`${st.id}\`) - ${st.bpmnFile}`)
  .join('\n')}
`;
  
  fs.writeFileSync(outputFile, output, 'utf-8');
  console.log(`\n✅ Resultat skrivet till: ${outputFile}`);
}

main();

