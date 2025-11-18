import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileCode, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNodeTests } from '@/hooks/useNodeTests';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const NodeTestsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const nodeId = searchParams.get('nodeId');
  const bpmnFile = searchParams.get('bpmnFile');
  const elementId = searchParams.get('elementId');

  const { tests, nodeInfo, isLoading } = useNodeTests({ 
    nodeId: nodeId || undefined,
    bpmnFile: bpmnFile || undefined,
    elementId: elementId || undefined,
  });

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
                  Tester för nod: {nodeInfo?.name || nodeId}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {nodeInfo?.type}
                </p>
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
        {tests.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Inga tester är kopplade till den här noden ännu.
              </div>
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
      </main>
    </div>
  );
};

export default NodeTestsPage;
