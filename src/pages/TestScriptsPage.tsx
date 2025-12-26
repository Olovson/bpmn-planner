import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs, type ViewKey } from '@/components/AppHeaderWithTabs';
import { navigateToView } from '@/utils/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { useNodeTestLinks, type TestMode } from '@/hooks/useNodeTestLinks';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileCode, ExternalLink } from 'lucide-react';

const modeLabel = (mode: TestMode) => {
  if (mode === 'slow') return 'LLM (Claude/Ollama)';
  return 'Legacy';
};

const TestScriptsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { nodes, loading: nodesLoading } = useAllBpmnNodes();
  const { data: linkEntries = [], isLoading: linksLoading } = useNodeTestLinks();
  const [viewMode, setViewMode] = useState<TestMode | 'all'>('all');

  const handleViewChange = (view: string) => {
    navigateToView(navigate, view as ViewKey);
  };

  const rows = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];

    const byKey = new Map<string, ReturnType<typeof buildRow>>();

    const lookup = new Map<string, typeof linkEntries[number]>();
    for (const entry of linkEntries) {
      const key = `${entry.bpmnFile}:${entry.elementId}`;
      lookup.set(key, entry);
    }

    for (const node of nodes) {
      const key = `${node.bpmnFile}:${node.elementId}`;
      const entry = lookup.get(key);

      const variants = entry?.variants ?? [];
      const filteredVariants =
        viewMode === 'all'
          ? variants
          : variants.filter((v) => v.mode === viewMode);

      if (filteredVariants.length === 0) continue;

      byKey.set(key, buildRow(node.bpmnFile, node.elementId, node.elementName, filteredVariants));
    }

    return Array.from(byKey.values()).sort((a, b) => {
      if (a.bpmnFile < b.bpmnFile) return -1;
      if (a.bpmnFile > b.bpmnFile) return 1;
      if (a.elementId < b.elementId) return -1;
      if (a.elementId > b.elementId) return 1;
      return 0;
    });
  }, [nodes, linkEntries, viewMode]);

  const loading = nodesLoading || linksLoading;

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
        <div className="container mx-auto py-8 px-4 relative">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Testscript‑varianter</h1>
            <p className="text-muted-foreground text-sm">
              Översikt över genererade testscripts per nod, med varianter för LLM (Claude/Ollama) när de finns.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Visningsläge</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'all' ? 'default' : 'outline'}
                    onClick={() => setViewMode('all')}
                  >
                    Alla
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'local' ? 'default' : 'outline'}
                    onClick={() => setViewMode('local')}
                  >
                    Endast lokal/legacy
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'slow' ? 'default' : 'outline'}
                    onClick={() => setViewMode('slow')}
                  >
                    Endast LLM (Claude/Ollama)
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Lokal motsvarar mall‑baserade tester utan LLM (fallback). LLM visar testscripts som
                genererats via LLM‑läget (Claude eller Ollama). Legacy‑länkar (utan mode) visas tillsammans med lokal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Genererade testscripts per nod
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto max-w-full">
              {loading ? (
                <p className="text-sm text-muted-foreground">Laddar testscripts …</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Inga testscripts har kopplats via <code>node_test_links</code> ännu. Generera
                  tester från filvyn för att se dem här.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>BPMN‑fil</TableHead>
                      <TableHead>Element</TableHead>
                      <TableHead>Varianter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={`${row.bpmnFile}:${row.elementId}`}>
                        <TableCell className="text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.bpmnFile}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium">{row.elementName}</span>
                            <span className="text-muted-foreground">{row.elementId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {row.variants.map((variant, idx) => (
                              <Button
                                key={`${variant.mode ?? 'legacy'}-${idx}`}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                title={`${modeLabel(variant.mode)} – ${variant.testFilePath}`}
                                onClick={() =>
                                  navigate(
                                    `/node-test-script?bpmnFile=${encodeURIComponent(
                                      row.bpmnFile,
                                    )}&elementId=${encodeURIComponent(
                                      row.elementId,
                                    )}`,
                                  )
                                }
                              >
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                  {modeLabel(variant.mode)}
                                </Badge>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

function buildRow(
  bpmnFile: string,
  elementId: string,
  elementName: string,
  variants: ReturnType<typeof useNodeTestLinks> extends { data: infer T }
    ? T extends Array<infer E>
      ? E extends { variants: infer V }
        ? V
        : never
      : never
    : never,
) {
  return {
    bpmnFile,
    elementId,
    elementName,
    variants: variants as NodeTestLinkVariant[],
  };
}

export default TestScriptsPage;
