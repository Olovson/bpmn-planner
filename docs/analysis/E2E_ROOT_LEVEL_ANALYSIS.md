# Analys: Given/When/Then på root-nivå för E2E-scenarios

**Datum:** 2025-12-22  
**Syfte:** Analysera om våra instruktioner och exempel för given/when/then på root-nivå är tillräckligt bra.

---

## ✅ Vad som fungerar bra

### 1. Tydlig struktur och syfte
- ✅ Vi har tydligt definierat att root-nivå är en **introduktion/sammanfattning** till hela E2E-scenariot
- ✅ Vi har tydligt skiljt mellan root-nivå (översiktlig) och SubprocessSteps (detaljerad)
- ✅ Exemplet visar tydligt skillnaden mellan root-nivå och SubprocessSteps

### 2. Innehållskrav
- ✅ Root-processens namn inkluderas (t.ex. "Mortgage Application-processen")
- ✅ Feature Goal-namn i ordning inkluderas
- ✅ Gateway-conditions inkluderas i given
- ✅ Gateway-beslut inkluderas i when
- ✅ Slutstatus för varje Feature Goal inkluderas i then
- ✅ DMN-beslut och deras resultat inkluderas

### 3. Balans mellan översikt och detalj
- ✅ Root-nivå ger översikt (2-4 meningar per fält)
- ✅ SubprocessSteps ger detaljer (3-5 meningar per fält)
- ✅ Exemplet visar tydligt skillnaden

### 4. Affärsspråk vs teknisk terminologi
- ✅ Exemplet använder affärsspråk ("Kunden fyller i ansökan" istället för "CallActivity application exekveras")
- ✅ Dåliga exempel visar vad som INTE ska göras (för tekniskt, för generellt)

---

## ⚠️ Potentiella förbättringsområden

### 1. Längd och detaljnivå
**Nuvarande instruktioner:**
- Root-nivå: 2-4 meningar per fält
- SubprocessSteps: 3-5 meningar per fält

**Analys:**
- Exemplet i `E2E_SCENARIO_ROOT_LEVEL_EXAMPLE.md` har:
  - Given: ~4 meningar ✅
  - When: ~8 meningar ⚠️ (längre än instruktionerna säger)
  - Then: ~6 meningar ⚠️ (längre än instruktionerna säger)

**Rekommendation:**
- Uppdatera instruktionerna till "2-5 meningar" för root-nivå (given/when/then kan variera i längd)
- Eller: Förtydliga att when/then kan vara längre eftersom de aggregerar information från alla Feature Goals

### 2. Processnamn i kontext
**Nuvarande instruktioner:**
- "Använd `processInfo.processName` för att referera till root-processen"

**Analys:**
- Exemplet använder "Mortgage Application-processen" vilket är bra
- Men vi borde tydliggöra att Claude kan använda både `processInfo.processName` (t.ex. "Mortgage Application") och `processInfo.bpmnFile` (t.ex. "mortgage.bpmn") beroende på kontext

**Rekommendation:**
- Tydliggöra att Claude kan använda antingen processnamn eller filnamn, men processnamn är att föredra

### 3. Gateway-conditions format
**Nuvarande instruktioner:**
- "Gateway-conditions som avgör vilken path som används (t.ex. 'stakeholders.length === 1', 'propertyType === 'BOSTADSRATT'')"

**Analys:**
- Exemplet inkluderar både teknisk notation (`stakeholders.length === 1`) och affärsspråk ("en sökande")
- Detta är bra, men vi borde tydliggöra att Claude ska använda affärsspråk primärt, med teknisk notation som komplement

**Rekommendation:**
- Tydliggöra att gateway-conditions ska beskrivas i affärsspråk primärt, med teknisk notation som valfritt komplement

### 4. Aggregering av Feature Goal-information
**Nuvarande instruktioner:**
- "Aggregera information från alla Feature Goals i pathen"
- "Använd flowSteps från alla Feature Goals för att skapa when"
- "Använd acceptanceCriteria från alla Feature Goals för att skapa then"

**Analys:**
- Exemplet visar bra aggregering, men vi borde tydliggöra hur Claude ska välja vilken information som ska inkluderas
- För when: Ska Claude inkludera alla flowSteps från alla Feature Goals, eller bara de viktigaste?
- För then: Ska Claude inkludera alla acceptanceCriteria från alla Feature Goals, eller bara de viktigaste?

