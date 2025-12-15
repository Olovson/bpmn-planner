# Feature Goal → BPMN-process mappning för E2E-scenarion

**Genererad:** 2025-01-XX  
**Syfte:** Mappa Feature Goals till BPMN-processer och identifiera testscenarion relevanta för E2E-tester

---

## Sammanfattning

- **Totalt antal Feature Goals:** 26
- **Feature Goals med testscenarion:** 26 (100%)
- **Totalt antal testscenarion:** 230
- **Feature Goals relevanta för E2E (hela flöden):** ~15-20

---

## Mappning: Feature Goal → BPMN-process → Testscenarion

### Root-nivå processer (direkta call activities från mortgage.bpmn)

| Feature Goal-fil | BPMN-process | Call Activity ID | Antal testscenarion | E2E-relevant | Noteringar |
|-----------------|--------------|------------------|---------------------|-------------|------------|
| `mortgage-application-v2.html` | `mortgage-se-application.bpmn` | `application` | **15** (S1-S15) | ✅ **JA** | Kritiskt - första steg i processen. Har scenarion för en person, flera personer, error cases, timeout. |
| `mortgage-kyc-v2.html` | `mortgage-se-kyc.bpmn` | `kyc` | **8** (S1-S8) | ✅ **JA** | Kritiskt - multi-instance (körs för varje person). Har scenarion för auto-approve, manuell review, avvisad. |
| `mortgage-se-credit-evaluation-v2.html` | `mortgage-se-credit-evaluation.bpmn` | `credit-evaluation` | **11** (S1-S11) | ✅ **JA** | Kritiskt - automatisk kreditevaluering. Anropas från flera ställen. |
| `mortgage-se-credit-decision-v2.html` | `mortgage-se-credit-decision.bpmn` | `credit-decision` | **6** (S1-S6) | ✅ **JA** | Kritiskt - kreditbeslut. Redan implementerat (FG_CREDIT_DECISION_TC01). |
| `mortgage-offer-v2.html` | `mortgage-se-offer.bpmn` | `offer` | **9** (S1-S9) | ✅ **JA** | Kritiskt - offer-preparation. Har scenarion för offer accepted/rejected. |
| `mortgage-se-signing-v2.html` | `mortgage-se-signing.bpmn` | `signing` | **16** (S1-S16) | ✅ **JA** | Kritiskt - signing. Har många scenarion (digital signing, fysisk signing, etc.). |
| `mortgage-se-disbursement-v2.html` | `mortgage-se-disbursement.bpmn` | `disbursement` | **6** (S1-S6) | ✅ **JA** | Kritiskt - utbetalning. |
| `mortgage-collateral-registration-v2.html` | `mortgage-se-collateral-registration.bpmn` | `collateral-registration` | **9** (S1-S9) | ⚠️ **DELVIS** | Viktigt men inte alltid nödvändigt (beroende på gateway). |
| `mortgage-mortgage-commitment-v2.html` | `mortgage-se-mortgage-commitment.bpmn` | `mortgage-commitment` | **11** (S1-S11) | ✅ **JA** | Kritiskt för köp (inte refinansiering). Parallellt flöde. |
| `mortgage-manual-credit-evaluation-v2.html` | `mortgage-se-manual-credit-evaluation.bpmn` | `manual-credit-evaluation` | **11** (S1-S11) | ⚠️ **DELVIS** | Alternativt flöde - används när automatisk evaluering inte godkänner. |
| `mortgage-object-valuation-v2.html` | `mortgage-se-object-valuation.bpmn` | `object-valuation` | **7** (S1-S7) | ✅ **JA** | Kritiskt - objektvärdering. Körs efter mortgage-commitment för köp. |
| `mortgage-appeal-v2.html` | `mortgage-se-appeal.bpmn` | `appeal` | **10** (S1-S10) | ⚠️ **DELVIS** | Alternativt flöde - används när ansökan avvisas. |
| `mortgage-se-document-generation-v2.html` | `mortgage-se-document-generation.bpmn` | `document-generation` | **12** (S1-S12) | ✅ **JA** | Kritiskt - dokumentgenerering. Körs innan signing. |
| `mortgage-se-disbursement-disbursement-advance-v2.html` | `mortgage-se-disbursement.bpmn` | `disbursement-advance` | **5** (S1-S5) | ⚠️ **DELVIS** | Alternativt flöde - advance-disbursement. |
| `mortgage-se-document-generation-document-generation-advance-v2.html` | `mortgage-se-document-generation.bpmn` | `document-generation-advance` | **7** (S1-S7) | ⚠️ **DELVIS** | Alternativt flöde - advance document generation. |
| `mortgage-Activity_17f0nvn-v2.html` | `mortgage.bpmn` | `Activity_17f0nvn` (subprocess) | **3** (S1-S3) | ⚠️ **DELVIS** | Event-driven subprocess - "Update party". |

