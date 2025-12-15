# Identifierade E2E-scenarion: Komplett analys

**Genererad:** 2025-01-XX  
**Syfte:** Systematisk identifiering av alla E2E-scenarion baserat på BPMN-flöden och Feature Goal testscenarion

**Källor:**
- `E2E_BPMN_COMPLETE_OVERVIEW.md` - BPMN-flöden
- `E2E_FEATURE_GOAL_MAPPING.md` - Feature Goal testscenarion
- Faktiska BPMN-filer - sequence flows, gateways, boundary events
- Befintliga E2E-scenarion i `E2eTestsOverviewPage.tsx`

---

## Sammanfattning

- **Totalt identifierade E2E-scenarion:** 20+
- **Redan implementerade:** 2 (Application S1, Credit Decision)
- **Saknas (P0):** 8-10 kritiska scenarion
- **Saknas (P1):** 5-7 viktiga scenarion
- **Saknas (P2):** 5+ alternativa scenarion

---

## Huvudflöden från mortgage.bpmn (baserat på sequence flows)

### Flöde A: Refinansiering Happy Path (is-purchase = No)

**Sequence flows:**
1. `Event_0ssbeto` (start) → `application` (Flow_1fn7ls8)
2. `application` → `event-application-evaluation-completed` (Flow_0us992j)
3. `event-application-evaluation-completed` → `is-purchase` (Flow_05h03ml)
4. `is-purchase` → **No** → `Gateway_0m8pi2g` (is-purchase-no)
5. `Gateway_0m8pi2g` → `object-valuation` (Flow_06f0lv1)
6. `object-valuation` → `credit-evaluation` (Flow_1st6mta)
7. `credit-evaluation` → `event-credit-evaluation-completed` (Flow_0l53m32)
8. `event-credit-evaluation-completed` → `is-automatically-approved` (Flow_1gie2jo)
9. `is-automatically-approved` → **Yes** → `event-automatically-approved` (is-automatically-approved-yes)
10. `event-automatically-approved` → `Gateway_0kd315e` (Flow_0h4stlf)
11. `Gateway_0kd315e` → `event-credit-evaluation-complete` (Flow_01vw629)
12. `event-credit-evaluation-complete` → `kyc` (Flow_1cnua0l)
13. `kyc` → `credit-decision` (Flow_0sh7kx6)
14. `credit-decision` → `is-credit-approved` (Flow_1cd4ae2)
15. `is-credit-approved` → **Yes** → `event-credit-decision-completed` (is-credit-approved-yes)
16. `event-credit-decision-completed` → `Gateway_142qegf` (Flow_1fvldyx)
17. `Gateway_142qegf` → `offer` (Flow_01fkfe6)
18. `offer` → `event-loan-ready` (Flow_0rb02vx)
19. `event-loan-ready` → `document-generation` (Flow_0qnrs78)
20. `document-generation` → `Event_1u29t2f` (Documents generated) (Flow_103801l)
21. `Event_1u29t2f` → `signing` (Flow_13h9ucs)
22. `signing` → `event-signing-completed` (Flow_0grhoob)
23. `event-signing-completed` → `disbursement` (Flow_0vtuz4d)
24. `disbursement` → `event-loan-paid-out` (Flow_0wxwicl)
25. `event-loan-paid-out` → `needs-collateral-registration` (Flow_0lvbdw7)
26. `needs-collateral-registration` → **No** → `Gateway_13v2pnb` (needs-collateral-registration-no)
27. `Gateway_13v2pnb` → `event-application-evaluated` (Flow_19yg364) - **End Event**

**Totalt antal call activities:** 8 (application, object-valuation, credit-evaluation, kyc, credit-decision, offer, document-generation, signing, disbursement)

### Flöde B: Köp Happy Path (is-purchase = Yes)

