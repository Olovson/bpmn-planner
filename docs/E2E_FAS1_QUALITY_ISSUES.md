# Fas 1: Identifierade kvalitetsbrister

**Datum:** 2025-01-XX  
**Status:** Analys pågår

---

## Analysmetod

Kvalitetsvalideringen (`/e2e-quality-validation`) gör följande:
1. Läser BPMN-filer och extraherar UserTasks, BusinessRuleTasks, ServiceTasks
2. Jämför med dokumentationen i `bankProjectTestSteps`
3. Identifierar brister

**Viktigt:** UserTasks, BusinessRuleTasks och ServiceTasks finns i subprocesserna (BPMN-filer), inte direkt i `bankProjectTestSteps`. Kvalitetsvalideringen hittar dem genom att läsa BPMN-filerna.

---

## Förväntade resultat från kvalitetsvalideringen

### E2E_BR001

**SubprocessSteps:**
- ✅ Alla 11 subprocessSteps har `given`, `when`, `then` dokumenterat

**BankProjectTestSteps:**
- ✅ Alla CallActivities har `uiInteraction` dokumenterat
- ✅ Alla Gateways har `dmnDecision` dokumenterat
- ✅ Alla ServiceTasks (via CallActivities) har `apiCall` dokumenterat

**Potentiella brister (som kvalitetsvalideringen skulle hitta):**
1. **UserTasks i subprocesser** - Kvalitetsvalideringen läser BPMN-filer och hittar UserTasks som:
   - `register-household-economy-information` (Household subprocess)
   - `register-personal-economy-information` (Stakeholder subprocess)
   - `confirm-application` (Application subprocess)
   - `decide-mortgage-commitment` (Mortgage Commitment subprocess)
   - `submit-self-declaration` (KYC subprocess)
   - `decide-offer` (Offer subprocess)
   - `distribute-notice-of-pledge-to-brf` (Collateral Registration subprocess)
   - `verify` (Collateral Registration subprocess)

   **Status:** Dessa UserTasks är dokumenterade i `bankProjectTestSteps` via CallActivities `uiInteraction`, men kvalitetsvalideringen kan inte matcha dem eftersom de inte finns som separata steg i `bankProjectTestSteps`.

2. **BusinessRuleTasks i subprocesser** - Kvalitetsvalideringen läser BPMN-filer och hittar BusinessRuleTasks som:
   - `select-product` (Credit Evaluation)
   - `determine-amortisation` (Credit Evaluation)
   - `evaluate-application` (Credit Evaluation)
   - `evaluate-credit-policies` (Credit Evaluation)
   - `assess-kyc-aml` (KYC)
   - `determine-decision-escalation` (Credit Decision)
   - `select-documents` (Document Generation)

   **Status:** Dessa är dokumenterade i `subprocessSteps.businessRulesSummary` men inte som separata steg i `bankProjectTestSteps`.

3. **ServiceTasks i subprocesser** - Kvalitetsvalideringen läser BPMN-filer och hittar ServiceTasks som:
   - `fetch-party-information` (Internal Data Gathering)
   - `fetch-engagements` (Internal Data Gathering)
   - `fetch-personal-information` (Stakeholder)
   - `valuate-property` (Object)
   - `fetch-brf-information` (Object Information)
   - `fetch-price` (Credit Evaluation)
   - `calculate-household-affordability` (Credit Evaluation)
   - `fetch-risk-classification` (Credit Evaluation)
   - `fetch-credit-information` (Credit Evaluation)
   - `fetch-kyc` (KYC)
   - `fetch-aml-kyc-risk` (KYC)
   - `fetch-screening-and-sanctions` (KYC)
   - `prepare-loan` (Document Generation)
   - `generate-documents` (Document Generation)
   - `upload-document` (Signing)
   - `create-signing-order` (Signing)
   - `store-signed-document` (Signing)
   - `handle-disbursement` (Disbursement)
   - `archive-documents` (Disbursement)
   - `distribute-notice-of-pledge-to-brf` (Collateral Registration)
   - `verify` (Collateral Registration)

   **Status:** Dessa är dokumenterade i `subprocessSteps.serviceTasksSummary` och i `bankProjectTestSteps` via CallActivities `apiCall`, men kvalitetsvalideringen kan inte matcha dem eftersom de inte finns som separata steg i `bankProjectTestSteps`.

---

## Problem: Kvalitetsvalideringen kan inte matcha UserTasks/ServiceTasks i subprocesser

**Orsak:** 
- UserTasks, BusinessRuleTasks och ServiceTasks finns i subprocesserna (BPMN-filer)
- De är dokumenterade i `bankProjectTestSteps` via CallActivities (aggregerat)
- Kvalitetsvalideringen försöker matcha dem direkt, men de finns inte som separata steg

**Lösning:**
1. **Alternativ 1:** Förbättra kvalitetsvalideringen för att också kolla `subprocessSteps.serviceTasksSummary`, `userTasksSummary`, `businessRulesSummary`
2. **Alternativ 2:** Lägg till separata steg i `bankProjectTestSteps` för UserTasks/ServiceTasks i subprocesser (men detta skulle göra `bankProjectTestSteps` mycket längre)
3. **Alternativ 3:** Acceptera att kvalitetsvalideringen visar "saknade" tasks, men dokumentera att de faktiskt är täckta via CallActivities

---

## Rekommendation

**Alternativ 1** är bäst - förbättra kvalitetsvalideringen för att också kolla `subprocessSteps` summaries.

**Nästa steg:**
1. Förbättra `validateBpmnMapping` för att också kolla `subprocessSteps.serviceTasksSummary`, `userTasksSummary`, `businessRulesSummary`
2. Matcha UserTasks/ServiceTasks/BusinessRuleTasks från BPMN-filer mot dessa summaries
3. Visa resultat i kvalitetsvalideringssidan

---

## Sammanfattning

**Status:** Scenarion är faktiskt ganska kompletta, men kvalitetsvalideringen kan inte matcha UserTasks/ServiceTasks i subprocesser eftersom de är dokumenterade via CallActivities istället för som separata steg.

**Åtgärd:** Förbättra kvalitetsvalideringen för att också kolla `subprocessSteps` summaries.

