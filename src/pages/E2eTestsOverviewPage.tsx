import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Code, PlayCircle, FileCode2, GitBranch, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Iteration = 'Köp bostadsrätt' | 'Köp villa' | 'Flytta och höj bostadslån';

type UserStory = {
  id?: string;
  role: string;
  goal: string;
  value: string;
  acceptanceCriteria?: string;
  linkedToSubprocessStep?: number;
};

// Vad som behöver testas i bankprojektet (faktiska affärsflöden baserat på BPMN)
// Alla teststeg här ska vara baserade på faktiska BPMN-noder och Feature Goals
type BankProjectTestStep = {
  bpmnNodeId: string; // ID från BPMN-filen (t.ex. "internal-data-gathering", "confirm-application")
  bpmnNodeType: 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity' | 'BoundaryEvent';
  bpmnNodeName: string; // Namn från BPMN-filen
  action: string; // Vad som händer - baserat på Feature Goal och BPMN-nodens syfte
  uiInteraction?: string; // För UserTask: vad användaren gör i UI (baserat på Feature Goal)
  apiCall?: string; // För ServiceTask: vilket API som anropas (baserat på BPMN-nodens syfte)
  dmnDecision?: string; // För BusinessRuleTask: vilket DMN-beslut som körs
  assertion: string; // Vad som verifieras - baserat på Feature Goal "Then"
  backendState?: string; // Förväntat backend-tillstånd efter teststeget
};

type E2eScenario = {
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
  }[];
};

