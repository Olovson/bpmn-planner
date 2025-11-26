import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-kyc.bpmn
 * elementId: assess-kyc-aml
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-kyc.bpmn::assess-kyc-aml
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: BusinessRuleDocOverrides = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * 
 * 
 * - Business Rule: summary, inputs, decisionLogic, outputs, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems
 */

export const overrides: BusinessRuleDocOverrides = {
  // Sammanfattning av regeln (syfte & scope)
  summary:
    'Regeln för KYC/AML-bedömning granskar kundens identitet, transaktionsmönster och riskindikatorer kopplade till penningtvätt och finansiering av terrorism i samband med bolåneprocessen. Den används i KYC-steget för att klassificera kunder i olika risknivåer, identifiera när förenklade respektive fördjupade åtgärder krävs och när affärsrelation inte kan inledas. Syftet är att säkerställa att bolåneaffärer endast genomförs med kunder som uppfyller lag- och policykrav samt att särskilt riskfyllda situationer eskaleras till specialistfunktion. Regeln omfattar inte den tekniska genomförandet av kundkännedom, som hanteras i underliggande KYC-plattformar.',

  // Inputs & datakällor till regeln
  inputs: ['TODO'],

  // Beslutslogik / regeluppsättning
  decisionLogic: ['TODO'],

  // Output & effekter av beslutet
  outputs: ['TODO'],

  // Policystöd & regler som täcks
  businessRulesPolicy: ['TODO'],

  // Viktiga affärs-scenarion (BR1/BR2/...)
  scenarios: [
    {
      id: 'BR1',
      name: 'Kund med låg KYC/AML-risk',
      type: 'Happy',
      input:
        'Kund med tydlig identitet, stabil bakgrund och inga träffar på sanktions- eller bevakningslistor.',
      outcome:
        'Regeln klassar kunden som låg risk, förenklad uppföljning är tillräcklig och bolåneprocessen kan fortsätta inom ordinarie mandat.',
    },
    {
      id: 'BR2',
      name: 'Kund med förhöjd riskprofil',
      type: 'Edge',
      input:
        'Kund med komplex ägarstruktur, viss exponering mot högriskländer eller avvikande transaktionsmönster utan direkta träffar på sanktionslistor.',
      outcome:
        'Regeln kräver fördjupad kundkännedom, markerar ärendet för manuell granskning och begränsar möjligheten till automatisk fortsatt handläggning.',
    },
    {
      id: 'BR3',
      name: 'Kund med sanktions- eller högriskträff',
      type: 'Edge',
      input:
        'Kund eller verklig huvudman med träff på sanktionslista eller annan allvarlig varning i AML-relaterade register.',
      outcome:
        'Regeln indikerar att affärsrelation inte bör inledas, stoppar processen och eskalerar ärendet till specialistfunktion enligt fastställd rutin.',
    },
    {
      id: 'BR4',
      name: 'Ofullständig eller tekniskt felaktig KYC-data',
      type: 'Error',
      input:
        'Viktiga identitetsuppgifter, ägarinformation eller riskindikatorer saknas eller kan inte läsas in från KYC-system.',
      outcome:
        'Regeln avbryter auto-bedömning, loggar avvikelsen och skickar ärendet till manuell utredning med krav på kompletterande KYC-underlag.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 ska mappas mot automatiska DMN-, API- och eventuella integrerade KYC-plattformstester där scenario-ID och namn återanvänds i testfallens benämningar. Testerna ska säkerställa att låg risk, förhöjd risk, sanktions-/högriskträffar samt ofullständig data hanteras konsekvent enligt KYC/AML-regelverket.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
