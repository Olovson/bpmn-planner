# Implementation Guide: Per-Node Documentation Overrides

## Quick Start

### 1. Skapa en Override-fil

```bash
npm run create:node-doc feature-goal mortgage.bpmn application
```

Detta skapar: `src/data/node-docs/feature-goal/mortgage.application.doc.ts`

### 2. Redigera Filen

```typescript
import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

export const overrides: FeatureGoalDocOverrides = {
  summary: "Application är huvudprocessen för bolåneansökningar...",
  effectGoals: [
    "Minskad handläggningstid från 5-7 dagar till under 24 timmar",
    "Förbättrad datakvalitet genom strukturerad datainsamling",
  ],
};
```

### 3. Generera Dokumentation

- Gå till Files-sidan
- Välj "Local (ingen LLM)"
- Klicka "Generera dokumentation/tester (alla filer)"
- Öppna dokumentationen i Doc Viewer

---

## Integration Steps

### Steg 1: Uppdatera SECTION_RENDERERS för Async Support

I `documentationTemplates.ts`, uppdatera `SECTION_RENDERERS` att hantera async model building:

```typescript
const SECTION_RENDERERS: Partial<Record<DocSectionId, (ctx: SectionRendererContext) => string | Promise<string>>> = {
  'title-metadata': async (ctx) => {
    switch (ctx.templateId) {
      case 'feature-goal': {
        const baseModel = buildFeatureGoalDocModelFromContext(ctx.context);
        const overrides = await loadFeatureGoalOverrides(ctx.context);
        const model = mergeFeatureGoalOverrides(baseModel, overrides);
        return buildFeatureGoalDocHtmlFromModel(ctx.context, ctx.links, model);
      }
      case 'epic': {
        const baseModel = buildEpicDocModelFromContext(ctx.context);
        const overrides = await loadEpicOverrides(ctx.context);
        const model = mergeEpicOverrides(baseModel, overrides);
        return buildEpicDocHtmlFromModel(ctx.context, ctx.links, model);
      }
      case 'business-rule': {
        // Först: extrahera modellbyggaren (se Steg 2)
        const baseModel = buildBusinessRuleDocModelFromContext(ctx.context, ctx.links);
        const overrides = await loadBusinessRuleOverrides(ctx.context);
        const model = mergeBusinessRuleOverrides(baseModel, overrides);
        return buildBusinessRuleDocHtmlFromModel(ctx.context, ctx.links, model);
      }
      default:
        return '';
    }
  },
};
```

### Steg 2: Extrahera BusinessRuleDocModel Builder

I `documentationTemplates.ts`, extrahera modellbyggaren från `buildBusinessRuleDocBody`:

```typescript
function buildBusinessRuleDocModelFromContext(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): BusinessRuleDocModel {
  const node = context.node;
  const nodeName = node.name || node.bpmnElementId || 'Business Rule';
  // ... (flytta all modellbyggande logik från buildBusinessRuleDocBody hit)
  
  return {
    summary: summaryText,
    inputs: inputBullets,
    decisionLogic: decisionBullets,
    outputs: outputBullets,
    businessRulesPolicy: policySupportBullets,
    scenarios: scenariosRows,
    testDescription: testDescription,
    implementationNotes: implementationNotes,
    relatedItems: relatedItems,
  };
}

// Uppdatera buildBusinessRuleDocBody att ta modell som parameter
function buildBusinessRuleDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: BusinessRuleDocModel, // Lägg till parameter
): string {
  return buildBusinessRuleDocHtmlFromModel(context, links, model);
}
```

### Steg 3: Uppdatera renderDocWithSchema för Async

```typescript
async function renderFromSchema(
  schema: DocTemplateSchema,
  ctx: SectionRendererContext
): Promise<string> {
  const results = await Promise.all(
    schema.sections.map(async (section) => {
      const renderer = SECTION_RENDERERS[section.id];
      if (!renderer) return '';
      const result = renderer(ctx);
      return result instanceof Promise ? await result : result;
    })
  );
  return results.join('\n');
}

async function renderDocWithSchema(
  templateId: TemplateId,
  schema: DocTemplateSchema,
  context: NodeDocumentationContext,
  links: TemplateLinks,
): Promise<string> {
  const node = context.node;
  const fallbackTitle =
    templateId === 'feature-goal'
      ? 'Feature Goal'
      : templateId === 'epic'
      ? 'Epic'
      : templateId === 'business-rule'
      ? 'Business Rule'
      : templateId;
  const title = node?.name || node?.bpmnElementId || fallbackTitle;
  const body = await renderFromSchema(schema, { templateId, context, links });
  return wrapDocument(title, body);
}
```

### Steg 4: Uppdatera Public Render Functions

```typescript
export const renderFeatureGoalDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  return await renderDocWithSchema('feature-goal', FEATURE_GOAL_DOC_SCHEMA, context, links);
};

export const renderEpicDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  return await renderDocWithSchema('epic', EPIC_DOC_SCHEMA, context, links);
};

export const renderBusinessRuleDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  return await renderDocWithSchema('business-rule', BUSINESS_RULE_DOC_SCHEMA, context, links);
};
```

### Steg 5: Uppdatera Anrop i bpmnGenerators.ts

I `generateAllFromBpmnWithGraph`, uppdatera fallback-funktionerna att vara async:

```typescript
// Före:
nodeDocContent = await renderDocWithLlmFallback(
  'feature',
  nodeContext,
  docLinks,
  () => renderFeatureGoalDoc(nodeContext, docLinks), // Sync fallback
  useLlm,
  // ...
);

// Efter:
nodeDocContent = await renderDocWithLlmFallback(
  'feature',
  nodeContext,
  docLinks,
  async () => await renderFeatureGoalDoc(nodeContext, docLinks), // Async fallback
  useLlm,
  // ...
);
```