### Subprocess-nivå (call activities från root-nivå processer)

#### Application subprocesses

| Feature Goal-fil | BPMN-process | Call Activity ID | Antal testscenarion | E2E-relevant | Noteringar |
|-----------------|--------------|------------------|---------------------|-------------|------------|
| `mortgage-se-internal-data-gathering-v2.html` | `mortgage-se-internal-data-gathering.bpmn` | `internal-data-gathering` | **8** (S1-S8) | ✅ **JA** | Kritiskt - första steg i Application. Hämtar kunddata, pre-screening. |
| `mortgage-se-application-stakeholder-v2.html` | `mortgage-se-stakeholder.bpmn` | `stakeholder` | **8** (S1-S8) | ✅ **JA** | Kritiskt - multi-instance (körs för varje person). Kunden fyller i persondata. |
| `mortgage-se-application-household-v2.html` | `mortgage-se-household.bpmn` | `household` | **4** (S1-S4) | ✅ **JA** | Kritiskt - hushållsekonomi. Används för KALP-beräkning. |
| `mortgage-se-application-object-v2.html` | `mortgage-se-object.bpmn` | `object` | **9** (S1-S9) | ✅ **JA** | Kritiskt - objektinformation. Kunden anger fastighetsinformation. |

#### Manual Credit Evaluation subprocesses

| Feature Goal-fil | BPMN-process | Call Activity ID | Antal testscenarion | E2E-relevant | Noteringar |
|-----------------|--------------|------------------|---------------------|-------------|------------|
| `mortgage-se-manual-credit-evaluation-object-control-v2.html` | `mortgage-se-object-control.bpmn` | `object-control` | **15** (S1-S15) | ⚠️ **DELVIS** | Används i manual credit evaluation. |

#### Offer subprocesses

| Feature Goal-fil | BPMN-process | Call Activity ID | Antal testscenarion | E2E-relevant | Noteringar |
|-----------------|--------------|------------------|---------------------|-------------|------------|
| `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html` | `mortgage-se-credit-decision.bpmn` | `sales-contract-credit-decision` | **6** (S1-S6) | ⚠️ **DELVIS** | Används i Offer-processen för sales contract. |

#### Shared subprocesses

| Feature Goal-fil | BPMN-process | Call Activity ID | Antal testscenarion | E2E-relevant | Noteringar |
|-----------------|--------------|------------------|---------------------|-------------|------------|
| `mortgage-se-object-information-v2.html` | `mortgage-se-object-information.bpmn` | `object-information` | **8** (S1-S8) | ⚠️ **DELVIS** | Används i Object, Object Control, Mortgage Commitment. |
| `mortgage-se-documentation-assessment-v2.html` | `mortgage-se-documentation-assessment.bpmn` | `documentation-assessment` | **8** (S1-S8) | ⚠️ **DELVIS** | Används i Manual Credit Evaluation, Mortgage Commitment, Offer. |
| `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html` | `mortgage-se-credit-evaluation.bpmn` | `Activity_1gzlxx4` | **11** (S1-S11) | ⚠️ **DELVIS** | Används i Manual Credit Evaluation. Samma som credit-evaluation. |
| `mortgage-se-signing-per-digital-document-package-v2.html` | `mortgage-se-signing.bpmn` | (variant) | **7** (S1-S7) | ⚠️ **DELVIS** | Variant av signing - digital document package. |

