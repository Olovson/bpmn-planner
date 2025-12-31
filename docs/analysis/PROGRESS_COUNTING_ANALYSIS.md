# Analys: Progress-räkning för Process Feature Goals

## Problem
Progress-räknaren visar 26 noder, men användaren förväntar sig färre. Frågan är om vi räknar Process Feature Goals för subprocess-filer som inte är uppladdade (t.ex. "Stakeholder" i application-filen).

## Nuvarande Logik

### 1. `analyzedFiles` Bestäms
```typescript
const analyzedFiles = useHierarchy 
  ? summary.filesIncluded  // Alla filer i hierarkin
  : [bpmnFileName];        // Bara root-filen
```

**Problem**: `summary.filesIncluded` inkluderar ALLA filer som hittas i grafen, även om de inte är uppladdade.

### 2. `processNodesToGenerate` Räknas
```typescript
let processNodesToGenerate = 0;
for (const file of analyzedFiles) {
  const hasCallActivityPointingToFile = Array.from(testableNodes.values()).some(
    node => node.type === 'callActivity' && node.subprocessFile === file
  );
  const processNodeForFile = Array.from(graph.allNodes.values()).find(
    node => node.type === 'process' && node.bpmnFile === file
  );
  const isSubprocessFile = (hasCallActivityPointingToFile || !!processNodeForFile) && !isRootProcessFromMap;
  
  if (isSubprocessFile && processNodeForFile && processNodeForFile.type === 'process') {
    processNodesToGenerate++;
  }
}
```

**Problem**: Denna logik räknar Process Feature Goals för ALLA filer i `analyzedFiles`, även om filen inte är uppladdad.

### 3. Process Feature Goal Genereras
```typescript
const shouldGenerateProcessFeatureGoal = isSubprocessFileForRoot && 
  !!processNodeForFileForRoot && 
  processNodeForFileForRoot.type === 'process';
```

**OBS**: Denna logik kollar INTE om filen faktiskt finns i `existingBpmnFiles` eller om den har en process node i grafen.

## Scenario: "Stakeholder" Subprocess

### Situation
- `mortgage-se-application.bpmn` innehåller CallActivity "Stakeholder"
- CallActivity refererar till `mortgage-se-stakeholder.bpmn`
- `mortgage-se-stakeholder.bpmn` är **INTE** uppladdad
- Men grafen inkluderar referensen till filen

### Vad Händer

1. **`analyzedFiles` inkluderar `mortgage-se-stakeholder.bpmn`?**
   - Om `useHierarchy=true`: JA (om filen hittas i grafen)
   - Om `useHierarchy=false`: NEJ (bara root-filen)

2. **`processNodesToGenerate` räknar Process Feature Goal för `mortgage-se-stakeholder.bpmn`?**
   - Om filen är i `analyzedFiles`: JA
   - Men filen saknas i `existingBpmnFiles`, så Process Feature Goal genereras INTE faktiskt

3. **Process Feature Goal genereras för `mortgage-se-stakeholder.bpmn`?**
   - NEJ, eftersom filen saknas i `existingBpmnFiles`
   - Men progress-räknaren har redan räknat den!

## Problem: Progress-räknaren Räknar Fler Noder Än Som Faktiskt Genereras

### Orsak
`processNodesToGenerate` räknar baserat på `analyzedFiles`, men Process Feature Goal-genereringen kollar faktiskt om filen finns i `existingBpmnFiles` eller om den har en process node i grafen.

### Lösning
`processNodesToGenerate` måste filtrera bort filer som:
1. INTE finns i `existingBpmnFiles`, ELLER
2. INTE har en process node i grafen (eller process node saknas)

## Rekommendation

### Fix 1: Filtrera `analyzedFiles` mot `existingBpmnFiles`
```typescript
// Filtrera bort filer som inte finns i existingBpmnFiles
const validAnalyzedFiles = analyzedFiles.filter(file => 
  existingBpmnFiles.includes(file)
);

// Använd validAnalyzedFiles för processNodesToGenerate
for (const file of validAnalyzedFiles) {
  // ... räkna Process Feature Goals
}
```

### Fix 2: Kolla om process node faktiskt finns
```typescript
for (const file of analyzedFiles) {
  // Kolla om filen finns i existingBpmnFiles
  if (!existingBpmnFiles.includes(file)) {
    continue; // Hoppa över filer som inte är uppladdade
  }
  
  const processNodeForFile = Array.from(graph.allNodes.values()).find(
    node => node.type === 'process' && node.bpmnFile === file
  );
  
  // Kolla om process node faktiskt finns
  if (!processNodeForFile || processNodeForFile.type !== 'process') {
    continue; // Hoppa över filer utan process node
  }
  
  // ... räkna Process Feature Goal
}
```

## Slutsats

**JA, vi räknar Process Feature Goals för subprocess-filer som inte är uppladdade.**

**Orsak**: `processNodesToGenerate` räknar baserat på `analyzedFiles` (som kan inkludera saknade filer), men Process Feature Goal-genereringen kollar faktiskt om filen finns.

**Lösning**: Filtrera `analyzedFiles` mot `existingBpmnFiles` innan räkning, eller lägg till samma check i räkningslogiken.

