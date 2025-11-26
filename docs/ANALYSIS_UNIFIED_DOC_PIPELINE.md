# Analys: Unified Documentation Pipeline

## 1. Nuvarande Flöden per Dokumenttyp

### 1.1 Feature Goal

**Lokalt flöde (useLlm = false):**
```
renderFeatureGoalDoc()
  → renderDocWithSchema('feature-goal', ...)
    → SECTION_RENDERERS['title-metadata']
      → buildFeatureGoalDocModelFromContext(context)
        → buildFeatureGoalDocHtmlFromModel(context, links, model)
          → wrapDocument(title, body)
```

**LLM flöde (ChatGPT/Ollama):**
```
renderDocWithLlmFallback('feature', ...)
  → generateDocumentationWithLlm('feature', ...)
    → renderFeatureGoalDocFromLlm(context, links, rawLlmContent, metadata)
      → mapFeatureGoalLlmToSections(rawLlmContent)  // Returns FeatureGoalDocModel
        → buildFeatureGoalDocHtmlFromModel(context, links, model)  // SAME RENDERER!
          → wrapDocument(title, body, llmMetadata)
```

**Status:** ✅ **Redan unified!** Båda flödena använder:
- Samma modelltyp: `FeatureGoalDocModel`
- Samma HTML-renderer: `buildFeatureGoalDocHtmlFromModel()`
- Skillnaden är bara hur modellen byggs (context vs LLM)

---

### 1.2 Epic

**Lokalt flöde:**
```
renderEpicDoc()
  → renderDocWithSchema('epic', ...)
    → SECTION_RENDERERS['title-metadata']
      → buildEpicDocModelFromContext(context)
        → buildEpicDocHtmlFromModel(context, links, model)
          → wrapDocument(title, body)
```

**LLM flöde:**
```
renderDocWithLlmFallback('epic', ...)
  → generateDocumentationWithLlm('epic', ...)
    → renderEpicDocFromLlm(context, links, rawLlmContent, metadata)
      → mapEpicLlmToSections(rawLlmContent)  // Returns EpicDocModel
        → buildEpicDocHtmlFromModel(context, links, model)  // SAME RENDERER!
          → wrapDocument(title, body, llmMetadata)
```

**Status:** ✅ **Redan unified!** Båda flödena använder:
- Samma modelltyp: `EpicDocModel`
- Samma HTML-renderer: `buildEpicDocHtmlFromModel()`

---

### 1.3 Business Rule

**Lokalt flöde:**
```
renderBusinessRuleDoc()
  → renderDocWithSchema('business-rule', ...)
    → SECTION_RENDERERS['title-metadata']
      → buildBusinessRuleDocBody(context, links)  // ⚠️ Bygger HTML direkt!
        → (HTML-generering inline, ingen modell)
          → wrapDocument(title, body)
```

**LLM flöde:**
```
renderDocWithLlmFallback('businessRule', ...)
  → generateDocumentationWithLlm('businessRule', ...)
    → renderBusinessRuleDocFromLlm(context, links, rawLlmContent, metadata)
      → mapBusinessRuleLlmToSections(rawLlmContent)  // Returns BusinessRuleDocModel
        → buildBusinessRuleDocHtmlFromModel(context, links, model)  // ✅ Använder modell!
          → wrapDocument(title, body, llmMetadata)
```

**Status:** ❌ **INTE unified!** 
- Lokalt: `buildBusinessRuleDocBody()` bygger HTML direkt från context (ingen modell)
- LLM: Använder `BusinessRuleDocModel` → `buildBusinessRuleDocHtmlFromModel()`
- Det finns en `buildBusinessRuleDocHtmlFromModel()` som redan används av LLM, men lokalt använder den inte den!

---

## 2. Identifierade Problem

### 2.1 Business Rule: Duplicerad Logik

**Problem:**
- `buildBusinessRuleDocBody()` (lokalt) innehåller hårdkodad HTML-generering
- `buildBusinessRuleDocHtmlFromModel()` (LLM) gör samma sak men från modell
- Två separata kodvägar som måste hållas synkade

**Lösning:**
- Extrahera modellbyggaren: `buildBusinessRuleDocModelFromContext()`
- Uppdatera lokalt flöde att använda modell → `buildBusinessRuleDocHtmlFromModel()`
- Ta bort `buildBusinessRuleDocBody()` eller göra den till en wrapper

### 2.2 Feature Goal: buildFeatureGoalLlmDocBody() Används Inte

**Observation:**
- Det finns en `buildFeatureGoalLlmDocBody()` funktion i koden
- Men den används INTE - `renderFeatureGoalDocFromLlm()` använder direkt `buildFeatureGoalDocHtmlFromModel()`
- Detta är bra - det betyder att Feature Goal redan är unified!

