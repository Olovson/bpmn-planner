# Auto-Improvement Execution Plan

**Detta dokument beskriver exakt hur jag automatiskt förbättrar HTML-innehållet i `public/local-content/feature-goals/`.**

## ⚠️ KRITISK KVALITETSVARNING - LÄS DETTA FÖRST

**ABSOLUT INGA SHORTCUTS - KVALITET ÄR ALLT**

**VIKTIGT:** När jag förbättrar innehållet i HTML-filerna:
- ❌ **ALDRIG** ta shortcuts eller "fuska" med innehållet
- ❌ **ALDRIG** hitta på saker för att snabba upp processen
- ❌ **ALDRIG** hoppa över steg eller sektioner
- ❌ **ALDRIG** använda generiska beskrivningar istället för specifika
- ❌ **ALDRIG** lämna tekniska ID:n kvar
- ❌ **ALDRIG** prioritera hastighet över kvalitet
- ✅ **ALLTID** analysera ALLA BPMN-filer grundligt
- ✅ **ALLTID** förbättra ALLA sektioner i varje fil
- ✅ **ALLTID** ersätta ALLA tekniska ID:n med beskrivande namn
- ✅ **ALLTID** göra texten lättläst och affärsorienterad
- ✅ **ALLTID** ta den tid som behövs, även om det är 100 filer
- ✅ **ALLTID** säkerställa att varje fil är perfekt innan jag går vidare
- ✅ **ALLTID** identifiera och dokumentera återkommande feature goals (se Steg 0 nedan)

**Kvalitet är absolut nödvändigt. Om det tar längre tid, även om det är 100 filer, måste jag ta den tiden. Inga shortcuts är tillåtna.**

**⚠️ DETTA ÄR DET VIKTIGASTE I HELA PLANEN. JAG FÅR ALDRIG DEFAULTA TILL NÅGOT ANNAT. KVALITET ÄR ALLT. INGA SHORTCUTS. INGA UNDANTAG.**

