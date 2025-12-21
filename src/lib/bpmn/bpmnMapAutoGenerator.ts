/**
 * Automatisk generering av bpmn-map.json från BPMN-filer
 * 
 * Denna modul genererar bpmn-map.json automatiskt baserat på alla BPMN-filer
 * i Supabase, med automatisk matching av callActivities till subprocess-filer.
 */

import { supabase } from '@/integrations/supabase/client';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { matchCallActivityToProcesses } from './SubprocessMatcher';
import { buildProcessDefinitionsFromRegistry } from './processDefinition';
import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity } from './bpmnMapLoader';

/**
 * Generera bpmn-map.json automatiskt från alla BPMN-filer i Supabase
 */
export async function generateBpmnMapFromFiles(): Promise<BpmnMap> {
  console.log('[bpmnMapAutoGenerator] Loading all BPMN files from Supabase...');
  
  // Hämta alla BPMN-filer från databasen
  const { data: filesData, error: filesError } = await supabase
    .from('bpmn_files')
    .select('file_name, meta')
    .eq('file_type', 'bpmn')
    .order('file_name');

  if (filesError) {
    throw new Error(`Failed to load BPMN files: ${filesError.message}`);
  }

  if (!filesData || filesData.length === 0) {
    // Detta är ok - om databasen är tom, returnera en tom map istället för att kasta fel
    console.log('[bpmnMapAutoGenerator] No BPMN files found in database - returning empty map');
    return {
      generated_at: new Date().toISOString(),
      note: 'Auto-generated empty map - no BPMN files found in database yet. Map will be populated when files are uploaded.',
      orchestration: {
        root_process: null,
      },
      processes: [],
    };
  }

  console.log(`[bpmnMapAutoGenerator] Found ${filesData.length} BPMN files`);

  // Parse alla BPMN-filer
  const parseResults = await Promise.all(
    filesData.map(async (file) => {
      try {
        const parseResult = await parseBpmnFile(`/bpmn/${file.file_name}`);
        return {
          fileName: file.file_name,
          parseResult,
        };
      } catch (error) {
        console.warn(`[bpmnMapAutoGenerator] Failed to parse ${file.file_name}:`, error);
        return null;
      }
    })
  );

  const validParseResults = parseResults.filter((r): r is NonNullable<typeof r> => r !== null);
  console.log(`[bpmnMapAutoGenerator] Successfully parsed ${validParseResults.length} files`);

  // Build process definitions for matching
  const processDefs = buildProcessDefinitionsFromRegistry(
    validParseResults.map(r => ({
      fileName: r.fileName,
      meta: r.parseResult.meta || {},
    }))
  );

  console.log(`[bpmnMapAutoGenerator] Built ${processDefs.length} process definitions`);

  // Generera map för varje process
  const processes: BpmnMapProcess[] = [];
  let totalCallActivities = 0;
  let matchedCallActivities = 0;
  let lowConfidenceMatches = 0;
  let ambiguousMatches = 0;
  let unresolvedMatches = 0;

  for (const { fileName, parseResult } of validParseResults) {
    const meta = parseResult.meta || {};
    const processesInFile = meta.processes || [];
    
    if (processesInFile.length === 0) {
      // Fallback: använd meta direkt om inga processes finns
      const callActivities: BpmnMapCallActivity[] = [];
      const callActivitiesFromParse = parseResult.callActivities || [];

      for (const ca of callActivitiesFromParse) {
        totalCallActivities++;
        
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        const { needsManualReview, subprocessBpmnFile, matchStatus } = processMatchResult(match);
        if (matchStatus === 'matched') matchedCallActivities++;
        else if (matchStatus === 'lowConfidence') lowConfidenceMatches++;
        else if (matchStatus === 'ambiguous') ambiguousMatches++;
        else unresolvedMatches++;

        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: subprocessBpmnFile,
          needs_manual_review: needsManualReview,
        });
      }

      const processId = meta.processId || fileName.replace('.bpmn', '');
      processes.push({
        id: processId,
        alias: meta.name || processId,
        bpmn_file: fileName,
        process_id: processId,
        description: meta.name || processId,
        call_activities: callActivities,
      });
    } else {
      // Processera varje process i filen
      for (const proc of processesInFile) {
        const callActivities: BpmnMapCallActivity[] = [];
        const callActivitiesFromParse = parseResult.callActivities || [];

        for (const ca of callActivitiesFromParse) {
          totalCallActivities++;
          
          const match = matchCallActivityToProcesses(
            {
              id: ca.id,
              name: ca.name,
              calledElement: (ca as any).calledElement,
            },
            processDefs
          );

          const { needsManualReview, subprocessBpmnFile, matchStatus } = processMatchResult(match);
          if (matchStatus === 'matched') matchedCallActivities++;
          else if (matchStatus === 'lowConfidence') lowConfidenceMatches++;
          else if (matchStatus === 'ambiguous') ambiguousMatches++;
          else unresolvedMatches++;

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
  }

  // Hitta root process (vanligtvis mortgage.bpmn eller första filen)
  const rootProcess = processes.find(p => p.bpmn_file === 'mortgage.bpmn')?.id || processes[0]?.id || null;

  const map: BpmnMap = {
    generated_at: new Date().toISOString(),
    note: `Auto-generated from ${validParseResults.length} BPMN files using automatic matching. Review entries with needs_manual_review: true. Stats: ${matchedCallActivities} matched, ${lowConfidenceMatches} low confidence, ${ambiguousMatches} ambiguous, ${unresolvedMatches} unresolved`,
    orchestration: {
      root_process: rootProcess,
    },
    processes,
  };

  console.log('\n[bpmnMapAutoGenerator] === Generation Statistics ===');
  console.log(`Total call activities: ${totalCallActivities}`);
  console.log(`Matched (high confidence): ${matchedCallActivities}`);
  console.log(`Low confidence: ${lowConfidenceMatches}`);
  console.log(`Ambiguous: ${ambiguousMatches}`);
  console.log(`Unresolved: ${unresolvedMatches}`);
  console.log(`Needs manual review: ${lowConfidenceMatches + ambiguousMatches + unresolvedMatches}`);

  return map;
}

/**
 * Processera match-resultat och returnera metadata
 */
function processMatchResult(match: ReturnType<typeof matchCallActivityToProcesses>): {
  needsManualReview: boolean;
  subprocessBpmnFile: string | null;
  matchStatus: 'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved';
} {
  if (match.matchStatus === 'matched' && match.matchedFileName) {
    return {
      needsManualReview: false,
      subprocessBpmnFile: match.matchedFileName,
      matchStatus: 'matched',
    };
  } else if (match.matchStatus === 'lowConfidence' && match.matchedFileName) {
    return {
      needsManualReview: true,
      subprocessBpmnFile: match.matchedFileName,
      matchStatus: 'lowConfidence',
    };
  } else if (match.matchStatus === 'ambiguous' && match.matchedFileName) {
    return {
      needsManualReview: true,
      subprocessBpmnFile: match.matchedFileName,
      matchStatus: 'ambiguous',
    };
  } else {
    return {
      needsManualReview: true,
      subprocessBpmnFile: null,
      matchStatus: 'unresolved',
    };
  }
}
