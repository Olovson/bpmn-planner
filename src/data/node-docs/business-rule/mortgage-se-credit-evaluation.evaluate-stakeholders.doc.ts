import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-evaluation.bpmn
 * elementId: evaluate-stakeholders
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-evaluation.bpmn::evaluate-stakeholders
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
    'Regeln för intressentbedömning analyserar vilka parter som ingår i bolåneengagemanget och hur deras roller, riskprofil och ekonomiska ansvar påverkar kreditbeslutet. Den används i kreditutvärderingen för att säkerställa att samtliga låntagare, medlåntagare och eventuella borgensmän bedöms samlat och i enlighet med bankens riktlinjer. Syftet är att identifiera konstellationer som är stabila, som kräver fördjupad analys eller som inte är förenliga med gällande riskmandat. Regeln omfattar inte detaljerad juridisk dokumentation, som hanteras i separata processer.',

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
      name: 'Två låntagare med balanserat ansvar',
      type: 'Happy',
      input:
        'Två låntagare med stabila inkomster, jämförbar skuldsättning och tydligt dokumenterad fördelning av betalningsansvar.',
      outcome:
        'Regeln bedömer intressentkonstellationen som stabil och förenlig med kreditpolicy, vilket stödjer ett positivt kreditbeslut.',
    },
    {
      id: 'BR2',
      name: 'Asymmetrisk intressentbild kräver fördjupad analys',
      type: 'Edge',
      input:
        'En låntagare med huvuddelen av inkomsterna och en medlåntagare med begränsad betalningsförmåga eller osäkra inkomster.',
      outcome:
        'Regeln markerar behov av manuell granskning, inklusive bedömning av om ansvarsfördelningen är rimlig och tillräckligt dokumenterad.',
    },
    {
      id: 'BR3',
      name: 'Komplex struktur med borgensåtagande',
      type: 'Edge',
      input:
        'Bolåneengagemang där en tredje part står som borgensman och hushållets samlade riskexponering blir svåröverskådlig.',
      outcome:
        'Regeln flaggar konstellationen som komplex och rekommenderar manuell bedömning enligt särskilda riktlinjer för borgensåtaganden.',
    },
    {
      id: 'BR4',
      name: 'Ofullständig eller motstridig information om parter',
      type: 'Error',
      input:
        'Uppgifter om låntagare, medlåntagare eller borgensmän saknas, är dubblerade eller motsäger varandra.',
      outcome:
        'Regeln avbryter auto-bedömningen, loggar avvikelsen och skickar ärendet till manuell utredning med krav på kompletterande underlag.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas till automatiska DMN- och API-tester där scenario-ID och namn återfinns i testfall och testrapporter. Testerna ska verifiera att regeln hanterar stabila, asymmetriska, komplexa samt felaktigt registrerade intressentkonstellationer på ett konsekvent sätt.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
