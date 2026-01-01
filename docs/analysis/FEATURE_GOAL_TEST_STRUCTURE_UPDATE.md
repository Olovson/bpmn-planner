# Feature Goal Test Structure Update: Separata given/when/then-fält

**Datum:** 2025-01-01  
**Status:** Implementerat

---

## 🎯 Översikt

Feature Goal-tester (`TestScenario`) har uppdaterats för att använda separata `given`, `when`, `then`-fält istället för att bädda in denna information i `description`-fältet. Detta gör det enklare att visa och använda testinformation i UI:en, särskilt i Test Coverage-tabellen.

---

## 📋 Ändringar

### 1. TestScenario Interface (`src/data/testMapping.ts`)

**Före:**
```typescript
export interface TestScenario {
  id: string;
  name: string;
  description: string; // Given/When/Then inbäddade som text
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  // ... andra fält
}
```

**Efter:**
```typescript
export interface TestScenario {
  id: string;
  name: string;
  description: string; // Fortfarande finns för bakåtkompatibilitet och fullständig beskrivning
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  // ... andra fält
  // Nya separata fält för Feature Goal-tester
  given?: string;
  when?: string;
  then?: string;
}
```

### 2. Feature Goal Test Generation (`src/lib/e2eToFeatureGoalTestExtractor.ts`)

**Före:**
- `createTestScenarioWithGatewayContext` byggde en `description`-sträng med "Given:", "When:", "Then:" inbäddade
- `isTestComplete` kontrollerade om `description.includes('Given:')` etc.

**Efter:**
- `createTestScenarioWithGatewayContext` sparar nu `given`, `when`, `then` som separata fält från `subprocessStep`
- `isTestComplete` kontrollerar nu om `test.given`, `test.when`, `test.then` finns och inte är tomma

**Exempel:**
```typescript
return {
  id,
  name,
  description, // Fortfarande innehåller fullständig beskrivning
  status: 'pending',
  category: mapE2eTypeToCategory(e2eScenario.type),
  // Nya separata fält
  given: subprocessStep.given || undefined,
  when: subprocessStep.when || undefined,
  then: subprocessStep.then || undefined,
};
```

### 3. Test Coverage Helpers (`src/lib/testCoverageHelpers.ts`)

**Före:**
- `findTestInfoForCallActivity` returnerade endast E2E-scenarios
- Feature Goal-tester kunde inte visas i Test Coverage-tabellen

**Efter:**
- `findTestInfoForCallActivity` är nu async och hämtar Feature Goal-tester från databasen när E2E-scenarios saknas
- Konverterar Feature Goal-tester till samma format som E2E-scenarios använder (`subprocessStep` med `given/when/then`)
- Feature Goal-tester kan nu visas i Test Coverage-tabellen

**Exempel:**
```typescript
// Om inga E2E-scenarios hittades, hämta Feature Goal-tester från databasen
if (testInfo.length === 0 && bpmnFile && callActivityId) {
  const plannedScenarios = await fetchPlannedScenarios(bpmnFile, callActivityId);
  if (plannedScenarios && plannedScenarios.scenarios.length > 0) {
    const firstScenario = plannedScenarios.scenarios[0];
    
    // Skapa subprocessStep från Feature Goal-test
    const subprocessStep: E2eScenario['subprocessSteps'][0] = {
      order: 1,
      bpmnFile: bpmnFile,
      callActivityId: callActivityId,
      description: firstScenario.description || firstScenario.name || '',
      given: firstScenario.given || '', // Använder separata fält
      when: firstScenario.when || '',
      then: firstScenario.then || '',
    };
    // ...
  }
}
```

### 4. Test Coverage Table (`src/components/TestCoverageTable.tsx`)

**Före:**
- Visade endast E2E-scenarios
- Feature Goal-tester kunde inte visas eftersom de saknade `subprocessStep.given/when/then`-fält

**Efter:**
- Använder `useState` + `useEffect` för async-laddning av test-data
- Visar Feature Goal-tester när E2E-scenarios saknas
- Given/When/Then-kolumner fylls i med data från Feature Goal-tester

---

## 🔄 Bakåtkompatibilitet

- `description`-fältet behålls för bakåtkompatibilitet och innehåller fortfarande fullständig beskrivning
- Befintliga Feature Goal-tester i databasen som saknar separata fält kommer fortfarande att fungera (men kan inte visas i Test Coverage-tabellen)
- Nya Feature Goal-tester sparas med separata fält

---

## ✅ Fördelar

1. **Enklare UI-integration:** Test Coverage-tabellen kan nu visa Feature Goal-tester direkt utan att behöva parsa `description`
2. **Bättre struktur:** Separata fält gör det tydligare vad som är given/when/then
3. **Konsistent med E2E-scenarios:** Feature Goal-tester använder nu samma struktur som E2E-scenarios (`subprocessStep.given/when/then`)
4. **Framtida utökning:** Enklare att lägga till ytterligare metadata per fält om behövs

---

## 🧹 Legacy-kod som tagits bort

- `isTestComplete` uppdaterades för att använda separata fält istället för att parsa `description`
- Inga andra legacy-funktioner behövde tas bort (description-parsing användes bara i `isTestComplete`)

---

## 📝 Exempel: Feature Goal-test i databasen

**Före (description-parsing):**
```json
{
  "id": "application-e2e-happy-path-1-step-1",
  "name": "Application - Komplett ansökan (happy path)",
  "description": "Given: En person ansöker om bolån...\nWhen: Kunden går in i ansökningsflödet...\nThen: Alla relevanta steg har körts...",
  "status": "pending",
  "category": "happy-path"
}
```

**Efter (separata fält):**
```json
{
  "id": "application-e2e-happy-path-1-step-1",
  "name": "Application - Komplett ansökan (happy path)",
  "description": "Given: En person ansöker om bolån...\nWhen: Kunden går in i ansökningsflödet...\nThen: Alla relevanta steg har körts...",
  "status": "pending",
  "category": "happy-path",
  "given": "En person ansöker om bolån för köp av bostadsrätt...",
  "when": "Kunden går in i ansökningsflödet (Application)...",
  "then": "Alla relevanta steg i Application-processen har körts..."
}
```

---

## 🎯 Resultat

När testgenerering körs:
- ✅ Feature Goal-tester sparas med separata `given/when/then`-fält i databasen
- ✅ Test Coverage-tabellen visar Feature Goal-tester när E2E-scenarios saknas
- ✅ Given/When/Then-kolumner fylls i med data från Feature Goal-tester
- ✅ Bakåtkompatibilitet bevaras (description-fältet finns kvar)

---

**Datum:** 2025-01-01  
**Status:** Implementerat och dokumenterat