---

## Prioritering för E2E-scenarion

### P0 - Kritiska processer (måste täckas i E2E)

1. **Application** (`mortgage-application-v2.html`) - 15 scenarion
   - S1: Normalflöde, en person ✅ (redan implementerat)
   - S2: Normalflöde, flera personer (medsökare) ⚠️ **SAKNAS**
   - S3-S15: Error cases, timeout, etc.

2. **KYC** (`mortgage-kyc-v2.html`) - 8 scenarion
   - S1: Normalflöde, auto-approve ⚠️ **SAKNAS**
   - S2: Manuell review ⚠️ **SAKNAS**
   - S3: Avvisad ⚠️ **SAKNAS**
   - S4-S8: Multi-instance scenarion ⚠️ **SAKNAS**

3. **Credit Evaluation** (`mortgage-se-credit-evaluation-v2.html`) - 11 scenarion
   - S1-S11: Olika evalueringsscenarion ⚠️ **SAKNAS**

4. **Credit Decision** (`mortgage-se-credit-decision-v2.html`) - 6 scenarion
   - ✅ Redan implementerat (FG_CREDIT_DECISION_TC01)

5. **Offer** (`mortgage-offer-v2.html`) - 9 scenarion
   - S1-S9: Offer preparation, accepted/rejected ⚠️ **SAKNAS**

6. **Signing** (`mortgage-se-signing-v2.html`) - 16 scenarion
   - S1-S16: Olika signing-scenarion ⚠️ **SAKNAS**

7. **Disbursement** (`mortgage-se-disbursement-v2.html`) - 6 scenarion
   - S1-S6: Utbetalningsscenarion ⚠️ **SAKNAS**

8. **Mortgage Commitment** (`mortgage-mortgage-commitment-v2.html`) - 11 scenarion
   - S1-S11: Köp-scenarion ⚠️ **SAKNAS**

9. **Object Valuation** (`mortgage-object-valuation-v2.html`) - 7 scenarion
   - S1-S7: Objektvärderingsscenarion ⚠️ **SAKNAS**

### P1 - Viktiga subprocesser (bör täckas i E2E)

10. **Internal Data Gathering** (`mortgage-se-internal-data-gathering-v2.html`) - 8 scenarion
11. **Stakeholder** (`mortgage-se-application-stakeholder-v2.html`) - 8 scenarion
12. **Household** (`mortgage-se-application-household-v2.html`) - 4 scenarion
13. **Object** (`mortgage-se-application-object-v2.html`) - 9 scenarion
14. **Document Generation** (`mortgage-se-document-generation-v2.html`) - 12 scenarion

### P2 - Alternativa flöden (kan täckas senare)

15. **Appeal** (`mortgage-appeal-v2.html`) - 10 scenarion
16. **Manual Credit Evaluation** (`mortgage-manual-credit-evaluation-v2.html`) - 11 scenarion
17. **Collateral Registration** (`mortgage-collateral-registration-v2.html`) - 9 scenarion
18. **Advance-flöden** (disbursement-advance, document-generation-advance)

---

## Identifierade E2E-scenarion (baserat på hela flöden)

### Happy Path-scenarion

#### 1. Refinansiering (inte köp) - Normalflöde
**Flöde:** Application → KYC → Credit Evaluation → Credit Decision → Offer → Document Generation → Signing → Disbursement → (Collateral Registration?)

**Feature Goals involverade:**
- `mortgage-application-v2.html` (S1 eller S2)
- `mortgage-kyc-v2.html` (S1)
- `mortgage-se-credit-evaluation-v2.html` (S1)
- `mortgage-se-credit-decision-v2.html` (S1)
- `mortgage-offer-v2.html` (S1)
- `mortgage-se-document-generation-v2.html` (S1)
- `mortgage-se-signing-v2.html` (S1)
- `mortgage-se-disbursement-v2.html` (S1)

**Status:** ⚠️ **SAKNAS** (endast Application S1 finns)

