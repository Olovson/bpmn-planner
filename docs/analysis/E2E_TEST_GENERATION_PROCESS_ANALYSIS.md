# Analys: E2E Testgenereringsprocess

**Datum:** 2025-12-22  
**Syfte:** Analysera E2E-scenario-genereringsprocessen och jämföra med Feature Goal-generering för att identifiera förbättringsmöjligheter.

---

## 📊 Jämförelse: E2E-generering vs Feature Goal-generering

### 1. Kontextinformation

#### Feature Goal-generering
**Använder `buildContextPayload` som bygger rik kontext:**
- `processContext`: processName, fileName, entryPoints, endPoints, keyNodes, phase, lane
- `currentNodeContext`: node, hierarchy, parents, siblings, children, childrenDocumentation, flows, documentation, jiraGuidance
- `structuralInfo`: gatewayConditions, processPaths, flowContext, endEvents

**Fördelar:**
- Mycket rik kontext som ger Claude bättre förståelse
- Strukturell information (processPaths, flowContext) hjälper Claude förstå Feature Goal's roll i processen
- Phase/lane-information hjälper Claude placera Feature Goal i rätt kontext

#### E2E Scenario-generering
**Bygger enklare input direkt:**
- `path`: startEvent, endEvent, featureGoals, gatewayConditions
- `featureGoals`: callActivityId, bpmnFile, summary, flowSteps, userStories, prerequisites, dependencies, subprocesses, serviceTasks, userTasks, businessRules
- `processInfo`: bpmnFile, processName, initiative

**Skillnader:**
- ❌ Saknar strukturell information (processPaths, flowContext, endEvents)
- ❌ Saknar phase/lane-information
- ❌ Saknar hierarchy-information (parents, siblings, children)
- ❌ Saknar flows-information (incoming, outgoing)

**Potentiell förbättring:**
- ✅ Lägg till strukturell information (processPaths, flowContext) för att ge Claude bättre förståelse av Feature Goals' roll i processen
- ✅ Lägg till phase/lane-information för att hjälpa Claude förstå processens kontext
- ⚠️ **Men:** E2E-scenarios är på process-nivå, inte Feature Goal-nivå, så vissa information (t.ex. hierarchy) kanske inte är lika relevant

---

### 2. Prompt-kvalitet

#### Feature Goal-prompt (`feature_epic_prompt.md`)
**Stärkor:**
- ✅ Mycket detaljerade instruktioner om affärsspråk vs teknisk terminologi
- ✅ Tydliga instruktioner om hur man använder kontextinformation
- ✅ Instruktioner om hur man aggregerar childrenDocumentation
- ✅ Instruktioner om hur man evaluerar vem som gör vad (kund vs handläggare)
- ✅ Prioritering när instruktioner konfliktar
- ✅ Exempel på bra vs dåligt innehåll
- ✅ Tydliga instruktioner om format och struktur

#### E2E Scenario-prompt (`e2e_scenario_prompt.md`)
**Stärkor:**
- ✅ Tydliga instruktioner om vad som ska genereras
- ✅ Instruktioner om gateway-conditions
- ✅ Instruktioner om de tre prioriterade scenarios
- ✅ Exempel på output-format

**Brister:**
- ❌ Saknar detaljerade instruktioner om affärsspråk (Feature Goal-prompten har mycket om detta)
- ❌ Saknar instruktioner om hur man använder Feature Goal-dokumentation mer effektivt
- ❌ Saknar prioritering när instruktioner konfliktar
- ❌ Saknar instruktioner om att evaluera vem som gör vad (kund vs handläggare) - relevant för subprocessSteps
- ❌ Saknar exempel på bra vs dåligt innehåll
- ❌ Mindre detaljerade instruktioner om format och struktur

**Potentiell förbättring:**
- ✅ Lägg till instruktioner om affärsspråk (använd "kunden", "handläggaren", "systemet" istället för "UserTask", "ServiceTask")
- ✅ Lägg till instruktioner om hur man använder Feature Goal-dokumentation mer effektivt (t.ex. aggregera flowSteps, använd userStories för assertions)
- ✅ Lägg till prioritering när instruktioner konfliktar
- ✅ Lägg till instruktioner om att evaluera vem som gör vad (kund vs handläggare) för subprocessSteps
- ✅ Lägg till exempel på bra vs dåligt innehåll

---

### 3. Input-struktur

#### Feature Goal-generering
**Använder strukturerad kontext:**
```typescript
{
  type: "Feature",
  processContext: { ... },
  currentNodeContext: { ... },
  structuralInfo: { ... } // Om tillgänglig
}
```

**Fördelar:**
- Strukturerad kontext gör det lättare för Claude att förstå
- Separerar olika typer av information (process, node, structure)

#### E2E Scenario-generering
**Använder flatter struktur:**
```typescript
{
  path: { ... },
  featureGoals: [ ... ],
  processInfo: { ... }
}
```

