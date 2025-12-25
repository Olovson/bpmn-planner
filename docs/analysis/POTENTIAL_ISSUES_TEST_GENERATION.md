# Potentiella Problem och Utmaningar vid Testinfo-Generering

**Datum:** 2025-12-22  
**Status:** Identifierade problem som behöver åtgärdas

---

## 🚨 KRITISKA PROBLEM

### 1. Feature Goal-test scenarios genereras INTE automatiskt

**Problem:**
- `generateFeatureGoalTestsFromE2e()` anropas **ALDRIG** i `testGenerators.ts`
- E2E scenarios genereras och sparas, men Feature Goal-test scenarios extraheras aldrig
- `node_planned_scenarios` tabellen fylls **INTE** i automatiskt

**Var i koden:**
- `src/lib/testGenerators.ts` rad 297-302: E2E scenarios sparas, men Feature Goal-tester genereras inte
- `src/lib/featureGoalTestGenerator.ts`: Funktionen finns men anropas aldrig

**Konsekvens:**
- E2E scenarios finns i storage
- Feature Goal-test scenarios saknas i databasen
- Test Report-sidan visar inga Feature Goal-test scenarios

**Lösning:**
- Anropa `generateFeatureGoalTestsFromE2e()` efter att E2E scenarios har genererats
- Skicka med `e2eScenarios`, `paths`, och `bpmnFiles`

---

### 2. `loadFeatureGoalDocs()` är inte implementerad

**Problem:**
- `loadFeatureGoalDocs()` i `featureGoalTestGenerator.ts` returnerar bara en tom `Map`
- TODO-kommentar: "TODO: Implementera faktisk loading från Supabase Storage"
- Feature Goal-dokumentation laddas inte när Feature Goal-tester ska extraheras

**Var i koden:**
- `src/lib/featureGoalTestGenerator.ts` rad 84-93: Funktionen returnerar tom Map

**Konsekvens:**
- Feature Goal-tester kan inte berikas med Feature Goal-dokumentation
- Tester blir mindre detaljerade och saknar kontext

**Lösning:**
- Implementera `loadFeatureGoalDocs()` för att ladda Feature Goal-dokumentation från Supabase Storage
- Använd samma logik som i `e2eScenarioGenerator.ts` (`loadFeatureGoalDocFromStorage`)

---

### 3. `paths` är inte tillgängliga för Feature Goal test-generering

**Problem:**
- `generateFeatureGoalTestsFromE2e()` kräver `paths: ProcessPath[]`
- I `testGenerators.ts` genereras paths i `generateE2eScenariosForProcess()` men returneras inte
- Paths är inte tillgängliga för Feature Goal test-generering

**Var i koden:**
- `src/lib/testGenerators.ts` rad 280: `generateE2eScenariosForProcess()` anropas men paths returneras inte
- `src/lib/e2eScenarioGenerator.ts`: Paths genereras internt men returneras inte

**Konsekvens:**
- Feature Goal-tester kan inte extraheras eftersom paths saknas
- Gateway-kontext kan inte byggas korrekt

**Lösning:**
- Returnera `paths` från `generateE2eScenariosForProcess()` eller skapa dem separat
- Skicka med `paths` till `generateFeatureGoalTestsFromE2e()`

---

## ⚠️ VIKTIGA UTMANINGAR

### 4. Beroenden mellan steg är inte tydliga

**Problem:**
- E2E scenarios måste genereras FÖRE Feature Goal-tester kan extraheras
- Men Feature Goal-tester extraheras aldrig automatiskt
- Användaren kan tro att allt genereras automatiskt

**Konsekvens:**
- Användaren genererar testinfo men ser inga Feature Goal-test scenarios
- Förvirring om vad som faktiskt genereras

**Lösning:**
- Dokumentera tydligt vad som genereras automatiskt vs. vad som kräver manuellt steg
- Eller: Implementera automatisk Feature Goal-test-generering

---

### 5. Felhantering är tyst

**Problem:**
- Om E2E scenario-generering misslyckas, loggas bara en varning
- Feature Goal-test-generering misslyckas tyst (anropas aldrig)
- Användaren får ingen feedback om vad som gick fel

