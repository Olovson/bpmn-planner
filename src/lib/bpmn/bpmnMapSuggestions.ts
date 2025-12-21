/**
 * BPMN Map Suggestions
 * 
 * Analyserar nya BPMN-filer och föreslår uppdateringar till bpmn-map.json
 * baserat på automatiska matchningar via SubprocessMatcher.
 */

import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity } from './bpmnMapLoader';
import type { ProcessDefinition } from './processDefinition';
import { matchCallActivityToProcesses } from './SubprocessMatcher';
import { collectProcessDefinitionsFromMeta } from './processDefinition';

export interface MapSuggestion {
  bpmn_file: string;
  bpmn_id: string;
  name: string;
  called_element?: string | null;
  suggested_subprocess_bpmn_file: string;
  confidence: number;
  matchStatus: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  reason: string;
  existing_mapping?: BpmnMapCallActivity;
}

export interface MapSuggestionResult {
  suggestions: MapSuggestion[];
  newFiles: string[];
  missingInMap: Array<{
    bpmn_file: string;
    process_id: string;
    call_activities: Array<{
      bpmn_id: string;
      name: string;
      called_element?: string | null;
    }>;
  }>;
}

/**
 * Analysera BPMN-filer och föreslå uppdateringar till bpmn-map.json
 */
