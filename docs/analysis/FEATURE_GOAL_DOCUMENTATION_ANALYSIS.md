# Analys: Feature Goal Dokumentation - Nuvarande vs Förväntat

## Datum: 2025-12-30

## Problemidentifiering

Användaren rapporterar:
1. **User stories saknas** på Feature Goal-sidor
2. **Dubletter** med information på sidan
3. **Feature Goal-sidor stämmer inte** med förväntningar

## Nuvarande Implementation

### 1. TypeScript Modell (`src/lib/featureGoalLlmTypes.ts`)

```typescript
export interface FeatureGoalDocModel {
  summary: string;
  flowSteps: string[];
  dependencies?: string[]; // Optional
  userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
}
```

**Status:** ✅ Enkel modell med endast 4 fält

### 2. JSON Schema (`src/lib/llmJsonSchemas.ts`)

```typescript
required: ['summary', 'flowSteps', 'userStories']
optional: ['dependencies']
```

**Status:** ✅ Matchar TypeScript-modellen

### 3. HTML Template (`src/lib/documentationTemplates.ts` - `buildFeatureGoalDocHtmlFromModel`)

**Vad som faktiskt renderas:**
1. Header-sektion (badge + h1 + metadata)
2. Sammanfattning (om `summary` finns)
3. Funktionellt flöde (om `flowSteps` finns)
4. Beroenden (om `dependencies` finns)
5. User Stories (om `userStories` finns)

**Status:** ✅ Template matchar modellen, MEN:
- User Stories visas ENDAST om `userStories.length > 0`
- Om LLM inte genererar user stories, visas de inte

### 4. Dokumentation (`docs/templates/FEATURE_GOAL_TEMPLATE_CONTENT.md`)

**Nämner följande fält som INTE finns i modellen:**
- ❌ `effectGoals` (3-5 strängar)
- ❌ `scopeIncluded` (4-7 strängar)
- ❌ `scopeExcluded` (2-3 strängar)
- ❌ `epics` (2-5 objekt)
- ❌ `relatedItems` (2-4 strängar)

**Status:** ❌ **MISMATCH** - Dokumentationen beskriver fält som inte finns i koden!

### 5. Prompt (`prompts/llm/feature_epic_prompt.md`)

**Vad prompten instruerar LLM att generera:**
- `summary` ✅
- `flowSteps` ✅
- `dependencies` ✅
- `userStories` ✅

**Status:** ✅ Prompt matchar modellen

## Genereringsflöde

### Steg 1: Base Model (`buildFeatureGoalDocModelFromContext`)
```typescript
return {
  summary: '',
  flowSteps: [],
  dependencies: [],
  userStories: [],
};
```
**Status:** ✅ Returnerar tom modell

### Steg 2: LLM Generering (`renderDocWithLlm`)
- Anropar `generateDocumentationWithLlm` med `docType: 'featureGoal'`
- LLM genererar JSON enligt `buildFeatureGoalJsonSchema()`
- JSON mappas till `FeatureGoalDocModel` via `mapFeatureGoalLlmToSections`

### Steg 3: HTML Rendering (`renderFeatureGoalDoc`)
- Anropar `buildFeatureGoalDocHtmlFromModel(context, links, model)`
- Template renderar HTML baserat på modellen

### Steg 4: File-level Documentation Inkludering
- Feature Goal-dokumentationen inkluderas i file-level documentation
- **PROBLEM:** Header-sektionen tas bort, men resten inkluderas

## Identifierade Problem

### Problem 1: User Stories Saknas

**Orsak:**
1. LLM genererar user stories enligt JSON schema
2. Men om LLM inte genererar dem (eller genererar tom array), visas de inte
3. Template visar user stories ENDAST om `userStories.length > 0`

**Lösning:**
- Kontrollera om LLM faktiskt genererar user stories
- Om inte, undersök varför (prompt, schema, eller LLM-beteende)

### Problem 2: Dubletter i File-level Documentation

**Orsak:**
1. Feature Goal-dokumentationen inkluderas helt i file-level documentation
2. Header-sektionen tas bort, men resten inkluderas
3. Om Feature Goal-dokumentationen redan har strukturerad HTML, kan det skapa dubletter

**Lösning:**
- Förbättra regex för att ta bort header-sektionen mer exakt
- Se till att bara innehållssektionerna inkluderas

### Problem 3: Mismatch mellan Dokumentation och Kod

**Orsak:**
- `FEATURE_GOAL_TEMPLATE_CONTENT.md` beskriver fält som inte finns i koden
- Detta kan förvirra utvecklare och användare

**Lösning:**
- Uppdatera dokumentationen för att matcha faktisk implementation
- ELLER: Lägg till saknade fält i modellen (om de behövs)

## Vad Borde Feature Goal-sidor Innehålla?

