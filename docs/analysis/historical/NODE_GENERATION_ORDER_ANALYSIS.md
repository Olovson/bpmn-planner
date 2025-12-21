# Analys: Genereringsordning vs Exekveringsordning

## Sammanfattning

Noder genereras i en **hierarkisk ordning** som prioriterar depth över exekveringsordning. Detta säkerställer att child nodes genereras före parent nodes (för dokumentationskontext), men betyder att exekveringsordningen inte alltid bevaras.

## Sorteringslogik

I `bpmnGenerators.ts` (rad 1712-1732) sorteras noder enligt:

1. **PRIMÄR**: `depth DESC` (högre depth först = leaf nodes före parent nodes)
2. **SEKUNDÄR**: `orderIndex ASC` (exekveringsordning från sequence flows) inom samma depth
3. **TERTIÄR**: Alfabetiskt för determinism

## När matchar genereringsordningen exekveringsordningen?

### ✅ Fall 1: Alla noder har samma depth

**Exempel: `mortgage-se-application.bpmn`**

- Process-noden: depth 1, orderIndex 0
- Alla andra noder: depth 0, orderIndex 2-16

**Resultat**: Genereringsordningen matchar exekveringsordningen eftersom alla depth 0 noder sorteras efter orderIndex.

```
Generation order:
1. mortgage-se-application (depth:1, orderIndex:0) ← Process genereras först
2. internal-data-gathering (depth:0, orderIndex:2)
3. object (depth:0, orderIndex:3)
4. stakeholders (depth:0, orderIndex:4)
...
```

### ✅ Fall 2: Olika depths, men högre depth-noder exekverar först

**Exempel: `mortgage-se-signing.bpmn`**

- Process-noden: depth 1, orderIndex 0 (exekverar först)
- Alla andra noder: depth 0, orderIndex 2-22

**Resultat**: Genereringsordningen matchar exekveringsordningen eftersom process-noden (depth 1) har lägst orderIndex.

```
Execution order:
1. mortgage-se-signing (depth:1, orderIndex:0) ← Exekverar först
2. upload-document (depth:0, orderIndex:2)
3. create-signing-order (depth:0, orderIndex:3)
...

Generation order (samma):
1. mortgage-se-signing (depth:1, orderIndex:0) ← Genereras först (högre depth)
2. upload-document (depth:0, orderIndex:2)
3. create-signing-order (depth:0, orderIndex:3)
...
```

## När matchar genereringsordningen INTE exekveringsordningen?

### ❌ Fall 3: Nod med högre depth har högre orderIndex än nod med lägre depth

**Teoretiskt exempel:**

Anta att vi har:
- Node A: depth 0, orderIndex 5 (exekverar tidigt)
- Node B: depth 1, orderIndex 10 (exekverar senare, men är parent)

**Exekveringsordning**: A (5) → B (10)

**Genereringsordning**: B (depth:1) → A (depth:0)

**Resultat**: Genereringsordningen matchar INTE exekveringsordningen eftersom depth är primär sorteringsnyckel.

```
Execution order:
1. Node A (depth:0, orderIndex:5) ← Exekverar först
2. Node B (depth:1, orderIndex:10) ← Exekverar senare

Generation order:
1. Node B (depth:1, orderIndex:10) ← Genereras först (högre depth)
2. Node A (depth:0, orderIndex:5) ← Genereras senare (lägre depth)
```

## Varför denna ordning?

### Fördelar

1. **Dokumentationskontext**: Child nodes genereras före parent nodes, så parent-dokumentation kan referera till child-dokumentation
2. **Hierarkisk struktur**: Matchar den logiska hierarkin i BPMN-processen
3. **Determinism**: Samma ordning varje gång (alfabetisk fallback)

### Nackdelar

1. **Exekveringsordning**: Bevaras endast inom samma depth-nivå
2. **Intuitivitet**: Kan vara förvirrande om man förväntar sig exekveringsordning

## Praktiska exempel

### Exempel 1: `mortgage-se-application.bpmn`

**Struktur:**
- Process (depth 1)
  - CallActivities (depth 0)
  - Tasks (depth 0)

**Resultat**: ✅ Matchar eftersom process exekverar först (orderIndex 0)

### Exempel 2: `mortgage-se-signing.bpmn`

**Struktur:**
- Process (depth 1, orderIndex 0)
- Embedded subProcesses behandlas som callActivities (depth 0)
- Tasks (depth 0)

**Resultat**: ✅ Matchar eftersom process exekverar först

### Exempel 3: Teoretiskt fall med mismatch

**Struktur:**
- Task A (depth 0, orderIndex 5) - exekverar tidigt
- CallActivity B (depth 1, orderIndex 10) - exekverar senare, har children

**Resultat**: ❌ Matchar INTE - CallActivity B genereras före Task A trots att den exekverar senare

## Slutsats

**Genereringsordningen följer INTE alltid exekveringsordningen i BPMN-filerna.**

- Om alla noder har samma depth → ✅ Matchar
- Om noder har olika depths → ❌ Matchar endast om högre depth-noder exekverar först
- Exekveringsordning (orderIndex) respekteras endast **inom samma depth-nivå**

Detta är **medvetet designat** - den hierarkiska strukturen är viktigare för dokumentation än den exakta exekveringssekvensen.