**Potentiell förbättring:**
- ✅ Strukturera input mer som Feature Goal-generering (separera processContext, pathContext, featureGoalContext)
- ⚠️ **Men:** E2E-scenarios är på process-nivå, så strukturen kanske är okej som den är

---

### 4. Användning av Feature Goal-dokumentation

#### Feature Goal-generering
**Använder childrenDocumentation för att aggregera:**
- Aggregerar flowSteps från child nodes
- Aggregerar prerequisites från child nodes
- Aggregerar dependencies från child nodes
- Identifierar user stories baserat på vem som drar nytta

**Fördelar:**
- Claude får mer kontext om vad child nodes gör
- Kan skapa mer precisa dokumentation

#### E2E Scenario-generering
**Använder Feature Goal-dokumentation direkt:**
- Läser summary, flowSteps, userStories, prerequisites, dependencies från Feature Goals
- Använder dem direkt utan aggregering

**Potentiell förbättring:**
- ✅ Prompten kunde ha bättre instruktioner om hur man använder Feature Goal-dokumentation:
  - Använd flowSteps för att skapa action i bankProjectTestSteps
  - Använd userStories.acceptanceCriteria för att skapa assertion i bankProjectTestSteps
  - Använd prerequisites för att skapa given i subprocessSteps
  - Aggregera information från flera Feature Goals för att skapa given/when/then på scenario-nivå

---

### 5. Strukturell information

#### Feature Goal-generering
**Använder `enrichNodeContextWithStructuralInfo`:**
- gatewayConditions FÖRE Feature Goal
- processPaths som går genom Feature Goal
- flowContext (Feature Goals FÖRE/EFTER)
- endEvents som Feature Goal kan leda till

**Fördelar:**
- Claude förstår Feature Goal's roll i processen bättre
- Kan skapa mer precisa prerequisites och dependencies

#### E2E Scenario-generering
**Använder bara gatewayConditions från path:**
- gatewayConditions från path (alla conditions i pathen)
- Saknar processPaths, flowContext, endEvents

**Potentiell förbättring:**
- ✅ Lägg till strukturell information för varje Feature Goal i pathen:
  - processPaths som går genom Feature Goal
  - flowContext (Feature Goals FÖRE/EFTER)
  - endEvents som Feature Goal kan leda till
- ⚠️ **Men:** Detta kan vara överflödigt eftersom E2E-scenarios redan har hela pathen

---

## 🎯 Identifierade Förbättringsmöjligheter

### 1. Förbättra prompten med affärsspråk-instruktioner

**Nuvarande situation:**
- E2E-prompten saknar detaljerade instruktioner om affärsspråk
- Feature Goal-prompten har mycket om detta

**Förbättring:**
- Lägg till sektion i E2E-prompten om affärsspråk:
  - Använd "kunden", "handläggaren", "systemet" istället för "UserTask", "ServiceTask"
  - Beskriv VAD som händer i affärstermer, inte HUR det är strukturerat i BPMN
  - Exempel på bra vs dåligt innehåll

**Förväntad effekt:**
- Mer affärsnära E2E-scenarios
- Bättre förståelse för bankprojektet

---

### 2. Förbättra instruktioner om hur man använder Feature Goal-dokumentation

**Nuvarande situation:**
- Prompten säger att man ska använda Feature Goal-dokumentation, men inte hur
- Claude kanske inte använder informationen optimalt

**Förbättring:**
- Lägg till detaljerade instruktioner om hur man använder Feature Goal-dokumentation:
  - Använd `flowSteps` för att skapa `action` i `bankProjectTestSteps`
  - Använd `userStories.acceptanceCriteria` för att skapa `assertion` i `bankProjectTestSteps`
  - Använd `prerequisites` för att skapa `given` i `subprocessSteps`
  - Aggregera information från flera Feature Goals för att skapa `given/when/then` på scenario-nivå

**Förväntad effekt:**
- Mer precisa E2E-scenarios som använder Feature Goal-dokumentation bättre
- Bättre koppling mellan Feature Goals och E2E-scenarios

---

### 3. Lägg till instruktioner om att evaluera vem som gör vad

**Nuvarande situation:**
- E2E-prompten saknar instruktioner om att evaluera vem som gör vad (kund vs handläggare)
- Feature Goal-prompten har detaljerade instruktioner om detta

**Förbättring:**
- Lägg till instruktioner i E2E-prompten om att evaluera vem som gör vad:
  - För `subprocessSteps`: Evaluera om det är kund eller handläggare baserat på Feature Goal-dokumentation
  - Använd "kunden" eller "handläggaren" i texten baserat på evaluering
  - Använd Feature Goal-dokumentation (t.ex. userTasks med lane-information) för att identifiera vem som gör vad

**Förväntad effekt:**
- Mer korrekta beskrivningar av vem som gör vad i E2E-scenarios
- Bättre förståelse för bankprojektet

---

### 4. Lägg till prioritering när instruktioner konfliktar

**Nuvarande situation:**
- E2E-prompten saknar prioritering när instruktioner konfliktar
- Feature Goal-prompten har tydlig prioritering

