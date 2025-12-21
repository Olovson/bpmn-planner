/**
 * Automatisk generering av bpmn-map.json baserat på BPMN-filer
 * 
 * Detta script:
 * 1. Läser alla BPMN-filer
 * 2. Parsar varje fil för att hitta callActivities
 * 3. Matchar callActivities automatiskt till subprocess-filer
 * 4. Genererar bpmn-map.json med needs_manual_review flaggor
 * 
 * Användning:
 *   npm run generate-bpmn-map-auto
 *   eller
 *   npx tsx scripts/generate-bpmn-map-auto.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseBpmnFile } from '../src/lib/bpmnParser';
import { matchCallActivityToProcesses } from '../src/lib/bpmn/SubprocessMatcher';
import { buildProcessDefinitionsFromRegistry } from '../src/lib/bpmn/processDefinition';
import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity } from '../src/lib/bpmn/bpmnMapLoader';

interface BpmnFileInfo {
  fileName: string;
  parseResult: Awaited<ReturnType<typeof parseBpmnFile>>;
}

async function loadAllBpmnFiles(): Promise<BpmnFileInfo[]> {
  // Lista alla BPMN-filer från fixtures (för test) eller från Supabase (för produktion)
  // För nu, använd fixtures
  const fixturesPath = resolve(__dirname, '../tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11');
  
  // Hårdkodad lista för nu - kan förbättras att läsa från filsystemet
  const bpmnFiles = [
    'mortgage.bpmn',
    'mortgage-se-application.bpmn',
    'mortgage-se-internal-data-gathering.bpmn',
    'mortgage-se-household.bpmn',
    'mortgage-se-stakeholder.bpmn',
    'mortgage-se-object.bpmn',
    'mortgage-se-credit-evaluation.bpmn',
    'mortgage-se-credit-decision.bpmn',
    'mortgage-se-offer.bpmn',
    'mortgage-se-document-generation.bpmn',
    'mortgage-se-signing.bpmn',
    'mortgage-se-disbursement.bpmn',
    'mortgage-se-collateral-registration.bpmn',
    'mortgage-se-mortgage-commitment.bpmn',
    'mortgage-se-kyc.bpmn',
    'mortgage-se-appeal.bpmn',
    'mortgage-se-manual-credit-evaluation.bpmn',
  ];

  const results: BpmnFileInfo[] = [];
  
  for (const fileName of bpmnFiles) {
    try {
      const parseResult = await parseBpmnFile(`/bpmn/${fileName}`);
      results.push({ fileName, parseResult });
    } catch (error) {
      console.warn(`[generate-bpmn-map-auto] Failed to parse ${fileName}:`, error);
    }
  }
  
  return results;
}

function findRootProcess(files: BpmnFileInfo[]): string | null {
  // Root process är vanligtvis mortgage.bpmn
  const mortgageFile = files.find(f => f.fileName === 'mortgage.bpmn');
  if (mortgageFile) {
    const processId = mortgageFile.parseResult.meta?.processes?.[0]?.processId;
    return processId || 'mortgage';
  }
  return null;
}

async function generateBpmnMapAuto(): Promise<BpmnMap> {
  console.log('[generate-bpmn-map-auto] Loading BPMN files...');
  const bpmnFiles = await loadAllBpmnFiles();
  console.log(`[generate-bpmn-map-auto] Loaded ${bpmnFiles.length} BPMN files`);

  // Build process definitions for matching
  const processDefs = buildProcessDefinitionsFromRegistry(
    bpmnFiles.map(f => ({
      file_name: f.fileName,
      meta: f.parseResult.meta || {},
    }))
  );

  console.log(`[generate-bpmn-map-auto] Built ${processDefs.length} process definitions`);

  const processes: BpmnMapProcess[] = [];
  let totalCallActivities = 0;
  let matchedCallActivities = 0;
  let lowConfidenceMatches = 0;
  let ambiguousMatches = 0;
  let unresolvedMatches = 0;

  for (const fileInfo of bpmnFiles) {
    const { fileName, parseResult } = fileInfo;
    const meta = parseResult.meta || {};
    const processesInFile = meta.processes || [];
    
    if (processesInFile.length === 0) {
      console.warn(`[generate-bpmn-map-auto] No processes found in ${fileName}`);
      continue;
    }

    for (const proc of processesInFile) {
      const callActivities: BpmnMapCallActivity[] = [];
      const callActivitiesFromParse = parseResult.callActivities || [];

      for (const ca of callActivitiesFromParse) {
        totalCallActivities++;
        
        // Match automatiskt
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        let needsManualReview = false;
        let subprocessBpmnFile: string | null = null;

        if (match.matchStatus === 'matched' && match.matchedFileName) {
          // Hög konfidens matchning
          subprocessBpmnFile = match.matchedFileName;
          matchedCallActivities++;
          needsManualReview = false;
        } else if (match.matchStatus === 'lowConfidence' && match.matchedFileName) {
          // Låg konfidens - behöver review
          subprocessBpmnFile = match.matchedFileName;
          lowConfidenceMatches++;
          needsManualReview = true;
        } else if (match.matchStatus === 'ambiguous' && match.matchedFileName) {
          // Ambiguous - behöver review
          subprocessBpmnFile = match.matchedFileName;
          ambiguousMatches++;
          needsManualReview = true;
        } else {
          // Unresolved - behöver manuell mappning
          unresolvedMatches++;
          needsManualReview = true;
        }

        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: subprocessBpmnFile,
          needs_manual_review: needsManualReview,
        });
      }

      processes.push({
        id: proc.processId || proc.id || fileName.replace('.bpmn', ''),
        alias: proc.name || proc.processId || fileName.replace('.bpmn', ''),
        bpmn_file: fileName,
        process_id: proc.processId || proc.id || fileName.replace('.bpmn', ''),
        description: proc.name || proc.processId || fileName.replace('.bpmn', ''),
        call_activities: callActivities,
      });
    }
  }

  const rootProcess = findRootProcess(bpmnFiles);

  const map: BpmnMap = {
    generated_at: new Date().toISOString(),
    note: `Auto-generated from BPMN files using automatic matching. Review entries with needs_manual_review: true. Stats: ${matchedCallActivities} matched, ${lowConfidenceMatches} low confidence, ${ambiguousMatches} ambiguous, ${unresolvedMatches} unresolved`,
    orchestration: {
      root_process: rootProcess,
    },
    processes,
  };

  console.log('\n=== Generation Statistics ===');
  console.log(`Total call activities: ${totalCallActivities}`);
  console.log(`Matched (high confidence): ${matchedCallActivities}`);
  console.log(`Low confidence: ${lowConfidenceMatches}`);
  console.log(`Ambiguous: ${ambiguousMatches}`);
  console.log(`Unresolved: ${unresolvedMatches}`);
  console.log(`Needs manual review: ${lowConfidenceMatches + ambiguousMatches + unresolvedMatches}`);

  return map;
}

async function main() {
  try {
    const map = await generateBpmnMapAuto();
    
    const outputPath = resolve(__dirname, '../bpmn-map-auto-generated.json');
    writeFileSync(outputPath, JSON.stringify(map, null, 2), 'utf-8');
    
    console.log(`\n[generate-bpmn-map-auto] ✓ Generated bpmn-map-auto-generated.json`);
    console.log(`[generate-bpmn-map-auto] Review the file and rename to bpmn-map.json if satisfied`);
  } catch (error) {
    console.error('[generate-bpmn-map-auto] Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateBpmnMapAuto };
