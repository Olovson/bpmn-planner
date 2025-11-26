import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-evaluation.bpmn
 * elementId: evaluate-amortisation
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-evaluation.bpmn::evaluate-amortisation
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
    'Regeln för amorteringsbedömning fastställer vilken amorteringsnivå som ska gälla för bolåneengagemanget utifrån kundens riskprofil, belåningsgrad och gällande amorteringsprinciper. Den används i kreditutvärderingen när ett preliminärt kreditbeslut finns och fokus ligger på att säkerställa långsiktig återbetalningsförmåga. Syftet är att tydliggöra när standardamortering räcker, när skärpt amortering behövs och när undantag inte kan beviljas inom ordinarie mandat. Regeln omfattar inte efterföljande omförhandlingar eller generella kampanjvillkor som hanteras i separata flöden.',

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
      name: 'Normal belåningsgrad ger standardamortering',
      type: 'Happy',
      input:
        'Kund med belåningsgrad tydligt under fastställt tröskelvärde (exempelvärde) och samlad riskprofil inom normalspann utan särskilda flaggor.',
      outcome:
        'Regeln rekommenderar standardamortering enligt ordinarie modell och beslutet kan hanteras inom ordinarie mandat.',
    },
    {
      id: 'BR2',
      name: 'Hög belåningsgrad kräver skärpt amortering',
      type: 'Edge',
      input:
        'Kund med belåningsgrad över definierad gräns (exempelvärde) men i övrigt acceptabel riskprofil.',
      outcome:
        'Regeln ger förslag om skärpt amortering, ärendet kan fortfarande beviljas men med högre amorteringskrav enligt policy.',
    },
    {
      id: 'BR3',
      name: 'Kombination av hög risk och hög belåningsgrad',
      type: 'Edge',
      input:
        'Kund med belåningsgrad nära eller över högsta tillåtna nivå (exempelvärde) och riskindikatorer som tyder på svag återbetalningsförmåga.',
      outcome:
        'Regeln markerar att amorteringskraven överstiger vad som är rimligt inom ordinarie mandat och rekommenderar manuell granskning eller avslag.',
    },
    {
      id: 'BR4',
      name: 'Ofullständiga uppgifter om belåning',
      type: 'Error',
      input:
        'Uppgifter om bostadsvärde eller befintlig skuld saknas eller är tekniskt inkonsistenta.',
      outcome:
        'Regeln kan inte räkna fram korrekt amorteringsnivå, stoppar auto-beslut och skickar ärendet till manuell utredning med tydlig felmarkering.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas till automatiska DMN- och API-tester där scenario-ID och namn återanvänds i testfallens beskrivningar. Testerna ska verifiera både föreslagen amorteringsnivå och att reglerna för skärpt amortering, manuell granskning och felhantering följs.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