#### 2. Köp - Normalflöde
**Flöde:** Application → Mortgage Commitment → Object Valuation → Credit Evaluation → KYC → Credit Decision → Offer → Document Generation → Signing → Disbursement → (Collateral Registration?)

**Feature Goals involverade:**
- `mortgage-application-v2.html` (S1 eller S2)
- `mortgage-mortgage-commitment-v2.html` (S1)
- `mortgage-object-valuation-v2.html` (S1)
- `mortgage-kyc-v2.html` (S1)
- `mortgage-se-credit-evaluation-v2.html` (S1)
- `mortgage-se-credit-decision-v2.html` (S1)
- `mortgage-offer-v2.html` (S1)
- `mortgage-se-document-generation-v2.html` (S1)
- `mortgage-se-signing-v2.html` (S1)
- `mortgage-se-disbursement-v2.html` (S1)

**Status:** ⚠️ **SAKNAS**

#### 3. Med medsökare (multi-instance)
**Flöde:** Application (S2) → KYC (multi-instance) → ... (samma som ovan)

**Feature Goals involverade:**
- `mortgage-application-v2.html` (S2) - flera personer
- `mortgage-kyc-v2.html` (S4-S8) - multi-instance scenarion
- `mortgage-se-application-stakeholder-v2.html` (multi-instance)

**Status:** ⚠️ **SAKNAS** (användaren nämnde detta som viktigt)

### Error Path-scenarion

#### 4. Application avvisad (pre-screen)
**Flöde:** Application → Internal Data Gathering → Pre-screen avvisad → Error end event

**Feature Goals involverade:**
- `mortgage-application-v2.html` (S3 eller S4)
- `mortgage-se-internal-data-gathering-v2.html` (error scenario)

**Status:** ⚠️ **SAKNAS**

#### 5. KYC avvisad
**Flöde:** Application → KYC → KYC avvisad → Error end event

**Feature Goals involverade:**
- `mortgage-kyc-v2.html` (S3)

**Status:** ⚠️ **SAKNAS**

#### 6. Credit Decision avvisad
**Flöde:** Application → KYC → Credit Evaluation → Credit Decision → Avvisad → Error end event

**Feature Goals involverade:**
- `mortgage-se-credit-decision-v2.html` (error scenario)

**Status:** ⚠️ **SAKNAS**

### Alternative Path-scenarion

#### 7. Appeal-flöde
**Flöde:** Application → Credit Evaluation → (Not automatically approved) → Appeal → Manual Credit Evaluation → ...

**Feature Goals involverade:**
- `mortgage-appeal-v2.html` (S1-S10)
- `mortgage-manual-credit-evaluation-v2.html` (S1-S11)

**Status:** ⚠️ **SAKNAS**

#### 8. Advance-flöde
**Flöde:** Application → ... → Offer → (Boundary event: Advance needed) → Document Generation (advance) → Signing (advance) → Disbursement (advance)

**Feature Goals involverade:**
- `mortgage-se-document-generation-document-generation-advance-v2.html` (S1-S7)
- `mortgage-se-disbursement-disbursement-advance-v2.html` (S1-S5)

**Status:** ⚠️ **SAKNAS**

---

## Nästa steg

1. **Prioritera E2E-scenarion** baserat på:
   - Affärskritikalitet
   - Kundflöde (hur ofta används det?)
   - Multi-instance (medsökare - användaren nämnde detta)

2. **Bygg första E2E-scenario:**
   - Rekommendation: **Application med medsökare** (S2) - täcker multi-instance
   - Eller: **Refinansiering Happy Path** - täcker hela huvudflödet

3. **Följ checklistan** i `E2E_SCENARIO_CREATION_CHECKLIST.md`

---

## Noteringar

- **Application S2** (flera personer) är viktigt men saknas - användaren nämnde detta specifikt
- **KYC multi-instance** scenarion (S4-S8) saknas - viktigt för medsökare
- **Hela flöden** (från Application till Disbursement) saknas - endast delprocesser finns
- Många Feature Goals har **många testscenarion** (t.ex. Signing har 16, Application har 15) - vi behöver välja de mest relevanta för E2E

