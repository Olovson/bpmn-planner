import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessTreeNode as LegacyProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import type { ProcessTreeNode as NewProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import { useVersionSelection } from './useVersionSelection';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite/ts-node hanterar JSON-import enligt bundler-konfigurationen.
import rawBpmnMap from '../../bpmn-map.json';

const sanitizeElementId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const buildArtifacts = (bpmnFile: string, elementId?: string) => {
  if (!elementId) return [];
  const baseName = bpmnFile.replace('.bpmn', '');
  const safeId = sanitizeElementId(elementId);
  const docPath = `nodes/${baseName}/${safeId}`;
  return [
    {
      kind: 'doc' as const,
      id: `${bpmnFile}:${elementId}:doc`,
      label: 'Dokumentation',
      href: `#/doc-viewer/${encodeURIComponent(docPath)}`,
    },
  ];
};

// Convert new ProcessTreeNode to legacy format for compatibility
function convertProcessTreeNode(node: NewProcessTreeNode): LegacyProcessTreeNode {
  return {
    id: node.id,
    label: node.label,
    type: node.type as LegacyProcessTreeNode['type'], // Type assertion needed due to 'dmnDecision' difference
    bpmnFile: node.bpmnFile,
    bpmnElementId: node.bpmnElementId,
    processId: node.processId,
    orderIndex: node.orderIndex,
    visualOrderIndex: node.visualOrderIndex,
    branchId: node.branchId,
    scenarioPath: node.scenarioPath,
    subprocessFile: node.subprocessFile,
    subprocessLink: node.subprocessLink,
    children: node.children.map(convertProcessTreeNode),
    artifacts: node.artifacts?.map(art => ({
      id: art.id,
      type: (art.kind === 'doc' ? 'doc' : art.kind === 'test' ? 'test' : art.kind === 'dor' ? 'dor' : art.kind === 'dod' ? 'dod' : 'doc') as NodeArtifact['type'],
      label: art.label || '',
      href: art.href,
    })),
    diagnostics: node.diagnostics,
  };
}

async function buildClientProcessTree(
  rootFile: string,
  getVersionHashForFile?: (fileName: string) => Promise<string | null>
): Promise<LegacyProcessTreeNode | null> {
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
        console.warn(`[useProcessTree] Failed to get version hash for ${fileName}:`, error);
        versionHashes.set(fileName, null);
      }
    }
  }

  // Parse all BPMN files (parseBpmnFile now handles loading from Supabase Storage)
  const parseResults = new Map();
  const parseErrors: Array<{ file: string; error: string }> = [];
  
  for (const fileName of existingFiles) {
    try {
      const versionHash = versionHashes.get(fileName) || null;
      const parsed = await parseBpmnFile(fileName, versionHash);
      parseResults.set(fileName, parsed);
      if (import.meta.env.DEV) {
        console.log(`[useProcessTree] ✓ Parsed ${fileName}${versionHash ? ` (version: ${versionHash.substring(0, 8)}...)` : ''}`);
      }
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`[useProcessTree] Error parsing ${fileName}:`, parseError);
      parseErrors.push({ file: fileName, error: errorMsg });
      // Continue with other files - don't fail entire tree build if one file fails
    }
  }

  if (parseResults.size === 0) {
    console.warn('[useProcessTree] No files were successfully parsed', {
      totalFiles: existingFiles.length,
      errors: parseErrors,
    });
    return null;
  }
  
  if (parseErrors.length > 0 && import.meta.env.DEV) {
    console.warn(`[useProcessTree] ${parseErrors.length} of ${existingFiles.length} files failed to parse:`, parseErrors);
  }

  if (import.meta.env.DEV) {
    console.log(`[useProcessTree] Successfully parsed ${parseResults.size} of ${existingFiles.length} files`);
  }

  // Load bpmn-map
  const bpmnMap = loadBpmnMap(rawBpmnMap);

  // Build ProcessGraph using the new implementation
  const graph = buildProcessGraph(parseResults, {
    bpmnMap,
    preferredRootProcessId: effectiveRootFile.replace('.bpmn', ''),
  });

  // Debug logging disabled for cleaner output

  // Build ProcessTree from graph
  const newTree = buildProcessTreeFromGraph(graph, {
    rootProcessId: effectiveRootFile.replace('.bpmn', ''),
    preferredRootFile: effectiveRootFile,
    artifactBuilder: buildArtifacts,
  });

  // Convert to legacy format for compatibility with existing UI components
  const tree = convertProcessTreeNode(newTree);

  // Debug logging disabled for cleaner output

  return tree;
}

export const useProcessTree = (rootFile: string = 'mortgage.bpmn') => {
  const { getVersionHashForFile } = useVersionSelection();
  
  return useQuery<LegacyProcessTreeNode | null>({
    queryKey: ['process-tree', rootFile, 'version-aware'],
    queryFn: async () => {
      const fallbackTree = await buildClientProcessTree(rootFile, getVersionHashForFile);
      if (fallbackTree) return fallbackTree;
      throw new Error('Ingen BPMN-fil finns i registret.');
    },
    staleTime: 1000 * 30, // Cache for 30 seconds (reduced from 5 minutes to allow faster updates)
    retry: 2,
  });
};

type ArtifactBuilder = typeof buildArtifacts;

// OBS: meta-baserad hierarki (collectProcessDefinitionsFromMeta + buildProcessModelFromDefinitions)
// finns kvar i koden för andra användningsfall, men Process Explorer bygger nu
// alltid sitt träd direkt från BpmnProcessGraph via buildProcessTreeFromGraph.
