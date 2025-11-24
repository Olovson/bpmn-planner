import { useEffect, useState } from 'react';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import type { ProcessGraph, ProcessGraphNode, ProcessGraphEdge } from '@/lib/bpmn/processGraph';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';

export function ProcessGraphDebugPage() {
  const [graph, setGraph] = useState<ProcessGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const parseResults = await loadAllBpmnParseResults();
        const bpmnMap = await loadBpmnMap();
        const g = buildProcessGraph(parseResults as any, {
          bpmnMap,
          preferredRootProcessId: 'mortgage',
        });
        setGraph(g);
      } catch (err) {
        setError(err as Error);
      }
    };
    load();
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading ProcessGraph: {error.message}
      </div>
    );
  }

  if (!graph) {
    return <div className="p-4">Laddar ProcessGraph…</div>;
  }

  const nodes: ProcessGraphNode[] = [...graph.nodes.values()];
  const edges: ProcessGraphEdge[] = [...graph.edges.values()];

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const outgoingEdges = selectedNode
    ? edges.filter((e) => e.from === selectedNode.id)
    : [];
  const incomingEdges = selectedNode
    ? edges.filter((e) => e.to === selectedNode.id)
    : [];

  return (
    <div className="flex h-full">
      <aside className="w-1/3 border-r overflow-auto p-4">
        <h2 className="font-bold mb-2">Nodes ({nodes.length})</h2>
        <ul className="space-y-1 text-sm">
          {nodes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="text-left w-full hover:underline"
                onClick={() => setSelectedNodeId(n.id)}
              >
                [{n.type}] {n.name ?? n.bpmnElementId} ({n.bpmnFile})
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 overflow-auto p-4 space-y-4 text-xs">
        <section>
          <h2 className="font-semibold mb-1">Graph Info</h2>
          <pre className="bg-muted p-2 rounded">
roots: {JSON.stringify(graph.roots, null, 2)}
cycles: {JSON.stringify(graph.cycles, null, 2)}
missingDependencies: {JSON.stringify(graph.missingDependencies, null, 2)}
          </pre>
        </section>

        {selectedNode && (
          <section>
            <h2 className="font-semibold mb-1">Selected Node</h2>
            <pre className="bg-muted p-2 rounded mb-2">
{JSON.stringify(selectedNode, null, 2)}
            </pre>

            <h3 className="font-semibold mb-1">Outgoing edges</h3>
            <pre className="bg-muted p-2 rounded mb-2">
{JSON.stringify(outgoingEdges, null, 2)}
            </pre>

            <h3 className="font-semibold mb-1">Incoming edges</h3>
            <pre className="bg-muted p-2 rounded">
{JSON.stringify(incomingEdges, null, 2)}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}

export default ProcessGraphDebugPage;

