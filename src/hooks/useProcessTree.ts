import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessTreeNode as LegacyProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import type { ProcessTreeNode as NewProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
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

async function buildClientProcessTree(rootFile: string): Promise<LegacyProcessTreeNode | null> {
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

  // Parse all BPMN files (parseBpmnFile now handles loading from Supabase Storage)
  const parseResults = new Map();
  for (const fileName of existingFiles) {
    try {
      const parsed = await parseBpmnFile(fileName);
      parseResults.set(fileName, parsed);
      if (import.meta.env.DEV) {
        console.log(`[useProcessTree] ✓ Parsed ${fileName}`);
      }
    } catch (parseError) {
      console.error(`[useProcessTree] Error parsing ${fileName}:`, parseError);
      // Continue with other files
    }
  }

  if (parseResults.size === 0) {
    console.warn('[useProcessTree] No files were successfully parsed');
    return null;
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

  // Enkel debug-logik i dev-läge för att felsöka graf/treestruktur
  if (import.meta.env.MODE === 'development') {
    // eslint-disable-next-line no-console
    console.log('[ProcessExplorer] Graph stats', {
      roots: graph.roots,
      totalNodes: graph.nodes.size,
      totalEdges: graph.edges.size,
      missingDependencies: graph.missingDependencies.length,
      cycles: graph.cycles.length,
    });
  }

  // Build ProcessTree from graph
  const newTree = buildProcessTreeFromGraph(graph, {
    rootProcessId: effectiveRootFile.replace('.bpmn', ''),
    preferredRootFile: effectiveRootFile,
    artifactBuilder: buildArtifacts,
  });

  // Convert to legacy format for compatibility with existing UI components
  const tree = convertProcessTreeNode(newTree);

  if (import.meta.env.MODE === 'development') {
    // eslint-disable-next-line no-console
    console.log('[ProcessExplorer] ProcessTree root', {
      label: tree.label,
      type: tree.type,
      childCount: tree.children.length,
      children: tree.children.map((c) => ({ label: c.label, type: c.type })),
    });
  }

  return tree;
}

export const useProcessTree = (rootFile: string = 'mortgage.bpmn') => {
  return useQuery<LegacyProcessTreeNode | null>({
    queryKey: ['process-tree', rootFile],
    queryFn: async () => {
      const fallbackTree = await buildClientProcessTree(rootFile);
      if (fallbackTree) return fallbackTree;
      throw new Error('Ingen BPMN-fil finns i registret.');
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });
};

type ArtifactBuilder = typeof buildArtifacts;

// OBS: meta-baserad hierarki (collectProcessDefinitionsFromMeta + buildProcessModelFromDefinitions)
// finns kvar i koden för andra användningsfall, men Process Explorer bygger nu
// alltid sitt träd direkt från BpmnProcessGraph via buildProcessTreeFromGraph.
