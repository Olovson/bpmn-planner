# Analys: Per-Node Dokumentationsöverskridanden

## 1. Sammanfattning av Nuvarande Arkitektur

### 1.1 Dokumentationsgenereringsflöde

**Lokalt läge (useLlm = false):**
1. `buildFeatureGoalDocModelFromContext()` / `buildEpicDocModelFromContext()` / `buildBusinessRuleDocBody()` 
   → Bygger en modell från `NodeDocumentationContext` med hårdkodade fallback-texter
2. `buildFeatureGoalDocHtmlFromModel()` / `buildEpicDocHtmlFromModel()` / `buildBusinessRuleDocHtmlFromModel()`
   → Renderar HTML från modellen
3. `wrapDocument()` → Wrappar HTML med metadata

**LLM-läge (useLlm = true):**
1. `generateDocumentationWithLlm()` → Hämtar LLM-innehåll
2. `mapFeatureGoalLlmToSections()` / `mapEpicLlmToSections()` / `mapBusinessRuleLlmToSections()`
   → Mappar LLM-output till modell
3. Samma HTML-rendering som ovan

### 1.2 Modelltyper

- **FeatureGoalDocModel**: `summary`, `effectGoals`, `scopeIncluded`, `scopeExcluded`, `epics[]`, `flowSteps[]`, `dependencies[]`, `scenarios[]`, `testDescription`, `implementationNotes[]`, `relatedItems[]`
- **EpicDocModel**: `summary`, `prerequisites[]`, `inputs[]`, `flowSteps[]`, `interactions[]`, `dataContracts[]`, `businessRulesPolicy[]`, `scenarios[]`, `testDescription`, `implementationNotes[]`, `relatedItems[]`
- **BusinessRuleDocModel**: `summary`, `inputs[]`, `decisionLogic[]`, `outputs[]`, `businessRulesPolicy[]`, `scenarios[]`, `testDescription`, `implementationNotes[]`, `relatedItems[]`

### 1.3 Node-identifiering

- **Nyckel**: `bpmnFile` + `bpmnElementId`
- **Sanitization**: `sanitizeElementId()` tar bort specialtecken, ersätter med `-`
- **Exempel**: `mortgage.bpmn` + `application` → `nodes/mortgage/application.html`

### 1.4 Build-konfiguration

- **Bundler**: Vite (ESM, TypeScript)
- **Module resolution**: `bundler` mode (stödjer både static och dynamic imports)
- **Befintliga statiska filer**: `src/data/testMapping.ts`, `src/data/staccIntegrationMapping.ts`
- **Type**: `"module"` (ESM)

---

## 2. Analys av Alternativ

### Alternativ A: TypeScript/JavaScript Moduler (Rekommenderat)

**Struktur:**
```
src/data/node-docs/
  feature-goal/
    mortgage.application.doc.ts
    mortgage-se-application.household.doc.ts
  epic/
    mortgage-se-application.confirm-application.doc.ts
  business-rule/
    mortgage-se-credit-evaluation.credit-decision.doc.ts
```

**Implementation:**
```typescript
// src/data/node-docs/feature-goal/mortgage.application.doc.ts
import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

export const overrides: FeatureGoalDocOverrides = {
  summary: "Application är huvudprocessen för bolåneansökningar...",
  effectGoals: [
    "Förbättrad kundupplevelse genom snabbare ansökningsprocess",
    // ...
  ],
  // Partial - endast fält som ska överskridas
};
```

**Pros:**
- ✅ **Full type safety** - TypeScript validerar att överrides matchar modelltyperna
- ✅ **IntelliSense/autocomplete** - Utvecklare får direkt feedback i IDE
- ✅ **Enkel integration** - Direkt import, ingen parsing
- ✅ **Konsistent med befintlig kod** - Följer samma mönster som `testMapping.ts`
- ✅ **Version control friendly** - Diff/merge fungerar bra med TypeScript
- ✅ **Ingen runtime overhead** - Statiska imports, tree-shaking
- ✅ **Stödjer kommentarer** - TypeScript-kommentarer för dokumentation

**Cons:**
- ⚠️ Kräver TypeScript-kunskap (men minimal - bara export av objekt)
- ⚠️ Kan bli många filer (men det är önskat - en per nod)

