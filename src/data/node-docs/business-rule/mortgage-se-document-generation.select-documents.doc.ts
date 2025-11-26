import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-document-generation.bpmn
 * elementId: select-documents
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-document-generation.bpmn::select-documents
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
    'Regeln för dokumentval styr vilka avtal, bilagor och informationsdokument som ska genereras för ett bolåneärende baserat på kundens situation och vald produkt. Den används i dokumentgenereringssteget efter att kreditbeslut fattats, för att säkerställa att rätt kombination av obligatoriska och villkorsstyrda dokument tas med. Syftet är att uppfylla juridiska och regulatoriska krav samt ge kunden ett komplett och tydligt underlag. Regeln omfattar inte själva utformningen av dokumentens innehåll, som hanteras i mallar och separata processer.',

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
      name: 'Standardbolån till privatkund',
      type: 'Happy',
      input:
        'En privatkund med nytt bolån inom standardvillkor där inga avvikande upplägg eller särskilda tilläggsavtal förekommer.',
      outcome:
        'Regeln väljer grundläggande låneavtal, säkerhetsavtal och standardiserad kundinformation enligt gällande krav.',
    },
    {
      id: 'BR2',
      name: 'Bolån med särskilda villkor',
      type: 'Edge',
      input:
        'Bolåneupplägg med exempelvis räntebindning, amorteringsundantag eller särskilda säkerhetsarrangemang.',
      outcome:
        'Regeln inkluderar både standarddokument och relevanta tilläggsavtal som beskriver de särskilda villkoren.',
    },
    {
      id: 'BR3',
      name: 'Flera låntagare och komplex säkerhetsbild',
      type: 'Edge',
      input:
        'Ärende med flera låntagare, eventuella medlåntagare och säkerheter som omfattar mer än en fastighet.',
      outcome:
        'Regeln väljer ut dokument som säkerställer korrekt ansvarsfördelning och täckning av samtliga säkerheter, och markerar vid behov ärendet för manuell kontroll av dokumentpaketet.',
    },
    {
      id: 'BR4',
      name: 'Teknisk eller datamässig brist i underlaget',
      type: 'Error',
      input:
        'Nödvändig information för att avgöra vilka dokument som krävs saknas eller är tekniskt inkonsistent.',
      outcome:
        'Regeln stoppar automatisk dokumentgenerering, loggar bristen och kräver manuell genomgång innan dokumentpaket kan fastställas.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas mot automatiska DMN-, API- och end-to-end-tester där scenario-ID och namn används i testfallens benämningar. Testerna ska verifiera att rätt dokumentkombination väljs för standardfall, särskilda villkor, komplexa säkerheter samt att felaktigt eller ofullständigt underlag stoppar automatisk dokumentgenerering.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
