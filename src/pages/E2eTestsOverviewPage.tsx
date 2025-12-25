import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Code, PlayCircle, FileCode2, GitBranch, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Iteration = 'Köp bostadsrätt' | 'Köp villa' | 'Flytta och höj bostadslån';

export type UserStory = {
  id?: string;
  role: string;
  goal: string;
  value: string;
  acceptanceCriteria?: string;
  linkedToSubprocessStep?: number;
};

// Vad som behöver testas i bankprojektet (faktiska affärsflöden baserat på BPMN)
// Alla teststeg här ska vara baserade på faktiska BPMN-noder och Feature Goals
//
// ⚠️ VALIDERING KRÄVS:
// - API-endpoints är baserade på antaganden (BPMN ServiceTask-namn → gissade endpoints)
// - Backend states är baserade på antaganden (Feature Goals + logik)
// - UI-interaktioner är baserade på Feature Goals (kan vara inaktuella)
//
// Se: docs/E2E_VALIDATION_STATUS.md för detaljerad valideringsstatus
export type BankProjectTestStep = {
  bpmnNodeId: string; // ID från BPMN-filen (t.ex. "internal-data-gathering", "confirm-application")
  bpmnNodeType: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity' | 'BoundaryEvent' | 'Gateway';
  bpmnNodeName: string; // Namn från BPMN-filen
  action: string; // Vad som händer - baserat på Feature Goal och BPMN-nodens syfte
  uiInteraction?: string; // För UserTask: vad användaren gör i UI (baserat på Feature Goal)
  apiCall?: string; // För ServiceTask: vilket API som anropas (baserat på BPMN-nodens syfte)
  dmnDecision?: string; // För BusinessRuleTask: vilket DMN-beslut som körs
  assertion: string; // Vad som verifieras - baserat på Feature Goal "Then"
  backendState?: string; // Förväntat backend-tillstånd efter teststeget
};

// Metadata för path som användes för att generera E2E-scenariot
export type E2eScenarioPathMetadata = {
  startEvent: string;
  endEvent: string;
  featureGoals: string[];
  gatewayConditions: Array<{
    gatewayId: string;
    conditionText: string;
  }>;
  nodeIds: string[];
};

export type E2eScenario = {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  type: 'happy-path' | 'alt-path' | 'error';
  iteration: Iteration;
  bpmnProcess: string;
  bpmnCallActivityId?: string;
  featureGoalFile: string;
  featureGoalTestId?: string;
  testFile: string;
  command: string;
  summary: string;
  given: string;
  when: string;
  then: string;
  notesForBankProject: string;
  // Path-metadata för bättre matchning med Feature Goal-tester
  pathMetadata?: E2eScenarioPathMetadata;
  // Vad som behöver testas i bankprojektet (faktiska affärsflöden baserat på BPMN-noder och Feature Goals)
  // Alla teststeg här är direkt användbara i bankprojektet och baserade på faktiska BPMN-strukturer
  bankProjectTestSteps: BankProjectTestStep[];
  userStories?: UserStory[];
  subprocessSteps: {
    order: number;
    bpmnFile: string;
    callActivityId?: string;
    featureGoalFile?: string;
    description: string;
    hasPlaywrightSupport: boolean;
    given?: string;
    when?: string;
    then?: string;
    linkedUserStories?: number[];
    subprocessesSummary?: string;
    serviceTasksSummary?: string;
    userTasksSummary?: string;
    businessRulesSummary?: string;
  }[];
};

