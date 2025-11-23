import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { ProcessTreeD3 } from '@/components/ProcessTreeD3';
import { ProcessTreeNode, NodeArtifact } from '@/lib/processTree';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';

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

  const isLoading = isLoadingRoot || isLoadingTree;

  const handleNodeSelect = (node: ProcessTreeNode) => {
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
    <div className="h-full p-4">
      <ProcessTreeD3
        root={tree}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleNodeSelect}
        onArtifactClick={handleArtifactClick}
      />
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
