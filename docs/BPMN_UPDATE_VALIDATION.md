# Validering av BPMN-uppdateringsprocess

## Översikt

Detta dokument analyserar vad som fungerar bra och vad som kan vara problematiskt när nya BPMN-filer med smärre justeringar kommer in.

## ✅ Vad som fungerar bra (Automatiskt)

### 1. BPMN-parsing och Process Tree
- ✅ **Fungerar perfekt**: Process tree uppdateras automatiskt när BPMN-filer ändras
- ✅ **Ingen manuell åtgärd krävs**: Systemet läser BPMN-filer direkt

### 2. Valideringssystem (`/e2e-quality-validation`)
- ✅ **Identifierar nya tasks**: Systemet hittar automatiskt ServiceTasks/UserTasks/BusinessRuleTasks som saknas i dokumentationen
- ✅ **Ger exempel-kod**: Kopiera-knappar gör det enkelt att lägga till saknade tasks
- ✅ **Identifierar saknade mocks**: Systemet hittar API-anrop som saknar mocks
- ✅ **Identifierar saknade fält**: Systemet jämför mock-responser med `backendState`

### 3. Feature Goal HTML-filer
- ✅ **Automatisk identifiering**: `analyze-feature-goal-sync.ts` identifierar ändringar
- ✅ **Automatisk uppdatering**: `auto-update-feature-goal-docs.ts` lägger till saknade aktiviteter
- ✅ **Status-lista**: `generate-feature-goal-status.ts` genererar status-lista

### 4. Test Coverage-visualisering
- ✅ **Automatisk visualisering**: Nya subprocesser/tasks visas automatiskt i trädet
- ✅ **Struktur uppdateras**: BPMN-struktur syns direkt

## ⚠️ Potentiella problem och begränsningar

### 1. Task-ID ändringar (KRITISKT)

**Problem:**
- Om ett task-ID ändras i BPMN (t.ex. `fetch-party-information` → `fetch-party-data`), identifieras detta **INTE** automatiskt
- Valideringen ser bara att det finns ett nytt task med nytt ID, inte att det gamla ID:t har ändrats
- Detta kan leda till:
  - Duplicerade entries i `bankProjectTestSteps` (gammalt ID + nytt ID)
  - Gamla entries som refererar till tasks som inte längre finns

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Jämför gamla och nya BPMN-filer för att identifiera ID-ändringar
- 💡 **Förslag**: Skapa ett script som jämför task-ID:n mellan versioner och flaggar ändringar

**Exempel:**
```typescript
// Före: bankProjectTestSteps har
{ bpmnNodeId: 'fetch-party-information', ... }

// Efter: BPMN har ändrat ID till 'fetch-party-data'
// Valideringen ser: "Nytt task 'fetch-party-data' saknas"
// Men identifierar INTE att 'fetch-party-information' inte längre finns
```

### 2. CallActivity-ID ändringar (KRITISKT)

**Problem:**
- Om ett callActivity-ID ändras (t.ex. `application` → `mortgage-application`), identifieras detta **INTE** automatiskt
- `subprocessSteps` kan ha fel `callActivityId` som refererar till ett ID som inte längre finns
- Detta kan leda till:
  - Test Coverage-sidan visar inte test-information för den uppdaterade callActivity
  - Valideringen kan missa att callActivity har ändrats

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Jämför callActivity-ID:n mellan versioner
- 💡 **Förslag**: Valideringssystemet bör också identifiera callActivities som finns i `subprocessSteps` men inte i BPMN

**Exempel:**
```typescript
// Före: subprocessSteps har
{ callActivityId: 'application', bpmnFile: 'mortgage-se-application.bpmn', ... }

// Efter: BPMN har ändrat callActivity ID till 'mortgage-application'
// Valideringen identifierar INTE detta
// Test Coverage-sidan kan visa fel information eller ingen information
```

### 3. Task-namn ändringar (MEDEL)