const renderBulletList = (text?: string, options?: { isCode?: boolean }) => {
  if (!text) {
    return <span className="text-[11px] text-muted-foreground">–</span>;
  }

  const isCode = options?.isCode ?? false;

  // Dela upp på punkt + mellanslag för långa stycken, men behåll kommatecken inne i satser
  const rawItems = text
    .split('. ')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (rawItems.length <= 1) {
    // För korta texter – visa som vanlig paragraf
    return (
      <p
        className={
          isCode
            ? 'text-[11px] font-mono break-all whitespace-pre-line'
            : 'text-[11px] text-muted-foreground whitespace-pre-line break-words'
        }
      >
        {text}
      </p>
    );
  }

  return (
    <ul className="list-disc ml-4 space-y-1">
      {rawItems.map((item, idx) => {
        // Lägg tillbaka punkt på slutet om originaltexten hade det
        const endsWithDot = text.trim().endsWith('.');
        const isLast = idx === rawItems.length - 1;
        const displayText = !isLast && endsWithDot && !item.endsWith('.') ? `${item}.` : item;

        return (
          <li
            key={idx}
            className={
              isCode
                ? 'text-[11px] font-mono break-all whitespace-pre-line'
                : 'text-[11px] text-muted-foreground whitespace-pre-line break-words'
            }
          >
            {displayText}
          </li>
        );
      })}
    </ul>
  );
};

// E2E-scenarios laddas från storage
// Se loadE2eScenarios() nedan
export const scenarios: E2eScenario[] = [];