**File resolution:**
```typescript
function getOverridePath(
  docType: 'feature-goal' | 'epic' | 'business-rule',
  bpmnFile: string,
  elementId: string
): string {
  const baseName = bpmnFile.replace('.bpmn', '');
  const sanitized = sanitizeElementId(elementId);
  return `@/data/node-docs/${docType}/${baseName}.${sanitized}.doc`;
}
```

**Bundling:**
- Vite stödjer dynamic imports: `import(overridePath)`
- Kan använda try/catch för att hantera saknade filer gracefully
- Tree-shaking fungerar - endast använda överrides inkluderas i bundle

---

### Alternativ B: JSON/Markdown Filer

**Struktur:**
```
src/data/node-docs/
  feature-goal/
    mortgage.application.doc.json
  epic/
    mortgage-se-application.confirm-application.doc.json
```

**Pros:**
- ✅ Enklare för icke-utvecklare att redigera
- ✅ Kan redigeras i externa verktyg

**Cons:**
- ❌ Ingen type safety - runtime-fel om felaktig struktur
- ❌ Ingen autocomplete
- ❌ Kräver parsing och validering vid runtime
- ❌ Markdown kräver extra parsing för att mappa till modeller
- ❌ JSON är mindre läsbart för komplexa strukturer (scenarios med objekt)
- ❌ Ingen stöd för kommentarer i JSON
- ❌ Runtime overhead för att läsa/parsa filer

**File resolution:**
- Kräver `fetch()` eller `import.meta.glob()` i Vite
- Måste hantera async loading
- Validering kräver Zod eller liknande

---

### Alternativ C: Hybrid (TypeScript + JSON fallback)

**Pros:**
- ✅ Flexibilitet för olika användare

**Cons:**
- ❌ Dubbel komplexitet
- ❌ Två olika pipelines att underhålla
- ❌ Förvirrande för utvecklare

---

## 3. Rekommendation: TypeScript Moduler (Alternativ A)

### 3.1 Varför TypeScript Moduler?

1. **Konsistens**: Följer samma mönster som `testMapping.ts` och `staccIntegrationMapping.ts`
2. **Type safety**: Kompileringsfel om struktur är felaktig
3. **Developer Experience**: IntelliSense, autocomplete, refactoring-stöd
4. **Performance**: Ingen runtime overhead, tree-shaking
5. **Maintainability**: Lätt att hitta och redigera filer, tydlig struktur
6. **Iterativ utveckling**: Kan börja med tomma överrides och bygga upp gradvis

### 3.2 Trade-offs

- **TypeScript-kunskap krävs**: Men minimal - bara export av objekt
- **Många filer**: Men det är önskat - en per nod som behöver anpassning

---

## 4. Arkitektur och API

### 4.1 Directory Structure

```
src/
  data/
    node-docs/
      feature-goal/
        mortgage.application.doc.ts
        mortgage-se-application.internal-data-gathering.doc.ts
      epic/
        mortgage-se-application.confirm-application.doc.ts
        mortgage-se-application.household.doc.ts
      business-rule/
        mortgage-se-credit-evaluation.credit-decision.doc.ts
```

**Naming convention:**
- Format: `<bpmnBaseName>.<elementId>.doc.ts`
- `bpmnBaseName`: `mortgage.bpmn` → `mortgage`, `mortgage-se-application.bpmn` → `mortgage-se-application`
- `elementId`: Sanitized med `sanitizeElementId()`

### 4.2 Type Definitions

