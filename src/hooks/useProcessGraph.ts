import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import { useVersionSelection } from './useVersionSelection';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../bpmn-map.json';

async function buildClientProcessGraph(
  rootFile: string,
  getVersionHashForFile?: (fileName: string) => Promise<string | null>
): Promise<ProcessGraph | null> {
  const { data: bpmnFiles, error } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');

  if (error) throw error;
  if (!bpmnFiles?.length) return null;

  let effectiveRootFile = rootFile;
  const existingFiles = bpmnFiles.map((f) => f.file_name as string);

  if (!existingFiles.includes(effectiveRootFile)) {
    const fallback = existingFiles[0];
    if (!fallback) return null;
    console.warn(`Root file ${rootFile} not found. Falling back to ${fallback}.`);
    effectiveRootFile = fallback;
  }

  // Get version hashes for all files
  const versionHashes = new Map<string, string | null>();
  if (getVersionHashForFile) {
    for (const fileName of existingFiles) {
      try {
        const versionHash = await getVersionHashForFile(fileName);
        versionHashes.set(fileName, versionHash);
      } catch (error) {
        console.warn(`[useProcessGraph] Failed to get version hash for ${fileName}:`, error);
        versionHashes.set(fileName, null);
      }
    }
  }

  // Parse all BPMN files with version hashes
  const parseResults = new Map();
  for (const fileName of existingFiles) {
    try {
      const versionHash = versionHashes.get(fileName) || null;
      const parsed = await parseBpmnFile(fileName, versionHash);
      parseResults.set(fileName, parsed);
    } catch (parseError) {
      console.error(`[useProcessGraph] Error parsing ${fileName}:`, parseError);
      // Continue with other files
    }
  }

  if (parseResults.size === 0) {
    console.warn('[useProcessGraph] No files were successfully parsed');
    return null;
  }

  // Load bpmn-map (from storage or project file)
  const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
  const bpmnMap = await loadBpmnMapFromStorageSimple();

  // Build ProcessGraph
  const graph = buildProcessGraph(parseResults, {
    bpmnMap,
    preferredRootProcessId: effectiveRootFile.replace('.bpmn', ''),
  });

  return graph;
}

export const useProcessGraph = (rootFile: string = 'mortgage.bpmn') => {
  const { getVersionHashForFile } = useVersionSelection();
  
  return useQuery<ProcessGraph | null>({
    queryKey: ['process-graph', rootFile, 'version-aware'],
    queryFn: async () => {
      const graph = await buildClientProcessGraph(rootFile, getVersionHashForFile);
      if (graph) return graph;
      throw new Error('Ingen BPMN-fil finns i registret.');
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });
};

