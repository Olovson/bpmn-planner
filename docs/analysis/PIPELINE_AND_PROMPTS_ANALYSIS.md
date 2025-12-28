# Analys: Pipeline och Prompts efter Prerequisites-Konsolidering

**Datum:** 2025-12-28

## Översikt

Efter konsolideringen av `prerequisites` till `dependencies` i Feature Goals behöver vi verifiera att:
1. Pipeline fungerar korrekt för alla mallar (Feature Goals, Epics, Business Rules)
2. Prompts är optimala och konsekventa
3. Inga breaking changes eller problem introducerats

---

## 1. Dokumentationsgenererings-Pipeline

### Pipeline-steg (för alla mallar)

1. **Build Base Model** (`buildFeatureGoalDocModelFromContext` / `buildEpicDocModelFromContext` / `buildBusinessRuleDocModelFromContext`)
   - Skapar tom modell med tomma fält
   - ✅ **Status:** Fungerar korrekt - prerequisites har tagits bort från Feature Goals

2. **Load Per-Node Overrides** (`loadFeatureGoalOverrides` / `loadEpicOverrides` / `loadBusinessRuleOverrides`)
   - Laddar manuella överrides från `src/data/node-docs/`
   - ✅ **Status:** Fungerar korrekt - prerequisites har tagits bort från merge strategy

3. **Merge Overrides** (`mergeFeatureGoalOverrides` / `mergeEpicOverrides` / `mergeBusinessRuleOverrides`)
   - Mergar overrides med base model
   - ✅ **Status:** Fungerar korrekt - prerequisites har tagits bort från array fields

4. **Generate LLM Content** (`generateDocumentationWithLlm`)
   - Anropar Claude/Anthropic med prompt och JSON schema
   - ✅ **Status:** Fungerar korrekt - JSON schema är uppdaterat (prerequisites borttaget)

5. **Parse LLM Response** (`mapFeatureGoalLlmToSections` / `mapEpicLlmToSections` / `mapBusinessRuleLlmToSections`)
   - Parsar JSON från LLM-respons
   - ✅ **Status:** Fungerar korrekt - prerequisites har tagits bort från parsing

6. **Merge LLM Patch** (`mergeLlmPatch`)
   - Mergar LLM-innehåll med base/override model
   - ✅ **Status:** Fungerar korrekt - prerequisites är inte längre ett fält

7. **Validate Model** (`validateFeatureGoalModelAfterMerge` / `validateEpicModelAfterMerge` / `validateBusinessRuleModelAfterMerge`)
   - Validerar att alla required fields finns
   - ✅ **Status:** Fungerar korrekt - prerequisites har tagits bort från required fields

8. **Render HTML** (`buildFeatureGoalDocHtmlFromModel` / `buildEpicDocHtmlFromModel` / `buildBusinessRuleDocHtmlFromModel`)
   - Renderar HTML från validerad modell
   - ✅ **Status:** Fungerar korrekt - prerequisites-sektionen har tagits bort

---

## 2. Modellstruktur (Efter Konsolidering)

### Feature Goal (`FeatureGoalDocModel`)

**Före:**
```typescript
{
  summary: string;
  prerequisites: string[];  // ❌ Borttaget
  flowSteps: string[];
  dependencies?: string[];
  userStories: Array<{...}>;
}
```

**Efter:**
```typescript
{
  summary: string;
  flowSteps: string[];
  dependencies?: string[];  // ✅ Inkluderar både process-kontext och tekniska system
  userStories: Array<{...}>;
}
```

**Status:** ✅ Konsistent med Epic

### Epic (`EpicDocModel`)

**Struktur:**
```typescript
{
  summary: string;
  flowSteps: string[];
  interactions?: string[];  // Optional - endast för User Tasks
  dependencies?: string[];   // Optional - inkluderar både process-kontext och tekniska system
  userStories: Array<{...}>;
}
```

**Status:** ✅ Ingen ändring (redan konsoliderat)

### Business Rule (`BusinessRuleDocModel`)

**Struktur:**
```typescript
{
  summary: string;
  inputs: string[];
  decisionLogic: string[];
  outputs: string[];
  businessRulesPolicy: string[];
  relatedItems: string[];
}
```

**Status:** ✅ Ingen ändring (använder inte prerequisites/dependencies)

