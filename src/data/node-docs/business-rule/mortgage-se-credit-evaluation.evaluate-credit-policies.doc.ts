import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-credit-evaluation.bpmn
 * elementId: evaluate-credit-policies
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-credit-evaluation.bpmn::evaluate-credit-policies
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
    'Regeln för kreditpolicyevaluering kontrollerar att bolåneansökan följer bankens övergripande kreditprinciper innan ett slutligt ställningstagande görs. Den används i kreditutvärderingen för att verifiera att definierade policytak, exklusionskriterier och särskilda villkor är uppfyllda för den aktuella kunden och produkten. Fokus ligger på att identifiera ärenden som tydligt uppfyller kraven, som ligger i gråzon och kräver manuell bedömning eller som faller utanför tillåtna ramar. Regeln omfattar inte eftermarknadsändringar eller produktkampanjer som styrs av separata regelverk.',

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
      name: 'Ansökan följer kreditpolicyn fullt ut',
      type: 'Happy',
      input:
        'Kund som uppfyller definierade riktvärden för skuldkvot, belåningsgrad och betalningshistorik utan några aktiva exklusionskriterier.',
      outcome:
        'Regeln bekräftar att kreditpolicyn är uppfylld och lämnar ärendet vidare till efterföljande beslut utan krav på ytterligare åtgärder.',
    },
    {
      id: 'BR2',
      name: 'Gråzon mot ett eller flera policyriktvärden',
      type: 'Edge',
      input:
        'Kund med värden nära fastställda gränser för skuldkvot eller belåningsgrad (exempelvärde) men utan tydliga övriga riskindikationer.',
      outcome:
        'Regeln markerar att kreditpolicyn delvis är uppfylld men kräver manuell bedömning och dokumenterade avvägningar innan beslut.',
    },
    {
      id: 'BR3',
      name: 'Tydlig överträdelse av exklusionskriterier',
      type: 'Edge',
      input:
        'Kund med aktiv exkluderande riskfaktor, exempelvis allvarliga betalningsanmärkningar eller andra hårda policykriterier.',
      outcome:
        'Regeln anger att ansökan inte kan beviljas inom ordinarie mandat och rekommenderar avslag eller särskild beslutsinstans enligt rutin.',
    },
    {
      id: 'BR4',
      name: 'Teknisk eller datamässig avvikelse',
      type: 'Error',
      input:
        'Underlag för en eller flera kritiska policykontroller saknas, är tekniskt felaktigt eller kan inte tolkas.',
      outcome:
        'Regeln avbryter auto-bedömningen, loggar avvikelsen och dirigerar ärendet till manuell hantering med information om vad som behöver kompletteras.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas mot automatiska DMN- och API-tester där scenario-ID och namn används i testfallens benämningar. Testerna ska säkerställa att regeln identifierar full policyefterlevnad, gråzoner, tydliga överträdelser och tekniska avvikelser på ett konsekvent sätt.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