const E2eTestsOverviewPage = () => {
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIteration, setFilterIteration] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [loadedScenarios, setLoadedScenarios] = useState<E2eScenario[]>([]);
  
  // Load E2E scenarios from storage on mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const { loadAllE2eScenarios } = await import('@/lib/e2eScenarioStorage');
        const scenarios = await loadAllE2eScenarios();
        setLoadedScenarios(scenarios);
      } catch (error) {
        console.error('[E2eTestsOverviewPage] Failed to load E2E scenarios:', error);
      }
    };
    
    loadScenarios();
  }, []);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'test-coverage') navigate('/test-coverage');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/test-coverage');
  };

  // Filtrera scenarier baserat på sökning och filter
  const filteredScenarios = useMemo(() => {
    return loadedScenarios.filter((s) => {
      // Sökning
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.summary.toLowerCase().includes(query) ||
          s.bpmnProcess.toLowerCase().includes(query) ||
          s.featureGoalFile.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Filter: iteration
      if (filterIteration !== 'all' && s.iteration !== filterIteration) return false;

      // Filter: typ
      if (filterType !== 'all' && s.type !== filterType) return false;

      // Filter: prioritet
      if (filterPriority !== 'all' && s.priority !== filterPriority) return false;

      return true;
    });
  }, [searchQuery, filterIteration, filterType, filterPriority]);

  return (
    <div className="min-h-screen bg-background">
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
      <main className="ml-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">E2E / Playwright‑tester</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Referensvy för Playwright‑drivna, BPMN‑ och Feature Goal‑kopplade E2E‑scenarier.
                Tanken är att samma struktur ska kunna återanvändas i bankens riktiga E2E‑tester
                med riktiga integrationer.
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

          {/* Information om valideringsstatus */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Information om valideringsstatus</AlertTitle>
            <AlertDescription className="text-blue-800 text-sm mt-2">
              <p className="mb-2">
                Denna information är baserad på BPMN-filer och Feature Goals. API-endpoints, mock-responser och backend states är spekulativa och kommer behöva valideras och justeras när faktiska implementationer är tillgängliga.
              </p>
              <p>
                <strong>Se:</strong>{' '}
                <a
                  href="/docs/E2E_VALIDATION_STATUS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  docs/E2E_VALIDATION_STATUS.md
                </a>{' '}
                för detaljerad status och startpunkt-guide.
              </p>
            </AlertDescription>
          </Alert>

          {/* Information om valideringsstatus */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Information om valideringsstatus</AlertTitle>
            <AlertDescription className="text-blue-800 text-sm mt-2">
              <p className="mb-2">
                Denna information är baserad på BPMN-filer och Feature Goals. API-endpoints, mock-responser och backend states är spekulativa och kommer behöva valideras och justeras när faktiska implementationer är tillgängliga.
              </p>
              <p>
                <strong>Se:</strong>{' '}
                <a
                  href="/docs/E2E_VALIDATION_STATUS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  docs/E2E_VALIDATION_STATUS.md
                </a>{' '}
                för detaljerad status och startpunkt-guide.
              </p>
            </AlertDescription>
          </Alert>

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
                  <span>{scenarios[0].command}</span>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Detta kör enbart det pilottest som följer mortgage‑flödet till Process Explorer
                  och är förberett för hypotes‑baserad mocking av kreditbeslut.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sektion: Katalog över E2E-scenarier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5" />
                Scenario‑katalog (BPMN + Feature Goal + testfil)
              </CardTitle>
              <CardDescription>
                Strukturerad lista över E2E‑scenarier. Varje rad binder ihop BPMN‑subprocess,
                Feature Goal‑dokumentation och Playwright‑testfil, så att samma mönster kan
                återanvändas i verklig bankmiljö.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sök- och filter-sektion */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Sök efter scenario, ID, BPMN-process, Feature Goal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterIteration} onValueChange={setFilterIteration}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Iteration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla iterationer</SelectItem>
                    <SelectItem value="Köp bostadsrätt">Köp bostadsrätt</SelectItem>
                    <SelectItem value="Köp villa">Köp villa</SelectItem>
                    <SelectItem value="Flytta och höj bostadslån">Flytta och höj bostadslån</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla typer</SelectItem>
                    <SelectItem value="happy-path">Happy path</SelectItem>
                    <SelectItem value="alt-path">Alt path</SelectItem>
                    <SelectItem value="error">Error / edge</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Prioritet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    <SelectItem value="P0">P0</SelectItem>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Visar {filteredScenarios.length} av {loadedScenarios.length} scenarier
              </div>

              <div className="overflow-x-auto max-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namn</TableHead>
                      <TableHead>Prioritet</TableHead>
                      <TableHead>Scenario‑typ</TableHead>
                      <TableHead>BPMN‑process</TableHead>
                      <TableHead>Feature Goal</TableHead>
                      <TableHead className="max-w-xs">Kommando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScenarios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{s.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.id} – {s.summary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="outline" className="text-xs">
                            {s.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="secondary" className="text-xs">
                            {s.type === 'happy-path'
                              ? 'Happy path'
                              : s.type === 'alt-path'
                              ? 'Alt path'
                              : 'Error / edge'}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono break-all">
                              {s.bpmnProcess}
                            </span>
                            {s.bpmnCallActivityId && (
                              <span className="text-[11px] text-muted-foreground">
                                CallActivity: <code>{s.bpmnCallActivityId}</code>
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono break-all">
                              {s.featureGoalFile}
                            </span>
                            {s.featureGoalTestId && (
                              <span className="text-[11px] text-muted-foreground">
                                Sektion: {s.featureGoalTestId}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top max-w-xs">
                          <pre className="bg-muted text-[11px] rounded-md px-2 py-1 font-mono whitespace-pre-wrap break-words">
                            <Code className="h-3 w-3 shrink-0 inline mr-1" />
                            {s.command}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sektion: Scenario-detaljer (Given/When/Then + bank-referens) */}
          {filteredScenarios.map((s) => {
            const scenarioId = `${s.id}-details`;
            const isExpanded = expandedScenarios.has(scenarioId);
            return (
              <Card key={scenarioId}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={(open) => {
                    const newSet = new Set(expandedScenarios);
                    if (open) {
                      newSet.add(scenarioId);
                    } else {
                      newSet.delete(scenarioId);
                    }
                    setExpandedScenarios(newSet);
                  }}
                >
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left">
                        <CardTitle className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5" />
                            {s.name}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          BPMN: <code className="text-xs font-mono">{s.bpmnProcess}</code> · Feature Goal:{' '}
                          <code className="text-xs font-mono">{s.featureGoalFile}</code>
                        </CardDescription>
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{s.id}</Badge>
                        <Badge variant="outline">{s.priority}</Badge>
                        <Badge variant="secondary">
                          {s.type === 'happy-path'
                            ? 'Happy path'
                            : s.type === 'alt-path'
                            ? 'Alt path'
                            : 'Error / edge'}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">Kort beskrivning</p>
                        <p className="text-sm text-muted-foreground">{s.summary}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Subprocesser / call activities i scenariot (i körordning)
                        </p>
                        <div className="overflow-x-auto max-w-full">
                          <Table className="table-fixed w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">#</TableHead>
                                <TableHead className="w-[280px]">BPMN‑fil</TableHead>
                                <TableHead className="w-[280px]">Feature Goal</TableHead>
                                <TableHead className="w-[280px]">Beskrivning</TableHead>
                                <TableHead className="w-[280px]">Given</TableHead>
                                <TableHead className="w-[280px]">When</TableHead>
                                <TableHead className="w-[280px]">Then</TableHead>
                                <TableHead className="w-[280px]">UI‑interaktion</TableHead>
                                <TableHead className="w-[280px]">API‑anrop / DMN</TableHead>
                                <TableHead className="w-[280px]">Assertion</TableHead>
                                <TableHead className="w-[280px]">Backend‑tillstånd</TableHead>
                                <TableHead className="w-[280px]">Subprocesser</TableHead>
                                <TableHead className="w-[280px]">Service tasks</TableHead>
                                <TableHead className="w-[280px]">User tasks</TableHead>
                                <TableHead className="w-[280px]">Business rules / DMN</TableHead>
                                <TableHead className="w-[280px]">Playwright‑stöd</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.subprocessSteps.map((step) => {
                                const rowId = `${s.id}-step-${step.order}`;
                                const aggregatedStep =
                                  s.bankProjectTestSteps?.find(
                                    (testStep) => testStep.bpmnNodeId === step.callActivityId
                                  ) ?? null;
                                return (
                                  <TableRow key={rowId}>
                                    <TableCell className="text-xs text-muted-foreground align-top w-[60px]">
                                      {step.order}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono align-top w-[280px]">
                                      {step.bpmnFile}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.featureGoalFile ? (
                                        <code className="text-[11px] font-mono break-all">
                                          {step.featureGoalFile}
                                        </code>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">{step.description}</TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.given ? renderBulletList(step.given) : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.when ? renderBulletList(step.when) : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.then ? renderBulletList(step.then) : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {aggregatedStep?.uiInteraction
                                        ? renderBulletList(aggregatedStep.uiInteraction)
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {aggregatedStep?.apiCall
                                        ? renderBulletList(aggregatedStep.apiCall, { isCode: true })
                                        : aggregatedStep?.dmnDecision
                                        ? renderBulletList(`DMN: ${aggregatedStep.dmnDecision}`, { isCode: true })
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {aggregatedStep?.assertion
                                        ? renderBulletList(aggregatedStep.assertion)
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {aggregatedStep?.backendState
                                        ? renderBulletList(aggregatedStep.backendState, { isCode: true })
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.subprocessesSummary
                                        ? renderBulletList(step.subprocessesSummary)
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.serviceTasksSummary
                                        ? renderBulletList(step.serviceTasksSummary, { isCode: true })
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.userTasksSummary
                                        ? renderBulletList(step.userTasksSummary)
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.businessRulesSummary
                                        ? renderBulletList(step.businessRulesSummary)
                                        : <span className="text-[11px] text-muted-foreground">–</span>}
                                    </TableCell>
                                    <TableCell className="text-xs align-top w-[280px]">
                                      {step.hasPlaywrightSupport ? (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                        >
                                          Ja (täcks av {s.id})
                                        </Badge>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">
                                          Inte implementerat ännu
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Given</p>
                          <div className="text-xs">{renderBulletList(s.given)}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">When</p>
                          <div className="text-xs">{renderBulletList(s.when)}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Then</p>
                          <div className="text-xs">{renderBulletList(s.then)}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Implementeringsnoteringar för bankprojektet
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">
                          {s.notesForBankProject}
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default E2eTestsOverviewPage;