Uppdatera även för 'epic' och 'businessRule':

```typescript
// Epic
nodeDocContent = await renderDocWithLlmFallback(
  'epic',
  nodeContext,
  docLinks,
  async () => await renderEpicDoc(nodeContext, docLinks),
  useLlm,
  // ...
);

// Business Rule
nodeDocContent = await renderDocWithLlmFallback(
  'businessRule',
  nodeContext,
  docLinks,
  async () => await renderBusinessRuleDoc(nodeContext, docLinks),
  useLlm,
  // ...
);
```

### Steg 6: Uppdatera renderDocWithLlmFallback Signature

I `bpmnGenerators.ts`, uppdatera `renderDocWithLlmFallback` att acceptera async fallback:

```typescript
async function renderDocWithLlmFallback(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks,
  fallback: () => string | Promise<string>, // Uppdatera till async
  llmAllowed: boolean,
  llmProvider?: LlmProvider,
  localAvailable: boolean = false,
  onLlmResult?: (provider: LlmProvider, fallbackUsed: boolean, docJson?: unknown) => void,
): Promise<string> {
  // ...
  if (!llmActive) {
    const fallbackResult = fallback();
    return fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
  }
  // ...
}
```

---

## Exempel: Komplett Override-fil

```typescript
// src/data/node-docs/feature-goal/mortgage.application.doc.ts

import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

export const overrides: FeatureGoalDocOverrides = {
  summary:
    "Application är huvudprocessen för bolåneansökningar i Staccs kreditplattform. " +
    "Processen samlar in och validerar kundinformation, genomför kreditupplysningar, " +
    "och koordinerar beslutsprocessen för att ge kunden ett snabbt och tydligt besked. " +
    "Feature Goalet säkerställer att hela ansökningsflödet är spårbart, effektivt och " +
    "följer bankens policy och regulatoriska krav.",

  effectGoals: [
    "Minskad handläggningstid från 5-7 dagar till under 24 timmar för standardansökningar",
    "Förbättrad datakvalitet genom strukturerad datainsamling och automatisk validering",
    "Högre kundnöjdhet genom snabbare besked och tydlig kommunikation om nästa steg",
    "Säkrade och mer förutsägbara kreditevalueringar enligt kreditpolicy och riskramverk",
    "Minskad manuell hantering genom automatisering av rutinbeslut",
  ],

  scopeIncluded: [
    "Ingår: end-to-end-flöde för bolåneansökningar från initiering till besked",
    "Ingår: datainsamling, validering och kreditupplysningar",
    "Ingår: automatiserad riskbedömning och beslutsstöd",
    "Ingår: kommunikation med kund om status och nästa steg",
  ],

  scopeExcluded: [
    "Ingår inte: eftermarknadsprocesser och generella engagemangsändringar",
    "Ingår inte: tekniska implementationer i underliggande system – dessa dokumenteras separat",
    "Ingår inte: manuell handläggning av komplexa fall (hanteras i separat process)",
  ],

  flowSteps: [
    "Kunden initierar ansökan via digital kanal (web/app) och fyller i grundläggande information",
    "Systemet samlar in kompletterande data från interna och externa källor (UC, Skatteverket, etc.)",
    "Automatisk kreditupplysning och riskbedömning genomförs baserat på insamlad data",
    "Beslut genereras baserat på policy, riskramverk och produktvillkor",
    "Kunden får besked och nästa steg presenteras tydligt",
    "Vid godkännande initieras nästa steg i processen (t.ex. offertgenerering)",
  ],

  dependencies: [
    "Tillgång till stabil kreditmotor och beslutsregler (DMN) med tydlig versionering",
    "Integrationer mot kunddata (SPAR), engagemangsdata (Core Banking) och externa källor (UC, PSD2)",
    "Överenskommen målbild för kundupplevelse, riskaptit och produktportfölj",
    "Tillgång till dokumenterade policyer och riskramverk",
  ],

  // Extend base scenarios instead of replacing them
  _mergeStrategy: {
    scenarios: 'extend',
  },
};
```

---

## Testing

### Testa Lokalt

1. **Skapa override-fil**:
   ```bash
   npm run create:node-doc feature-goal mortgage.bpmn application
   ```

2. **Redigera filen** med önskat innehåll

3. **Generera dokumentation**:
   - Gå till Files-sidan
   - Välj "Local (ingen LLM)"
   - Klicka "Generera dokumentation/tester (alla filer)"

4. **Kontrollera resultatet**:
   - Öppna Doc Viewer för noden
   - Verifiera att override-innehållet visas
   - Kontrollera konsolen för loggar: `[nodeDocOverrides] ✓ Loaded override...`

### Debugging

- **Konsolen visar** när override laddas: `[nodeDocOverrides] ✓ Loaded override for feature-goal: mortgage.bpmn::application`
- **Om fil inte hittas**: Inga fel, bara använder base model (förväntat beteende)
- **Om fil har fel struktur**: TypeScript-kompilering kommer att visa fel

---

## NPM Script

Lägg till i `package.json`:

```json
{
  "scripts": {
    "create:node-doc": "node scripts/generate-node-doc-override.mjs"
  }
}
```

---

## Directory Structure

Efter implementation:

```
src/
  data/
    node-docs/
      feature-goal/
        .gitkeep (eller första override-filen)
        mortgage.application.doc.ts (exempel)
      epic/
        .gitkeep
      business-rule/
        .gitkeep
```