```typescript
// src/lib/nodeDocOverrides.ts

import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import type { EpicDocModel } from './epicDocTypes';
import type { BusinessRuleDocModel } from './businessRuleDocTypes';

/**
 * Partial override for Feature Goal documentation.
 * Only include fields you want to override or supplement.
 * Array fields can be:
 * - Fully replaced (provide complete array)
 * - Extended (use special merge markers - see merge logic)
 */
export type FeatureGoalDocOverrides = Partial<FeatureGoalDocModel> & {
  // Optional: mark fields that should extend rather than replace
  _mergeStrategy?: {
    effectGoals?: 'replace' | 'extend';
    scopeIncluded?: 'replace' | 'extend';
    scopeExcluded?: 'replace' | 'extend';
    epics?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    dependencies?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};

export type EpicDocOverrides = Partial<EpicDocModel> & {
  _mergeStrategy?: {
    prerequisites?: 'replace' | 'extend';
    inputs?: 'replace' | 'extend';
    flowSteps?: 'replace' | 'extend';
    interactions?: 'replace' | 'extend';
    dataContracts?: 'replace' | 'extend';
    businessRulesPolicy?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};

export type BusinessRuleDocOverrides = Partial<BusinessRuleDocModel> & {
  _mergeStrategy?: {
    inputs?: 'replace' | 'extend';
    decisionLogic?: 'replace' | 'extend';
    outputs?: 'replace' | 'extend';
    businessRulesPolicy?: 'replace' | 'extend';
    scenarios?: 'replace' | 'extend';
    implementationNotes?: 'replace' | 'extend';
    relatedItems?: 'replace' | 'extend';
  };
};
```

### 4.3 Loader Functions

```typescript
// src/lib/nodeDocOverrides.ts (continued)

import type { NodeDocumentationContext } from './documentationContext';
import { sanitizeElementId } from './nodeArtifactPaths';

/**
 * Builds the import path for a node documentation override file.
 * Returns null if the file doesn't exist (graceful fallback).
 */
function getOverrideImportPath(
  docType: 'feature-goal' | 'epic' | 'business-rule',
  bpmnFile: string,
  elementId: string
): string {
  const baseName = bpmnFile.replace('.bpmn', '');
  const sanitized = sanitizeElementId(elementId);
  return `@/data/node-docs/${docType}/${baseName}.${sanitized}.doc`;
}

/**
 * Loads Feature Goal documentation overrides for a node.
 * Returns null if no override file exists.
 */
export async function loadFeatureGoalOverrides(
  context: NodeDocumentationContext
): Promise<FeatureGoalDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) return null;

  try {
    const overridePath = getOverrideImportPath('feature-goal', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    return module.overrides || null;
  } catch (error) {
    // File doesn't exist - that's fine, use base model
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return null;
    }
    console.warn(
      `[loadFeatureGoalOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}