const scenarios: E2eScenario[] = [
  {
    id: 'FG_CREDIT_DECISION_TC01',
    name: 'Mortgage SE – Credit Decision – Happy Path',
    priority: 'P0',
    type: 'happy-path',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage-se-credit-decision.bpmn',
    bpmnCallActivityId: 'credit-decision',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-se-credit-decision-v2.html',
    featureGoalTestId: 'Testgenerering / huvud-scenario',
    testFile:
      'tests/playwright-e2e/scenarios/happy-path/mortgage-credit-decision-happy.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-credit-decision-happy.spec.ts',
    summary:
      'Visualiserar kreditbesluts-subprocessen i Process Explorer och verifierar att mortgage-hierarkin laddas korrekt under ett hypotetiskt auto-approve-scenario.',
    given:
      'En komplett ansökan som har passerat KYC och internal data gathering, där automatisk beslutsnivåbestämning (business rule) ger ett auto-approve/straight-through-läge.',
    when:
      'Vi startar BPMN Planner, navigerar till E2E-sidan och öppnar Process Explorer-vyn för mortgage-hierarkin.',
    then:
      'Processträdet för mortgage är synligt, UI:t laddas utan fel, och en nod med kreditbesluts-kontext (t.ex. "Credit decision") finns i trädet. Detta fungerar som UI-/struktur-verifiering för subprocessen innan riktiga integrationer finns.',
    notesForBankProject:
      'Detta scenario testar kreditbesluts-subprocessen. Teststeg och subprocesser kommer att valideras och läggas till stegvis.',
    bankProjectTestSteps: [],
    subprocessSteps: [],
  },
  {
    id: 'FG_APPLICATION_S1',
    name: 'Application – Normalflöde, komplett ansökan med en person',
    priority: 'P0',
    type: 'happy-path',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage-se-application.bpmn',
    bpmnCallActivityId: 'application',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    featureGoalTestId: 'Testgenerering / S1',
    testFile:
      'tests/playwright-e2e/scenarios/happy-path/mortgage-application-happy.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-application-happy.spec.ts',
    summary:
      'Täcker huvudflödet för Application-subprocessen där en kund fyller i en komplett ansökan med en person och processen avslutas med en ansökan redo för kreditevaluering.',
    given:
      'En kund som ansöker om bolån för köp, uppfyller grundläggande krav (godkänd vid pre-screening) och har en fastighet som uppfyller bankens krav. Testdata: customer-standard.',
    when:
      'Kunden fyller i ansökningsformulär med grundläggande information. Systemet hämtar befintlig kunddata, kunden kompletterar hushållsekonomi och stakeholder-information, och systemet beräknar automatiskt maximalt lånebelopp (KALP). Kunden får en sammanfattning och bekräftar ansökan.',
    then:
      'All relevant information (intern data, hushåll, stakeholders, objekt) är insamlad och validerad. Kunden ser en sammanfattning och kan bekräfta ansökan via en tydlig knapp. Processen avslutas normalt i Application-subprocessen och är redo för kreditevaluering.',
    notesForBankProject:
      'Detta scenario testar hela Application-subprocessen. Teststeg och subprocesser kommer att valideras och läggas till stegvis.',
    bankProjectTestSteps: [],
    subprocessSteps: [],
  },
  {
    id: 'FG_APPLICATION_S3',
    name: 'Application – Pre-screen avvisad',
    priority: 'P0',
    type: 'error',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage-se-application.bpmn',
    bpmnCallActivityId: 'application',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    featureGoalTestId: 'Testgenerering / S3',
    testFile:
      'tests/playwright-e2e/scenarios/error/mortgage-application-pre-screen-rejected.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/error/mortgage-application-pre-screen-rejected.spec.ts',
    summary:
      'Täcker error-flödet där pre-screening avvisar ansökan eftersom kunden inte uppfyller grundläggande krav.',
    given:
      'En person ansöker om bolån men uppfyller INTE grundläggande krav (t.ex. för ung, låg kreditscore, eller saknar anställning). Testdata: customer-rejected.',
    when:
      'Systemet hämtar kunddata automatiskt och gör pre-screening. Pre-screening avvisar ansökan eftersom kunden inte uppfyller grundläggande krav.',
    then:
      'Kunden ser ett tydligt felmeddelande som förklarar vilket krav som inte uppfylldes, vilken part som avvisades, och att ansökan inte kan fortsätta. Processen avslutas och kunden kan starta ny ansökan.',
    notesForBankProject:
      'Detta scenario testar error-hanteringen i Application-subprocessen när pre-screening avvisar ansökan. Alla teststeg nedan är baserade på faktiska BPMN-noder och Feature Goals, direkt användbara i bankprojektet. Implementera UI-felmeddelanden, error events och assertions enligt era faktiska integrationer.',
    bankProjectTestSteps: [
      {
        bpmnNodeId: 'internal-data-gathering',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Internal data gathering',
        action: 'Systemet hämtar kunddata automatiskt',
        apiCall: 'GET /api/customer/{id} (eller motsvarande integration)',
        assertion: 'Kunddata är hämtad',
        backendState: 'Application.internalDataGathered = true',
      },
      {
        bpmnNodeId: 'screen-party',
        bpmnNodeType: 'BusinessRuleTask',
        bpmnNodeName: 'Screen party',
        action: 'Systemet genomför pre-screening mot grundläggande krav',
        dmnDecision: 'pre-screen-party (DMN)',
        assertion: 'Pre-screening returnerar REJECTED',
        backendState: 'PreScreenResult.status = "REJECTED", PreScreenResult.reason = "Ålder under 18 år" (eller motsvarande)',
      },
      {
        bpmnNodeId: 'Event_03349px',
        bpmnNodeType: 'BoundaryEvent',
        bpmnNodeName: 'Pre-screen rejected',
        action: 'Error event triggas när pre-screening avvisar ansökan',
        assertion: 'Error event "pre-screen-rejected" signaleras och processen avslutas',
        backendState: 'Application.status = "REJECTED", Application.rejectionReason = "pre-screen-rejected"',
      },
    ],
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'internal-data-gathering',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-internal-data-gathering-v2.html',
        description:
          'Intern datainsamling – systemet hämtar kunddata och gör pre-screening som avvisar ansökan.',
        hasPlaywrightSupport: false,
        given:
          'Kunden är identifierad men uppfyller INTE grundläggande krav (customer-rejected).',
        when:
          'Systemet hämtar intern kunddata automatiskt och gör en pre-screening mot grundläggande krav som avvisar ansökan.',
        then:
          'Pre-screening returnerar REJECTED. Error event triggas och processen avslutas. Kunden ser ett tydligt felmeddelande.',
      },
    ],
  },
  {
    id: 'FG_APPLICATION_S2',
    name: 'Application – Normalflöde, ansökan med flera personer (medsökare)',
    priority: 'P0',
    type: 'happy-path',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage-se-application.bpmn',
    bpmnCallActivityId: 'application',
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    featureGoalTestId: 'Testgenerering / S2',
    testFile:
      'tests/playwright-e2e/scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-application-multi-stakeholder.spec.ts',
    summary:
      'Täcker huvudflödet för Application-subprocessen där flera personer (huvudansökande och medsökare) ansöker tillsammans. Systemet bearbetar varje hushåll individuellt med sekventiell körning per hushåll.',
    given:
      'Flera personer ansöker tillsammans med separata hushåll. Alla personer är godkända vid pre-screening. Testdata: customer-multi-household.',
    when:
      'Kunden fyller i information för flera hushåll parallellt. Kunden kan öppna både Household- och Stakeholders-formulären samtidigt i separata flikar/fönster för varje hushåll. Systemet bearbetar varje hushåll individuellt med sekventiell körning (Household → Stakeholder → Object) per hushåll. Kunden bekräftar ansökan.',
    then:
      'Kunden kan se status för varje hushåll med tydliga statusindikatorer (t.ex. "Pågår", "Klar", "Fel"). Varje hushåll bearbetas i rätt ordning. Kunden kan spara progress i varje formulär oberoende av varandra. Alla hushåll och personer är bearbetade. Processen fortsätter när båda flöden är klara och ansökan är redo för kreditevaluering.',
    notesForBankProject:
      'Detta scenario testar hela Application-subprocessen med multi-instance för flera stakeholders och hushåll. Alla teststeg nedan är baserade på faktiska BPMN-noder från mortgage-se-application.bpmn och Feature Goals, direkt användbara i bankprojektet. Implementera UI-interaktioner, API-anrop och assertions enligt era faktiska integrationer. Särskilt viktigt: multi-instance hantering för stakeholders och hushåll.',
    bankProjectTestSteps: [
      {
        bpmnNodeId: 'internal-data-gathering',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Internal data gathering',
        action: 'Systemet hämtar befintlig kunddata automatiskt (multi-instance per part)',
        apiCall: 'GET /api/customer/{id}, GET /api/engagements/{id}, GET /api/credit-information/{id} (eller motsvarande integrationer)',
        assertion: 'Kunddata är hämtad för alla parter och visas i UI, pre-screening är godkänd för alla parter',
        backendState: 'Application.internalDataGathered = true, PreScreenResult.status = "APPROVED" för alla parter',
      },
      {
        bpmnNodeId: 'household',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Household',
        action: 'Kunden fyller i hushållsekonomi (multi-instance per hushåll)',
        uiInteraction: 'Fyll i formulär för varje hushåll med inkomster, utgifter, tillgångar, klicka "Spara" per hushåll',
        apiCall: 'POST /api/application/{id}/households (eller motsvarande API)',
        assertion: 'Hushållsekonomi är sparad och validerad för alla hushåll',
        backendState: 'Application.householdData.complete = true för alla hushåll',
      },
      {
        bpmnNodeId: 'stakeholder',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Stakeholder',
        action: 'Kunden fyller i stakeholder-information (multi-instance per stakeholder, sekventiellt per hushåll)',
        uiInteraction: 'Fyll i formulär för huvudansökande och medsökare med persondata, klicka "Spara" per stakeholder',
        apiCall: 'POST /api/application/{id}/stakeholders (eller motsvarande API)',
        assertion: 'Stakeholder-information är sparad och validerad för alla stakeholders',
        backendState: 'Application.stakeholderData.complete = true för alla stakeholders',
      },
      {
        bpmnNodeId: 'object',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Object',
        action: 'Kunden fyller i objektinformation (sekventiellt efter Stakeholder per hushåll)',
        uiInteraction: 'Fyll i formulär med fastighetsinformation, välj fastighetstyp, klicka "Spara"',
        apiCall: 'POST /api/application/{id}/object (eller motsvarande API)',
        assertion: 'Objektinformation är sparad och validerad',
        backendState: 'Application.objectData.complete = true',
      },
      {
        bpmnNodeId: 'Activity_0p3rqyp',
        bpmnNodeType: 'ServiceTask',
        bpmnNodeName: 'KALP',
        action: 'Systemet beräknar automatiskt maximalt lånebelopp (KALP) baserat på hushållsaffordability',
        apiCall: 'POST /api/application/{id}/calculate-kalp (eller motsvarande API)',
        assertion: 'KALP är beräknat och högre än ansökt belopp',
        backendState: 'Application.kalpCalculated = true, Application.maxLoanAmount > Application.requestedAmount',
      },
      {
        bpmnNodeId: 'Activity_1mezc6h',
        bpmnNodeType: 'BusinessRuleTask',
        bpmnNodeName: 'Screen KALP',
        action: 'Systemet utvärderar KALP-resultatet mot affärsregler',
        dmnDecision: 'screen-kalp (DMN)',
        assertion: 'Screen KALP returnerar APPROVED',
        backendState: 'Application.kalpScreenResult = "APPROVED"',
      },
      {
        bpmnNodeId: 'confirm-application',
        bpmnNodeType: 'UserTask',
        bpmnNodeName: 'Confirm application',
        action: 'Kunden bekräftar ansökan',
        uiInteraction: 'Granska sammanfattning av ansökan för alla hushåll och stakeholders, klicka "Bekräfta ansökan"',
        apiCall: 'POST /api/application/{id}/confirm (eller motsvarande API)',
        assertion: 'Ansökan är bekräftad och redo för kreditevaluering',
        backendState: 'Application.status = "CONFIRMED", Application.readyForCreditEvaluation = true',
      },
      {
        bpmnNodeId: 'fetch-credit-information',
        bpmnNodeType: 'ServiceTask',
        bpmnNodeName: 'Fetch credit information',
        action: 'Systemet hämtar kreditinformation från externa källor för alla stakeholders (multi-instance)',
        apiCall: 'GET /api/credit-information/{stakeholderId} (eller motsvarande integrationer)',
        assertion: 'Kreditinformation är hämtad för alla stakeholders',
        backendState: 'Application.creditInformationFetched = true för alla stakeholders',
      },
    ],
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'internal-data-gathering',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-internal-data-gathering-v2.html',
        description:
          'Intern datainsamling – systemet hämtar befintlig kunddata automatiskt för alla parter (multi-instance).',
        hasPlaywrightSupport: false,
        given:
          'Flera personer är identifierade och har befintlig data i banksystemen (customer-multi-household).',
        when:
          'Systemet hämtar intern kunddata automatiskt för alla parter parallellt och gör pre-screening mot grundläggande krav.',
        then:
          'Kundens basinformation finns tillgänglig för alla parter och pre-screening är godkänd för alla parter.',
      },
      {
        order: 2,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'household',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-household-v2.html',
        description:
          'Hushållsekonomi – kunden fyller i inkomster, utgifter, lån och tillgångar för varje hushåll (multi-instance).',
        hasPlaywrightSupport: false,
        given:
          'Flera hushåll som ska utvärderas för ansökan, med behov av komplett ekonomisk information per hushåll.',
        when:
          'Kunden fyller i inkomster, utgifter, lån och tillgångar per hushåll i household-formuläret. Kunden kan se status för varje hushåll.',
        then:
          'Hushållsekonomi är komplett för alla hushåll och kan användas för KALP-beräkning och kreditbedömning.',
      },
      {
        order: 3,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'stakeholder',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-stakeholder-v2.html',
        description:
          'Stakeholder-information – kunden fyller i personuppgifter för alla parter (multi-instance, sekventiellt per hushåll).',
        hasPlaywrightSupport: false,
        given:
          'Huvudansökande och medsökare som ska ingå i ansökan, med separata hushåll.',
        when:
          'Kunden fyller i stakeholder-formulär med persondata för alla parter. Systemet bearbetar varje stakeholder sekventiellt per hushåll.',
        then:
          'Alla definierade parter har kompletta och validerade stakeholder-profiler kopplade till ansökan.',
      },
      {
        order: 4,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'object',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-application-object-v2.html',
        description:
          'Objektinformation – kunden anger uppgifter om bostadsrätt/fastighet (sekventiellt efter Stakeholder per hushåll).',
        hasPlaywrightSupport: false,
        given:
          'En bostadsrätt/fastighet som kunden vill köpa och som ska ligga till grund för lånet.',
        when:
          'Kunden fyller i objektformulär med uppgifter om bostadsrätt/fastighet (adress, typ, pris, etc.).',
        then:
          'Objektinformationen är komplett och uppfyller kraven för att kunna värderas och användas som säkerhet.',
      },
      {
        order: 5,
        bpmnFile: 'mortgage-se-application.bpmn',
        description:
          'Bekräfta ansökan – sammanfattning visas för alla hushåll och stakeholders, kunden bekräftar ansökan innan den går vidare till kreditevaluering.',
        hasPlaywrightSupport: false,
        given:
          'Intern data, hushåll, stakeholders och objektinformation är komplett och validerad för alla hushåll.',
        when:
          'Kunden granskar en sammanfattning av ansökan för alla hushåll och stakeholders och klickar på "Bekräfta ansökan".',
        then:
          'Ansökan markeras som komplett och kan skickas vidare till kreditevaluering utan blockerande fel.',
      },
    ],
  },
  {
    id: 'E2E_BR001',
    name: 'E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)',
    priority: 'P0',
    type: 'happy-path',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage.bpmn',
    bpmnCallActivityId: undefined,
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    featureGoalTestId: 'E2E-BR-001 - Komplett flöde',
    testFile:
      'tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts',
    summary:
      'Komplett E2E-scenario för en person som köper sin första bostadsrätt. Bostadsrätten uppfyller alla kriterier automatiskt (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%, plats acceptabel). INGEN befintlig fastighet att sälja. Går genom hela flödet från Application till Disbursement.',
    given:
      'En person köper sin första bostadsrätt. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening). Bostadsrätten uppfyller alla kriterier automatiskt: värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV-ratio ≤ 85%, plats är acceptabel (inte riskområde). INGEN befintlig fastighet att sälja. Testdata: customer-standard, application-commitment-happy, object-bostadsratt-happy, object-info-apartment.',
    when:
      'Kunden fyller i Application (intern data, hushåll, stakeholder, objekt). Systemet godkänner Mortgage Commitment automatiskt. Object Valuation hämtar bostadsrättsvärdering. Object Information hämtar BRF-information och screenar bostadsrätten (föreningsskuld, LTV, plats). Credit Evaluation godkänner automatiskt. KYC godkänns automatiskt med självdeklaration. Credit Decision godkänner. Kunden accepterar Offer. Document Generation genererar dokument. Kunden signerar digitalt. Disbursement genomförs.',
    then:
      'Hela processen från Application till Disbursement slutförs utan fel. Bostadsrätt är godkänd automatiskt. Alla DMN-beslut returnerar APPROVED. Alla gateway-beslut går genom happy path. Utbetalning är slutförd och dokument är arkiverade. Processen avslutas normalt.',
    notesForBankProject:
      'Detta är det enklaste och vanligaste E2E-scenariot - en person, ingen befintlig fastighet, allt godkänns automatiskt. Teststeg och subprocesser kommer att valideras och läggas till stegvis.',
    bankProjectTestSteps: [],
    subprocessSteps: [],
  },
];

