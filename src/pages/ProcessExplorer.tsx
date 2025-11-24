import { useState, useRef, useEffect } from 'react';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { ProcessTreeD3, ProcessTreeD3Api } from '@/components/ProcessTreeD3';
import { ProcessTreeNode, NodeArtifact, getProcessNodeStyle } from '@/lib/processTree';
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
  const { nodes: allNodes } = useAllBpmnNodes();
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

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      {/* Rad 1: legend som spänner över hela bredden */}
      <div>
        <ProcessTreeD3
          ref={null}
          root={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleNodeSelect}
          onArtifactClick={handleArtifactClick}
          showTree={false}
          collapsedIds={collapsedIds}
          onCollapsedIdsChange={setCollapsedIds}
        />
      </div>

      {/* Rad 2: trädvyn till vänster, infokort till höger */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-[0.8] min-w-0">
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
          />
        </div>
        <aside className="flex-[0.2] min-w-[16rem] max-w-xs">
          {(() => {
            if (!selectedNode) {
              return (
                <NodeSummaryCard
                  title={null}
                  elementId={null}
                  elementTypeLabel={null}
                  testStatus={null}
                  jiraType={null}
                  hasSubprocess={false}
                />
              );
            }

            const elementId =
              selectedNode.bpmnElementId && selectedNode.bpmnElementId !== ''
                ? selectedNode.bpmnElementId
                : selectedNode.id;

            const selectedBpmnNode =
              allNodes?.find(
                (n) =>
                  n.bpmnFile === selectedNode.bpmnFile &&
                  n.elementId === elementId,
              ) ?? null;

            const elementTypeLabel = getProcessNodeStyle(
              selectedNode.type,
            ).label;

            const jiraType = selectedBpmnNode?.jiraType ?? null;
            const hasSubprocess =
              Boolean(selectedNode.subprocessFile) ||
              Boolean(selectedBpmnNode?.subprocessMatchStatus === 'matched');

            const canOpenDocs = Boolean(selectedBpmnNode?.hasDocs);
            const canOpenTestScript = Boolean(selectedBpmnNode?.testFilePath);
            const canOpenTestReport = Boolean(selectedBpmnNode?.hasTestReport);

            return (
              <NodeSummaryCard
                title={
                  selectedBpmnNode?.jiraName ||
                  selectedBpmnNode?.elementName ||
                  selectedNode.label
                }
                elementId={elementId}
                elementTypeLabel={elementTypeLabel}
                testStatus={null}
                jiraType={jiraType}
                hasSubprocess={hasSubprocess}
                onOpenDocs={
                  canOpenDocs && selectedBpmnNode?.documentationUrl
                    ? () =>
                        navigate(
                          selectedBpmnNode.documentationUrl!.replace(/^#/, ''),
                        )
                    : undefined
                }
                canOpenDocs={canOpenDocs}
                onOpenTestScript={
                  canOpenTestScript && selectedBpmnNode?.testFilePath
                    ? () =>
                        navigate(
                          `/node-test-script?bpmnFile=${encodeURIComponent(
                            selectedBpmnNode.bpmnFile,
                          )}&elementId=${encodeURIComponent(
                            selectedBpmnNode.elementId,
                          )}`,
                        )
                    : undefined
                }
                canOpenTestScript={canOpenTestScript}
                onOpenTestReport={
                  canOpenTestReport
                    ? () =>
                        navigate(
                          getNodeTestReportUrl(
                            selectedBpmnNode!.bpmnFile,
                            selectedBpmnNode!.elementId,
                          ).replace('#', ''),
                        )
                    : undefined
                }
                canOpenTestReport={canOpenTestReport}
                onOpenNodeMatrix={() => navigate('/node-matrix')}
              />
            );
          })()}
        </aside>
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
