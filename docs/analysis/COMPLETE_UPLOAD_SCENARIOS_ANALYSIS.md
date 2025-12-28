# Komplett Analys: Alla Uppladdnings- och Genereringsscenarion

## Datum: 2025-12-29

## Syfte

Denna analys dokumenterar alla möjliga scenarion för hur användare kan ladda upp och generera dokumentation i appen, identifierar logiska problem, och förklarar vad som förväntas genereras och visas i Node Matrix.

---

## Scenarion

### Scenario 1: En Subprocess-fil Laddas Upp Isolerat

**Exempel:** Användaren laddar upp bara `mortgage-se-internal-data-gathering.bpmn`

**Vad som genereras:**
1. Epic-dokumentation för alla tasks/epics i filen:
   - `nodes/mortgage-se-internal-data-gathering/fetch-party-information.html`
   - `nodes/mortgage-se-internal-data-gathering/pre-screen-party.html`
   - `nodes/mortgage-se-internal-data-gathering/fetch-engagements.html`
2. File-level documentation (combined):
   - `mortgage-se-internal-data-gathering.html`

**Vad som INTE genereras:**
- CallActivity Feature Goals (inga callActivities i filen, eller callActivities saknar subprocess-filer)
- Process Feature Goals (genereras bara när filen är subprocess i en hierarki)

**Vad som visas i Node Matrix:**
- ✅ 3 noder (ServiceTask, BusinessRuleTask, ServiceTask)
- ❌ File-level documentation (`mortgage-se-internal-data-gathering.html`) visas INTE som separat rad

**Användarens förväntning:**
- ✅ Se alla 3 noder i Node Matrix
- ✅ Se file-level documentation (`mortgage-se-internal-data-gathering.html`) - **PROBLEM: Visas inte!**

**Logiskt problem:**
- File-level documentation genereras men visas inte i Node Matrix
- Node Matrix visar bara noder (UserTask, ServiceTask, BusinessRuleTask, CallActivity), inte filer
- File-level documentation är kopplad till filen, inte till en specifik nod

**Lösning:**
- ✅ Fixat: File-level documentation visas nu i dokumentationslänkarna för alla noder i filen (via `useAllBpmnNodes.ts`)
- Men användaren förväntar sig att se det som en separat rad i Node Matrix

---

### Scenario 2: Root-fil + Subprocess-filer Laddas Upp Tillsammans

**Exempel:** Användaren laddar upp:
- `mortgage.bpmn` (root)
- `mortgage-se-application.bpmn` (subprocess)
- `mortgage-se-internal-data-gathering.bpmn` (subprocess av application)

**Vad som genereras (när root-filen genereras med hierarki):**
1. Epic-dokumentation för alla tasks/epics i alla filer
2. CallActivity Feature Goals för alla callActivities där subprocess-filen finns:
   - `feature-goals/mortgage-application.html` (hierarchical naming)
   - `feature-goals/mortgage-se-application-internal-data-gathering.html` (hierarchical naming)
3. Process Feature Goals för subprocess-filer:
   - `feature-goals/mortgage-se-application.html` (non-hierarchical)
   - `feature-goals/mortgage-se-internal-data-gathering.html` (non-hierarchical)
4. File-level documentation för alla filer:
   - `mortgage.bpmn.html`
   - `mortgage-se-application.bpmn.html`
   - `mortgage-se-internal-data-gathering.bpmn.html`

**Vad som visas i Node Matrix:**
- ✅ Alla noder från alla filer
- ✅ CallActivity Feature Goals (hierarchical) för callActivities
- ✅ Process Feature Goals (non-hierarchical) för subprocess-filer (via fix i `useAllBpmnNodes.ts`)
- ✅ File-level documentation i dokumentationslänkarna för noder

**Användarens förväntning:**
- ✅ Se alla noder från alla filer
- ✅ Se Feature Goals för callActivities
- ✅ Se Process Feature Goals för subprocess-filer
- ✅ Se file-level documentation för alla filer

**Status:** ✅ Fungerar korrekt (efter fix)

---

### Scenario 3: Parent-fil + Subprocess-fil Laddas Upp Tillsammans

**Exempel:** Användaren laddar upp:
- `mortgage-se-application.bpmn` (parent)
- `mortgage-se-internal-data-gathering.bpmn` (subprocess)