**Sequence flows:**
1-3. Samma som Flöde A (start → application → event-application-evaluation-completed)
4. `is-purchase` → **Yes** → `mortgage-commitment` (is-purchase-yes)
5. `mortgage-commitment` → `Gateway_0m8pi2g` (Flow_0cdajbw)
6-27. Samma som Flöde A från steg 5 (object-valuation → ... → event-application-evaluated)

**Totalt antal call activities:** 9 (application, mortgage-commitment, object-valuation, credit-evaluation, kyc, credit-decision, offer, document-generation, signing, disbursement)

### Flöde C: Error Path - Application avvisad

**Sequence flows:**
1. `Event_0ssbeto` (start) → `application` (Flow_1fn7ls8)
2. `application` → **Boundary Event** `Event_0e92ljp` (error: application-aborted)
3. `Event_0e92ljp` → `Event_01ayceg` (Cancelled) (Flow_0kgadsb) - **End Event**

**Totalt antal call activities:** 1 (application - avbruten)

### Flöde D: Error Path - KYC avvisad

**Sequence flows:**
1-12. Samma som Flöde A (start → ... → kyc)
13. `kyc` → **Boundary Event** `Event_1swqs88` (escalation: kyc-rejected)
14. `Event_1swqs88` → `Event_1nb4ipv` (KYC rejected) (Flow_0q6qgux) - **End Event**

**Totalt antal call activities:** 5 (application, object-valuation, credit-evaluation, kyc - avvisad)

### Flöde E: Error Path - Credit Decision avvisad

**Sequence flows:**
1-14. Samma som Flöde A (start → ... → is-credit-approved)
15. `is-credit-approved` → **No** → `Event_0trq2wb` (Credit decision rejected) (is-credit-approved-no) - **End Event**

**Alternativt (via boundary event på offer):**
15. `offer` → **Boundary Event** `Event_0kfrwag` (escalation: credit-decision-rejected)
16. `Event_0kfrwag` → `Event_0oli25e` (Credit decision rejected) (Flow_0m8ynci) - **End Event**

**Totalt antal call activities:** 6-7 (application, object-valuation, credit-evaluation, kyc, credit-decision, offer - avvisad)

### Flöde F: Alternative Path - Appeal (automatiskt avvisad → appeal → manuell evaluering)

**Sequence flows:**
1-8. Samma som Flöde A (start → ... → is-automatically-approved)
9. `is-automatically-approved` → **No** → `is-automatically-rejected` (is-automatically-approved-no)
10. `is-automatically-rejected` → **Yes** → `Gateway_0f1a2lu` (is-automatically-rejected-yes)
11. `Gateway_0f1a2lu` → `appeal` (Flow_0b4xof6)
12. `appeal` → `Gateway_1qiy2jr` (Flow_105pnkf)
13. `Gateway_1qiy2jr` → `manual-credit-evaluation` (Flow_1jetu85)
14. `manual-credit-evaluation` → `event-application-manually-approved` (Flow_0p5lcqb)
15. `event-application-manually-approved` → `Gateway_0kd315e` (Flow_0tmgquz)
16-27. Samma som Flöde A från steg 11 (event-credit-evaluation-complete → ... → event-application-evaluated)

**Totalt antal call activities:** 10 (application, object-valuation, credit-evaluation, appeal, manual-credit-evaluation, kyc, credit-decision, offer, document-generation, signing, disbursement)

**Notering:** Appeal kan loopa om manual-credit-evaluation triggar "Automatically rejected" igen.

### Flöde G: Alternative Path - Manual Credit Evaluation (automatiskt avvisad → manuell evaluering, ingen appeal)

**Sequence flows:**
1-9. Samma som Flöde F (start → ... → is-automatically-rejected)
10. `is-automatically-rejected` → **No** → `manual-credit-evaluation` (is-automatically-rejected-no)
11-27. Samma som Flöde F från steg 14 (event-application-manually-approved → ... → event-application-evaluated)

**Totalt antal call activities:** 9 (application, object-valuation, credit-evaluation, manual-credit-evaluation, kyc, credit-decision, offer, document-generation, signing, disbursement)

