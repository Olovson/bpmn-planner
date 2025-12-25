# Analys: Vad kommer finnas på Test Coverage-sidan efter Epic-testgenerering tagits bort

## 🎯 Syfte

Analysera vad som kommer finnas på test-coverage-sidan efter att Epic-testgenerering tagits bort, och vad som saknas för att generera komplett information.

---

## 📊 Vad kommer finnas på Test Coverage-sidan

### 1. E2E-scenarios (från generering)

**Vad:**
- E2E-scenarios genererade från BPMN-processgraf och Feature Goal-dokumentation
- Varje scenario innehåller:
  - `id`, `name`, `summary`
  - `given`, `when`, `then` (på scenario-nivå)
  - `subprocessSteps` (Feature Goals i ordning) med:
    - `given`, `when`, `then` (per Feature Goal)
    - `description`
    - `subprocessesSummary`, `serviceTasksSummary`, `userTasksSummary`, `businessRulesSummary`
  - `bankProjectTestSteps` (teststeg per BPMN-nod) med:
    - `action` (vad som händer)
    - `assertion` (vad som verifieras)
    - `uiInteraction` (valfritt - generiska beskrivningar)
    - `apiCall` (valfritt - generiska beskrivningar eller saknas)
    - `dmnDecision` (valfritt - generiska beskrivningar)
    - `backendState` (valfritt - generiska beskrivningar)

**Kvalitet:** 70-80% (bra grund, men saknar konkreta detaljer)

---

### 2. Aktiviteter (grupperade per Feature Goal)

**Vad:**
- **Service Tasks:** Lista över alla Service Tasks i Feature Goalet
- **User Tasks (kund):** Lista över kund-User Tasks
- **User Tasks (handläggare):** Lista över handläggare-User Tasks
- **Business Rules / DMN:** Lista över Business Rule Tasks och DMN-beslut

**Källa:** ProcessTree (hierarkisk struktur från BPMN-filer)

**Kvalitet:** 100% (komplett lista baserat på BPMN-struktur)

---

### 3. Given/When/Then för Feature Goals

**Vad:**
- `given`: Given-conditions för Feature Goalet (från `subprocessStep.given`)
- `when`: When-actions för Feature Goalet (från `subprocessStep.when`)
- `then`: Then-assertions för Feature Goalet (från `subprocessStep.then`)

**Källa:** E2E-scenarios → `subprocessSteps`

**Kvalitet:** 70-80% (bra beskrivningar, men kan sakna detaljer)

---

### 4. UI-interaktion (valfritt)

**Vad:**
- Generiska beskrivningar av UI-interaktioner (t.ex. "Navigate to application page")
- **Saknar:** Konkreta UI-selectors (t.ex. `nav-application`, `btn-submit-application`)

**Källa:** E2E-scenarios → `bankProjectTestSteps[].uiInteraction`

**Kvalitet:** 50-60% (generiska beskrivningar, saknar konkreta selectors)

**Exempel vad som finns:**
```
"Navigate to application page. Verify that application form is visible."
```

**Exempel vad som saknas:**
```
"Navigate: application-start (nav-application). Verify: page-loaded (application form is visible)."
```

---

### 5. API-anrop (valfritt)

**Vad:**
- Generiska beskrivningar av API-anrop (t.ex. "Hämta kundinformation")
- **Saknar:** Konkreta API-endpoints (t.ex. `GET /api/party/information`)

**Källa:** E2E-scenarios → `bankProjectTestSteps[].apiCall`

**Kvalitet:** 0-30% (generiska beskrivningar eller saknas helt)

**Exempel vad som finns:**
```
"Hämta kundinformation från externa källor"
```

**Exempel vad som saknas:**
```
"GET /api/party/information (fetch-party-information), GET /api/party/engagements (fetch-engagements)"
```

---

### 6. DMN-beslut (valfritt)

**Vad:**
- Generiska beskrivningar av DMN-beslut (t.ex. "Pre-screen Party DMN should return APPROVED")
- **Saknar:** Konkreta DMN-tabellnamn (t.ex. `table-bisnode-credit`, `table-own-experience`)