**⚠️ PERMANENT REGEL - ÅTERKOMMANDE FEATURE GOALS:**
- **ALDRIG** glöm att identifiera återkommande feature goals innan du börjar förbättra filer
- **ALLTID** kör `npx tsx scripts/analyze-reused-feature-goals.ts` först
- **ALLTID** lägg till "Anropningskontexter" sektion för återkommande feature goals
- **ALLTID** lägg till kontextspecifika input/output-krav
- **ALLTID** följ strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`
- **Detta är en PERMANENT del av arbetsprocessen och ska ALDRIG hoppas över**

**⚠️ PERMANENT REGEL - VALIDERING:**
- **ALDRIG** anse dokumentation komplett utan att köra validering
- **ALLTID** kör `npx tsx scripts/validate-feature-goal-documentation.ts` innan dokumentation anses komplett
- **ALLTID** lösa alla varningar och saknade dokumentationer innan dokumentation anses komplett
- **ALLTID** verifiera att matchningar är korrekta (inte bara att de finns)
- **Detta är en PERMANENT del av arbetsprocessen och ska ALDRIG hoppas över**

**⚠️ PERMANENT REGEL - HIERARKISKA FILNAMN (matchar Jira-namnen):**
- **ALLTID** använd hierarkiska filnamn för icke-återkommande feature goals (matchar Jira-namnen)
- **Format:** `{parent_bpmn_file}-{elementId}-v2.html` (t.ex. `mortgage-se-application-internal-data-gathering-v2.html`)
- **ALDRIG** döp om återkommande feature goals - de behåller legacy-namn (t.ex. `mortgage-se-credit-evaluation-v2.html`)
- **ALLTID** använd `getFeatureGoalDocFileKey` med `parentBpmnFile` parameter när parent-processen är känd
- **Detta säkerställer att filnamnen matchar Jira-namnen direkt (t.ex. "Application - Internal data gathering")**

## 🎯 När användaren frågar om att uppdatera HTML-innehållet

**⚠️ PERMANENT PÅMINNELSE - LÄS DETTA FÖRST:**
- **ALDRIG glöm återkommande feature goals** - Läs `REMEMBER_REUSED_FEATURE_GOALS.md` VARJE GÅNG
- **ALLTID kör `analyze-reused-feature-goals.ts` FÖRST** - Detta är en PERMANENT del av processen
- **ALLTID lägg till "Anropningskontexter" sektion** - För alla återkommande feature goals
- **ALDRIG glöm lane-analys** - Läs `LANE_ANALYSIS_RULE.md` VARJE GÅNG - Analysera lanes för att klassificera processen korrekt (kundaktivitet/handläggaraktivitet/systemaktivitet)
- **ALDRIG glöm validering för målgrupper** - Läs `TARGET_AUDIENCE_VALIDATION.md` VARJE GÅNG - Efter att dokumentet skapats/förbättrats, MÅSTE det valideras för alla målgrupper. INGEN fil är klar förrän alla målgrupper har all information de behöver
- **ALDRIG glöm validering av dokumentation** - Läs `VALIDATION_PROCESS.md` VARJE GÅNG - Efter att dokumentation har skapats/förbättrats, MÅSTE validering köras för att säkerställa att alla feature goals har korrekt dokumentation. INGEN dokumentation är komplett förrän valideringen lyckas utan saknade dokumentationer
- **Detta är en PERMANENT regel som ALDRIG får glömmas**

### Steg 1: Kortfattat förklara approach

**Jag ska förklara:**
1. **Vad jag ska göra:** Förbättra innehållet i alla HTML-filer i `public/local-content/feature-goals/` baserat på BPMN-filer
2. **Hur jag gör det:**
   - Identifierar återkommande feature goals (feature goals som anropas från flera ställen)
   - Analyserar BPMN-filer (feature goal-processen, parent-processen, relaterade processer)
   - Extraherar alla aktiviteter, gateways, events, flöde
   - För återkommande feature goals: Dokumenterar alla anropningskontexter (var, när, varför, vad som är annorlunda)
   - Uppdaterar alla sektioner i HTML-filerna med beskrivande, affärsorienterad text
   - Ersätter alla tekniska ID:n med beskrivande namn
   - Gör texten lättläst och affärsorienterad
3. **Vilka filer:** Alla filer i `FEATURE_GOAL_STATUS.md` som inte är markerade som förbättrade
4. **Kvalitet:** Varje fil uppdateras till perfektion enligt riktlinjerna i `MANUAL_HTML_WORKFLOW.md` och `REUSED_FEATURE_GOALS_STRATEGY.md`

### Steg 2: Fråga om jag ska göra det

**Jag ska fråga:** "Ska jag börja förbättra innehållet i alla filer nu?"

### Steg 3: Automatisk exekvering (om användaren säger ja)

**⚠️ KRITISK: Kvalitet före hastighet - INGA SHORTCUTS**

**Jag ska automatiskt:**

1. **Köra scripts för att identifiera filer och återkommande feature goals:**
   ```bash
   npx tsx scripts/analyze-feature-goal-sync.ts
   npx tsx scripts/analyze-reused-feature-goals.ts  # ⚠️ PERMANENT - ALDRIG HOPPA ÖVER
   npx tsx scripts/generate-feature-goal-status.ts
   npx tsx scripts/validate-feature-goal-documentation.ts  # ⚠️ PERMANENT - ALDRIG HOPPA ÖVER
   ```
   
   **⚠️ PERMANENT REGEL - BPMN-DIAGRAMGENERERING:**
   - **ALDRIG** anse dokumentation komplett utan att generera BPMN-diagram
   - **ALLTID** kör `npm run generate:bpmn-diagrams` efter att alla filer är förbättrade
   - **ALLTID** verifiera att diagram är embeddat i alla HTML-filer
   - **Detta är en PERMANENT del av arbetsprocessen och ska ALDRIG hoppas över**
   
   **⚠️ VIKTIGT:** 
   - `analyze-reused-feature-goals.ts` MÅSTE alltid köras först för att identifiera återkommande feature goals. Detta är en PERMANENT del av processen.
   - `validate-feature-goal-documentation.ts` MÅSTE alltid köras för att säkerställa att alla feature goals har korrekt dokumentation. Detta är en PERMANENT del av processen och MÅSTE köras innan dokumentation anses komplett.

2. **För varje fil i `FEATURE_GOAL_STATUS.md` (som inte är markerad som förbättrad):**
   
   **⚠️ FÖR VARJE FIL - FÖLJ DETTA EXAKT:**
   
   a. **Läsa HTML-filen grundligt** - Förstå hela innehållet
   
   b. **Hitta ALLA BPMN-filer (helhetsanalys):**
      - Feature goal-processen (subprocess BPMN-fil)
      - Parent-processen (processen som anropar feature goal)
      - **REKURSIVT: ALLA nested subprocesses** (feature goals inuti feature goals - t.ex. Application → Object → Object Control)
      - **ALLA call activities** i feature goal-processen och dess nested subprocesses
      - **ALLA processer** som feature goal anropar (direkt och indirekt via nested subprocesses)
      - **ALLA nästa processer** (processer feature goal går vidare till)
      - **ALLA event-driven dependencies** (meddelanden, eskaleringar, events)
      - **ALLA processer** som kan påverka feature goal (via events, eskaleringar, meddelanden)
      - **INGEN fil ska hoppas över** - Analysera helheten, inte bara den direkta processen
   
   c. **Identifiera återkommande feature goals:**
      - **Kontrollera om feature goalet anropas från flera ställen:**
        - Kör `npx tsx scripts/analyze-reused-feature-goals.ts` för att se om feature goalet är återkommande
        - Eller sök i `bpmn-map.json` efter samma `subprocess_bpmn_file` i flera `call_activities`
        - Om feature goalet anropas från flera ställen: Detta är ett återkommande feature goal
      - **För återkommande feature goals:**
        - **Identifiera alla anropningskontexter:**
          - Var anropas feature goalet från? (vilken process, vilken call activity)
          - När anropas det? (vilka förutsättningar, vilka events)
          - Varför anropas det igen? (vilken ny information har tillkommit, vilket syfte)
          - Vad är annorlunda? (vilka specifika input-variabler, vilka specifika output-variabler)
        - **Dokumentera kontexterna:**
          - Generell funktionalitet (vad processen gör)
          - Kontextspecifika användningar (hur processen används i varje kontext)
          - Skillnader mellan kontexter (vad som är annorlunda i varje kontext)
   
   d. **Analysera ALLA BPMN-filer grundligt (på rätt abstraktionsnivå):**
      - **För feature goal-processen:**
        - Extrahera ALLA aktiviteter (userTask, serviceTask, businessRuleTask, callActivity)
        - Extrahera ALLA gateways (exclusiveGateway, parallelGateway, inclusiveGateway, namnlösa gateways)
        - Extrahera ALLA events (startEvent, endEvent, errorEvent, timeout, escalation, message)
        - Extrahera flöde och sekvens (sequence flows)
        - Extrahera multi-instance och parallellitet
        - Extrahera error handling och boundary events
      - **För nested subprocesses (feature goals inuti feature goals):**
        - Identifiera abstraktionsnivå: Är nested subprocess en del av feature goalet eller en separat feature goal?
        - Om nested subprocess är en del av feature goalet: Analysera dess innehåll (aktiviteter, gateways, events) som del av feature goalet
        - Om nested subprocess är en separat feature goal: Analysera hur den anropas och påverkar feature goalet
        - **REKURSIVT:** Gå igenom alla nivåer av nesting (t.ex. Application → Object → Object Control → ...)
      - **För återkommande feature goals:**
        - Analysera varje anropningskontext separat:
          - Vilka förutsättningar finns i varje kontext?
          - Vilken ny information har tillkommit i varje kontext?
          - Vilka specifika input-variabler finns i varje kontext?
          - Vilka specifika output-variabler produceras i varje kontext?
          - Hur påverkar kontexten processflödet?
      - **För parent-processen:**
        - Analysera hur feature goal anropas (beslutspunkter, villkor, boundary events)
        - Analysera flöde till/från feature goal
        - Analysera andra processer i parent-processen som kan påverka feature goal
      - **För relaterade processer:**
        - Analysera processer som feature goal anropar (direkt och indirekt)
        - Analysera processer som feature goal går vidare till
        - Analysera event-driven dependencies (meddelanden, eskaleringar, events)
      - **INGET element ska hoppas över** - Analysera helheten, inte bara isolerade delar
   
   d. **Förbättra ALLA sektioner grundligt:**
      - Beskrivning av FGoal
      - Processteg - Input
      - Processteg - Output
      - Omfattning
      - Avgränsning
      - Beroenden
      - BPMN - Process
      - Testgenerering (om relevant)
      - Effekt
      - User stories
      - Acceptanskriterier
      - **INGEN sektion ska hoppas över**
   
   e. **Ersätt ALLA tekniska ID:n:**
      - Hitta ALLA tekniska ID:n i HTML-filen (Gateway_xxx, Event_xxx, Activity_xxx)
      - För varje tekniskt ID: Sök i BPMN-filerna, extrahera namn eller skapa beskrivande namn
      - Ersätt ALLA tekniska ID:n med beskrivande namn
      - **INGET tekniskt ID ska lämnas kvar**
   
   f. **Gör texten lättläst och affärsorienterad:**
      - Använd korta meningar
      - Undvik långa, komplexa meningar
      - Använd affärstermer, inte tekniska termer
      - Beskriv värde och syfte, inte bara mekanik
      - Var konkret om vad som händer
      - **INGEN text ska vara svårläst**
   
   g. **Kvalitetskontroll:**
      - Kontrollera att ALLA tekniska ID:n är ersatta
      - Kontrollera att ALLA sektioner är uppdaterade
      - Kontrollera att texten är lättläst och affärsorienterad
      - Kontrollera att ALLA aktiviteter, gateways, events är dokumenterade
      - **Om något saknas eller är dåligt - FIXA DET INNAN DU GÅR VIDARE**
   
   h. **Spara filen**
   
   i. **Markera som förbättrad i status-listan** med `[x]`
   
   j. **Generera BPMN-diagram (PERMANENT REGEL - ALDRIG GLÖM):**
      - **⚠️ KRITISK:** Efter att dokumentet skapats/förbättrats, MÅSTE BPMN-diagram genereras och embeddas i HTML-filen
      - **Kör diagramgenereringsscript:**
        ```bash
        npm run generate:bpmn-diagrams
        ```
      - **Detta script:**
        - Läser alla HTML-filer i `public/local-content/feature-goals/`
        - För varje fil, hittar motsvarande BPMN-fil
        - Använder Playwright för att rendera bpmn-js i headless browser
        - Tar screenshot och konverterar till base64
        - Embeddar bilden i HTML-filen
        - Lägger till "Process Diagram" kapitel i slutet
      - **Resultat:** Varje HTML-fil får ett nytt kapitel "Process Diagram" med en statisk bild av BPMN-processdiagrammet
      - **⚠️ VIKTIGT:** Detta gör HTML-filerna helt fristående och delningsbara utan appen eller externa servrar
      - **Se `docs/scripts/GENERATE_BPMN_DIAGRAMS.md` för detaljerad dokumentation**
      - **⚠️ PERMANENT REGEL:** Detta steg ska ALDRIG hoppas över. INGEN fil är komplett förrän BPMN-diagram är genererat och embeddat.
   
   k. **Validera för alla målgrupper (PERMANENT REGEL - ALDRIG GLÖM):**
      - **⚠️ KRITISK:** Efter att dokumentet skapats/förbättrats, MÅSTE det valideras för alla målgrupper
      - **Gå igenom varje målgrupp:** Läs checklistan i `TARGET_AUDIENCE_VALIDATION.md` för varje målgrupp
      - **Identifiera vad som saknas:** För varje målgrupp, identifiera vad som saknas i dokumentet
      - **Förbättra dokumentet:** För varje saknad punkt, lägg till eller förbättra informationen
      - **Iterera:** Upprepa tills alla målgrupper har all information de behöver
      - **⚠️ VIKTIGT:** Detta är en iterativ process. Fortsätt tills alla checklistor är kompletta
      - **Se `TARGET_AUDIENCE_VALIDATION.md` för detaljerad guide och checklistor**
   
   l. **Rapportera kortfattat** (t.ex. "✅ Application: Förbättrad beskrivning, lagt till saknade aktiviteter, ersatt alla tekniska ID:n, genererat BPMN-diagram, validerat för alla målgrupper")
   
   **⚠️ VIKTIGT:** 
   - Ta den tid som behövs för varje fil
   - Varje fil ska vara perfekt innan jag går vidare
   - Om det tar längre tid, även om det är 100 filer, måste jag ta den tiden
   - **INGA SHORTCUTS ÄR TILLÅTNA**
   - **BPMN-diagramgenerering är OBLIGATORISK - INGEN fil är klar förrän BPMN-diagram är genererat och embeddat**
   - **Validering för målgrupper är OBLIGATORISK - INGEN fil är klar förrän alla målgrupper har all information de behöver**

3. **Generera BPMN-diagram för alla filer:**
   ```bash
   npm run generate:bpmn-diagrams
   ```
   **⚠️ PERMANENT REGEL:** Detta steg MÅSTE köras efter att alla filer är förbättrade. Scriptet kommer att:
   - Processa alla HTML-filer i `public/local-content/feature-goals/`
   - För varje fil, hitta motsvarande BPMN-fil
   - Rendera BPMN-diagram med Playwright + bpmn-js
   - Embedda bilden som base64 i HTML-filen
   - Lägga till "Process Diagram" kapitel i slutet
   - **Se `docs/scripts/GENERATE_BPMN_DIAGRAMS.md` för detaljerad dokumentation**

4. **Fortsätt tills alla filer är klara** - **INGEN fil ska hoppas över**

## 📋 Detaljerad exekveringsprocess för varje fil

### 0. Identifiera återkommande feature goals (NYTT STEG)

**⚠️ VIKTIGT: Kontrollera alltid om feature goalet anropas från flera ställen**

**För varje fil, innan du börjar analysera:**

1. **Kör analysscript:**
   ```bash
   npx tsx scripts/analyze-reused-feature-goals.ts
   ```
   Detta genererar `docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals.