### Flöde H: Alternative Path - Advance (boundary event på offer)

**Sequence flows:**
1-18. Samma som Flöde A (start → ... → offer)
19. `offer` → **Boundary Event** `event-trigger-advance` (message event)
20. `event-trigger-advance` → `event-advance-ready` (Flow_02o2y1t)
21. `event-advance-ready` → `document-generation-advance` (Flow_19p7nff)
22. `document-generation-advance` → `signing-advance` (Flow_0be9cnv)
23. `signing-advance` → `disbursement-advance` (Flow_0d7j912)
24. `disbursement-advance` → `event-advance-paid-out` (Flow_09pbc3u)
25. `event-advance-paid-out` → `Event_1pzbohb` (Flow_0p7vmml) - **End Event**

**Totalt antal call activities:** 8 (application, object-valuation, credit-evaluation, kyc, credit-decision, offer, document-generation-advance, signing-advance, disbursement-advance)

### Flöde I: Error Path - Mortgage Commitment avvisad (endast för köp)

**Sequence flows:**
1-4. Samma som Flöde B (start → ... → mortgage-commitment)
5. `mortgage-commitment` → **Boundary Event** `Event_1brk859` (error: mortgage-commitment-rejected)
6. `Event_1brk859` → `mortgage-commitment-rejected` (Automatically rejected) (Flow_1iodys8) - **End Event**

**Totalt antal call activities:** 2 (application, mortgage-commitment - avvisad)

### Flöde J: Error Path - Appeal timeout

**Sequence flows:**
1-11. Samma som Flöde F (start → ... → appeal)
12. `appeal` → **Boundary Event** `event-appeal-timeout` (timer/escalation)
13. `event-appeal-timeout` → `application-automatically-rejected` (Flow_1iwfpvp) - **End Event**

**Totalt antal call activities:** 5 (application, object-valuation, credit-evaluation, appeal - timeout)

---

## Identifierade E2E-scenarion (baserat på flöden + Feature Goals)

### P0 - Kritiska Happy Path-scenarion

#### E2E-001: Refinansiering Happy Path - En person
**Flöde:** Flöde A (Refinansiering Happy Path)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (redan implementerat som FG_APPLICATION_S1)
- `mortgage-kyc-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-decision-v2.html` (S1) - ✅ **FINNS** (redan implementerat som FG_CREDIT_DECISION_TC01)
- `mortgage-offer-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-document-generation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-signing-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-disbursement-v2.html` (S1) - ⚠️ **SAKNAS**

**Status:** ⚠️ **DELVIS** - Endast Application och Credit Decision finns. Resten saknas.

**Prioritet:** **P0** - Detta är huvudflödet för refinansiering.

#### E2E-002: Refinansiering Happy Path - Med medsökare (multi-instance)
**Flöde:** Flöde A (Refinansiering Happy Path) med multi-instance KYC och Stakeholder  
**Feature Goals:**
- `mortgage-application-v2.html` (S2) - ⚠️ **SAKNAS** (användaren nämnde detta specifikt)
- `mortgage-kyc-v2.html` (S4-S8) - ⚠️ **SAKNAS** (multi-instance scenarion)
- `mortgage-se-application-stakeholder-v2.html` (multi-instance) - ⚠️ **SAKNAS**
- Samma som E2E-001 för resten

**Status:** ⚠️ **SAKNAS** - Inget av detta finns.

**Prioritet:** **P0** - Användaren nämnde detta som viktigt.

