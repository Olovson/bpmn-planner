# Uppdatering: Visuell ordning är primär sorteringsmetod

## Sammanfattning

Visuell ordning (DI-koordinater) är nu den primära sorteringsmetoden i appen. Alla noder med koordinater får nu `visualOrderIndex`, oavsett om de har `orderIndex` eller inte.

## Problem

Tidigare tilldelades `visualOrderIndex` endast till noder som **inte** hade `orderIndex`. Men sorteringsfunktionen `sortCallActivities()` prioriterar `visualOrderIndex` **före** `orderIndex`. Detta betydde att:

- Noder med `orderIndex` men utan `visualOrderIndex` fick `undefined` → `Number.MAX_SAFE_INTEGER`
- Dessa noder hamnade sist i sorteringen, även om de borde komma först enligt visuell ordning

## Lösning

Uppdaterat så att **ALLA noder med koordinater** får `visualOrderIndex`, oavsett om de har `orderIndex` eller inte.

### Ändrade filer

1. **`src/lib/bpmn/processGraphBuilder.ts`**
   - Ändrat från: `nodesWithoutOrder` (bara noder utan `orderIndex`)
   - Till: `nodesWithCoords` (alla noder med koordinater)
   - Alla noder med koordinater får nu `visualOrderIndex`

2. **`src/lib/bpmnProcessGraph.ts`**
   - Samma ändring: alla noder med koordinater får `visualOrderIndex`

3. **`src/lib/bpmn/buildProcessModel.ts`**
   - Samma ändring: alla noder med koordinater får `visualOrderIndex`

4. **`src/lib/ganttDataConverter.ts`**
   - Uppdaterat kommentar för att reflektera att `visualOrderIndex` är primär sorteringsmetod

## Var refaktoriseringen förgäves?

**NEJ!** Refaktoriseringen var inte förgäves av flera skäl:

### 1. Framtida flexibilitet

- `orderIndex` (från sequence flows) finns kvar och kan användas i framtiden
- När användaren sa "i framtiden kan vi ha ett alternativ" menar de att de kan välja mellan visuell ordning och exekveringsordning
- Refaktoriseringen ger oss en robust implementation av exekveringsordning som är redo att användas

### 2. Korrekt implementation

- Refaktoriseringen fixade buggen med intermediate events som inte inkluderades i sequence flow-grafen
- Detta är fortfarande viktigt för korrekt beräkning av `orderIndex`, även om vi inte använder det just nu
- Om vi i framtiden vill använda exekveringsordning, har vi en korrekt implementation

### 3. Konsoliderad kod

- Alla pipelines använder nu samma funktioner (`calculateOrderFromSequenceFlows`, `calculateVisualOrderFromCoordinates`)
- Detta gör koden mer underhållbar och konsekvent

## Nuvarande sorteringsprioritet

I `sortCallActivities()`:

1. **`visualOrderIndex`** (primär) - baserat på DI-koordinater (x, y)
2. **`orderIndex`** (sekundär) - baserat på sequence flows (för framtida användning)
3. **`branchId`** (tertiär) - för att särskilja branches
4. **`label`** (fallback) - alfabetisk sortering

## Resultat

Nu kommer alla noder att sorteras enligt deras visuella position i BPMN-diagrammet (DI-koordinater), vilket är vad användaren ser i bpmn.io och andra BPMN-visualiserare.

