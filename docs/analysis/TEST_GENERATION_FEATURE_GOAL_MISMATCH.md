# Analys: Testgenerering vs Dokumentationsgenerering - Feature Goal Mismatch

## Problem

Testgenereringen misslyckas med meddelandet:
```
Dokumentation saknas för alla 15 Feature Goal(s): Automatic Credit Evaluation, Credit decision, Signing, ...
```

Men dokumentation genereras korrekt. Problemet är att testgenereringen letar efter Feature Goal-dokumentation med **fel naming-strategi**.

## Root Cause

### Dokumentationsgenerering (bpmnGenerators.ts)

**CallActivity Feature Goals genereras INTE längre:**
```typescript
// Rad 1301-1306
if (node.type === 'callActivity') {
  // Hoppa över - Process Feature Goal genereras senare för subprocess-filen
  continue;
}
```

**Istället genereras Process Feature Goals för subprocess-filer:**
```typescript
// Rad 2223-2230
const processFeatureDocPath = getFeatureGoalDocFileKey(
  file,                                    // subprocess-filen (t.ex. "mortgage-se-credit-evaluation.bpmn")
  processNodeForFileForRoot.bpmnElementId || fileBaseName,
  undefined,                               // no version suffix
  undefined,                               // no parent (non-hierarchical)
  false,                                   // isRootProcess = false
);
```

**Naming:** Non-hierarchical (ingen parent)
- Format: `feature-goals/{subprocessBaseName}.html`
- Exempel: `feature-goals/mortgage-se-credit-evaluation.html`
- Sparas under: `docs/claude/{subprocessFile}/{versionHash}/feature-goals/{subprocessBaseName}.html`

### Testgenerering (testGenerators.ts)

**Letar efter CallActivity Feature Goals (hierarchical naming):**
```typescript
// Rad 128-134
docPath = await getFeatureGoalDocStoragePaths(
  node.subprocessFile,                     // subprocess-filen
  elementId,                               // callActivity elementId (t.ex. "credit-evaluation")
  bpmnFileName,                            // parent BPMN file (t.ex. "mortgage.bpmn")
  subprocessVersionHash,
  node.subprocessFile,
);
```

**Naming:** Hierarchical (med parent)
- Format: `feature-goals/{parent}-{elementId}.html`
- Exempel: `feature-goals/mortgage-credit-evaluation.html`
- Letar efter: `docs/claude/{subprocessFile}/{versionHash}/feature-goals/{parent}-{elementId}.html`

## Diskrepans

| Aspekt | Dokumentationsgenerering | Testgenerering |
|--------|-------------------------|----------------|
| **Typ** | Process Feature Goal (för subprocess-filen) | CallActivity Feature Goal (hierarchical) |
| **Naming** | Non-hierarchical: `feature-goals/{subprocessBaseName}` | Hierarchical: `feature-goals/{parent}-{elementId}` |
| **Exempel** | `feature-goals/mortgage-se-credit-evaluation.html` | `feature-goals/mortgage-credit-evaluation.html` |
| **Version hash** | Subprocess-filens version hash | Subprocess-filens version hash ✅ |
| **Storage path** | `docs/claude/{subprocessFile}/{versionHash}/feature-goals/{subprocessBaseName}.html` | `docs/claude/{subprocessFile}/{versionHash}/feature-goals/{parent}-{elementId}.html` |

## Lösning

Testgenereringen måste uppdateras för att leta efter **Process Feature Goals** (non-hierarchical) istället för CallActivity Feature Goals (hierarchical).

### Ändringar som behövs

1. **testGenerators.ts** (rad 128-134):
   - Ändra från hierarchical naming till non-hierarchical naming
   - Använd `getFeatureGoalDocFileKey` med `parentBpmnFile = undefined`

2. **Konsekvenser:**
   - Process Feature Goals är delade mellan alla parent-processer som anropar samma subprocess
   - Detta är korrekt eftersom Process Feature Goals beskriver subprocessen i sig, inte specifika användningar

## Exempel

För callActivity `credit-evaluation` i `mortgage.bpmn` som anropar `mortgage-se-credit-evaluation.bpmn`:

**Dokumentation genereras:**
- Path: `feature-goals/mortgage-se-credit-evaluation.html`
- Storage: `docs/claude/mortgage-se-credit-evaluation.bpmn/{versionHash}/feature-goals/mortgage-se-credit-evaluation.html`

**Testgenerering letar efter:**
- Path: `feature-goals/mortgage-credit-evaluation.html` ❌
- Storage: `docs/claude/mortgage-se-credit-evaluation.bpmn/{versionHash}/feature-goals/mortgage-credit-evaluation.html` ❌

**Korrekt sökväg för testgenerering:**
- Path: `feature-goals/mortgage-se-credit-evaluation.html` ✅
- Storage: `docs/claude/mortgage-se-credit-evaluation.bpmn/{versionHash}/feature-goals/mortgage-se-credit-evaluation.html` ✅