2. **Eller sök manuellt i bpmn-map.json:**
   - Hitta feature goal-processen i `bpmn-map.json`
   - Sök efter samma `subprocess_bpmn_file` i alla `call_activities` i alla processer
   - Om samma `subprocess_bpmn_file` finns i flera `call_activities`: Detta är ett återkommande feature goal

3. **Om feature goalet är återkommande:**
   - **Identifiera alla anropningskontexter:**
     - Var anropas det från? (vilken process, vilken call activity)
     - När anropas det? (vilka förutsättningar, vilka events)
     - Varför anropas det igen? (vilken ny information har tillkommit)
     - Vad är annorlunda? (vilka specifika input/output-variabler)
   - **Dokumentera enligt mallen:** Använd strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`
   - **Följ strategin:** Se `REUSED_FEATURE_GOALS_STRATEGY.md` för detaljerad strategi

**⚠️ INGEN fil ska hoppas över - Kontrollera alltid om feature goalet är återkommande**

## 📋 Detaljerad exekveringsprocess för varje fil

### 1. Hitta BPMN-filer (helhetsanalys)

**⚠️ VIKTIGT: Analysera helheten, inte bara den direkta processen**

**⚠️ PERMANENT REGEL - LANE-ANALYS:**
- **ALDRIG glöm att analysera lanes i BPMN-filen** - Se `LANE_ANALYSIS_RULE.md` för detaljerad guide
- **ALLTID identifiera vilken lane huvudaktiviteten ligger i** - Detta avgör om processen är kundaktivitet, handläggaraktivitet eller systemaktivitet
- **ALLTID använd korrekt terminologi i beskrivningen** - Matcha beskrivningen med BPMN-filens lanes

**Från `bpmn-map.json` och `FEATURE_GOAL_STATUS.md`:**

**1.1 Feature goal-processen:**
- `{subprocess_bpmn_file}` från bpmn-map.json
- Exempel: `mortgage-se-application.bpmn` för Application

**1.2 Parent-processen:**
- `{parent_bpmn_file}` från bpmn-map.json
- Exempel: `mortgage.bpmn` för Application

**1.3 REKURSIVT: Nested subprocesses (feature goals inuti feature goals):**
- **Identifiera alla call activities** i feature goal-processen
- **För varje call activity:** Hitta motsvarande subprocess-fil från bpmn-map.json
- **REKURSIVT:** Gå igenom alla nivåer av nesting
  - Exempel: Application → Object → Object Control → Object Valuation
  - **Analysera på rätt abstraktionsnivå:**
    - Om nested subprocess är en del av feature goalet: Analysera dess innehåll som del av feature goalet
    - Om nested subprocess är en separat feature goal: Analysera hur den anropas och påverkar feature goalet

**1.4 Relaterade processer:**
- **Processer som feature goal anropar:** Call activities i feature goal-processen och dess nested subprocesses
- **Processer som feature goal går vidare till:** Via sequence flows i parent-processen
- **Event-driven dependencies:** Processer som kan trigga feature goal (via events, eskaleringar, meddelanden)
- **Processer som kan påverka:** Alla processer som kan påverka feature goal via events, eskaleringar, meddelanden, eller indirekta beroenden

**BPMN-filer ligger i:** `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/`

**Hur hitta senaste archive-mappen:**
1. Gå till `tests/fixtures/bpmn/`
2. Hitta alla mappar som matchar mönstret `mortgage-se YYYY.MM.DD HH:MM` (t.ex. `mortgage-se 2025.12.11 17:44`)
3. Sortera efter timestamp (nyast först)
4. Använd den senaste mappen
5. Om ingen mapp finns: Använd `bpmn-map.json` för att hitta BPMN-filer i projektet

**bpmn-map.json ligger i:** Projektroten (`bpmn-map.json`)

**⚠️ INGEN fil ska hoppas över - Analysera helheten, inte bara isolerade delar**

### 2. Analysera BPMN-filer

**Använd regex-baserad parsing (som i `scripts/analyze-feature-goal-sync.ts`):**

**⚠️ PERMANENT REGEL - LANE-ANALYS (ALDRIG GLÖM):**
1. **Sök efter lanes:** Hitta alla `<bpmn:lane` element i BPMN-filen
2. **Identifiera huvudaktiviteten:** Vilken är huvudaktiviteten (t.ex. user task, service task)?
3. **Identifiera lane för huvudaktiviteten:** I vilken lane ligger huvudaktiviteten?
4. **Klassificera processen:**
   - **Kundaktivitet:** Om huvudaktiviteten ligger i "Stakeholder", "Customer", "Primary stakeholder" lane
   - **Handläggaraktivitet:** Om huvudaktiviteten ligger i "Caseworker", "Handläggare", "Compliance" lane
   - **Systemaktivitet:** Om huvudaktiviteten ligger i "System" lane eller är service task/business rule task
5. **Använd korrekt terminologi:** Matcha beskrivningen med BPMN-filens lanes
   - Se `LANE_ANALYSIS_RULE.md` för detaljerad guide och exempel

**Extrahera från feature goal-processen:**
- **Lanes (⚠️ PERMANENT REGEL - ALDRIG GLÖM):**
  - Identifiera alla lanes i BPMN-filen (`<bpmn:lane name="...">`)
  - Identifiera vilken lane huvudaktiviteten ligger i
  - Klassificera processen korrekt baserat på lane (kundaktivitet/handläggaraktivitet/systemaktivitet)
- **Aktiviteter:**
  - `userTask` → **Kontrollera lane:** Om i "Stakeholder"/"Customer" lane = Kunduppgift, om i "Caseworker"/"Compliance" lane = Handläggaruppgift
  - `serviceTask` → Systemuppgifter (t.ex. "Hämta kreditinformation", "Beräkna KALP")
  - `businessRuleTask` → Affärsregler (t.ex. "Screen KALP", "Pre-screen Party")
  - `callActivity` → Anrop till andra processer (t.ex. "Household", "Stakeholder")
- **Gateways:**
  - `exclusiveGateway` → Exklusiva beslut (t.ex. "KALP OK?", "Skip step?")
  - `parallelGateway` → Parallella flöden
  - `inclusiveGateway` → Inklusiva beslut
  - Namnlösa gateways → Dokumentera vad de gör i kontexten
- **Events:**
  - `startEvent` → När processen startar
  - `endEvent` → När processen avslutas
  - `boundaryEvent` (timeout) → Tidsgränser
  - `errorEvent` → Fel (t.ex. "Pre-screen rejected", "Stakeholder rejected")
  - `escalationEvent` → Eskaleringar
  - `messageEvent` → Meddelanden
- **Flöde:** Sequence flows mellan element
- **Multi-instance:** `isSequential`, `loopCharacteristics`
- **Parallellitet:** Parallella gateways och flöden

**Extrahera från parent-processen:**
- Hur anropas feature goal? (beslutspunkt, händelse, villkor)
- Boundary events på call activity (timeout, error, escalation)
- Flöde till/från feature goal
- Beslutspunkter som styr flödet

**Extrahera från nested subprocesses (feature goals inuti feature goals):**

**Steg 1: Identifiera nested subprocesses rekursivt:**
1. För varje call activity i feature goal-processen:
   - Hitta motsvarande subprocess-fil från bpmn-map.json
   - Om subprocess-filen finns: Det är en nested subprocess
2. **REKURSIVT:** För varje nested subprocess:
   - Analysera dess call activities
   - Fortsätt rekursivt tills alla nivåer är analyserade
3. **Exempel:** Application → Object → Object Control → Object Valuation
   - Application innehåller Object (call activity)
   - Object innehåller Object Control och Object Valuation (call activities)
   - Analysera alla nivåer rekursivt

**Steg 2: Identifiera abstraktionsnivå:**
- **Om nested subprocess är en del av feature goalet:**
  - **Indikatorer:** Nested subprocess har inget eget dokument, är en del av feature goalets flöde, anropas direkt från feature goalet
  - **Åtgärd:** Analysera dess innehåll (aktiviteter, gateways, events) som del av feature goalet
  - **Dokumentera:** Hur nested subprocess integreras i feature goalet, flöde och sekvens mellan feature goal och nested subprocess
- **Om nested subprocess är en separat feature goal:**
  - **Indikatorer:** Nested subprocess har eget dokument, är en separat process, kan anropas från flera ställen
  - **Åtgärd:** Analysera hur den anropas från feature goalet, hur den påverkar feature goalet (output, events, eskaleringar)
  - **Dokumentera:** Beroenden mellan feature goal och nested subprocess, hur de samverkar

**Steg 3: Dokumentera helhetsbilden:**
- Beskriv hela kedjan: Application → Object → Object Control/Object Valuation
- Beskriv flöde och sekvens mellan alla nivåer
- Beskriv beroenden och interaktioner mellan nested subprocesses

**Extrahera från relaterade processer:**
- Processer som feature goal anropar (direkt och indirekt via nested subprocesses)
- Processer som feature goal går vidare till
- Event-driven dependencies: Meddelanden, eskaleringar, events som kan trigga eller påverka feature goal
- Processer som kan påverka feature goal via indirekta beroenden

### 3. Förbättra HTML-innehåll

**För varje sektion i HTML-filen:**

#### Beskrivning av FGoal
- **Krav:**
  - Korta meningar, lättläst
  - Nämn vem som utför aktiviteten (kund, handläggare, system)
  - Fokusera på VAD processen gör, inte teknik
  - Affärsorienterat språk
  - **För återkommande feature goals:**
    - **Generell beskrivning först:** Beskriv vad processen gör generellt
    - **Anropningskontexter sedan:** Lägg till en sektion "Anropningskontexter" som listar alla ställen där feature goalet anropas
    - **För varje kontext:** Förklara var det anropas från, när det anropas, varför det anropas igen (vilken ny information), och vad som är annorlunda
- **Exempel (generell):**
  - ✅ "Application är en omfattande kundaktivitet där kunden samlar in och validerar all nödvändig information för en bolåneansökan."
  - ❌ "Application anropas inuti stakeholders subprocess som är multi-instance via Gateway_1v59ktc..."
- **Exempel (återkommande feature goal):**
  - ✅ "Credit Decision är en manuell beslutsprocess där ansökningar bedöms och godkänns eller avvisas baserat på kreditkriterier.\n\n**Anropningskontexter:**\nDenna process anropas från flera ställen i Mortgage-processen:\n- **Huvudprocessen (mortgage.bpmn):** Efter KYC-processen, för initialt kreditbeslut när ansökan är komplett\n- **Offer-processen (mortgage-se-offer.bpmn):** Efter 'Perform advanced underwriting' när kunden begärt ändringar i erbjudandet\n- **Offer-processen - Sales Contract (mortgage-se-offer.bpmn):** Efter 'sales-contract-advanced-underwriting' när kunden begärt ändringar via köpekontrakt"

#### Processteg - Input
- **Krav:**
  - Var specifik: Nämn specifika processsteg, call activities, gateways
  - Beskriv entry point: Hur anropas processen?
  - Lista input-data: Vilka data är tillgängliga vid start?
  - Beskriv förutsättningar: Vilka villkor måste vara uppfyllda?
  - **För återkommande feature goals:**
    - **Generella krav först:** Lista vad som alltid krävs för att processen ska starta
    - **Kontextspecifika krav sedan:** Lägg till en sektion "Kontextspecifika input-krav" som beskriver vad som är specifikt för varje anropningskontext
    - **För varje kontext:** Förklara vilken ny information som har tillkommit, vilka specifika input-variabler som finns, och vilka specifika förutsättningar som måste vara uppfyllda
- **Exempel (generell):**
  - ✅ "Application-processen startar när en kund initierar en bolåneansökan i Mortgage huvudprocessen. Följande information är tillgänglig vid start: Ansöknings-ID, kund-ID, ansökningstyp..."
  - ❌ "Processen startar när data finns"
- **Exempel (återkommande feature goal):**
  - ✅ "Credit Decision-processen startar när:\n- **Generella krav:** All nödvändig information för kreditbeslut är samlad (kreditscore, skuldkvoter, inkomstverifiering, riskfaktorer)\n\n**Kontextspecifika input-krav:**\n- **Huvudprocessen:** KYC-processen är slutförd och ansökan är komplett\n- **Offer-processen - Ändringar:** 'Perform advanced underwriting' är slutförd för de nya förutsättningarna\n- **Offer-processen - Sales Contract:** 'sales-contract-advanced-underwriting' är slutförd och köpekontrakt-ändringar är tillgängliga"

#### Processteg - Output
- **Krav:**
  - Var specifik: Nämn specifika processsteg, error events, datastores
  - Beskriv alla utfall: Happy path, error cases, edge cases
  - Lista output-data: Vilka data produceras?
  - Beskriv error events: Vilka error events kan triggas?
  - Beskriv felmeddelanden: Vad ska användaren se vid fel?
  - **För återkommande feature goals:**
    - **Generella resultat först:** Lista vad som alltid produceras när processen är slutförd
    - **Kontextspecifika resultat sedan:** Lägg till en sektion "Kontextspecifika output-resultat" som beskriver vad som är specifikt för varje anropningskontext
    - **För varje kontext:** Förklara vilka specifika output-variabler som produceras, hur resultatet används i den specifika kontexten, och vilka specifika error events som kan triggas
- **Exempel (generell):**
  - ✅ "När Application-processen är slutförd har följande resultat uppnåtts: Komplett ansökningsdata, KALP-beräkning, Ansökan bekräftad..."
  - ❌ "Processen avslutas när den är klar"
- **Exempel (återkommande feature goal):**
  - ✅ "När Credit Decision-processen är slutförd har följande resultat uppnåtts:\n- **Generella resultat:** Slutgiltigt kreditbeslut (godkänt eller avvisat), beslutsnivå (Board/Committee/Four eyes/Straight through)\n\n**Kontextspecifika output-resultat:**\n- **Huvudprocessen:** Beslut om ansökan ska godkännas eller avvisas, fortsätter till Offer-processen om godkänt\n- **Offer-processen - Ändringar:** Beslut om ändringar kan godkännas, uppdaterat erbjudande kan skapas\n- **Offer-processen - Sales Contract:** Beslut om köpekontrakt-ändringar kan godkännas, uppdaterat erbjudande baserat på köpekontrakt kan skapas"

#### Omfattning
- **Krav:**
  - Var specifik: Nämn specifika processsteg, call activities, gateways, error events
  - Lista alla aktiviteter: User tasks, service tasks, business rule tasks, call activities
  - Beskriv sekvens och parallellitet: Hur flödar processen?
  - Beskriv multi-instance: Om processen har multi-instance-mekanismer
  - Beskriv gateways: Vilka beslutspunkter finns? Vad avgör de?
  - Beskriv error handling: Vilka error events finns? När triggas de?
- **Exempel:**
  - ✅ "Application-processen omfattar följande huvudsteg: 1. Intern datainsamling (Internal data gathering - multi-instance per part, pre-screening via DMN), 2. Objektinformation..."
  - ❌ "Processen innehåller olika steg"

#### Beroenden
- **Krav:**
  - Var specifik: Nämn specifika system, API:er, integrationer
  - Beskriv vad som behövs: Vad behöver varje beroende tillhandahålla?
  - Beskriv när det används: När i processen används varje beroende?

#### BPMN - Process
- **Krav:**
  - Beskriv processflödet: Hur flödar processen? Vilka steg kommer i vilken ordning?
  - Beskriv gateways: Vilka beslutspunkter finns? Vad avgör de?
  - Beskriv error events: Vilka error events finns? När triggas de?
  - Beskriv multi-instance och parallellitet: Om processen har multi-instance eller parallella flöden
  - **För återkommande feature goals:**
    - **Generellt processflöde först:** Beskriv hur processen fungerar generellt
    - **Anropningsställen sedan:** Lägg till en sektion "Anropningsställen" som listar alla ställen där processen anropas
    - **För varje anropningsställe:** Förklara hur processen anropas från det stället, vilka specifika flöden som används, och hur resultatet returneras

#### Effekt
- **Krav:**
  - Var specifik: Beskriv exakt hur detta feature goal bidrar till affärseffekter genom att nämna specifika processsteg
  - Var mätbar: Använd konkreta siffror eller procent (t.ex. "30-40%", "25-35%")
  - Koppla till feature goalet: Förklara specifikt hur detta feature goal bidrar till effekten
  - Fokusera på affärsvärde: Automatisering, snabbare processer, bättre kvalitet, minskade kostnader
  - Organisera i kategorier: För komplexa feature goals, organisera i kategorier med underrubriker
- **Exempel:**
  - ✅ "Automatisk datainsamling via 'Internal data gathering': Systemet hämtar automatiskt befintlig kunddata från interna system för alla identifierade parter (multi-instance). För återkommande kunder elimineras detta behovet av manuell datainmatning, vilket kan minska handläggningstid med upp till 40% för kända kunder jämfört med manuell process."
  - ❌ "Ökad automatisering"

#### User stories
**⚠️ SYSTEMATISK PROCESS - FÖLJ USER_STORY_IMPROVEMENT_PROMPT.md:**

**Grundläggande krav:**
- Använd standardformat: "Som [specifik persona] vill jag [konkret mål med BPMN-referens] så att [tydligt värde]"
- Var realistisk: User stories ska vara relevanta och uppnåbara
- Fokusera på användarens perspektiv: Beskriv vad användaren vill uppnå
- Koppla till feature goalet: User stories ska vara direkt relaterade till feature goalets funktionalitet
- Organisera i kategorier: För komplexa feature goals, organisera i kategorier (t.ex. "Systemperspektiv", "Handläggarperspektiv", "Kundperspektiv")
- Var specifik: Nämn specifika processsteg, call activities, gateways, error events med BPMN-ID:n
- Inkludera acceptanskriterier: För alla user stories, lägg till acceptanskriterier direkt i user story:n (i kursiv stil) med BPMN-referenser

**Systematisk förbättringsprocess:**
1. **Analysera BPMN-processen:** Identifiera alla user tasks, service tasks, gateways, events och personor
2. **Analysera befintliga user stories:** Validera mot BPMN, identifiera brister
3. **Identifiera saknade user stories:** Per BPMN-element, per persona, per flöde
4. **Förbättra befintliga user stories:** Specifika persona, konkret mål, tydligt värde, specifika acceptanskriterier
5. **Skapa nya user stories:** För saknade BPMN-element/personor
6. **Ta bort onödiga user stories:** Duplicerade, irrelevanta, för generiska
7. **Validera slutresultat:** Kompletthet, kvalitet, konsistens

**⚠️ LÄS USER_STORY_IMPROVEMENT_PROMPT.md FÖR DETALJERAD PROCESS OCH USER_STORY_ANALYSIS.md FÖR BEST PRACTICES**

- **Exempel:**
  - ✅ "Som handläggare vill jag kunna skicka påminnelser till kunder om väntande signeringar via 'Manual reminder' boundary event (Event_1kyqkxc) på 'Upload document' user task (upload-manual-document) så att kunder påminns om att signera dokument. <em>Acceptanskriterier: Handläggare ska kunna skicka påminnelser via 'Manual reminder' boundary event (Event_1kyqkxc) på 'Upload document' user task (upload-manual-document), och påminnelse ska skickas via 'Send reminder' intermediate throw event (Event_1esbspy) med escalation code 'send-reminder'.</em>"
  - ❌ "Som användare vill jag hantera signering så att processen fungerar"

#### Acceptanskriterier
- **Krav:**
  - Var specifik och testbar: Acceptanskriterier ska vara konkreta och möjliga att verifiera
  - Använd "ska"-formuleringar: Formulera som krav (t.ex. "Systemet ska...")
  - Koppla till feature goalet: Acceptanskriterier ska vara direkt relaterade till feature goalets funktionalitet
  - Fokusera på beteende: Beskriv vad systemet ska göra, inte hur det implementeras
  - Nämn specifika processsteg: Referera till specifika call activities, gateways, error events, datastores
  - Inkludera konkreta krav: Specificera timeout-värden, valideringsregler, felmeddelanden, UI/UX-krav
  - Organisera i kategorier: För komplexa feature goals, organisera i kategorier baserat på processsteg
  - Beskriv felhantering: Specificera hur error events ska hanteras
- **Exempel:**
  - ✅ "Systemet ska automatiskt hämta befintlig kunddata från interna system (part, engagemang, kreditinformation) för alla identifierade parter i ansökan via 'Internal data gathering' call activity"
  - ❌ "Systemet ska fungera bra"

### 4. Ersätt tekniska ID:n

**För alla tekniska ID:n i HTML-filen:**
- `Gateway_1v59ktc` → "KALP OK?" gateway (eller beskrivande namn baserat på kontext)
- `Event_111bwbu` → "Timeout" event (eller beskrivande namn baserat på kontext)
- `Activity_1mezc6h` → "Confirm application" user task (eller beskrivande namn baserat på kontext)

**Strategi:**
1. Hitta tekniskt ID i HTML
2. Sök efter elementet i BPMN-filen
3. Extrahera namn från BPMN (eller skapa beskrivande namn baserat på kontext)
4. Ersätt tekniskt ID med beskrivande namn i HTML

### 5. Gör texten lättläst och affärsorienterad

**För alla sektioner:**
- Använd korta meningar
- Undvik långa, komplexa meningar med många kommatecken
- Använd affärstermer, inte bara tekniska termer
- Beskriv värde och syfte, inte bara mekanik
- Var konkret om vad som händer
- Strukturera innehållet med rubriker, underrubriker och listor

### 6. Spara och markera

**Efter att ha förbättrat filen:**
1. Spara HTML-filen
2. Markera som förbättrad i `FEATURE_GOAL_STATUS.md` med `[x]`
3. Rapportera kortfattat (t.ex. "✅ Application: Förbättrad beskrivning, lagt till saknade aktiviteter, ersatt tekniska ID:n")

## 🔧 Tekniska detaljer

### BPMN-parsing

**Använd regex-baserad parsing (som i `scripts/analyze-feature-goal-sync.ts`):**

```typescript
// Extrahera attribut
function getAttr(element: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
  const match = regex.exec(element);
  return match ? match[1] : '';
}

