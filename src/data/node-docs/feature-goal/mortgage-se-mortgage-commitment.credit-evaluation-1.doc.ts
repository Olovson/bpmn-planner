import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-mortgage-commitment.bpmn
 * elementId: credit-evaluation-1
 * type: feature-goal
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-mortgage-commitment.bpmn::credit-evaluation-1
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: FeatureGoalDocOverrides = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * - Feature Goal: summary, effectGoals, scopeIncluded, scopeExcluded, epics, flowSteps, dependencies, scenarios, testDescription, implementationNotes, relatedItems
 * 
 * 
 */

export const overrides: FeatureGoalDocOverrides = {
  // Kort sammanfattning på Feature Goal-nivå
  summary: 'Detta Feature Goal samlar flera epics till ett sammanhängande steg i bolåneresan där kundens behov, riskprofil och underlag hanteras på ett strukturerat sätt. Målet är att skapa en tydlig brygga mellan föregående processsteg och efterföljande beslut, med fokus på spårbarhet och konsekvent tillämpning av regler.',

  // Effektmål på affärsnivå
  effectGoals: ["Minska manuellt arbete genom ökad grad av automatisering i det aktuella steget av bolåneflödet.","Förbättra kvaliteten i beslutsunderlaget genom att samla data och regler på ett enhetligt sätt.","Skapa en mer förutsägbar kundupplevelse genom tydliga besked och färre omtag."],

  // Scope (Ingår / Ingår inte)
  scopeIncluded: ["Ingår: hantering av de epics som är direkt kopplade till detta steg i bolåneprocessen.","Ingår: insamling och konsolidering av de uppgifter som krävs för att kunna fatta nästa kreditbeslut.","Ingår: tillämpning av relevanta affärsregler och policys på den information som samlas in här."],
  scopeExcluded: ["Ingår inte: generella eftermarknadsprocesser och kundåtgärder utanför det aktuella bolåneärendet.","Ingår inte: detaljerad produktutveckling eller prissättningsstrategi, som hanteras i andra fora."],

  // Ingående epics
  
  epics: [
    {
      id: 'E1',
      name: 'Förberedelse av underlag',
      description:
        'Samlar in och kvalitetssäkrar de uppgifter som behövs för det aktuella Feature Goalet.',
      team: 'Kredit och produktteam',
    },
    {
      id: 'E2',
      name: 'Affärsregler och validering',
      description:
        'Tillämpning av centrala affärsregler och kontroller på insamlade data.',
      team: 'Risk & Policy',
    },
  ],

  // Översiktliga affärsflödessteg
  flowSteps: ["Kund- och ansökningsdata samlas in och förbereds för vidare bearbetning.","Relevanta affärsregler och kontroller tillämpas för att identifiera avvikelser eller kompletteringsbehov.","Resultat och status samlas i en gemensam struktur som kan återanvändas i efterföljande beslutssteg."],

  // Viktiga beroenden
  dependencies: ["Beroende: Kund- och engagemangsregister; Beskrivning: används för att hämta aktuell kund- och skuldinformation.","Beroende: Kreditmotor; Beskrivning: används för att beräkna riskindikatorer och stödja kreditbeslut."],

  // Centrala affärs-scenarion (happy/edge/error)
  
  scenarios: [
    {
      id: 'FG-S1',
      name: 'Normalflöde med komplett data',
      type: 'Happy',
      outcome:
        'Feature Goalet kan slutföras utan avvikelser och levererar ett komplett underlag till nästa steg.',
    },
    {
      id: 'FG-S2',
      name: 'Delvis ofullständig data',
      type: 'Edge',
      outcome:
        'Feature Goalet identifierar vilka uppgifter som saknas och flaggar ärendet för komplettering.',
    },
    {
      id: 'FG-S3',
      name: 'Kritisk avvikelse eller tekniskt fel',
      type: 'Error',
      outcome:
        'Feature Goalet kan inte slutföras, ärendet stoppas och skickas till manuell hantering med tydlig orsak.',
    },
  ],

  // Koppling till automatiska tester
  testDescription: 'Scenarierna FG-S1–FG-S3 ska mappas mot automatiska tester där scenario-ID och namn återanvänds i testfall. Testerna ska säkerställa att normalflöde, kompletteringsfall och kritiska avvikelser hanteras enligt beskrivningen.',

  // Tekniska/implementationsrelaterade anteckningar
  implementationNotes: ["Feature Goalet bör implementeras så att det är återanvändbart för flera relaterade processer.","Loggning ska ge spårbarhet från inkommande underlag till de beslut och flaggor som sätts.","Felhantering ska tydligt skilja på affärsmässiga avvikelser och tekniska problem i underliggande system."],

  // Relaterade regler / subprocesser / artefakter
  relatedItems: ["Relaterade Feature Goals som ligger före eller efter detta steg i bolåneresan.","Epics och Business Rules som tillsammans beskriver den logik och de flöden som Feature Goalet omfattar."],
};
