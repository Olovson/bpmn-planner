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

export const scenarios: E2eScenario[] = [
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
      'Komplett E2E-scenario för en person som köper sin första bostadsrätt. Bostadsrätten uppfyller alla kriterier automatiskt (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%, plats acceptabel). INGEN befintlig fastighet att sälja. Går genom hela flödet från Application till Collateral Registration.',
    given:
      'En person köper sin första bostadsrätt. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening). Bostadsrätten uppfyller alla kriterier automatiskt: värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV-ratio ≤ 85%, plats är acceptabel (inte riskområde). INGEN befintlig fastighet att sälja. Testdata: customer-standard, application-commitment-happy, object-bostadsratt-happy, object-info-apartment.',
    when:
      'Kunden fyller i Application (intern data, hushåll, stakeholder, objekt). Mortgage Commitment blir godkänd automatiskt baserat på Credit Evaluation och kunden bekräftar beslutet. Object Valuation hämtar bostadsrättsvärdering. Object Information hämtar BRF-information och screenar bostadsrätten (föreningsskuld, LTV, plats). Credit Evaluation godkänner automatiskt. KYC godkänns automatiskt med självdeklaration. Credit Decision godkänner. Kunden accepterar Offer. Document Generation genererar dokument. Kunden signerar digitalt. Disbursement genomförs. Needs collateral registration gateway = Yes. Collateral Registration registrerar säkerhet och handläggaren distribuerar meddelande om panträtt till BRF.',
    then:
      'Hela processen från Application till Collateral Registration slutförs utan fel. Bostadsrätt är godkänd automatiskt. Alla relevanta DMN-beslut ger utfall som leder till happy path (t.ex. APPROVED, låg risk, inga avvikelser). Alla gateway-beslut går genom happy path. Utbetalning är slutförd och dokument är arkiverade. Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Processen avslutas normalt.',
    notesForBankProject:
      'Detta är det enklaste och vanligaste E2E-scenariot - en person, ingen befintlig fastighet, allt godkänns automatiskt. Alla teststeg nedan är baserade på faktiska BPMN-noder från mortgage.bpmn och Feature Goals, direkt användbara i bankprojektet. Implementera UI-interaktioner, API-anrop och assertions enligt era faktiska integrationer.',
    bankProjectTestSteps: [
      {
        bpmnNodeId: 'application',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Application',
        action: 'Kunden fyller i komplett ansökan (intern data, objekt, hushåll, stakeholder)',
        uiInteraction:
          'Navigate: application-start (nav-application). Navigate: household (/application/household). Navigate: register-household-economy (/application/household/register). Fill: expenses-cars-loans (bilar + billån), expenses-children (barn), expenses-child-support (underhållsbidrag), expenses-other (andra utgifter), incomes-child-support (underhållsbidrag), incomes-other (andra inkomster). Click: submit-button. Verify: success-message. Navigate: stakeholders (nav-stakeholders) → stakeholder (nav-stakeholder). Navigate: register-personal-economy-information (/application/stakeholder/personal-economy). Fill: input-personal-income (löner, andra inkomster), input-personal-expenses (boende, transport, andra utgifter). Click: btn-submit-personal-economy. Verify: success-message. Navigate: object (nav-object). Select: select-property-type (Bostadsrätt). Fill: input-property-valuation. Click: btn-submit-object. Navigate: confirm-application (nav-confirm-application). Verify: summary-all-data (visar intern data, hushåll, stakeholder, objekt). Click: btn-confirm-application. Verify: success-message (ansökan bekräftad).',
        apiCall: 'GET /api/party/information (fetch-party-information), GET /api/party/engagements (fetch-engagements), GET /api/stakeholder/personal-information (fetch-personal-information), POST /api/valuation/property (valuate-property), POST /api/application/kalp, POST /api/application/fetch-credit-information',
        dmnDecision: 'Pre-screen Party DMN = APPROVED, Evaluate Bostadsrätt DMN = APPROVED, Screen KALP DMN = APPROVED',
        assertion: 'Ansökan är komplett och redo för kreditevaluering. All data är insamlad (intern data, hushåll, stakeholder, objekt). Pre-screen Party DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp.',
        backendState: 'Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true',
      },
      {
        bpmnNodeId: 'is-purchase',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Is purchase?',
        action: 'Gateway avgör om ansökan är för köp',
        dmnDecision: 'is-purchase gateway decision',
        assertion: 'Gateway returnerar Yes (köp)',
        backendState: 'Application.purpose = "PURCHASE"',
      },
      {
        bpmnNodeId: 'mortgage-commitment',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Mortgage commitment',
        action: 'Systemet godkänner mortgage commitment automatiskt och kund fattar beslut',
        uiInteraction:
          'Navigate: decide-on-mortgage-commitment (/mortgage-commitment/decide). Review: credit-evaluation-1 approved (visas i UI). Fill: input-mortgage-commitment-decision (välj "Won bidding round / Interested in object"). Click: btn-submit-mortgage-commitment. Verify: decide-on-mortgage-commitment-confirmation (success-message).',
        apiCall: 'GET /api/object/brf-information (fetch-brf-information), POST /api/mortgage-commitment/decision',
        dmnDecision: 'mortgage-commitment-decision gateway = "Won bidding round / Interested in object", is-object-approved = Yes, is-terms-approved = Yes, won-bidding-round = Yes',
        assertion: 'Mortgage commitment är godkänd automatiskt. Kund har vunnit budgivning. Objekt är godkänt. Inga villkor har ändrats. Processen avslutas normalt.',
        backendState: 'MortgageCommitment.status = "APPROVED", MortgageCommitment.wonBiddingRound = true, MortgageCommitment.objectApproved = true, MortgageCommitment.termsChanged = false',
      },
      {
        bpmnNodeId: 'object-valuation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Object valuation',
        action: 'Systemet hämtar bostadsrättsvärdering',
        apiCall: 'GET /api/valuation/bostadsratt/{objectId}',
        assertion: 'Värdering är hämtad och sparad',
        backendState: 'Object.valuation.complete = true, Object.valuation.value >= 1500000',
      },
      {
        bpmnNodeId: 'credit-evaluation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Automatic Credit Evaluation',
        action: 'Systemet utvärderar kredit automatiskt',
        apiCall: 'POST /api/pricing/price (fetch-price), POST /api/stacc/affordability (calculate-household-affordability), GET /api/credit/personal-information (fetch-credit-information), POST /api/risk/classification (fetch-risk-classification), POST /api/credit-evaluation',
        assertion: 'Kreditevaluering är godkänd automatiskt',
        backendState: 'CreditEvaluation.status = "APPROVED", CreditEvaluation.automaticallyApproved = true',
      },
      {
        bpmnNodeId: 'is-automatically-approved',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Automatically approved?',
        action: 'Gateway avgör om ansökan kan godkännas automatiskt',
        dmnDecision: 'is-automatically-approved gateway decision',
        assertion: 'Gateway returnerar Yes (auto-approved)',
        backendState: 'Application.automaticallyApproved = true',
      },
      {
        bpmnNodeId: 'kyc',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'KYC',
        action: 'Systemet genomför KYC-screening automatiskt med självdeklaration',
        uiInteraction:
          'Navigate: kyc-start (nav-kyc). Navigate: submit-self-declaration. Fill: input-pep-status (No), input-source-of-funds (standard: lön, försäljning fastighet), input-purpose-of-transaction. Click: btn-submit-declaration. Verify: success-message-kyc-approved.',
        apiCall: 'GET /api/kyc/{customerId}, POST /api/kyc/aml-risk-score, POST /api/kyc/sanctions-pep-screening, POST /api/dmn/evaluate-kyc-aml',
        dmnDecision: 'evaluate-kyc-aml (DMN: table-bisnode-credit, table-own-experience) = APPROVED, gateway-needs-review = No',
        assertion: 'KYC är godkänd automatiskt med självdeklaration. Självdeklaration är skickad. AML/KYC riskpoäng <30, ingen PEP/sanktionsmatch. Evaluate KYC/AML DMN returnerar APPROVED. Needs review = No (auto-approved). Processen avslutas normalt.',
        backendState: 'KYC.status = "APPROVED", KYC.needsReview = false, KYC.amlRiskScore < 30, KYC.pepMatch = false, KYC.sanctionsMatch = false, KYC.selfDeclarationSubmitted = true',
      },
      {
        bpmnNodeId: 'credit-decision',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Credit decision',
        action: 'Systemet fattar kreditbeslut',
        apiCall: 'POST /api/credit-decision',
        assertion: 'Kreditbeslut är godkänt',
        backendState: 'CreditDecision.status = "APPROVED"',
      },
      {
        bpmnNodeId: 'is-credit-approved',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Credit approved?',
        action: 'Gateway avgör om kredit är godkänd',
        dmnDecision: 'is-credit-approved gateway decision',
        assertion: 'Gateway returnerar Yes (credit approved)',
        backendState: 'CreditDecision.approved = true',
      },
      {
        bpmnNodeId: 'offer',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Offer preparation',
        action: 'Systemet förbereder erbjudande och kunden accepterar',
        uiInteraction:
          'Navigate: offer-start. Navigate: decide-offer (user task). Review: offer-details (validera lånebelopp, kontonummer, datum). Click: offer-decision-accept (Accept offer button). Verify: success-message (erbjudande accepterat).',
        apiCall: 'GET /api/offer/{applicationId}, POST /api/offer/accept',
        dmnDecision: 'sales-contract-assessed = Yes (för happy path), offer-decision gateway = "Accept offer"',
        assertion: 'Erbjudande är accepterat. Kunden har bekräftat lånebelopp, kontonummer, datum och villkor. Offer decision gateway = "Accept offer". Processen fortsätter till Document generation.',
        backendState: 'Offer.status = "ACCEPTED", Offer.decision = "ACCEPT", Offer.contractAssessed = true, Offer.loanAmount = validated, Offer.accountNumber = validated, Offer.dates = validated',
      },
      {
        bpmnNodeId: 'document-generation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Document generation',
        action: 'Systemet genererar lånedokument',
        apiCall: 'POST /api/document-generation/prepare-loan (prepare-loan), POST /api/document-generation/generate-documents (generate-documents)',
        assertion: 'Dokument är genererade',
        backendState: 'DocumentGeneration.status = "COMPLETE", DocumentGeneration.documents.length > 0',
      },
      {
        bpmnNodeId: 'signing',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Signing',
        action: 'Kunden signerar dokument digitalt',
        uiInteraction:
          'Navigate: signing-start. Select: signing-methods = Digital. Navigate: per-digital-document-package (multi-instance per dokumentpaket). Navigate: per-signee (multi-instance per signatär). Navigate: per-sign-order (multi-instance per signeringsorder). Sign: digital-signature (PADES). Verify: signing-completed success.',
        apiCall: 'POST /api/signing/upload-document, POST /api/signing/create-sign-order, POST /api/signing/digital-signature (PADES), POST /api/signing/store-signed-document',
        dmnDecision: 'signing-methods gateway = Digital (inclusive gateway, för happy path)',
        assertion: 'Dokument är signerade digitalt (PADES) och sparade. Alla dokumentpaket, signatärer och signeringsorder är signerade. Signeringsorder är skapade i Signing provider datastore.',
        backendState: 'Signing.status = "COMPLETE", Signing.allDocumentsSigned = true, Signing.method = "DIGITAL", Signing.signatureType = "PADES", Signing.allSignOrdersComplete = true',
      },
      {
        bpmnNodeId: 'disbursement',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Disbursement',
        action: 'Systemet genomför utbetalning och arkiverar dokument',
        apiCall: 'POST /api/disbursement/handle (handle-disbursement), POST /api/disbursement/archive-documents (archive-documents)',
        assertion: 'Utbetalning är slutförd och dokument är arkiverade',
        backendState: 'Disbursement.status = "COMPLETE", Disbursement.documentsArchived = true',
      },
      {
        bpmnNodeId: 'needs-collateral-registration',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Needs collateral registration?',
        action: 'Gateway avgör om säkerhetsregistrering behövs',
        dmnDecision: 'needs-collateral-registration gateway decision = Yes',
        assertion: 'Gateway returnerar Yes (säkerhetsregistrering behövs)',
        backendState: 'Application.needsCollateralRegistration = true',
      },
      {
        bpmnNodeId: 'collateral-registration',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Collateral registration',
        action: 'Systemet registrerar säkerhet och handläggaren distribuerar meddelande om panträtt till BRF',
        uiInteraction:
          'Navigate: collateral-registration-start. Property type gateway = Bostadsrätt. Navigate: distribute-notice-of-pledge-to-brf. Handläggaren distribuerar meddelande om panträtt till BRF (via post/e-post eller portal). Navigate: verify (om timer event triggas). Handläggaren verifierar registreringen. Is verified? gateway = Yes.',
        apiCall: 'POST /api/collateral-registration/distribute-notice (distribute-notice-of-pledge-to-brf), POST /api/collateral-registration/verify (verify)',
        dmnDecision: 'property-type gateway = Bostadsrätt, is-verified gateway = Yes',
        assertion: 'Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Verifiering är bekräftad.',
        backendState: 'CollateralRegistration.status = "VERIFIED", CollateralRegistration.propertyType = "BOSTADSRATT", CollateralRegistration.distributed = true, CollateralRegistration.verified = true',
      },
    ],
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'application',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
        description: 'Application – Komplett ansökan med en person',
        hasPlaywrightSupport: false,
        given: 'En person ansöker om bolån för köp. Personen uppfyller alla grundläggande krav (godkänd vid pre-screening via Pre-screen Party DMN). Fastigheten är bostadsrätt och uppfyller bankens krav (godkänd vid bedömning via Evaluate Bostadsrätt DMN). Testdata: customer-standard.',
        when: 'Kunden navigerar till ansökningsstart (nav-application). Systemet hämtar automatiskt befintlig kunddata via GET /api/party/information (fetch-party-information) och GET /api/party/engagements (fetch-engagements) och fyller i relevanta fält i ansökningsformuläret som kunden kan granska och vid behov ändra. Kunden navigerar till hushållsekonomi (/application/household → /application/household/register) och fyller i expenses-cars-loans (bilar + billån), expenses-children (barn), expenses-child-support (underhållsbidrag), expenses-other (andra utgifter), incomes-child-support (underhållsbidrag), incomes-other (andra inkomster) och bekräftar (submit-button). Systemet hämtar personlig information för stakeholder via GET /api/stakeholder/personal-information (fetch-personal-information). Kunden navigerar till personlig ekonomi (/application/stakeholder/personal-economy) och fyller i input-personal-income (löner, andra inkomster), input-personal-expenses (boende, transport, andra utgifter) och bekräftar (btn-submit-personal-economy). Kunden navigerar till objekt (nav-object), väljer objekttyp (select-property-type: Bostadsrätt) och anger värdering (input-property-valuation). Systemet värderar fastigheten via POST /api/valuation/property (valuate-property). Systemet beräknar automatiskt maximalt lånebelopp via POST /api/application/kalp och screenar resultatet (Screen KALP DMN = APPROVED). Kunden navigerar till sammanfattning (nav-confirm-application), granskar all information (summary-all-data: visar intern data, hushåll, stakeholder, objekt) och bekräftar ansökan (btn-confirm-application). Systemet hämtar kreditinformation automatiskt via POST /api/application/fetch-credit-information.',
        then: 'Ansökan är komplett och redo för kreditevaluering. All data är insamlad (intern data, hushåll, stakeholder, objekt). Pre-screen Party DMN returnerar APPROVED. Screen KALP DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Backend state: Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true. Processen avslutas normalt (Event_0j4buhs) och ansökan är redo för kreditevaluering.',
        subprocessesSummary:
          'internal-data-gathering (CallActivity → mortgage-se-internal-data-gathering.bpmn). stakeholder (CallActivity → mortgage-se-stakeholder.bpmn). household (CallActivity → mortgage-se-household.bpmn). object (CallActivity → mortgage-se-object.bpmn). confirm-application (UserTask).',
        serviceTasksSummary:
          'fetch-party-information (internal-data-gathering). fetch-engagements (internal-data-gathering). fetch-personal-information (stakeholder). valuate-property (object). KALP (application). fetch-credit-information (application).',
        userTasksSummary:
          'register-household-economy-information (Household – kunden fyller i hushållsekonomi). register-personal-economy-information (Stakeholder – kunden fyller i personlig ekonomi). confirm-application (kunden bekräftar ansökan).',
        businessRulesSummary:
          'Pre-screen Party DMN (förhandsbedömning av kund). Evaluate Bostadsrätt DMN (bedömning av objekt). Screen KALP DMN (bedömning av KALP-resultat).',
      },
      {
        order: 2,
        bpmnFile: 'mortgage-se-mortgage-commitment.bpmn',
        callActivityId: 'mortgage-commitment',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-mortgage-commitment-v2.html',
        description: 'Mortgage Commitment – Kund vinner budgivning',
        hasPlaywrightSupport: false,
        given: 'Ansökan är klar för köp-engagemang. Objekt är inte utvärderat. Testdata: application-commitment-happy.',
        when: 'Automatic Credit Evaluation (credit-evaluation-1) godkänner. "Is mortgage commitment approved?" gateway (is-mortgage-commitment-approved) = Yes. "Mortgage commitment ready" message event triggas. Kund fattar beslut (decide-mortgage-commitment user task). "Mortgage commitment decision?" gateway (mortgage-commitment-decision) = "Won bidding round / Interested in object". "Is object evaluated?" gateway (is-object-evaluated) = No. Object information samlas (object-information call activity, fetch-brf-information service task). "Object rejected?" gateway (is-object-approved) = No (objekt godkänt). "Has terms changed?" gateway (has-terms-changed) = No. "Is terms approved?" gateway (is-terms-approved) = Yes. "Won bidding round?" gateway (won-bidding-round) = Yes.',
        then: 'Processen avslutas normalt (Event_0az10av). Går vidare till Credit evaluation. MortgageCommitment.status = "APPROVED", MortgageCommitment.wonBiddingRound = true, MortgageCommitment.objectApproved = true.',
        subprocessesSummary:
          'credit-evaluation-1 (CallActivity → mortgage-se-credit-evaluation.bpmn). object-information (CallActivity → mortgage-se-object-information.bpmn).',
        serviceTasksSummary:
          'fetch-brf-information (object-information – hämtar BRF-information för objektet).',
        userTasksSummary:
          'decide-mortgage-commitment (kunden fattar beslut om köpintresse/bud). won-bidding-round (UserTask – markera vinst i budgivningen).',
        businessRulesSummary:
          'Gateways: is-mortgage-commitment-approved, is-object-evaluated, is-object-approved, has-terms-changed, is-terms-approved, won-bidding-round (styr flödet i subprocessen).',
      },
      {
        order: 3,
        bpmnFile: 'mortgage-se-object-valuation.bpmn',
        callActivityId: 'object-valuation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-object-valuation-v2.html',
        description: 'Object Valuation – Hämtar bostadsrättsvärdering',
        hasPlaywrightSupport: false,
        given: 'Objekt är bostadsrätt. Extern tjänst (Bostadsrätt valuation service) är tillgänglig. Testdata: object-bostadsratt-happy.',
        when: '"Object type" gateway (object-type) identifierar objektet som bostadsrätt. "Fetch bostadsrätts-valuation" service task (fetch-bostadsratts-valuation) hämtar värdering från Bostadsrätt valuation service datastore (DataStoreReference_1cdjo60).',
        then: 'Värdering sparas i datastoren. Gateway_0f8c0ne sammanstrålar flödet. Processen avslutas normalt (process-end-event). Värdering returneras till huvudprocessen. Object.valuation.complete = true, Object.valuation.value >= 1500000.',
        subprocessesSummary: 'Inga ytterligare call activities i happy path (ren servicetask-baserad subprocess).',
        serviceTasksSummary:
          'fetch-fastighets-valuation (för småhus). fetch-bostadsratts-valuation (för bostadsrätt – används i detta scenario).',
        userTasksSummary: 'Inga user tasks i denna subprocess i happy path.',
        businessRulesSummary:
          'object-type gateway (avgör typ av objekt: småhus vs bostadsrätt).',
      },
      {
        order: 4,
        bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
        callActivityId: 'credit-evaluation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-credit-evaluation-v2.html',
        description: 'Credit Evaluation – Automatisk kreditevaluering',
        hasPlaywrightSupport: false,
        given: 'Automatic Credit Evaluation-processen startar. Ansökan har 1 stakeholder, 1 hushåll. Kreditinformation behövs inte. Testdata: application-standard-credit-evaluation.',
        when: '"Select product" business rule task (select-product) väljer produkt. "Fetch price" service task (fetch-price) hämtar prissättning från Pricing engine. "Determine amortisation" business rule task (determine-amortisation) beräknar amortering. "For each stakeholder" multi-instance (loop-stakeholder): "Needs updated Credit information?" gateway (needs-updated-credit-information) = No. "For each household" multi-instance (loop-household): "Calculate household affordability" service task (calculate-household-affordability) beräknar affordability via Stacc API. "Fetch risk classification" service task (fetch-risk-classification) hämtar riskklassificering. "Evaluate application" business rule task (evaluate-application) utvärderar ansökan. "Evaluate credit policies" business rule task (evaluate-credit-policies) utför policyutvärdering.',
        then: 'Alla steg lyckas. Processen avslutas normalt (process-end-event). Resultat returneras till anropande processen. CreditEvaluation.status = "APPROVED", CreditEvaluation.automaticallyApproved = true.',
        subprocessesSummary:
          'loop-stakeholder (multi-instance per stakeholder). loop-household (multi-instance per hushåll).',
        serviceTasksSummary:
          'fetch-price (hämtar pris från Pricing engine). calculate-household-affordability (beräknar hushållsaffordability via Stacc). fetch-risk-classification (hämtar riskklassificering). fetch-credit-information (hämtar kreditinformation när det behövs).',
        userTasksSummary: 'Inga user tasks i Automatic Credit Evaluation i happy path (ren STP-process).',
        businessRulesSummary:
          'select-product (BusinessRuleTask, DMN). determine-amortisation (BusinessRuleTask, DMN). evaluate-application (BusinessRuleTask, DMN). evaluate-credit-policies (BusinessRuleTask, DMN). needs-updated-credit-information gateway (avgör om kreditinformation ska hämtas).',
      },
      {
        order: 5,
        bpmnFile: 'mortgage-se-kyc.bpmn',
        callActivityId: 'kyc',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-kyc-v2.html',
        description: 'KYC – Godkänd automatiskt med självdeklaration',
        hasPlaywrightSupport: false,
        given: 'Ny kund utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch. Testdata: customer-standard.',
        when: '"KYC questions needed?" gateway (kyc-questions-needed) = Yes. "Fetch KYC" service task (fetch-kyc) hittar ingen befintlig data. Självdeklaration skickas (submit-self-declaration user task: PEP-status = No, källa till medel = standard, syfte = köp bostadsrätt). "Fetch AML / KYC risk score" service task (fetch-aml-kyc-risk) hämtar riskpoäng (< 30). "Fetch sanctions and PEP" service task (fetch-screening-and-sanctions) hämtar screening (ingen match). "Evaluate KYC/AML" business rule task (assess-kyc-aml) godkänner via DMN (table-bisnode-credit, table-own-experience).',
        then: '"Needs review?" gateway (needs-review) = No. Processen avslutas normalt (process-end-event). KYC godkänd automatiskt. KYC.status = "APPROVED", KYC.needsReview = false, KYC.amlRiskScore < 30, KYC.pepMatch = false, KYC.sanctionsMatch = false.',
        subprocessesSummary: 'Inga ytterligare call activities i happy path (enkel KYC-subprocess).',
        serviceTasksSummary:
          'fetch-kyc (hämtar befintlig KYC-data). fetch-aml-kyc-risk (hämtar AML/KYC-riskpoäng). fetch-screening-and-sanctions (hämtar PEP/sanktionsscreening).',
        userTasksSummary:
          'submit-self-declaration (kunden fyller i självdeklaration kring PEP, källa till medel, syfte).',
        businessRulesSummary:
          'assess-kyc-aml (BusinessRuleTask/DMN – table-bisnode-credit, table-own-experience). kyc-questions-needed gateway. needs-review gateway.',
      },
      {
        order: 6,
        bpmnFile: 'mortgage-se-credit-decision.bpmn',
        callActivityId: 'credit-decision',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-credit-decision-v2.html',
        description: 'Credit Decision – Kreditbeslut godkänt',
        hasPlaywrightSupport: false,
        given: 'Credit decision-processen startar. Ansökan har låg risk. KYC är godkänd. Kreditevaluering är godkänd. Testdata: credit-decision-low-risk.',
        when: '"Determine decision escalation" business rule task (determine-decision-escalation) utvärderar ansökan. "Decision criteria?" gateway (decision-criteria) = Straight through (automatiskt godkännande).',
        then: 'Gateway_1lhswyt (Final Decision) samlar ihop resultatet. Processen avslutas normalt (process-end-event). Godkänt beslut returneras till anropande processen. CreditDecision.status = "APPROVED".',
        subprocessesSummary: 'Inga ytterligare subprocesser i happy path (enkel beslutsprocess).',
        serviceTasksSummary: 'Inga rena service tasks i denna subprocess i happy path.',
        userTasksSummary: 'Inga user tasks i denna subprocess i happy path (STP-baserat beslut).',
        businessRulesSummary:
          'determine-decision-escalation (BusinessRuleTask, DMN). decision-criteria gateway (avgör Straight through vs Four eyes).',
      },
      {
        order: 7,
        bpmnFile: 'mortgage-se-offer.bpmn',
        callActivityId: 'offer',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-offer-v2.html',
        description: 'Offer – Erbjudande accepterat',
        hasPlaywrightSupport: false,
        given: 'Köpekontrakt är redan bedömt. Erbjudande är redo. Kreditbeslut är godkänt. Testdata: offer-contract-assessed-happy.',
        when: '"Sales contract assessed?" gateway (sales-contract-assessed) = Yes. Processen hoppar över kontraktuppladdning. "Decide on offer" user task (decide-offer) aktiveras. Kunden accepterar erbjudandet (validerar lånebelopp, kontonummer, datum).',
        then: '"Decision" gateway (offer-decision) = "Accept offer". Processen avslutas normalt (process-end-event). Går vidare till Document Generation. Offer.status = "ACCEPTED", Offer.decision = "ACCEPT".',
        subprocessesSummary:
          'Sales contract flow (upload/assessment) finns som alternativt flöde men används inte i denna happy path (sales-contract-assessed = Yes).',
        serviceTasksSummary: 'Inga dedikerade service tasks i happy path (kontrakt redan bedömt).',
        userTasksSummary:
          'decide-offer (kunden granskar erbjudande och accepterar – belopp, kontonummer, datum).',
        businessRulesSummary:
          'sales-contract-assessed gateway (avgör om kontraktflöde ska köras). offer-decision gateway (Accept offer / Avvisa).',
      },
      {
        order: 8,
        bpmnFile: 'mortgage-se-document-generation.bpmn',
        callActivityId: 'document-generation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-document-generation-v2.html',
        description: 'Document Generation – Genererar lånedokument',
        hasPlaywrightSupport: false,
        given: 'Document generation-processen startar. Låneansökan för köp, offer accepterad. Testdata: document-generation-standard.',
        when: '"Prepare loan" service task (Activity_1qsvac1) förbereder lånet med all nödvändig information (loan parts, loan numbers, party-information, objektinformation). "Select documents" business rule task (select-documents) väljer 3 dokumenttyper via DMN-beslutsregler. "Generate Document" service task (generate-documents, multi-instance) genererar alla 3 dokument parallellt. Dokument sparas till Document generation service data store (DataStoreReference_1px1m7r).',
        then: 'Alla 3 dokument genererade och lagrade. Processen avslutas normalt (Event_1vwpr3l). Dokument tillgängliga för signering. DocumentGeneration.status = "COMPLETE", DocumentGeneration.documents.length > 0.',
        subprocessesSummary: 'Multi-instance över dokumentuppsättningar via generate-documents (ingen separat call activity i happy path).',
        serviceTasksSummary:
          'prepare-loan (Activity_1qsvac1 – förbereder lånet). generate-documents (multi-instance – genererar alla dokument).',
        userTasksSummary: 'Inga user tasks i document-generation i happy path.',
        businessRulesSummary:
          'select-documents (BusinessRuleTask, DMN – väljer dokumentuppsättning beroende på scenario).',
      },
      {
        order: 9,
        bpmnFile: 'mortgage-se-signing.bpmn',
        callActivityId: 'signing',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-signing-v2.html',
        description: 'Signing – Digital signering',
        hasPlaywrightSupport: false,
        given: 'Signing-processen startar. Digital signering väljs. Ett dokumentpaket, en signee, en sign order. Signing provider är tillgänglig. Dokument är genererade. Testdata: signing-digital-happy.',
        when: '"Signing methods?" gateway (signing-methods) avgör "Digital" (inclusive gateway). "Per digital document package" subprocess (per-digital-document-package, multi-instance) laddar upp dokument (upload-document service task) och skapar signeringsorder (create-signing-order service task). "Per signee" subprocess (per-signee, multi-instance) notifierar signee. "Per sign order" subprocess (per-sign-order, multi-instance) väntar på "Task completed" message event (Event_18v8q1a). "Sign order status" gateway (sign-order-status) avgör "Completed". "Store signed documents" service task (store-signed-document) lagrar dokument med PADES-signatur.',
        then: 'Processen avslutas normalt (Event_0lxhh2n). Signing.status = "COMPLETE", Signing.allDocumentsSigned = true, Signing.method = "DIGITAL", Signing.signatureType = "PADES".',
        subprocessesSummary:
          'per-digital-document-package (multi-instance per dokumentpaket). per-signee (multi-instance per signee). per-sign-order (multi-instance per sign order).',
        serviceTasksSummary:
          'upload-document (laddar upp dokument till signeringsleverantör). create-signing-order (skapar signeringsorder). store-signed-document (lagrar signerade dokument).',
        userTasksSummary:
          'Digital signering sker via extern signeringslösning (ingen explicit BPMN-UserTask i huvudprocessen, men användaren signerar i signeringsflödet).',
        businessRulesSummary:
          'signing-methods gateway (avgör Digital vs Manual). sign-order-status gateway (Completed vs övriga status).',
      },
      {
        order: 10,
        bpmnFile: 'mortgage-se-disbursement.bpmn',
        callActivityId: 'disbursement',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-disbursement-v2.html',
        description: 'Disbursement – Utbetalning och arkivering',
        hasPlaywrightSupport: false,
        given: 'Disbursement-processen startar. Signering är klar. Dokument är signerade. Testdata: disbursement-standard.',
        when: '"Handle disbursement" service task (handle-disbursement) genomför utbetalning via Core system data store. Event-based gateway (Gateway_15wjsxm) väntar på event. "Disbursement completed" message event (disbursement-completed) triggas från Core system. "Archive documents" service task (archive-documents) arkiverar dokument till Document archive service.',
        then: 'Utbetalning är slutförd. Dokument är arkiverade. Processen avslutas normalt (Event_0gubmbi). "event-loan-paid-out" triggas i huvudprocessen. Disbursement.status = "COMPLETE", Disbursement.documentsArchived = true.',
        subprocessesSummary:
          'Event-based gateway (Gateway_15wjsxm) som väntar på disbursement events (completed/cancelled).',
        serviceTasksSummary:
          'handle-disbursement (genomför utbetalning via Core system). archive-documents (arkiverar dokument).',
        userTasksSummary: 'Inga user tasks i disbursement i happy path (helt automatiskt flöde).',
        businessRulesSummary:
          'Event-baserad styrning via Gateway_15wjsxm (disbursement-completed vs disbursement-cancelled).',
      },
      {
        order: 11,
        bpmnFile: 'mortgage-se-collateral-registration.bpmn',
        callActivityId: 'collateral-registration',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-collateral-registration-v2.html',
        description: 'Collateral Registration – Registrering av säkerhet',
        hasPlaywrightSupport: false,
        given: 'Lånet har betalats ut (event-loan-paid-out). Säkerhetsregistrering behövs (needs-collateral-registration = Yes). Fastigheten är bostadsrätt. Fastighetsinformation är tillgänglig från Application-processen. Testdata: collateral-registration-bostadsratt-happy.',
        when: '"Property type" gateway (property-type) avgör "Bostadsrätt". Handläggaren distribuerar meddelande om panträtt till BRF via "Distribute notice of pledge to BRF" user task (distribute-notice-of-pledge-to-brf). "Sammanför flöden" gateway samlar flöden. "Vänta på verifiering" event-based gateway väntar på verifiering. "Verified" message event mottas automatiskt (eller "Wait for system update" timer event triggas och handläggaren verifierar via "Verify" user task). "Is verified?" gateway (is-verified) = Yes.',
        then: 'Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Verifiering är bekräftad. Processen avslutas normalt. "event-collateral-registration-completed" triggas i huvudprocessen. CollateralRegistration.status = "VERIFIED", CollateralRegistration.propertyType = "BOSTADSRATT", CollateralRegistration.distributed = true, CollateralRegistration.verified = true.',
        subprocessesSummary:
          'Inga ytterligare call activities i happy path (enkel subprocess med user tasks och gateways).',
        serviceTasksSummary:
          'Inga service tasks i happy path för bostadsrätt (distribution sker via user task).',
        userTasksSummary:
          'distribute-notice-of-pledge-to-brf (handläggaren distribuerar meddelande om panträtt till BRF). verify (handläggaren verifierar registreringen om timer event triggas).',
        businessRulesSummary:
          'property-type gateway (avgör småhus vs bostadsrätt). is-verified gateway (avgör om verifiering är godkänd).',
      },
    ],
  },
  {
    id: 'E2E_BR006',
    name: 'E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt (Happy Path, medsökare)',
    priority: 'P0',
    type: 'happy-path',
    iteration: 'Köp bostadsrätt',
    bpmnProcess: 'mortgage.bpmn',
    bpmnCallActivityId: undefined,
    featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
    featureGoalTestId: 'E2E-BR-006 - Två sökande, bostadsrätt, happy path',
    testFile:
      'tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-two-applicants-happy.spec.ts',
    command:
      'npx playwright test tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-two-applicants-happy.spec.ts',
    summary:
      'Komplett E2E-scenario för två personer (huvudansökande + medsökare) som köper bostadsrätt tillsammans. Bostadsrätten uppfyller alla kriterier automatiskt (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%, plats acceptabel). INGEN befintlig fastighet att sälja. Multi-instance för hushåll och stakeholders. Går genom hela flödet från Application till Collateral Registration.',
    given:
      'Två personer (huvudansökande och medsökare) köper sin första gemensamma bostadsrätt. Båda uppfyller alla grundläggande krav (godkända vid pre-screening). Bostadsrätten uppfyller alla kriterier automatiskt: värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV-ratio ≤ 85%, plats är acceptabel (inte riskområde). INGEN befintlig fastighet att sälja. Det finns 2 stakeholders och minst 1 hushåll som ska konfigureras. Testdata: customer-standard-primary, customer-standard-coapplicant, application-commitment-happy, object-bostadsratt-happy, object-info-apartment.',
    when:
      'Kunden fyller i Application med multi-instance för hushåll och stakeholders (Household → Stakeholder → Object per hushåll). Båda personerna fyller i sin hushållsekonomi och personliga ekonomi. Systemet godkänner Mortgage Commitment automatiskt. Object Valuation hämtar bostadsrättsvärdering. Object Information hämtar BRF-information och screenar bostadsrätten (föreningsskuld, LTV, plats) för hela engagemanget. Credit Evaluation kör multi-instance för alla stakeholders och hushåll och godkänner automatiskt. Båda personerna genomgår KYC (multi-instance per stakeholder) och KYC godkänns automatiskt med självdeklaration. Credit Decision godkänner. Huvudansökande (och ev. medsökare) accepterar Offer. Document Generation genererar dokument för båda. Båda signerar digitalt (multi-instance i Signing). Disbursement genomförs. Needs collateral registration gateway = Yes. Collateral Registration registrerar säkerhet och handläggaren distribuerar meddelande om panträtt till BRF.',
    then:
      'Hela processen från Application till Collateral Registration slutförs utan fel för två sökande. Bostadsrätt är godkänd automatiskt. Alla DMN-beslut returnerar APPROVED. Alla gateway-beslut går genom happy path. Båda personerna är KYC-godkända och inkluderade i kreditevalueringen. Utbetalning är slutförd och dokument är arkiverade. Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Processen avslutas normalt.',
    notesForBankProject:
      'Detta scenario bygger vidare på E2E_BR001 men testar multi-instance för hushåll, stakeholders, KYC och Credit Evaluation. Alla teststeg nedan är baserade på samma BPMN-noder som E2E_BR001, men med fokus på att båda sökande hanteras korrekt. Implementera UI-interaktioner, API-anrop och assertions så att multi-instance (flere stakeholders/hushåll) täcks i bankens riktiga E2E-tester.',
    bankProjectTestSteps: [
      {
        bpmnNodeId: 'application',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Application',
        action:
          'Kunderna (huvudansökande + medsökare) fyller i komplett ansökan med multi-instance för hushåll och stakeholders (Household → Stakeholder → Object per hushåll).',
        uiInteraction:
          'Navigate: application-start (nav-application). Navigate: household (/application/household). För varje hushåll: Navigate: register-household-economy (/application/household/register). Fill: expenses-cars-loans, expenses-children, expenses-child-support, expenses-other, incomes-child-support, incomes-other för hushållet. Click: submit-button. For each stakeholder in household: Navigate: stakeholders (nav-stakeholders) → stakeholder (nav-stakeholder). Navigate: register-personal-economy-information (/application/stakeholder/personal-economy). Fill: input-personal-income (löner, andra inkomster) och input-personal-expenses (boende, transport, andra utgifter). Click: btn-submit-personal-economy. Navigate: object (nav-object) per hushåll. Select: select-property-type (Bostadsrätt). Fill: input-property-valuation. Click: btn-submit-object. Navigate: confirm-application (nav-confirm-application). Verify: summary-all-data visar båda hushåll och båda stakeholders. Click: btn-confirm-application. Verify: success-message (ansökan bekräftad).',
        apiCall:
          'GET /api/party/information (fetch-party-information) för båda parter, GET /api/party/engagements (fetch-engagements), GET /api/stakeholder/personal-information (fetch-personal-information) per stakeholder, POST /api/valuation/property (valuate-property), POST /api/application/kalp, POST /api/application/fetch-credit-information',
        dmnDecision:
          'Pre-screen Party DMN = APPROVED (för båda parter), Evaluate Bostadsrätt DMN = APPROVED, Screen KALP DMN = APPROVED',
        assertion:
          'Ansökan är komplett och redo för kreditevaluering för två sökande. All data är insamlad för båda (intern data, hushåll, stakeholders, objekt). Pre-screen Party DMN returnerar APPROVED för båda. KALP-beräkning är högre än ansökt belopp givet båda inkomsterna.',
        backendState:
          'Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true, Application.stakeholders.length = 2',
      },
      {
        bpmnNodeId: 'is-purchase',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Is purchase?',
        action: 'Gateway avgör om ansökan är för köp (inte refinansiering).',
        dmnDecision: 'is-purchase gateway decision',
        assertion: 'Gateway returnerar Yes (köp).',
        backendState: 'Application.purpose = "PURCHASE"',
      },
      {
        bpmnNodeId: 'mortgage-commitment',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Mortgage commitment',
        action:
          'Systemet godkänner mortgage commitment automatiskt baserat på båda sökandes information och kund fattar beslut.',
        uiInteraction:
          'Navigate: decide-on-mortgage-commitment (/mortgage-commitment/decide). Review: credit-evaluation-1 approved (visar att båda parter är inkluderade). Fill: input-mortgage-commitment-decision (välj "Won bidding round / Interested in object"). Click: btn-submit-mortgage-commitment. Verify: decide-on-mortgage-commitment-confirmation (success-message).',
        apiCall: 'GET /api/object/brf-information (fetch-brf-information), POST /api/mortgage-commitment/decision',
        dmnDecision:
          'mortgage-commitment-decision gateway = "Won bidding round / Interested in object", is-object-approved = Yes, is-terms-approved = Yes, won-bidding-round = Yes',
        assertion:
          'Mortgage commitment är godkänd automatiskt. Kundparet har vunnit budgivning. Objekt är godkänt. Inga villkor har ändrats. Processen avslutas normalt.',
        backendState:
          'MortgageCommitment.status = "APPROVED", MortgageCommitment.wonBiddingRound = true, MortgageCommitment.objectApproved = true, MortgageCommitment.termsChanged = false',
      },
      {
        bpmnNodeId: 'object-valuation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Object valuation',
        action: 'Systemet hämtar bostadsrättsvärdering för objektet som båda sökande köper.',
        apiCall: 'GET /api/valuation/bostadsratt/{objectId}',
        assertion: 'Värdering är hämtad och sparad.',
        backendState: 'Object.valuation.complete = true, Object.valuation.value >= 1500000',
      },
      {
        bpmnNodeId: 'credit-evaluation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Automatic Credit Evaluation',
        action:
          'Systemet utvärderar kredit automatiskt med multi-instance för båda stakeholders och hushåll (alla inkomster/utgifter beaktas).',
        apiCall:
          'POST /api/pricing/price (fetch-price), POST /api/stacc/affordability (calculate-household-affordability), GET /api/credit/personal-information (fetch-credit-information) per stakeholder, POST /api/risk/classification (fetch-risk-classification), POST /api/credit-evaluation',
        assertion: 'Kreditevaluering är godkänd automatiskt för lånet med två sökande.',
        backendState: 'CreditEvaluation.status = "APPROVED", CreditEvaluation.automaticallyApproved = true',
      },
      {
        bpmnNodeId: 'is-automatically-approved',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Automatically approved?',
        action: 'Gateway avgör om ansökan kan godkännas automatiskt baserat på båda sökandenas profil.',
        dmnDecision: 'is-automatically-approved gateway decision',
        assertion: 'Gateway returnerar Yes (auto-approved).',
        backendState: 'Application.automaticallyApproved = true',
      },
      {
        bpmnNodeId: 'kyc',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'KYC',
        action:
          'Systemet genomför KYC-screening automatiskt med självdeklaration, en gång per stakeholder (multi-instance).',
        uiInteraction:
          'För varje stakeholder: Navigate: kyc-start (nav-kyc). Navigate: submit-self-declaration. Fill: input-pep-status (No), input-source-of-funds (standard: lön, ev. försäljning fastighet), input-purpose-of-transaction. Click: btn-submit-declaration. Verify: success-message-kyc-approved för respektive person.',
        apiCall:
          'GET /api/kyc/{customerId} per stakeholder, POST /api/kyc/aml-risk-score, POST /api/kyc/sanctions-pep-screening, POST /api/dmn/evaluate-kyc-aml',
        dmnDecision:
          'evaluate-kyc-aml (DMN: table-bisnode-credit, table-own-experience) = APPROVED för båda, gateway-needs-review = No',
        assertion:
          'KYC är godkänd automatiskt med självdeklaration för båda sökande. Självdeklaration är skickad för båda. AML/KYC riskpoäng <30, ingen PEP/sanktionsmatch för någon av dem. Evaluate KYC/AML DMN returnerar APPROVED. Needs review = No (auto-approved). Processen avslutas normalt.',
        backendState:
          'KYC.status = "APPROVED" för båda, KYC.needsReview = false, KYC.amlRiskScore < 30, KYC.pepMatch = false, KYC.sanctionsMatch = false, KYC.selfDeclarationSubmitted = true för båda',
      },
      {
        bpmnNodeId: 'credit-decision',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Credit decision',
        action: 'Systemet fattar kreditbeslut baserat på båda sökandenas ekonomiska profil.',
        apiCall: 'POST /api/credit-decision',
        assertion: 'Kreditbeslut är godkänt.',
        backendState: 'CreditDecision.status = "APPROVED"',
      },
      {
        bpmnNodeId: 'is-credit-approved',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Credit approved?',
        action: 'Gateway avgör om kredit är godkänd.',
        dmnDecision: 'is-credit-approved gateway decision',
        assertion: 'Gateway returnerar Yes (credit approved).',
        backendState: 'CreditDecision.approved = true',
      },
      {
        bpmnNodeId: 'offer',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Offer preparation',
        action: 'Systemet förbereder erbjudande baserat på båda sökandenas profil och kunderna accepterar.',
        uiInteraction:
          'Navigate: offer-start. Navigate: decide-offer (user task). Review: offer-details (validera lånebelopp, kontonummer, datum, att båda sökande är med). Click: offer-decision-accept (Accept offer button). Verify: success-message (erbjudande accepterat).',
        apiCall: 'GET /api/offer/{applicationId}, POST /api/offer/accept',
        dmnDecision: 'sales-contract-assessed = Yes (för happy path), offer-decision gateway = "Accept offer"',
        assertion:
          'Erbjudande är accepterat. Kundparet har bekräftat lånebelopp, kontonummer, datum och villkor. Offer decision gateway = "Accept offer". Processen fortsätter till Document generation.',
        backendState:
          'Offer.status = "ACCEPTED", Offer.decision = "ACCEPT", Offer.contractAssessed = true, Offer.loanAmount = validated, Offer.accountNumber = validated, Offer.dates = validated',
      },
      {
        bpmnNodeId: 'document-generation',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Document generation',
        action: 'Systemet genererar lånedokument för lånet där två sökande står som låntagare.',
        apiCall: 'POST /api/document-generation/prepare-loan (prepare-loan), POST /api/document-generation/generate-documents (generate-documents)',
        assertion: 'Dokument är genererade.',
        backendState: 'DocumentGeneration.status = "COMPLETE", DocumentGeneration.documents.length > 0',
      },
      {
        bpmnNodeId: 'signing',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Signing',
        action: 'Båda sökande signerar dokument digitalt.',
        uiInteraction:
          'Navigate: signing-start. Select: signing-methods = Digital. Navigate: per-digital-document-package (multi-instance per dokumentpaket). Navigate: per-signee (multi-instance per signatär – huvudansökande + medsökare). Navigate: per-sign-order (multi-instance per signeringsorder). Sign: digital-signature (PADES) för båda. Verify: signing-completed success.',
        apiCall: 'POST /api/signing/upload-document, POST /api/signing/create-sign-order, POST /api/signing/digital-signature (PADES), POST /api/signing/store-signed-document',
        dmnDecision: 'signing-methods gateway = Digital (inclusive gateway, för happy path)',
        assertion:
          'Dokument är signerade digitalt (PADES) och sparade. Alla dokumentpaket, signatärer (båda sökande) och signeringsorder är signerade. Signeringsorder är skapade i Signing provider datastore.',
        backendState:
          'Signing.status = "COMPLETE", Signing.allDocumentsSigned = true, Signing.method = "DIGITAL", Signing.signatureType = "PADES", Signing.allSignOrdersComplete = true',
      },
      {
        bpmnNodeId: 'disbursement',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Disbursement',
        action: 'Systemet genomför utbetalning och arkiverar dokument.',
        apiCall: 'POST /api/disbursement/handle (handle-disbursement), POST /api/disbursement/archive-documents (archive-documents)',
        assertion: 'Utbetalning är slutförd och dokument är arkiverade.',
        backendState: 'Disbursement.status = "COMPLETE", Disbursement.documentsArchived = true',
      },
      {
        bpmnNodeId: 'needs-collateral-registration',
        bpmnNodeType: 'Gateway',
        bpmnNodeName: 'Needs collateral registration?',
        action: 'Gateway avgör om säkerhetsregistrering behövs',
        dmnDecision: 'needs-collateral-registration gateway decision = Yes',
        assertion: 'Gateway returnerar Yes (säkerhetsregistrering behövs)',
        backendState: 'Application.needsCollateralRegistration = true',
      },
      {
        bpmnNodeId: 'collateral-registration',
        bpmnNodeType: 'CallActivity',
        bpmnNodeName: 'Collateral registration',
        action: 'Systemet registrerar säkerhet och handläggaren distribuerar meddelande om panträtt till BRF',
        uiInteraction:
          'Navigate: collateral-registration-start. Property type gateway = Bostadsrätt. Navigate: distribute-notice-of-pledge-to-brf. Handläggaren distribuerar meddelande om panträtt till BRF (via post/e-post eller portal). Navigate: verify (om timer event triggas). Handläggaren verifierar registreringen. Is verified? gateway = Yes.',
        apiCall: 'POST /api/collateral-registration/distribute-notice (distribute-notice-of-pledge-to-brf), POST /api/collateral-registration/verify (verify)',
        dmnDecision: 'property-type gateway = Bostadsrätt, is-verified gateway = Yes',
        assertion: 'Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Verifiering är bekräftad.',
        backendState: 'CollateralRegistration.status = "VERIFIED", CollateralRegistration.propertyType = "BOSTADSRATT", CollateralRegistration.distributed = true, CollateralRegistration.verified = true',
      },
    ],
    subprocessSteps: [
      {
        order: 1,
        bpmnFile: 'mortgage-se-application.bpmn',
        callActivityId: 'application',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-application-v2.html',
        description: 'Application – Komplett ansökan med två personer (multi-instance hushåll och stakeholders)',
        hasPlaywrightSupport: false,
        given:
          'Två personer ansöker om bolån för köp tillsammans. Båda uppfyller alla grundläggande krav (godkända vid pre-screening via Pre-screen Party DMN). Fastigheten är bostadsrätt och uppfyller bankens krav (godkänd via Evaluate Bostadsrätt DMN). Det finns 2 stakeholders och minst 1 hushåll. Testdata: customer-standard-primary, customer-standard-coapplicant.',
        when:
          'Kunderna navigerar till ansökningsstart (nav-application). Systemet hämtar automatiskt befintlig kunddata via GET /api/party/information och GET /api/party/engagements för båda parter och visar den. För varje hushåll: kunderna fyller i hushållsekonomi i household-formulär (expenses-cars-loans, expenses-children, expenses-child-support, expenses-other, incomes-child-support, incomes-other) och bekräftar. Systemet hämtar personlig information för varje stakeholder via GET /api/stakeholder/personal-information. För varje stakeholder: kunden fyller i personlig ekonomi (inkomster, utgifter) och bekräftar. För varje hushåll: kunderna fyller i objektinformation (Bostadsrätt, värdering) och systemet värderar fastigheten via POST /api/valuation/property. Systemet beräknar automatiskt maximalt lånebelopp via POST /api/application/kalp och screenar resultatet (Screen KALP DMN = APPROVED). Kunderna granskar sammanfattning för båda hushåll och båda stakeholders och bekräftar ansökan. Systemet hämtar kreditinformation automatiskt via POST /api/application/fetch-credit-information.',
        then:
          'Ansökan är komplett och redo för kreditevaluering för två sökande. All data (intern data, hushåll, båda stakeholders, objekt) är insamlad och validerad. Pre-screen Party DMN returnerar APPROVED för båda. Screen KALP DMN returnerar APPROVED. KALP-beräkning är högre än ansökt belopp. Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.stakeholders.length = 2.',
        subprocessesSummary:
          'internal-data-gathering (CallActivity → mortgage-se-internal-data-gathering.bpmn). stakeholder (CallActivity → mortgage-se-stakeholder.bpmn, multi-instance). household (CallActivity → mortgage-se-household.bpmn, multi-instance). object (CallActivity → mortgage-se-object.bpmn). confirm-application (UserTask).',
        serviceTasksSummary:
          'fetch-party-information (internal-data-gathering, per stakeholder). fetch-engagements (internal-data-gathering). fetch-personal-information (stakeholder, per stakeholder). valuate-property (object). KALP (application). fetch-credit-information (application).',
        userTasksSummary:
          'register-household-economy-information (Household – kunderna fyller i hushållsekonomi per hushåll). register-personal-economy-information (Stakeholder – båda sökande fyller i personlig ekonomi). confirm-application (kunden bekräftar ansökan för båda).',
        businessRulesSummary:
          'Pre-screen Party DMN (förhandsbedömning per person). Evaluate Bostadsrätt DMN (bedömning av objekt). Screen KALP DMN (bedömning av KALP-resultat för båda).',
      },
      {
        order: 2,
        bpmnFile: 'mortgage-se-mortgage-commitment.bpmn',
        callActivityId: 'mortgage-commitment',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-mortgage-commitment-v2.html',
        description: 'Mortgage Commitment – Kundparet vinner budgivning',
        hasPlaywrightSupport: false,
        given: 'Ansökan är klar för köp-engagemang med två sökande. Objekt är inte utvärderat. Testdata: application-commitment-happy.',
        when:
          'Automatic Credit Evaluation (credit-evaluation-1) godkänner lånet med två sökande. "Is mortgage commitment approved?" gateway (is-mortgage-commitment-approved) = Yes. "Mortgage commitment ready" message event triggas. Kund fattar beslut (decide-mortgage-commitment user task). "Mortgage commitment decision?" gateway (mortgage-commitment-decision) = "Won bidding round / Interested in object". "Is object evaluated?" gateway (is-object-evaluated) = No. Object information samlas (object-information call activity, fetch-brf-information service task). "Object rejected?" gateway (is-object-approved) = No (objekt godkänt). "Has terms changed?" gateway (has-terms-changed) = No. "Is terms approved?" gateway (is-terms-approved) = Yes. "Won bidding round?" gateway (won-bidding-round) = Yes.',
        then:
          'Processen avslutas normalt (Event_0az10av). Går vidare till Credit evaluation. MortgageCommitment.status = "APPROVED", MortgageCommitment.wonBiddingRound = true, MortgageCommitment.objectApproved = true.',
        subprocessesSummary:
          'credit-evaluation-1 (CallActivity → mortgage-se-credit-evaluation.bpmn, inkluderar båda stakeholders). object-information (CallActivity → mortgage-se-object-information.bpmn).',
        serviceTasksSummary:
          'fetch-brf-information (object-information – hämtar BRF-information för objektet).',
        userTasksSummary:
          'decide-mortgage-commitment (kunden fattar beslut om köpintresse/bud). won-bidding-round (UserTask – markera vinst i budgivningen).',
        businessRulesSummary:
          'Gateways: is-mortgage-commitment-approved, is-object-evaluated, is-object-approved, has-terms-changed, is-terms-approved, won-bidding-round.',
      },
      {
        order: 3,
        bpmnFile: 'mortgage-se-object-valuation.bpmn',
        callActivityId: 'object-valuation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-object-valuation-v2.html',
        description: 'Object Valuation – Hämtar bostadsrättsvärdering',
        hasPlaywrightSupport: false,
        given: 'Objekt är bostadsrätt. Extern tjänst (Bostadsrätt valuation service) är tillgänglig. Testdata: object-bostadsratt-happy.',
        when:
          '"Object type" gateway (object-type) identifierar objektet som bostadsrätt. "Fetch bostadsrätts-valuation" service task (fetch-bostadsratts-valuation) hämtar värdering från Bostadsrätt valuation service datastore (DataStoreReference_1cdjo60).',
        then:
          'Värdering sparas i datastoren. Gateway_0f8c0ne sammanstrålar flödet. Processen avslutas normalt (process-end-event). Värdering returneras till huvudprocessen. Object.valuation.complete = true, Object.valuation.value >= 1500000.',
        subprocessesSummary: 'Inga ytterligare call activities i happy path (ren servicetask-baserad subprocess).',
        serviceTasksSummary:
          'fetch-fastighets-valuation (för småhus). fetch-bostadsratts-valuation (för bostadsrätt – används i detta scenario).',
        userTasksSummary: 'Inga user tasks i denna subprocess i happy path.',
        businessRulesSummary: 'object-type gateway (avgör typ av objekt: småhus vs bostadsrätt).',
      },
      {
        order: 4,
        bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
        callActivityId: 'credit-evaluation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-credit-evaluation-v2.html',
        description: 'Credit Evaluation – Automatisk kreditevaluering med två stakeholders',
        hasPlaywrightSupport: false,
        given:
          'Automatic Credit Evaluation-processen startar. Ansökan har 2 stakeholders och minst 1 hushåll. Kreditinformation behövs inte initialt. Testdata: application-standard-credit-evaluation-two-stakeholders.',
        when:
          '"Select product" business rule task (select-product) väljer produkt. "Fetch price" service task (fetch-price) hämtar prissättning från Pricing engine. "Determine amortisation" business rule task (determine-amortisation) beräknar amortering. "For each stakeholder" multi-instance (loop-stakeholder) bearbetar båda stakeholders: "Needs updated Credit information?" gateway (needs-updated-credit-information) = No (för happy path). "For each household" multi-instance (loop-household): "Calculate household affordability" service task (calculate-household-affordability) beräknar affordability via Stacc API baserat på båda inkomsterna. "Fetch risk classification" service task (fetch-risk-classification) hämtar riskklassificering. "Evaluate application" business rule task (evaluate-application) utvärderar ansökan. "Evaluate credit policies" business rule task (evaluate-credit-policies) utför policyutvärdering.',
        then:
          'Alla steg lyckas. Processen avslutas normalt (process-end-event). Resultat returneras till anropande processen. CreditEvaluation.status = "APPROVED", CreditEvaluation.automaticallyApproved = true. Alla stakeholders och hushåll har beaktats korrekt.',
        subprocessesSummary:
          'loop-stakeholder (multi-instance per stakeholder). loop-household (multi-instance per hushåll).',
        serviceTasksSummary:
          'fetch-price (hämtar pris från Pricing engine). calculate-household-affordability (beräknar hushållsaffordability via Stacc). fetch-risk-classification (hämtar riskklassificering). fetch-credit-information (för de stakeholders där det behövs, ej i denna happy path).',
        userTasksSummary: 'Inga user tasks i Automatic Credit Evaluation i happy path (STP-process).',
        businessRulesSummary:
          'select-product (BusinessRuleTask, DMN). determine-amortisation (BusinessRuleTask, DMN). evaluate-application (BusinessRuleTask, DMN). evaluate-credit-policies (BusinessRuleTask, DMN). needs-updated-credit-information gateway.',
      },
      {
        order: 5,
        bpmnFile: 'mortgage-se-kyc.bpmn',
        callActivityId: 'kyc',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-kyc-v2.html',
        description: 'KYC – Godkänd automatiskt med självdeklaration för två stakeholders',
        hasPlaywrightSupport: false,
        given:
          'Två stakeholders utan befintlig KYC-data. Låg AML-risk, ingen PEP/sanktionsmatch för någon av dem. Testdata: customer-standard-primary, customer-standard-coapplicant.',
        when:
          '"KYC questions needed?" gateway (kyc-questions-needed) = Yes för båda. "Fetch KYC" service task (fetch-kyc) hittar ingen befintlig data. För varje stakeholder: Självdeklaration skickas (submit-self-declaration user task: PEP-status = No, källa till medel = standard, syfte = köp bostadsrätt). "Fetch AML / KYC risk score" service task (fetch-aml-kyc-risk) hämtar riskpoäng (< 30) för båda. "Fetch sanctions and PEP" service task (fetch-screening-and-sanctions) hämtar screening (ingen match). "Evaluate KYC/AML" business rule task (assess-kyc-aml) godkänner via DMN (table-bisnode-credit, table-own-experience).',
        then:
          '"Needs review?" gateway (needs-review) = No för båda stakeholders. Processen avslutas normalt (process-end-event). KYC godkänd automatiskt. KYC.status = "APPROVED", KYC.needsReview = false, KYC.amlRiskScore < 30, KYC.pepMatch = false, KYC.sanctionsMatch = false för båda.',
        subprocessesSummary: 'Inga ytterligare call activities i happy path (en KYC-subprocess med implicit multi-instance per person).',
        serviceTasksSummary:
          'fetch-kyc (hämtar befintlig KYC-data). fetch-aml-kyc-risk (hämtar AML/KYC-riskpoäng). fetch-screening-and-sanctions (hämtar PEP/sanktionsscreening).',
        userTasksSummary:
          'submit-self-declaration (kunden fyller i självdeklaration kring PEP, källa till medel, syfte – per stakeholder).',
        businessRulesSummary:
          'assess-kyc-aml (BusinessRuleTask/DMN – table-bisnode-credit, table-own-experience). kyc-questions-needed gateway. needs-review gateway.',
      },
      {
        order: 6,
        bpmnFile: 'mortgage-se-credit-decision.bpmn',
        callActivityId: 'credit-decision',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-credit-decision-v2.html',
        description: 'Credit Decision – Kreditbeslut godkänt för två sökande',
        hasPlaywrightSupport: false,
        given:
          'Credit decision-processen startar. Ansökan har låg risk totalt givet båda sökandenas profil. KYC är godkänd för båda. Kreditevaluering är godkänd. Testdata: credit-decision-low-risk-two-stakeholders.',
        when:
          '"Determine decision escalation" business rule task (determine-decision-escalation) utvärderar ansökan. "Decision criteria?" gateway (decision-criteria) = Straight through (automatiskt godkännande).',
        then:
          'Gateway_1lhswyt (Final Decision) samlar ihop resultatet. Processen avslutas normalt (process-end-event). Godkänt beslut returneras till anropande processen. CreditDecision.status = "APPROVED".',
        subprocessesSummary: 'Inga ytterligare subprocesser i happy path.',
        serviceTasksSummary: 'Inga rena service tasks i denna subprocess i happy path.',
        userTasksSummary: 'Inga user tasks i denna subprocess i happy path (STP-beslut).',
        businessRulesSummary:
          'determine-decision-escalation (BusinessRuleTask, DMN). decision-criteria gateway (avgör Straight through vs Four eyes).',
      },
      {
        order: 7,
        bpmnFile: 'mortgage-se-offer.bpmn',
        callActivityId: 'offer',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-offer-v2.html',
        description: 'Offer – Erbjudande accepterat av kundparet',
        hasPlaywrightSupport: false,
        given:
          'Köpekontrakt är redan bedömt. Erbjudande är redo. Kreditbeslut är godkänt för lånet där två sökande står som låntagare. Testdata: offer-contract-assessed-happy.',
        when:
          '"Sales contract assessed?" gateway (sales-contract-assessed) = Yes. Processen hoppar över kontraktuppladdning. "Decide on offer" user task (decide-offer) aktiveras. Kundparet accepterar erbjudandet (validerar lånebelopp, kontonummer, datum och att båda parter är korrekt angivna).',
        then:
          '"Decision" gateway (offer-decision) = "Accept offer". Processen avslutas normalt (process-end-event). Går vidare till Document Generation. Offer.status = "ACCEPTED", Offer.decision = "ACCEPT".',
        subprocessesSummary:
          'Sales contract flow (upload/assessment) finns som alternativt flöde men används inte i denna happy path (sales-contract-assessed = Yes).',
        serviceTasksSummary: 'Inga dedikerade service tasks i happy path (kontrakt redan bedömt).',
        userTasksSummary:
          'decide-offer (kunden/kundparet granskar erbjudande och accepterar – belopp, kontonummer, datum).',
        businessRulesSummary:
          'sales-contract-assessed gateway (avgör om kontraktflöde ska köras). offer-decision gateway (Accept offer / Avvisa).',
      },
      {
        order: 8,
        bpmnFile: 'mortgage-se-document-generation.bpmn',
        callActivityId: 'document-generation',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-document-generation-v2.html',
        description: 'Document Generation – Genererar lånedokument för två sökande',
        hasPlaywrightSupport: false,
        given:
          'Document generation-processen startar. Låneansökan för köp, offer accepterad. Två sökande finns kopplade till ansökan. Testdata: document-generation-standard.',
        when:
          '"Prepare loan" service task (Activity_1qsvac1) förbereder lånet med all nödvändig information (loan parts, loan numbers, party-information, objektinformation). "Select documents" business rule task (select-documents) väljer dokumenttyper via DMN-beslutsregler. "Generate Document" service task (generate-documents, multi-instance) genererar alla dokument parallellt. Dokument sparas till Document generation service data store (DataStoreReference_1px1m7r).',
        then:
          'Alla dokument för lånet med två sökande är genererade och lagrade. Processen avslutas normalt (Event_1vwpr3l). Dokument tillgängliga för signering. DocumentGeneration.status = "COMPLETE", DocumentGeneration.documents.length > 0.',
        subprocessesSummary: 'Multi-instance över dokumentuppsättningar via generate-documents.',
        serviceTasksSummary:
          'prepare-loan (Activity_1qsvac1 – förbereder lånet). generate-documents (multi-instance – genererar alla dokument).',
        userTasksSummary: 'Inga user tasks i document-generation i happy path.',
        businessRulesSummary:
          'select-documents (BusinessRuleTask, DMN – väljer dokumentuppsättning beroende på scenario).',
      },
      {
        order: 9,
        bpmnFile: 'mortgage-se-signing.bpmn',
        callActivityId: 'signing',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-signing-v2.html',
        description: 'Signing – Digital signering av båda sökande',
        hasPlaywrightSupport: false,
        given:
          'Signing-processen startar. Digital signering väljs. Ett dokumentpaket, två signees (huvudansökande + medsökare), en sign order. Signing provider är tillgänglig. Dokument är genererade. Testdata: signing-digital-happy.',
        when:
          '"Signing methods?" gateway (signing-methods) avgör "Digital" (inclusive gateway). "Per digital document package" subprocess (per-digital-document-package, multi-instance) laddar upp dokument (upload-document service task) och skapar signeringsorder (create-signing-order service task). "Per signee" subprocess (per-signee, multi-instance) notifierar varje signee (båda sökande). "Per sign order" subprocess (per-sign-order, multi-instance) väntar på "Task completed" message event (Event_18v8q1a). "Sign order status" gateway (sign-order-status) avgör "Completed". "Store signed documents" service task (store-signed-document) lagrar dokument med PADES-signatur.',
        then:
          'Processen avslutas normalt (Event_0lxhh2n). Signing.status = "COMPLETE", Signing.allDocumentsSigned = true, Signing.method = "DIGITAL", Signing.signatureType = "PADES".',
        subprocessesSummary:
          'per-digital-document-package (multi-instance per dokumentpaket). per-signee (multi-instance per signee – två sökande). per-sign-order (multi-instance per signeringsorder).',
        serviceTasksSummary:
          'upload-document (laddar upp dokument till signeringsleverantör). create-signing-order (skapar signeringsorder). store-signed-document (lagrar signerade dokument).',
        userTasksSummary:
          'Digital signering via Signing provider (båda sökande signerar – implicit user interaction i externt gränssnitt).',
        businessRulesSummary:
          'signing-methods gateway (avgör Digital vs Manual). sign-order-status gateway (Completed vs övriga status).',
      },
      {
        order: 10,
        bpmnFile: 'mortgage-se-disbursement.bpmn',
        callActivityId: 'disbursement',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-se-disbursement-v2.html',
        description: 'Disbursement – Utbetalning och arkivering',
        hasPlaywrightSupport: false,
        given:
          'Disbursement-processen startar. Signering är klar och dokument är signerade av båda sökande. Testdata: disbursement-standard.',
        when:
          '"Handle disbursement" service task (handle-disbursement) genomför utbetalning via Core system data store. Event-based gateway (Gateway_15wjsxm) väntar på event. "Disbursement completed" message event (disbursement-completed) triggas från Core system. "Archive documents" service task (archive-documents) arkiverar dokument till Document archive service.',
        then:
          'Utbetalning är slutförd. Dokument är arkiverade. Processen avslutas normalt (Event_0gubmbi). "event-loan-paid-out" triggas i huvudprocessen. Disbursement.status = "COMPLETE", Disbursement.documentsArchived = true.',
        subprocessesSummary:
          'Event-based gateway (Gateway_15wjsxm) som väntar på disbursement events (completed/cancelled).',
        serviceTasksSummary:
          'handle-disbursement (genomför utbetalning via Core system). archive-documents (arkiverar dokument).',
        userTasksSummary: 'Inga user tasks i disbursement i happy path (helt automatiskt flöde).',
        businessRulesSummary:
          'Event-baserad styrning via Gateway_15wjsxm (disbursement-completed vs disbursement-cancelled).',
      },
      {
        order: 11,
        bpmnFile: 'mortgage-se-collateral-registration.bpmn',
        callActivityId: 'collateral-registration',
        featureGoalFile: 'public/local-content/feature-goals/mortgage-collateral-registration-v2.html',
        description: 'Collateral Registration – Registrering av säkerhet',
        hasPlaywrightSupport: false,
        given: 'Lånet har betalats ut (event-loan-paid-out). Säkerhetsregistrering behövs (needs-collateral-registration = Yes). Fastigheten är bostadsrätt. Fastighetsinformation är tillgänglig från Application-processen. Testdata: collateral-registration-bostadsratt-happy.',
        when: '"Property type" gateway (property-type) avgör "Bostadsrätt". Handläggaren distribuerar meddelande om panträtt till BRF via "Distribute notice of pledge to BRF" user task (distribute-notice-of-pledge-to-brf). "Sammanför flöden" gateway samlar flöden. "Vänta på verifiering" event-based gateway väntar på verifiering. "Verified" message event mottas automatiskt (eller "Wait for system update" timer event triggas och handläggaren verifierar via "Verify" user task). "Is verified?" gateway (is-verified) = Yes.',
        then: 'Säkerheten är registrerad och verifierad. Meddelande om panträtt är distribuerat till BRF. Verifiering är bekräftad. Processen avslutas normalt. "event-collateral-registration-completed" triggas i huvudprocessen. CollateralRegistration.status = "VERIFIED", CollateralRegistration.propertyType = "BOSTADSRATT", CollateralRegistration.distributed = true, CollateralRegistration.verified = true.',
        subprocessesSummary:
          'Inga ytterligare call activities i happy path (enkel subprocess med user tasks och gateways).',
        serviceTasksSummary:
          'Inga service tasks i happy path för bostadsrätt (distribution sker via user task).',
        userTasksSummary:
          'distribute-notice-of-pledge-to-brf (handläggaren distribuerar meddelande om panträtt till BRF). verify (handläggaren verifierar registreringen om timer event triggas).',
        businessRulesSummary:
          'property-type gateway (avgör småhus vs bostadsrätt). is-verified gateway (avgör om verifiering är godkänd).',
      },
    ],
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
    else if (view === 'test-coverage') navigate('/test-coverage');
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

