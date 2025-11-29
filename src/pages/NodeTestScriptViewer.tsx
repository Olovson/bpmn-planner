import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { useNodeTestLinks, type TestMode } from '@/hooks/useNodeTestLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type NormalizedMode = 'local' | 'full';

interface NormalizedVariant {
  mode: NormalizedMode;
  testFilePath: string;
  fileUrl: string;
}

const modeLabel = (mode: NormalizedMode) =>
  mode === 'local' ? 'Lokal fallback (ingen LLM)' : 'LLM (ChatGPT/Ollama)';

const NodeTestScriptViewer = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const [searchParams] = useSearchParams();

  const bpmnFile = searchParams.get('bpmnFile') || undefined;
  const elementId = searchParams.get('elementId') || undefined;
   const variantParam = searchParams.get('variant');

  const { nodes } = useAllBpmnNodes();
  const { data: linkEntries = [], isLoading } = useNodeTestLinks();

  // Debug: logga alla länkar för denna nod direkt från databasen
  useEffect(() => {
    if (bpmnFile && elementId && !isLoading) {
      const entry = linkEntries.find(
        (e) => e.bpmnFile === bpmnFile && e.elementId === elementId,
      );
      if (entry) {
        console.log(`[NodeTestScriptViewer] Raw entry from node_test_links for ${bpmnFile}::${elementId}:`, {
          bpmnFile: entry.bpmnFile,
          elementId: entry.elementId,
          variants: entry.variants.map(v => ({
            mode: v.mode,
            testFilePath: v.testFilePath,
            fileUrl: v.fileUrl,
          })),
        });
      } else {
        console.warn(`[NodeTestScriptViewer] No entry found in node_test_links for ${bpmnFile}::${elementId}`);
      }
    }
  }, [bpmnFile, elementId, linkEntries, isLoading]);

  const nodeInfo = useMemo(() => {
    if (!bpmnFile || !elementId || !nodes) return null;
    return (
      nodes.find(
        (n) => n.bpmnFile === bpmnFile && n.elementId === elementId,
      ) || null
    );
  }, [nodes, bpmnFile, elementId]);

  const normalizedVariants = useMemo<NormalizedVariant[]>(() => {
    if (!bpmnFile || !elementId) return [];
    const entry = linkEntries.find(
      (e) => e.bpmnFile === bpmnFile && e.elementId === elementId,
    );
    if (!entry) return [];

    const variants: NormalizedVariant[] = [];

    // Local / legacy - prioritera 'local' mode, annars fallback till null (legacy)
    const localCandidate =
      entry.variants.find((v) => v.mode === 'local') ||
      entry.variants.find((v) => v.mode === null);
    if (localCandidate) {
      variants.push({
        mode: 'local',
        testFilePath: localCandidate.testFilePath,
        fileUrl: localCandidate.fileUrl,
      });
    }

    // Full LLM (lagras som 'slow' i mode-kolumnen)
    const fullCandidate = entry.variants.find((v) => v.mode === 'slow');
    if (fullCandidate) {
      variants.push({
        mode: 'full',
        testFilePath: fullCandidate.testFilePath,
        fileUrl: fullCandidate.fileUrl,
      });
    }

    // Debug: logga om vi hittar flera varianter eller om fileUrl verkar felaktig
    if (variants.length > 0) {
      const variantInfo = variants.map(v => {
        const expectedStoragePath = v.testFilePath;
        const urlContainsPath = v.fileUrl.includes(expectedStoragePath.replace(/^tests\//, ''));
        const urlLooksValid = v.fileUrl.includes('storage/v1/object/public/bpmn-files/') && urlContainsPath;
        
        return {
          mode: v.mode,
          testFilePath: v.testFilePath,
          fileUrl: v.fileUrl,
          urlLooksValid,
          // Extra kontroll: förväntad URL baserat på path
          expectedUrlPattern: `storage/v1/object/public/bpmn-files/${expectedStoragePath}`,
        };
      });
      
      // Logga varje variant separat för bättre läsbarhet
      console.group(`[NodeTestScriptViewer] Found ${variants.length} variant(s) for ${bpmnFile}::${elementId}`);
      variantInfo.forEach((variant, index) => {
        console.log(`Variant ${index + 1} (${variant.mode}):`, {
          'test_file_path (från DB)': variant.testFilePath,
          'fileUrl (genererad)': variant.fileUrl,
          'Förväntad URL-mönster': variant.expectedUrlPattern,
          'URL verkar korrekt': variant.urlLooksValid ? '✅' : '❌',
        });
        
        if (!variant.urlLooksValid) {
          console.warn(`⚠️ URL mismatch för variant ${index + 1}:`, {
            'test_file_path i node_test_links': variant.testFilePath,
            'Faktisk URL som används': variant.fileUrl,
            'Förväntad URL': variant.expectedUrlPattern,
            'Åtgärd': 'Kontrollera att test_file_path i node_test_links matchar den faktiska filen i storage. Kör omgenerering om nödvändigt.',
          });
        }
      });
      console.groupEnd();
    }

    return variants;
  }, [linkEntries, bpmnFile, elementId]);

  const [activeMode, setActiveMode] = useState<NormalizedMode>(
    variantParam === 'llm' ? 'full' : 'local',
  );
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(true);
  const blobUrlRef = useRef<string | null>(null);

  const hasLocalVariant = useMemo(
    () => normalizedVariants.some((v) => v.mode === 'local'),
    [normalizedVariants],
  );

  const hasFullVariant = useMemo(
    () => normalizedVariants.some((v) => v.mode === 'full'),
    [normalizedVariants],
  );

  useEffect(() => {
    if (!normalizedVariants.length) return;

    // Om bara en variant finns, se till att vi visar den som aktiv.
    if (!hasLocalVariant && hasFullVariant && activeMode !== 'full') {
      setActiveMode('full');
    }
    if (hasLocalVariant && !hasFullVariant && activeMode !== 'local') {
      setActiveMode('local');
    }
    // Om båda finns behåller vi explicit valt läge (default är 'local').
  }, [normalizedVariants, hasLocalVariant, hasFullVariant, activeMode]);

  const activeVariant = useMemo(() => {
    if (normalizedVariants.length === 0) return null;

    const byMode = normalizedVariants.find((v) => v.mode === activeMode);
    if (byMode) return byMode;

    // Fallback: om vald mode saknas, ta första varianten
    return normalizedVariants[0];
  }, [normalizedVariants, activeMode]);

  // Hämta testscriptet och skapa blob URL för att undvika cache-problem
  useEffect(() => {
    if (!activeVariant) {
      setIframeUrl('');
      setLoadingScript(false);
      return;
    }

    const fetchScript = async () => {
      setLoadingScript(true);
      
      // Rensa tidigare blob URL om den finns
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      console.log(`[NodeTestScriptViewer] Hämtar testscript för ${activeVariant.mode} variant:`, activeVariant.testFilePath);

      try {
        // Lägg till cache-busting query parameter
        const versionedUrl = `${activeVariant.fileUrl}?t=${Date.now()}`;
        const response = await fetch(versionedUrl, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Kunde inte hämta testscriptet: ${response.status} ${response.statusText}`);
        }

        const scriptContent = await response.text();
        console.log(`[NodeTestScriptViewer] ✓ Hämtat testscript (${scriptContent.length} tecken) för ${activeVariant.mode} variant`);
        
        // Skapa blob URL från innehållet
        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setIframeUrl(objectUrl);
      } catch (error) {
        console.error('[NodeTestScriptViewer] Error fetching script:', error);
        // Fallback till direkt URL om fetch misslyckas
        setIframeUrl(`${activeVariant.fileUrl}?t=${Date.now()}`);
      } finally {
        setLoadingScript(false);
      }
    };

    fetchScript();

    // Cleanup blob URL när komponenten unmountar eller variant ändras
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [activeVariant]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else navigate('/files');
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="tests"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Testscript för {nodeInfo?.elementName || elementId || 'okänd nod'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                {elementId && <span className="font-mono">{elementId}</span>}
                {bpmnFile && (
                  <>
                    {elementId && <span>•</span>}
                    <span>{bpmnFile}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/test-report')}
            >
              Tillbaka till testrapport
            </Button>
          </div>

          <Card className="mb-4">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Variantläge
                </CardTitle>
                <CardDescription className="text-xs">
                  Välj vilken variant av testscriptet du vill titta på.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={activeMode === 'local' ? 'default' : 'outline'}
                  onClick={() => setActiveMode('local')}
                  disabled={!hasLocalVariant}
                >
                  Lokal fallback
                </Button>
                <Button
                  size="sm"
                  variant={activeMode === 'full' ? 'default' : 'outline'}
                  onClick={() => setActiveMode('full')}
                  disabled={!hasFullVariant}
                >
                  LLM (ChatGPT/Ollama)
                </Button>
              </div>
            </CardHeader>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                Laddar testscript …
              </CardContent>
            </Card>
          ) : normalizedVariants.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                Inga testscripts har kopplats till denna nod via{' '}
                <code>node_test_links</code> ännu. Generera tester från filvyn
                för att se varianter här.
              </CardContent>
            </Card>
          ) : !activeVariant ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                Ingen tillgänglig variant för det valda läget.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-mono">
                  {modeLabel(activeVariant.mode)} • {activeVariant.testFilePath}
                </CardTitle>
                <CardDescription className="text-xs">
                  För att öppna filen direkt kan du även använda länken:
                  <br />
                  <a
                    href={activeVariant.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {activeVariant.fileUrl}
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingScript ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Laddar testscript …</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden h-[70vh] bg-background">
                    {/* Vi använder iframe med blob URL för att undvika cache-problem.
                        Innehållet hämtas med fetch och visas via blob URL. */}
                    {iframeUrl && (
                      <iframe
                        key={iframeUrl}
                        src={iframeUrl}
                        title="Testscript"
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default NodeTestScriptViewer;