// Extrahera userTask
const userTaskRegex = /<(?:bpmn:)?userTask[^>]*>/gi;
while ((match = userTaskRegex.exec(content)) !== null) {
  const id = getAttr(match[0], 'id');
  const name = getAttr(match[0], 'name') || id;
  // ...
}
```

### HTML-parsing och uppdatering

**Använd regex för att hitta och uppdatera sektioner:**

```typescript
// Hitta sektion
const sectionRegex = /<section[^>]*class="doc-section"[^>]*>[\s\S]*?<summary>Beskrivning av FGoal<\/summary>[\s\S]*?<div class="section-content">([\s\S]*?)<\/div>[\s\S]*?<\/details>[\s\S]*?<\/section>/i;

// Ersätt innehåll
html = html.replace(sectionRegex, (match, content) => {
  const newContent = generateImprovedContent(bpmnAnalysis);
  return match.replace(content, newContent);
});
```

## ✅ Kvalitetschecklista - MÅSTE GENOMFÖRAS FÖR VARJE FIL

**⚠️ KRITISK: Denna checklista MÅSTE genomföras för varje fil innan jag går vidare till nästa fil.**

**För varje fil, kontrollera:**
- [ ] **⚠️ LANE-ANALYS - PERMANENT REGEL (ALDRIG GLÖM):**
  - [ ] Har jag analyserat lanes i BPMN-filen?
  - [ ] Har jag identifierat vilken lane huvudaktiviteten ligger i?
  - [ ] Har jag klassificerat processen korrekt (kundaktivitet/handläggaraktivitet/systemaktivitet)?
  - [ ] Använder jag korrekt terminologi i beskrivningen (matchar med BPMN-filens lanes)?
  - [ ] Se `LANE_ANALYSIS_RULE.md` för detaljerad guide
- [ ] **ALLA tekniska ID:n är ersatta** - Inget tekniskt ID (Gateway_xxx, Event_xxx, Activity_xxx) får lämnas kvar
- [ ] **ALLA sektioner är uppdaterade** - Beskrivning av FGoal, Input, Output, Omfattning, Avgränsning, Beroenden, BPMN - Process, Effekt, User stories, Acceptanskriterier
- [ ] **⚠️ USER STORIES - SYSTEMATISK PROCESS (ALDRIG GLÖM):**
  - [ ] Har jag analyserat BPMN-processen för att identifiera alla user tasks, service tasks, gateways, events och personor?
  - [ ] Har jag analyserat befintliga user stories mot BPMN och identifierat brister?
  - [ ] Har jag identifierat saknade user stories (per BPMN-element, per persona, per flöde)?
  - [ ] Har jag förbättrat befintliga user stories (specifika persona, konkret mål, tydligt värde, specifika acceptanskriterier med BPMN-ID:n)?
  - [ ] Har jag skapat nya user stories för saknade BPMN-element/personor?
  - [ ] Har jag tagit bort onödiga user stories (duplicerade, irrelevanta, för generiska)?
  - [ ] Har jag validerat slutresultatet (kompletthet, kvalitet, konsistens)?
  - [ ] Se `USER_STORY_IMPROVEMENT_PROMPT.md` för detaljerad process
- [ ] **Text är lättläst och affärsorienterad** - Inga långa, komplexa meningar, använd affärstermer
- [ ] **ALLA aktiviteter är dokumenterade** - User tasks, service tasks, business rule tasks, call activities
- [ ] **ALLA gateways är dokumenterade** - Exklusiva, parallella, inklusiva, namnlösa (med beskrivning av vad de gör)
- [ ] **ALLA events är dokumenterade** - Start, end, error, timeout, escalation, message events
- [ ] **Flöde och sekvens är tydligt beskrivna** - Hur processen flödar från steg till steg
- [ ] **Error handling är dokumenterad** - Alla error events, när de triggas, vad som händer
- [ ] **Multi-instance och parallellitet är förklarade** - Om processen har multi-instance eller parallella flöden
- [ ] **Parent-processen är analyserad** - Hur anropas feature goal? Boundary events? Flöde till/från?
- [ ] **Nested subprocesses är analyserade** - ALLA feature goals inuti feature goals (REKURSIVT, alla nivåer)
- [ ] **Abstraktionsnivå är korrekt** - Analysera på rätt nivå (del av feature goal vs separat feature goal)
- [ ] **Relaterade processer är analyserade** - Call activities, nästa processer, event-driven dependencies
- [ ] **Helhetsanalys är genomförd** - Alla BPMN-filer som kan påverka feature goalet är analyserade
- [ ] **⚠️ ÅTERKOMMANDE FEATURE GOALS - PERMANENT REGEL (ALDRIG GLÖM):**
  - [ ] Har jag kört `npx tsx scripts/analyze-reused-feature-goals.ts` för att identifiera återkommande feature goals?
  - [ ] Om feature goalet anropas från flera ställen (kontrollera i `REUSED_FEATURE_GOALS_ANALYSIS.md`), har jag lagt till "Anropningskontexter" sektion i Beskrivning?
  - [ ] Har jag lagt till kontextspecifika input/output-krav?
  - [ ] Följer jag strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`?
  - [ ] **OM FEATURE GOALET ÄR ÅTERKOMMANDE OCH INTE HAR "ANROPNINGSKONTEXTER" SEKTION - FIXA DET INNAN DU GÅR VIDARE. DETTA ÄR EN PERMANENT REGEL.**