**Rekommendation:**
- Tydliggöra att Claude ska inkludera de viktigaste stegen/besluten från varje Feature Goal, inte allt
- Prioritera: Gateway-beslut, slutstatus för varje Feature Goal, DMN-beslut

### 5. Jämförelse med SubprocessSteps
**Nuvarande instruktioner:**
- "Detta är en introduktion/sammanfattning till hela E2E-scenariot, inte bara första Feature Goalet"

**Analys:**
- Exemplet visar tydligt skillnaden mellan root-nivå och SubprocessSteps
- Men vi borde tydliggöra att root-nivå INTE ska inkludera detaljer som hör hemma i SubprocessSteps (t.ex. subprocesser, Service Tasks, User Tasks)

**Rekommendation:**
- Lägga till explicit instruktion: "Root-nivå ska INTE inkludera detaljer som subprocesser, Service Tasks, User Tasks - dessa hör hemma i SubprocessSteps"

---

## 📊 Jämförelse med Feature Goal generation

### Feature Goal generation (för referens)
- **Context:** Feature Goal-dokumentation med `childrenDocumentation` (epics, subprocesses, etc.)
- **Output:** Detaljerad dokumentation med `flowSteps`, `userStories`, `prerequisites`, etc.
- **Kvalitet:** 85-95% (mycket bra)

### E2E scenario generation (root-nivå)
- **Context:** Path från BPMN-processgraf + Feature Goal-dokumentation för alla Feature Goals i pathen
- **Output:** Given/When/Then på root-nivå (översiktlig sammanfattning)
- **Kvalitet:** Förväntad 80-90% (bra, men kan förbättras)

**Skillnader:**
- Feature Goal generation har mer kontext (childrenDocumentation)
- E2E scenario generation har mer komplexitet (måste aggregera från flera Feature Goals)
- E2E scenario generation har tydligare instruktioner om affärsspråk

**Lärdomar från Feature Goal generation:**
- ✅ Tydliga exempel på vad som är bra/dåligt
- ✅ Tydlig balans mellan affärsspråk och konkret information
- ✅ Tydlig instruktion om att använda kontextinformation

---

## 🎯 Rekommendationer för förbättring

### Prioritet 1: Hög prioritet (gör nu)

1. **Tydliggöra längd och detaljnivå**
   - Uppdatera instruktionerna till "2-5 meningar" för root-nivå
   - Tydliggöra att when/then kan vara längre eftersom de aggregerar information från alla Feature Goals

2. **Tydliggöra vad som INTE ska inkluderas**
   - Lägga till explicit instruktion: "Root-nivå ska INTE inkludera detaljer som subprocesser, Service Tasks, User Tasks - dessa hör hemma i SubprocessSteps"

3. **Tydliggöra aggregering av Feature Goal-information**
   - Tydliggöra att Claude ska inkludera de viktigaste stegen/besluten från varje Feature Goal, inte allt
   - Prioritera: Gateway-beslut, slutstatus för varje Feature Goal, DMN-beslut

### Prioritet 2: Medel prioritet (gör snart)

4. **Tydliggöra gateway-conditions format**
   - Tydliggöra att gateway-conditions ska beskrivas i affärsspråk primärt, med teknisk notation som valfritt komplement

5. **Tydliggöra processnamn i kontext**
   - Tydliggöra att Claude kan använda antingen processnamn eller filnamn, men processnamn är att föredra

### Prioritet 3: Lägre prioritet (gör senare)

6. **Lägga till fler exempel**
   - Exempel för olika scenario-typer (happy-path, alt-path, error)
   - Exempel för olika iterationer (en sökande, medsökande, manuella steg)

---

## ✅ Slutsats

**Nuvarande kvalitet:** 80-85% (bra, men kan förbättras)

**Vad som fungerar bra:**
- ✅ Tydlig struktur och syfte
- ✅ Bra balans mellan översikt och detalj
- ✅ Bra exempel som visar vad som är bra/dåligt
- ✅ Bra balans mellan affärsspråk och konkret information

**Vad som kan förbättras:**
- ⚠️ Tydliggöra längd och detaljnivå (when/then kan vara längre)
- ⚠️ Tydliggöra vad som INTE ska inkluderas (subprocesser, Service Tasks, User Tasks)
- ⚠️ Tydliggöra aggregering av Feature Goal-information (viktigaste stegen/besluten, inte allt)

**Förväntad kvalitet efter förbättringar:** 85-90% (mycket bra)

**Rekommendation:** Implementera Prioritet 1-förbättringarna för att nå 85-90% kvalitet.

