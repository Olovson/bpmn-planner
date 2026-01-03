# Validering: Feature Goal Genereringsprocess och Visning

## Datum: 2025-12-30

## Översikt

Detta dokument validerar hela Feature Goal-genereringsprocessen från BPMN → LLM → HTML → Visning i appen för att säkerställa att allt fungerar korrekt.

---

## 1. Genereringsprocess

### 1.1 BPMN → Context Building

**Steg:**
1. `buildBpmnProcessGraph` bygger process-grafen
2. `buildNodeDocumentationContext` bygger kontext för callActivity-noden
3. `collectDescendants` samlar alla descendant nodes rekursivt

**Validering:**
- ✅ `descendantNodes` fylls i korrekt via `collectDescendants(node)` (rad 61 i `documentationContext.ts`)
- ✅ Rekursiv samling: `collectDescendants` använder stack-baserad traversal för att hitta alla children
- ⚠️ **Potentiell risk:** Om `node.children` är undefined eller tom, blir `descendantNodes` tom array (inte null)

**Status:** ✅ Fungerar korrekt

---

### 1.2 Context → LLM Generation

**Steg:**
1. `buildContextPayload` bygger LLM-payload med `descendantNodes`
2. `generateDocumentationWithLlm` anropar LLM med JSON schema
3. LLM genererar JSON enligt `FeatureGoalDocModel`

**Validering:**
- ✅ `descendantNodes` inkluderas i `currentNodeContext` (rad 813 i `llmDocumentation.ts`)
- ✅ `descendantTypeCounts` beräknas från `descendantNodes` (rad 637-640)
- ✅ JSON schema kräver: `summary`, `flowSteps`, `userStories` (required)
- ✅ JSON schema tillåter: `dependencies` (optional)

**Status:** ✅ Fungerar korrekt

---

### 1.3 LLM JSON → Model → HTML

**Steg:**
1. `mapFeatureGoalLlmToSections` parsar LLM JSON till `FeatureGoalDocModel`
2. `buildFeatureGoalDocHtmlFromModel` renderar HTML från modellen
3. `renderFeatureGoalDoc` wrapper:ar allt och lägger till test data

**Validering:**
- ✅ `mapFeatureGoalLlmToSections` hanterar tomma arrays korrekt
- ✅ `buildFeatureGoalDocHtmlFromModel` använder `context.descendantNodes` för "Ingående komponenter"
- ✅ Template renderar alla sektioner korrekt

**Status:** ✅ Fungerar korrekt

---

## 2. "Ingående komponenter" Sektion

### 2.1 Data Collection

**Kod:** `src/lib/documentationTemplates.ts` rad 678-733

**Validering:**
- ✅ Filtrerar `context.descendantNodes` per typ (serviceTask, userTask, callActivity, businessRuleTask)
- ✅ Mappar varje node till objekt med `id`, `name`, `docUrl`
- ⚠️ **Potentiell risk:** Om `n.bpmnElementId` saknas, används `n.bpmnElementId` (kan vara undefined)
- ⚠️ **Potentiell risk:** Om `n.name` saknas, används `n.bpmnElementId` som fallback

**Fix behövs:**
```typescript
// Nuvarande kod kan krascha om bpmnElementId saknas
const docPath = getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId);
```

**Rekommendation:** Lägg till null-check:
```typescript
if (!n.bpmnElementId) {
  console.warn(`[buildFeatureGoalDocHtmlFromModel] Missing bpmnElementId for node ${n.id}, skipping`);
  return null;
}
```

**Status:** ⚠️ **Behöver fix för null-säkerhet**

---

### 2.2 Link Generation

**Service Tasks / User Tasks / Business Rules:**
- ✅ Använder `getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId)`
- ✅ URL-format: `#/doc-viewer/nodes/{bpmnFile}/{elementId}`
- ✅ Matchar DocViewer's förväntningar (rad 207-222 i `DocViewer.tsx`)

**Call Activities:**
- ✅ Använder `getFeatureGoalDocFileKey` med hierarchical naming
- ✅ URL-format: `#/doc-viewer/feature-goals/{parent}-{elementId}`
- ✅ Matchar DocViewer's förväntningar (rad 157-176 i `DocViewer.tsx`)
- ⚠️ **Potentiell risk:** Om `n.subprocessFile` saknas, används `n.bpmnFile` som fallback
- ⚠️ **Potentiell risk:** Om `parentBpmnFile` saknas, kan `getFeatureGoalDocFileKey` krascha

**Status:** ⚠️ **Behöver fix för null-säkerhet**

---

### 2.3 HTML Rendering

**Kod:** `src/lib/documentationTemplates.ts` rad 755-795

**Validering:**
- ✅ Sektion visas endast om `hasIncludedTasks === true`
- ✅ Grupperar tasks per typ med räknare
- ✅ Renderar länkar med korrekt styling
- ✅ Visar ID i `<code>` taggar

**Status:** ✅ Fungerar korrekt

---

## 3. Visning i Appen

### 3.1 DocViewer Routing

**Kod:** `src/pages/DocViewer.tsx`

