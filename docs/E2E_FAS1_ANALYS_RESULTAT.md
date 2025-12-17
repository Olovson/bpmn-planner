# Fas 1: Analys av valideringsresultat

**Datum:** 2025-01-XX  
**Status:** Analys klar, redo för åtgärder

---

## Analysmetod

Baserat på valideringslogiken i `E2eQualityValidationPage.tsx` kontrolleras följande:

1. **SubprocessSteps:** `given`, `when`, `then` måste finnas och vara icke-tomma
2. **ServiceTasks i bankProjectTestSteps:** Måste ha `apiCall`
3. **UserTasks i bankProjectTestSteps:** Måste ha `uiInteraction`
4. **BusinessRuleTasks i bankProjectTestSteps:** Måste ha `dmnDecision`
5. **BPMN → Scenarios mapping:** UserTasks, ServiceTasks, BusinessRuleTasks i BPMN-filer måste matcha dokumentation
6. **API Mocks:** API-anrop måste ha motsvarande mock i `mortgageE2eMocks.ts`

---

## E2E_BR001: Identifierade brister

### ✅ Styrkor
- Alla 11 subprocessSteps har `given`, `when`, `then` dokumenterat
- CallActivities har detaljerade `uiInteraction` och `apiCall`
- Gateways har `dmnDecision` dokumenterat

### ⚠️ Potentiella brister

#### 1. UserTasks i subprocesser (BPMN → Scenarios mapping)
**Problem:** UserTasks i subprocesserna (t.ex. `register-household-economy-information`, `register-personal-economy-information`, `confirm-application`, `decide-mortgage-commitment`, `submit-self-declaration`, `decide-offer`, `distribute-notice-of-pledge-to-brf`) finns i BPMN-filer men är dokumenterade via CallActivities `uiInteraction` istället för som separata steg i `bankProjectTestSteps`.

**Prioritet:** ⚠️ **MEDIUM** - Valideringen kan flagga dessa som "saknade" men de är faktiskt dokumenterade (bara på annat sätt)

**Åtgärd:** Förbättra valideringen för att också kolla `subprocessSteps.userTasksSummary` eller acceptera att de är dokumenterade via CallActivities.

#### 2. ServiceTasks i subprocesser (BPMN → Scenarios mapping)
**Problem:** ServiceTasks i subprocesserna (t.ex. `fetch-party-information`, `fetch-engagements`, `fetch-personal-information`, `valuate-property`, `fetch-brf-information`, `fetch-price`, `calculate-household-affordability`, etc.) finns i BPMN-filer men är dokumenterade via CallActivities `apiCall` istället för som separata steg.

**Prioritet:** ⚠️ **MEDIUM** - Samma som ovan

**Åtgärd:** Förbättra valideringen för att också kolla `subprocessSteps.serviceTasksSummary` eller acceptera att de är dokumenterade via CallActivities.

#### 3. BusinessRuleTasks i subprocesser (BPMN → Scenarios mapping)
**Problem:** BusinessRuleTasks i subprocesserna (t.ex. `select-product`, `determine-amortisation`, `evaluate-application`, `assess-kyc-aml`, `determine-decision-escalation`, `select-documents`) finns i BPMN-filer men är dokumenterade via CallActivities `dmnDecision` eller `subprocessSteps.businessRulesSummary` istället för som separata steg.

**Prioritet:** ⚠️ **MEDIUM** - Samma som ovan

**Åtgärd:** Förbättra valideringen för att också kolla `subprocessSteps.businessRulesSummary` eller acceptera att de är dokumenterade via CallActivities.

#### 4. API Mocks
**Status:** ✅ **BRA** - Alla API-anrop i `bankProjectTestSteps` har motsvarande mocks i `mortgageE2eMocks.ts` (29 mocks totalt)

**Prioritet:** ✅ **INGEN ÅTGÄRD BEHÖVS**

---

## E2E_BR006: Identifierade brister

### ✅ Styrkor
- Alla 11 subprocessSteps har `given`, `when`, `then` dokumenterat
- CallActivities har detaljerade `uiInteraction` och `apiCall`
- Struktur är konsekvent med E2E_BR001

### ⚠️ Potentiella brister

**Samma som E2E_BR001:**
- UserTasks i subprocesser (BPMN → Scenarios mapping)
- ServiceTasks i subprocesser (BPMN → Scenarios mapping)
- BusinessRuleTasks i subprocesser (BPMN → Scenarios mapping)

**Skillnad:** E2E_BR006 har multi-instance scenarios (två sökande), men detta påverkar inte valideringen.

---

## Prioriterad åtgärdslista

### 🔴 KRITISK (Måste åtgärdas)

**Inga kritiska brister identifierade!** ✅

Scenarion är faktiskt ganska kompletta. De potentiella bristerna är mer ett problem med hur valideringen matchar BPMN-noder mot dokumentation.

---

### 🟡 MEDIUM (Bör åtgärdas för bättre validering)

#### 1. Förbättra BPMN → Scenarios mapping-validering
**Problem:** Valideringen kan inte matcha UserTasks/ServiceTasks/BusinessRuleTasks i subprocesser eftersom de är dokumenterade via CallActivities istället för som separata steg.

**Åtgärd:** Uppdatera `validateBpmnMapping` i `E2eQualityValidationPage.tsx` för att också kolla:
- `subprocessSteps.userTasksSummary` för UserTasks
- `subprocessSteps.serviceTasksSummary` för ServiceTasks
- `subprocessSteps.businessRulesSummary` för BusinessRuleTasks

**Förväntat resultat:** Valideringen visar korrekt att UserTasks/ServiceTasks/BusinessRuleTasks är dokumenterade, även om de inte finns som separata steg i `bankProjectTestSteps`.

**Tidsåtgång:** ~30 minuter

---

### 🟢 LOW (Kan göras senare)

#### 1. Förbättra mock-responser
**Status:** Mock-responser är "basic" kvalitet. De innehåller de viktigaste fälten men kan förbättras med mer detaljer.

**Prioritet:** 🟢 **LOW** - Fungerar för nu, kan förbättras senare

---

## Sammanfattning

### ✅ Vad fungerar bra
- Alla subprocessSteps har Given/When/Then
- CallActivities har detaljerade UI-interaktioner och API-anrop
- Alla API-anrop har mocks
- Strukturen är konsekvent och väl dokumenterad

### ⚠️ Vad behöver förbättras
- BPMN → Scenarios mapping-valideringen behöver förbättras för att hantera UserTasks/ServiceTasks/BusinessRuleTasks i subprocesser

### 🎯 Rekommendation

**Nästa steg:** Förbättra BPMN → Scenarios mapping-valideringen (MEDIUM prioritet). Detta kommer göra valideringen mer korrekt och visa att scenarion faktiskt är bättre dokumenterade än vad den nuvarande valideringen visar.

**Förväntat resultat efter åtgärd:**
- E2E_BR001: 90%+ score (nuvarande score kan vara lägre p.g.a. valideringsproblemet)
- E2E_BR006: 90%+ score (samma)

---

## Nästa åtgärd

**Förbättra `validateBpmnMapping` för att också kolla `subprocessSteps` summaries.**

Detta är en relativt enkel ändring som kommer göra valideringen mer korrekt och visa att scenarion faktiskt är väl dokumenterade.

