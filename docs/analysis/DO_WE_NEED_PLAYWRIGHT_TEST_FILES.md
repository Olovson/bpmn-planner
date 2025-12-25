# Analys: Behöver vi Playwright-testfilerna?

**Datum:** 2025-12-22  
**Status:** Analys av behovet av Playwright-testfiler

---

## 🎯 Vad är Playwright-testfilerna?

### Vad genereras:
- **Playwright-testfiler** (`.spec.ts`) genereras för varje Feature Goal (Call Activity)
- Testfiler innehåller:
  - Teststubbar med generiska TODO-kommentarer
  - Eventuellt LLM-genererade scenarios (om LLM är aktiverat)
  - Metadata och strukturerad kod för Playwright-tester

### Var sparas:
- Supabase Storage: `bpmn-files/test-files/{bpmnFile}/{elementId}.spec.ts`
- Databas: `node_test_links` tabellen (länkar BPMN-noder till testfiler)

### Var används de:
1. **TestScriptsPage** (`/test-scripts`) - Visar lista över alla testfiler
2. **NodeTestScriptViewer** (`/node-test-script`) - Visar innehållet i en specifik testfil
3. **RightPanel** - Har en knapp för att öppna test script för vald nod
4. **NodeTestsPage** (`/node-tests`) - Visar tester för en specifik nod
5. **TestReport** (`/test-report`) - Visar test scenarios

---

## 📊 Vad har vi redan?

### 1. E2E-scenarios
- **Vad:** Kompletta E2E-scenarios som testar hela processen från start till slut
- **Var:** Supabase Storage (`e2e-scenarios/{bpmnFile}-scenarios.json`)
- **Innehåll:**
  - `given`, `when`, `then` på root-nivå
  - `subprocessSteps` (Feature Goals i ordning)
  - `bankProjectTestSteps` (action och assertion per Feature Goal)
  - `summary`, `priority`, `type`, `iteration`
- **Visas:** E2E Tests Overview-sidan, Test Coverage-sidan

### 2. Feature Goal-test scenarios
- **Vad:** Test scenarios extraherade från E2E-scenarios
- **Var:** Databas (`node_planned_scenarios` tabellen)
- **Innehåll:**
  - Test scenarios med gateway-kontext
  - Given/when/then per Feature Goal
  - Berikade med Feature Goal-dokumentation
- **Visas:** Test Report-sidan, RightPanel

### 3. Playwright-testfiler
- **Vad:** Teststubbar med generiska TODO-kommentarer
- **Var:** Supabase Storage (`test-files/{bpmnFile}/{elementId}.spec.ts`)
- **Innehåll:**
  - Strukturerad Playwright-testkod
  - Generiska teststubbar
  - Eventuellt LLM-genererade scenarios
- **Visas:** TestScriptsPage, NodeTestScriptViewer

---

## 🤔 Analys: Behöver vi Playwright-testfilerna?

### Argument FÖR att behålla dem:

#### 1. **Teststubbar för implementering**
- Playwright-testfilerna ger en **strukturerad startpunkt** för att implementera faktiska tester
- De innehåller redan rätt struktur och metadata
- Användare kan kopiera dem och implementera faktiska tester

#### 2. **Separation of Concerns**
- **E2E scenarios** = Affärslogik och testbeskrivningar (JSON)
- **Feature Goal-test scenarios** = Test scenarios i databas
- **Playwright-testfiler** = Faktisk testkod som kan köras (TypeScript)

#### 3. **Exekverbar kod**
- E2E scenarios och Feature Goal-test scenarios är **beskrivningar** (JSON/data)
- Playwright-testfiler är **exekverbar kod** som kan köras med `npx playwright test`
- Användare behöver faktisk kod för att köra tester

#### 4. **Befintlig användning**
- Flera UI-sidor använder Playwright-testfilerna:
  - TestScriptsPage
  - NodeTestScriptViewer
  - RightPanel (knapp för att öppna test script)
  - NodeTestsPage
- Om vi tar bort dem måste vi ta bort/ändra dessa sidor

### Argument MOT att behålla dem:

