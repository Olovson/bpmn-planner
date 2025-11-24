import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessTreeNode } from '@/lib/processTree';
import { collectProcessDefinitionsFromMeta } from '@/lib/bpmn/processDefinition';
import type { NormalizedProcessDefinition } from '@/lib/bpmn/buildProcessHierarchy';
import {
  resolveProcessFileName,
  resolveProcessFileNameByInternalId,
} from '@/lib/bpmn/hierarchyTraversal';
import { buildProcessModelFromDefinitions } from '@/lib/bpmn/buildProcessModel';
import { buildProcessTreeFromModel } from '@/lib/bpmn/processModelToProcessTree';
import type { HierarchyNode } from '@/lib/bpmn/types';
import type { BpmnMeta } from '@/types/bpmnMeta';

const sanitizeElementId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const buildArtifacts = (bpmnFile: string, elementId?: string) => {
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
    .select('file_name, storage_path, meta')
    .eq('file_type', 'bpmn');

  if (error) throw error;
  if (!bpmnFiles?.length) return null;

  const files = bpmnFiles.map((file) => ({
    fileName: file.file_name,
    definitions: collectProcessDefinitionsFromMeta(
      file.file_name,
      file.meta as BpmnMeta | null,
      file.storage_path ?? undefined,
    ),
  }));

  const allDefinitionsEmpty = files.every((file) => file.definitions.length === 0);
  if (allDefinitionsEmpty) return null;

  let effectiveRootFile = rootFile;
  if (!bpmnFiles.some((file) => file.file_name === effectiveRootFile)) {
    const fallback = bpmnFiles[0]?.file_name;
    if (!fallback) return null;
    console.warn(`Root file ${rootFile} not found. Falling back to ${fallback}.`);
    effectiveRootFile = fallback;
  }

  const model = buildProcessModelFromDefinitions(files, {
    preferredRootFile: effectiveRootFile,
  });

  const tree = buildProcessTreeFromModel(model, effectiveRootFile, buildArtifacts);
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

export function convertProcessHierarchyToTree(
  root: HierarchyNode,
  processes: Map<string, NormalizedProcessDefinition>,
  artifactBuilder: ArtifactBuilder,
): ProcessTreeNode | null {
  if (root.bpmnType !== 'process') return null;
  const fileName = resolveProcessFileName(root, processes) ?? `${root.displayName}.bpmn`;

  const children = root.children.flatMap((child) =>
    convertHierarchyChild(child, {
      currentFile: fileName,
      processes,
      artifactBuilder,
    }),
  );

  return {
    id: root.nodeId,
    label: root.displayName,
    type: 'process',
    bpmnFile: fileName,
    bpmnElementId: root.processId,
    children,
    diagnostics: root.diagnostics,
  };
}

interface ConversionContext {
  currentFile: string;
  processes: Map<string, NormalizedProcessDefinition>;
  artifactBuilder: ArtifactBuilder;
}

function convertHierarchyChild(
  node: HierarchyNode,
  context: ConversionContext,
): ProcessTreeNode[] {
  if (node.bpmnType === 'process') {
    const nextFile = resolveProcessFileName(node, context.processes) ?? context.currentFile;
    // Vi skippar att lägga in en separat process-nod i trädet här för att undvika
    // dubbelvisning (filnamn + callActivities). I stället går vi direkt vidare
    // till barn-noderna med uppdaterat currentFile.
    return node.children.flatMap((child) =>
      convertHierarchyChild(child, { ...context, currentFile: nextFile }),
    );
  }

  if (node.bpmnType === 'callActivity') {
    const matchedFile = node.link?.matchedProcessId
      ? resolveProcessFileNameByInternalId(node.link.matchedProcessId, context.processes)
      : undefined;
    const childFile = matchedFile ?? context.currentFile;

    const children = node.children.flatMap((child) =>
      convertHierarchyChild(child, { ...context, currentFile: childFile }),
    );

    const callTreeNode: ProcessTreeNode = {
      id: node.nodeId,
      label: node.displayName,
      type: 'callActivity',
      bpmnFile: context.currentFile,
      bpmnElementId: node.link?.callActivityId,
      children,
      subprocessFile: matchedFile,
      artifacts: context.artifactBuilder(context.currentFile, node.link?.callActivityId),
      subprocessLink: node.link,
      diagnostics: node.diagnostics,
    };
    return [callTreeNode];
  }

  if (
    node.bpmnType === 'userTask' ||
    node.bpmnType === 'serviceTask' ||
    node.bpmnType === 'businessRuleTask' ||
    node.bpmnType === 'task'
  ) {
    // För processträdet vill vi enbart visa subprocesser / callActivities
    // (plus root-processen). Vanliga task-noder visas därför inte här.
    return [];
  }

  return [];
}