const E2eTestsOverviewPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIteration, setFilterIteration] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

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

  // Filtrera scenarier baserat på sökning och filter
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
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
                Visar {filteredScenarios.length} av {scenarios.length} scenarier
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
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>BPMN‑fil</TableHead>
                                <TableHead>Feature Goal</TableHead>
                                <TableHead>Beskrivning</TableHead>
                                <TableHead className="min-w-[120px]">Given</TableHead>
                                <TableHead className="min-w-[120px]">When</TableHead>
                                <TableHead className="min-w-[120px]">Then</TableHead>
                                <TableHead>Playwright‑stöd</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.subprocessSteps.map((step) => {
                                const rowId = `${s.id}-step-${step.order}`;
                                return (
                                  <TableRow key={rowId}>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {step.order}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                      {step.bpmnFile}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {step.featureGoalFile ? (
                                        <code className="text-[11px] font-mono break-all">
                                          {step.featureGoalFile}
                                        </code>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">{step.description}</TableCell>
                                    <TableCell className="text-xs">
                                      {step.given ? (
                                        <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                          {step.given}
                                        </p>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {step.when ? (
                                        <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                          {step.when}
                                        </p>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {step.then ? (
                                        <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                          {step.then}
                                        </p>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
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
                          <p className="text-xs whitespace-pre-line">{s.given}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">When</p>
                          <p className="text-xs whitespace-pre-line">{s.when}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Then</p>
                          <p className="text-xs whitespace-pre-line">{s.then}</p>
                        </div>
                      </div>

                      {/* Vad som faktiskt behöver testas i bankprojektet (baserat på BPMN-noder) */}
                      {s.bankProjectTestSteps && s.bankProjectTestSteps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Teststeg för bankprojektet (baserat på faktiska BPMN-noder)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Dessa teststeg är direkt användbara i bankprojektet. Varje steg är baserat på faktiska BPMN-noder från{' '}
                            <code className="font-mono">{s.bpmnProcess}</code> och Feature Goals.
                          </p>
                          <div className="overflow-x-auto max-w-full">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[100px]">BPMN‑nod</TableHead>
                                  <TableHead className="min-w-[80px]">Typ</TableHead>
                                  <TableHead className="min-w-[200px]">Action</TableHead>
                                  <TableHead className="min-w-[150px]">UI‑interaktion</TableHead>
                                  <TableHead className="min-w-[150px]">API‑anrop / DMN</TableHead>
                                  <TableHead className="min-w-[200px]">Assertion</TableHead>
                                  <TableHead className="min-w-[150px]">Backend‑tillstånd</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {s.bankProjectTestSteps.map((testStep, idx) => (
                                  <TableRow key={`${s.id}-teststep-${idx}`}>
                                    <TableCell className="text-xs">
                                      <div className="flex flex-col gap-1">
                                        <code className="text-[11px] font-mono">{testStep.bpmnNodeId}</code>
                                        <span className="text-[10px] text-muted-foreground">{testStep.bpmnNodeName}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <Badge variant="outline" className="text-[10px]">
                                        {testStep.bpmnNodeType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                        {testStep.action}
                                      </p>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {testStep.uiInteraction ? (
                                        <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                          {testStep.uiInteraction}
                                        </p>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {testStep.apiCall ? (
                                        <code className="text-[11px] font-mono break-all whitespace-pre-line">
                                          {testStep.apiCall}
                                        </code>
                                      ) : testStep.dmnDecision ? (
                                        <code className="text-[11px] font-mono break-all">
                                          DMN: {testStep.dmnDecision}
                                        </code>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                                        {testStep.assertion}
                                      </p>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {testStep.backendState ? (
                                        <code className="text-[11px] font-mono break-all whitespace-pre-line">
                                          {testStep.backendState}
                                        </code>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">–</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

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