### 2.3 Per-Node Overrides: Var i Flödet?

**Nuvarande design:**
- Overrides ska appliceras efter base model, innan LLM-patch
- Men flödet är:
  1. Base model (från context)
  2. LLM patch (om LLM aktiv)
  3. Render HTML

**Förslag:**
- Flödet ska vara:
  1. Base model (från context)
  2. **Apply per-node overrides** ← Här!
  3. LLM patch (om LLM aktiv) - mergar in i modellen
  4. Render HTML

---

## 3. Föreslagen Unified Pipeline

### 3.1 Allmän Pipeline (alla typer)

```
1. Build Base Model
   └─ build*DocModelFromContext(context, links)
      → Returns: *DocModel

2. Apply Per-Node Overrides (if any)
   └─ load*Overrides(context)
      → Returns: *DocOverrides | null
   └─ merge*Overrides(baseModel, overrides)
      → Returns: *DocModel (merged)

3. Apply LLM Patch (if LLM active)
   └─ generateDocumentationWithLlm(...)
      → Returns: DocumentationLlmResult | null
   └─ map*LlmToSections(rawLlmContent)
      → Returns: *DocModel (partial)
   └─ mergeLlmPatch(mergedModel, llmModel)
      → Returns: *DocModel (final)

4. Render HTML
   └─ build*DocHtmlFromModel(context, links, finalModel)
      → Returns: string (HTML body)
   └─ wrapDocument(title, body, llmMetadata?)
      → Returns: string (complete HTML)
```

### 3.2 Merge Strategy för LLM Patch

**Princip:**
- LLM-modellen är en **partial patch** som mergas in i base/override-modellen
- LLM-fält ersätter base-fält om de finns
- Array-fält: LLM ersätter helt (inte extend) - LLM är "authoritative" när den används

**Implementation:**
```typescript
function mergeLlmPatch<T extends FeatureGoalDocModel | EpicDocModel | BusinessRuleDocModel>(
  base: T,
  llmPatch: Partial<T>
): T {
  const merged = { ...base };
  
  // Simple fields: LLM wins if provided
  if (llmPatch.summary !== undefined) merged.summary = llmPatch.summary;
  if (llmPatch.testDescription !== undefined) merged.testDescription = llmPatch.testDescription;
  
  // Array fields: LLM replaces if provided (not extend)
  const arrayFields = Object.keys(base).filter(
    key => Array.isArray(base[key as keyof T])
  ) as Array<keyof T>;
  
  for (const field of arrayFields) {
    if (llmPatch[field] !== undefined && Array.isArray(llmPatch[field])) {
      merged[field] = llmPatch[field] as T[keyof T];
    }
  }
  
  return merged;
}
```

### 3.3 Unified Render Functions

**För varje typ, en enda render-funktion:**

```typescript
// Feature Goal
export async function renderFeatureGoalDoc(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmContent?: string,  // Optional: if provided, use LLM
  llmMetadata?: LlmMetadata
): Promise<string> {
  // 1. Build base model
  let model = buildFeatureGoalDocModelFromContext(context);
  
  // 2. Apply overrides
  const overrides = await loadFeatureGoalOverrides(context);
  model = mergeFeatureGoalOverrides(model, overrides);
  
  // 3. Apply LLM patch if provided
  if (llmContent) {
    const llmModel = mapFeatureGoalLlmToSections(llmContent);
    model = mergeLlmPatch(model, llmModel);
  }
  
  // 4. Render HTML
  const body = buildFeatureGoalDocHtmlFromModel(context, links, model);
  const title = context.node.name || context.node.bpmnElementId || 'Feature Goal';
  return wrapDocument(title, body, llmMetadata);
}
```

**Användning:**
- Lokalt: `renderFeatureGoalDoc(context, links)` (ingen llmContent)
- LLM: `renderFeatureGoalDoc(context, links, llmResult.text, llmMetadata)`

---

## 4. Implementation Plan

### Steg 1: Business Rule - Extrahera Modellbyggare

**Mål:** Göra Business Rule unified genom att extrahera modellbyggaren.

**Ändringar:**
1. Skapa `buildBusinessRuleDocModelFromContext(context, links): BusinessRuleDocModel`
   - Flytta all logik från `buildBusinessRuleDocBody()` som bygger modellen
   - Returnera modell istället för HTML

2. Uppdatera `buildBusinessRuleDocBody()` att använda modellen:
   ```typescript
   function buildBusinessRuleDocBody(
     context: NodeDocumentationContext,
     links: TemplateLinks,
     model: BusinessRuleDocModel  // Lägg till parameter
   ): string {
     return buildBusinessRuleDocHtmlFromModel(context, links, model);
   }
   ```