export async function suggestBpmnMapUpdates(
  bpmnMap: BpmnMap,
  allFiles: Array<{ file_name: string; meta: any }>
): Promise<MapSuggestionResult> {
  const suggestions: MapSuggestion[] = [];
  const newFiles: string[] = [];
  const missingInMap: MapSuggestionResult['missingInMap'] = [];

  // Hämta alla process definitions från filerna
  const processDefs: ProcessDefinition[] = [];
  const fileMetaMap = new Map<string, any>();
  
  for (const file of allFiles) {
    fileMetaMap.set(file.file_name, file.meta);
    const defs = collectProcessDefinitionsFromMeta(
      file.file_name,
      file.meta,
      file.file_name
    );
    processDefs.push(...defs);
  }
  
  // VIKTIGT: Om det finns för få filer i databasen, kan matching-algoritmen ge felaktiga resultat
  // eftersom den bara kan matcha mot de filer som finns. Hoppa över matchningar med mycket låg konfidens
  // när det finns för få filer (mindre än 5 filer = risk för felaktiga matchningar)
  const hasEnoughFilesForReliableMatching = allFiles.length >= 5;

  // Identifiera nya filer (finns inte i bpmn-map.json)
  const mapFiles = new Set(bpmnMap.processes.map(p => p.bpmn_file));
  for (const file of allFiles) {
    if (!mapFiles.has(file.file_name)) {
      newFiles.push(file.file_name);
    }
  }

  // För varje fil i bpmn-map.json, kolla om det finns nya call activities
  for (const mapProcess of bpmnMap.processes) {
    const fileMeta = fileMetaMap.get(mapProcess.bpmn_file);
    if (!fileMeta) continue;

    const processesMeta = Array.isArray(fileMeta.processes) ? fileMeta.processes : [];
    const metaProcess = processesMeta.find((p: any) => p.id === mapProcess.process_id) || processesMeta[0] || null;
    
    if (!metaProcess) continue;

    const metaCallActivities = metaProcess.callActivities || fileMeta.callActivities || [];
    const mapCallActivities = mapProcess.call_activities || [];
    const mapCallActivityIds = new Set(mapCallActivities.map((ca: BpmnMapCallActivity) => ca.bpmn_id));

    // Hitta call activities som saknas i map
    for (const ca of metaCallActivities) {
      if (!mapCallActivityIds.has(ca.id)) {
        // Försök matcha automatiskt
        const matchResult = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: ca.calledElement,
          },
          processDefs
        );

        // Hoppa över matchningar med mycket låg konfidens när det finns för få filer
        // (risk för felaktiga matchningar när algoritmen bara kan välja mellan få alternativ)
        if (matchResult.matchedFileName && matchResult.matchStatus !== 'unresolved') {
          const isVeryLowConfidence = matchResult.confidence < 0.1; // Mindre än 10% konfidens
          const shouldSkip = !hasEnoughFilesForReliableMatching && isVeryLowConfidence;
          
          if (!shouldSkip) {
            suggestions.push({
              bpmn_file: mapProcess.bpmn_file,
              bpmn_id: ca.id,
              name: ca.name || ca.id,
              called_element: ca.calledElement,
              suggested_subprocess_bpmn_file: matchResult.matchedFileName,
              confidence: matchResult.confidence,
              matchStatus: matchResult.matchStatus,
              reason: matchResult.candidates[0]?.reason || 'Automatisk matchning',
            });
          }
        }
      }
    }

    // Kolla om befintliga mappningar saknar subprocess_bpmn_file
    for (const mapCA of mapCallActivities) {
      if (!mapCA.subprocess_bpmn_file) {
        // Hitta call activity i meta
        const metaCA = metaCallActivities.find((ca: any) => ca.id === mapCA.bpmn_id);
        if (metaCA) {
          // Försök matcha automatiskt
          const matchResult = matchCallActivityToProcesses(
            {
              id: metaCA.id,
              name: metaCA.name,
              calledElement: metaCA.calledElement,
            },
            processDefs
          );

          // Hoppa över matchningar med mycket låg konfidens när det finns för få filer
          if (matchResult.matchedFileName && matchResult.matchStatus !== 'unresolved') {
            const isVeryLowConfidence = matchResult.confidence < 0.1; // Mindre än 10% konfidens
            const shouldSkip = !hasEnoughFilesForReliableMatching && isVeryLowConfidence;
            
            if (!shouldSkip) {
              suggestions.push({
                bpmn_file: mapProcess.bpmn_file,
                bpmn_id: mapCA.bpmn_id,
                name: mapCA.name || mapCA.bpmn_id,
                called_element: mapCA.called_element,
                suggested_subprocess_bpmn_file: matchResult.matchedFileName,
                confidence: matchResult.confidence,
                matchStatus: matchResult.matchStatus,
                reason: matchResult.candidates[0]?.reason || 'Automatisk matchning',
                existing_mapping: mapCA,
              });
            }
          }
        }
      }
    }
  }

  // För nya filer, hitta alla call activities och försök matcha automatiskt
  for (const fileName of newFiles) {
    const fileMeta = fileMetaMap.get(fileName);
    if (!fileMeta) continue;

    const processesMeta = Array.isArray(fileMeta.processes) ? fileMeta.processes : [];
    const processId = processesMeta[0]?.id || fileName.replace('.bpmn', '');
    
    const metaCallActivities = processesMeta[0]?.callActivities || fileMeta.callActivities || [];
    
    // Försök matcha call activities för nya filer också
    for (const ca of metaCallActivities) {
      const matchResult = matchCallActivityToProcesses(
        {
          id: ca.id,
          name: ca.name,
          calledElement: ca.calledElement,
        },
        processDefs
      );

      // Hoppa över matchningar med mycket låg konfidens när det finns för få filer
      if (matchResult.matchedFileName && matchResult.matchStatus !== 'unresolved') {
        const isVeryLowConfidence = matchResult.confidence < 0.1; // Mindre än 10% konfidens
        const shouldSkip = !hasEnoughFilesForReliableMatching && isVeryLowConfidence;
        
        if (!shouldSkip) {
          suggestions.push({
            bpmn_file: fileName,
            bpmn_id: ca.id,
            name: ca.name || ca.id,
            called_element: ca.calledElement,
            suggested_subprocess_bpmn_file: matchResult.matchedFileName,
            confidence: matchResult.confidence,
            matchStatus: matchResult.matchStatus,
            reason: matchResult.candidates[0]?.reason || 'Automatisk matchning',
          });
        }
      }
    }
    
    if (metaCallActivities.length > 0) {
      missingInMap.push({
        bpmn_file: fileName,
        process_id: processId,
        call_activities: metaCallActivities.map((ca: any) => ({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement,
        })),
      });
    }
  }

  return {
    suggestions,
    newFiles,
    missingInMap,
  };
}

