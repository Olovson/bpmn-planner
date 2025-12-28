# Exakt Antal Dokumentationsfiler för 3 Uppladdade Filer

## Datum: 2025-12-27

## Uppladdade Filer

1. `mortgage.bpmn` (root)
2. `mortgage-se-application.bpmn` (subprocess)
3. `mortgage-se-internal-data-gathering.bpmn` (subprocess av application)

---

## Analys av Varje Fil

### 1. mortgage.bpmn

**CallActivities:**
- `application` → pekar på `mortgage-se-application.bpmn` ✅ (subprocess-filen finns)
- `credit-evaluation` → pekar på `mortgage-se-credit-evaluation.bpmn` ❌ (INTE uppladdad)
- `credit-decision` → pekar på `mortgage-se-credit-decision.bpmn` ❌ (INTE uppladdad)
- `signing` → pekar på `mortgage-se-signing.bpmn` ❌ (INTE uppladdad)
- `disbursement` → pekar på `mortgage-se-disbursement.bpmn` ❌ (INTE uppladdad)
- `offer` → pekar på `mortgage-se-offer.bpmn` ❌ (INTE uppladdad)
- `collateral-registration` → pekar på `mortgage-se-collateral-registration.bpmn` ❌ (INTE uppladdad)
- `mortgage-commitment` → pekar på `mortgage-se-mortgage-commitment.bpmn` ❌ (INTE uppladdad)
- `kyc` → pekar på `mortgage-se-kyc.bpmn` ❌ (INTE uppladdad)
- `appeal` → pekar på `mortgage-se-appeal.bpmn` ❌ (INTE uppladdad)
- `manual-credit-evaluation` → pekar på `mortgage-se-manual-credit-evaluation.bpmn` ❌ (INTE uppladdad)
- `document-generation` → pekar på `mortgage-se-document-generation.bpmn` ❌ (INTE uppladdad)
- `document-generation-advance` → pekar på `mortgage-se-document-generation.bpmn` ❌ (INTE uppladdad)
- `signing-advance` → pekar på `mortgage-se-signing.bpmn` ❌ (INTE uppladdad)
- `disbursement-advance` → pekar på `mortgage-se-disbursement.bpmn` ❌ (INTE uppladdad)

**Tasks/Epics:**
- Inga UserTasks, ServiceTasks eller BusinessRuleTasks i root-filen

**Resultat:**
- ✅ **1 Feature Goal** för `application` callActivity (subprocess-filen finns)
- ❌ **0 Feature Goals** för övriga callActivities (subprocess-filer saknas)
- **0 Epics** (inga tasks i root-filen)

---

### 2. mortgage-se-application.bpmn

**CallActivities:**
- `internal-data-gathering` → pekar på `mortgage-se-internal-data-gathering.bpmn` ✅ (subprocess-filen finns)
- `household` → pekar på `mortgage-se-household.bpmn` ❌ (INTE uppladdad)
- `stakeholder` → pekar på `mortgage-se-stakeholder.bpmn` ❌ (INTE uppladdad, i subprocess "stakeholders")
- `object` → pekar på `mortgage-se-object.bpmn` ❌ (INTE uppladdad, i subprocess "stakeholders")

**Tasks/Epics:**
- `confirm-application` (UserTask) → **1 Epic**

**Resultat:**
- ✅ **1 Feature Goal** för `internal-data-gathering` callActivity (subprocess-filen finns)
- ❌ **0 Feature Goals** för household, stakeholder, object (subprocess-filer saknas)
- **1 Epic

---

### 3. mortgage-se-internal-data-gathering.bpmn

**CallActivities:**
- Inga callActivities

**Tasks/Epics:**
- `fetch-party-information` (ServiceTask) → **1 Epic**
- `pre-screen-party` (BusinessRuleTask) → **1 Epic**
- `fetch-engagements` (ServiceTask) → **1 Epic**