**Vad som genereras:**
1. Epic-dokumentation för alla tasks/epics i båda filerna
2. CallActivity Feature Goal för callActivity "internal-data-gathering" i application:
   - `feature-goals/mortgage-se-application-internal-data-gathering.html` (hierarchical naming)
3. Process Feature Goal för subprocess-filen:
   - `feature-goals/mortgage-se-internal-data-gathering.html` (non-hierarchical)
4. File-level documentation för båda filerna:
   - `mortgage-se-application.bpmn.html`
   - `mortgage-se-internal-data-gathering.bpmn.html`

**Vad som visas i Node Matrix:**
- ✅ Alla noder från båda filerna
- ✅ CallActivity Feature Goal för "internal-data-gathering" callActivity
- ✅ Process Feature Goal för subprocess-filen (via fix i `useAllBpmnNodes.ts`)
- ✅ File-level documentation i dokumentationslänkarna för noder

**Användarens förväntning:**
- ✅ Se alla noder från båda filerna
- ✅ Se Feature Goal för callActivity "internal-data-gathering"
- ✅ Se Process Feature Goal för subprocess-filen
- ✅ Se file-level documentation för båda filerna

**Status:** ✅ Fungerar korrekt (efter fix)

---

### Scenario 4: Root-fil Laddas Upp Isolerat (utan subprocess-filer)

**Exempel:** Användaren laddar upp bara `mortgage.bpmn`

**Vad som genereras:**
1. Epic-dokumentation för alla tasks/epics i root-filen
2. CallActivity Feature Goals för callActivities där subprocess-filen finns:
   - Om subprocess-filen finns i `existingBpmnFiles`: genereras Feature Goal
   - Om subprocess-filen INTE finns: hoppas över (ingen Feature Goal)
3. Process Feature Goals: INTE genereras (root-filen är inte en subprocess)
4. File-level documentation:
   - `mortgage.bpmn.html`

**Vad som visas i Node Matrix:**
- ✅ Alla noder från root-filen
- ✅ CallActivity Feature Goals för callActivities där subprocess-filen finns
- ❌ CallActivity Feature Goals för callActivities där subprocess-filen INTE finns (korrekt - hoppas över)

**Användarens förväntning:**
- ✅ Se alla noder från root-filen
- ✅ Se Feature Goals för callActivities där subprocess-filen finns
- ✅ INTE se Feature Goals för callActivities där subprocess-filen saknas

**Status:** ✅ Fungerar korrekt

---

### Scenario 5: Subprocess-fil Laddas Upp Efter Root-fil (Inkrementell)

**Exempel:**
1. Användaren laddar upp `mortgage.bpmn` (root)
2. Användaren genererar dokumentation (ingen Feature Goal för "internal-data-gathering" eftersom filen saknas)
3. Användaren laddar upp `mortgage-se-internal-data-gathering.bpmn` (subprocess)
4. Användaren genererar dokumentation igen

**Vad som genereras (steg 2):**
- Epic-dokumentation för root-filen
- CallActivity Feature Goals för callActivities där subprocess-filen finns
- INTE Feature Goal för "internal-data-gathering" (subprocess-filen saknas)

**Vad som genereras (steg 4):**
- Epic-dokumentation för subprocess-filen
- CallActivity Feature Goal för "internal-data-gathering" (subprocess-filen finns nu)
- Process Feature Goal för subprocess-filen
- File-level documentation för subprocess-filen

**Vad som visas i Node Matrix:**
- ✅ Alla noder från root-filen (steg 2)
- ✅ Alla noder från subprocess-filen (steg 4)
- ✅ CallActivity Feature Goal för "internal-data-gathering" (steg 4)
- ✅ Process Feature Goal för subprocess-filen (steg 4)

**Användarens förväntning:**
- ✅ Se alla noder från båda filerna efter steg 4
- ✅ Se Feature Goals för callActivities där subprocess-filen finns

**Status:** ✅ Fungerar korrekt

---

## Identifierade Logiska Problem

### Problem 1: File-level Documentation Visas Inte Som Separat Rad i Node Matrix

**Beskrivning:**
- File-level documentation (`mortgage-se-internal-data-gathering.html`) genereras för alla filer
- Men Node Matrix visar bara noder (UserTask, ServiceTask, BusinessRuleTask, CallActivity), inte filer
- File-level documentation är kopplad till filen, inte till en specifik nod