### Enligt Nuvarande Modell:
1. ✅ **Header** (badge + namn + metadata)
2. ✅ **Sammanfattning** (summary)
3. ✅ **Funktionellt flöde** (flowSteps)
4. ✅ **Beroenden** (dependencies)
5. ✅ **User Stories** (userStories med acceptanskriterier)

### Enligt Dokumentation (men INTE implementerat):
6. ❌ **Effektmål** (effectGoals)
7. ❌ **Omfattning - Inkluderat** (scopeIncluded)
8. ❌ **Omfattning - Exkluderat** (scopeExcluded)
9. ❌ **Ingående Epics** (epics)
10. ❌ **Relaterade Items** (relatedItems)

## Rekommendationer

### Kortsiktigt (Fixar nuvarande problem):

1. **Fix User Stories-visning:**
   - Kontrollera om LLM genererar user stories
   - Om inte, undersök varför och fixa
   - Se till att template alltid visar user stories-sektionen (även om tom)

2. **Fix Dubletter:**
   - Förbättra regex för att ta bort header-sektionen mer exakt
   - Testa med faktisk genererad HTML

3. **Uppdatera Dokumentation:**
   - Uppdatera `FEATURE_GOAL_TEMPLATE_CONTENT.md` för att matcha faktisk implementation
   - Ta bort referenser till fält som inte finns

### Långsiktigt (Förbättringar):

1. **Överväg att lägga till saknade fält:**
   - Om `effectGoals`, `scopeIncluded`, `scopeExcluded`, `epics`, `relatedItems` behövs
   - Lägg till dem i modellen, schema, template och prompt

2. **Förbättra Template:**
   - Lägg till bättre visuell struktur
   - Lägg till CSS-styling för `node-section` i file-level documentation

3. **Förbättra Validering:**
   - Se till att LLM alltid genererar user stories
   - Lägg till validering som varnar om user stories saknas

## Detaljerad Analys av User Stories-problemet

### Validering
- ✅ `validateFeatureGoalJson`: Kräver `userStories` som required field
- ✅ `validateFeatureGoalModelAfterMerge`: Validerar att `userStories` är array och att varje story har alla required fields

### Parsing
- ✅ `mapFeatureGoalLlmToSections`: Parsar `userStories` från LLM JSON
- ✅ Om `userStories` är tom array eller saknas, skapas tom array `[]`

### Template Rendering
- ⚠️ **PROBLEM:** Template visar user stories ENDAST om `userStories.length > 0`
- ⚠️ Om LLM genererar tom array `[]`, visas ingen user stories-sektion

### Möjliga Orsaker till Saknade User Stories

1. **LLM genererar inte user stories:**
   - JSON schema kräver dem, men LLM kan ignorera dem
   - Prompt instruerar att generera dem, men LLM kan missa dem

2. **User stories filtreras bort:**
   - I `mapFeatureGoalLlmToSections`, filtreras user stories som saknar `role`, `goal`, `value` eller `acceptanceCriteria`
   - Om alla user stories filtreras bort, blir arrayen tom

3. **Template-logik:**
   - Template visar user stories ENDAST om `userStories.length > 0`
   - Om arrayen är tom, visas ingen sektion

## Rekommendationer för Fix

### 1. Förbättra Template för att Visa User Stories Alltid

**Nuvarande kod:**
```typescript
${userStories.length > 0 ? `
  <section class="doc-section" data-source-user-stories="${userStoriesSource}">
    <h2>User Stories</h2>
    ...
  </section>
` : ''}
```

**Förbättring:**
- Visa alltid user stories-sektionen
- Om tom, visa meddelande: "Inga user stories genererade ännu"
- Detta gör det tydligt om user stories saknas vs om de bara är tomma

### 2. Förbättra Validering

**Lägg till warning om user stories saknas:**
```typescript
if (model.userStories.length === 0) {
  warnings.push('Field "userStories" is empty - Feature Goals should have user stories');
}
```

### 3. Förbättra LLM Prompt

**Kontrollera att prompten tydligt instruerar LLM att generera user stories:**
- Se till att prompten har tydliga instruktioner om user stories
- Lägg till exempel på user stories i prompten

### 4. Debug-logging

**Lägg till logging för att se vad LLM faktiskt genererar:**
```typescript
if (import.meta.env.DEV) {
  console.log(`[renderFeatureGoalDoc] User stories for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`, model.userStories);
}
```

## Nästa Steg

1. ✅ Fixa dubletter (redan gjort - tar bort header-sektion)
2. ⏳ Förbättra template för att alltid visa user stories-sektionen
3. ⏳ Lägg till warning om user stories saknas
4. ⏳ Lägg till debug-logging
5. ⏳ Testa med faktisk genererad dokumentation
6. ⏳ Uppdatera dokumentation för att matcha faktisk implementation

