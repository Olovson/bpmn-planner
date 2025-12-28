# Feature Goal Mall - Validering och Analys

**Datum:** 2025-12-28

## Översikt

Analys av Feature Goal-mallarna för att säkerställa att de är så bra de kan bli och att implementationen fungerar korrekt.

---

## 1. Feature Goal Modell (`FeatureGoalDocModel`)

```typescript
export interface FeatureGoalDocModel {
  summary: string;
  prerequisites: string[];
  flowSteps: string[];
  dependencies?: string[]; // Optional - dependencies for the Feature Goal
  userStories: Array<{
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[]; // 2-4 acceptanskriterier per user story
  }>;
}
```

**Status:** ✅ **Korrekt**
- Alla fält är korrekt definierade
- `prerequisites` finns (till skillnad från Epic som konsoliderat till `dependencies`)
- `dependencies` är optional (bra)

---

## 2. Base Model (`buildFeatureGoalDocModelFromContext`)

```typescript
export function buildFeatureGoalDocModelFromContext(context: NodeDocumentationContext): FeatureGoalDocModel {
  // INGEN FALLBACK-TEXT - LLM måste generera allt
  return {
    summary: '',
    prerequisites: [],
    flowSteps: [],
    dependencies: [],
    userStories: [],
  };
}
```

**Status:** ✅ **Korrekt**
- Returnerar tom modell (inga fallback-texter)
- Alla fält är korrekt initialiserade

---

## 3. HTML Rendering (`buildFeatureGoalDocHtmlFromModel`)

### Problem Identifierade:

#### ❌ Problem 1: "Sammanfattning"-sektionen renderas alltid
**Rad 684-687:**
```typescript
<section class="doc-section" data-source-summary="${summarySource}">
  <h2>Sammanfattning</h2>
  <p>${summaryText}</p>
</section>
```

**Problem:** Sektionen renderas även om `summaryText` är tom, vilket ger en tom sektion.

**Lösning:** Gör conditional rendering (som Epic gör):
```typescript
${summaryText ? `
<section class="doc-section" data-source-summary="${summarySource}">
  <h2>Sammanfattning</h2>
  <p>${summaryText}</p>
</section>
` : ''}
```

#### ❌ Problem 2: "Förutsättningar"-sektionen renderas alltid
**Rad 689-692:**
```typescript
<section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
  <h2>Förutsättningar</h2>
  ${renderList(prerequisites)}
</section>
```

**Problem:** Sektionen renderas även om `prerequisites` är tom, vilket ger en tom sektion.

**Lösning:** Gör conditional rendering:
```typescript
${prerequisites.length > 0 ? `
<section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
  <h2>Förutsättningar</h2>
  ${renderList(prerequisites)}
</section>
` : ''}
```

#### ❌ Problem 3: "Funktionellt flöde"-sektionen renderas alltid
**Rad 694-699:**
```typescript
<section class="doc-section" data-source-flow="${flowStepsSource}">
  <h2>Funktionellt flöde</h2>
  <ol>
    ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
  </ol>
</section>
```

**Problem:** Sektionen renderas även om `flowSteps` är tom, vilket ger en tom sektion med tom `<ol>`.

**Lösning:** Gör conditional rendering:
```typescript
${flowSteps.length > 0 ? `
<section class="doc-section" data-source-flow="${flowStepsSource}">
  <h2>Funktionellt flöde</h2>
  <ol>
    ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
  </ol>
</section>
` : ''}
```

#### ❌ Problem 4: "Beroenden"-sektionen renderas alltid
**Rad 701-704:**
```typescript
<section class="doc-section" data-source-dependencies="${dependenciesSource}">
  <h2>Beroenden</h2>
  ${renderList(dependencies)}
</section>
```

**Problem:** Sektionen renderas även om `dependencies` är tom, vilket ger en tom sektion.

