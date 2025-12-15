# Komplett BPMN-översikt: Alla processer och deras relationer

**Genererad:** 2025-01-XX  
**Syfte:** Systematisk översikt över alla BPMN-filer för att identifiera E2E-scenarion baserat på helheten

**Baserad på:**
- `bpmn-tree-output.md` - hierarkisk struktur och execution order
- `buildBpmnProcessGraph` - graf med hierarki och ordning
- `bpmn-map.json` - mappning mellan call activities och subprocess-filer
- Faktiska BPMN-filer - gateways, boundary events, error paths

---

## Översikt

**Totalt antal BPMN-filer:** 21 (19 i `bpmn-tree-output.md`)

**Root-process:** `mortgage.bpmn` (mortgage)

**Hierarkinivåer:** 3-4 nivåer (root → call activities → subprocesses → sub-subprocesses)

**Körordning:** Baserad på sequence flows och `orderIndex` från `buildBpmnProcessGraph`

---

## Root Process: mortgage.bpmn

**Process-ID:** `mortgage`  
**Fil:** `mortgage.bpmn`

### Huvudflöde (från start-event till end-event)

Baserat på sequence flows i `mortgage.bpmn`:

1. **Start Event** (`Event_0ssbeto`)
2. **Application** (`application`) → `mortgage-se-application.bpmn`
3. **Application completed** (`event-application-evaluation-completed`)
4. **Is purchase?** (`is-purchase` gateway)
   - **Yes** → **Mortgage commitment** (`mortgage-commitment`) → `mortgage-se-mortgage-commitment.bpmn`
   - **No** → (går direkt vidare)
5. **Object valuation** (`object-valuation`) → `mortgage-se-object-valuation.bpmn`
6. **Credit evaluation** (`credit-evaluation`) → `mortgage-se-credit-evaluation.bpmn`
7. **Is automatically approved?** (`is-automatically-approved` gateway)
   - **Yes** → **Automatically approved** → **Credit evaluation complete**
   - **No** → **Is automatically rejected?** (`is-automatically-rejected` gateway)
     - **Yes** → **Appeal** (`appeal`) → `mortgage-se-appeal.bpmn` → **Manual credit evaluation** (`manual-credit-evaluation`) → `mortgage-se-manual-credit-evaluation.bpmn`
     - **No** → **Manual credit evaluation** (`manual-credit-evaluation`) → `mortgage-se-manual-credit-evaluation.bpmn`
8. **Credit evaluation complete** (`event-credit-evaluation-complete`)
9. **KYC** (`kyc`) → `mortgage-se-kyc.bpmn` **[Multi-instance]**
10. **Credit decision** (`credit-decision`) → `mortgage-se-credit-decision.bpmn`
11. **Is credit approved?** (`is-credit-approved` gateway)
    - **Yes** → **Credit decision completed** → **Offer preparation** (`offer`) → `mortgage-se-offer.bpmn`
    - **No** → **Credit decision rejected** (end event)
12. **Offer ready** (`event-loan-ready`)
13. **Document generation** (`document-generation`) → `mortgage-se-document-generation.bpmn`
14. **Documents generated** → **Signing** (`signing`) → `mortgage-se-signing.bpmn`
15. **Signing completed** → **Disbursement** (`disbursement`) → `mortgage-se-disbursement.bpmn`
16. **Loan paid out** → **Needs collateral registration?** (`needs-collateral-registration` gateway)
    - **Yes** → **Collateral registration** (`collateral-registration`) → `mortgage-se-collateral-registration.bpmn`
    - **No** → (går direkt vidare)
17. **Application evaluated** (`event-application-evaluated`) - **End Event**

### Alternativa flöden

#### Advance-flöde (parallellt med huvudflödet)
- **Trigger:** Boundary event `event-trigger-advance` på `offer`
- **Flöde:**
  1. **Advance ready** → **Document generation (advance)** (`document-generation-advance`)
  2. **Signing (advance)** (`signing-advance`)
  3. **Disbursement (advance)** (`disbursement-advance`)
  4. **Advance paid out** → **End Event**

#### Error paths (boundary events)
- **Application aborted** (`Event_0e92ljp` på `application`) → **Cancelled** (end event)
- **KYC rejected** (`Event_1swqs88` på `kyc`) → **KYC rejected** (end event)
- **Credit decision rejected** (`Event_0kfrwag` på `offer`) → **Credit decision rejected** (end event)
- **Signing rejected** (`Event_19yjpp1` på `signing`) → **Signing rejected** (end event)
- **Disbursement cancelled** (`Event_1uckprr` på `disbursement`) → **Disbursement cancelled** (end event)
- **Mortgage commitment rejected** (`Event_1brk859` på `mortgage-commitment`) → **Automatically rejected** (end event)
- **Offer rejected** (`event-offer-rejected` på `offer`) → **Offer declined** (end event)
- **Manual re-evaluation required** (`Event_0y9br1l` på `credit-decision`) → **Appeal** → **Manual credit evaluation**

