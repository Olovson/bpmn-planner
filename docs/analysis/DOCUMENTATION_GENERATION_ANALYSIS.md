# Analys: Dokumentationsgenerering för Mortgage → Application → Internal Data Gathering

## Datum: 2025-12-27

## Scenario

**Uppladdade filer:**
1. `mortgage.bpmn` (root)
2. `mortgage-se-application.bpmn` (subprocess)
3. `mortgage-se-internal-data-gathering.bpmn` (subprocess av application)

**Förväntning:**
- Feature Goal dokument för callActivities där subprocess-filen finns
- Epic dokument för alla tasks/epics i de uppladdade filerna
- INTE Feature Goal dokument för callActivities där subprocess-filen INTE finns

---

## Hur Systemet Fungerar Nu

### 1. Filtrering av Noder (bpmnGenerators.ts, rad 1524-1563)

**För callActivities:**
```typescript
if (node.type === 'callActivity') {
  const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
  
  // VIKTIGT: Om subprocess-filen saknas, hoppa över callActivity
  if (node.missingDefinition) {
    return false; // Hoppa över - subprocess-filen saknas
  }
  
  // Verifiera att subprocess-filen finns i existingBpmnFiles
  if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
    return false; // Hoppa över - subprocess-filen finns inte
  }
  
  return callActivityFileIncluded;
}
```

**Resultat:**
- ✅ CallActivity genereras ENDAST om:
  1. CallActivity-filen är med i `analyzedFiles`
  2. Subprocess-filen finns (`missingDefinition = false`)
  3. Subprocess-filen finns i `existingBpmnFiles`

**För tasks/epics:**
```typescript
// För tasks/epics: inkludera bara om filen är med i analyzedFiles
return analyzedFiles.includes(node.bpmnFile);
```

**Resultat:**
- ✅ Tasks/epics genereras för alla filer i `analyzedFiles`

---

## Vad som BORDE Genereras (Enligt Nuvarande Logik)

### Scenario: mortgage.bpmn → application → internal-data-gathering

**Antaganden:**
- `mortgage.bpmn` har callActivity "application" → pekar på `mortgage-se-application.bpmn` ✅
- `mortgage-se-application.bpmn` har:
  - callActivity "internal-data-gathering" → pekar på `mortgage-se-internal-data-gathering.bpmn` ✅
  - callActivity "stakeholder" → pekar på `mortgage-se-stakeholder.bpmn` ❌ (INTE uppladdad)
  - callActivity "object" → pekar på `mortgage-se-object.bpmn` ❌ (INTE uppladdad)
  - callActivity "household" → pekar på `mortgage-se-household.bpmn` ❌ (INTE uppladdad)
  - X UserTasks → X Epics
  - Y ServiceTasks → Y Epics
  - Z BusinessRuleTasks → Z Epics
- `mortgage-se-internal-data-gathering.bpmn` har:
  - A UserTasks → A Epics
  - B ServiceTasks → B Epics
  - C BusinessRuleTasks → C Epics

### Dokumentation som BORDE Genereras:

#### 1. Feature Goals (CallActivities)

**✅ SKA genereras:**
- Feature Goal för "application" callActivity i `mortgage.bpmn`
  - Fil: `feature-goals/mortgage-application.html` (eller hierarchical naming)
  - Anledning: Subprocess-filen `mortgage-se-application.bpmn` finns

- Feature Goal för "internal-data-gathering" callActivity i `mortgage-se-application.bpmn`
  - Fil: `feature-goals/mortgage-se-application-internal-data-gathering.html`
  - Anledning: Subprocess-filen `mortgage-se-internal-data-gathering.bpmn` finns

**❌ SKA INTE genereras:**
- Feature Goal för "stakeholder" callActivity i `mortgage-se-application.bpmn`
  - Anledning: Subprocess-filen `mortgage-se-stakeholder.bpmn` finns INTE
  - Systemet hoppar över den (rad 1536-1544)

- Feature Goal för "object" callActivity i `mortgage-se-application.bpmn`
  - Anledning: Subprocess-filen `mortgage-se-object.bpmn` finns INTE

- Feature Goal för "household" callActivity i `mortgage-se-application.bpmn`
  - Anledning: Subprocess-filen `mortgage-se-household.bpmn` finns INTE

#### 2. Epics (Tasks)

**✅ SKA genereras:**
- Epic för varje UserTask i `mortgage.bpmn`
  - Fil: `nodes/mortgage/{userTaskId}.html`
  
- Epic för varje ServiceTask i `mortgage.bpmn`
  - Fil: `nodes/mortgage/{serviceTaskId}.html`
  
- Epic för varje BusinessRuleTask i `mortgage.bpmn`
  - Fil: `nodes/mortgage/{businessRuleTaskId}.html`

- Epic för varje UserTask i `mortgage-se-application.bpmn`
  - Fil: `nodes/mortgage-se-application/{userTaskId}.html`
  
- Epic för varje ServiceTask i `mortgage-se-application.bpmn`
  - Fil: `nodes/mortgage-se-application/{serviceTaskId}.html`
  
- Epic för varje BusinessRuleTask i `mortgage-se-application.bpmn`
  - Fil: `nodes/mortgage-se-application/{businessRuleTaskId}.html`

