import { describe, it, expect } from 'vitest';
import { mapBusinessRuleLlmToSections } from '@/lib/businessRuleLlmMapper';

const STRUCTURED_BUSINESS_RULE_JSON = `
{
  "summary": "Regeln används för att bedöma om en ansökan ligger inom bankens riktlinjer för skuldsättning, belåningsgrad och betalningshistorik.",
  "inputs": [
    "Fält: riskScore; Datakälla: kreditmotor/UC; Typ: tal (0–1000); Obligatoriskt: Ja; Validering: inom definierat intervall; Felhantering: avslå eller skicka till manuell granskning."
  ],
  "decisionLogic": [
    "Regeln kombinerar riskScore, skuldsättning och belåningsgrad för att klassificera ansökan som auto-approve, manuell granskning eller decline."
  ],
  "outputs": [
    "Outputtyp: beslut; Typ: APPROVE / REFER / DECLINE; Effekt: styr om processen fortsätter, pausas eller avslutas."
  ],
  "businessRulesPolicy": [
    "Stödjer intern kreditpolicy för skuldkvot, belåningsgrad och betalningsanmärkningar."
  ],
  "scenarios": [
    {
      "id": "BR1",
      "name": "Standardkund med låg risk",
      "type": "Happy",
      "input": "Stabil inkomst, låg skuldsättning, normal kreditdata.",
      "outcome": "APPROVE utan extra flaggor."
    }
  ],
  "testDescription": "Affärs-scenarierna ska mappas mot automatiska tester där scenario-ID och namn återanvänds i testfil och testbeskrivning.",
  "implementationNotes": [
    "Regeln exponeras via en intern beslutstjänst.",
    "Loggning inkluderar beslut, ingående parametrar och regelversion."
  ],
  "relatedItems": [
    "Relaterad Business Rule: huvudbeslutsregel.",
    "Relaterad subprocess: kompletteringshantering."
  ]
}
`;

describe('mapBusinessRuleLlmToSections (structured JSON)', () => {
  it('maps structured JSON into BusinessRuleDocModel', () => {
    const model = mapBusinessRuleLlmToSections(STRUCTURED_BUSINESS_RULE_JSON);

    expect(model.summary).toContain('riktlinjer för skuldsättning');
    expect(model.inputs.length).toBeGreaterThanOrEqual(1);
    expect(model.decisionLogic.length).toBeGreaterThanOrEqual(1);
    expect(model.outputs.length).toBeGreaterThanOrEqual(1);
    expect(model.businessRulesPolicy.length).toBeGreaterThanOrEqual(1);
    expect(model.scenarios.length).toBe(1);
    expect(model.scenarios[0].id).toBe('BR1');
    expect(model.testDescription).toContain('Affärs-scenarierna ska mappas');
    expect(model.implementationNotes.length).toBeGreaterThanOrEqual(1);
    expect(model.relatedItems.length).toBeGreaterThanOrEqual(1);
  });
});