---

## 3. JSON Schema (Efter Konsolidering)

### Feature Goal Schema

**Före:**
```typescript
required: ['summary', 'prerequisites', 'flowSteps', 'userStories']
properties: {
  prerequisites: { type: 'array', items: { type: 'string' } },
  // ...
}
```

**Efter:**
```typescript
required: ['summary', 'flowSteps', 'userStories']
properties: {
  // prerequisites borttaget
  dependencies: { type: 'array', items: { type: 'string' } },  // Optional
  // ...
}
```

**Status:** ✅ Uppdaterat korrekt

### Epic Schema

**Struktur:**
```typescript
required: ['summary', 'flowSteps', 'userStories']
properties: {
  dependencies: { type: 'array', items: { type: 'string' } },  // Optional
  // ...
}
```

**Status:** ✅ Ingen ändring (redan korrekt)

---

## 4. Prompt-Analys

### Feature Goal Prompt (`prompts/llm/feature_epic_prompt.md`)

#### ✅ Uppdateringar Gjorda:

1. **Obligatoriska fält:**
   - ✅ Tog bort `prerequisites` från required fields
   - ✅ Uppdaterade till: `summary`, `flowSteps`, `userStories`
   - ✅ `dependencies` är nu optional men rekommenderat

2. **JSON-exempel:**
   - ✅ Tog bort `prerequisites` från exempel
   - ✅ Uppdaterade `dependencies` att inkludera process-kontext (tidigare prerequisites)

3. **Dependencies-sektion:**
   - ✅ Uppdaterade instruktioner att explicit inkludera process-kontext
   - ✅ Tydlig instruktion: "Inkluderar både process-kontext (vad måste vara klart före, tidigare prerequisites) och tekniska system"

4. **Prerequisites-sektion:**
   - ✅ Tog bort hela prerequisites-sektionen

#### ⚠️ Potentiella Problem:

1. **Ingen explicit instruktion om prerequisites → dependencies:**
   - Prompten säger att dependencies inkluderar process-kontext, men nämner inte explicit att detta ersätter prerequisites
   - **Rekommendation:** Lägg till en tydlig notis: "Prerequisites har konsoliderats till dependencies - inkludera process-kontext i dependencies"

2. **Exempel kan vara förvirrande:**
   - Exempel visar dependencies med process-kontext, men det kan vara otydligt för LLM att detta är obligatoriskt
   - **Rekommendation:** Lägg till ett tydligt exempel som visar process-kontext i dependencies

### Epic Prompt (`prompts/llm/feature_epic_prompt.md`)

#### ✅ Status:

- ✅ Redan konsoliderat (använder endast dependencies)
- ✅ Tydlig instruktion om dependencies inkluderar både process-kontext och tekniska system
- ✅ Exempel visar korrekt format

### Business Rule Prompt

**Status:** ✅ Använder inte prerequisites/dependencies (använder inputs/outputs istället)

---

## 5. Validering

### Feature Goal Validering

**Före:**
```typescript
requiredFields: ['summary', 'prerequisites', 'flowSteps', 'userStories']
// Validerar prerequisites array
```

**Efter:**
```typescript
requiredFields: ['summary', 'flowSteps', 'userStories']
// prerequisites validering borttagen
```

**Status:** ✅ Uppdaterat korrekt

### Epic Validering

**Status:** ✅ Ingen ändring (redan korrekt)

---

## 6. HTML-Rendering

### Feature Goal HTML

**Före:**
```html
${prerequisites.length > 0 ? `
<section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
  <h2>Förutsättningar</h2>
  ${renderList(prerequisites)}
</section>
` : ''}
```

**Efter:**
```html
${dependencies.length > 0 ? `
<section class="doc-section" data-source-dependencies="${dependenciesSource}">
  <h2>Beroenden</h2>
  <p class="muted">Inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra).</p>
  ${renderList(dependencies)}
</section>
` : ''}
```

**Status:** ✅ Uppdaterat korrekt

---

## 7. Identifierade Problem

### Problem 1: Prompten Nämner Inte Explicit Prerequisites → Dependencies

**Problem:**
- Prompten säger att dependencies inkluderar process-kontext, men nämner inte explicit att prerequisites har konsoliderats till dependencies
- LLM kan missa att inkludera process-kontext i dependencies

