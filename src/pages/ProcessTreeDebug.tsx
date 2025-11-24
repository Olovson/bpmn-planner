import { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';

export function ProcessTreeDebugPage() {
  const [root, setRoot] = useState<ProcessTreeNode | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const parseResults = await loadAllBpmnParseResults();
        const bpmnMap = await loadBpmnMap();
        const graph: ProcessGraph = buildProcessGraph(parseResults as any, {
          bpmnMap,
          preferredRootProcessId: 'mortgage',
        });
        const tree = buildProcessTreeFromGraph(graph, {
          rootProcessId: 'mortgage',
          preferredRootFile: 'mortgage.bpmn',
          artifactBuilder: () => [],
        });
        setRoot(tree);
      } catch (err) {
        setError(err as Error);
      }
    };
    load();
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading ProcessTree: {error.message}
      </div>
    );
  }

  if (!root) {
    return <div className="p-4">Laddar ProcessTree…</div>;
  }

  return (
    <div className="p-4 space-y-2 text-xs">
      <h2 className="font-semibold text-sm mb-2">ProcessTree Debug</h2>
      <TreeNodeView node={root} depth={0} />
    </div>
  );
}

interface TreeNodeViewProps {
  node: ProcessTreeNode;
  depth: number;
}

function TreeNodeView({ node, depth }: TreeNodeViewProps) {
  const indentStyle = { paddingLeft: depth * 16 };

  const missingSubprocessDiag = node.diagnostics?.find(d => d.code === 'MISSING_SUBPROCESS');
  const missingFileName = missingSubprocessDiag?.context?.missingFileName as string | undefined;

  return (
    <div style={indentStyle} className={`mb-1`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px]">
          [{node.type}] {node.label}
        </span>
        {typeof node.orderIndex === 'number' && (
          <span className="text-[10px] text-muted-foreground">
            #{node.orderIndex}
          </span>
        )}
        {node.branchId && (
          <span className="text-[10px] text-muted-foreground">
            branch: {node.branchId}
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {node.bpmnFile}#{node.bpmnElementId}
        {node.scenarioPath && node.scenarioPath.length > 0 && (
          <> • scenario: {node.scenarioPath.join(' / ')}</>
        )}
      </div>
      {node.diagnostics && node.diagnostics.length > 0 && (
        <ul className="ml-4 list-disc">
          {node.diagnostics.map((d, i) => (
            <li key={i} className={`text-[10px] ${d.severity === 'error' ? 'text-red-600' : 'text-orange-600'}`}>
              {d.code}: {d.message}
              {d.context?.missingFileName && (
                <span className="text-[9px] text-muted-foreground ml-1">
                  (saknar fil: {d.context.missingFileName})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {node.children.map((child) => (
        <TreeNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default ProcessTreeDebugPage;