- Epic för varje UserTask i `mortgage-se-internal-data-gathering.bpmn`
  - Fil: `nodes/mortgage-se-internal-data-gathering/{userTaskId}.html`
  
- Epic för varje ServiceTask i `mortgage-se-internal-data-gathering.bpmn`
  - Fil: `nodes/mortgage-se-internal-data-gathering/{serviceTaskId}.html`
  
- Epic för varje BusinessRuleTask i `mortgage-se-internal-data-gathering.bpmn`
  - Fil: `nodes/mortgage-se-internal-data-gathering/{businessRuleTaskId}.html`

#### 3. Process Feature Goals (Process-noder)

**✅ SKA genereras:**
- Process Feature Goal för `mortgage-se-application.bpmn` (process-noden)
  - Fil: `feature-goals/mortgage-se-application.html`
  - Anledning: Process-noden i subprocess-filen genererar separat Feature Goal

- Process Feature Goal för `mortgage-se-internal-data-gathering.bpmn` (process-noden)
  - Fil: `feature-goals/mortgage-se-internal-data-gathering.html`
  - Anledning: Process-noden i subprocess-filen genererar separat Feature Goal

**❓ Oklart:**
- Process Feature Goal för `mortgage.bpmn` (root-processen)
  - Detta beror på om root-processen genererar process Feature Goal eller inte

---

## Sammanfattning: Förväntat Antal Dokument

### Feature Goals (CallActivities):
- **2 st** (application + internal-data-gathering)
- **INTE** för stakeholder, object, household (subprocess-filer saknas)

### Epics (Tasks):
- **Alla tasks/epics** i de 3 uppladdade filerna
- Beror på antal tasks i varje fil

### Process Feature Goals:
- **2 st** (application + internal-data-gathering process-noder)
- **Möjligen 1** för mortgage root-processen (beroende på implementation)

---

## Kända Problem / Oklarheter

### 1. Process Feature Goals vs CallActivity Feature Goals

**Fråga:** Genereras Process Feature Goals för alla subprocess-filer, eller bara för vissa?

**Nuvarande logik:**
- Process Feature Goals genereras för process-noder i subprocess-filer
- Detta är SEPARAT från callActivity Feature Goals
- Se `DOCUMENTATION_COVERAGE_COUNTING_RULES.md` rad 45-52

**Rekommendation:** Verifiera om Process Feature Goals faktiskt genereras för alla subprocess-filer.

### 2. Hierarchical Naming för Feature Goals

**Fråga:** Används hierarchical naming (`mortgage-se-application-internal-data-gathering.html`) eller subprocess-based naming (`mortgage-se-internal-data-gathering.html`)?

**Nuvarande logik:**
- Feature Goals kan använda både hierarchical naming (parent-elementId) och subprocess-based naming
- Se `useFileGeneration.ts` rad 1072-1096

**Rekommendation:** Verifiera vilket naming-schema som faktiskt används.

### 3. Epic Dokumentation för Tasks i Subprocesser

**Fråga:** Genereras Epic dokumentation för tasks i subprocesser även om subprocessen inte är direkt uppladdad?

**Nuvarande logik:**
- Epics genereras för alla tasks i filer som är med i `analyzedFiles`
- Om `analyzedFiles` inkluderar alla filer i hierarkin (inklusive subprocesser), genereras epics för alla

**Rekommendation:** Verifiera vad `analyzedFiles` faktiskt innehåller när man genererar från root.

---

## Rekommendationer för Validering

### 1. Testa Med Faktiska Filer

**Steg:**
1. Ladda upp endast de 3 filerna (mortgage, application, internal-data-gathering)
2. Generera dokumentation
3. Räkna faktiskt antal genererade dokument:
   - Feature Goals (callActivities)
   - Epics (tasks)
   - Process Feature Goals

### 2. Jämför Med Förväntat

**Steg:**
1. Analysera BPMN-filerna för att räkna:
   - Antal callActivities i varje fil
   - Antal tasks/epics i varje fil
   - Vilka callActivities har matchade subprocess-filer
2. Jämför med faktiskt genererade dokument

### 3. Verifiera Logik

**Steg:**
1. Kontrollera att callActivities med saknade subprocess-filer INTE genererar Feature Goals
2. Kontrollera att alla tasks/epics i uppladdade filer genererar Epic dokumentation
3. Kontrollera att Process Feature Goals genereras korrekt

---

## Slutsats

**Enligt nuvarande logik BORDE systemet:**
- ✅ Generera Feature Goals ENDAST för callActivities där subprocess-filen finns
- ✅ Generera Epic dokumentation för alla tasks/epics i uppladdade filer
- ✅ Generera Process Feature Goals för subprocess-filer

**Om detta INTE fungerar:**
- Det kan vara ett problem med:
  1. `analyzedFiles` inkluderar för många/för få filer
  2. `missingDefinition` flaggan sätts fel
  3. `existingBpmnFiles` innehåller felaktiga filer
  4. Process Feature Goals genereras inte korrekt

**Nästa steg:**
- Testa med faktiska filer och verifiera att logiken fungerar som förväntat

