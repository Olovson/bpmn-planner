/**
 * Generera bpmn-map.json från mortgage-template-main call activity handlers
 * 
 * ⚠️ VIKTIGT: Detta script genererar INTE en komplett bpmn-map.json!
 * 
 * Handlers täcker INTE alla call activities i BPMN-filer. Några call activities
 * saknar handlers (t.ex. documentation-assessment, sales-contract-credit-decision)
 * eller använder calledElement istället för direkt ID-matchning (t.ex. Activity_1gzlxx4).
 * 
 * Detta script:
 * 1. Läser call activity handlers från mortgage-template-main
 * 2. Extraherar mappningar (handler-namn → process-id)
 * 3. Hanterar specialfall (process-id → filnamn)
 * 4. Parsar BPMN-filer för att få call activity namn
 * 5. Genererar bpmn-map-from-template.json (INTE bpmn-map.json direkt!)
 * 
 * ⚠️ EFTER KÖRNING:
 * 1. Jämför bpmn-map-from-template.json med befintlig bpmn-map.json
 * 2. Kombinera handler-mappningar med BPMN-parsade call activities
 * 3. Lägg till call activities som saknas handlers (markera med needs_manual_review: true)
 * 4. Uppdatera bpmn-map.json manuellt eller med hybrid-approach
 * 
 * Se docs/analysis/BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md för detaljerad analys.
 * 
 * Användning:
 *   npx tsx scripts/generate-bpmn-map-from-template.ts [template-path]
 * 
 * Om template-path inte anges, används:
 *   ../mortgage-template-main
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity } from '../src/lib/bpmn/bpmnMapLoader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HandlerMapping {
  handlerName: string;
  processId: string;
  parentBpmnFile: string;
}

interface ProcessIdToFileName {
  [processId: string]: string;
}

/**
 * Specialfall: Process-ID → Filnamn mappningar
 * Några handlers returnerar process-IDs som inte matchar filnamn direkt
 */
const PROCESS_ID_TO_FILENAME: ProcessIdToFileName = {
  'mortgage-se-document-signing': 'mortgage-se-signing.bpmn',
  'mortgage-se-document-disbursement': 'mortgage-se-disbursement.bpmn',
};

/**
 * Extrahera process ID från handler-fil
 */
function extractProcessIdFromHandler(handlerContent: string): string | null {
  // Matcha: process.env.MORTGAGE_SE_XXX_PROCESS_ID || 'mortgage-se-xxx'
  const match = handlerContent.match(/process\.env\.MORTGAGE_SE_\w+_PROCESS_ID\s*\|\|\s*'([^']+)'/);
  return match ? match[1] : null;
}

/**
 * Konvertera process-ID till BPMN-filnamn
 */
function processIdToFileName(processId: string): string {
  // Kolla specialfall först
  if (PROCESS_ID_TO_FILENAME[processId]) {
    return PROCESS_ID_TO_FILENAME[processId];
  }
  // Standard: lägg till .bpmn
  return `${processId}.bpmn`;
}

/**
 * Hitta alla BPMN-filer i mortgage-template-main
 */
function findBpmnFiles(templatePath: string): Map<string, string> {
  const bpmnFiles = new Map<string, string>();
  
  // Root BPMN-fil
  const rootBpmn = join(templatePath, 'modules/mortgage-se/process-config/mortgage/diagrams/mortgage.bpmn');
  if (existsSync(rootBpmn)) {
    bpmnFiles.set('mortgage', 'mortgage.bpmn');
  }
  
  // Subprocess BPMN-filer
  const processesDir = join(templatePath, 'modules/mortgage-se/processes');
  if (existsSync(processesDir)) {
    const processDirs = readdirSync(processesDir).filter(name => {
      const fullPath = join(processesDir, name);
      return statSync(fullPath).isDirectory();
    });
    
    for (const processDir of processDirs) {
      const diagramsDir = join(processesDir, processDir, 'diagrams');
      if (existsSync(diagramsDir)) {
        const files = readdirSync(diagramsDir).filter(f => f.endsWith('.bpmn'));
        for (const file of files) {
          const processId = file.replace('.bpmn', '');
          bpmnFiles.set(processId, file);
        }
      }
    }
  }
  
  return bpmnFiles;
}

/**
 * Extrahera root level call activity handlers (mortgage.bpmn)
 */
function extractRootHandlers(templatePath: string): HandlerMapping[] {
  const handlersDir = join(templatePath, 'modules/mortgage-se/process-config/mortgage/handlers/call-activities');
  const mappings: HandlerMapping[] = [];
  
  if (!existsSync(handlersDir)) {
    console.warn(`⚠️  Handlers directory not found: ${handlersDir}`);
    return mappings;
  }
  
  const handlerFiles = readdirSync(handlersDir).filter(f => f.endsWith('.ts'));
  
  for (const handlerFile of handlerFiles) {
    const handlerPath = join(handlersDir, handlerFile);
    const handlerName = handlerFile.replace('.ts', '');
    const content = readFileSync(handlerPath, 'utf-8');
    const processId = extractProcessIdFromHandler(content);
    
    if (processId) {
      mappings.push({
        handlerName,
        processId,
        parentBpmnFile: 'mortgage.bpmn',
      });
    } else {
      console.warn(`⚠️  Could not extract process ID from: ${handlerFile}`);
    }
  }
  
  return mappings;
}