**Problem:**
- Om ett task-namn ändras men ID:t är samma (t.ex. `bpmnNodeName: 'Fetch Party'` → `'Fetch Party Information'`), identifieras detta **INTE** automatiskt
- Dokumentationen kan ha föråldrade namn
- Detta är mindre kritiskt men kan skapa förvirring

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Jämför task-namn mellan versioner
- 💡 **Förslag**: Valideringssystemet bör också jämföra task-namn och flagga skillnader

### 4. Borttagna tasks (MEDEL)

**Problem:**
- Om en task tas bort från BPMN, identifieras detta **INTE** automatiskt
- `bankProjectTestSteps` kan innehålla entries för tasks som inte längre finns
- Detta kan leda till:
  - Förvirring om vilka tasks som faktiskt finns
  - Test scripts som försöker testa tasks som inte längre finns

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Jämför tasks mellan versioner
- 💡 **Förslag**: Valideringssystemet bör också identifiera tasks som finns i `bankProjectTestSteps` men inte i BPMN

**Exempel:**
```typescript
// Före: bankProjectTestSteps har
{ bpmnNodeId: 'old-task', ... }

// Efter: BPMN har tagit bort 'old-task'
// Valideringen identifierar INTE detta
// bankProjectTestSteps innehåller fortfarande entry för borttagen task
```

### 5. Processflöde-ändringar (MEDEL)

**Problem:**
- Om processflöde ändras (gateways, sequence flows, conditions), identifieras detta **INTE** automatiskt
- Test scenarios kan ha felaktiga flöden
- Detta kan leda till:
  - Test scenarios som inte matchar det faktiska processflödet
  - Felaktiga Given/When/Then beskrivningar

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Jämför processflöde mellan versioner
- 💡 **Förslag**: Skapa ett script som jämför processflöde och flaggar ändringar

### 6. BPMN-filnamn ändringar (KRITISKT)

**Problem:**
- Om en BPMN-fil byter namn (t.ex. `mortgage-se-application.bpmn` → `mortgage-application.bpmn`), kan detta skapa problem med:
  - `subprocessSteps.bpmnFile` referenser
  - Feature Goal HTML-filer
  - BPMN-map.json mapping

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Uppdatera alla referenser manuellt
- 💡 **Förslag**: Skapa ett script som identifierar och uppdaterar alla referenser

### 7. CallActivities flyttas mellan processer (KRITISKT)

**Problem:**
- Om en callActivity flyttas från en process till en annan, kan detta skapa problem med:
  - `subprocessSteps.bpmnFile` referenser
  - Feature Goal HTML-filer som refererar till fel process

**Lösning:**
- ⚠️ **Manuell kontroll krävs**: Uppdatera alla referenser manuellt
- 💡 **Förslag**: Valideringssystemet bör också identifiera callActivities som finns i `subprocessSteps` men inte i rätt BPMN-fil

## 🔧 Implementerade förbättringar

### 1. ✅ Script för att jämföra BPMN-versioner

**Implementerat:** `scripts/compare-bpmn-versions.ts` (förbättrat)

**Användning:**
```bash
# Jämför senaste två archive-mapparna automatiskt
npx tsx scripts/compare-bpmn-versions.ts

# Eller ange specifika mappar
npx tsx scripts/compare-bpmn-versions.ts [gamla-mappen] [nya-mappen]
```

**Detta script är en given startpunkt för den manuella arbetsprocessen.**

**Vad scriptet identifierar:**
- ✅ Ändrade task-ID:n (omnamngivna tasks)
- ✅ Ändrade callActivity-ID:n (omnamngivna callActivities)
- ✅ Borttagna tasks
- ✅ Borttagna callActivities
- ✅ Ändrade task-namn (samma ID, annat namn)
- ✅ Nya tasks/callActivities
- ✅ Nya/borttagna filer

**Output:**
- Genererar `bpmn-changes-report.md` i nya archive-mappen
- Visar exakt vad som behöver uppdateras med förslag på åtgärder

