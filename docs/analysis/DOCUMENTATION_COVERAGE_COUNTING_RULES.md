# Dokumentationsräkning: Regler och Logik

## Datum: 2025-12-26

## 🎯 Grundläggande Regel: Vad räknas för varje fil?

### Noder som räknas i `total_nodes`:

1. **UserTask** → Genererar **Epic** (node doc)
2. **ServiceTask** → Genererar **Epic** (node doc)
3. **BusinessRuleTask** → Genererar **Epic** (node doc)
4. **CallActivity** → Genererar **Feature Goal** (feature-goal doc)

### Exempel: `mortgage-se-object.bpmn`

**Noder i filen:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity "object-information" → 1 Feature Goal

**Total: 4 noder (3 Epics + 1 Feature Goal)**

**Dokumentation som genereras:**
- `nodes/mortgage-se-object/{userTask1}.html` (Epic)
- `nodes/mortgage-se-object/{userTask2}.html` (Epic)
- `nodes/mortgage-se-object/{serviceTask}.html` (Epic)
- `feature-goals/mortgage-se-object-object-information.html` (Feature Goal)

**Räknas som: 4/4** (om alla dokumentationer finns)

---

## 📋 Detaljerad Logik

### 1. Call Activities räknas i parent-filen

**VIKTIGT:** Call activities räknas som Feature Goals för filen där de är **definierade** (parent-filen), INTE när subprocess-filen genereras.

**Exempel:**
- `mortgage-se-object.bpmn` har call activity "object-information" som pekar på `mortgage-se-object-information.bpmn`
- Feature Goal genereras när `mortgage-se-object.bpmn` genereras
- Feature Goal-filnamn: `mortgage-se-object-object-information.html` (hierarchical naming)
- Detta räknas som dokumentation för `mortgage-se-object.bpmn`, INTE för `mortgage-se-object-information.bpmn`

### 2. Process Feature Goals är separat

**VIKTIGT:** Process Feature Goals (t.ex. `mortgage-se-object-information.html` för process-noden i subprocess-filen) är **separat** dokumentation och räknas INTE som node documentation för filen.

**Exempel:**
- `mortgage-se-object-information.bpmn` har en process-nod
- Process Feature Goal: `mortgage-se-object-information.html` (utan parent prefix)
- Detta är dokumentation för **processen själv**, inte för noder i filen
- Detta räknas INTE i node documentation coverage

### 3. Hierarchical Naming för Call Activities

**VIKTIGT:** Feature Goals för call activities använder ALLTID hierarchical naming (med parent prefix).

**Format:**
- `feature-goals/{parentBaseName}-{elementId}.html`
- Exempel: `mortgage-se-object-object-information.html`

**Varför:**
- Säkerställer att Feature Goals för call activities från olika parent-filer inte kolliderar
- Matchar Jira-naming (t.ex. "Application - Internal data gathering")

---

## 🔍 Räkningslogik i `useFileArtifactCoverage.ts`

### `total_nodes` beräkning:

```typescript
const relevantElements = parseResult.elements.filter(e => {
  const elementType = e.type;
  
  // Räkna tasks (UserTask, ServiceTask, BusinessRuleTask) → Epics
  // Räkna call activities → Feature Goals
  return elementType === 'bpmn:UserTask' || 
         elementType === 'bpmn:ServiceTask' || 
         elementType === 'bpmn:BusinessRuleTask' ||
         elementType === 'bpmn:CallActivity';
});

const total_nodes = relevantElements.length;
```

### `docs_covered` beräkning:

**För tasks (UserTask, ServiceTask, BusinessRuleTask):**
- Letar efter: `nodes/{fileBaseName}/{elementId}.html`
- Räknas som Epic-dokumentation

**För call activities:**
- Letar efter: `feature-goals/{parentBaseName}-{elementId}.html` (hierarchical naming)
- Räknas som Feature Goal-dokumentation
- Använder BARA hierarchical naming (ingen legacy fallback)

---

## ✅ Validering

### För `mortgage-se-object.bpmn`:

**Förväntat:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity → 1 Feature Goal
- **Total: 4/4**

**Verifiering:**
```bash
npm run check:storage-docs mortgage-se-object.bpmn
```

Detta bör visa:
- 3 node docs (för UserTasks och ServiceTask)
- 1 feature goal doc (för CallActivity "object-information")

---

## 📚 Relaterad Dokumentation

- `docs/analysis/WHAT_WE_GENERATE_SUMMARY.md` - Vad vi genererar
- `docs/analysis/DOCUMENTATION_COUNTING_FIX.md` - Fix för räkningsproblem
- `docs/analysis/DOCUMENTATION_COUNTING_VERIFICATION.md` - Verifiering av lagringsplatser

---

## 🚨 Viktiga Regler (För att undvika framtida förvirring)

1. **Call Activities räknas i parent-filen** - INTE när subprocess-filen genereras
2. **Process Feature Goals räknas INTE** - De är separat process-dokumentation
3. **Använd BARA hierarchical naming** - Ingen legacy fallback för call activities
4. **Räkna direkt från parseResult** - INTE från grafen (som inkluderar subprocesser)

---

**Senast uppdaterad:** 2025-12-26
**Status:** ✅ Dokumenterad och validerad



