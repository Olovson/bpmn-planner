import { describe, it, expect } from 'vitest';
import { mapEpicLlmToSections } from '@/lib/epicLlmMapper';

const STRUCTURED_EPIC_JSON = `
{
  "summary": "Epiken säkerställer att handläggaren får ett samlat underlag inför kreditbeslut.",
  "prerequisites": [
    "Triggas efter att grundläggande ansökningsdata är insamlade.",
    "Förutsätter att identitet och KYC är genomförda."
  ],
  "inputs": [
    "Fält: personnummer; Källa: ansökningsformulär; Typ: String; Obligatoriskt: Ja;",
    "Fält: önskat lånebelopp; Källa: ansökningsformulär; Typ: Tal; Obligatoriskt: Ja;"
  ],
  "flowSteps": [
    "Användaren öppnar epiken och ser sammanfattad information.",
    "Användaren kompletterar uppgifter och skickar vidare.",
    "Systemet validerar och uppdaterar status."
  ],
  "interactions": [
    "Kanal: web/app eller internt handläggargränssnitt.",
    "Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd."
  ],
  "dataContracts": [
    "Input: ansökningsdata; Konsument: epiken; Kommentar: underlag som triggar epiken.",
    "Output: uppdaterad status; Konsument: nästa processsteg; Kommentar: styr flödet vidare."
  ],
  "businessRulesPolicy": [
    "Regel: kreditvärdighetsbedömning; Syfte: säkerställa att kunden uppfyller minimikraven."
  ],
  "scenarios": [
    {
      \"id\": \"EPIC-S1\",
      \"name\": \"Happy path\",
      \"type\": \"Happy\",
      \"description\": \"Kunden fyller i alla uppgifter korrekt vid första försöket.\",
      \"outcome\": \"Flödet går vidare utan komplettering.\"
    }
  ],
  "testDescription": "Scenarierna bör mappas till automatiska tester där scenario-ID och namn återanvänds i testbeskrivningar.",
  "implementationNotes": [
    "Epiken använder interna tjänster för att hämta kreditdata.",
    "Viktiga fält och beslut bör loggas."
  ],
  "relatedItems": [
    "Föregående steg: initial ansökan.",
    "Nästa steg: beslutsregel för kreditbedömning."
  ]
}
`;

describe('mapEpicLlmToSections (structured JSON)', () => {
  it('maps structured JSON into EpicDocModel', () => {
    const model = mapEpicLlmToSections(STRUCTURED_EPIC_JSON);

    expect(model.summary).toContain('samlat underlag inför kreditbeslut');
    expect(model.prerequisites.length).toBeGreaterThanOrEqual(2);
    expect(model.inputs.length).toBeGreaterThanOrEqual(2);
    expect(model.flowSteps.length).toBeGreaterThanOrEqual(2);
    expect(model.interactions.length).toBeGreaterThanOrEqual(1);
    expect(model.dataContracts.length).toBeGreaterThanOrEqual(1);
    expect(model.businessRulesPolicy.length).toBeGreaterThanOrEqual(1);
    expect(model.scenarios.length).toBe(1);
    expect(model.scenarios[0].type).toBe('Happy');
    expect(model.testDescription).toContain('Scenarierna bör mappas');
    expect(model.implementationNotes.length).toBeGreaterThanOrEqual(1);
    expect(model.relatedItems.length).toBeGreaterThanOrEqual(1);
  });
});