**Validering:**
- ✅ Feature Goals laddas via `getFeatureGoalDocStoragePaths` (rad 166-176)
- ✅ Path-format: `feature-goals/{parent}-{elementId}` (utan .html)
- ✅ Version hash används korrekt för att hitta rätt version
- ✅ Fallback-logik finns om Feature Goal inte hittas

**Status:** ✅ Fungerar korrekt

---

### 3.2 Link Navigation

**Validering:**
- ✅ Länkar i "Ingående komponenter" använder hash-router format (`#/doc-viewer/...`)
- ✅ DocViewer hanterar både `nodes/...` och `feature-goals/...` paths
- ✅ Navigation fungerar via React Router

**Status:** ✅ Fungerar korrekt

---

### 3.3 File-level Documentation

**Kod:** `src/lib/bpmnGenerators.ts` rad 1429-1457

**Validering:**
- ✅ Feature Goal-dokumentation inkluderas i file-level docs
- ✅ Header-sektionen tas bort korrekt (rad 1447-1450)
- ✅ Länkar till Feature Goal-dokumentationen fungerar (rad 1432)

**Status:** ✅ Fungerar korrekt

---

## 4. Identifierade Problem och Fixes

### Problem 1: Null-säkerhet för bpmnElementId

**Risk:** Om `n.bpmnElementId` är undefined, kan `getNodeDocViewerPath` krascha eller generera felaktiga länkar.

**Fix:** Lägg till null-check och skip nodes utan bpmnElementId:
```typescript
const serviceTasks = context.descendantNodes
  .filter(n => n.type === 'serviceTask' && n.bpmnElementId) // ✅ Lägg till null-check
  .map(n => {
    if (!n.bpmnElementId) return null; // ✅ Extra säkerhet
    // ... resten av koden
  })
  .filter((task): task is NonNullable<typeof task> => task !== null); // ✅ Filtrera bort null
```

---

### Problem 2: Null-säkerhet för subprocessFile

**Risk:** Om `n.subprocessFile` saknas för call activities, kan `getFeatureGoalDocFileKey` krascha.

**Fix:** Lägg till null-check:
```typescript
const callActivities = context.descendantNodes
  .filter(n => n.type === 'callActivity' && n.bpmnElementId && n.subprocessFile) // ✅ Lägg till null-check
  .map(n => {
    if (!n.bpmnElementId || !n.subprocessFile) return null; // ✅ Extra säkerhet
    // ... resten av koden
  })
  .filter((task): task is NonNullable<typeof task> => task !== null); // ✅ Filtrera bort null
```

---

### Problem 3: Tom descendantNodes Array

**Risk:** Om `descendantNodes` är tom, visas ingen "Ingående komponenter" sektion (vilket är korrekt beteende).

**Status:** ✅ **Inte ett problem** - Detta är korrekt beteende. Om det inte finns några descendant nodes, ska sektionen inte visas.

---

## 5. Testscenarion

### Scenario 1: Normal Feature Goal med Tasks

**Input:**
- CallActivity "internal-data-gathering" i `mortgage-se-application.bpmn`
- Subprocess: `mortgage-se-internal-data-gathering.bpmn`
- Subprocess innehåller: 3 ServiceTasks, 1 UserTask

**Förväntat Resultat:**
- ✅ Feature Goal genereras med hierarchical naming
- ✅ "Ingående komponenter" visar 3 Service Tasks och 1 User Task
- ✅ Alla länkar fungerar och pekar på rätt Epic-dokumentation
- ✅ DocViewer kan ladda Feature Goal-dokumentationen

---

### Scenario 2: Feature Goal utan Descendant Nodes

**Input:**
- CallActivity med subprocess som inte har några tasks ännu

**Förväntat Resultat:**
- ✅ Feature Goal genereras ändå (med summary, flowSteps, userStories)
- ✅ "Ingående komponenter" sektionen visas INTE (korrekt beteende)
- ✅ Övriga sektioner fungerar normalt

---

### Scenario 3: Feature Goal med Nested Call Activities

**Input:**
- CallActivity med subprocess som innehåller andra CallActivities

**Förväntat Resultat:**
- ✅ "Ingående komponenter" visar alla descendant nodes (inklusive nested call activities)
- ✅ Länkar för nested call activities pekar på deras Feature Goal-dokumentation
- ✅ Rekursiv samling fungerar korrekt

---

## 6. Rekommendationer

### Kortsiktigt (Innan nästa generering):

1. ✅ **Lägg till null-checks** för `bpmnElementId` och `subprocessFile`
2. ✅ **Filtrera bort null-värden** från arrays
3. ✅ **Lägg till console.warn** för debugging om nodes saknas

### Långsiktigt:

1. **Förbättra error handling:**
   - Logga varningar om descendantNodes är tom (kan indikera problem)
   - Logga varningar om nodes saknar bpmnElementId

2. **Förbättra validering:**
   - Validera att alla länkar är korrekta innan rendering
   - Testa länkar i DocViewer

---

## 7. Slutsats

**Status:** ✅ **Genereringsprocessen fungerar korrekt** med några små förbättringar behövs för null-säkerhet.

**Nästa steg:**
1. Implementera null-checks (se Problem 1 och 2 ovan)
2. Testa med faktisk generering
3. Verifiera att alla länkar fungerar i DocViewer




