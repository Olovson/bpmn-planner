import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../bpmn-map.json';

async function buildClientProcessGraph(rootFile: string): Promise<ProcessGraph | null> {
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

  // Parse all BPMN files
  const parseResults = new Map();
  for (const fileName of existingFiles) {
    try {
      const parsed = await parseBpmnFile(fileName);
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

  // Load bpmn-map
  const bpmnMap = loadBpmnMap(rawBpmnMap);

  // Build ProcessGraph
  const graph = buildProcessGraph(parseResults, {
    bpmnMap,
    preferredRootProcessId: effectiveRootFile.replace('.bpmn', ''),
  });

  return graph;
}

export const useProcessGraph = (rootFile: string = 'mortgage.bpmn') => {
  return useQuery<ProcessGraph | null>({
    queryKey: ['process-graph', rootFile],
    queryFn: async () => {
      const graph = await buildClientProcessGraph(rootFile);
      if (graph) return graph;
      throw new Error('Ingen BPMN-fil finns i registret.');
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });
};