3. Uppdatera `SECTION_RENDERERS['title-metadata']` för business-rule:
   ```typescript
   case 'business-rule': {
     const model = buildBusinessRuleDocModelFromContext(ctx.context, ctx.links);
     return buildBusinessRuleDocHtmlFromModel(ctx.context, ctx.links, model);
   }
   ```

**Risk:** Låg - vi flyttar bara kod, ändrar inte logik.

---

### Steg 2: Skapa Unified Render Functions

**Mål:** En enda render-funktion per typ som hanterar base + overrides + LLM.

**Ändringar:**
1. Skapa `mergeLlmPatch()` helper-funktion
2. Uppdatera `renderFeatureGoalDoc()` att vara async och hantera overrides + LLM
3. Uppdatera `renderEpicDoc()` att vara async och hantera overrides + LLM
4. Uppdatera `renderBusinessRuleDoc()` att vara async och hantera overrides + LLM

**Risk:** Medium - vi ändrar signaturer, måste uppdatera alla anrop.

---

### Steg 3: Uppdatera LLM Integration

**Mål:** LLM-flödet använder unified render-funktioner.

**Ändringar:**
1. I `renderDocWithLlmFallback()`, istället för att anropa `render*DocFromLlm()`:
   ```typescript
   // Före:
   return renderFeatureGoalDocFromLlm(context, links, llmResult.text, {...});
   
   // Efter:
   return await renderFeatureGoalDoc(context, links, llmResult.text, {
     llmMetadata: { provider, model },
     fallbackUsed: llmResult.fallbackUsed,
     finalProvider: llmResult.provider,
   });
   ```

2. Ta bort `render*DocFromLlm()` funktioner (de blir redundant)

**Risk:** Låg - vi ersätter funktionsanrop, logiken är samma.

---

### Steg 4: Integrera Per-Node Overrides

**Mål:** Overrides appliceras i unified render-funktioner.

**Ändringar:**
- Redan implementerat i Steg 2 - overrides laddas och mergas i unified render-funktioner

**Risk:** Låg - vi använder redan implementerad override-logik.

---

## 5. Sammanfattning av Ändringar

### Filer som Måste Ändras

1. **`src/lib/documentationTemplates.ts`**
   - Extrahera `buildBusinessRuleDocModelFromContext()`
   - Uppdatera `renderFeatureGoalDoc()`, `renderEpicDoc()`, `renderBusinessRuleDoc()` till unified versioner
   - Ta bort `render*DocFromLlm()` funktioner
   - Uppdatera `SECTION_RENDERERS` för business-rule

2. **`src/lib/bpmnGenerators.ts`**
   - Uppdatera `renderDocWithLlmFallback()` att använda unified render-funktioner
   - Uppdatera fallback-funktioner att vara async

3. **`src/lib/nodeDocOverrides.ts`** (redan skapad)
   - Lägg till `mergeLlmPatch()` helper om det behövs

### Nya Funktioner

- `buildBusinessRuleDocModelFromContext()` - extraheras från `buildBusinessRuleDocBody()`
- `mergeLlmPatch()` - mergar LLM-modell in i base/override-modell

### Funktioner som Tas Bort

- `renderFeatureGoalDocFromLlm()` - ersätts av unified `renderFeatureGoalDoc()`
- `renderEpicDocFromLlm()` - ersätts av unified `renderEpicDoc()`
- `renderBusinessRuleDocFromLlm()` - ersätts av unified `renderBusinessRuleDoc()`
- `buildFeatureGoalLlmDocBody()` - används inte, kan tas bort

---

## 6. Fördelar med Unified Pipeline

1. **En enda HTML-renderer per typ** - ändringar i mallar/layout påverkar alla flöden
2. **Konsekvent merge-strategi** - base → overrides → LLM patch
3. **Lättare att debugga** - tydlig data flow
4. **Framtidssäkert** - nya källor (t.ex. databas) kan läggas till som ytterligare merge-steg
5. **Per-node overrides fungerar för alla flöden** - lokalt, ChatGPT, Ollama

---

## 7. Riskbedömning

**Låg risk:**
- Feature Goal och Epic är redan unified - vi behöver bara lägga till override-stöd
- Business Rule refactoring är isolerad - vi flyttar bara kod

**Medium risk:**
- Ändringar i funktionssignaturer kräver uppdatering av alla anrop
- Async conversion kan påverka prestanda (men minimalt)

**Hög risk:**
- Ingen - refactoring är stegvis och testbar

---

## 8. Nästa Steg

1. ✅ Analys klar
2. ⏭️ Implementera Steg 1: Business Rule modellbyggare
3. ⏭️ Implementera Steg 2: Unified render functions
4. ⏭️ Implementera Steg 3: Uppdatera LLM integration
5. ⏭️ Testa alla tre flöden (lokalt, ChatGPT, Ollama)

