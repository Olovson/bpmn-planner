# Strategi: Komplett BPMN-analys för E2E-scenarion

## Problem
Vi kan inte definiera realistiska e2e-scenarion genom att bara titta på en BPMN-fil i taget. Vi behöver:
1. **Översikt över alla BPMN-filer** och deras relationer
2. **Förstå hela processhierarkin** från root till leaf-noder
3. **Identifiera huvudflöden** genom hela processen
4. **Sedan** definiera e2e-scenarion baserat på helheten

---

## Strategi: Systematisk analys i steg

### Fas 1: Bygg komplett BPMN-översikt

#### Steg 1.1: Extrahera alla BPMN-filer och deras struktur

**Källor:**
- `bpmn-map.json` (har redan strukturen)
- `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11/` (alla BPMN-filer)
- `buildBpmnProcessGraph` (verktyg i koden)

**Metod:**
1. **Lista alla BPMN-filer** (21 filer totalt)
2. **För varje fil, extrahera:**
   - Process-ID
   - Process-namn
   - Alla call activities (med subprocess-filer)
   - Alla user tasks, service tasks, business rule tasks
   - Alla gateways och deras utgående flöden
   - Alla events (start, end, boundary, escalation)
   - Multi-instance flaggor
   - Sequence flows (för att förstå körordning)

**Output:** Strukturerad JSON/TypeScript-typ med alla processer och deras noder

#### Steg 1.2: Bygg processhierarki

**Använd befintliga verktyg:**
- `buildBpmnProcessGraph` - bygger graf över alla processer
- `buildProcessHierarchy` - bygger hierarkin

**Metod:**
1. **Starta från root**: `mortgage.bpmn`
2. **Följ call activities** rekursivt:
   - `application` → `mortgage-se-application.bpmn`
   - `kyc` → `mortgage-se-kyc.bpmn`
   - etc.
3. **För varje subprocess, följ dess call activities**:
   - `mortgage-se-application.bpmn` har:
     - `internal-data-gathering` → `mortgage-se-internal-data-gathering.bpmn`
     - `object` → `mortgage-se-object.bpmn`
     - `stakeholders` subprocess → `household` → `stakeholder` → etc.

**Output:** Hierarkisk struktur som visar hela processen från root till leaf

#### Steg 1.3: Identifiera huvudflöden

**Metod:**
1. **Följ sequence flows** från start-event till end-event i varje process
2. **Identifiera parallella flöden** (gateways med parallella utgångar)
3. **Identifiera alternativa flöden** (gateways med exklusiva utgångar)
4. **Identifiera error paths** (boundary events, escalation events)
5. **Identifiera multi-instance loops** (körs flera gånger)

**Output:** Lista över huvudflöden med:
- Sekvensordning
- Parallella steg
- Alternativa steg
- Error paths

---

### Fas 2: Identifiera Feature Goals och User Stories

#### Steg 2.1: Mappa Feature Goals till BPMN-processer

**Källor:**
- `public/local-content/feature-goals/*.html`
- `bpmn-map.json` (koppling mellan BPMN-filer och Feature Goals)

**Metod:**
1. **För varje BPMN-process**, hitta motsvarande Feature Goal-fil
2. **Extrahera testscenarion** (S1, S2, S3, etc.) från Feature Goals
3. **Extrahera user stories** och deras acceptanskriterier
4. **Extrahera UI Flow** för varje testscenario

**Output:** Mappning mellan BPMN-processer och Feature Goals med testscenarion

#### Steg 2.2: Identifiera kritiska user stories

**Metod:**
1. **För varje Feature Goal**, identifiera:
   - User stories med P0-prioritet
   - User stories som täcker huvudflöden
   - User stories som täcker multi-instance (flera personer, hushåll, etc.)
2. **Prioritera** baserat på:
   - Affärskritikalitet
   - Kundflöde (hur ofta används det?)
   - Komplexitet (multi-instance, parallella flöden)

**Output:** Lista över kritiska user stories per process

---

### Fas 3: Identifiera E2E-scenarion baserat på helheten

#### Steg 3.1: Identifiera end-to-end flöden

**Metod:**
1. **Följ huvudflödet** från `mortgage.bpmn` start-event till end-event:
   - `application` → `kyc` → `credit-evaluation` → `credit-decision` → `offer` → `signing` → `disbursement`
2. **Identifiera alternativa flöden**:
   - `application` → `appeal` → `manual-credit-evaluation`
   - `mortgage-commitment` (parallellt flöde för köpare)
