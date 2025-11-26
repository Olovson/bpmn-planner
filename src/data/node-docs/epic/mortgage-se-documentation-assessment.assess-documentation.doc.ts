import type { EpicDocOverrides } from '@/lib/nodeDocOverrides';

/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-documentation-assessment.bpmn
 * elementId: assess-documentation
 * type: epic
 *
 * Denna kontext används av LLM/Cursor när dokumentationsinnehåll ska genereras
 * eller förbättras. Ändra inte detta block programmatiskt – det är enbart metadata.
 */

/**
 * Documentation overrides for mortgage-se-documentation-assessment.bpmn::assess-documentation
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * Array fields default to 'replace' behavior (completely override base array).
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: EpicDocOverrides = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 * 
 * Available fields depend on the docType:
 * 
 * - Epic: summary, prerequisites, inputs, flowSteps, interactions, dataContracts, businessRulesPolicy, scenarios, testDescription, implementationNotes, relatedItems
 * 
 */

export const overrides: EpicDocOverrides = {
  // Syfte & värde för epiken
  summary: 'Denna epic beskriver ett avgränsat steg i bolåneflödet där kundens ansökan kompletteras, valideras och förbereds för kreditbeslut. Epiken säkerställer att rätt data finns på plats, att affärsregler kan tillämpas konsekvent och att både kund och handläggare får en begriplig process. Fokus ligger på att skapa ett spårbart underlag som kan återanvändas i efterföljande regler, beslut och dokumentation.',

  // Förutsättningar / triggers
  prerequisites: ["Grundläggande kund- och ansökningsdata ska vara inläst och validerad på övergripande nivå.","Eventuella föregående kontroller, såsom identitetskontroll och initial riskbedömning, ska vara genomförda.","Nödvändiga beroenden mot interna register och system ska vara tillgängliga innan epiken startar."],

  // Inputs (datakällor / fält)
  inputs: ["Strukturerad ansökningsdata som beskriver kund, engagemang och det efterfrågade låneupplägget.","Sammanfattad information från tidigare processsteg, inklusive status och eventuella flaggor.","Tekniska och affärsmässiga parametrar som styr vilka alternativ och beslut som kan presenteras."],

  // Funktionellt flöde i epiken
  flowSteps: ["Epiken initieras när föregående processsteg har levererat ett komplett underlag för fortsatt handläggning.","Systemet läser in relevant ansöknings- och kunddata och förbereder informationen för visning eller vidare bearbetning.","Affärsregler och valideringar tillämpas för att identifiera om underlaget är tillräckligt eller behöver kompletteras.","Resultatet dokumenteras och förs vidare till nästa steg i bolåneflödet tillsammans med relevanta flaggor och status."],

  // Interaktioner (kanaler, API:er, användare/system)
  interactions: ["Interaktion kan ske antingen via kundgränssnitt eller internt handläggarstöd beroende på kanal.","Systemet ska tydligt visa vilka uppgifter som är avgörande för beslut och hur de påverkar nästa steg.","Fel- och informationsmeddelanden ska vara begripliga så att användaren vet hur ärendet kan korrigeras eller kompletteras."],

  // Data-kontrakt / in- och utdata
  dataContracts: ["Indata omfattar strukturerad ansöknings-, kund- och engagemangsdata som behövs för det aktuella steget.","Utdata består av uppdaterad status, eventuella flaggor samt en tydlig markering om epiken är slutförd eller kräver manuell åtgärd."],

  // Affärsregler & policyberoenden
  businessRulesPolicy: ["Epiken förutsätter att relevanta affärsregler och policypunkter finns dokumenterade i separata Business Rules eller DMN.","Beslut och val inom epiken ska stödja bankens kreditpolicy och riskmandat för berörda produkter.","Eventuella avvikelser eller undantag ska identifieras och kunna spåras till bakomliggande regel- eller policystöd."],

  // Affärs-scenarion kopplade till tester
  
  scenarios: [
    {
      id: 'EPIC-S1',
      name: 'Normalflöde med komplett underlag',
      type: 'Happy',
      description:
        'Kunden eller handläggaren har lämnat kompletta och konsistenta uppgifter som uppfyller grundläggande krav.',
      outcome:
        'Epiken kan slutföras utan manuella avvikelser och ärendet går vidare till nästa steg i kreditflödet.',
    },
    {
      id: 'EPIC-S2',
      name: 'Delvis ofullständigt eller oklart underlag',
      type: 'Edge',
      description:
        'Enstaka uppgifter saknas eller är motsägelsefulla, men ärendet bedöms kunna kompletteras utan att avbrytas.',
      outcome:
        'Epiken markerar behov av komplettering och flaggar ärendet så att rätt åtgärder kan vidtas innan beslut.',
    },
    {
      id: 'EPIC-S3',
      name: 'Tekniskt fel eller kritisk avvikelse',
      type: 'Error',
      description:
        'Centrala data inte kan läsas in, valideras eller sparas på ett säkert sätt.',
      outcome:
        'Epiken avbryts, fel loggas och ärendet skickas till manuell hantering för felsökning och eventuell återstart.',
    },
  ],

  // Kort text om koppling till automatiska tester
  testDescription: 'Affärs-scenarierna EPIC-S1–EPIC-S3 ska mappas mot automatiska tester där scenario-ID och namn används i testfallens benämningar. Testerna bör täcka normalflöde, kompletteringsfall samt tekniska fel eller kritiska avvikelser.',

  // Implementation notes för dev/test
  implementationNotes: ["Epiken bör exponeras via väldefinierade API:er eller processgränssnitt så att den kan återanvändas konsekvent i olika kanaler.","Loggning ska minst omfatta nyckelbeslut, statusförändringar och eventuella flaggor som sätts under epiken.","Felhantering ska vara förutsägbar och tydligt skilja på affärsrelaterade avvikelser och tekniska fel."],

  // Relaterade steg & artefakter
  relatedItems: ["Relaterade epics i samma bolåneflöde som ligger direkt före eller efter denna epic.","Business Rules och DMN-modeller som beskriver de affärsregler som triggas av epiken."],
};