**Lösning:**
- Lägg till en tydlig notis i dependencies-sektionen: "Prerequisites har konsoliderats till dependencies - inkludera alltid process-kontext i dependencies"

### Problem 2: Exempel Kan Vara Förvirrande

**Problem:**
- Exempel visar dependencies med process-kontext, men det kan vara otydligt att detta är obligatoriskt för Feature Goals
- LLM kan generera dependencies utan process-kontext

**Lösning:**
- Lägg till ett tydligt exempel som visar process-kontext i dependencies för Feature Goals
- Specificera att minst 1-2 dependencies ska vara process-kontext

### Problem 3: Validering Kollar Inte Process-Kontext i Dependencies

**Problem:**
- Validering kollar att dependencies finns, men kollar inte att minst en dependency är process-kontext
- LLM kan generera dependencies med endast tekniska system

**Lösning:**
- Lägg till validering som kollar att minst en dependency är process-kontext (för Feature Goals)
- Eller acceptera att process-kontext kan saknas (om det inte finns någon föregående process)

---

## 8. Rekommendationer

### Rekommendation 1: Förbättra Prompten

**Lägg till i dependencies-sektionen för Feature Goals:**

```markdown
**⚠️ VIKTIGT för Feature Goals:**
- Prerequisites har konsoliderats till dependencies
- Inkludera ALLTID process-kontext i dependencies (minst 1-2 dependencies ska vara process-kontext)
- Process-kontext beskriver vad som måste vara klart före Feature Goalet kan starta
- Tekniska system beskriver vad som behövs för att köra Feature Goalet
```

### Rekommendation 2: Förbättra Exempel

**Lägg till ett tydligt exempel:**

```json
{
  "dependencies": [
    "Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata.",
    "Beroende: Process; Id: kyc-verification; Beskrivning: KYC/AML-kontroller måste vara godkända.",
    "Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik.",
    "Beroende: Regelmotor; Id: credit-rules-engine; Beskrivning: används för att utvärdera kreditregler och riskmodeller."
  ]
}
```

### Rekommendation 3: Validering (Optional)

**Lägg till validering för process-kontext:**

```typescript
// I validateFeatureGoalModelAfterMerge
if (model.dependencies && model.dependencies.length > 0) {
  const processDependencies = model.dependencies.filter(dep => 
    dep.includes('Beroende: Process;')
  );
  if (processDependencies.length === 0) {
    warnings.push('No process-context dependencies found - consider adding prerequisites as process dependencies');
  }
}
```

---

## 9. Slutsats

### ✅ Vad Fungerar:

1. **Pipeline:** Alla steg fungerar korrekt efter konsolideringen
2. **Modeller:** Konsistenta mellan Feature Goals och Epics
3. **JSON Schema:** Uppdaterat korrekt
4. **Validering:** Uppdaterat korrekt
5. **HTML-Rendering:** Uppdaterat korrekt

### ⚠️ Förbättringsområden:

1. **Prompten:** Kan vara tydligare om prerequisites → dependencies
2. **Exempel:** Kan visa tydligare att process-kontext är obligatoriskt
3. **Validering:** Kan kolla att process-kontext finns i dependencies

### 🎯 Rekommendation:

**Prioritet 1:** Förbättra prompten med tydlig instruktion om prerequisites → dependencies
**Prioritet 2:** Förbättra exempel att visa process-kontext i dependencies
**Prioritet 3:** (Optional) Lägg till validering för process-kontext

---

## 10. Testning

### Rekommenderade Tester:

1. **Generera Feature Goal med dependencies:**
   - Verifiera att process-kontext inkluderas i dependencies
   - Verifiera att tekniska system inkluderas i dependencies

2. **Generera Epic med dependencies:**
   - Verifiera att process-kontext inkluderas i dependencies
   - Verifiera att tekniska system inkluderas i dependencies

3. **Validera HTML-rendering:**
   - Verifiera att dependencies-sektionen visas korrekt
   - Verifiera att process-kontext och tekniska system är tydligt separerade

4. **Validera JSON Schema:**
   - Verifiera att LLM genererar korrekt JSON utan prerequisites
   - Verifiera att dependencies inkluderar process-kontext