**Nuvarande lösning:**
- File-level documentation visas i dokumentationslänkarna för alla noder i filen (via `useAllBpmnNodes.ts`)
- Men användaren förväntar sig att se det som en separat rad i Node Matrix

**Förslag:**
1. **Alternativ A:** Lägg till en "File" typ i Node Matrix som visar file-level documentation
2. **Alternativ B:** Behåll nuvarande lösning (visas i dokumentationslänkarna)
3. **Alternativ C:** Visa file-level documentation som en separat sektion i Node Matrix (t.ex. "File Documentation")

**Rekommendation:** Alternativ A eller C för bättre användarupplevelse

---

### Problem 2: Process Feature Goals vs CallActivity Feature Goals

**Beskrivning:**
- Systemet genererar två typer av Feature Goals:
  1. **CallActivity Feature Goals** (hierarchical naming): `feature-goals/{parent}-{elementId}.html`
  2. **Process Feature Goals** (non-hierarchical): `feature-goals/{baseName}.html`

**När genereras vad:**
- **CallActivity Feature Goals:** Genereras för varje callActivity där subprocess-filen finns
- **Process Feature Goals:** Genereras för subprocess-filer när de är del av en hierarki

**Problem:**
- Dubbel dokumentation för samma subprocess
- Oklart när vad används
- Komplexitet i UI (måste kolla båda typerna)

**Nuvarande lösning:**
- Node Matrix kollar båda typerna (via fix i `useAllBpmnNodes.ts`)
- Men det är fortfarande oklart för användaren vilken typ som används

**Förslag:**
1. **Alternativ A:** Konsolidera till bara CallActivity Feature Goals (hierarchical naming)
2. **Alternativ B:** Konsolidera till bara Process Feature Goals (non-hierarchical)
3. **Alternativ C:** Behåll båda, men förtydliga när vad används

**Rekommendation:** Alternativ A (lång sikt) - enklare modell, tydligare mapping

---

### Problem 3: Subprocess-fil Genereras Isolerat vs I Hierarki

**Beskrivning:**
- När en subprocess-fil genereras isolerat (Scenario 1), genereras INTE Process Feature Goal
- När en subprocess-fil genereras i hierarki (Scenario 2-3), genereras Process Feature Goal

**Problem:**
- Samma fil kan ha olika dokumentation beroende på när den genereras
- Användaren förväntar sig att se Process Feature Goal även när filen genereras isolerat

**Nuvarande logik:**
- Process Feature Goals genereras bara när `isSubprocessFileForSubprocess = true` (rad 2441 i `bpmnGenerators.ts`)
- Detta är bara sant när filen är del av en hierarki

**Förslag:**
1. **Alternativ A:** Generera Process Feature Goal även när subprocess-filen genereras isolerat
2. **Alternativ B:** Behåll nuvarande logik (Process Feature Goal bara i hierarki)
3. **Alternativ C:** Använd file-level documentation istället för Process Feature Goal när filen genereras isolerat

**Rekommendation:** Alternativ A - konsekvent beteende oavsett när filen genereras

---

### Problem 4: Node Matrix Visar Inte Process-noder

**Beskrivning:**
- Node Matrix filtrerar bort process-noder (rad 152-157 i `useAllBpmnNodes.ts`)
- Men Process Feature Goals är kopplade till process-noder, inte callActivities

**Nuvarande lösning:**
- Process Feature Goals visas via callActivities (via fix i `useAllBpmnNodes.ts`)
- Men det är inte intuitivt - Process Feature Goal är kopplad till process-noden, inte callActivity

**Förslag:**
1. **Alternativ A:** Visa process-noder i Node Matrix (med typ "Process")
2. **Alternativ B:** Behåll nuvarande lösning (visas via callActivities)
3. **Alternativ C:** Visa Process Feature Goals som en separat sektion

**Rekommendation:** Alternativ A - tydligare separation mellan callActivity Feature Goals och Process Feature Goals

---

## Sammanfattning av Scenarion