### 2. ✅ Förbättrat valideringssystemet

**Implementerat:** Förbättringar i `/e2e-quality-validation`

**Nya funktioner:**
- ✅ Identifierar tasks som finns i `bankProjectTestSteps` men inte i BPMN (borttagna tasks)
- ✅ Identifierar callActivities som finns i `subprocessSteps` men inte i BPMN (borttagna callActivities)
- ✅ Identifierar saknade callActivities (finns i BPMN men inte i dokumentationen)
- ✅ Visar warnings för borttagna tasks/callActivities med förslag på åtgärder

### 3. Skapa migration-script

**Förslag:**
```typescript
// scripts/migrate-bpmn-changes.ts
// Automatiskt uppdatera:
// - bankProjectTestSteps när task-ID ändras
// - subprocessSteps när callActivity-ID ändras
// - Ta bort entries för borttagna tasks/callActivities
```

## 📋 Checklista vid BPMN-uppdatering

### Steg 1: Identifiera ändringar
- [ ] Kör `analyze-feature-goal-sync.ts` för Feature Goals
- [ ] **NYTT**: Kör `compare-bpmn-versions.ts` för att identifiera alla ändringar (given startpunkt)
- [ ] Kör valideringssystemet på `/e2e-quality-validation` för E2E scenarios
- [ ] Granska `bpmn-changes-report.md` för detaljerad analys

### Steg 2: Uppdatera dokumentation
- [ ] Uppdatera Feature Goal HTML-filer (automatiskt via scripts)
- [ ] Uppdatera E2E test scenarios (`E2eTestsOverviewPage.tsx`)
  - [ ] Lägg till nya tasks (använd valideringssystemet med kopiera-knappar)
  - [ ] **NYTT**: Uppdatera ändrade task-ID:n (se `bpmn-changes-report.md`)
  - [ ] **NYTT**: Ta bort borttagna tasks (valideringssystemet visar warnings)
  - [ ] **NYTT**: Uppdatera ändrade callActivity-ID:n (se `bpmn-changes-report.md`)
  - [ ] **NYTT**: Ta bort borttagna callActivities (valideringssystemet visar warnings)
- [ ] Uppdatera mocks (`mortgageE2eMocks.ts`)
- [ ] Uppdatera test scripts om processflöde ändrats

### Steg 3: Verifiera
- [ ] Kör validering igen på `/e2e-quality-validation`
- [ ] Kontrollera Test Coverage-sidan (`/test-coverage`)
- [ ] Testa att Feature Goal HTML-filer fungerar
- [ ] **NYTT**: Verifiera att inga gamla task-ID:n finns kvar

## 🎯 Sammanfattning

### Vad som fungerar perfekt:
- ✅ Automatisk identifiering av nya tasks
- ✅ Automatisk uppdatering av Feature Goal HTML-filer
- ✅ Automatisk visualisering av BPMN-struktur
- ✅ Valideringssystemet med kopiera-knappar

### Vad som är förbättrat:
- ✅ Identifiering av ändrade task-ID:n (via `compare-bpmn-versions.ts` - förbättrat)
- ✅ Identifiering av ändrade callActivity-ID:n (via `compare-bpmn-versions.ts` - förbättrat)
- ✅ Identifiering av borttagna tasks/callActivities (via valideringssystemet och `compare-bpmn-versions.ts`)
- ⚠️ Identifiering av processflöde-ändringar (kräver manuell kontroll)
- ⚠️ Automatisk migration vid ID-ändringar (kräver manuell uppdatering, men scriptet visar exakt vad som behöver ändras)

### Rekommendation:
**För smärre justeringar** (nya tasks, små ändringar i processflöde) fungerar systemet bra. **För större ändringar** (ID-ändringar, borttagna tasks, filnamn-ändringar) krävs manuell kontroll och uppdatering.

**Nästa steg:** Överväg att implementera förbättringarna ovan för att göra processen mer robust.