**Var i koden:**
- `src/lib/testGenerators.ts` rad 303-306: E2E scenario-fel hanteras tyst

**Konsekvens:**
- Användaren vet inte om något gick fel
- Svårt att felsöka problem

**Lösning:**
- Förbättra felhantering och feedback till användaren
- Visa tydliga felmeddelanden i UI

---

### 6. ProcessPaths måste matchas med E2E scenarios

**Problem:**
- `extractFeatureGoalTestsWithGatewayContext()` försöker matcha E2E scenarios med ProcessPaths
- Om matchning misslyckas, fortsätter processen utan gateway-kontext
- Detta kan leda till ofullständiga tester

**Var i koden:**
- `src/lib/e2eToFeatureGoalTestExtractor.ts` rad 28-41: Matchning av paths med E2E scenarios

**Konsekvens:**
- Feature Goal-tester kan sakna gateway-kontext
- Tester blir mindre specifika

**Lösning:**
- Förbättra matchning av paths med E2E scenarios
- Eller: Spara paths tillsammans med E2E scenarios för enklare matchning

---

## 📋 REKOMMENDATIONER

### Prioritet 1: Kritiska problem (måste fixas)

1. **Implementera automatisk Feature Goal-test-generering**
   - Anropa `generateFeatureGoalTestsFromE2e()` efter E2E scenario-generering
   - Skicka med `e2eScenarios`, `paths`, och `bpmnFiles`

2. **Implementera `loadFeatureGoalDocs()`**
   - Ladda Feature Goal-dokumentation från Supabase Storage
   - Använd samma logik som i `e2eScenarioGenerator.ts`

3. **Returnera `paths` från `generateE2eScenariosForProcess()`**
   - Eller: Skapa paths separat och skicka med till Feature Goal-test-generering

### Prioritet 2: Viktiga förbättringar

4. **Förbättra felhantering och feedback**
   - Visa tydliga felmeddelanden i UI
   - Logga fel mer detaljerat

5. **Förbättra matchning av paths med E2E scenarios**
   - Spara paths tillsammans med E2E scenarios
   - Eller: Förbättra matchning-algoritmen

---

## 🔍 Testfall att Validera

### Testfall 1: Komplett flöde
1. Generera testinfo för `mortgage.bpmn`
2. Verifiera att E2E scenarios genereras
3. Verifiera att Feature Goal-test scenarios genereras
4. Verifiera att allt sparas korrekt

### Testfall 2: Saknad dokumentation
1. Försök generera testinfo utan Feature Goal-dokumentation
2. Verifiera att felmeddelande visas
3. Verifiera att inget genereras

### Testfall 3: E2E scenario-generering misslyckas
1. Simulera fel i E2E scenario-generering
2. Verifiera att felmeddelande visas
3. Verifiera att Playwright-testfiler fortfarande genereras

---

## 📝 Checklista innan Testinfo-Generering

- [ ] Feature Goal-dokumentation finns för alla Call Activities
- [ ] LLM är aktiverat (för E2E scenario-generering)
- [ ] BPMN-filer är korrekt strukturerade (start/end events, paths)
- [ ] Supabase Storage är tillgängligt
- [ ] Databas är tillgänglig

---

## 🎯 Förväntat Beteende Efter Fixar

**När testinfo genereras:**

1. ✅ Playwright-testfiler genereras för alla Feature Goals
2. ✅ E2E scenarios genereras och sparas till storage
3. ✅ Feature Goal-test scenarios extraheras från E2E scenarios
4. ✅ Feature Goal-test scenarios sparas till databasen (`node_planned_scenarios`)
5. ✅ Allt syns i UI (E2E Tests Overview, Test Coverage, Test Report)

**Vad användaren ser:**

- E2E scenarios på E2E Tests Overview-sidan
- Feature Goal-test scenarios på Test Report-sidan
- Allt är länkat korrekt

---

**Status:** Dessa problem behöver åtgärdas innan testinfo-generering fungerar komplett.