- [ ] **⚠️ BPMN-DIAGRAMGENERERING - PERMANENT REGEL (ALDRIG GLÖM):**
  - [ ] Har jag kört `npm run generate:bpmn-diagrams` för att generera BPMN-diagram?
  - [ ] Har jag verifierat att "Process Diagram" kapitel finns i HTML-filen?
  - [ ] Har jag verifierat att diagrammet är embeddat som base64 (fristående, inga externa filer)?
  - [ ] **OM BPMN-DIAGRAM SAKNAS - KÖR SCRIPTET INNAN DU GÅR VIDARE. DETTA ÄR EN PERMANENT REGEL. INGEN FIL ÄR KLAR FÖRRÄN BPMN-DIAGRAM ÄR GENERERAT OCH EMBEDDAT.**
- [ ] **⚠️ VALIDERING FÖR MÅLGRUPPER - PERMANENT REGEL (ALDRIG GLÖM):**
  - [ ] Har jag validerat dokumentet för alla målgrupper enligt `TARGET_AUDIENCE_VALIDATION.md`?
  - [ ] Har jag gått igenom checklistan för varje målgrupp (Produktägare, Testare, Utvecklare, Designer, Handläggare, Tvärfunktionellt team, Arkitekt, Business Analyst)?
  - [ ] Har jag identifierat och fixat all saknad information för varje målgrupp?
  - [ ] Har jag itererat tills alla checklistor är kompletta?
  - [ ] **OM NÅGON MÅLGRUPP SAKNAR INFORMATION - FIXA DET INNAN DU GÅR VIDARE. DETTA ÄR EN PERMANENT REGEL. INGEN FIL ÄR KLAR FÖRRÄN ALLA MÅLGRUPPER HAR ALL INFORMATION DE BEHÖVER.**
