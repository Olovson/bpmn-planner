import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileCode, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNodeTests } from '@/hooks/useNodeTests';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const NodeTestsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const nodeId = searchParams.get('nodeId');
  const bpmnFile = searchParams.get('bpmnFile');
  const elementId = searchParams.get('elementId');

  const { tests, nodeInfo, plannedScenarios, isLoading } = useNodeTests({ 
    nodeId: nodeId || undefined,
    bpmnFile: bpmnFile || undefined,
    elementId: elementId || undefined,
  });
  const [implementedTestFile, setImplementedTestFile] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passing':
        return '✅';
      case 'failing':
        return '❌';
      case 'pending':
        return '⏺';
      case 'skipped':
        return '⏭';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: sv });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    if (!bpmnFile || !elementId) {
      setImplementedTestFile(null);
      return;
    }

    let cancelled = false;

    const fetchTestLink = async () => {
      try {
        const { data, error, status } = await supabase
          .from('node_test_links')
          .select('test_file_path')
          .eq('bpmn_file', bpmnFile)
          .eq('bpmn_element_id', elementId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error && status !== 406) {
          console.warn('[NodeTestsPage] node_test_links error', error);
          setImplementedTestFile(null);
          return;
        }

        if (data?.test_file_path) {
          setImplementedTestFile(data.test_file_path);
        } else {
          setImplementedTestFile(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[NodeTestsPage] Failed to read node_test_links', err);
          setImplementedTestFile(null);
        }
      }
    };

    fetchTestLink();

    return () => {
      cancelled = true;
    };
  }, [bpmnFile, elementId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Laddar tester...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/test-report')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Testrapport för {nodeInfo?.name || elementId || nodeId || 'okänd nod'}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {elementId && (
                    <span className="font-mono">{elementId}</span>
                  )}
                  {bpmnFile && (
                    <>
                      {elementId && <span>•</span>}
                      <span>{bpmnFile}</span>
                    </>
                  )}
                </div>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{tests.length}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {tests.length === 1 ? 'Kört test' : 'Körda tester'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {tests.filter(t => t.status === 'passing').length} passerade • {tests.filter(t => t.status === 'failing').length} misslyckade
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{implementedTestFile ? 1 : 0}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Implementerade testfiler
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {implementedTestFile && tests.length === 0 ? 'Ej körda ännu' : implementedTestFile ? 'Körda' : 'Inga'}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{plannedScenarios.length}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {plannedScenarios.length === 1 ? 'Planerat scenario' : 'Planerade scenarion'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Designade men ej implementerade
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {tests.length === 0 && !implementedTestFile && plannedScenarios.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Inga tester är kopplade till den här noden ännu.
              </div>
            </CardContent>
          </Card>
        )}

        {implementedTestFile && tests.length === 0 && (
          <Card className="mb-6 border-dashed border-amber-400/70 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span>🧪 Test implementerat men ej kört</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Det finns en genererad testfil för denna nod, men inga körda testresultat är inrapporterade ännu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs">{implementedTestFile}</p>
            </CardContent>
          </Card>
        )}

        {tests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Testfall ({tests.length})
              </CardTitle>
              <CardDescription>
                Detaljerad lista över alla testfall som är kopplade till denna BPMN-nod
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Testnamn</TableHead>
                    <TableHead>Fil</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Senast körd</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map(test => (
                    <TableRow 
                      key={test.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        if (test.bpmnFile && test.bpmnElementId) {
                          navigate(`/?file=${encodeURIComponent(test.bpmnFile)}&element=${test.bpmnElementId}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {test.fileName}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg">{getStatusIcon(test.status)}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDate(test.lastRunAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {test.duration ? `${test.duration}s` : '–'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const githubOwner = import.meta.env.VITE_GITHUB_OWNER;
                            const githubRepo = import.meta.env.VITE_GITHUB_REPO;
                            if (githubOwner && githubRepo) {
                              window.open(
                                `https://github.com/${githubOwner}/${githubRepo}/blob/main/tests/${test.fileName}`,
                                '_blank'
                              );
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {plannedScenarios.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📝 Planerade scenarion</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Designade testscenarion kopplade till denna nod. Dessa representerar målbilden och är
                inte nödvändigtvis implementerade eller körda ännu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Beskrivning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plannedScenarios.map((scenario) => (
                    <TableRow key={scenario.id}>
                      <TableCell className="font-medium text-sm">
                        {scenario.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {scenario.category}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {scenario.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default NodeTestsPage;
