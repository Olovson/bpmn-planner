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

**Kvalitet är absolut nödvändigt. Om det tar längre tid, även om det är 100 filer, måste jag ta den tiden. Inga shortcuts är tillåtna.**

**⚠️ DETTA ÄR DET VIKTIGASTE I HELA PLANEN. JAG FÅR ALDRIG DEFAULTA TILL NÅGOT ANNAT. KVALITET ÄR ALLT. INGA SHORTCUTS. INGA UNDANTAG.**

## 🎯 När användaren frågar om att uppdatera HTML-innehållet

### Steg 1: Kortfattat förklara approach

**Jag ska förklara:**
1. **Vad jag ska göra:** Förbättra innehållet i alla HTML-filer i `public/local-content/feature-goals/` baserat på BPMN-filer
2. **Hur jag gör det:**
   - Analyserar BPMN-filer (feature goal-processen, parent-processen, relaterade processer)
   - Extraherar alla aktiviteter, gateways, events, flöde
   - Uppdaterar alla sektioner i HTML-filerna med beskrivande, affärsorienterad text
   - Ersätter alla tekniska ID:n med beskrivande namn
   - Gör texten lättläst och affärsorienterad
3. **Vilka filer:** Alla filer i `FEATURE_GOAL_STATUS.md` som inte är markerade som förbättrade
4. **Kvalitet:** Varje fil uppdateras till perfektion enligt riktlinjerna i `MANUAL_HTML_WORKFLOW.md`

### Steg 2: Fråga om jag ska göra det

**Jag ska fråga:** "Ska jag börja förbättra innehållet i alla filer nu?"

### Steg 3: Automatisk exekvering (om användaren säger ja)

**⚠️ KRITISK: Kvalitet före hastighet - INGA SHORTCUTS**

**Jag ska automatiskt:**

1. **Köra scripts för att identifiera filer:**
   ```bash
   npx tsx scripts/analyze-feature-goal-sync.ts
   npx tsx scripts/auto-update-feature-goal-docs.ts
   npx tsx scripts/generate-feature-goal-status.ts
   ```

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
   
   c. **Analysera ALLA BPMN-filer grundligt (på rätt abstraktionsnivå):**
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
   
   j. **Rapportera kortfattat** (t.ex. "✅ Application: Förbättrad beskrivning, lagt till saknade aktiviteter, ersatt alla tekniska ID:n")
   
   **⚠️ VIKTIGT:** 
   - Ta den tid som behövs för varje fil
   - Varje fil ska vara perfekt innan jag går vidare
   - Om det tar längre tid, även om det är 100 filer, måste jag ta den tiden
   - **INGA SHORTCUTS ÄR TILLÅTNA**

3. **Fortsätt tills alla filer är klara** - **INGEN fil ska hoppas över**

## 📋 Detaljerad exekveringsprocess för varje fil

### 1. Hitta BPMN-filer (helhetsanalys)

**⚠️ VIKTIGT: Analysera helheten, inte bara den direkta processen**

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

**Extrahera från feature goal-processen:**
- **Aktiviteter:**
  - `userTask` → Kunduppgifter (t.ex. "Registrera hushållsekonomi", "Bekräfta ansökan")
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
- **Exempel:**
  - ✅ "Application är en omfattande kundaktivitet där kunden samlar in och validerar all nödvändig information för en bolåneansökan."
  - ❌ "Application anropas inuti stakeholders subprocess som är multi-instance via Gateway_1v59ktc..."

#### Processteg - Input
- **Krav:**
  - Var specifik: Nämn specifika processsteg, call activities, gateways
  - Beskriv entry point: Hur anropas processen?
  - Lista input-data: Vilka data är tillgängliga vid start?
  - Beskriv förutsättningar: Vilka villkor måste vara uppfyllda?
- **Exempel:**
  - ✅ "Application-processen startar när en kund initierar en bolåneansökan i Mortgage huvudprocessen. Följande information är tillgänglig vid start: Ansöknings-ID, kund-ID, ansökningstyp..."
  - ❌ "Processen startar när data finns"

#### Processteg - Output
- **Krav:**
  - Var specifik: Nämn specifika processsteg, error events, datastores
  - Beskriv alla utfall: Happy path, error cases, edge cases
  - Lista output-data: Vilka data produceras?
  - Beskriv error events: Vilka error events kan triggas?
  - Beskriv felmeddelanden: Vad ska användaren se vid fel?
- **Exempel:**
  - ✅ "När Application-processen är slutförd har följande resultat uppnåtts: Komplett ansökningsdata, KALP-beräkning, Ansökan bekräftad..."
  - ❌ "Processen avslutas när den är klar"

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
- **Krav:**
  - Använd standardformat: "Som [roll] vill jag [mål] så att [värde]"
  - Var realistisk: User stories ska vara relevanta och uppnåbara
  - Fokusera på användarens perspektiv: Beskriv vad användaren vill uppnå
  - Koppla till feature goalet: User stories ska vara direkt relaterade till feature goalets funktionalitet
  - Organisera i kategorier: För komplexa feature goals, organisera i kategorier (t.ex. "Kundperspektiv", "Handläggarperspektiv")
  - Var specifik: Nämn specifika processsteg, call activities, gateways, error events
  - Inkludera acceptanskriterier: För viktiga user stories, lägg till acceptanskriterier direkt i user story:n (i kursiv stil)
- **Exempel:**
  - ✅ "Som kund vill jag att systemet automatiskt hämtar min befintliga information via 'Internal data gathering' (part, engagemang, kreditinformation) så att jag inte behöver fylla i information som banken redan har om mig. <em>Acceptanskriterier: Systemet ska visa hämtad information i ett tydligt format, markera fält som är auto-ifyllda, och tillåta mig att ändra information om den är felaktig.</em>"
  - ❌ "Som kund vill jag att systemet hämtar information så att det fungerar"

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
- [ ] **ALLA tekniska ID:n är ersatta** - Inget tekniskt ID (Gateway_xxx, Event_xxx, Activity_xxx) får lämnas kvar
- [ ] **ALLA sektioner är uppdaterade** - Beskrivning av FGoal, Input, Output, Omfattning, Avgränsning, Beroenden, BPMN - Process, Effekt, User stories, Acceptanskriterier
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

