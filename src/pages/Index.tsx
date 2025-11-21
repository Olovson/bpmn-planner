import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Navigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { BpmnViewer } from '@/components/BpmnViewer';
import { RightPanel } from '@/components/RightPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBpmnMappings } from '@/hooks/useBpmnMappings';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { ProcessExplorerView } from '@/pages/ProcessExplorer';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useBpmnFiles } from '@/hooks/useBpmnFiles';
import { AppHeaderWithTabs, ViewKey } from '@/components/AppHeaderWithTabs';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';

const Index = () => {
  const { filename } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rootFile, isLoading: loadingRootFile } = useRootBpmnFile();
  const { data: bpmnFiles = [], isLoading: loadingFiles } = useBpmnFiles();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<string | null>(null);
  const [selectedElementName, setSelectedElementName] = useState<string | null>(null);
  // Use root file from hierarchy analysis, fallback to 'mortgage.bpmn'
  const [currentBpmnFile, setCurrentBpmnFile] = useState<string | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'tree' | 'listvy'>('diagram');
  const { user, loading, signOut } = useAuth();
  const baseNavigate = useNavigate();
  const { toast } = useToast();
  const { mappings, saveMapping, reload } = useBpmnMappings(currentBpmnFile);
  const { hasDorDod, hasTests } = useArtifactAvailability();

  const urlFile = searchParams.get('file');
  const urlElement = searchParams.get('el');

  // Determine active view based on current route
  const currentView: ViewKey = location.pathname.includes('/node-matrix')
    ? 'listvy'
    : location.pathname.includes('/process-explorer')
      ? 'tree'
      : 'diagram';

  const handleViewChange = (value: string) => {
    if (value === 'listvy') {
      baseNavigate('/node-matrix');
    } else if (value === 'tree') {
      baseNavigate('/process-explorer');
    } else if (value === 'tests') {
      baseNavigate('/test-report');
    } else if (value === 'files') {
      baseNavigate('/files');
    } else {
      setViewMode(value as 'diagram' | 'tree');
      if (value === 'diagram') baseNavigate('/');
    }
  };
  const baseRootRef = useRef<string | null>(null);
  const derivedRoot = useMemo(() => {
    if (rootFile) return rootFile;
    const mortgageExists = bpmnFiles.some((f) => f.file_name === 'mortgage.bpmn');
    if (mortgageExists) return 'mortgage.bpmn';
    if (bpmnFiles.length > 0) return bpmnFiles[0].file_name;
    return null;
  }, [rootFile, bpmnFiles]);

  useEffect(() => {
    if (derivedRoot && derivedRoot !== baseRootRef.current) {
      baseRootRef.current = derivedRoot;
      console.log('[Index] Setting currentBpmnFile to root:', derivedRoot);
      setCurrentBpmnFile(derivedRoot);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('file', derivedRoot);
        return next;
      }, { replace: true });
    }
  }, [derivedRoot, setSearchParams]);

  useEffect(() => {
    if (!loading && !user) {
      baseNavigate('/auth');
    }
  }, [user, loading, baseNavigate]);

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
  const handleElementSelect = (elementId: string | null, elementType?: string | null, elementName?: string | null) => {
    setSelectedElement(elementId);
    setSelectedElementType(elementType || null);
    setSelectedElementName(elementName || null);
    const next = new URLSearchParams(searchParams);
    if (elementId) next.set('el', elementId);
    else next.delete('el');
    setSearchParams(next, { replace: false });
  };

  const handleTreeNodeSelect = (bpmnFile: string, elementId?: string) => {
    const cleaned = bpmnFile.replace('/bpmn/', '');
    setCurrentBpmnFile(cleaned);
    const next = new URLSearchParams(searchParams);
    next.set('file', cleaned);
    if (elementId) next.set('el', elementId);
    else next.delete('el');
    setSearchParams(next, { replace: false });
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
    baseNavigate('/auth');
  };

  // Sync URL param to state if present
  useEffect(() => {
    if (urlFile && urlFile !== currentBpmnFile) {
      setCurrentBpmnFile(urlFile);
    }
    if (urlElement && urlElement !== selectedElement) {
      setSelectedElement(urlElement);
    }
  }, [urlFile, urlElement, currentBpmnFile, selectedElement]);

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

  const effectiveBpmnFile =
    urlFile ||
    currentBpmnFile ||
    derivedRoot ||
    (bpmnFiles[0]?.file_name ?? null);

  const isLoadingData = loadingRootFile || loadingFiles;
  const hasNoFiles = !isLoadingData && bpmnFiles.length === 0;
  const hasEffectiveFile = Boolean(effectiveBpmnFile);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppHeaderWithTabs
        userEmail={user.email}
        currentView={currentView}
        onViewChange={(v) => handleViewChange(v)}
        onOpenVersions={() => setVersionDialogOpen(true)}
        onSignOut={handleSignOut}
        isTestsEnabled={hasTests}
      />

      {/* main behöver min-w-0 för att undvika global horisontell scroll i flex-layouten */}
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {isLoadingData && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Laddar BPMN-data…</p>
          </div>
        )}

        {!isLoadingData && hasNoFiles && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <p className="text-muted-foreground">
              Ingen BPMN-fil hittades. Ladda upp en BPMN-fil via sidan Filer.
            </p>
            <Button variant="outline" onClick={() => baseNavigate('/files')}>
              Gå till Filer
            </Button>
          </div>
        )}

        {!isLoadingData && !hasNoFiles && !hasEffectiveFile && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Försöker hitta BPMN-rot…</p>
          </div>
        )}

        {!isLoadingData && !hasNoFiles && hasEffectiveFile && (
          <>
            {viewMode === 'diagram' ? (
              <div className="flex-1 min-w-0 flex overflow-hidden">
                {/* viewer-container med min-w-0 så att RightPanel inte tvingar fram global horisontell scroll */}
                <div className="flex-1 min-w-0">
                  <BpmnViewer
                    onElementSelect={handleElementSelect}
                    onFileChange={setCurrentBpmnFile}
                    bpmnMappings={mappings}
                    initialFileName={effectiveBpmnFile}
                  />
                </div>
                <RightPanel
                  selectedElement={selectedElement}
                  selectedElementType={selectedElementType}
                  selectedElementName={selectedElementName}
                  bpmnFile={effectiveBpmnFile}
                  mappings={mappings}
                  saveMapping={saveMapping}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ProcessExplorerView
                  onNodeSelect={handleTreeNodeSelect}
                  selectedBpmnFile={currentBpmnFile}
                  selectedElementId={selectedElement || undefined}
                />
              </div>
            )}
          </>
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
