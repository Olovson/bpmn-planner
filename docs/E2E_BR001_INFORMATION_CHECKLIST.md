# Information Checklist: E2E-BR-001 - En sökande, Bostadsrätt godkänd automatiskt

**Syfte:** Systematisk checklista för att säkerställa att vi har all information innan implementation

---

## Scenario-beskrivning

**E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)**

- En person köper sin första bostadsrätt
- Bostadsrätten uppfyller alla kriterier automatiskt
- **INGEN befintlig fastighet att sälja** (enklare scenario)
- Bostadsrättsvärde ≥ 1.5M SEK
- Föreningsskuld ≤ 5000 SEK/m²
- LTV-ratio ≤ 85%
- Plats är acceptabel (inte riskområde)

**BPMN-flöde:** Flöde B (Köp Happy Path) med is-purchase = Yes

---

## Checklista: Information som behövs

### ✅ 1. BPMN-flöde (Flöde B)

**Status:** ✅ **HAR JAG**
- Sequence flows dokumenterade i `E2E_SCENARIOS_IDENTIFIED.md`
- Call activities identifierade: 9 steg
- Gateway-beslut dokumenterade

**Call activities i ordning:**
1. `application` → `mortgage-se-application.bpmn`
2. `mortgage-commitment` → `mortgage-se-mortgage-commitment.bpmn`
3. `object-valuation` → `mortgage-se-object-valuation.bpmn`
4. `credit-evaluation` → `mortgage-se-credit-evaluation.bpmn`
5. `kyc` → `mortgage-se-kyc.bpmn` (multi-instance, men en person i detta scenario)
6. `credit-decision` → `mortgage-se-credit-decision.bpmn`
7. `offer` → `mortgage-se-offer.bpmn`
8. `document-generation` → `mortgage-se-document-generation.bpmn`
9. `signing` → `mortgage-se-signing.bpmn`
10. `disbursement` → `mortgage-se-disbursement.bpmn`

---

### ⚠️ 2. Feature Goals - Testscenarion

#### ✅ Application S1
**Status:** ✅ **HAR JAG**
- Feature Goal: `mortgage-application-v2.html` (S1)
- Testscenario finns
- UI Flow finns
- Testdata: `customer-standard`

#### ⚠️ Mortgage Commitment S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-mortgage-commitment-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ⚠️ Object Valuation S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-object-valuation-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ⚠️ Object Information S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-se-object-information-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata
- Viktigt: Bostadsrätt-specifika regler (föreningsskuld, LTV-ratio, plats)

#### ⚠️ KYC S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-kyc-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata
- Notera: Multi-instance, men en person i detta scenario

#### ⚠️ Credit Evaluation S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-se-credit-evaluation-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ✅ Credit Decision S1
**Status:** ✅ **HAR JAG**
- Feature Goal: `mortgage-se-credit-decision-v2.html` (S1)
- Redan implementerat

#### ⚠️ Offer S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-offer-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ⚠️ Document Generation S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-se-document-generation-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ⚠️ Signing S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-se-signing-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

#### ⚠️ Disbursement S1
**Status:** ⚠️ **BEHÖVER LÄSA**
- Feature Goal: `mortgage-se-disbursement-v2.html` (S1)
- Behöver: Testscenario, UI Flow, testdata

---

### ⚠️ 3. UI Flow per Feature Goal

**Status:** ⚠️ **BEHÖVER LÄSA**
- UI Flow finns i Feature Goals (expanderbara detaljer)
- Behöver: Page ID, Action, Locator ID, Data Profile för varje steg

---

### ⚠️ 4. Testdata-profiler

**Status:** ⚠️ **BEHÖVER LÄSA**
- `customer-standard` - för Application S1
- Behöver: Testdata för alla andra steg
- Bostadsrätt-specifik testdata (värde ≥ 1.5M, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%)

---

### ⚠️ 5. DMN-beslut och resultat

**Status:** ⚠️ **BEHÖVER VERIFIERA**
- Alla DMN-beslut ska returnera APPROVED för happy path
- Behöver: Vilka DMN-beslut finns i varje steg?
- Behöver: Vilka värden ger APPROVED?

---

### ⚠️ 6. Gateway-beslut

**Status:** ✅ **HAR JAG DELVIS**
- `is-purchase` → **Yes** (för köp)
- `is-automatically-approved` → **Yes** (för happy path)
- `is-credit-approved` → **Yes** (för happy path)
- `needs-collateral-registration` → **No** (för enklare scenario)

---

## Nästa steg

1. ✅ Läsa Feature Goals för alla saknade steg
2. ✅ Extrahera UI Flow från Feature Goals
3. ✅ Identifiera testdata-profiler
4. ✅ Verifiera DMN-beslut och resultat
5. ✅ Skapa komplett E2E-scenario i `E2eTestsOverviewPage.tsx`
6. ✅ Skapa testfil

---

## Noteringar

**Vad som saknas:**
- Feature Goal testscenarion för de flesta steg (endast Application och Credit Decision finns)
- UI Flow för de flesta steg
- Testdata-profiler för de flesta steg
- DMN-beslut och deras resultat

**Vad som behöver göras:**
- Läsa Feature Goals systematiskt
- Extrahera information från Feature Goals
- Notera saknade user stories i `E2E_MISSING_USER_STORIES.md` om något saknas

