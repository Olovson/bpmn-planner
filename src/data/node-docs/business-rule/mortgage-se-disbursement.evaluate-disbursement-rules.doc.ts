import type { BusinessRuleDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-disbursement.bpmn
 * elementId: evaluate-disbursement-rules
 * type: business-rule
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-disbursement.bpmn::evaluate-disbursement-rules
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
    'Regeln för utbetalningsbedömning kontrollerar att alla villkor för utbetalning av bolånet är uppfyllda innan medel kan frigöras. Den används i utbetalningsfasen för att säkerställa att nödvändiga kontroller, dokument och spärrar är hanterade enligt bankens riktlinjer. Syftet är att förhindra felaktiga eller för tidiga utbetalningar, skydda både kund och bank samt säkerställa korrekt flöde till nästa steg. Regeln omfattar inte efterföljande likvidhantering eller bokföring, som hanteras i separata processer.',

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
      name: 'Alla villkor är uppfyllda',
      type: 'Happy',
      input:
        'Samtliga förutsättningar inför utbetalning är markerade som klara, erforderliga kontrollsteg är genomförda och inga spärrar finns aktiva.',
      outcome:
        'Regeln ger klartecken till utbetalning och ärendet går vidare till genomförande utan ytterligare manuell hantering.',
    },
    {
      id: 'BR2',
      name: 'Enstaka villkor kvarstår att uppfylla',
      type: 'Edge',
      input:
        'Merparten av utbetalningsvillkoren är uppfyllda men ett eller flera krav, exempelvis signerat underlag eller bekräftad säkerhet, saknas.',
      outcome:
        'Regeln stoppar utbetalning, markerar vilka villkor som återstår och håller ärendet i vänteläge tills komplettering skett.',
    },
    {
      id: 'BR3',
      name: 'Aktiv spärr eller riskflagga inför utbetalning',
      type: 'Edge',
      input:
        'En spärr eller riskflagga har lagts in efter kreditbeslutet, till exempel misstänkt oegentlighet eller förändrat underlag.',
      outcome:
        'Regeln hindrar utbetalning, flaggar ärendet för manuell granskning och kräver aktivt ställningstagande innan flödet kan fortsätta.',
    },
    {
      id: 'BR4',
      name: 'Tekniskt fel i utbetalningsunderlag',
      type: 'Error',
      input:
        'Utbetalningsinformation är ofullständig, motstridig eller kan inte tolkas av systemet, exempelvis saknat mottagarkonto.',
      outcome:
        'Regeln stoppar utbetalning, loggar felet och dirigerar ärendet till manuell hantering med krav på korrigering av uppgifter.',
    },
  ],

  // Koppling till automatiska tester / DMN-tester
  testDescription:
    'Scenarierna BR1–BR4 bör mappas mot automatiska DMN-, API- och end-to-end-tester där scenario-ID och namn återanvänds i testfallens benämningar. Testerna ska verifiera att utbetalning endast frigörs när alla villkor är uppfyllda, att väntelägen och spärrar hanteras korrekt samt att tekniska fel leder till stopp och tydlig loggning.',

  // Implementation & integrationsnoter
  implementationNotes: ['TODO'],

  // Relaterade DMN-tabeller, regler och subprocesser
  relatedItems: ['TODO'],
};