**Källa:** E2E-scenarios → `bankProjectTestSteps[].dmnDecision`

**Kvalitet:** 50-60% (generiska beskrivningar, saknar konkreta tabellnamn)

**Exempel vad som finns:**
```
"Pre-screen Party DMN should return APPROVED"
```

**Exempel vad som saknas:**
```
"Pre-screen Party DMN = APPROVED (table-bisnode-credit), Evaluate Bostadsrätt DMN = APPROVED (table-own-experience)"
```

---

## ❌ Vad som saknas för komplett information

### 1. Konkreta API-endpoints (0% kvalitet)

**Problem:**
- E2E-scenarios genereras från Feature Goal-dokumentation
- Feature Goal-dokumentation innehåller **inte** API-endpoints
- Claude kan inte gissa API-endpoints från BPMN-namn

**Vad behövs:**
- API-dokumentation (t.ex. OpenAPI/Swagger-specifikationer)
- Mapping mellan BPMN ServiceTask-namn och API-endpoints
- Eller: Manuell komplettering av API-endpoints

**Exempel:**
```typescript
// ServiceTask: "fetch-party-information"
// → API-endpoint: "GET /api/party/information"
```

---

### 2. Konkreta UI-selectors (50-60% kvalitet)

**Problem:**
- E2E-scenarios kan generera generiska UI-interaktioner
- Feature Goal-dokumentation innehåller **inte** UI-selectors
- Claude kan inte gissa UI-selectors från BPMN-namn

**Vad behövs:**
- UI-dokumentation (t.ex. Figma-designs med test-IDs)
- Mapping mellan BPMN UserTask-namn och UI-selectors
- Eller: Manuell komplettering av UI-selectors

**Exempel:**
```typescript
// UserTask: "register-household-economy-information"
// → UI-selector: "[data-testid='household-economy-form']"
```

---

### 3. Konkreta DMN-tabellnamn (50-60% kvalitet)

**Problem:**
- E2E-scenarios kan generera generiska DMN-beslut
- Feature Goal-dokumentation innehåller **inte** DMN-tabellnamn
- Claude kan inte gissa DMN-tabellnamn från BPMN-namn

**Vad behövs:**
- DMN-dokumentation (t.ex. DMN-filer med tabellnamn)
- Mapping mellan BPMN BusinessRuleTask-namn och DMN-tabellnamn
- Eller: Manuell komplettering av DMN-tabellnamn

**Exempel:**
```typescript
// BusinessRuleTask: "pre-screen-party"
// → DMN-tabell: "table-bisnode-credit"
```

---

## 🎯 Sammanfattning: Vad kommer finnas

### ✅ Kommer finnas (70-80% kvalitet):

1. **E2E-scenarios** med:
   - `given`, `when`, `then` (på scenario-nivå)
   - `subprocessSteps` med `given`, `when`, `then` (per Feature Goal)

2. **Aktiviteter** (grupperade):
   - Service Tasks
   - User Tasks (kund/handläggare)
   - Business Rules / DMN

3. **Given/When/Then** för Feature Goals:
   - Från `subprocessSteps` i E2E-scenarios

4. **UI-interaktion** (delvis):
   - Generiska beskrivningar (50-60% kvalitet)
   - **Saknar:** Konkreta UI-selectors

5. **API-anrop** (delvis):
   - Generiska beskrivningar eller saknas (0-30% kvalitet)
   - **Saknar:** Konkreta API-endpoints

6. **DMN-beslut** (delvis):
   - Generiska beskrivningar (50-60% kvalitet)
   - **Saknar:** Konkreta DMN-tabellnamn

---

## 🔧 Vad behövs för att generera komplett information

### För API-anrop:

1. **API-dokumentation:**
   - OpenAPI/Swagger-specifikationer
   - Mapping mellan BPMN ServiceTask-namn och API-endpoints
   - Eller: Manuell komplettering