export async function loadEpicOverrides(
  context: NodeDocumentationContext
): Promise<EpicDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) return null;

  try {
    const overridePath = getOverrideImportPath('epic', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    return module.overrides || null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return null;
    }
    console.warn(
      `[loadEpicOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}

export async function loadBusinessRuleOverrides(
  context: NodeDocumentationContext
): Promise<BusinessRuleDocOverrides | null> {
  const { bpmnFile, bpmnElementId } = context.node;
  if (!bpmnFile || !bpmnElementId) return null;

  try {
    const overridePath = getOverrideImportPath('business-rule', bpmnFile, bpmnElementId);
    const module = await import(overridePath);
    return module.overrides || null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return null;
    }
    console.warn(
      `[loadBusinessRuleOverrides] Error loading override for ${bpmnFile}::${bpmnElementId}:`,
      error
    );
    return null;
  }
}
```

### 4.4 Merge Logic

```typescript
// src/lib/nodeDocOverrides.ts (continued)

/**
 * Merges override data into a base model.
 * Handles both full replacement and extension strategies for array fields.
 */
export function mergeFeatureGoalOverrides(
  base: FeatureGoalDocModel,
  overrides: FeatureGoalDocOverrides | null
): FeatureGoalDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  // Simple fields: override if provided
  if (overrides.summary !== undefined) merged.summary = overrides.summary;
  if (overrides.testDescription !== undefined) merged.testDescription = overrides.testDescription;

  // Array fields: check merge strategy
  const arrayFields: (keyof FeatureGoalDocModel)[] = [
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'epics',
    'flowSteps',
    'dependencies',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      // Extend: concatenate base + override
      merged[field] = [...(base[field] as any[]), ...(overrides[field] as any[])] as any;
    } else {
      // Replace: use override completely
      merged[field] = overrides[field] as any;
    }
  }

  // Remove merge strategy metadata before returning
  delete (merged as any)._mergeStrategy;

  return merged;
}

export function mergeEpicOverrides(
  base: EpicDocModel,
  overrides: EpicDocOverrides | null
): EpicDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  if (overrides.summary !== undefined) merged.summary = overrides.summary;
  if (overrides.testDescription !== undefined) merged.testDescription = overrides.testDescription;

  const arrayFields: (keyof EpicDocModel)[] = [
    'prerequisites',
    'inputs',
    'flowSteps',
    'interactions',
    'dataContracts',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      merged[field] = [...(base[field] as any[]), ...(overrides[field] as any[])] as any;
    } else {
      merged[field] = overrides[field] as any;
    }
  }

  delete (merged as any)._mergeStrategy;
  return merged;
}

export function mergeBusinessRuleOverrides(
  base: BusinessRuleDocModel,
  overrides: BusinessRuleDocOverrides | null
): BusinessRuleDocModel {
  if (!overrides) return base;

  const merged = { ...base };
  const mergeStrategy = overrides._mergeStrategy || {};

  if (overrides.summary !== undefined) merged.summary = overrides.summary;
  if (overrides.testDescription !== undefined) merged.testDescription = overrides.testDescription;

  const arrayFields: (keyof BusinessRuleDocModel)[] = [
    'inputs',
    'decisionLogic',
    'outputs',
    'businessRulesPolicy',
    'scenarios',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of arrayFields) {
    if (overrides[field] === undefined) continue;

    const strategy = mergeStrategy[field] || 'replace';
    if (strategy === 'extend') {
      merged[field] = [...(base[field] as any[]), ...(overrides[field] as any[])] as any;
    } else {
      merged[field] = overrides[field] as any;
    }
  }

  delete (merged as any)._mergeStrategy;
  return merged;
}
```

---

## 5. Integration i Befintliga Funktioner

### 5.1 Feature Goal Integration

```typescript
// I documentationTemplates.ts

// Uppdatera buildFeatureGoalDocModelFromContext för att vara async och ladda överrides
async function buildFeatureGoalDocModelWithOverrides(
  context: NodeDocumentationContext
): Promise<FeatureGoalDocModel> {
  const baseModel = buildFeatureGoalDocModelFromContext(context);
  const overrides = await loadFeatureGoalOverrides(context);
  return mergeFeatureGoalOverrides(baseModel, overrides);
}

// Uppdatera renderFeatureGoalDoc
export const renderFeatureGoalDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  const model = await buildFeatureGoalDocModelWithOverrides(context);
  const body = buildFeatureGoalDocHtmlFromModel(context, links, model);
  const title = context.node.name || context.node.bpmnElementId || 'Feature Goal';
  return wrapDocument(title, body);
};
```

### 5.2 Epic Integration

```typescript
async function buildEpicDocModelWithOverrides(
  context: NodeDocumentationContext
): Promise<EpicDocModel> {
  const baseModel = buildEpicDocModelFromContext(context);
  const overrides = await loadEpicOverrides(context);
  return mergeEpicOverrides(baseModel, overrides);
}

export const renderEpicDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  const model = await buildEpicDocModelWithOverrides(context);
  const body = buildEpicDocHtmlFromModel(context, links, model);
  const title = context.node.name || context.node.bpmnElementId || 'Epic';
  return wrapDocument(title, body);
};
```

### 5.3 Business Rule Integration

```typescript
// Först: extrahera modellbyggaren från buildBusinessRuleDocBody
function buildBusinessRuleDocModelFromContext(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): BusinessRuleDocModel {
  // Flytta logiken från buildBusinessRuleDocBody hit
  // Returnera modell istället för HTML
}

async function buildBusinessRuleDocModelWithOverrides(
  context: NodeDocumentationContext,
  links: TemplateLinks,
): Promise<BusinessRuleDocModel> {
  const baseModel = buildBusinessRuleDocModelFromContext(context, links);
  const overrides = await loadBusinessRuleOverrides(context);
  return mergeBusinessRuleOverrides(baseModel, overrides);
}

// Uppdatera buildBusinessRuleDocBody att använda modellen
function buildBusinessRuleDocBody(
  context: NodeDocumentationContext,
  links: TemplateLinks,
  model: BusinessRuleDocModel, // Lägg till parameter
): string {
  // Använd modellen istället för att bygga den här
  return buildBusinessRuleDocHtmlFromModel(context, links, model);
}

export const renderBusinessRuleDoc = async (
  context: NodeDocumentationContext,
  links: TemplateLinks,
) => {
  const model = await buildBusinessRuleDocModelWithOverrides(context, links);
  const body = buildBusinessRuleDocBody(context, links, model);
  const title = context.node.name || context.node.bpmnElementId || 'Business Rule';
  return wrapDocument(title, body);
};
```

### 5.4 Uppdatera Anrop i bpmnGenerators.ts

```typescript
// I generateAllFromBpmnWithGraph, uppdatera anropen:

// Före:
nodeDocContent = await renderDocWithLlmFallback(
  'feature',
  nodeContext,
  docLinks,
  () => renderFeatureGoalDoc(nodeContext, docLinks), // Fallback
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

---

## 6. Iterativ Utveckling och Developer Experience

### 6.1 Upptäcka Noder som Kan Ha Överrides

**I UI (framtida förbättring):**
- Visa en indikator på dokumentationssidan om override finns
- Lägg till en "Create override"-knapp som genererar template-fil

**I kod:**
- Logga när override laddas: `console.log('[Doc] Loaded override for ${bpmnFile}::${elementId}')`
- Logga när override saknas (endast i dev): `console.debug('[Doc] No override found for ${bpmnFile}::${elementId}')`

### 6.2 Skapa Ny Override-fil

**Template-generator script:**
```typescript
// scripts/generate-node-doc-override.mjs

import fs from 'fs';
import path from 'path';

const docType = process.argv[2]; // 'feature-goal' | 'epic' | 'business-rule'
const bpmnFile = process.argv[3];
const elementId = process.argv[4];

if (!docType || !bpmnFile || !elementId) {
  console.error('Usage: node generate-node-doc-override.mjs <docType> <bpmnFile> <elementId>');
  process.exit(1);
}

const baseName = bpmnFile.replace('.bpmn', '');
const sanitized = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
const dir = `src/data/node-docs/${docType}`;
const filePath = `${dir}/${baseName}.${sanitized}.doc.ts`;

// Ensure directory exists
fs.mkdirSync(dir, { recursive: true });

const template = `import type { ${docType === 'feature-goal' ? 'FeatureGoalDocOverrides' : docType === 'epic' ? 'EpicDocOverrides' : 'BusinessRuleDocOverrides'} } from '@/lib/nodeDocOverrides';

/**
 * Documentation overrides for ${bpmnFile}::${elementId}
 * 
 * This file allows you to customize the generated documentation for this specific node.
 * Only include fields you want to override - all other fields will use the base model.
 * 
 * To extend arrays instead of replacing them, use _mergeStrategy:
 * 
 * export const overrides: ${docType === 'feature-goal' ? 'FeatureGoalDocOverrides' : docType === 'epic' ? 'EpicDocOverrides' : 'BusinessRuleDocOverrides'} = {
 *   summary: "Custom summary...",
 *   effectGoals: ["New goal 1", "New goal 2"],
 *   _mergeStrategy: {
 *     effectGoals: 'extend' // Will append to base model's effectGoals
 *   }
 * };
 */

export const overrides: ${docType === 'feature-goal' ? 'FeatureGoalDocOverrides' : docType === 'epic' ? 'EpicDocOverrides' : 'BusinessRuleDocOverrides'} = {
  // Add your overrides here
  // Example:
  // summary: "Custom summary for this node...",
};
`;

fs.writeFileSync(filePath, template);
console.log(`✅ Created override file: ${filePath}`);
```

**NPM script:**
```json
{
  "scripts": {
    "create:node-doc": "node scripts/generate-node-doc-override.mjs"
  }
}
```

**Användning:**
```bash
npm run create:node-doc feature-goal mortgage.bpmn application
```

### 6.3 Testa Lokalt

1. **Skapa override-fil** med scriptet ovan
2. **Redigera filen** med önskat innehåll
3. **Generera dokumentation lokalt** från Files-sidan
4. **Kontrollera resultatet** i Doc Viewer
5. **Iterera** tills innehållet är korrekt

### 6.4 Exempel: Override-fil

```typescript
// src/data/node-docs/feature-goal/mortgage.application.doc.ts

import type { FeatureGoalDocOverrides } from '@/lib/nodeDocOverrides';

export const overrides: FeatureGoalDocOverrides = {
  summary:
    "Application är huvudprocessen för bolåneansökningar i Staccs kreditplattform. " +
    "Processen samlar in och validerar kundinformation, genomför kreditupplysningar, " +
    "och koordinerar beslutsprocessen för att ge kunden ett snabbt och tydligt besked.",
  
  effectGoals: [
    "Minskad handläggningstid från 5-7 dagar till under 24 timmar för standardansökningar",
    "Förbättrad datakvalitet genom strukturerad datainsamling och automatisk validering",
    "Högre kundnöjdhet genom snabbare besked och tydlig kommunikation",
  ],

  flowSteps: [
    "Kunden initierar ansökan via digital kanal (web/app)",
    "Systemet samlar in grundläggande kund- och ansökningsdata",
    "Automatisk kreditupplysning och riskbedömning genomförs",
    "Beslut genereras baserat på policy och riskramverk",
    "Kunden får besked och nästa steg presenteras",
  ],

  // Extend base scenarios instead of replacing
  _mergeStrategy: {
    scenarios: 'extend',
  },
};
```

---

## 7. Implementation Plan

### Steg 1: Skapa Type Definitions och Loaders
- [ ] Skapa `src/lib/nodeDocOverrides.ts` med typer och loader-funktioner
- [ ] Skapa merge-funktioner

### Steg 2: Skapa Directory Structure
- [ ] Skapa `src/data/node-docs/feature-goal/`, `epic/`, `business-rule/`
- [ ] Lägg till `.gitkeep` eller exempelfil

### Steg 3: Uppdatera Model Builders
- [ ] Gör `buildFeatureGoalDocModelFromContext` async-kompatibel
- [ ] Gör `buildEpicDocModelFromContext` async-kompatibel
- [ ] Extrahera `buildBusinessRuleDocModelFromContext` från `buildBusinessRuleDocBody`
- [ ] Lägg till override-loading i alla tre

### Steg 4: Uppdatera Render Functions
- [ ] Gör `renderFeatureGoalDoc`, `renderEpicDoc`, `renderBusinessRuleDoc` async
- [ ] Uppdatera anrop i `bpmnGenerators.ts` att hantera async fallbacks

### Steg 5: Skapa Developer Tools
- [ ] Skapa template-generator script
- [ ] Lägg till NPM script
- [ ] Dokumentera i README

### Steg 6: Testa och Iterera
- [ ] Skapa en test-override för en nod
- [ ] Verifiera att merge fungerar korrekt
- [ ] Testa både 'replace' och 'extend' strategies

---

## 8. Framtida Utökningar

### 8.1 Source Metadata

Framtida utökning för att spåra källa:
```typescript
export interface DocFieldSource {
  source: 'base' | 'override' | 'llm';
  timestamp?: string;
}

export type FeatureGoalDocModelWithSources = {
  [K in keyof FeatureGoalDocModel]: FeatureGoalDocModel[K] & {
    _source?: DocFieldSource;
  };
};
```

### 8.2 Partial Field Overrides

För att kunna överskrida delar av arrayer:
```typescript
export type FeatureGoalDocOverrides = {
  scenarios?: {
    // Replace entire array
    replace?: FeatureGoalDocModel['scenarios'];
    // Or extend with new items
    extend?: FeatureGoalDocModel['scenarios'];
    // Or update specific items by ID
    update?: Record<string, Partial<FeatureGoalDocModel['scenarios'][0]>>;
  };
};
```

### 8.3 Validation

Lägg till Zod-scheman för runtime-validering:
```typescript
import { z } from 'zod';

const FeatureGoalDocOverridesSchema = z.object({
  summary: z.string().optional(),
  // ...
});

export function validateOverrides(data: unknown): FeatureGoalDocOverrides {
  return FeatureGoalDocOverridesSchema.parse(data);
}
```

---

## 9. Sammanfattning

**Rekommenderad approach: TypeScript Moduler**

- ✅ Full type safety och IntelliSense
- ✅ Konsistent med befintlig kodbas
- ✅ Ingen runtime overhead
- ✅ Enkel integration med befintlig pipeline
- ✅ Version control friendly
- ✅ Iterativ utveckling - börja med få filer, bygg upp gradvis

**Nästa steg:**
1. Implementera type definitions och loaders
2. Uppdatera model builders att vara async och ladda överrides
3. Skapa template-generator script
4. Testa med en exempel-nod
5. Dokumentera i README

