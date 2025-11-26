import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-evaluation.bpmn
 * elementId: evaluate-application
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-evaluation.bpmn::evaluate-application
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
    'Regeln för övergripande ansökningsbedömning väger samman centrala risk- och kreditparametrar för att avgöra om en bolåneansökan ligger inom bankens riktlinjer. Den används i kreditutvärderingen när nödvändiga kontroller är genomförda och ett preliminärt ställningstagande ska tas. Syftet är att ge ett konsekvent besked om ansökan bör gå vidare, kräver fördjupad granskning eller ska avslås utifrån definierade policyprinciper. Regeln omfattar inte detaljerad produktutformning, prissättning eller eftermarknadsaktiviteter som hanteras i andra steg.',

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
      name: 'Stabil ansökan inom samtliga riktvärden',
      type: 'Happy',
      input:
        'Kund med god riskklass, skuldkvot under riktvärde (exempelvärde), belåningsgrad under fastställt tak (exempelvärde) och inga negativa policyflaggor.',
      outcome:
        'Regeln ger beslut att ansökan är godtagbar inom ordinarie mandat och går vidare utan manuell granskning.',
    },
    {
      id: 'BR2',
      name: 'Blandad riskbild kräver manuell utvärdering',
      type: 'Edge',
      input:
        'Kund med medelhög riskklass, skuldkvot nära riktvärde (exempelvärde) eller belåningsgrad nära övre gräns (exempelvärde) samt viss historik som behöver tolkas.',
      outcome:
        'Regeln markerar att ansökan inte kan auto-bedömas, skapar ärende för manuell kreditbedömning och flaggar relevanta riskfaktorer.',
    },
    {
      id: 'BR3',
      name: 'Tydlig överskridning av policygränser',
      type: 'Edge',
      input:
        'Kund med hög skuldkvot över definierat tak (exempelvärde) eller belåningsgrad över högsta tillåtna nivå (exempelvärde) samt ytterligare riskflaggor.',
      outcome:
        'Regeln ger rekommendation om avslag enligt kreditpolicy, med möjlighet för manuell instans att bekräfta eller justera utifrån särskilda skäl.',
    },
    {
      id: 'BR4',
      name: 'Ofullständigt eller tekniskt felaktigt underlag',
      type: 'Error',
      input:
        'Väsentliga data som engagemangsbild, skulder eller inkomster saknas, är motstridiga eller har inte kunnat hämtas.',
      outcome:
        'Regeln stoppar auto-beslut, markerar ansökan som ofullständig och skickar ärendet till manuell hantering med information om vilka uppgifter som saknas.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 ska ligga till grund för automatiska DMN-, API- och end-to-end-tester där scenario-ID och namn återfinns i testfallens benämningar. Testerna bör säkerställa att beslut, flaggning och hantering av ofullständiga ärenden följer den beskrivna logiken.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
