import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-decision.bpmn
 * elementId: evaluate-credit-decision-rules
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-decision.bpmn::evaluate-credit-decision-rules
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
    'Regeln för kreditbeslutsbedömning sammanställer resultat från föregående risk- och kreditkontroller till ett samlat kreditbeslut. Den används för bolånekunder i ansökningsflödet när alla centrala kontroller är genomförda och ett slutligt besked ska tas fram. Fokus ligger på att avgöra om ärendet kan godkännas automatiskt, ska skickas till manuell granskning eller ska avslås utifrån definierade policyprinciper. Regeln omfattar inte eftermarknadsändringar eller undantag som hanteras i separata beslutsflöden.',

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
      name: 'Stabil kund inom alla riktvärden',
      type: 'Happy',
      input:
        'Kund med god samlad riskklass, skuldkvot under definierat tak (exempelvärde), belåningsgrad under gränsvärde (exempelvärde) och utan negativa policyflaggor.',
      outcome:
        'Regeln ger beslut APPROVE och ärendet går vidare automatiskt utan manuell granskning.',
    },
    {
      id: 'BR2',
      name: 'Blandad riskbild kräver manuell bedömning',
      type: 'Edge',
      input:
        'Kund med medelhög riskklass, skuldkvot nära riktvärde (exempelvärde) och belåningsgrad strax under taket (exempelvärde) samt enstaka försiktighetsflaggor.',
      outcome:
        'Regeln ger beslut REFER, ansökan placeras i manuell granskning och beslutsunderlaget kompletteras vid behov.',
    },
    {
      id: 'BR3',
      name: 'Tydliga exklusionskriterier ger avslag',
      type: 'Edge',
      input:
        'Kund med samlad riskklass i sämre kategori, skuldkvot tydligt över riktvärde (exempelvärde) eller belåningsgrad över fastställt tak (exempelvärde) samt negativa policyflaggor.',
      outcome:
        'Regeln ger beslut DECLINE och ansökan avslås automatiskt enligt kreditpolicy utan ytterligare maskinell prövning.',
    },
    {
      id: 'BR4',
      name: 'Ofullständig data blockerar auto-beslut',
      type: 'Error',
      input:
        'Centrala riskparametrar som skuldkvot eller belåningsgrad saknas eller är tekniskt inkonsistenta.',
      outcome:
        'Regeln avstår från auto-beslut, loggar felet och ärendet skickas till manuell hantering med tydlig orsak.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 ska mappas mot automatiska DMN- och API-tester där scenario-ID och namn återanvänds i testfallens beskrivningar. Testerna bör verifiera både beslutsutfall, sättet beslutet loggas och att fel- och manuella flöden hanteras enligt angivna scenarier.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