#### E2E-003: Köp Happy Path - En person
**Flöde:** Flöde B (Köp Happy Path)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-mortgage-commitment-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-object-valuation-v2.html` (S1) - ⚠️ **SAKNAS**
- Samma som E2E-001 för resten

**Status:** ⚠️ **SAKNAS** - Mortgage Commitment och Object Valuation saknas.

**Prioritet:** **P0** - Detta är huvudflödet för köp.

#### E2E-004: Köp Happy Path - Med medsökare (multi-instance)
**Flöde:** Flöde B (Köp Happy Path) med multi-instance KYC och Stakeholder  
**Feature Goals:**
- `mortgage-application-v2.html` (S2) - ⚠️ **SAKNAS**
- `mortgage-mortgage-commitment-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-object-valuation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-kyc-v2.html` (S4-S8) - ⚠️ **SAKNAS**
- Samma som E2E-001 för resten

**Status:** ⚠️ **SAKNAS** - Inget av detta finns.

**Prioritet:** **P0** - Kombination av köp och multi-instance.

### P0 - Kritiska Error Path-scenarion

#### E2E-005: Application avvisad (pre-screen)
**Flöde:** Flöde C (Error Path - Application avvisad)  
**Feature Goals:**
- `mortgage-application-v2.html` (S3 eller S4) - ⚠️ **SAKNAS**
- `mortgage-se-internal-data-gathering-v2.html` (error scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P0** - Viktig error path.

#### E2E-006: KYC avvisad
**Flöde:** Flöde D (Error Path - KYC avvisad)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-kyc-v2.html` (S3) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P0** - Viktig error path.

#### E2E-007: Credit Decision avvisad
**Flöde:** Flöde E (Error Path - Credit Decision avvisad)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-kyc-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-decision-v2.html` (error scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P0** - Viktig error path.

### P1 - Viktiga Alternative Path-scenarion

#### E2E-008: Appeal-flöde (automatiskt avvisad → appeal → manuell evaluering → godkänd)
**Flöde:** Flöde F (Alternative Path - Appeal)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-appeal-v2.html` (S1-S10) - ⚠️ **SAKNAS**
- `mortgage-manual-credit-evaluation-v2.html` (S1-S11) - ⚠️ **SAKNAS**
- Samma som E2E-001 för resten

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P1** - Alternativt flöde, viktigt men inte lika kritiskt som happy path.

#### E2E-009: Manual Credit Evaluation (automatiskt avvisad → manuell evaluering → godkänd, ingen appeal)
**Flöde:** Flöde G (Alternative Path - Manual Credit Evaluation)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-manual-credit-evaluation-v2.html` (S1-S11) - ⚠️ **SAKNAS**
- Samma som E2E-001 för resten

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P1** - Alternativt flöde.

#### E2E-010: Advance-flöde (boundary event på offer)
**Flöde:** Flöde H (Alternative Path - Advance)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-kyc-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-credit-decision-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-offer-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-se-document-generation-document-generation-advance-v2.html` (S1-S7) - ⚠️ **SAKNAS**
- `mortgage-se-disbursement-disbursement-advance-v2.html` (S1-S5) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P1** - Alternativt flöde för advance.

### P2 - Mindre kritiska scenarion

