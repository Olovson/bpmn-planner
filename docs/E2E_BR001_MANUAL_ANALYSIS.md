# Manuell analys: E2E_BR001 - En sökande, Bostadsrätt godkänd automatiskt

**Datum:** 2025-01-XX  
**Metod:** Manuell läsning av BPMN-filer steg-för-steg  
**Script som hjälpmedel:** `scripts/analyze-e2e-scenario.ts` (för validering)

---

## Flöde: Köp Happy Path (is-purchase = Yes)

### Root process: mortgage.bpmn

Följer sequence flows från start-event till end-event:

1. **Start Event** (`Event_0ssbeto`)
   - `Flow_1fn7ls8` → `application`

2. **Application** (`application`) - CallActivity
   - BPMN-fil: `mortgage-se-application.bpmn`
   - `Flow_0us992j` → `event-application-evaluation-completed`

3. **Application completed** (`event-application-evaluation-completed`) - IntermediateThrowEvent
   - `Flow_05h03ml` → `is-purchase`

4. **Is purchase?** (`is-purchase`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Yes (köp)
   - `is-purchase-yes` → `mortgage-commitment`

5. **Mortgage commitment** (`mortgage-commitment`) - CallActivity
   - BPMN-fil: `mortgage-se-mortgage-commitment.bpmn`
   - `Flow_0cdajbw` → `Gateway_0m8pi2g`

6. **Gateway_0m8pi2g** - Merge Gateway (flera incoming, en outgoing)
   - `Flow_06f0lv1` → `object-valuation`

7. **Object valuation** (`object-valuation`) - CallActivity
   - BPMN-fil: `mortgage-se-object-valuation.bpmn`
   - `Flow_1st6mta` → `credit-evaluation`

8. **Credit evaluation** (`credit-evaluation`) - CallActivity
   - BPMN-fil: `mortgage-se-credit-evaluation.bpmn`
   - `Flow_0l53m32` → `event-credit-evaluation-completed`

9. **Credit evaluation completed** (`event-credit-evaluation-completed`) - IntermediateThrowEvent
   - `Flow_1gie2jo` → `is-automatically-approved`

10. **Is automatically approved?** (`is-automatically-approved`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** Yes (happy path)
    - `is-automatically-approved-yes` → `event-automatically-approved`

11. **Application automatically approved** (`event-automatically-approved`) - IntermediateThrowEvent
    - `Flow_0h4stlf` → `Gateway_0kd315e`

12. **Gateway_0kd315e** - Merge Gateway
    - `Flow_01vw629` → `event-credit-evaluation-complete`

13. **Credit evaluation complete** (`event-credit-evaluation-complete`) - IntermediateThrowEvent
    - `Flow_1cnua0l` → `kyc`

14. **KYC** (`kyc`) - CallActivity (Multi-instance)
    - BPMN-fil: `mortgage-se-kyc.bpmn`
    - `Flow_0sh7kx6` → `credit-decision`

15. **Credit decision** (`credit-decision`) - CallActivity
    - BPMN-fil: `mortgage-se-credit-decision.bpmn`
    - `Flow_1cd4ae2` → `is-credit-approved`

16. **Is credit approved?** (`is-credit-approved`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** Yes (happy path)
    - `is-credit-approved-yes` → `event-credit-decision-completed`

17. **Credit decision completed** (`event-credit-decision-completed`) - IntermediateThrowEvent
    - `Flow_1fvldyx` → `Gateway_142qegf`

18. **Gateway_142qegf** - Merge Gateway
    - `Flow_01fkfe6` → `offer`

19. **Offer** (`offer`) - CallActivity
    - BPMN-fil: `mortgage-se-offer.bpmn`
    - `Flow_0rb02vx` → `event-loan-ready`

20. **Offer ready** (`event-loan-ready`) - IntermediateThrowEvent
    - `Flow_0qnrs78` → `document-generation`

21. **Document generation** (`document-generation`) - CallActivity
    - BPMN-fil: `mortgage-se-document-generation.bpmn`
    - `Flow_103801l` → `Event_1u29t2f` (Documents generated)

22. **Documents generated** (`Event_1u29t2f`) - IntermediateThrowEvent
    - `Flow_13h9ucs` → `signing`

23. **Signing** (`signing`) - CallActivity
    - BPMN-fil: `mortgage-se-signing.bpmn`
    - `Flow_0grhoob` → `event-signing-completed`

24. **Signing completed** (`event-signing-completed`) - IntermediateThrowEvent
    - `Flow_0vtuz4d` → `disbursement`

25. **Disbursement** (`disbursement`) - CallActivity
    - BPMN-fil: `mortgage-se-disbursement.bpmn`
    - `Flow_0wxwicl` → `event-loan-paid-out`

26. **Loan paid out** (`event-loan-paid-out`) - IntermediateThrowEvent
    - `Flow_0lvbdw7` → `needs-collateral-registration`

27. **Needs collateral registration?** (`needs-collateral-registration`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** No (enklare scenario)
    - `needs-collateral-registration-no` → `Gateway_13v2pnb`

28. **Gateway_13v2pnb** - Merge Gateway
    - `Flow_19yg364` → `event-application-evaluated`

29. **Application evaluated** (`event-application-evaluated`) - EndEvent
    - **Done!**

---

## Subprocesser - Rekursiv analys

### 1. Application (mortgage-se-application.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`Event_0isinbn`)
   - `Flow_1mx0l8r` → `internal-data-gathering`

2. **Internal data gathering** (`internal-data-gathering`) - CallActivity (Multi-instance)
   - BPMN-fil: `mortgage-se-internal-data-gathering.bpmn`
   - `Flow_1gmipm5` → `object`
   - **Boundary Event:** `Event_03349px` → Party rejected (error path)

3. **Object** (`object`) - CallActivity
   - BPMN-fil: `mortgage-se-object.bpmn`
   - `Flow_02jau0k` → `stakeholders`
   - **Boundary Event:** `Event_152muhg` → Object rejected (error path)

4. **Stakeholders** (`stakeholders`) - SubProcess (Multi-instance per household)
   - **Start Event** (`Event_183o8p8`)
   - `Flow_09zs5qk` → `household`
   - **Household** (`household`) - CallActivity
     - BPMN-fil: `mortgage-se-household.bpmn`
     - `Flow_0kl056u` → `stakeholder`
   - **Stakeholder** (`stakeholder`) - CallActivity (Multi-instance per stakeholder)
     - BPMN-fil: `mortgage-se-stakeholder.bpmn`
     - `Flow_0juj7si` → End Event
   - **End Event** (`Event_0gupj82`)
   - `Flow_1f4z8v0` → `skip-confirm-application`
   - **Boundary Event:** `Event_1dhapnx` → Stakeholder rejected (error path)

5. **Skip step?** (`skip-confirm-application`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** No (för happy path, kör KALP)
   - `skip-confirm-application-no` → `KALP`

6. **KALP** (`Activity_0p3rqyp`) - ServiceTask
   - `Flow_04bzpjt` → `Screen KALP`

7. **Screen KALP** (`Activity_1mezc6h`) - BusinessRuleTask
   - `Flow_0i63pbb` → `KALP OK?`

8. **KALP OK?** (`Gateway_0fhav15`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Yes (happy path)
   - `kalp-ok-yes` → `confirm-application`

9. **Confirm application** (`confirm-application`) - UserTask
   - `Flow_1kf7xpl` → `Gateway_1nszp2i`
   - **Boundary Event:** `Event_0ao6cvb` → Timeout (error path)

10. **Gateway_1nszp2i** - Merge Gateway
    - `Flow_057rr37` → `fetch-credit-information`

11. **Fetch credit information** (`fetch-credit-information`) - ServiceTask
    - `Flow_0ftw594` → End Event (`Event_0j4buhs`)

**Totalt antal call activities i Application:** 4 (internal-data-gathering, object, household, stakeholder)

### 2. Mortgage commitment (mortgage-se-mortgage-commitment.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`start-event`)
   - `Flow_16u2qn6` → `Gateway_1hxgyw1`

2. **Gateway_1hxgyw1** - Merge Gateway
   - `Flow_1ndjta3` → `credit-evaluation-1`

3. **Credit evaluation 1** (`credit-evaluation-1`) - CallActivity
   - BPMN-fil: `mortgage-se-credit-evaluation.bpmn`
   - `Flow_1xnru8c` → `is-mortgage-commitment-approved`

4. **Is mortgage commitment approved?** (`is-mortgage-commitment-approved`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Yes (happy path)
   - `is-mortgage-commitment-approved-yes` → `mortgage-commitment-ready`

5. **Mortgage commitment ready** (`mortgage-commitment-ready`) - IntermediateThrowEvent
   - `Flow_1phb919` → `Gateway_0upjuan`

6. **Gateway_0upjuan** - Merge Gateway
   - `Flow_011wh3v` → `Activity_1xrvxr3` (SubProcess: Decide on mortgage commitment)

7. **Decide on mortgage commitment** (`Activity_1xrvxr3`) - SubProcess
   - **Start Event** (`Event_18rlgin`)
   - `Flow_03g2l11` → `decide-mortgage-commitment`
   - **Decide on mortgage commitment** (`decide-mortgage-commitment`) - UserTask
     - `Flow_0ael636` → End Event (`Event_09xxhnw`)
     - **Boundary Event:** `Event_0o7mt0k` → Upload documentation (non-interrupting)
       - `Flow_0l4v39q` → `documentation-assessment`
   - **Documentation assessment** (`documentation-assessment`) - CallActivity
     - BPMN-fil: `mortgage-se-documentation-assessment.bpmn`
     - `Flow_14iefmj` → End Event (`Event_08klgt4`)
   - **End Event** → `Flow_0mu1ob6` → `mortgage-commitment-decision`
   - **Boundary Events:**
     - `Event_1t9r73x` → Credit re-evaluation required
     - `Event_0z4ifsl` → Timeout (Mortgage commitment expired)

8. **Decision?** (`mortgage-commitment-decision`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** `decision-proceed` (för happy path, inte add-terms)
   - `decision-proceed` → `is-object-evaluated`

9. **Is object evaluated?** (`is-object-evaluated`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** No (för happy path, objekt är inte utvärderat än)
   - `Flow_02wen6m` → `object-information`

10. **Object information** (`object-information`) - CallActivity
    - BPMN-fil: `mortgage-se-object-information.bpmn`
    - `Flow_0elu9n5` → `Gateway_14ve2uc`

11. **Gateway_14ve2uc** - Merge Gateway
    - `Flow_15wuhaj` → `is-object-approved`

12. **Object rejected?** (`is-object-approved`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** No (objekt är godkänt = happy path)
    - `is-object-rejected-no` → `has-terms-changed`

13. **Has terms changed?** (`has-terms-changed`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** No (för happy path, inga villkor har ändrats)
    - `has-terms-changed-no` → `Gateway_0bsnrjk`

14. **Gateway_0bsnrjk** - Merge Gateway
    - `Flow_0gym6ov` → `is-terms-approved`

15. **Is terms approved?** (`is-terms-approved`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** Yes (happy path)
    - `is-terms-approved-yes` → `won-bidding-round`

16. **Won bidding round?** (`won-bidding-round`) - ExclusiveGateway
    - **Beslut för E2E_BR001:** Yes (happy path)
    - `won-bidding-round-yes` → End Event (`Event_0az10av`)

**Totalt antal call activities i Mortgage Commitment:** 3 (credit-evaluation-1, object-information, documentation-assessment)

### 3. Internal data gathering (mortgage-se-internal-data-gathering.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`Event_1iswmjx`)
   - `Flow_1egytpc` → `fetch-party-information`

2. **Fetch party information** (`fetch-party-information`) - ServiceTask
   - `Flow_126zrwf` → `screen-party`

3. **Screen party** (`screen-party`) - BusinessRuleTask
   - `Flow_1sb7gov` → `is-party-rejected`

4. **Party rejected?** (`is-party-rejected`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** No (happy path, party är inte rejected)
   - `is-party-rejected-no` → `fetch-engagements`

5. **Fetch engagements** (`fetch-engagements`) - ServiceTask
   - `Flow_1jhxo77` → End Event (`Event_02y6rvx`)

**Totalt antal call activities:** 0 (inga subprocesser)

### 4. Object valuation (mortgage-se-object-valuation.bpmn)

**Körordning (Happy Path - Bostadsrätt):**

1. **Start Event** (`start-event`)
   - `Flow_1cbhztn` → `object-type`

2. **Object type** (`object-type`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Bostadsrätt
   - `object-type-bostadsratt` → `fetch-bostadsratts-valuation`

3. **Fetch bostadsrätts-valuation** (`fetch-bostadsratts-valuation`) - ServiceTask
   - `Flow_00r9zi3` → `Gateway_0f8c0ne`

4. **Gateway_0f8c0ne** - Merge Gateway
   - `dsadsad` → End Event (`process-end-event`)

**Totalt antal call activities:** 0

### 5. Object information (mortgage-se-object-information.bpmn)

**Körordning (Happy Path - Bostadsrätt):**

1. **Start Event** (`start-event`)
   - `Flow_1cbhztn` → `object-type`

2. **Object type** (`object-type`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Bostadsrätt
   - `object-type-bostadsratt` → `fetch-brf-information`

3. **Fetch BRF information** (`fetch-brf-information`) - ServiceTask
   - `Flow_0lu8bq7` → `evaluate-bostadsratt`

4. **Screen bostadsrätt** (`evaluate-bostadsratt`) - BusinessRuleTask
   - `Flow_0fndf5v` → `Gateway_0f8c0ne`

5. **Gateway_0f8c0ne** - Merge Gateway
   - `dsadsad` → End Event (`process-end-event`)

**Totalt antal call activities:** 0

### 6. Credit evaluation (mortgage-se-credit-evaluation.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`start-event`)
   - `Flow_1p1bcfj` → `select-product`

2. **Select product** (`select-product`) - BusinessRuleTask
   - `Flow_12v4nt4` → `fetch-price`

3. **Fetch price** (`fetch-price`) - ServiceTask
   - `Flow_0zr9s3c` → `determine-amortisation`

4. **Determine amortisation** (`determine-amortisation`) - BusinessRuleTask
   - `Flow_0fbo1lt` → `loop-household` (SubProcess)

5. **For each household** (`loop-household`) - SubProcess (Multi-instance)
   - (Beräknar affordability per hushåll)

6. **Fetch risk classification** (`fetch-risk-classification`) - ServiceTask
   - `Flow_0olredq` → `evaluate-application`

7. **Evaluate application** (`evaluate-application`) - BusinessRuleTask
   - `Flow_01spshu` → `evaluate-credit-policies`

8. **Evaluate credit policies** (`evaluate-credit-policies`) - BusinessRuleTask
   - `Flow_087v7qx` → End Event (`process-end-event`)

**Totalt antal call activities:** 0

### 7. KYC (mortgage-se-kyc.bpmn)

**Körordning (Happy Path - Auto-approved):**

1. **Start Event** (`start-event`)
   - `Flow_1cbhztn` → `fetch-kyc`

2. **Fetch KYC** (`fetch-kyc`) - ServiceTask
   - `Flow_0y06b65` → `kyc-questions-needed` (Gateway)

3. **KYC questions needed?** (`kyc-questions-needed`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** No (happy path, inga frågor behövs)
   - `needs-questions-no` → `fetch-aml-kyc-risk`

4. **Fetch AML / KYC risk score** (`fetch-aml-kyc-risk`) - ServiceTask
   - `Flow_03r9kps` → `fetch-screening-and-sanctions`

5. **Fetch sanctions and PEP** (`fetch-screening-and-sanctions`) - ServiceTask
   - `Flow_1l72610` → `assess-kyc-aml`

6. **Evaluate KYC/AML** (`assess-kyc-aml`) - BusinessRuleTask
   - `Flow_1myqhzo` → `needs-review`

7. **Needs review?** (`needs-review`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** No (happy path, auto-approved)
   - `needs-review-no` → `Gateway_1lmj6ts`

8. **Gateway_1lmj6ts** - Merge Gateway
   - `Flow_0y06b65` → End Event (`process-end-event`)

**Totalt antal call activities:** 0

### 8. Credit decision (mortgage-se-credit-decision.bpmn)

**Körordning:**
- Systemtask som fattar kreditbeslut
- Inga call activities eller gateways (enkel process)

### 9. Offer (mortgage-se-offer.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`start-event`)
   - `Flow_07iil1n` → `sales-contract-assessed`

2. **Sales contract assessed?** (`sales-contract-assessed`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Yes (för happy path, kontrakt är redan bedömt)
   - `sales-contract-assessed-yes` → `Gateway_0m9hox9`

3. **Gateway_0m9hox9** - Merge Gateway
   - `Flow_1xqs76i` → `Gateway_0hrcun3`

4. **Gateway_0hrcun3** - Merge Gateway
   - `Flow_16n2ck3` → `decide-offer`

5. **Decide offer** (`decide-offer`) - UserTask
   - `Flow_0q8jsaq` → `offer-decision`

6. **Offer decision** (`offer-decision`) - ExclusiveGateway
   - **Beslut för E2E_BR001:** Accept offer
   - `offer-decision-accept` → End Event (`process-end-event`)

**Call activities i Offer:**
- `credit-decision` → `mortgage-se-credit-decision.bpmn`
- `documentation-assessment` → `mortgage-se-documentation-assessment.bpmn`
- `sales-contract-credit-decision` → `mortgage-se-credit-decision.bpmn`

**Totalt antal call activities:** 3

### 10. Document generation (mortgage-se-document-generation.bpmn)

**Körordning:**

1. **Start Event** (`StartEvent_1`)
   - `Flow_1lqf7ht` → `Prepare loan`

2. **Prepare loan** (`Activity_1qsvac1`) - ServiceTask
   - `Flow_0dwbnq2` → `select-documents`

3. **Select documents** (`select-documents`) - BusinessRuleTask
   - `Flow_146e8jb` → `generate-documents`

4. **Generate Document** (`generate-documents`) - ServiceTask (Multi-instance)
   - `Flow_013ro9v` → End Event (`Event_1vwpr3l`)

**Totalt antal call activities:** 0

### 11. Signing (mortgage-se-signing.bpmn)

**Körordning (Happy Path - Digital):**

1. **Start Event** (`start-event`)
   - `Flow_1khnauh` → `signing-methods`

2. **Signing methods?** (`signing-methods`) - InclusiveGateway
   - **Beslut för E2E_BR001:** Digital
   - `digital` → `per-digital-document-package`

3. **Per digital document package** (`per-digital-document-package`) - SubProcess (Multi-instance)
   - `Flow_16sv59a` → `per-signee`

4. **Per signee** (`per-signee`) - SubProcess (Multi-instance)
   - `Flow_0q1vus5` → `store-signed-document`

5. **Store signed document** (`store-signed-document`) - ServiceTask
   - `Flow_02jphgx` → End Event (`Event_0lxhh2n`)

**Totalt antal call activities:** 0

### 12. Disbursement (mortgage-se-disbursement.bpmn)

**Körordning (Happy Path):**

1. **Start Event** (`start-event`)
   - `Flow_1o0uuwd` → `handle-disbursement`

2. **Handle disbursement** (`handle-disbursement`) - ServiceTask
   - `Flow_0geszxp` → `Gateway_15wjsxm`

3. **Gateway_15wjsxm** - Event-based Gateway
   - Väntar på antingen "Disbursement completed" eller "Disbursement cancelled"
   - **För E2E_BR001:** `disbursement-completed`
   - `Flow_178gpcv` → `disbursement-completed`

4. **Disbursement completed** (`disbursement-completed`) - IntermediateCatchEvent
   - `Flow_11bdea0` → `archive-documents`

5. **Archive documents** (`archive-documents`) - ServiceTask
   - `Flow_0qzovsm` → End Event (`Event_0gubmbi`)

**Totalt antal call activities:** 0

---

## Nästa steg

1. ✅ Dokumenterat huvudflöde i mortgage.bpmn
2. ⏳ Läsa varje subprocess BPMN-fil och dokumentera deras flöden
3. ⏳ Mappa till Feature Goals
4. ⏳ Skapa komplett struktur i E2eTestsOverviewPage.tsx

