import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import {
  buildBpmnProcessGraph,
  type BpmnProcessGraph,
  type BpmnNodeType,
} from '@/lib/bpmnProcessGraph';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';

const sanitizeElementId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const buildArtifacts = (bpmnFile: string, elementId?: string): NodeArtifact[] | undefined => {
  if (!elementId) return undefined;
  const baseName = bpmnFile.replace('.bpmn', '');
  const safeId = sanitizeElementId(elementId);
  const docPath = `nodes/${baseName}/${safeId}`;
  return [
    {
      id: `${bpmnFile}:${elementId}:doc`,
      type: 'doc' as const,
      label: 'Dokumentation',
      href: `#/doc-viewer/${encodeURIComponent(docPath)}`,
    },
  ];
};

async function buildClientProcessTree(rootFile: string): Promise<ProcessTreeNode | null> {
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

  const graph: BpmnProcessGraph = await buildBpmnProcessGraph(
    effectiveRootFile,
    existingFiles,
  );

  // Enkel debug-logik i dev-läge för att felsöka graf/treestruktur
  if (import.meta.env.MODE === 'development') {
    const allNodes = Array.from(graph.allNodes.values());
    const countByType: Record<string, number> = {};
    allNodes.forEach((node) => {
      countByType[node.type] = (countByType[node.type] || 0) + 1;
    });

    // eslint-disable-next-line no-console
    console.log('[ProcessExplorer] Graph stats', {
      rootFile: graph.rootFile,
      totalNodes: allNodes.length,
      byType: countByType,
    });
  }

  const tree = buildProcessTreeFromGraph(graph, effectiveRootFile, buildArtifacts);

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
  return useQuery<ProcessTreeNode | null>({
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
