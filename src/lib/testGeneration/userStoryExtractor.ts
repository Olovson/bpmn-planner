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
    // Get version hash (required)
    const { getCurrentVersionHash } = await import('@/lib/bpmnVersioning');
    const versionHash = await getCurrentVersionHash(bpmnFile);
    
    if (!versionHash) {
      console.warn(`[userStoryExtractor] No version hash found for ${bpmnFile}, cannot load documentation`);
      return null;
    }
    
    // Get storage path using unified approach
    let docPath: string;
    if (docType === 'epic') {
      docPath = await getEpicDocStoragePaths(bpmnFile, elementId, versionHash);
    } else {
      // VIKTIGT: För feature-goal, använd Process Feature Goal (non-hierarchical) istället för CallActivity Feature Goal (hierarchical)
      // Process Feature Goals använder subprocess-filens baseName som elementId och ingen parent
      const subprocessBaseName = bpmnFile.replace('.bpmn', '');
      const { getFeatureGoalDocFileKey } = await import('@/lib/nodeArtifactPaths');
      const { buildDocStoragePaths } = await import('@/lib/artifactPaths');
      
      // Non-hierarchical naming för Process Feature Goal (ingen parent)
      const processFeatureGoalKey = getFeatureGoalDocFileKey(
        bpmnFile,
        subprocessBaseName, // För Process Feature Goals är elementId = baseName
        undefined, // no version suffix
        undefined, // no parent (non-hierarchical)
        false, // isRootProcess = false (detta är en subprocess)
      );
      
      const { modePath } = buildDocStoragePaths(
        processFeatureGoalKey,
        'slow', // mode
        'cloud', // provider (claude är cloud provider)
        bpmnFile, // bpmnFileForVersion: use subprocess file for versioned paths
        versionHash,
      );
      
      docPath = modePath;
    }
    
    if (!docPath) {
      return null;
    }
    
    // Try to load from the path
    const exists = await storageFileExists(docPath);
    if (!exists) {
      return null;
    }
    
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(docPath);
    
    if (error || !data) {
      return null;
    }
    
    return await data.text();
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