**Resultat:**
- **0 Feature Goals** (inga callActivities)
- **3 Epics** (alla tasks i filen)

---

## Sammanfattning: Totalt Antal Dokumentationsfiler

### Feature Goals (CallActivities):
- ✅ `application` i mortgage.bpmn → **1 Feature Goal**
- ✅ `internal-data-gathering` i mortgage-se-application.bpmn → **1 Feature Goal**
- **Totalt: 2 Feature Goals**

### Epics (Tasks):
- ✅ `confirm-application` (UserTask) i mortgage-se-application.bpmn → **1 Epic**
- ✅ `fetch-party-information` (ServiceTask) i mortgage-se-internal-data-gathering.bpmn → **1 Epic**
- ✅ `pre-screen-party` (BusinessRuleTask) i mortgage-se-internal-data-gathering.bpmn → **1 Epic**
- ✅ `fetch-engagements` (ServiceTask) i mortgage-se-internal-data-gathering.bpmn → **1 Epic**
- **Totalt: 4 Epics**

### Process Feature Goals (Process-noder):
- ✅ Process-nod i mortgage-se-application.bpmn → **1 Process Feature Goal**
- ✅ Process-nod i mortgage-se-internal-data-gathering.bpmn → **1 Process Feature Goal**
- ❓ Process-nod i mortgage.bpmn (root) → **Möjligen 1 Process Feature Goal** (beroende på implementation)
- **Totalt: 2-3 Process Feature Goals**

---

## **SLUTSATS: Totalt Antal Dokumentationsfiler**

### Minimum (utan root Process Feature Goal):
- **2 Feature Goals** (callActivities)
- **4 Epics** (tasks)
- **2 Process Feature Goals** (process-noder)
- **Totalt: 8 dokumentationsfiler**

### Maximum (med root Process Feature Goal):
- **2 Feature Goals** (callActivities)
- **4 Epics** (tasks)
- **3 Process Feature Goals** (process-noder inkl. root)
- **Totalt: 9 dokumentationsfiler**

---

## Viktiga Observationer

1. **CallActivities utan subprocess-filer genererar INTE Feature Goals**
   - Systemet hoppar över callActivities där `missingDefinition = true`
   - Detta är korrekt beteende enligt nuvarande logik

2. **Alla tasks/epics i uppladdade filer genererar Epic dokumentation**
   - Oavsett om de är i root eller subprocess-filer
   - Detta är korrekt beteende enligt nuvarande logik

3. **Process Feature Goals genereras för subprocess-filer**
   - Separata från callActivity Feature Goals
   - Detta är korrekt beteende enligt nuvarande logik

---

## Förväntade Filnamn

### Feature Goals (CallActivities):
1. `feature-goals/mortgage-application.html` (eller hierarchical naming)
2. `feature-goals/mortgage-se-application-internal-data-gathering.html` (eller hierarchical naming)

### Epics (Tasks):
1. `nodes/mortgage-se-application/confirm-application.html`
2. `nodes/mortgage-se-internal-data-gathering/fetch-party-information.html`
3. `nodes/mortgage-se-internal-data-gathering/pre-screen-party.html`
4. `nodes/mortgage-se-internal-data-gathering/fetch-engagements.html`

### Process Feature Goals:
1. `feature-goals/mortgage-se-application.html`
2. `feature-goals/mortgage-se-internal-data-gathering.html`
3. (Möjligen) `feature-goals/mortgage.html` (root)

---

## Validering

För att validera att systemet fungerar korrekt:
1. Ladda upp de 3 filerna
2. Generera dokumentation
3. Räkna faktiskt antal genererade dokument
4. Jämför med förväntat antal (8-9 filer)

**Om antalet skiljer sig:**
- Kontrollera om Process Feature Goals genereras för root
- Kontrollera om några callActivities med saknade subprocess-filer ändå genererar Feature Goals (fel)
- Kontrollera om alla tasks/epics genererar Epic dokumentation

