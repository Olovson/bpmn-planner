import { describe, it, expect } from 'vitest';
import { mapFeatureGoalLlmToSections } from '@/lib/featureGoalLlmMapper';

const INTERNAL_DATA_GATHERING_LLM_TEXT = `
Internal data gathering – sammanfattning

Detta feature goal fokuserar på att samla in och analysera intern kunddata som redan finns i bankens system för att stödja kreditbedömningen. Målet är att säkerställa att all relevant information används konsekvent och spårbart.

Ingår: Insamling och analys av intern kunddata (engagemang, transaktioner, historik) som redan finns i bankens system.
Ingår: Integration med interna system (kunddatabas, engagemang, transaktionshistorik) för att hämta och uppdatera data.
Ingår inte: Extern kreditupplysning eller hämtning av data från externa källor (t.ex. UC, Skatteverket, PSD2-banker).
Endast digital ansökan via webbplattformen.

Epic: Insamling av intern kunddata; Syfte: Hämta och sammanställa relevant intern kundinformation för kreditbedömning.
Epic: Analys av intern data; Syfte: Analysera insamlad data för att identifiera risker, möjligheter och beslutsunderlag.

Kunden skickar in en bolåneansökan via den digitala kanalen.
Systemet initierar insamling av intern kunddata från relevanta källsystem.
Den insamlade datan analyseras utifrån definierade regler och tröskelvärden.
Resultaten av analysen används för att stödja kreditbeslutet i efterföljande steg.
Processen avslutas och data lagras för spårbarhet och framtida uppföljning.

Beroende: Kunddatabas; Id: DEP-INT-001; Beskrivning: Innehåller grundläggande kundinformation och engagemangsdata.
Beroende: Analysverktyg; Id: DEP-INT-002; Beskrivning: Används för att beräkna nyckeltal och riskindikatorer.
Beroende: Integrationsplattform; Id: DEP-INT-003; Beskrivning: Säkerställer tillförlitliga anrop mot interna källsystem.

Scenario: Komplett intern data tillgänglig; Typ: Happy; Beskrivning: Kunden har fullständig och aktuell intern data i systemen; Förväntat utfall: Systemet kan fatta ett välgrundat kreditbeslut baserat på intern data.
Scenario: Ofullständig intern data; Typ: Edge; Beskrivning: Viss intern data saknas eller är utdaterad; Förväntat utfall: Systemet flaggar behov av komplettering eller manuell granskning innan beslut.
Scenario: Systemfel vid datainsamling; Typ: Error; Beskrivning: Ett tekniskt fel uppstår vid hämtning av intern data; Förväntat utfall: Ärendet pausas och fel loggas för utredning, kunden informeras om fördröjning.

Scenarion ovan mappas mot automatiska tester och Playwright-skript för att säkerställa att både lyckade flöden, edge-cases och felhantering täcks i testsviten.

- API-endpoint för intern datainsamling ska vara idempotent och logga alla anrop.
- Felhantering vid tidsgränser och systemfel ska vara konsekvent och spårbar.
- Eventuella manuella kompletteringar ska loggas och kopplas till ärendet.

Relaterat Feature Goal: External data gathering.
Relaterad epik: Beslutsmotor för kreditbedömning.
Relaterade regler: Kreditpolicy för skuldsättning, betalningsanmärkningar och belåningsgrad.
`;

describe('mapFeatureGoalLlmToSections', () => {
  it('should map Internal data gathering LLM content into structured sections', () => {
    const sections = mapFeatureGoalLlmToSections(INTERNAL_DATA_GATHERING_LLM_TEXT);

    expect(sections.summary).toContain('fokuserar på att samla in och analysera intern kunddata');
    expect(sections.summary.toLowerCase()).not.toContain('epic:');
    expect(sections.summary.toLowerCase()).not.toContain('scenario:');
    expect(sections.summary.toLowerCase()).not.toContain('beroende:');

    expect(sections.scopeIncluded).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Insamling och analys av intern kunddata'),
        expect.stringContaining('Integration med interna system'),
        expect.stringContaining('Endast digital ansökan via webbplattformen'),
      ]),
    );

    expect(sections.scopeExcluded).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Extern kreditupplysning eller hämtning av data från externa källor'),
      ]),
    );

    expect(sections.epics.length).toBeGreaterThanOrEqual(2);
    const epicNames = sections.epics.map((epic) => epic.name);
    expect(epicNames).toEqual(
      expect.arrayContaining(['Insamling av intern kunddata', 'Analys av intern data']),
    );

    expect(sections.flowSteps.length).toBeGreaterThanOrEqual(3);
    expect(sections.flowSteps[0]).toMatch(/^Kunden skickar in en bolåneansökan/i);

    expect(sections.dependencies.length).toBeGreaterThanOrEqual(3);
    expect(sections.dependencies.join(' ')).toContain('Kunddatabas');
    expect(sections.dependencies.join(' ')).toContain('Analysverktyg');
    expect(sections.dependencies.join(' ')).toContain('Integrationsplattform');

    expect(sections.scenarios.length).toBeGreaterThanOrEqual(3);
    const scenarioIds = sections.scenarios.map((scenario) => scenario.id);
    expect(scenarioIds).toEqual(
      expect.arrayContaining([
        'Komplett intern data tillgänglig',
        'Ofullständig intern data',
        'Systemfel vid datainsamling',
      ]),
    );

    expect(sections.testDescription.toLowerCase()).toContain('scenarion ovan mappas mot automatiska tester');
    expect(sections.implementationNotes.length).toBeGreaterThanOrEqual(2);
    expect(sections.relatedItems.length).toBeGreaterThanOrEqual(1);
  });
});