3. **Identifiera error paths**:
   - Pre-screen avvisad → processen avslutas
   - Stakeholder avvisad → processen avslutas
   - KYC avvisad → processen avslutas

**Output:** Lista över end-to-end flöden genom hela processen

#### Steg 3.2: Prioritera E2E-scenarion

**Kriterier:**
1. **P0 - Kritiska happy path-flöden:**
   - Helt genom hela processen (från application till disbursement)
   - Täcker vanligaste kundflödet
   - Inkluderar multi-instance (flera personer, hushåll)

2. **P0 - Kritiska error paths:**
   - Pre-screen avvisad
   - KYC avvisad
   - Credit decision avvisad

3. **P1 - Viktiga alternativa flöden:**
   - Appeal-flöde
   - Mortgage commitment (parallellt flöde)
   - Skip bekräftelse

**Output:** Prioriterad lista över E2E-scenarion

#### Steg 3.3: Bygg E2E-scenario-struktur

**För varje E2E-scenario:**
1. **Identifiera alla processer** som ingår (från root till leaf)
2. **Identifiera alla noder** i sekvensordning
3. **Identifiera multi-instance** (vilka noder körs flera gånger?)
4. **Identifiera parallella flöden** (vilka steg körs parallellt?)
5. **Identifiera gateways** och deras beslut
6. **Identifiera error paths** (vilka boundary events kan triggas?)

**Output:** Komplett E2E-scenario-struktur med alla noder i rätt ordning

---

## Implementeringsplan

### Steg 1: Använd befintliga verktyg för BPMN-översikt

**Befintliga verktyg:**
1. ✅ `buildBpmnProcessGraph` - bygger graf med hierarki och execution order
2. ✅ `bpmn-tree-output.md` - exporterar hela BPMN-trädet med hierarki och ordning
3. ✅ `assignExecutionOrder` - tilldelar orderIndex baserat på sequence flows

**Metod:**
- **Använd `bpmn-tree-output.md`** som grund för hierarkisk struktur
- **Använd `buildBpmnProcessGraph`** för att få execution order och flöden
- **Använd `bpmn-map.json`** för att mappa call activities till subprocess-filer
- **Läs faktiska BPMN-filer** för att identifiera gateways, boundary events, och error paths

**Filer att skapa/uppdatera:**
1. `docs/E2E_BPMN_COMPLETE_OVERVIEW.md` - Översikt baserad på befintliga verktyg
2. `docs/E2E_MAIN_FLOWS.md` - Huvudflöden identifierade från BPMN sequence flows

### Steg 2: Skapa Feature Goal-mappning

**Filer att skapa:**
1. `docs/E2E_FEATURE_GOAL_MAPPING.md` - Mappning mellan BPMN-processer och Feature Goals
2. `docs/E2E_USER_STORIES_OVERVIEW.md` - Översikt över user stories per process

**Metod:**
- Gå igenom alla Feature Goal-filer
- Extrahera testscenarion och user stories
- Mappa till BPMN-processer

### Steg 3: Identifiera E2E-scenarion

**Filer att skapa:**
1. `docs/E2E_SCENARIOS_IDENTIFIED.md` - Identifierade E2E-scenarion
2. `docs/E2E_SCENARIO_PRIORITIZATION.md` - Prioritering av scenarion

**Metod:**
- Följ huvudflöden från Fas 1
- Kombinera med Feature Goal testscenarion från Fas 2
- Prioritera baserat på affärskritikalitet

---

## Verktyg och hjälpfunktioner

### 1. Använd befintliga verktyg för BPMN-översikt

**Befintliga verktyg:**
- ✅ `buildBpmnProcessGraph` - bygger graf med hierarki och execution order
- ✅ `bpmn-tree-output.md` - exporterar hela BPMN-trädet (genereras via `tests/integration/print-bpmn-tree.test.ts`)
- ✅ `assignExecutionOrder` - tilldelar orderIndex baserat på sequence flows
- ✅ `bpmn-map.json` - mappning mellan call activities och subprocess-filer

**Metod:**
- Använd `bpmn-tree-output.md` som grund för hierarkisk struktur och execution order
- Använd `buildBpmnProcessGraph` för att få execution order och flöden programmatiskt
- Lägg till information om gateways, boundary events, och error paths från faktiska BPMN-filer
- Använd `bpmn-map.json` för att mappa call activities till subprocess-filer