- [ ] **⚠️ FILNAMN - HIERARKISKA FILNAMN (matchar Jira-namnen):**
  - [ ] Om jag skapar en ny fil, har jag använt hierarkiskt filnamn för icke-återkommande feature goals?
  - [ ] Format: `{parent_bpmn_file}-{elementId}-v2.html` (t.ex. `mortgage-se-application-internal-data-gathering-v2.html`)
  - [ ] Har jag använt `getFeatureGoalDocFileKey` med `parentBpmnFile` parameter när parent-processen är känd?
  - [ ] För återkommande feature goals: Har jag behållit legacy-namn (t.ex. `mortgage-se-credit-evaluation-v2.html`)?
  - [ ] Matchar filnamnet Jira-namnet? (t.ex. "Application - Internal data gathering" → `mortgage-se-application-internal-data-gathering-v2.html`)
- [ ] **Filen är markerad som förbättrad** i status-listan med `[x]`

**⚠️ OM NÅGOT PÅ LISTAN INTE ÄR KLART - FIXA DET INNAN DU GÅR VIDARE TILL NÄSTA FIL. INGA UNDANTAG.**

## 📝 Exempel på exekvering

**När användaren frågar:**
> "Hur uppdaterar vi HTML-innehållet i mappen /Users/magnusolovson/Documents/Projects/bpmn-planner/public/local-content/feature-goals?"