**Förbättring:**
- Lägg till sektion i E2E-prompten om prioritering:
  - Högsta prioritet: Korrekt JSON-struktur och format
  - Hög prioritet: Använd affärsspråk och undvik teknisk BPMN-terminologi
  - Hög prioritet: Hitta INTE på information som inte finns i kontexten
  - Medel prioritet: Använd kontextinformation när den finns
  - Lägre prioritet: Längd och detaljnivå

**Förväntad effekt:**
- Mer konsistent output från Claude
- Bättre kvalitet när instruktioner konfliktar

---

### 5. Lägg till exempel på bra vs dåligt innehåll

**Nuvarande situation:**
- E2E-prompten har exempel på output-format, men inte bra vs dåligt innehåll
- Feature Goal-prompten har exempel på bra vs dåligt innehåll

**Förbättring:**
- Lägg till exempel i E2E-prompten:
  - Bra: "Kunden fyller i komplett ansökan med personuppgifter, inkomst och önskat lånebelopp"
  - Dåligt: "UserTask application exekveras och fyller i formulär"
  - Bra: "Systemet hämtar kunddata från externa källor"
  - Dåligt: "ServiceTask fetch-party-information anropar API-endpoint"

**Förväntad effekt:**
- Claude förstår bättre vad som är bra innehåll
- Mer affärsnära E2E-scenarios

---

### 6. Förbättra input-struktur (valfritt)

**Nuvarande situation:**
- E2E-generering använder flatter struktur
- Feature Goal-generering använder strukturerad kontext

**Förbättring:**
- Strukturera input mer som Feature Goal-generering:
  ```typescript
  {
    processContext: { ... },
    pathContext: { ... },
    featureGoalContext: [ ... ]
  }
  ```

**Förväntad effekt:**
- Lättare för Claude att förstå strukturen
- Men: Kan vara överflödigt eftersom E2E-scenarios är på process-nivå

**Rekommendation:**
- ⚠️ **Valfritt** - Nuvarande struktur är okej, men strukturerad kontext kan vara bättre

---

## 📋 Sammanfattning av Förbättringsmöjligheter

### Högsta prioritet (stor förbättring, liten risk)

1. ✅ **Lägg till affärsspråk-instruktioner i prompten**
   - Stor förbättring: Mer affärsnära E2E-scenarios
   - Liten risk: Bara text i prompten
   - Effort: Låg

2. ✅ **Lägg till instruktioner om hur man använder Feature Goal-dokumentation**
   - Stor förbättring: Bättre användning av Feature Goal-dokumentation
   - Liten risk: Bara text i prompten
   - Effort: Låg

3. ✅ **Lägg till prioritering när instruktioner konfliktar**
   - Stor förbättring: Mer konsistent output
   - Liten risk: Bara text i prompten
   - Effort: Låg

### Medel prioritet (medel förbättring, liten risk)

4. ✅ **Lägg till instruktioner om att evaluera vem som gör vad**
   - Medel förbättring: Mer korrekta beskrivningar
   - Liten risk: Bara text i prompten
   - Effort: Låg

5. ✅ **Lägg till exempel på bra vs dåligt innehåll**
   - Medel förbättring: Claude förstår bättre vad som är bra
   - Liten risk: Bara text i prompten
   - Effort: Låg

### Lägre prioritet (liten förbättring, medel risk)

6. ⚠️ **Förbättra input-struktur**
   - Liten förbättring: Lättare för Claude att förstå
   - Medel risk: Kräver kodändringar
   - Effort: Medel
   - **Rekommendation:** Vänta tills vi ser om promptförbättringarna räcker

---

## 🎯 Slutsats

**Nuvarande process är bra, men kan förbättras med:**

1. **Promptförbättringar (högsta prioritet):**
   - Affärsspråk-instruktioner
   - Instruktioner om hur man använder Feature Goal-dokumentation
   - Prioritering när instruktioner konfliktar
   - Instruktioner om att evaluera vem som gör vad
   - Exempel på bra vs dåligt innehåll

2. **Input-struktur (lägre prioritet):**
   - Strukturera input mer som Feature Goal-generering
   - Men: Nuvarande struktur är okej, så detta kan vänta

**Rekommendation:**
- Implementera promptförbättringarna först (högsta prioritet)
- Vänta med input-strukturändringar tills vi ser om promptförbättringarna räcker
- Om promptförbättringarna inte räcker, överväg input-strukturändringar

---

## 📝 Nästa steg

1. Uppdatera `prompts/llm/e2e_scenario_prompt.md` med:
   - Affärsspråk-instruktioner
   - Instruktioner om hur man använder Feature Goal-dokumentation
   - Prioritering när instruktioner konfliktar
   - Instruktioner om att evaluera vem som gör vad
   - Exempel på bra vs dåligt innehåll

2. Testa med uppdaterad prompt och jämför resultat

3. Om resultatet inte är tillräckligt bra, överväg input-strukturändringar

