import { useState, useRef, useEffect } from 'react';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { ProcessTreeD3, ProcessTreeD3Api } from '@/components/ProcessTreeD3';
import { ProcessTreeNode, NodeArtifact, getProcessNodeStyle, ProcessNodeType } from '@/lib/processTree';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { NodeSummaryCard } from '@/components/NodeSummaryCard';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { getNodeTestReportUrl } from '@/lib/artifactUrls';

interface ProcessExplorerProps {
  onNodeSelect: (bpmnFile: string, elementId?: string) => void;
  selectedBpmnFile?: string;
  selectedElementId?: string;
}

export function ProcessExplorerView({
  onNodeSelect,
  selectedBpmnFile,
  selectedElementId,
}: ProcessExplorerProps) {
  const { data: rootFile, isLoading: isLoadingRoot } = useRootBpmnFile();
  const { data: tree, isLoading: isLoadingTree, error } = useProcessTree(rootFile || 'mortgage.bpmn');
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<ProcessTreeNode | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [nodeTypeFilter, setNodeTypeFilter] = useState<Set<ProcessNodeType>>(
    new Set(['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'])
  );
  const treeRef = useRef<ProcessTreeD3Api | null>(null);
  const [treeLayoutTrigger, setTreeLayoutTrigger] = useState(0);

  const isLoading = isLoadingRoot || isLoadingTree;

  const handleNodeSelect = (node: ProcessTreeNode) => {
    setSelectedNode(node);
    onNodeSelect(node.bpmnFile, node.bpmnElementId);
  };

  const handleArtifactClick = (artifact: NodeArtifact, node: ProcessTreeNode) => {
    if (artifact.href) {
      // Interna HashRouter-länkar (t.ex. doc-viewer) hanteras via React Router
      if (artifact.href.startsWith('#/')) {
        // Remove the # and navigate using React Router
        const path = artifact.href.substring(1);
        navigate(path);
      } else if (artifact.href.startsWith('http')) {
        // External HTTP links (GitHub test files) open in new tab
        window.open(artifact.href, '_blank');
      } else {
        // Relative paths like /docs/application.html open in new tab
        window.open(artifact.href, '_blank');
      }
    }
  };

  // Find selected node ID based on current BPMN selection
  let selectedNodeId: string | undefined;
  if (selectedBpmnFile && tree) {
    const findNode = (node: ProcessTreeNode): string | undefined => {
      if (selectedElementId) {
        // Try to find specific element node
        if (node.bpmnFile === selectedBpmnFile && node.bpmnElementId === selectedElementId) {
          return node.id;
        }
      } else {
        // Just select the file/process node
        if (node.bpmnFile === selectedBpmnFile && node.type === 'process') {
          return node.id;
        }
      }
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
      return undefined;
    };
    selectedNodeId = findNode(tree);
  }

  // Handle collapse/expand with zoom to fit
  const handleCollapseAll = () => {
    const allIds = new Set<string>();
    const traverse = (node: ProcessTreeNode, isRoot: boolean) => {
      if (!isRoot) {
        allIds.add(node.id);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child, false));
      }
    };
    if (tree) {
      traverse(tree, true);
      setCollapsedIds(allIds);
      setTreeLayoutTrigger(prev => prev + 1);
    }
  };

  const handleExpandAll = () => {
    setCollapsedIds(new Set());
    setTreeLayoutTrigger(prev => prev + 1);
  };

  // Trigger zoom to fit after layout updates
  useEffect(() => {
    if (treeLayoutTrigger > 0) {
      // Wait for D3 layout to complete before zooming
      const timeoutId = setTimeout(() => {
        treeRef.current?.zoomToFitCurrentTree?.();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [treeLayoutTrigger, collapsedIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Laddar processträd...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          Kunde inte ladda processträd: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!tree) {
    return (
      <Alert className="m-4">
        <AlertDescription>Inget processträd hittades</AlertDescription>
      </Alert>
    );
  }

  // Summarize diagnostics across the entire tree
  const summarizeDiagnostics = (root: ProcessTreeNode): Record<string, number> => {
    const counts: Record<string, number> = {};

    function visit(node: ProcessTreeNode) {
      // Check node diagnostics
      (node.diagnostics ?? []).forEach((d) => {
        const key = `${d.severity}:${d.code}`;
        counts[key] = (counts[key] ?? 0) + 1;
      });
      // Check subprocess link diagnostics
      (node.subprocessLink?.diagnostics ?? []).forEach((d) => {
        const key = `${d.severity}:${d.code}`;
        counts[key] = (counts[key] ?? 0) + 1;
      });
      node.children.forEach(visit);
    }

    visit(root);
    return counts;
  };

  const diagnosticsSummary = summarizeDiagnostics(tree);
  const hasDiagnostics = Object.keys(diagnosticsSummary).length > 0;

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      {/* Rad 1: legend och diagnostics summary */}
      <div className="flex flex-col gap-2">
        <ProcessTreeD3
          ref={null}
          root={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleNodeSelect}
          onArtifactClick={handleArtifactClick}
          showTree={false}
          collapsedIds={collapsedIds}
          onCollapsedIdsChange={setCollapsedIds}
          nodeTypeFilter={nodeTypeFilter}
          onNodeTypeFilterChange={setNodeTypeFilter}
        />
        {hasDiagnostics && (
          <div className="diagnostics-summary bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
              Diagnostics Summary
            </h3>
            <ul className="text-xs space-y-1">
              {Object.entries(diagnosticsSummary).map(([key, count]) => {
                const [severity, code] = key.split(':');
                const severityColor =
                  severity === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : severity === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400';
                return (
                  <li key={key} className="flex items-center gap-2">
                    <span className={severityColor}>
                      {severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{code}</span>
                    <span className="text-gray-500 dark:text-gray-400">({count})</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Rad 2: trädvyn */}
      <div className="flex-1 min-h-0">
        <ProcessTreeD3
          ref={treeRef}
          root={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleNodeSelect}
          onArtifactClick={handleArtifactClick}
          showLegend={false}
          collapsedIds={collapsedIds}
          onCollapsedIdsChange={(ids) => {
            setCollapsedIds(ids);
            setTreeLayoutTrigger(prev => prev + 1);
          }}
          nodeTypeFilter={nodeTypeFilter}
          onNodeTypeFilterChange={(filter) => {
            setNodeTypeFilter(filter);
            setTreeLayoutTrigger(prev => prev + 1);
          }}
        />
      </div>
    </div>
  );
}

export default function ProcessExplorerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'files') navigate('/files');
    else if (view === 'project') navigate('/project-plan');
    else navigate('/process-explorer');
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="tree"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />
      {/* main med min-w-0 så att D3-trädet kan krympa utan att skapa global horisontell scroll */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <ProcessExplorerView onNodeSelect={() => {}} />
      </main>
    </div>
  );
}