2. **Integration i E2E-generering:**
   - Lägg till API-dokumentation som input till Claude
   - Matcha ServiceTask-namn mot API-endpoints
   - Generera konkreta API-anrop i `bankProjectTestSteps[].apiCall`

---

### För UI-interaktion:

1. **UI-dokumentation:**
   - Figma-designs med test-IDs
   - Mapping mellan BPMN UserTask-namn och UI-selectors
   - Eller: Manuell komplettering

2. **Integration i E2E-generering:**
   - Lägg till UI-dokumentation som input till Claude
   - Matcha UserTask-namn mot UI-selectors
   - Generera konkreta UI-interaktioner i `bankProjectTestSteps[].uiInteraction`

---

### För DMN-beslut:

1. **DMN-dokumentation:**
   - DMN-filer med tabellnamn
   - Mapping mellan BPMN BusinessRuleTask-namn och DMN-tabellnamn
   - Eller: Manuell komplettering

2. **Integration i E2E-generering:**
   - Lägg till DMN-dokumentation som input till Claude
   - Matcha BusinessRuleTask-namn mot DMN-tabellnamn
   - Generera konkreta DMN-beslut i `bankProjectTestSteps[].dmnDecision`

---

## 💡 Rekommendation

### Kortsiktigt (nuvarande approach):

1. ✅ **Generera grundstruktur** (70-80% kvalitet):
   - E2E-scenarios med `given`, `when`, `then`
   - Feature Goal-test scenarios
   - Aktiviteter (grupperade)
   - Generiska UI-interaktioner, API-anrop, DMN-beslut

2. ⚠️ **Markera saknade detaljer:**
   - Tydligt markera att API-endpoints saknas
   - Tydligt markera att UI-selectors saknas
   - Tydligt markera att DMN-tabellnamn saknas

3. ✅ **Förvänta komplettering:**
   - Testprofessional kompletterar API-endpoints
   - Testprofessional kompletterar UI-selectors
   - Testprofessional kompletterar DMN-tabellnamn

---

### Långsiktigt (för komplett information):

1. **API-dokumentation:**
   - Integrera OpenAPI/Swagger-specifikationer
   - Skapa mapping mellan ServiceTask-namn och API-endpoints
   - Generera konkreta API-anrop automatiskt

2. **UI-dokumentation:**
   - Integrera Figma-designs med test-IDs
   - Skapa mapping mellan UserTask-namn och UI-selectors
   - Generera konkreta UI-interaktioner automatiskt

3. **DMN-dokumentation:**
   - Integrera DMN-filer med tabellnamn
   - Skapa mapping mellan BusinessRuleTask-namn och DMN-tabellnamn
   - Generera konkreta DMN-beslut automatiskt

---

## 📊 Slutsats

### Vad kommer finnas:

✅ **E2E-scenarios** med `given`, `when`, `then` (70-80% kvalitet)
✅ **Aktiviteter** (grupperade per Feature Goal) (100% kvalitet)
✅ **Given/When/Then** för Feature Goals (70-80% kvalitet)
⚠️ **UI-interaktion** (50-60% kvalitet - generiska beskrivningar)
❌ **API-anrop** (0-30% kvalitet - generiska beskrivningar eller saknas)
⚠️ **DMN-beslut** (50-60% kvalitet - generiska beskrivningar)

### Vad saknas:

❌ **Konkreta API-endpoints** - kräver API-dokumentation
❌ **Konkreta UI-selectors** - kräver UI-dokumentation
❌ **Konkreta DMN-tabellnamn** - kräver DMN-dokumentation

### Vad behövs för komplett information:

1. **API-dokumentation** (OpenAPI/Swagger) + mapping
2. **UI-dokumentation** (Figma med test-IDs) + mapping
3. **DMN-dokumentation** (DMN-filer) + mapping

Eller: **Manuell komplettering** av saknade detaljer (40-50% av innehållet)

---

**Datum:** 2025-12-22
**Status:** Analys klar - Vad som finns vs vad som saknas dokumenterat

