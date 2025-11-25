# Analys: Många noder saknar planerade scenarion

## Problem

Efter lokal generering saknar många noder (de flesta) planerade scenarion i databasen, trots att bas-scenarion borde skapas automatiskt.

## Nuvarande Implementation

### Bas-scenarion skapas i `bpmnGenerators.ts` (rad 1415-1475)

1. **När**: När dokumentation genereras med `generateAllFromBpmnWithGraph()`
2. **Vad**: Skapar "Happy path"-scenarion för alla testbara noder
3. **Provider**: `'local-fallback'`
4. **Origin**: `'design'`

### Process

```typescript
const testableNodes = getTestableNodes(graph); // Hämtar från BpmnProcessGraph
for (const node of testableNodes) {
  // Skapar scenario och lägger till i rows
  rows.push({
    bpmn_file: node.bpmnFile,
    bpmn_element_id: node.bpmnElementId,
    provider: 'local-fallback',
    origin: 'design',
    scenarios: [...],
  });
}
await supabase.from('node_planned_scenarios').upsert(rows, {...});
```

## Möjliga Orsaker

### 1. Graf vs ProcessTree - Filnamn-matchning

- **Graf**: Använder `BpmnProcessGraph` som byggs från BPMN-filer
- **ProcessTree**: Använder `ProcessTree` som byggs från samma filer men kan ha annorlunda struktur
- **Matchning**: Använder `${bpmnFile}::${elementId}` som nyckel

**Problem**: Om filnamn eller elementId skiljer sig mellan graf och ProcessTree, matchar de inte.

### 2. Noder saknar bpmnFile eller bpmnElementId

- Om noder i grafen saknar `bpmnFile` eller `bpmnElementId`, hoppas de över
- Detta loggas nu med varningar

### 3. Upsert misslyckas tyst

- Tidigare: Endast `console.warn` vid fel
- Nu: Förbättrad error-handling och logging

### 4. Generering kördes inte för alla filer

- Om generering bara kördes för root-filen, kan många noder saknas
- Bas-scenarion skapas bara för noder i grafen när generering körs

## Förbättringar Implementerade

1. **Förbättrad error-handling**:
   - Loggar faktiska fel från Supabase
   - Visar antal rader som försöktes sparas
   - Visar antal testbara noder

2. **Bättre logging**:
   - Varnar när noder saknar bpmnFile eller bpmnElementId
   - Varnar vid duplicerade nycklar
   - Loggar framgångsrika sparningar

## Nästa Steg

1. **Kör generering igen** och kolla konsolen för:
   - Hur många noder som hittades
   - Hur många rader som skapades
   - Om det finns fel vid upsert
   - Om noder hoppas över och varför

2. **Verifiera matchning**:
   - Kontrollera om filnamn matchar mellan graf och ProcessTree
   - Kontrollera om elementId matchar

3. **Manuell fix** (om nödvändigt):
   - Skapa en funktion som kan skapa bas-scenarion för alla noder i ProcessTree
   - Kör denna funktion för att säkerställa att alla noder har scenarion

