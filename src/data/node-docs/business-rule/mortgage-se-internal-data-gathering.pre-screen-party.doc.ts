import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-internal-data-gathering.bpmn
 * elementId: pre-screen-party
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-internal-data-gathering.bpmn::pre-screen-party
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
    'Regeln för intern förhandsgranskning av part används tidigt i kreditresan för att göra en första bedömning av om en kund eller medpart är lämplig att gå vidare med. Den analyserar grundläggande interna uppgifter som kundrelation, historik, engagemang och eventuella interna spärrar innan mer resurskrävande kontroller genomförs. Syftet är att så tidigt som möjligt sortera bort uppenbart olämpliga eller blockerade parter och prioritera de ärenden där fördjupad kreditprövning är motiverad. Regeln omfattar inte fullständig kreditprövning eller externa upplysningar som hanteras i senare steg.',

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
      name: 'Etablerad kund utan interna spärrar',
      type: 'Happy',
      input:
        'Kund med aktiv relation, stabil engagemangsbild och inga interna varningar eller spärrar i interna system.',
      outcome:
        'Regeln markerar kunden som preliminärt godtagbar och ärendet går vidare till fullständig kreditutvärdering.',
    },
    {
      id: 'BR2',
      name: 'Intern varning kräver manuell prövning',
      type: 'Edge',
      input:
        'Kund med intern observanda, exempelvis tidigare avtalsbrott eller noteringar om betalningsproblem, men utan tydlig blockering.',
      outcome:
        'Regeln flaggar kunden för manuell granskning, och fortsatt handläggning kräver aktivt ställningstagande från behörig funktion.',
    },
    {
      id: 'BR3',
      name: 'Intern spärr stoppar vidare handläggning',
      type: 'Edge',
      input:
        'Kund eller part med aktiv intern spärr, exempelvis resultat av tidigare beslut eller särskild riskklassificering.',
      outcome:
        'Regeln stoppar ärendet från att gå vidare i den automatiska processen och rekommenderar avslag eller särskild hantering enligt gällande rutin.',
    },
    {
      id: 'BR4',
      name: 'Ofullständig intern databild',
      type: 'Error',
      input:
        'Ny eller nyligen migrerad kund där centrala interna uppgifter saknas eller inte kan läsas in korrekt.',
      outcome:
        'Regeln kan inte göra en säker förhandsbedömning, loggar avvikelsen och skickar ärendet till manuell utredning innan processen får fortsätta.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas mot automatiska DMN- och API-tester där scenario-ID och namn återanvänds i testfallens benämningar. Testerna ska säkerställa att etablerade kunder godkänns, varningsfall flaggas för manuell bedömning, kunder med spärr stoppas samt att ofullständig intern data leder till kontrollerad felhantering.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