| Scenario | Genereras | Visas i Node Matrix | Problem |
|----------|-----------|---------------------|---------|
| 1. Subprocess isolerat | Epics + File-level | Epics (3 noder) | File-level visas inte som separat rad |
| 2. Root + Subprocess | Epics + CallActivity FGs + Process FGs + File-level | Alla noder + FGs | ✅ Fungerar |
| 3. Parent + Subprocess | Epics + CallActivity FGs + Process FGs + File-level | Alla noder + FGs | ✅ Fungerar |
| 4. Root isolerat | Epics + CallActivity FGs (om subprocess finns) | Alla noder + FGs | ✅ Fungerar |
| 5. Inkrementell | Epics + FGs när subprocess finns | Alla noder + FGs | ✅ Fungerar |

---

## Rekommenderade Åtgärder

### Kort sikt (Hög prioritet):
1. ✅ **Fixat:** Process Feature Goals visas i Node Matrix (via `useAllBpmnNodes.ts`)
2. ✅ **Fixat:** File-level documentation visas i dokumentationslänkarna för noder
3. ⚠️ **Kvarstående:** File-level documentation visas inte som separat rad i Node Matrix
   - **Åtgärd:** Överväg att lägga till "File" typ i Node Matrix eller separat sektion

### Medellång sikt (Medel prioritet):
1. **Generera Process Feature Goal även när subprocess-fil genereras isolerat**
   - Ändra logik i `bpmnGenerators.ts` rad 2441
   - Säkerställ konsekvent beteende oavsett när filen genereras

2. **Förtydliga Process Feature Goals vs CallActivity Feature Goals**
   - Dokumentera när vad används
   - Överväg att konsolidera till en typ (lång sikt)

### Lång sikt (Låg prioritet):
1. **Konsolidera Feature Goals**
   - Överväg att ta bort Process Feature Goals och använd bara CallActivity Feature Goals
   - Eller tvärtom: ta bort CallActivity Feature Goals och använd bara Process Feature Goals
   - Kräver migrering av befintlig dokumentation

2. **Visa process-noder i Node Matrix**
   - Lägg till "Process" typ i Node Matrix
   - Visa Process Feature Goals direkt kopplade till process-noder

---

## Testfall

### Test 1: Subprocess-fil Isolerat
1. Ladda upp bara `mortgage-se-internal-data-gathering.bpmn`
2. Generera dokumentation
3. Verifiera att 4 filer genereras (3 epics + 1 file-level)
4. Verifiera att Node Matrix visar 3 noder
5. Verifiera att file-level documentation är tillgänglig via dokumentationslänkarna

### Test 2: Root + Subprocess
1. Ladda upp `mortgage.bpmn` + `mortgage-se-application.bpmn` + `mortgage-se-internal-data-gathering.bpmn`
2. Generera dokumentation för root-filen
3. Verifiera att alla noder från alla filer genereras
4. Verifiera att CallActivity Feature Goals genereras
5. Verifiera att Process Feature Goals genereras
6. Verifiera att Node Matrix visar alla noder + Feature Goals

### Test 3: Parent + Subprocess
1. Ladda upp `mortgage-se-application.bpmn` + `mortgage-se-internal-data-gathering.bpmn`
2. Generera dokumentation
3. Verifiera att CallActivity Feature Goal genereras för "internal-data-gathering"
4. Verifiera att Process Feature Goal genereras för subprocess-filen
5. Verifiera att Node Matrix visar alla noder + Feature Goals

### Test 4: Inkrementell
1. Ladda upp `mortgage.bpmn`
2. Generera dokumentation
3. Verifiera att INTE Feature Goal genereras för "internal-data-gathering" (subprocess-filen saknas)
4. Ladda upp `mortgage-se-internal-data-gathering.bpmn`
5. Generera dokumentation igen
6. Verifiera att Feature Goal genereras för "internal-data-gathering" (subprocess-filen finns nu)

---

## Slutsats

Systemet fungerar i de flesta scenarion, men det finns logiska problem med:
1. **File-level documentation visas inte som separat rad i Node Matrix** (hög prioritet)
2. **Process Feature Goals genereras inte när subprocess-fil genereras isolerat** (medel prioritet)
3. **Oklart när Process Feature Goals vs CallActivity Feature Goals används** (medel prioritet)
4. **Process-noder visas inte i Node Matrix** (låg prioritet)

Rekommenderade åtgärder finns ovan.