/**
 * Extrahera subprocess call activity handlers
 */
function extractSubprocessHandlers(templatePath: string): HandlerMapping[] {
  const processesDir = join(templatePath, 'modules/mortgage-se/processes');
  const mappings: HandlerMapping[] = [];
  
  if (!existsSync(processesDir)) {
    console.warn(`⚠️  Processes directory not found: ${processesDir}`);
    return mappings;
  }
  
  const processDirs = readdirSync(processesDir).filter(name => {
    const fullPath = join(processesDir, name);
    return statSync(fullPath).isDirectory();
  });
  
  for (const processDir of processDirs) {
    const callActivitiesDir = join(processesDir, processDir, 'handlers/call-activities');
    
    if (!existsSync(callActivitiesDir)) {
      continue;
    }
    
    const handlerFiles = readdirSync(callActivitiesDir).filter(f => f.endsWith('.ts'));
    const parentBpmnFile = `mortgage-se-${processDir}.bpmn`;
    
    for (const handlerFile of handlerFiles) {
      const handlerPath = join(callActivitiesDir, handlerFile);
      const handlerName = handlerFile.replace('.ts', '');
      const content = readFileSync(handlerPath, 'utf-8');
      const processId = extractProcessIdFromHandler(content);
      
      if (processId) {
        mappings.push({
          handlerName,
          processId,
          parentBpmnFile,
        });
      } else {
        console.warn(`⚠️  Could not extract process ID from: ${processDir}/${handlerFile}`);
      }
    }
  }
  
  return mappings;
}

/**
 * Hämta call activity namn från BPMN XML (enkel regex-baserad parsing)
 */
