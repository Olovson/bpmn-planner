import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Code, PlayCircle, FileCode2 } from 'lucide-react';

const E2eTestsOverviewPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/e2e-tests');
  };

  const singleScenarioFile =
    'tests/playwright-e2e/scenarios/happy-path/mortgage-credit-decision-happy.spec.ts';

  return (
    <div className="min-h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email ?? null}
        currentView="e2e-tests"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />
      <main className="ml-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">E2E / Playwright‑tester</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Översikt över Playwright‑drivna, BPMN-/Feature Goal‑baserade scenarier och hur du
                kör dem lokalt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/test-report')}
              >
                Gå till testrapport
              </Button>
            </div>
          </div>

          {/* Sektion: Hur man kör Playwright‑tester */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Köra Playwright‑tester lokalt
              </CardTitle>
              <CardDescription>
                Playwright är konfigurerat att läsa tester från{' '}
                <code className="font-mono text-xs">tests/playwright-e2e/</code> och startar dev‑servern automatiskt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">1. Kör alla Playwright‑E2E‑tester</p>
                <pre className="bg-muted text-xs rounded-md p-3 font-mono flex items-center gap-2 overflow-x-auto">
                  <Code className="h-3 w-3 shrink-0" />
                  <span>npx playwright test</span>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Detta startar <code>npm run dev</code> (via <code>playwright.config.ts</code>) och
                  kör alla tester under <code>tests/playwright-e2e/</code>.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">
                  2. Kör endast mortgage‑scenariot för kreditbeslut (happy path)
                </p>
                <pre className="bg-muted text-xs rounded-md p-3 font-mono flex items-center gap-2 overflow-x-auto">
                  <Code className="h-3 w-3 shrink-0" />
                  <span>npx playwright test {singleScenarioFile}</span>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Detta kör enbart det pilottest som följer mortgage‑flödet till Process Explorer
                  och är förberett för hypotes‑baserad mocking av kreditbeslut.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sektion: Lista över definierade Playwright‑scenarier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5" />
                Tillgängliga Playwright‑scenarier
              </CardTitle>
              <CardDescription>
                Sammanfattning av nuvarande scenarier i{' '}
                <code className="font-mono text-xs">tests/playwright-e2e/</code>. Listan kan
                utökas allteftersom fler scenarier implementeras.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto max-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Prioritet</TableHead>
                    <TableHead>Fil</TableHead>
                    <TableHead>Kommando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          Mortgage SE – Credit Decision – Happy Path
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          FG_CREDIT_DECISION_TC01 – hypotes‑baserat scenario som öppnar Process Explorer
                          och verifierar att mortgage‑trädet renderas.
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="secondary" className="text-xs">
                        UI / Process‑E2E (mockad integration)
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline" className="text-xs">
                        P0 – Pilot / referens
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <code className="text-xs font-mono break-all">
                        {singleScenarioFile}
                      </code>
                    </TableCell>
                    <TableCell className="align-top">
                      <pre className="bg-muted text-[11px] rounded-md px-2 py-1 font-mono inline-flex items-center gap-1">
                        <Code className="h-3 w-3 shrink-0" />
                        <span>npx playwright test {singleScenarioFile}</span>
                      </pre>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default E2eTestsOverviewPage;


