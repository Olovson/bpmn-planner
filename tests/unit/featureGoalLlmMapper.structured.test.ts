import { describe, it, expect } from 'vitest';
import { mapFeatureGoalLlmToSections } from '@/lib/featureGoalLlmMapper';

const STRUCTURED_FEATURE_GOAL_JSON = `
{
  "summary": "Feature Goalet samlar och koordinerar flera epics för att skapa ett sammanhängande kreditflöde från första ansökan till preliminärt beslut.",
  "scopeIncluded": [
    "Ingår: end-to-end-flöde för nyansökan om bolån för privatkunder, från första ansökan till preliminärt beslut."
  ],
  "scopeExcluded": [
    "Ingår inte: eftermarknadsprocesser, omläggningar och kreditengagemang i företagssegmentet."
  ],
  "epics": [
    {
      "id": "E1",
      "name": "Insamling av ansökningsuppgifter",
      "description": "Samlar in grundläggande kund- och låneuppgifter för ansökan.",
      "team": "Digital Sales"
    },
    {
      "id": "E2",
      "name": "Pre-screening",
      "description": "Utför tidig kontroll mot grundläggande regelverk och riskkriterier.",
      "team": "Risk & Policy"
    }
  ],
  "flowSteps": [
    "Kunden initierar en ansökan.",
    "Systemet kompletterar med interna engagemangsdata.",
    "Pre-screening genomförs。",
    "Godkända ansökningar går vidare till huvudbeslut."
  ],
  "dependencies": [
    "Beroende: Regelmotor/DMN; Id: kreditvärdighetsbedömning; Beskrivning: används för att fatta preliminära och slutliga kreditbeslut baserat på definierade regler."
  ],
  "scenarios": [
    {
      "id": "Normal ansökan med låg risk",
      "name": "Stabil inkomst, låg skuldsättning och inga negativa kreditposter.",
      "type": "Happy",
      "outcome": "Ansökan går igenom utan manuell granskning."
    }
  ],
  "testDescription": "Affärs-scenarierna bör mappas till automatiska tester där scenario-ID och namn återanvänds i testbeskrivningar.",
  "implementationNotes": [
    "Feature Goalet bör exponera en enhetlig kontraktspunkt för att trigga underliggande epics.",
    "Nyckelbeslut och statusförändringar ska loggas."
  ],
  "relatedItems": [
    "Relaterat Feature Goal: uppföljning och eftermarknadsflöden för beviljade krediter."
  ]
}
`;

describe('mapFeatureGoalLlmToSections (structured JSON)', () => {
  it('should map structured JSON response directly into FeatureGoalDocModel', () => {
    const sections = mapFeatureGoalLlmToSections(STRUCTURED_FEATURE_GOAL_JSON);

    expect(sections.summary).toContain('samlar och koordinerar flera epics');
    expect(sections.scopeIncluded.length).toBe(1);
    expect(sections.scopeExcluded.length).toBe(1);

    expect(sections.epics.length).toBe(2);
    expect(sections.epics[0].id).toBe('E1');
    expect(sections.epics[0].name).toBe('Insamling av ansökningsuppgifter');

    expect(sections.flowSteps.length).toBeGreaterThanOrEqual(3);
    expect(sections.dependencies.length).toBeGreaterThanOrEqual(1);
    expect(sections.scenarios.length).toBe(1);
    expect(sections.scenarios[0].type).toBe('Happy');

    expect(sections.testDescription).toContain('Affärs-scenarierna bör mappas');
    expect(sections.implementationNotes.length).toBe(2);
    expect(sections.relatedItems.length).toBe(1);
  });
});