**Jag svarar:**
> "Jag kommer att:
> 1. Analysera **ALLA** BPMN-filer grundligt (feature goal-processen, parent-processen, **ALLA** relaterade processer)
> 2. Extrahera **ALLA** aktiviteter, gateways, events, flöde (inget hoppas över)
> 3. Förbättra **ALLA** sektioner i HTML-filerna med beskrivande, affärsorienterad text (ingen sektion hoppas över)
> 4. Ersätta **ALLA** tekniska ID:n med beskrivande namn (inget tekniskt ID lämnas kvar)
> 5. Gör texten lättläst och affärsorienterad (inga shortcuts, ingen generisk text)
> 
> **Kvalitet är absolut nödvändigt** - Jag kommer att ta den tid som behövs för varje fil, även om det är 100 filer. Inga shortcuts är tillåtna.
> 
> Jag kommer att arbeta systematiskt genom alla filer i `FEATURE_GOAL_STATUS.md` som inte är markerade som förbättrade, en fil i taget, tills alla är klara. Varje fil ska vara perfekt innan jag går vidare.
> 
> Ska jag börja förbättra innehållet i alla filer nu?"

**Om användaren säger ja:**
> Jag exekverar automatiskt enligt planen ovan, fil för fil, tills alla är klara. **Jag följer kvalitetschecklistan för varje fil och tar den tid som behövs. Inga shortcuts. Inga undantag.**