### 2. Mappa Feature Goals (manuellt eller via script)

**Metod:**
1. Läsa alla Feature Goal HTML-filer i `public/local-content/feature-goals/`
2. Extrahera testscenarion (S1, S2, etc.) och user stories
3. Mappa till BPMN-processer via `bpmn-map.json`
4. Dokumentera i `docs/E2E_FEATURE_GOAL_MAPPING.md`

**Notera:** Detta kan göras manuellt eller via ett script om det behövs automatisering

---

## Status

### ✅ Steg 1: BPMN-översikt (KLAR)
- **Dokument:** `docs/E2E_BPMN_COMPLETE_OVERVIEW.md`
- **Innehåll:**
  - Alla 21 BPMN-filer listade
  - Hierarkisk struktur (4 nivåer)
  - Huvudflöden identifierade
  - Multi-instance processer dokumenterade
  - Error paths dokumenterade

### 🔄 Steg 2: Feature Goal-mappning (PÅGÅENDE)
- **Nästa:** Gå igenom alla Feature Goal-filer och extrahera testscenarion
- **Output:** `docs/E2E_FEATURE_GOAL_MAPPING.md`

### ⏳ Steg 3: Identifiera E2E-scenarion (VÄNTAR)
- **När:** Efter Feature Goal-mappning är klar
- **Output:** `docs/E2E_SCENARIOS_IDENTIFIED.md`

### ⏳ Steg 4: Bygg realistiska scenarion (VÄNTAR)
- **När:** Efter scenarion är identifierade
- **Output:** Uppdatera `E2eTestsOverviewPage.tsx` med nya scenarion

---

## Nästa steg

### Omedelbart

1. **Mappa Feature Goals:**
   - Gå igenom alla Feature Goal HTML-filer i `public/local-content/feature-goals/`
   - Extrahera testscenarion (S1, S2, S3, etc.) för varje process
   - Extrahera user stories och acceptanskriterier
   - Mappa till BPMN-processer via `bpmn-map.json`
   - **Output:** `docs/E2E_FEATURE_GOAL_MAPPING.md`

2. **Identifiera E2E-scenarion:**
   - Kombinera huvudflöden från BPMN-översikten med Feature Goal testscenarion
   - Identifiera scenarion som täcker:
     - Happy path (refinansiering)
     - Happy path (köp)
     - Happy path med medsökare (multi-instance)
     - Error paths (application avvisad, KYC avvisad, etc.)
     - Alternative paths (appeal, advance)
   - Prioritera baserat på affärskritikalitet
   - **Output:** `docs/E2E_SCENARIOS_IDENTIFIED.md`

3. **Bygg realistiska scenarion:**
   - Följ strategin i `E2E_REALISTIC_SCENARIOS_STRATEGY.md`
   - Använd faktiska BPMN-node-ID:n från översikten
   - Använd Feature Goal testscenarion
   - Uppdatera `E2eTestsOverviewPage.tsx`

---

## Begränsningar och lösningar

### Problem: För mycket information för en analys

**Lösning:** Dela upp i steg:
1. **Fas 1**: Bygg översikt (kan göras systematiskt med script)
2. **Fas 2**: Mappa Feature Goals (kan göras systematiskt med script)
3. **Fas 3**: Identifiera scenarion (kräver manuell analys baserat på översikten)

### Problem: Komplex hierarki med många nivåer

**Lösning:** Använd befintliga verktyg:
- `buildBpmnProcessGraph` hanterar redan komplexiteten
- `buildProcessHierarchy` bygger hierarkin rekursivt
- Använd dessa verktyg istället för att bygga från scratch

### Problem: Multi-instance och parallella flöden

**Lösning:** Dokumentera tydligt:
- För varje call activity, dokumentera om den är multi-instance
- För varje subprocess, dokumentera om den är multi-instance
- För varje gateway, dokumentera om flöden är parallella eller exklusiva

---

## Rekommendation

**Starta med att bygga översikten systematiskt:**

1. **Använd `bpmn-map.json`** som grund (har redan strukturen)
2. **Använd `buildBpmnProcessGraph`** för att bygga hierarkin
3. **Skapa översiktsdokument** steg för steg
4. **Sedan** identifiera E2E-scenarion baserat på helheten

**Detta säkerställer att vi:**
- Ser hela processen, inte bara delar
- Förstår relationerna mellan processer
- Identifierar alla huvudflöden
- Bygger realistiska scenarion baserat på faktisk struktur