#### 1. **Duplicering av information**
- E2E scenarios innehåller redan all information som behövs
- Feature Goal-test scenarios innehåller redan test scenarios
- Playwright-testfilerna är i princip bara en annan representation av samma information

#### 2. **Underhållsbelastning**
- Ytterligare en typ av artefakt att generera och underhålla
- Ytterligare en typ av artefakt att synkronisera med E2E scenarios och Feature Goal-test scenarios
- Om E2E scenarios ändras, måste Playwright-testfilerna också uppdateras

#### 3. **Begränsat värde**
- Testfilerna innehåller bara generiska stubbar med TODO-kommentarer
- De är inte direkt användbara utan manuell implementering
- Användare måste ändå implementera faktiska tester manuellt

#### 4. **Alternativ: Generera från E2E scenarios**
- Vi kan generera Playwright-testfiler **från E2E scenarios** när användaren behöver dem
- Detta eliminerar behovet av att generera dem i förväg
- Detta eliminerar behovet av att synkronisera dem med E2E scenarios

---

## 💡 Rekommendationer

### Alternativ 1: Behåll Playwright-testfilerna (Nuvarande)

**Fördelar:**
- ✅ Användare får direkt användbara teststubbar
- ✅ Befintlig funktionalitet behålls
- ✅ Ingen större refaktorering behövs

**Nackdelar:**
- ❌ Ytterligare en typ av artefakt att underhålla
- ❌ Risk för desynkronisering med E2E scenarios
- ❌ Begränsat värde (bara stubbar)

### Alternativ 2: Ta bort Playwright-testfilerna, generera på begäran

**Fördelar:**
- ✅ Eliminerar duplicering
- ✅ Enklare underhåll (bara E2E scenarios och Feature Goal-test scenarios)
- ✅ Kan generera testfiler från E2E scenarios när användaren behöver dem
- ✅ Alltid synkroniserade med E2E scenarios

**Nackdelar:**
- ❌ Kräver refaktorering av UI (TestScriptsPage, NodeTestScriptViewer, etc.)
- ❌ Användare måste vänta på generering när de behöver testfiler
- ❌ Förlorar "direkt användbara stubbar"

### Alternativ 3: Hybrid - Behåll men förbättra

**Fördelar:**
- ✅ Behåller befintlig funktionalitet
- ✅ Kan förbättra testfilerna med mer detaljerad information från E2E scenarios
- ✅ Kan generera testfiler från E2E scenarios istället för bara stubbar

**Nackdelar:**
- ❌ Fortfarande en typ av artefakt att underhålla
- ❌ Kräver arbete för att förbättra genereringen

---

## 🎯 Slutsats och Rekommendation

### Kort sikt: **Behåll Playwright-testfilerna**

**Anledning:**
- Befintlig funktionalitet använder dem
- Användare förväntar sig dem
- Begränsad risk att ta bort dem nu

### Lång sikt: **Överväg att ta bort eller förbättra**

**Anledning:**
- E2E scenarios och Feature Goal-test scenarios innehåller redan all information
- Playwright-testfilerna är i princip bara stubbar
- Vi kan generera testfiler från E2E scenarios när användaren behöver dem

### Konkret rekommendation:

1. **Kort sikt (nu):** Behåll Playwright-testfilerna som de är
2. **Mellan sikt (nästa iteration):** Förbättra testfilerna att inkludera mer information från E2E scenarios
3. **Lång sikt (framtida):** Överväg att ta bort dem och generera på begäran från E2E scenarios

---

## 📋 Checklista för beslut

- [ ] Används Playwright-testfilerna aktivt av användare?
- [ ] Är testfilerna mer än bara stubbar?
- [ ] Kan vi generera testfiler från E2E scenarios när användaren behöver dem?
- [ ] Vad är kostnaden för att ta bort dem (refaktorering av UI)?
- [ ] Vad är kostnaden för att behålla dem (underhåll, synkronisering)?

---

**Status:** Analys klar. Rekommendation: Behåll kort sikt, överväg förbättring/ta bort lång sikt.

