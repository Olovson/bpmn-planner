import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestCoverageTable } from '@/components/TestCoverageTable';
import { scenarios as allScenarios } from '@/pages/E2eTestsOverviewPage';

export default function TestCoverageExplorerPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: rootFile, isLoading: isLoadingRoot } = useRootBpmnFile();
  const { data: tree, isLoading: isLoadingTree, error } = useProcessTree(rootFile || 'mortgage.bpmn');

  const isLoading = isLoadingRoot || isLoadingTree;

  const e2eScenarios = useMemo(
    () => allScenarios.filter((s) => s.id === 'E2E_BR001' || s.id === 'E2E_BR006'),
    [],
  );

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    e2eScenarios.length > 0 ? e2eScenarios[0].id : '',
  );

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'e2e-tests') navigate('/e2e-tests');
    else if (view === 'test-coverage') navigate('/test-coverage');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/test-coverage');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? null}
          currentView="test-coverage"
          onViewChange={handleViewChange}
          onOpenVersions={() => navigate('/')}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="ml-16 p-6 flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Laddar täckningsvy...</div>
        </main>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? null}
          currentView="test-coverage"
          onViewChange={handleViewChange}
          onOpenVersions={() => navigate('/')}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="ml-16 p-6 flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-lg">
            <AlertDescription>
              Kunde inte ladda processträd: {error ? (error as Error).message : 'Inget träd hittades'}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? null}
        currentView="test-coverage"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />
      <main className="ml-16 flex-1 flex flex-col gap-4 overflow-x-auto">
        <div className="w-full space-y-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Coverage Explorer</CardTitle>
              <CardDescription>
                Visar hela kreditprocessen i tabellform med test coverage och test-information per nod.
                Expandera/kollapsa noder för att navigera hierarkin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="scenario-select" className="text-sm font-medium">
                      Välj scenario:
                    </label>
                    <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                      <SelectTrigger id="scenario-select" className="w-[300px]">
                        <SelectValue placeholder="Välj ett scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        {e2eScenarios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.id} – {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 overflow-x-auto">
                <TestCoverageTable
                  tree={tree}
                  scenarios={e2eScenarios}
                  selectedScenarioId={selectedScenarioId}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


