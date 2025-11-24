import { matchCallActivityToProcesses, type SubprocessMatcherConfig } from '@/lib/bpmn/SubprocessMatcher';
import type {
  DiagnosticsEntry,
  HierarchyNode,
  ProcessDefinition,
  SubprocessLink,
} from '@/lib/bpmn/types';

export type NormalizedProcessDefinition = ProcessDefinition & { internalId: string };

export interface ProcessHierarchyResult {
  /** Top level process nodes (may be multiple roots). */
  roots: HierarchyNode[];
  /** Map of normalized processIds to their definitions. */
  processes: Map<string, NormalizedProcessDefinition>;
  /** All subprocess links indexed by callActivity composite key. */
  links: Map<string, SubprocessLink>;
  /** Aggregated diagnostics emitted while building the hierarchy. */
  diagnostics: DiagnosticsEntry[];
}

export interface BuildProcessHierarchyOptions {
  matcherConfig?: SubprocessMatcherConfig;
  /**
   * Optional hint telling the builder which process IDs should be treated as preferred roots
   * (e.g. all processes belonging to the user-selected root BPMN file).
   */
  preferredRootProcessIds?: Set<string>;
}

const timestamp = () => new Date().toISOString();

const normalizeTaskHierarchyType = (taskType?: string): HierarchyNode['bpmnType'] => {
  switch (taskType) {
    case 'UserTask':
      return 'userTask';
    case 'ServiceTask':
      return 'serviceTask';
    case 'BusinessRuleTask':
      return 'businessRuleTask';
    default:
      return 'task';
  }
};

export function buildProcessHierarchy(
  rawDefinitions: ProcessDefinition[],
  options: BuildProcessHierarchyOptions = {},
): ProcessHierarchyResult {
  const { matcherConfig, preferredRootProcessIds } = options;

  const diagnostics: DiagnosticsEntry[] = [];
  const processes = new Map<string, NormalizedProcessDefinition>();
  const processIdCounts = new Map<string, number>();

  rawDefinitions.forEach((definition, index) => {
    const baseId = definition.id?.trim() || `${definition.fileName}#process-${index + 1}`;
    const nextCount = (processIdCounts.get(baseId) ?? 0) + 1;
    processIdCounts.set(baseId, nextCount);
    const internalId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
    processes.set(internalId, {
      ...definition,
      id: definition.id || internalId,
      internalId,
    });
  });

  const allCandidates = Array.from(processes.values()).map((proc) => ({
    internalId: proc.internalId,
    processId: proc.id,
    name: proc.name,
    fileName: proc.fileName,
    callActivities: proc.callActivities,
    tasks: proc.tasks,
    parseDiagnostics: proc.parseDiagnostics,
  }));

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const links = new Map<string, SubprocessLink>();

  const recordDiagnostic = (entry: DiagnosticsEntry) => {
    diagnostics.push(entry);
    return entry;
  };

  for (const proc of processes.values()) {
    if (!indegree.has(proc.internalId)) {
      indegree.set(proc.internalId, 0);
    }

    proc.callActivities.forEach((callActivity) => {
      const linkKey = `${proc.internalId}:${callActivity.id}`;
      const matcherCandidates = allCandidates
        .filter((candidate) => candidate.internalId !== proc.internalId)
        .map((candidate) => ({
          id: candidate.processId,
          name: candidate.name,
          fileName: candidate.fileName,
          callActivities: candidate.callActivities,
          tasks: candidate.tasks,
        }));

      const link = matchCallActivityToProcesses(
        {
          id: callActivity.id,
          name: callActivity.name,
          calledElement: callActivity.calledElement,
        },
        matcherCandidates,
        matcherConfig,
      );

      const mappedLink: SubprocessLink = {
        ...link,
        callActivityId: callActivity.id,
        callActivityName: callActivity.name,
        calledElement: callActivity.calledElement,
        matchedProcessId: link.matchedProcessId
          ? normalizeMatchedProcessId(link.matchedProcessId, processes)
          : undefined,
        matchedFileName: link.matchedProcessId
          ? processes.get(normalizeMatchedProcessId(link.matchedProcessId, processes))?.fileName
          : undefined,
      };

      if (mappedLink.matchStatus !== 'matched' || !mappedLink.matchedProcessId) {
        mappedLink.diagnostics = [
          ...(mappedLink.diagnostics ?? []),
          recordDiagnostic({
            severity: mappedLink.matchStatus === 'unresolved' ? 'error' : 'warning',
            code:
              mappedLink.matchStatus === 'ambiguous'
                ? 'AMBIGUOUS_MATCH'
                : mappedLink.matchStatus === 'lowConfidence'
                ? 'LOW_CONFIDENCE_MATCH'
                : 'NO_MATCH',
            message: diagnosticMessageForStatus(mappedLink.matchStatus, callActivity.name ?? callActivity.id),
            context: {
              processId: proc.id,
              callActivityId: callActivity.id,
            },
            timestamp: timestamp(),
          }),
        ];
      } else {
        if (!adjacency.has(proc.internalId)) {
          adjacency.set(proc.internalId, new Set());
        }
        adjacency.get(proc.internalId)!.add(mappedLink.matchedProcessId);
        indegree.set(mappedLink.matchedProcessId, (indegree.get(mappedLink.matchedProcessId) ?? 0) + 1);
      }

      links.set(linkKey, mappedLink);
    });
  }

  const preferredRoots = preferredRootProcessIds
    ? Array.from(preferredRootProcessIds).map((id) => normalizeMatchedProcessId(id, processes))
    : [];

  let roots = Array.from(processes.values())
    .filter((proc) => (indegree.get(proc.internalId) ?? 0) === 0)
    .sort((a, b) => {
      const aPreferred = preferredRoots.includes(a.internalId) ? -1 : 0;
      const bPreferred = preferredRoots.includes(b.internalId) ? -1 : 0;
      if (aPreferred !== bPreferred) return aPreferred - bPreferred;
      return a.name?.localeCompare(b.name ?? '') ?? 0;
    })
    .map((proc) =>
      buildProcessNode(proc.internalId, {
        processes,
        adjacency,
        links,
        diagnostics,
        ancestorStack: [],
      }),
    )
    .filter(Boolean) as HierarchyNode[];

  if (!roots.length) {
    const fallback = Array.from(processes.values())[0];
    if (fallback) {
      const fallbackNode = buildProcessNode(fallback.internalId, {
        processes,
        adjacency,
        links,
        diagnostics,
        ancestorStack: [],
      });
      if (fallbackNode) {
        diagnostics.push({
          severity: 'warning',
          code: 'NO_ROOT_DETECTED',
          message: 'Ingen rotprocess identifierades. Väljer första processen som fallback.',
          context: { processId: fallback.id },
          timestamp: timestamp(),
        });
        roots = [fallbackNode];
      }
    }
  }

  return {
    roots,
    processes,
    links,
    diagnostics,
  };
}

