import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import { BpmnViewer } from '@/components/BpmnViewer';
import { RightPanel } from '@/components/RightPanel';
import { Button } from '@/components/ui/button';
import { LogOut, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBpmnMappings } from '@/hooks/useBpmnMappings';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProcessExplorer from '@/pages/ProcessExplorer';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';

const Index = () => {
  const { filename } = useParams();
  const location = useLocation();
  const { data: rootFile, isLoading: loadingRootFile } = useRootBpmnFile();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<string | null>(null);
  // Use root file from hierarchy analysis, fallback to 'mortgage.bpmn'
  const [currentBpmnFile, setCurrentBpmnFile] = useState<string>(rootFile || 'mortgage.bpmn');
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'tree' | 'listvy'>('diagram');
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mappings, reload } = useBpmnMappings(currentBpmnFile);

  // Determine active view based on current route
  const currentView = location.pathname.includes('/node-matrix') ? 'listvy' : viewMode;

  const handleViewChange = (value: string) => {
    if (value === 'listvy') {
      navigate('/node-matrix');
    } else {
      setViewMode(value as 'diagram' | 'tree');
    }
  };
  useEffect(() => {
    if (rootFile) {
      console.log('[Index] Setting currentBpmnFile to root:', rootFile);
      setCurrentBpmnFile(rootFile);
    }
  }, [rootFile]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { bpmnFile?: string } | undefined;
      if (detail?.bpmnFile === currentBpmnFile) {
        reload();
      }
    };

    window.addEventListener('bpmn-db-mapping-updated', handler as EventListener);
    return () => {
      window.removeEventListener('bpmn-db-mapping-updated', handler as EventListener);
    };
  }, [currentBpmnFile, reload]);
  const handleElementSelect = (elementId: string | null, elementType?: string | null) => {
    setSelectedElement(elementId);
    setSelectedElementType(elementType || null);
  };

  const handleTreeNodeSelect = (bpmnFile: string, elementId?: string) => {
    setCurrentBpmnFile(bpmnFile.replace('/bpmn/', ''));
    setSelectedElement(elementId || null);
    if (elementId) {
      // Switch to diagram view when selecting a specific element
      setViewMode('diagram');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Utloggad',
      description: 'Du har loggats ut',
    });
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">BPMN Viewer</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize and analyze business process models
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {user.email}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setVersionDialogOpen(true)}
              >
                <History className="h-4 w-4 mr-2" />
                Versioner
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tabs value={currentView} onValueChange={handleViewChange}>
              <TabsList>
                <TabsTrigger value="diagram">BPMN-diagram</TabsTrigger>
                <TabsTrigger value="tree">Strukturträd</TabsTrigger>
                <TabsTrigger value="listvy">Listvy</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dor-dod')}
            >
              DoR/DoD
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/test-report')}
            >
              Tests
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/files')}
            >
              Filer
            </Button>
          </div>
        </div>
        
        {viewMode === 'diagram' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1">
              <BpmnViewer 
                onElementSelect={handleElementSelect}
                onFileChange={setCurrentBpmnFile}
                bpmnMappings={mappings}
                initialFileName={currentBpmnFile}
              />
            </div>
            <RightPanel 
              selectedElement={selectedElement} 
              selectedElementType={selectedElementType}
              bpmnFile={currentBpmnFile}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ProcessExplorer 
              onNodeSelect={handleTreeNodeSelect}
              selectedBpmnFile={currentBpmnFile}
              selectedElementId={selectedElement || undefined}
            />
          </div>
        )}
      </main>

      <VersionHistoryDialog 
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
      />
    </div>
  );
};

export default Index;