#### E2E-011: Mortgage Commitment avvisad (endast för köp)
**Flöde:** Flöde I (Error Path - Mortgage Commitment avvisad)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-mortgage-commitment-v2.html` (error scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P2** - Endast för köp, mindre kritiskt.

#### E2E-012: Appeal timeout
**Flöde:** Flöde J (Error Path - Appeal timeout)  
**Feature Goals:**
- `mortgage-application-v2.html` (S1) - ✅ **FINNS** (kan återanvändas)
- `mortgage-se-credit-evaluation-v2.html` (S1) - ⚠️ **SAKNAS**
- `mortgage-appeal-v2.html` (timeout scenario) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P2** - Timeout-scenario, mindre kritiskt.

#### E2E-013: Collateral Registration (needs-collateral-registration = Yes)
**Flöde:** Flöde A med collateral-registration  
**Feature Goals:**
- Samma som E2E-001
- `mortgage-collateral-registration-v2.html` (S1-S9) - ⚠️ **SAKNAS**

**Status:** ⚠️ **SAKNAS**

**Prioritet:** **P2** - Beroende på gateway, inte alltid nödvändigt.

---

## Sammanfattning: Vad som saknas

### P0 - Kritiska scenarion (måste implementeras)

1. **E2E-001: Refinansiering Happy Path - En person** ⚠️ **DELVIS**
   - Saknas: KYC, Credit Evaluation, Offer, Document Generation, Signing, Disbursement
   - Finns: Application, Credit Decision

2. **E2E-002: Refinansiering Happy Path - Med medsökare** ⚠️ **SAKNAS**
   - Saknas: Allt (Application S2, KYC multi-instance, resten)

3. **E2E-003: Köp Happy Path - En person** ⚠️ **SAKNAS**
   - Saknas: Mortgage Commitment, Object Valuation, resten

4. **E2E-004: Köp Happy Path - Med medsökare** ⚠️ **SAKNAS**
   - Saknas: Allt

5. **E2E-005: Application avvisad** ⚠️ **SAKNAS**
   - Saknas: Application error scenario, Internal Data Gathering error

6. **E2E-006: KYC avvisad** ⚠️ **SAKNAS**
   - Saknas: KYC error scenario

7. **E2E-007: Credit Decision avvisad** ⚠️ **SAKNAS**
   - Saknas: Credit Decision error scenario

### P1 - Viktiga scenarion (bör implementeras)

8. **E2E-008: Appeal-flöde** ⚠️ **SAKNAS**
9. **E2E-009: Manual Credit Evaluation** ⚠️ **SAKNAS**
10. **E2E-010: Advance-flöde** ⚠️ **SAKNAS**

### P2 - Mindre kritiska scenarion (kan implementeras senare)

11. **E2E-011: Mortgage Commitment avvisad** ⚠️ **SAKNAS**
12. **E2E-012: Appeal timeout** ⚠️ **SAKNAS**
13. **E2E-013: Collateral Registration** ⚠️ **SAKNAS**

---

## Rekommendation: Implementeringsordning

### Fas 1: P0 Happy Path-scenarion (högsta prioritet)

1. **E2E-001: Refinansiering Happy Path - En person** (komplettera)
   - Bygg på befintliga Application S1 och Credit Decision
   - Lägg till: KYC S1, Credit Evaluation S1, Offer S1, Document Generation S1, Signing S1, Disbursement S1

2. **E2E-002: Refinansiering Happy Path - Med medsökare** (ny)
   - Användaren nämnde detta specifikt
   - Lägg till: Application S2, KYC multi-instance (S4-S8), Stakeholder multi-instance

3. **E2E-003: Köp Happy Path - En person** (ny)
   - Lägg till: Mortgage Commitment S1, Object Valuation S1
   - Återanvänd resten från E2E-001

### Fas 2: P0 Error Path-scenarion

4. **E2E-005: Application avvisad**
5. **E2E-006: KYC avvisad**
6. **E2E-007: Credit Decision avvisad**

### Fas 3: P1 Alternative Path-scenarion

7. **E2E-008: Appeal-flöde**
8. **E2E-009: Manual Credit Evaluation**
9. **E2E-010: Advance-flöde**

### Fas 4: P2 Mindre kritiska scenarion

10. **E2E-011: Mortgage Commitment avvisad**
11. **E2E-012: Appeal timeout**
12. **E2E-013: Collateral Registration**

---

## Nästa steg

1. **Prioritera första scenariot att bygga:**
   - Rekommendation: **E2E-001** (komplettera) eller **E2E-002** (medsökare - användaren nämnde detta)

2. **Följ checklistan** i `E2E_SCENARIO_CREATION_CHECKLIST.md`

3. **Bygg E2E-scenario** enligt befintlig struktur i `E2eTestsOverviewPage.tsx`

---

## Noteringar

- **Multi-instance** är viktigt (KYC, Stakeholder) - användaren nämnde detta specifikt
- **Hela flöden** saknas - endast delprocesser finns
- **Error paths** saknas helt - viktiga för att testa felhantering
- **Alternative paths** saknas - viktiga för att testa alternativa flöden

