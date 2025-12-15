# Definierade E2E-scenarion på sidan

**Uppdaterad:** 2025-01-XX  
**Sida:** `http://localhost:8080/#/e2e-tests`

---

## Totalt antal scenarion: 5

### 1. FG_CREDIT_DECISION_TC01
**Namn:** Mortgage SE – Credit Decision – Happy Path  
**Prioritet:** P0  
**Typ:** happy-path  
**Iteration:** Köp bostadsrätt  
**BPMN-process:** `mortgage-se-credit-decision.bpmn`  
**Omfattning:** Endast Credit Decision-subprocessen  
**Status:** ✅ Implementerad (testfil finns)  
**Testfil:** `mortgage-credit-decision-happy.spec.ts`

**Beskrivning:**  
Testar kreditbesluts-subprocessen isolerat. Verifierar att mortgage-hierarkin laddas korrekt under ett hypotetiskt auto-approve-scenario.

---

### 2. FG_APPLICATION_S1
**Namn:** Application – Normalflöde, komplett ansökan med en person  
**Prioritet:** P0  
**Typ:** happy-path  
**Iteration:** Köp bostadsrätt  
**BPMN-process:** `mortgage-se-application.bpmn`  
**Omfattning:** Endast Application-subprocessen  
**Status:** ✅ Implementerad (testfil finns)  
**Testfil:** `mortgage-application-happy.spec.ts`

**Beskrivning:**  
Täcker huvudflödet för Application-subprocessen där en kund fyller i en komplett ansökan med en person och processen avslutas med en ansökan redo för kreditevaluering.

**Teststeg:**
- Internal data gathering
- Stakeholder (en person)
- Household
- Object
- Confirm application

---

### 3. FG_APPLICATION_S3
**Namn:** Application – Pre-screen avvisad  
**Prioritet:** P0  
**Typ:** error  
**Iteration:** Köp bostadsrätt  
**BPMN-process:** `mortgage-se-application.bpmn`  
**Omfattning:** Endast Application-subprocessen (error path)  
**Status:** ⚠️ Definierad men testfil saknas  
**Testfil:** `mortgage-application-pre-screen-rejected.spec.ts` (saknas)

**Beskrivning:**  
Täcker error-flödet där pre-screening avvisar ansökan eftersom kunden inte uppfyller grundläggande krav.

**Teststeg:**
- Internal data gathering
- Screen party (DMN returnerar REJECTED)
- Pre-screen rejected (boundary event)

---

### 4. FG_APPLICATION_S2
**Namn:** Application – Normalflöde, ansökan med flera personer (medsökare)  
**Prioritet:** P0  
**Typ:** happy-path  
**Iteration:** Köp bostadsrätt  
**BPMN-process:** `mortgage-se-application.bpmn`  
**Omfattning:** Endast Application-subprocessen (multi-instance)  
**Status:** ✅ Implementerad (testfil finns)  
**Testfil:** `mortgage-application-multi-stakeholder.spec.ts`

**Beskrivning:**  
Täcker huvudflödet för Application-subprocessen där flera personer (huvudansökande och medsökare) ansöker tillsammans. Systemet bearbetar varje hushåll individuellt med sekventiell körning per hushåll.

**Teststeg:**
- Internal data gathering (multi-instance per part)
- Household (multi-instance per hushåll)
- Stakeholder (multi-instance, sekventiellt per hushåll)
- Object (sekventiellt efter Stakeholder per hushåll)
- KALP-beräkning
- Screen KALP
- Confirm application
- Fetch credit information (multi-instance per stakeholder)

---

### 5. E2E_BR001 ⭐
**Namn:** E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)  
**Prioritet:** P0  
**Typ:** happy-path  
**Iteration:** Köp bostadsrätt  
**BPMN-process:** `mortgage.bpmn` (root process)  
**Omfattning:** **KOMPLETT E2E-FLÖDE** - Hela processen från Application till Disbursement  
**Status:** ✅ Implementerad (testfil finns)  
**Testfil:** `mortgage-bostadsratt-happy.spec.ts`

**Beskrivning:**  
Komplett E2E-scenario för en person som köper sin första bostadsrätt. Bostadsrätten uppfyller alla kriterier automatiskt (värde ≥ 1.5M SEK, föreningsskuld ≤ 5000 SEK/m², LTV ≤ 85%, plats acceptabel). INGEN befintlig fastighet att sälja.

**Teststeg (15 steg):**
1. Application
2. Is purchase? (gateway → Yes)
3. Mortgage Commitment
4. Object Valuation (bostadsrätt)
5. Object Information (bostadsrätt, BRF-screening)
6. Credit Evaluation
7. Is automatically approved? (gateway → Yes)
8. KYC
9. Credit Decision
10. Is credit approved? (gateway → Yes)
11. Offer
12. Document Generation
13. Signing
14. Disbursement
15. Needs collateral registration? (gateway → No)

**Subprocess-steg (11 steg):**
1. Application (S1)
2. Mortgage Commitment (S1)
3. Object Valuation (S2 - bostadsrätt)
4. Object Information (S2 - bostadsrätt)
5. Credit Evaluation (S1)
6. KYC (S1)
7. Credit Decision (S1)
8. Offer (S1)
9. Document Generation (S1)
10. Signing (S1)
11. Disbursement (S1)

---

## Sammanfattning

### E2E-scenarion (kompletta flöden)
- ✅ **E2E_BR001** - Komplett flöde från Application till Disbursement (EN sökande, bostadsrätt)

### Subprocess-scenarion (delprocesser)
- ✅ **FG_CREDIT_DECISION_TC01** - Credit Decision isolerat
- ✅ **FG_APPLICATION_S1** - Application med en person
- ✅ **FG_APPLICATION_S2** - Application med medsökare
- ⚠️ **FG_APPLICATION_S3** - Application Pre-screen avvisad (definierad men testfil saknas)

---

## Status per scenario

| Scenario ID | Namn | Typ | Omfattning | Testfil | Status |
|------------|------|-----|-----------|---------|--------|
| FG_CREDIT_DECISION_TC01 | Credit Decision Happy Path | happy-path | Subprocess | ✅ Finns | ✅ Klar |
| FG_APPLICATION_S1 | Application med en person | happy-path | Subprocess | ✅ Finns | ✅ Klar |
| FG_APPLICATION_S2 | Application med medsökare | happy-path | Subprocess | ✅ Finns | ✅ Klar |
| FG_APPLICATION_S3 | Application Pre-screen avvisad | error | Subprocess | ❌ Saknas | ⚠️ Definierad |
| E2E_BR001 | Bostadsrätt godkänd automatiskt | happy-path | **KOMPLETT E2E** | ✅ Finns | ✅ Klar |

---

## Noteringar

**Vad som är definierat:**
- 1 komplett E2E-scenario (E2E_BR001) - går genom hela flödet
- 3 subprocess-scenarion (Application S1, S2, Credit Decision)
- 1 error-scenario (Application S3) - definierad men testfil saknas

**Vad som saknas (enligt prioritering):**
- E2E-005: Application avvisad (pre-screen) - ⚠️ Delvis (FG_APPLICATION_S3 finns men testfil saknas)
- E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt - ❌ Saknas
- E2E-006: KYC avvisad - ❌ Saknas
- E2E-007: Credit Decision avvisad - ❌ Saknas

**Rekommendation:**
- E2E_BR001 är det första kompletta E2E-scenariot och täcker det enklaste och vanligaste scenariot
- Nästa steg: Implementera E2E-005 (Application avvisad) genom att skapa testfil för FG_APPLICATION_S3