function getCallActivityNameFromXml(
  bpmnContent: string,
  callActivityId: string
): string | null {
  try {
    // Matcha: <bpmn:callActivity id="callActivityId" name="Name">
    const regex = new RegExp(
      `<bpmn:callActivity[^>]*id="${callActivityId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*name="([^"]*)"`,
      'i'
    );
    const match = bpmnContent.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Hämta calledElement från BPMN XML (enkel regex-baserad parsing)
 */
function getCallActivityCalledElementFromXml(
  bpmnContent: string,
  callActivityId: string
): string | null {
  try {
    // Matcha: <bpmn:callActivity id="callActivityId" ... calledElement="value">
    const regex = new RegExp(
      `<bpmn:callActivity[^>]*id="${callActivityId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*calledElement="([^"]*)"`,
      'i'
    );
    const match = bpmnContent.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Huvudfunktion för att generera bpmn-map.json
 */
function generateBpmnMapFromTemplate(templatePath: string): BpmnMap {
  console.log(`📂 Läser från: ${templatePath}\n`);
  
  // Hitta alla BPMN-filer
  const bpmnFiles = findBpmnFiles(templatePath);
  console.log(`✅ Hittade ${bpmnFiles.size} BPMN-filer\n`);
  
  // Extrahera handlers
  const rootHandlers = extractRootHandlers(templatePath);
  const subprocessHandlers = extractSubprocessHandlers(templatePath);
  const allHandlers = [...rootHandlers, ...subprocessHandlers];
  
  console.log(`✅ Extraherade ${rootHandlers.length} root level handlers`);
  console.log(`✅ Extraherade ${subprocessHandlers.length} subprocess handlers\n`);
  
  // Gruppera handlers per parent BPMN-fil
  const handlersByFile = new Map<string, HandlerMapping[]>();
  for (const handler of allHandlers) {
    const existing = handlersByFile.get(handler.parentBpmnFile) || [];
    existing.push(handler);
    handlersByFile.set(handler.parentBpmnFile, existing);
  }
  
  // Bygg process-entries
  const processes: BpmnMapProcess[] = [];
  
  for (const [processId, bpmnFileName] of bpmnFiles.entries()) {
    const handlers = handlersByFile.get(bpmnFileName) || [];
    const callActivities: BpmnMapCallActivity[] = [];
    
    // Hitta BPMN-fil för att hämta call activity namn
    let bpmnFilePath: string | null = null;
    if (bpmnFileName === 'mortgage.bpmn') {
      bpmnFilePath = join(templatePath, 'modules/mortgage-se/process-config/mortgage/diagrams/mortgage.bpmn');
    } else {
      // Hitta process-mappen baserat på processId
      const processName = processId.replace('mortgage-se-', '');
      const possiblePaths = [
        join(templatePath, 'modules/mortgage-se/processes', processName, 'diagrams', bpmnFileName),
      ];
      
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          bpmnFilePath = path;
          break;
        }
      }
    }
    
    // Bygg call activities från handlers
    for (const handler of handlers) {
      const subprocessFileName = processIdToFileName(handler.processId);
      
      // Verifiera att subprocess-filen finns
      const subprocessExists = Array.from(bpmnFiles.values()).includes(subprocessFileName);
      if (!subprocessExists) {
        console.warn(`⚠️  Subprocess file not found: ${subprocessFileName} (referenced by ${handler.handlerName} in ${bpmnFileName})`);
      }
      
      // Hämta call activity namn och calledElement från BPMN-fil
      let callActivityName: string | null = null;
      let calledElement: string | null = null;
      
      if (bpmnFilePath) {
        try {
          const bpmnContent = readFileSync(bpmnFilePath, 'utf-8');
          callActivityName = getCallActivityNameFromXml(bpmnContent, handler.handlerName);
          calledElement = getCallActivityCalledElementFromXml(bpmnContent, handler.handlerName);
        } catch (error) {
          console.warn(`⚠️  Could not read BPMN file: ${bpmnFilePath}`, error);
        }
      }
      
      callActivities.push({
        bpmn_id: handler.handlerName,
        name: callActivityName || handler.handlerName,
        called_element: calledElement || undefined,
        subprocess_bpmn_file: subprocessExists ? subprocessFileName : undefined,
      });
    }
    
    // Hämta process metadata från BPMN-fil (enkel regex-baserad parsing)
    let processName: string | null = null;
    let processIdFromBpmn: string | null = null;
    
    if (bpmnFilePath) {
      try {
        const content = readFileSync(bpmnFilePath, 'utf-8');
        // Matcha: <bpmn:process id="processId" name="Process Name">
        const processMatch = content.match(/<bpmn:process[^>]*id="([^"]+)"[^>]*name="([^"]*)"[^>]*>/i);
        if (processMatch) {
          processIdFromBpmn = processMatch[1];
          processName = processMatch[2] || null;
        }
      } catch (error) {
        console.warn(`⚠️  Could not read BPMN file for metadata: ${bpmnFilePath}`, error);
      }
    }
    
    processes.push({
      id: processIdFromBpmn || processId,
      bpmn_file: bpmnFileName,
      process_id: processIdFromBpmn || processId,
      call_activities: callActivities,
    });
  }
  
  // Sortera processes för konsistens
  processes.sort((a, b) => a.bpmn_file.localeCompare(b.bpmn_file));
  
  const map: BpmnMap = {
    generated_at: new Date().toISOString(),
    note: `Auto-generated from mortgage-template-main call activity handlers. Generated from: ${templatePath}`,
    orchestration: {
      root_process: 'mortgage',
    },
    processes,
  };
  
  console.log('\n=== Generation Statistics ===');
  console.log(`Total processes: ${processes.length}`);
  console.log(`Total call activities: ${allHandlers.length}`);
  console.log(`Root level call activities: ${rootHandlers.length}`);
  console.log(`Subprocess call activities: ${subprocessHandlers.length}`);
  
  return map;
}

function main() {
  const templatePath = process.argv[2] || resolve(__dirname, '../mortgage-template-main');
  
  if (!existsSync(templatePath)) {
    console.error(`❌ Template path not found: ${templatePath}`);
    console.error('Usage: npx tsx scripts/generate-bpmn-map-from-template.ts [template-path]');
    process.exit(1);
  }
  
  try {
    const map = generateBpmnMapFromTemplate(templatePath);
    
    const outputPath = resolve(__dirname, '../bpmn-map-from-template.json');
    writeFileSync(outputPath, JSON.stringify(map, null, 2), 'utf-8');
    
    console.log(`\n✅ Generated bpmn-map-from-template.json: ${outputPath}`);
    console.log('\n⚠️  VIKTIGT: Detta är INTE en komplett bpmn-map.json!');
    console.log('   Handlers täcker INTE alla call activities i BPMN-filer.');
    console.log('\n📋 Nästa steg:');
    console.log('   1. Jämför med befintlig bpmn-map.json');
    console.log('   2. Lägg till call activities som saknas handlers');
    console.log('   3. Kombinera handler-mappningar med BPMN-parsade call activities');
    console.log('   4. ⚠️  VALIDERA: Kör testprocessen (A-Ö valideringsprocessen) för att säkerställa att bpmn-map.json fungerar:');
    console.log('      # 1. Hitta filer och analysera diff');
    console.log('      npm test -- tests/integration/local-folder-diff.test.ts');
    console.log('      # 2. Validera parsing, graph, tree och dokumentationsgenerering');
    console.log('      BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts');
    console.log('      # Se docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md för komplett guide');
    console.log('   5. Se docs/guides/BPMN_MAP_UPDATE_GUIDE.md för komplett guide');
    console.log('\n💡 TIP: Använd hybrid-approach (handlers + BPMN-parsing) för komplett coverage.');
  } catch (error) {
    console.error('❌ Error generating bpmn-map.json:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