## 🔒 Kvalitetsgaranti - ALDRIG DEFAULTA TILL NÅGOT ANNAT

**⚠️ DETTA ÄR DET VIKTIGASTE I HELA PLANEN. JAG FÅR ALDRIG DEFAULTA TILL NÅGOT ANNAT.**

**För att säkerställa att jag aldrig defaultar till shortcuts eller "fuskar" med innehållet:**

### 1. För varje fil MÅSTE jag:
- ✅ Genomföra hela BPMN-analysen (alla filer, alla element) - **INGEN fil eller element hoppas över**
- ✅ Förbättra alla sektioner (ingen hoppas över) - **ALLA sektioner måste vara perfekta**
- ✅ Ersätta alla tekniska ID:n (inget lämnas kvar) - **ALLA tekniska ID:n måste ersättas**
- ✅ Genomföra kvalitetschecklistan (alla punkter måste vara klara) - **ALLA punkter måste vara ✅**

### 2. Om jag känner att jag vill ta en shortcut:
- ⛔ **STOPPA OMEDELBART**
- ⛔ Kom ihåg: Kvalitet är absolut nödvändigt
- ⛔ Ta den tid som behövs istället
- ⛔ Följ planen exakt, punkt för punkt

### 3. Om en fil tar längre tid än förväntat:
- ✅ Det är OK - kvalitet är viktigare än hastighet
- ✅ Fortsätt enligt planen, punkt för punkt
- ✅ Ta den tid som behövs
- ✅ Varje fil ska vara perfekt innan jag går vidare

### 4. Om jag känner att jag vill "fuska" eller hitta på saker:
- ⛔ **STOPPA OMEDELBART**
- ⛔ Kom ihåg: Inga shortcuts är tillåtna
- ⛔ Använd BPMN-filerna som källa - hitta inte på saker
- ⛔ Följ riktlinjerna exakt - var specifik, inte generisk

**Detta är absolut nödvändigt för att processen ska vara användbar. Inga shortcuts är tillåtna. Jag får ALDRIG defaulta till något annat.**