**Lösning:** Gör conditional rendering:
```typescript
${dependencies.length > 0 ? `
<section class="doc-section" data-source-dependencies="${dependenciesSource}">
  <h2>Beroenden</h2>
  ${renderList(dependencies)}
</section>
` : ''}
```

#### ✅ User Stories: Korrekt conditional rendering
**Rad 706-729:**
```typescript
${userStories.length > 0 ? `
<section class="doc-section" data-source-user-stories="${userStoriesSource}">
  ...
</section>
` : ''}
```

**Status:** ✅ **Korrekt** - User Stories använder redan conditional rendering.

---

## 4. Validering (`validateFeatureGoalModelAfterMerge`)

```typescript
// Required array fields
const requiredArrayFields: Array<keyof FeatureGoalDocModel> = [
  'prerequisites',
  'flowSteps',
  'userStories',
];
```

**Status:** ✅ **Korrekt**
- Alla fält matchar modellen
- `dependencies` är optional (valideras separat)

---

## 5. Render Pipeline (`renderFeatureGoalDoc`)

**Status:** ✅ **Korrekt**
- Kräver LLM-innehåll (kastar fel om saknas)
- Validerar modellen efter merge
- Kastar fel om validering misslyckas

---

## Identifierade Problem

### 1. ❌ Conditional Rendering Saknas för 4 Sektioner

**Problem:**
- "Sammanfattning" renderas alltid (även om tom)
- "Förutsättningar" renderas alltid (även om tom)
- "Funktionellt flöde" renderas alltid (även om tom)
- "Beroenden" renderas alltid (även om tom)

**Påverkan:**
- Tomma sektioner visas i dokumentationen
- Inkonsekvent med Epic-mallen (som använder conditional rendering)
- Ger sämre användarupplevelse

**Lösning:**
- Lägg till conditional rendering för alla 4 sektioner (som Epic gör)

---

## Jämförelse med Epic-mall

| Sektion | Epic | Feature Goal | Status |
|---------|------|--------------|--------|
| Header | ✅ Alltid synlig | ✅ Alltid synlig | ✅ Konsekvent |
| Sammanfattning | ✅ Conditional | ❌ Alltid synlig | ❌ Inkonsekvent |
| Förutsättningar | ❌ Finns inte | ❌ Alltid synlig | ❌ Problem |
| Funktionellt flöde | ✅ Conditional | ❌ Alltid synlig | ❌ Inkonsekvent |
| Interaktioner | ✅ Conditional | ❌ Finns inte | ✅ OK (Feature Goal behöver inte) |
| Beroenden | ✅ Conditional | ❌ Alltid synlig | ❌ Inkonsekvent |
| User Stories | ✅ Conditional | ✅ Conditional | ✅ Konsekvent |

---

## Rekommendationer

### 1. Fixa Conditional Rendering
- Lägg till conditional rendering för alla 4 sektioner (Sammanfattning, Förutsättningar, Funktionellt flöde, Beroenden)
- Följ samma mönster som Epic-mallen

### 2. Konsekvens med Epic-mall
- Feature Goal och Epic ska ha konsekvent rendering-logik
- Epic använder conditional rendering för alla sektioner (utom Header)
- Feature Goal bör göra samma sak

---

## Slutsats

**Övergripande Status:** ✅ **Alla problem fixade**

**Stärkor:**
- ✅ Modell är korrekt definierad
- ✅ Base model returnerar tom modell (inga fallback-texter)
- ✅ Validering fungerar korrekt
- ✅ Render pipeline kräver LLM-innehåll
- ✅ Alla sektioner använder conditional rendering
- ✅ Konsekvent med Epic-mallen

**Problem:**
- ✅ 4 sektioner fixade (använder nu conditional rendering)

**Validering:**
- ✅ Build fungerar utan fel
- ✅ Inga TypeScript-fel
- ✅ Inga linter-fel
- ✅ Alla sektioner döljs korrekt om de är tomma

