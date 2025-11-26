import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-evaluation.bpmn
 * elementId: evaluate-household
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-evaluation.bpmn::evaluate-household
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
    'Regeln för hushållsbedömning analyserar den samlade ekonomin för hushållet bakom bolåneansökan, inklusive inkomster, utgifter och befintliga åtaganden. Den används i kreditutvärderingen för att bedöma återbetalningsförmåga på hushållsnivå snarare än enbart per individ. Syftet är att identifiera hushåll som har stabil marginal, ligger i en gråzon eller uppvisar otillräcklig betalningskapacitet enligt bankens riktlinjer. Regeln omfattar inte detaljerad produktvalidering eller efterföljande kunddialog om budget, som hanteras i andra steg.',

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
      name: 'Hushåll med god marginal',
      type: 'Happy',
      input:
        'Två inkomsttagare med stabila inkomster, rimlig skuldsättning och buffert kvar efter boendekostnad och övriga standardutgifter.',
      outcome:
        'Regeln klassar hushållet som bärkraftigt med god marginal, vilket stödjer ett positivt kreditbeslut inom ordinarie mandat.',
    },
    {
      id: 'BR2',
      name: 'Hushåll i ekonomisk gråzon',
      type: 'Edge',
      input:
        'En eller flera inkomsttagare med varierande inkomster, relativt hög andel boendekostnad och begränsad buffert vid normala kostnadsantaganden.',
      outcome:
        'Regeln markerar hushållet som känsligt för förändringar och rekommenderar manuell granskning med fördjupad analys av budget och risk.',
    },
    {
      id: 'BR3',
      name: 'Hushåll med otillräcklig betalningsförmåga',
      type: 'Edge',
      input:
        'Hushållets disponibla inkomst efter rimligt kostnadsantagande understiger fastställt minikrav (exempelvärde) eller visar negativ marginal.',
      outcome:
        'Regeln indikerar att hushållet inte uppfyller kraven för återbetalningsförmåga och rekommenderar avslag eller kraftigt justerad lånevolym.',
    },
    {
      id: 'BR4',
      name: 'Ofullständiga hushållsuppgifter',
      type: 'Error',
      input:
        'Viktiga uppgifter om inkomster, försörjningsbörda eller befintliga lån saknas, är motstridiga eller kan inte valideras.',
      outcome:
        'Regeln stoppar auto-bedömning, loggar vilka delar av hushållsunderlaget som saknas och skickar ärendet till manuell utredning.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör användas som grund för automatiska DMN-, API- och riskmodelltester där scenario-ID och namn återanvänds i testfallens beskrivningar. Testerna ska validera att hushåll med god marginal, gråzonsfall, otillräcklig betalningsförmåga samt ofullständiga underlag behandlas enligt den definierade logiken.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
