import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { useNodeTestLinks, type TestMode } from '@/hooks/useNodeTestLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type NormalizedMode = 'local' | 'full';

interface NormalizedVariant {
  mode: NormalizedMode;
  testFilePath: string;
  fileUrl: string;
}

const modeLabel = (mode: NormalizedMode) =>
  mode === 'local' ? 'Local' : 'Full LLM mode';

const NodeTestScriptViewer = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const [searchParams] = useSearchParams();

  const bpmnFile = searchParams.get('bpmnFile') || undefined;
  const elementId = searchParams.get('elementId') || undefined;

  const { nodes } = useAllBpmnNodes();
  const { data: linkEntries = [], isLoading } = useNodeTestLinks();

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

    // Local / legacy
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

    return variants;
  }, [linkEntries, bpmnFile, elementId]);

  const [activeMode, setActiveMode] = useState<NormalizedMode>('local');

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

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else navigate('/files');
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
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
                  Local
                </Button>
                <Button
                  size="sm"
                  variant={activeMode === 'full' ? 'default' : 'outline'}
                  onClick={() => setActiveMode('full')}
                  disabled={!hasFullVariant}
                >
                  Full LLM mode
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
                <div className="border rounded-md overflow-hidden h-[70vh] bg-background">
                  {/* Vi använder iframe för att visa rå .spec.ts-fil.
                      Innehållet kommer direkt från Supabase Storage. */}
                  <iframe
                    src={activeVariant.fileUrl}
                    title="Testscript"
                    className="w-full h-full border-0"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default NodeTestScriptViewer;
