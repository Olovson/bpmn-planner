/**
 * Automatisk generering av bpmn-map.json från BPMN-filer
 * 
 * Denna modul genererar bpmn-map.json automatiskt baserat på alla BPMN-filer
 * i Supabase, med automatisk matching av callActivities till subprocess-filer.
 */

import { supabase } from '@/integrations/supabase/client';
import { parseBpmnFile, BpmnParser } from '@/lib/bpmnParser';
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

  // VIKTIGT: I test-miljö, filtrera bort produktionsfiler (filer som INTE börjar med "test-")
  // Detta förhindrar att tester försöker mappa 100+ produktionsfiler
  // Test-filer identifieras av att de börjar med "test-"
  const isTestEnvironment = typeof window !== 'undefined' && 
    (window.location.href.includes('localhost') || 
     window.location.href.includes('127.0.0.1') ||
     import.meta.env.MODE === 'test' ||
     import.meta.env.DEV);
  
  // Om vi är i test-miljö OCH det finns test-filer, filtrera bort produktionsfiler
  // OCH filtrera bort gamla test-filer (äldre än 1 timme) för att undvika att mappa 100+ gamla test-filer
  let filteredFiles = filesData;
  if (isTestEnvironment && filesData) {
    const hasTestFiles = filesData.some(f => f.file_name.startsWith('test-'));
    if (hasTestFiles) {
      // I test-miljö med test-filer: använd BARA test-filer
      const testFiles = filesData.filter(f => f.file_name.startsWith('test-'));
      
      // Filtrera bort gamla test-filer (äldre än 10 minuter) för att undvika att mappa 100+ gamla test-filer
      // Detta säkerställer att bara nyligen skapade test-filer från pågående tester inkluderas
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);
      const recentTestFiles = testFiles.filter(f => {
        // Extrahera timestamp från test-filnamn: test-{timestamp}-{random}-{name}.bpmn
        const match = f.file_name.match(/^test-(\d+)-\d+-/);
        if (match) {
          const fileTimestamp = parseInt(match[1], 10);
          return fileTimestamp >= tenMinutesAgo; // Bara filer från senaste 10 minuterna
        }
        // Om vi inte kan extrahera timestamp, inkludera filen (säkerhetsåtgärd)
        return true;
      });
      
      filteredFiles = recentTestFiles;
      console.log(`[bpmnMapAutoGenerator] Test environment detected: filtering to ${filteredFiles.length} recent test files (excluding ${filesData.length - filteredFiles.length} production + old test files)`);
    }
  }

  if (filesError) {
    throw new Error(`Failed to load BPMN files: ${filesError.message}`);
  }

  if (!filteredFiles || filteredFiles.length === 0) {
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

  console.log(`[bpmnMapAutoGenerator] Found ${filteredFiles.length} BPMN files (${filesData?.length || 0} total in database)`);

  // Parse alla BPMN-filer
  // VIKTIGT: parseBpmnFile har redan fallback till Storage, så test-filer borde fungera
  // Men för att säkerställa att test-filer parsas korrekt, använd Storage direkt för test-filer
  const parseResults = await Promise.all(
    filteredFiles.map(async (file) => {
      try {
        // För test-filer, använd Storage direkt (de finns inte i /bpmn/ mappen)
        // parseBpmnFile har fallback till Storage, men det kan vara långsamt eller misslyckas
        // För produktionsfiler, använd /bpmn/ endpoint (med fallback till Storage)
        let parseResult;
        if (file.file_name.startsWith('test-')) {
          // Test-filer: ladda direkt från Storage och parse
          try {
            const { data: storageRecord } = await supabase
              .from('bpmn_files')
              .select('storage_path')
              .eq('file_name', file.file_name)
              .maybeSingle();
            
            const storagePath = storageRecord?.storage_path || file.file_name;
            const { data, error } = await supabase.storage
              .from('bpmn-files')
              .download(storagePath);
            
            if (error || !data) {
              console.warn(`[bpmnMapAutoGenerator] Failed to load test file ${file.file_name} from Storage:`, error);
              return null;
            }
            
            const xml = await data.text();
            // Parse XML direkt med BpmnParser
            const { BpmnParser } = await import('@/lib/bpmnParser');
            const parser = new BpmnParser();
            const parsed = await parser.parse(xml);
            parser.destroy();
            
            parseResult = {
              ...parsed,
              fileName: file.file_name,
            };
          } catch (storageError) {
            console.warn(`[bpmnMapAutoGenerator] Failed to parse test file ${file.file_name} from Storage:`, storageError);
            return null;
          }
        } else {
          // Produktionsfiler: använd /bpmn/ endpoint (med fallback till Storage)
          parseResult = await parseBpmnFile(`/bpmn/${file.file_name}`);
        }
        
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
          match_status: matchStatus,
          source: 'heuristic',
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
        // Hitta motsvarande ProcessDefinition för denna process så vi får rätt callActivities
        const processId =
          proc.processId || proc.id || fileName.replace('.bpmn', '');
        const processDef = processDefs.find(
          (p) => p.fileName === fileName && p.id === processId,
        );
        const callActivitiesForProcess = processDef?.callActivities ?? [];

        for (const ca of callActivitiesForProcess) {
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
            called_element: ca.calledElement || null,
            subprocess_bpmn_file: subprocessBpmnFile,
            needs_manual_review: needsManualReview,
            match_status: matchStatus,
            source: 'heuristic',
          });
        }

        processes.push({
          id: processId,
          alias: proc.name || processId,
          bpmn_file: fileName,
          process_id: processId,
          description: proc.name || processId,
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