### Multi-instance processer
- **KYC** (`kyc`) - Multi-instance (körs för varje person i ansökan)

---

## Alla BPMN-processer (alfabetisk ordning)

| Fil | Process-ID | Process-namn | Call Activities | Nivå | Anropas från |
|-----|------------|--------------|-----------------|------|--------------|
| `mortgage-se-appeal.bpmn` | `mortgage-se-appeal` | Appeal | 0 | 2 | `mortgage.bpmn` (appeal) |
| `mortgage-se-application.bpmn` | `mortgage-se-application` | Application | 4 | 1 | `mortgage.bpmn` (application) |
| `mortgage-se-collateral-registration.bpmn` | `mortgage-se-collateral-registration` | Collateral Registration | 0 | 1 | `mortgage.bpmn` (collateral-registration) |
| `mortgage-se-credit-decision.bpmn` | `mortgage-se-credit-decision` | Credit Decision | 0 | 1 | `mortgage.bpmn` (credit-decision), `mortgage-se-offer.bpmn` (credit-decision, sales-contract-credit-decision) |
| `mortgage-se-credit-evaluation.bpmn` | `mortgage-se-credit-evaluation` | Credit Evaluation | 0 | 1 | `mortgage.bpmn` (credit-evaluation), `mortgage-se-manual-credit-evaluation.bpmn` (Activity_1gzlxx4), `mortgage-se-mortgage-commitment.bpmn` (credit-evaluation-1, credit-evaluation-2), `mortgage-se-object-control.bpmn` (credit-evaluation-2) |
| `mortgage-se-disbursement.bpmn` | `mortgage-se-disbursement` | Disbursement | 0 | 1 | `mortgage.bpmn` (disbursement, disbursement-advance) |
| `mortgage-se-document-generation.bpmn` | `mortgage-se-document-generation` | Document Generation | 0 | 1 | `mortgage.bpmn` (document-generation, document-generation-advance) |
| `mortgage-se-documentation-assessment.bpmn` | `mortgage-se-documentation-assessment` | Documentation Assessment | 0 | 2 | `mortgage-se-manual-credit-evaluation.bpmn` (documentation-assessment), `mortgage-se-mortgage-commitment.bpmn` (documentation-assessment), `mortgage-se-offer.bpmn` (documentation-assessment) |
| `mortgage-se-household.bpmn` | `mortgage-se-household` | Household | 0 | 2 | `mortgage-se-application.bpmn` (household) |
| `mortgage-se-internal-data-gathering.bpmn` | `mortgage-se-internal-data-gathering` | Internal Data Gathering | 0 | 2 | `mortgage-se-application.bpmn` (internal-data-gathering), `mortgage-se-stakeholder.bpmn` (internal-data-gathering) |
| `mortgage-se-kyc.bpmn` | `mortgage-se-kyc` | KYC | 0 | 1 | `mortgage.bpmn` (kyc) - **Multi-instance** |
| `mortgage-se-manual-credit-evaluation.bpmn` | `mortgage-se-manual-credit-evaluation` | Manual Credit Evaluation | 3 | 1 | `mortgage.bpmn` (manual-credit-evaluation) |
| `mortgage-se-mortgage-commitment.bpmn` | `mortgage-se-mortgage-commitment` | Mortgage Commitment | 4 | 1 | `mortgage.bpmn` (mortgage-commitment) |
| `mortgage-se-object-control.bpmn` | `mortgage-se-object-control` | Object Control | 2 | 2 | `mortgage-se-manual-credit-evaluation.bpmn` (object-control) |
| `mortgage-se-object-information.bpmn` | `mortgage-se-object-information` | Object Information | 0 | 2 | `mortgage-se-mortgage-commitment.bpmn` (object-information), `mortgage-se-object-control.bpmn` (object-information), `mortgage-se-object.bpmn` (object-information) |
| `mortgage-se-object-valuation.bpmn` | `mortgage-se-object-valuation` | Object Valuation | 0 | 1 | `mortgage.bpmn` (object-valuation) |
| `mortgage-se-object.bpmn` | `mortgage-se-object` | Object | 1 | 2 | `mortgage-se-application.bpmn` (object) |
| `mortgage-se-offer.bpmn` | `mortgage-se-offer` | Offer | 3 | 1 | `mortgage.bpmn` (offer) |
| `mortgage-se-signing.bpmn` | `mortgage-se-signing` | Signing | 0 | 1 | `mortgage.bpmn` (signing, signing-advance) |
| `mortgage-se-stakeholder.bpmn` | `mortgage-se-stakeholder` | Stakeholder | 1 | 2 | `mortgage-se-application.bpmn` (stakeholder) |

---

## Hierarkisk struktur (rekursiv)

### Nivå 1: Root
- **mortgage.bpmn** (mortgage)