/**
 * Generera uppdaterad bpmn-map.json baserat på föreslagna ändringar
 */
export function generateUpdatedBpmnMap(
  currentMap: BpmnMap,
  suggestions: MapSuggestion[],
  acceptedSuggestions: Set<string>, // Set of `${bpmn_file}::${bpmn_id}`
  newFiles?: Array<{ file_name: string; meta: any }> // Optional: för att lägga till nya filer
): BpmnMap {
  const updatedProcesses = currentMap.processes.map((proc) => {
    const updatedCallActivities = [...(proc.call_activities || [])];
    
    // Uppdatera befintliga call activities som saknar subprocess_bpmn_file
    for (let i = 0; i < updatedCallActivities.length; i++) {
      const ca = updatedCallActivities[i];
      const suggestionKey = `${proc.bpmn_file}::${ca.bpmn_id}`;
      
      if (acceptedSuggestions.has(suggestionKey)) {
        const suggestion = suggestions.find(
          s => s.bpmn_file === proc.bpmn_file && s.bpmn_id === ca.bpmn_id
        );
        
        if (suggestion && !ca.subprocess_bpmn_file) {
          updatedCallActivities[i] = {
            ...ca,
            subprocess_bpmn_file: suggestion.suggested_subprocess_bpmn_file,
            called_element: suggestion.called_element ?? ca.called_element,
            needs_manual_review: suggestion.matchStatus !== 'matched',
          };
        }
      }
    }
    
    // Lägg till nya call activities
    const existingCAIds = new Set(updatedCallActivities.map(ca => ca.bpmn_id));
    for (const suggestion of suggestions) {
      if (
        suggestion.bpmn_file === proc.bpmn_file &&
        !existingCAIds.has(suggestion.bpmn_id) &&
        acceptedSuggestions.has(`${suggestion.bpmn_file}::${suggestion.bpmn_id}`)
      ) {
        updatedCallActivities.push({
          bpmn_id: suggestion.bpmn_id,
          name: suggestion.name,
          called_element: suggestion.called_element ?? null,
          subprocess_bpmn_file: suggestion.suggested_subprocess_bpmn_file,
          needs_manual_review: suggestion.matchStatus !== 'matched',
        });
        existingCAIds.add(suggestion.bpmn_id);
      }
    }
    
    return {
      ...proc,
      call_activities: updatedCallActivities,
    };
  });
  
  // Lägg till nya filer som inte finns i map
  if (newFiles) {
    const existingFileNames = new Set(updatedProcesses.map(p => p.bpmn_file));
    
    for (const file of newFiles) {
      if (!existingFileNames.has(file.file_name)) {
        const processesMeta = Array.isArray(file.meta?.processes) ? file.meta.processes : [];
        const processId = processesMeta[0]?.id || file.file_name.replace('.bpmn', '');
        const processName = processesMeta[0]?.name || processId;
        
        // Hitta matchningar för denna fil
        const fileSuggestions = suggestions.filter(s => s.bpmn_file === file.file_name);
        const acceptedFileSuggestions = fileSuggestions.filter(s => 
          acceptedSuggestions.has(`${s.bpmn_file}::${s.bpmn_id}`)
        );
        
        const callActivities = acceptedFileSuggestions.map(s => ({
          bpmn_id: s.bpmn_id,
          name: s.name,
          called_element: s.called_element ?? null,
          subprocess_bpmn_file: s.suggested_subprocess_bpmn_file,
          needs_manual_review: s.matchStatus !== 'matched',
        }));
        
        updatedProcesses.push({
          id: processId,
          bpmn_file: file.file_name,
          process_id: processId,
          alias: processName,
          description: processName,
          call_activities: callActivities,
        });
      }
    }
  }
  
  return {
    ...currentMap,
    processes: updatedProcesses,
    generated_at: new Date().toISOString(),
  };
}

