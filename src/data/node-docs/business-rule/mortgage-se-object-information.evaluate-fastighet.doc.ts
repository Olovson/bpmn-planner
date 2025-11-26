import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-object-information.bpmn
 * elementId: evaluate-fastighet
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-object-information.bpmn::evaluate-fastighet
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
  summary: 'Denna affärsregel används i bolåneflödet för att fatta ett avgränsat beslut baserat på strukturerad kund- och ansökningsdata. Syftet är att säkerställa en konsekvent tillämpning av kreditpolicy och riskprinciper för den aktuella delen av processen.',

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
      name: 'Normalfall inom riktlinjer',
      type: 'Happy',
      input:
        'Underlag som uppfyller definierade riktvärden för risk och återbetalningsförmåga utan negativa flaggor.',
      outcome:
        'Regeln ger ett positivt utfall inom ordinarie mandat och processen kan fortsätta utan manuell avvikelsehantering.',
    },
    {
      id: 'BR2',
      name: 'Gränsfall som kräver manuell granskning',
      type: 'Edge',
      input:
        'Underlag som ligger nära en eller flera trösklar i policyn eller innehåller osäkerheter som inte kan avgöras automatiskt.',
      outcome:
        'Regeln flaggar ärendet för manuell granskning och ger vägledning om vilka faktorer som behöver bedömas.',
    },
    {
      id: 'BR3',
      name: 'Tydlig överträdelse av beslutskriterier',
      type: 'Edge',
      input:
        'Underlag som tydligt ligger utanför fastställda gränser eller uppfyller exklusionskriterier.',
      outcome:
        'Regeln ger ett avslag eller motsvarande negativt utfall i enlighet med kreditpolicy.',
    },
    {
      id: 'BR4',
      name: 'Tekniskt fel eller ofullständig data',
      type: 'Error',
      input:
        'Nyckeldata kan inte läsas in, valideras eller tolkas på ett säkert sätt.',
      outcome:
        'Regeln avbryter automatisk bedömning, loggar avvikelsen och kräver manuell hantering.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription: 'Scenarierna BR1–BR4 ska mappas mot automatiska DMN- och API-tester där scenario-ID och namn återfinns i testfallens benämningar. Testerna ska verifiera normalfall, gränsfall, tydliga avslag samt tekniska fel eller ofullständig data.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