### Nivå 2: Direkta call activities från root
- **application** → `mortgage-se-application.bpmn`
- **kyc** → `mortgage-se-kyc.bpmn` **[Multi-instance]**
- **credit-evaluation** → `mortgage-se-credit-evaluation.bpmn`
- **credit-decision** → `mortgage-se-credit-decision.bpmn`
- **offer** → `mortgage-se-offer.bpmn`
- **signing** → `mortgage-se-signing.bpmn`
- **disbursement** → `mortgage-se-disbursement.bpmn`
- **collateral-registration** → `mortgage-se-collateral-registration.bpmn`
- **mortgage-commitment** → `mortgage-se-mortgage-commitment.bpmn`
- **manual-credit-evaluation** → `mortgage-se-manual-credit-evaluation.bpmn`
- **object-valuation** → `mortgage-se-object-valuation.bpmn`
- **appeal** → `mortgage-se-appeal.bpmn`
- **document-generation** → `mortgage-se-document-generation.bpmn`

### Nivå 3: Subprocesses från nivå 2

#### mortgage-se-application.bpmn
- **internal-data-gathering** → `mortgage-se-internal-data-gathering.bpmn`
- **object** → `mortgage-se-object.bpmn`
- **household** → `mortgage-se-household.bpmn`
- **stakeholder** → `mortgage-se-stakeholder.bpmn`

#### mortgage-se-stakeholder.bpmn
- **internal-data-gathering** → `mortgage-se-internal-data-gathering.bpmn`

#### mortgage-se-object.bpmn
- **object-information** → `mortgage-se-object-information.bpmn`

#### mortgage-se-manual-credit-evaluation.bpmn
- **object-control** → `mortgage-se-object-control.bpmn`
- **documentation-assessment** → `mortgage-se-documentation-assessment.bpmn`
- **credit-evaluation** (Activity_1gzlxx4) → `mortgage-se-credit-evaluation.bpmn`

#### mortgage-se-mortgage-commitment.bpmn
- **credit-evaluation-1** → `mortgage-se-credit-evaluation.bpmn`
- **object-information** → `mortgage-se-object-information.bpmn`
- **credit-evaluation-2** → `mortgage-se-credit-evaluation.bpmn`
- **documentation-assessment** → `mortgage-se-documentation-assessment.bpmn`

#### mortgage-se-offer.bpmn
- **credit-decision** → `mortgage-se-credit-decision.bpmn`
- **documentation-assessment** → `mortgage-se-documentation-assessment.bpmn`
- **sales-contract-credit-decision** → `mortgage-se-credit-decision.bpmn`

#### mortgage-se-object-control.bpmn
- **object-information** → `mortgage-se-object-information.bpmn`
- **credit-evaluation-2** → `mortgage-se-credit-evaluation.bpmn`

### Nivå 4: Sub-subprocesses (inga ytterligare call activities)

---

## Huvudflöden för E2E-scenarion

### Flöde 1: Happy Path - Refinansiering (inte köp)
1. Application → KYC → Credit Evaluation → Credit Decision → Offer → Signing → Disbursement → (Collateral Registration?) → Done

### Flöde 2: Happy Path - Köp
1. Application → Mortgage Commitment → Object Valuation → Credit Evaluation → KYC → Credit Decision → Offer → Signing → Disbursement → (Collateral Registration?) → Done

### Flöde 3: Error Path - Application avvisad
1. Application → (Error: application-aborted) → Cancelled

### Flöde 4: Error Path - KYC avvisad
1. Application → KYC → (Error: kyc-rejected) → KYC rejected

### Flöde 5: Error Path - Credit Decision avvisad
1. Application → KYC → Credit Evaluation → Credit Decision → (No) → Credit decision rejected

### Flöde 6: Alternative Path - Appeal
1. Application → Credit Evaluation → (Not automatically approved) → (Not automatically rejected) → Manual Credit Evaluation → (Automatically rejected) → Appeal → Manual Credit Evaluation → KYC → Credit Decision → ...

### Flöde 7: Alternative Path - Advance
1. Application → ... → Offer → (Boundary event: Advance needed) → Document Generation (advance) → Signing (advance) → Disbursement (advance) → Advance paid out

---

## Multi-instance processer

### KYC (mortgage-se-kyc.bpmn)
- **Anropas från:** `mortgage.bpmn` (kyc)
- **Multi-instance:** Ja (körs för varje person i ansökan)
- **Betydelse för E2E:** Måste testa med:
  - En person (sökande)
  - Två personer (sökande + medsökare)
  - Flera personer (sökande + medsökare + andra hushållsmedlemmar)

---

## Nästa steg

1. **Identifiera Feature Goals** för varje process
2. **Extrahera testscenarion** från Feature Goals
3. **Kombinera BPMN-flöden med Feature Goal testscenarion** för att skapa realistiska E2E-scenarion
4. **Prioritera scenarion** baserat på affärskritikalitet

---

## Noteringar

- **Application** är en kritisk process med 4 subprocesses (internal-data-gathering, object, household, stakeholder)
- **Stakeholder** är multi-instance i Application (körs för varje person)
- **KYC** är multi-instance i root (körs för varje person)
- **Mortgage Commitment** är ett parallellt flöde för köp (inte refinansiering)
- **Appeal** är ett alternativt flöde som kan loopa tillbaka till Manual Credit Evaluation

