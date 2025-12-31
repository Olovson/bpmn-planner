# Analys: Subprocess Först, Sedan Parent

## Scenario

1. **Steg 1:** Användaren laddar upp och genererar dokumentation för "internal data gathering" (subprocess) isolerat
2. **Steg 2:** Användaren laddar upp "application" (parent) och genererar dokumentation

## Vad som genereras i Steg 1

När "internal data gathering" laddas upp isolerat:
- ✅ Epic-dokumentation för alla tasks/epics i filen
- ✅ File-level documentation: `mortgage-se-internal-data-gathering.html`
- ❌ INGEN Feature Goal genereras (subprocess-filer genererar inte Feature Goals när de laddas upp isolerat)

**Storage paths:**
- Epic docs: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/nodes/mortgage-se-internal-data-gathering/{elementId}.html`
- File-level doc: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/mortgage-se-internal-data-gathering.html`

## Vad som genereras i Steg 2

När "application" laddas upp senare:
- ✅ Epic-dokumentation för alla tasks/epics i application-filen
- ✅ File-level documentation: `mortgage-se-application.html`
- ✅ CallActivity Feature Goal för "internal-data-gathering" callActivity

**Storage paths:**
- Epic docs: `docs/claude/mortgage-se-application.bpmn/{versionHash}/nodes/mortgage-se-application/{elementId}.html`
- File-level doc: `docs/claude/mortgage-se-application.bpmn/{versionHash}/mortgage-se-application.html`
- Feature Goal: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{versionHash}/feature-goals/mortgage-se-application-internal-data-gathering.html`

## Kritiska Punkter

### 1. Child Documentation för CallActivity Feature Goal

**Kod-location:** `bpmnGenerators.ts` rad 2308-2324

När systemet genererar CallActivity Feature Goal för "internal-data-gathering" callActivity i application:
- Systemet försöker samla child documentation från subprocess-filen
- Det letar efter epic-dokumentation för noder i subprocess-filen: `graph.fileNodes.get(node.subprocessFile)`
- Det letar i `generatedChildDocs` med key: `${subprocessNode.bpmnFile}::${subprocessNode.bpmnElementId}`

**Problem:**
- Om "internal data gathering" INTE är med i `analyzedFiles` när "application" genereras, finns inga epic-docs i `generatedChildDocs`
- Systemet försöker ladda från Storage via `loadChildDocFromStorage`, men det letar efter epic-docs (nodes/...), inte file-level documentation
- File-level documentation innehåller information om alla noder, men systemet använder den inte som child docs

### 2. skipDocGeneration Logik

**Kod-location:** `bpmnGenerators.ts` rad 2123-2125

```typescript
const skipDocGeneration = node.type === 'callActivity'
  ? false // För callActivities: generera alltid (instans-specifik Feature Goal)
  : alreadyProcessedGlobally; // För tasks/epics: hoppa över om redan processad
```

**Problem:**
- `skipDocGeneration` för callActivities är alltid `false`, så systemet genererar alltid Feature Goal
- Men `skipDocGeneration` används också för att avgöra om subprocess redan genererat Feature Goal (rad 2457)
- När subprocess laddas upp isolerat genereras INTE Feature Goal, bara file-level documentation
- Så `skipDocGeneration` kan vara `false` även om subprocess redan har dokumentation

### 3. Storage Check för Child Docs

**Kod-location:** `bpmnGenerators.ts` rad 2235-2253

När epic-dokumentation redan finns i Storage:
- Systemet försöker ladda via `loadChildDocFromStorage`
- Denna funktion letar efter epic-docs (nodes/...), inte file-level documentation
- Om epic-docs finns i Storage men inte i `generatedChildDocs`, laddas de korrekt
- Men om bara file-level documentation finns, hittas den inte

## Potentiella Problem

### Problem 1: Child Docs Saknas i Feature Goal

**Symptom:**
- CallActivity Feature Goal genereras utan child documentation
- Feature Goal innehåller bara information om callActivity själv, inte om noder i subprocess-filen

**Orsak:**
- Subprocess-filen är inte med i `analyzedFiles` när parent genereras
- Epic-docs finns i Storage men laddas inte in i `generatedChildDocs`
- `loadChildDocFromStorage` hittar epic-docs om de finns, men om de saknas används inte file-level documentation

**Lösning:**
- Systemet borde ladda epic-docs från Storage när subprocess-filen inte är med i `analyzedFiles`
- Alternativt: Använd file-level documentation som fallback om epic-docs saknas

### Problem 2: Feature Goal Genereras Även Om Subprocess Redan Har Dokumentation

**Symptom:**
- Feature Goal genereras även om subprocess redan har file-level documentation
- Detta är korrekt beteende (instans-specifik dokumentation), men kan vara förvirrande

**Orsak:**
- `skipDocGeneration` är alltid `false` för callActivities
- Systemet genererar alltid Feature Goal för callActivities, även om subprocess redan har dokumentation

**Lösning:**
- Detta är faktiskt korrekt beteende - Feature Goals är instans-specifika och ska genereras även om subprocess redan har dokumentation

### Problem 3: Sökvägar Matchar Inte

**Symptom:**
- Feature Goal sparas under subprocess-filens version hash
- Men när systemet letar efter child docs, använder den parent-filens version hash

**Orsak:**
- Feature Goal sparas som: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{subprocessVersionHash}/feature-goals/...`
- Child docs letas efter som: `docs/claude/mortgage-se-internal-data-gathering.bpmn/{subprocessVersionHash}/nodes/...`
- Så sökvägar borde matcha korrekt

## Rekommendationer

### 1. Förbättra Child Docs Loading

När subprocess-filen inte är med i `analyzedFiles`, borde systemet:
1. Försöka ladda epic-docs från Storage för alla noder i subprocess-filen
2. Om epic-docs saknas, använd file-level documentation som fallback
3. Extrahera information från file-level documentation för att skapa child docs

### 2. Förbättra skipDocGeneration Logik

För callActivities, borde systemet:
1. Kolla om subprocess-filen redan har dokumentation i Storage
2. Om ja, använd `skipDocGeneration = true` för att indikera att subprocess redan genererat dokumentation
3. Men generera ändå instans-specifik Feature Goal (detta är korrekt)

### 3. Lägg Till File-Level Documentation Som Fallback

När epic-docs saknas för noder i subprocess-filen:
1. Ladda file-level documentation från Storage
2. Extrahera information om noder från file-level documentation
3. Använd denna information som child docs för Feature Goal

## Status

**Aktuell Status:** ⚠️ POTENTIELLA PROBLEM

Systemet borde fungera korrekt i de flesta fall, men det finns risk för:
- Feature Goals utan child documentation om epic-docs saknas i Storage
- Förvirring om Feature Goal genereras även om subprocess redan har dokumentation

**Rekommendation:** Testa scenariot och validera att:
1. Feature Goal genereras korrekt med child documentation
2. Sökvägar matchar korrekt
3. Dokumentation sparas och läses korrekt




