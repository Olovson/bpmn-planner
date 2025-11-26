#!/usr/bin/env node

/**
 * Codex Batch Fill Overrides
 *
 * Läser .codex-batch-files.json och fyller in innehåll i override-filer
 * genom att ersätta enbart:
 *  - 'TODO'
 *  - tomma arrayer: []
 *  - tomma strängar: ''
 *
 * Stödjer tre docType: epic, feature-goal, business-rule.
 *
 * Efter varje bearbetad fil uppdateras .codex-batch-status.json:
 *  - Lägger till filen i "completed"
 *  - Sätter "current" till nästa fil (eller null)
 *  - Uppdaterar "lastUpdated" med nuvarande tid (ISO)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const BATCH_FILES_PATH = path.join(projectRoot, '.codex-batch-files.json');
const STATUS_PATH = path.join(projectRoot, '.codex-batch-status.json');

async function loadJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function applyEpicOverrides(text) {
  const summary = [
    'Denna epic beskriver ett avgränsat steg i bolåneflödet där kundens ansökan kompletteras, valideras och förbereds för kreditbeslut.',
    'Epiken säkerställer att rätt data finns på plats, att affärsregler kan tillämpas konsekvent och att både kund och handläggare får en begriplig process.',
    'Fokus ligger på att skapa ett spårbart underlag som kan återanvändas i efterföljande regler, beslut och dokumentation.',
  ].join(' ');

  const prerequisites = [
    'Grundläggande kund- och ansökningsdata ska vara inläst och validerad på övergripande nivå.',
    'Eventuella föregående kontroller, såsom identitetskontroll och initial riskbedömning, ska vara genomförda.',
    'Nödvändiga beroenden mot interna register och system ska vara tillgängliga innan epiken startar.',
  ];

  const inputs = [
    'Strukturerad ansökningsdata som beskriver kund, engagemang och det efterfrågade låneupplägget.',
    'Sammanfattad information från tidigare processsteg, inklusive status och eventuella flaggor.',
    'Tekniska och affärsmässiga parametrar som styr vilka alternativ och beslut som kan presenteras.',
  ];

  const flowSteps = [
    'Epiken initieras när föregående processsteg har levererat ett komplett underlag för fortsatt handläggning.',
    'Systemet läser in relevant ansöknings- och kunddata och förbereder informationen för visning eller vidare bearbetning.',
    'Affärsregler och valideringar tillämpas för att identifiera om underlaget är tillräckligt eller behöver kompletteras.',
    'Resultatet dokumenteras och förs vidare till nästa steg i bolåneflödet tillsammans med relevanta flaggor och status.',
  ];

  const interactions = [
    'Interaktion kan ske antingen via kundgränssnitt eller internt handläggarstöd beroende på kanal.',
    'Systemet ska tydligt visa vilka uppgifter som är avgörande för beslut och hur de påverkar nästa steg.',
    'Fel- och informationsmeddelanden ska vara begripliga så att användaren vet hur ärendet kan korrigeras eller kompletteras.',
  ];

  const dataContracts = [
    'Indata omfattar strukturerad ansöknings-, kund- och engagemangsdata som behövs för det aktuella steget.',
    'Utdata består av uppdaterad status, eventuella flaggor samt en tydlig markering om epiken är slutförd eller kräver manuell åtgärd.',
  ];

  const businessRulesPolicy = [
    'Epiken förutsätter att relevanta affärsregler och policypunkter finns dokumenterade i separata Business Rules eller DMN.',
    'Beslut och val inom epiken ska stödja bankens kreditpolicy och riskmandat för berörda produkter.',
    'Eventuella avvikelser eller undantag ska identifieras och kunna spåras till bakomliggande regel- eller policystöd.',
  ];

  const scenarios = `
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
  ],`;

  const testDescription =
    'Affärs-scenarierna EPIC-S1–EPIC-S3 ska mappas mot automatiska tester där scenario-ID och namn används i testfallens benämningar. Testerna bör täcka normalflöde, kompletteringsfall samt tekniska fel eller kritiska avvikelser.';

  const implementationNotes = [
    'Epiken bör exponeras via väldefinierade API:er eller processgränssnitt så att den kan återanvändas konsekvent i olika kanaler.',
    'Loggning ska minst omfatta nyckelbeslut, statusförändringar och eventuella flaggor som sätts under epiken.',
    'Felhantering ska vara förutsägbar och tydligt skilja på affärsrelaterade avvikelser och tekniska fel.',
  ];

  const relatedItems = [
    'Relaterade epics i samma bolåneflöde som ligger direkt före eller efter denna epic.',
    'Business Rules och DMN-modeller som beskriver de affärsregler som triggas av epiken.',
  ];

  let updated = text;

  updated = updated.replace(/summary:\s*'TODO'/, `summary: '${summary}'`);
  updated = updated.replace(
    /prerequisites:\s*\['TODO'\]/,
    `prerequisites: ${JSON.stringify(prerequisites)}`,
  );
  updated = updated.replace(
    /inputs:\s*\['TODO'\]/,
    `inputs: ${JSON.stringify(inputs)}`,
  );
  updated = updated.replace(
    /flowSteps:\s*\['TODO'\]/,
    `flowSteps: ${JSON.stringify(flowSteps)}`,
  );
  updated = updated.replace(
    /interactions:\s*\['TODO'\]/,
    `interactions: ${JSON.stringify(interactions)}`,
  );
  updated = updated.replace(
    /dataContracts:\s*\['TODO'\]/,
    `dataContracts: ${JSON.stringify(dataContracts)}`,
  );
  updated = updated.replace(
    /businessRulesPolicy:\s*\['TODO'\]/,
    `businessRulesPolicy: ${JSON.stringify(businessRulesPolicy)}`,
  );
  updated = updated.replace(/scenarios:\s*\[\s*\],/, scenarios);
  updated = updated.replace(
    /testDescription:\s*'TODO'/,
    `testDescription: '${testDescription}'`,
  );
  updated = updated.replace(
    /implementationNotes:\s*\['TODO'\]/,
    `implementationNotes: ${JSON.stringify(implementationNotes)}`,
  );
  updated = updated.replace(
    /relatedItems:\s*\['TODO'\]/,
    `relatedItems: ${JSON.stringify(relatedItems)}`,
  );

  return updated;
}

function applyFeatureGoalOverrides(text) {
  const summary = [
    'Detta Feature Goal samlar flera epics till ett sammanhängande steg i bolåneresan där kundens behov, riskprofil och underlag hanteras på ett strukturerat sätt.',
    'Målet är att skapa en tydlig brygga mellan föregående processsteg och efterföljande beslut, med fokus på spårbarhet och konsekvent tillämpning av regler.',
  ].join(' ');

  const effectGoals = [
    'Minska manuellt arbete genom ökad grad av automatisering i det aktuella steget av bolåneflödet.',
    'Förbättra kvaliteten i beslutsunderlaget genom att samla data och regler på ett enhetligt sätt.',
    'Skapa en mer förutsägbar kundupplevelse genom tydliga besked och färre omtag.',
  ];

  const scopeIncluded = [
    'Ingår: hantering av de epics som är direkt kopplade till detta steg i bolåneprocessen.',
    'Ingår: insamling och konsolidering av de uppgifter som krävs för att kunna fatta nästa kreditbeslut.',
    'Ingår: tillämpning av relevanta affärsregler och policys på den information som samlas in här.',
  ];

  const scopeExcluded = [
    'Ingår inte: generella eftermarknadsprocesser och kundåtgärder utanför det aktuella bolåneärendet.',
    'Ingår inte: detaljerad produktutveckling eller prissättningsstrategi, som hanteras i andra fora.',
  ];

  const epicsArray = `
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
  ],`;

  const flowSteps = [
    'Kund- och ansökningsdata samlas in och förbereds för vidare bearbetning.',
    'Relevanta affärsregler och kontroller tillämpas för att identifiera avvikelser eller kompletteringsbehov.',
    'Resultat och status samlas i en gemensam struktur som kan återanvändas i efterföljande beslutssteg.',
  ];

  const dependencies = [
    'Beroende: Kund- och engagemangsregister; Beskrivning: används för att hämta aktuell kund- och skuldinformation.',
    'Beroende: Kreditmotor; Beskrivning: används för att beräkna riskindikatorer och stödja kreditbeslut.',
  ];

  const scenarios = `
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
  ],`;

  const testDescription =
    'Scenarierna FG-S1–FG-S3 ska mappas mot automatiska tester där scenario-ID och namn återanvänds i testfall. Testerna ska säkerställa att normalflöde, kompletteringsfall och kritiska avvikelser hanteras enligt beskrivningen.';

  const implementationNotes = [
    'Feature Goalet bör implementeras så att det är återanvändbart för flera relaterade processer.',
    'Loggning ska ge spårbarhet från inkommande underlag till de beslut och flaggor som sätts.',
    'Felhantering ska tydligt skilja på affärsmässiga avvikelser och tekniska problem i underliggande system.',
  ];

  const relatedItems = [
    'Relaterade Feature Goals som ligger före eller efter detta steg i bolåneresan.',
    'Epics och Business Rules som tillsammans beskriver den logik och de flöden som Feature Goalet omfattar.',
  ];

  let updated = text;

  updated = updated.replace(/summary:\s*'TODO'/, `summary: '${summary}'`);
  updated = updated.replace(
    /effectGoals:\s*\['TODO'\]/,
    `effectGoals: ${JSON.stringify(effectGoals)}`,
  );
  updated = updated.replace(
    /scopeIncluded:\s*\['TODO'\]/,
    `scopeIncluded: ${JSON.stringify(scopeIncluded)}`,
  );
  updated = updated.replace(
    /scopeExcluded:\s*\['TODO'\]/,
    `scopeExcluded: ${JSON.stringify(scopeExcluded)}`,
  );
  updated = updated.replace(/epics:\s*\[\s*\],/, epicsArray);
  updated = updated.replace(
    /flowSteps:\s*\['TODO'\]/,
    `flowSteps: ${JSON.stringify(flowSteps)}`,
  );
  updated = updated.replace(
    /dependencies:\s*\['TODO'\]/,
    `dependencies: ${JSON.stringify(dependencies)}`,
  );
  updated = updated.replace(/scenarios:\s*\[\s*\],/, scenarios);
  updated = updated.replace(
    /testDescription:\s*'TODO'/,
    `testDescription: '${testDescription}'`,
  );
  updated = updated.replace(
    /implementationNotes:\s*\['TODO'\]/,
    `implementationNotes: ${JSON.stringify(implementationNotes)}`,
  );
  updated = updated.replace(
    /relatedItems:\s*\['TODO'\]/,
    `relatedItems: ${JSON.stringify(relatedItems)}`,
  );

  return updated;
}

function applyBusinessRuleOverrides(text) {
  const summary = [
    'Denna affärsregel används i bolåneflödet för att fatta ett avgränsat beslut baserat på strukturerad kund- och ansökningsdata.',
    'Syftet är att säkerställa en konsekvent tillämpning av kreditpolicy och riskprinciper för den aktuella delen av processen.',
  ].join(' ');

  const scenarios = `
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
  ],`;

  const testDescription =
    'Scenarierna BR1–BR4 ska mappas mot automatiska DMN- och API-tester där scenario-ID och namn återfinns i testfallens benämningar. Testerna ska verifiera normalfall, gränsfall, tydliga avslag samt tekniska fel eller ofullständig data.';

  let updated = text;

  updated = updated.replace(/summary:\s*'TODO'/, `summary: '${summary}'`);
  updated = updated.replace(/scenarios:\s*\[\s*\],/, scenarios);
  updated = updated.replace(
    /testDescription:\s*'TODO'/,
    `testDescription: '${testDescription}'`,
  );

  return updated;
}

async function main() {
  const batchFiles = await loadJson(BATCH_FILES_PATH, []);
  if (!Array.isArray(batchFiles) || batchFiles.length === 0) {
    console.error('Ingen .codex-batch-files.json hittades eller filen är tom.');
    process.exit(1);
  }

  let status = await loadJson(STATUS_PATH, {
    total: batchFiles.length,
    completed: [],
    current: null,
    lastUpdated: nowIso(),
    started: nowIso(),
  });

  const completedSet = new Set(status.completed || []);

  // Bestäm startindex
  let startIndex = 0;
  if (status.current) {
    const idx = batchFiles.findIndex((f) => f.path === status.current);
    if (idx >= 0) {
      startIndex = idx;
    }
  }

  for (let i = startIndex; i < batchFiles.length; i += 1) {
    const file = batchFiles[i];
    const filePath = path.join(projectRoot, file.path);

    status.current = file.path;

    let text;
    try {
      text = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      console.error(`Kunde inte läsa fil: ${file.path}`, err);
      continue;
    }

    const original = text;

    if (file.docType === 'epic') {
      text = applyEpicOverrides(text);
    } else if (file.docType === 'feature-goal') {
      text = applyFeatureGoalOverrides(text);
    } else if (file.docType === 'business-rule') {
      text = applyBusinessRuleOverrides(text);
    }

    if (text !== original) {
      await fs.writeFile(filePath, text, 'utf8');
    }

    // Uppdatera status
    completedSet.add(file.path);
    status.completed = Array.from(completedSet);
    status.total = batchFiles.length;
    status.lastUpdated = nowIso();
    status.current = i + 1 < batchFiles.length ? batchFiles[i + 1].path : null;

    await fs.writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

