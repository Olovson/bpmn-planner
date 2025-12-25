# Potentiella Problem och Utmaningar vid Testinfo-Generering

**Datum:** 2025-12-22  
**Status:** ✅ **ALLA KRITISKA PROBLEM ÄR FIXADE** (2025-12-22)

---

## 🚨 KRITISKA PROBLEM

### 1. ✅ Feature Goal-test scenarios genereras automatiskt (FIXAT)

**Status:** ✅ **FIXAT** - `generateFeatureGoalTestsFromE2e()` anropas automatiskt efter E2E scenario-generering

**Var i koden:**
- `src/lib/testGenerators.ts` rad 204-228: `generateFeatureGoalTestsFromE2e()` anropas efter E2E scenario-generering
- Skickar med `e2eScenarios`, `paths`, och `bpmnFiles`

**Vad som händer nu:**
- ✅ E2E scenarios genereras och sparas
- ✅ Feature Goal-test scenarios extraheras automatiskt från E2E scenarios
- ✅ `node_planned_scenarios` tabellen fylls i automatiskt
- ✅ Test Report-sidan visar Feature Goal-test scenarios

---

### 2. ✅ `loadFeatureGoalDocs()` är implementerad (FIXAT)

**Status:** ✅ **FIXAT** - Funktionen är fullt implementerad och laddar Feature Goal-dokumentation från Supabase Storage

**Var i koden:**
- `src/lib/featureGoalTestGenerator.ts` rad 89-138: `loadFeatureGoalDocs()` är implementerad
- `src/lib/featureGoalTestGenerator.ts` rad 144-221: `loadFeatureGoalDocFromStorage()` är implementerad
- Använder samma logik som i `e2eScenarioGenerator.ts`

**Vad som händer nu:**
- ✅ Feature Goal-dokumentation laddas från Supabase Storage
- ✅ Feature Goal-tester berikas med dokumentation
- ✅ Tester blir mer detaljerade och har kontext

---

### 3. ✅ `paths` är tillgängliga för Feature Goal test-generering (FIXAT)

**Status:** ✅ **FIXAT** - `generateE2eScenariosForProcess()` returnerar både `scenarios` och `paths`

**Var i koden:**
- `src/lib/e2eScenarioGenerator.ts` rad 340-343: `E2eScenarioGenerationResult` interface innehåller både `scenarios` och `paths`
- `src/lib/e2eScenarioGenerator.ts` rad 357: `generateE2eScenariosForProcess()` returnerar `E2eScenarioGenerationResult`
- `src/lib/testGenerators.ts` rad 191-196: `e2eResult` innehåller både `scenarios` och `paths`
- `src/lib/testGenerators.ts` rad 226: `paths` skickas med till `generateFeatureGoalTestsFromE2e()`

**Vad som händer nu:**
- ✅ Paths returneras från `generateE2eScenariosForProcess()`
- ✅ Paths skickas med till `generateFeatureGoalTestsFromE2e()`
- ✅ Gateway-kontext kan byggas korrekt

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

1. ~~Playwright-testfiler genereras för alla Feature Goals~~ (Tagits bort - innehöll bara stubbar)
2. ✅ E2E scenarios genereras och sparas till storage
3. ✅ Feature Goal-test scenarios extraheras automatiskt från E2E scenarios
4. ✅ Feature Goal-test scenarios sparas till databasen (`node_planned_scenarios`)
5. ✅ Allt syns i UI (E2E Tests Overview, Test Coverage, Test Report)

**Vad användaren ser:**

- E2E scenarios på E2E Tests Overview-sidan
- Feature Goal-test scenarios på Test Report-sidan
- Allt är länkat korrekt

---

**Status:** ✅ **ALLA KRITISKA PROBLEM ÄR FIXADE** (2025-12-22)

**Implementerade fixar:**
- ✅ `generateFeatureGoalTestsFromE2e()` anropas automatiskt i `testGenerators.ts` (rad 224)
- ✅ `loadFeatureGoalDocs()` är implementerad i `featureGoalTestGenerator.ts` (rad 89-138)
- ✅ `generateE2eScenariosForProcess()` returnerar `paths` i `E2eScenarioGenerationResult` (rad 340-343)
- ✅ Paths skickas med till `generateFeatureGoalTestsFromE2e()` (rad 226)

**Testinfo-generering fungerar nu komplett!**