function normalizeMatchedProcessId(
  candidateProcessId: string,
  processes: Map<string, NormalizedProcessDefinition>,
): string {
  if (processes.has(candidateProcessId)) {
    return candidateProcessId;
  }
  for (const proc of processes.values()) {
    if (proc.id === candidateProcessId) {
      return proc.internalId;
    }
  }
  return candidateProcessId;
}

interface BuildContext {
  processes: Map<string, NormalizedProcessDefinition>;
  adjacency: Map<string, Set<string>>;
  links: Map<string, SubprocessLink>;
  diagnostics: DiagnosticsEntry[];
  ancestorStack: string[];
}

function buildProcessNode(
  processInternalId: string,
  context: BuildContext,
): HierarchyNode | null {
  const proc = context.processes.get(processInternalId);
  if (!proc) return null;

  const deriveProcessDisplayName = (): string => {
    const humanize = (val?: string | null): string => {
      if (!val) return '';
      let base = val.replace(/\.bpmn$/i, '').replace(/^\/?public\//, '');
      base = base.replace(/^mortgage-se-/, '').replace(/^mortgage-/, '');
      base = base.replace(/-/g, ' ').trim();
      if (!base) base = val;
      return base.replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const fromName = humanize(proc.name);
    if (fromName) return fromName;

    const fromId = humanize(proc.id);
    if (fromId) return fromId;

    const fromFile = humanize(proc.fileName);
    return fromFile || 'Process';
  };

  const node: HierarchyNode = {
    nodeId: processInternalId,
    bpmnType: 'process',
    displayName: deriveProcessDisplayName(),
    processId: proc.id,
    children: [],
    diagnostics: proc.parseDiagnostics ?? [],
  };

  const childAncestors = [...context.ancestorStack, processInternalId];

  for (const callActivity of proc.callActivities) {
    const linkKey = `${processInternalId}:${callActivity.id}`;
    const link = context.links.get(linkKey);
    if (!link) continue;

    const callNode: HierarchyNode = {
      nodeId: linkKey,
      bpmnType: 'callActivity',
      displayName: callActivity.name || callActivity.id,
      parentId: node.nodeId,
      children: [],
      link,
      diagnostics: link.diagnostics ?? [],
    };

    if (link.matchStatus === 'matched' && link.matchedProcessId) {
      if (childAncestors.includes(link.matchedProcessId)) {
        const cycleDiagnostic: DiagnosticsEntry = {
          severity: 'error',
          code: 'CYCLE_DETECTED',
          message: `Cykel upptäcktes mellan ${proc.id} och ${link.matchedProcessId}`,
          context: {
            sourceProcessId: proc.id,
            targetProcessId: link.matchedProcessId,
            callActivityId: callActivity.id,
          },
          timestamp: timestamp(),
        };
        callNode.diagnostics = [...(callNode.diagnostics ?? []), cycleDiagnostic];
        context.diagnostics.push(cycleDiagnostic);
      } else {
        const childProcessNode = buildProcessNode(link.matchedProcessId, {
          ...context,
          ancestorStack: childAncestors,
        });
        if (childProcessNode) {
          callNode.children.push(childProcessNode);
        }
      }
    }

    node.children.push(callNode);
  }

  for (const task of proc.tasks) {
    node.children.push({
      nodeId: `${processInternalId}:${task.id}`,
      bpmnType: normalizeTaskHierarchyType(task.type),
      displayName: task.name || task.id,
      parentId: node.nodeId,
      children: [],
      diagnostics: [],
    });
  }

  return node;
}

function diagnosticMessageForStatus(
  status: SubprocessLink['matchStatus'],
  callActivityName: string,
): string {
  switch (status) {
    case 'ambiguous':
      return `Flera möjliga subprocesser hittades för ${callActivityName}.`;
    case 'lowConfidence':
      return `Endast låg-konfidensmatchning hittades för ${callActivityName}.`;
    case 'unresolved':
    default:
      return `Ingen subprocess kunde matchas för ${callActivityName}.`;
  }
}
