import { supabase } from '@/integrations/supabase/client';
import { getFeatureGoalDocFileKey, getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import { storageFileExists, getFeatureGoalDocStoragePaths, getEpicDocStoragePaths } from '@/lib/artifactUrls';
import { parseUserStoriesFromHtml } from './htmlUserStoryParser';
import type { ParsedUserStory } from './htmlUserStoryParser';
import { loadBpmnMapFromStorage } from '@/lib/bpmn/bpmnMapStorage';
import { findParentBpmnFileForSubprocess } from '@/lib/bpmn/bpmnMapLoader';

export interface ExtractedUserStory {
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
  bpmnFile: string;
  bpmnElementId: string;
  docType: 'epic' | 'feature-goal';
  docSource: 'storage' | 'html-file';
  docPath?: string;
  extractedAt: Date;
  source: 'epic-doc' | 'feature-goal-doc';
}

/**
 * Extraherar user stories från befintlig dokumentation.
 * 
 * Försöker först läsa från Supabase Storage, sedan från HTML-filer som fallback.
 * 
 * @param bpmnFile - BPMN-filnamn (t.ex. 'mortgage-se-application.bpmn')
 * @param elementId - Element-ID (t.ex. 'application' eller 'internal-data-gathering')
 * @param docType - Typ av dokumentation ('epic' eller 'feature-goal')
 * @returns Array av extraherade user stories
 */
export async function extractUserStoriesFromDocumentation(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal' = 'feature-goal'
): Promise<ExtractedUserStory[]> {
  // 1. Försök läsa från Supabase Storage
  const storageDoc = await loadDocFromStorage(bpmnFile, elementId, docType);
  if (storageDoc) {
    const parsedStories = parseUserStoriesFromHtml(storageDoc);
    return parsedStories.map(us => ({
      ...us,
      bpmnFile,
      bpmnElementId: elementId,
      docType,
      docSource: 'storage' as const,
      extractedAt: new Date(),
      source: docType === 'epic' ? 'epic-doc' as const : 'feature-goal-doc' as const,
    }));
  }
  
  // 2. Fallback: Läs från HTML-filer (om implementerat)
  // För nu, returnera tom array om storage inte fungerar
  return [];
}

/**
 * Läser dokumentation från Supabase Storage.
 */
async function loadDocFromStorage(
  bpmnFile: string,
  elementId: string,
  docType: 'epic' | 'feature-goal'
): Promise<string | null> {
  try {
    // För feature-goal, hitta parentBpmnFile från bpmn-map
    let parentBpmnFile: string | undefined = undefined;
    if (docType === 'feature-goal') {
      try {
        const bpmnMapResult = await loadBpmnMapFromStorage();
        if (bpmnMapResult.valid && bpmnMapResult.map) {
          parentBpmnFile = findParentBpmnFileForSubprocess(
            bpmnFile,
            elementId,
            bpmnMapResult.map
          ) || undefined;
        }
      } catch (error) {
        console.warn(`[userStoryExtractor] Could not load bpmn-map to find parent for ${bpmnFile}::${elementId}:`, error);
      }
    }

    // Hämta alla möjliga paths för dokumentationen
    const storagePaths = docType === 'epic'
      ? getEpicDocStoragePaths(bpmnFile, elementId)
      : getFeatureGoalDocStoragePaths(bpmnFile, elementId, parentBpmnFile);
    
    // Försök ladda från första path som finns
    for (const docPath of storagePaths) {
      const exists = await storageFileExists(docPath);
      if (exists) {
        const { data, error } = await supabase.storage
          .from('bpmn-files')
          .download(docPath);
        
        if (error || !data) {
          continue; // Försök nästa path
        }
        
        return await data.text();
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`[userStoryExtractor] Failed to load doc from storage for ${bpmnFile}::${elementId}:`, error);
    return null;
  }
}

/**
 * Extraherar user stories från alla dokumentationer.
 * 
 * Detta är en hjälpfunktion som kan användas för att extrahera user stories
 * från alla dokumentationer i systemet. Den kräver att man har en lista över
 * BPMN-filer och element-ID:n att söka efter.
 * 
 * @param nodes - Array av objekt med bpmnFile och bpmnElementId
 * @returns Array av alla extraherade user stories
 */
export async function extractUserStoriesFromAllDocs(
  nodes?: Array<{ bpmnFile: string; bpmnElementId: string; docType?: 'epic' | 'feature-goal' }>
): Promise<ExtractedUserStory[]> {
  // Om inga noder angivna, returnera tom array
  // (Framtida förbättring: kan hämta alla noder från BPMN-grafen)
  if (!nodes || nodes.length === 0) {
    return [];
  }
  
  const allStories: ExtractedUserStory[] = [];
  
  // Extrahera user stories för varje nod
  for (const node of nodes) {
    const docType = node.docType || 'feature-goal';
    const stories = await extractUserStoriesFromDocumentation(
      node.bpmnFile,
      node.bpmnElementId,
      docType
    );
    allStories.push(...stories);
  }
  
  return allStories;
}








