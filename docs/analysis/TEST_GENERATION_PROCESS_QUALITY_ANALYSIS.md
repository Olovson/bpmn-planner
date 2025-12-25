# Analys: Testgenereringsprocess - Kvalitet och Logiska Problem

**Datum:** 2025-12-22  
**Status:** Komplett analys av testgenereringsprocessen

---

## 🎯 Syfte

Analysera hela testgenereringsprocessen för att identifiera:
1. Logiska problem och brister
2. Saknade viktiga komponenter
3. Kvalitetsaspekter och förbättringsmöjligheter

---

## 📋 Hela Flödet: Steg för Steg

### Steg 1: Validering av Dokumentation

**Vad händer:**
- Systemet kontrollerar att Feature Goal-dokumentation finns för alla Call Activities
- För Call Activities: Kontrollerar Feature Goal-dokumentation
- För andra noder: Kontrollerar vanlig nod-dokumentation

**Kod:** `src/lib/testGenerators.ts` rad 92-150

**✅ Styrkor:**
- Tydlig validering innan generering startar
- Detaljerade felmeddelanden med lista över saknad dokumentation
- Stoppar genereringen om dokumentation saknas

**⚠️ Potentiella Problem:**
1. **Validering är strikt** - Om EN dokumentation saknas, stoppas hela genereringen
   - **Konsekvens:** Användaren måste generera dokumentation för ALLA Feature Goals, även om de bara vill testa en del
   - **Förbättring:** Överväg att tillåta partiell generering (generera för Feature Goals som har dokumentation)

2. **Ingen validering av dokumentationskvalitet** - Systemet kontrollerar bara att dokumentation finns, inte att den är komplett
   - **Konsekvens:** Generering kan starta med ofullständig dokumentation
   - **Förbättring:** Validera att dokumentation innehåller minsta nödvändiga fält (t.ex. `summary`, `flowSteps`)

---

### Steg 2: E2E Scenario-Generering

**Vad händer:**
1. Parse BPMN-fil
2. Bygg flow graph
3. Hitta start events
4. Hitta paths genom processen
5. Filtrera paths baserat på prioriterade scenarios
6. Ladda Feature Goal-dokumentation för varje Feature Goal i pathen
7. Generera E2E-scenarios med Claude
8. Validera output
9. Spara till storage

**Kod:** `src/lib/e2eScenarioGenerator.ts` rad 349-550

**✅ Styrkor:**
- Tydlig process med steg-för-steg-logik
- Filtrering av paths baserat på prioriterade scenarios
- Validering av LLM-output
- Returnerar både scenarios och paths för vidare användning

**⚠️ Potentiella Problem:**

#### Problem 1: Path-filtrering kan missa scenarios
**Beskrivning:**
- `checkIfPathMatchesPrioritizedScenario()` filtrerar paths baserat på keyword-matching
- Om en path inte matchar de tre prioriterade scenarios, hoppas den över
- **Risk:** Viktiga paths kan missas om de inte matchar exakta kriterier

**Kod:** `src/lib/e2eScenarioGenerator.ts` rad 500-548

**Exempel:**
```typescript
// Om path innehåller "manual" men inte "bostadsrätt", hoppas den över
// Men användaren kanske vill ha den ändå
```

**Konsekvens:**
- Färre E2E scenarios genereras än möjligt
- Användaren får inte alla möjliga scenarios

**Förbättring:**
- Överväg att generera scenarios för ALLA paths, men markera prioriterade
- Eller: Låt användaren välja vilka typer av scenarios som ska genereras

#### Problem 2: Feature Goal-dokumentation kan saknas för vissa Feature Goals
**Beskrivning:**
- Om Feature Goal-dokumentation saknas för en Feature Goal i pathen, loggas bara en varning
- E2E scenario-genereras ändå, men med mindre kontext

**Kod:** `src/lib/e2eScenarioGenerator.ts` rad 407-430

**Konsekvens:**
- E2E scenarios kan bli mindre detaljerade
- Claude får mindre kontext att arbeta med

**Förbättring:**
- Överväg att hoppa över paths där Feature Goal-dokumentation saknas
- Eller: Använd fallback-dokumentation (t.ex. från BPMN-namn)

#### Problem 3: Validering av LLM-output är begränsad
**Beskrivning:**
- `validateE2eScenarioOutput()` validerar strukturen, men inte innehållet
- Systemet accepterar tomma eller generiska fält

**Konsekvens:**
- E2E scenarios kan genereras med låg kvalitet
- Användaren får scenarios som inte är användbara

**Förbättring:**
- Lägg till innehållsvalidering (t.ex. minsta längd på `summary`, `given`, `when`, `then`)
- Validera att Feature Goal-namn finns i texten

#### Problem 4: Felhantering är tyst
**Beskrivning:**
- Om E2E scenario-generering misslyckas för en path, loggas bara en varning
- Processen fortsätter med nästa path
- Användaren får ingen feedback om vad som gick fel

**Kod:** `src/lib/testGenerators.ts` rad 249-252

**Konsekvens:**
- Användaren vet inte om något gick fel
- Svårt att felsöka problem

**Förbättring:**
- Samla alla fel och visa dem i UI
- Ge användaren feedback om vilka paths som misslyckades

---

### Steg 3: Feature Goal-test Extraktion

**Vad händer:**
1. Ladda Feature Goal-dokumentation
2. Extrahera Feature Goal-tester från E2E-scenarios
3. Matcha E2E scenarios med paths för gateway-kontext
4. Berika tester med Feature Goal-dokumentation
5. Spara till databasen

**Kod:** `src/lib/featureGoalTestGenerator.ts` rad 27-80

**✅ Styrkor:**
- Automatisk extraktion från E2E scenarios
- Berikning med Feature Goal-dokumentation
- Gateway-kontext inkluderas

**⚠️ Potentiella Problem:**

#### Problem 1: Matchning av E2E scenarios med paths kan misslyckas
**Beskrivning:**
- `extractFeatureGoalTestsWithGatewayContext()` försöker matcha E2E scenarios med paths
- Om matchning misslyckas, fortsätter processen utan gateway-kontext

**Kod:** `src/lib/e2eToFeatureGoalTestExtractor.ts` rad 28-41

**Konsekvens:**
- Feature Goal-tester kan sakna gateway-kontext
- Tester blir mindre specifika

**Förbättring:**
- Förbättra matchning-algoritmen
- Eller: Spara paths tillsammans med E2E scenarios för enklare matchning

#### Problem 2: Feature Goal-dokumentation kan saknas
**Beskrivning:**
- Om Feature Goal-dokumentation saknas, loggas bara en varning
- Tester extraheras ändå, men utan berikning

**Kod:** `src/lib/featureGoalTestGenerator.ts` rad 89-138

**Konsekvens:**
- Feature Goal-tester blir mindre detaljerade
- Tester saknar kontext från Feature Goal-dokumentation

**Förbättring:**
- Överväg att hoppa över Feature Goals utan dokumentation
- Eller: Använd fallback-dokumentation

#### Problem 3: Felhantering är tyst
**Beskrivning:**
- Om Feature Goal-test-generering misslyckas, loggas bara en varning
- Användaren får ingen feedback

**Kod:** `src/lib/testGenerators.ts` rad 241-247

**Konsekvens:**
- Användaren vet inte om något gick fel
- Svårt att felsöka problem

**Förbättring:**
- Samla alla fel och visa dem i UI
- Ge användaren feedback om vilka Feature Goals som misslyckades

---

## 🔍 Logiska Problem

### Problem 1: Beroenden mellan steg är inte tydliga

**Beskrivning:**
- E2E scenarios måste genereras FÖRE Feature Goal-tester kan extraheras
- Men om E2E scenario-generering misslyckas, försöker systemet ändå extrahera Feature Goal-tester (med tomma scenarios)

**Kod:** `src/lib/testGenerators.ts` rad 198-248

**Konsekvens:**
- Feature Goal-test-generering kan köras med tomma scenarios
- Resulterar i inga tester, men ingen feedback till användaren

**Förbättring:**
- Lägg till explicit kontroll: Om `e2eResult.scenarios.length === 0`, hoppa över Feature Goal-test-generering
- Ge tydlig feedback: "Inga E2E scenarios genererades, kan inte extrahera Feature Goal-tester"

### Problem 2: Paths kan vara tomma

**Beskrivning:**
- Om inga paths hittas, returneras `{ scenarios: [], paths: [] }`
- Men Feature Goal-test-generering försöker ändå använda tomma paths

**Kod:** `src/lib/e2eScenarioGenerator.ts` rad 384-387

**Konsekvens:**
- Feature Goal-test-generering kan köras med tomma paths
- Resulterar i inga tester med gateway-kontext

**Förbättring:**
- Lägg till explicit kontroll: Om `e2eResult.paths.length === 0`, hoppa över Feature Goal-test-generering
- Eller: Generera Feature Goal-tester utan gateway-kontext (men varna användaren)

### Problem 3: BPMN-filer kan saknas i paths

**Beskrivning:**
- Systemet försöker hitta BPMN-filer från paths, men om element inte har `bpmnFile`, används root-filen
- Detta kan leda till att fel BPMN-fil används för Feature Goal-dokumentation

**Kod:** `src/lib/testGenerators.ts` rad 214-222

**Konsekvens:**
- Fel Feature Goal-dokumentation kan laddas
- Tester blir felaktiga

**Förbättring:**
- Validera att alla Feature Goals i paths har korrekt `bpmnFile`
- Om `bpmnFile` saknas, försök hitta den från graph eller varna användaren

---

## 🎯 Kvalitetsaspekter

### Kvalitet 1: LLM-prompt Kvalitet

**Nuvarande:** `prompts/llm/e2e_scenario_prompt.md`

**✅ Styrkor:**
- Detaljerade instruktioner
- Exempel på bra/dåligt output
- Tydlig struktur

**⚠️ Förbättringsmöjligheter:**
1. **Prompt är lång** - Kan leda till högre token-kostnader
   - **Förbättring:** Överväg att dela upp i mindre prompts eller använda few-shot learning

2. **Ingen validering av prompt-output** - Systemet validerar strukturen, men inte innehållet
   - **Förbättring:** Lägg till innehållsvalidering (t.ex. minsta längd, krav på Feature Goal-namn)

3. **Ingen feedback-loop** - Om Claude genererar låg kvalitet, finns ingen mekanism för att förbättra
   - **Förbättring:** Överväg att implementera retry-logik med förbättrade instruktioner

### Kvalitet 2: Feature Goal-test Extraktion

**Nuvarande:** `src/lib/e2eToFeatureGoalTestExtractor.ts`

**✅ Styrkor:**
- Hybrid approach: deterministisk först, Claude som fallback
- Gateway-kontext inkluderas
- Berikning med Feature Goal-dokumentation

**⚠️ Förbättringsmöjligheter:**
1. **Matchning av E2E scenarios med paths kan misslyckas**
   - **Förbättring:** Förbättra matchning-algoritmen eller spara paths med E2E scenarios

2. **Ingen validering av extraherade tester**
   - **Förbättring:** Validera att extraherade tester innehåller minsta nödvändiga fält

3. **Ingen deduplicering**
   - **Förbättring:** Kontrollera om test scenario redan finns innan sparning

### Kvalitet 3: Dataflöden

**Nuvarande:**
- E2E scenarios → Storage (JSON)
- Feature Goal-tester → Databas (`node_planned_scenarios`)

**✅ Styrkor:**
- Tydlig separation mellan E2E scenarios och Feature Goal-tester
- E2E scenarios sparas som JSON för enkel åtkomst

**⚠️ Förbättringsmöjligheter:**
1. **Ingen länkning mellan E2E scenarios och Feature Goal-tester**
   - **Förbättring:** Spara referens från Feature Goal-tester till E2E scenarios

2. **Ingen versioning**
   - **Förbättring:** Överväg att versionera E2E scenarios och Feature Goal-tester

3. **Ingen historik**
   - **Förbättring:** Spara historik över genererade tester för att kunna jämföra kvalitet över tid

---

## 🚨 Kritiska Saknade Komponenter

### 1. Innehållsvalidering av LLM-output

**Problem:**
- Systemet validerar strukturen, men inte innehållet
- Tomma eller generiska fält accepteras

**Lösning:**
- Lägg till innehållsvalidering:
  - `summary`: Minst 50 tecken
  - `given`, `when`, `then`: Minst 20 tecken var
  - Feature Goal-namn måste finnas i texten
  - Gateway-conditions måste finnas i `given` eller `when`

### 2. Feedback till Användaren

**Problem:**
- Felhantering är tyst
- Användaren får ingen feedback om vad som gick fel

**Lösning:**
- Samla alla fel och varningar
- Visa dem i UI med tydliga meddelanden
- Ge användaren möjlighet att se detaljer

### 3. Retry-logik för LLM-anrop

**Problem:**
- Om Claude genererar låg kvalitet, finns ingen mekanism för att förbättra
- Systemet accepterar första output

**Lösning:**
- Implementera retry-logik:
  - Om validering misslyckas, försök igen med förbättrade instruktioner
  - Max 2-3 försök per path

### 4. Deduplicering av Tester

**Problem:**
- Samma test scenario kan genereras flera gånger
- Inga kontroller om test scenario redan finns

**Lösning:**
- Kontrollera om test scenario redan finns innan sparning
- Använd unika nycklar (t.ex. `bpmnFile + elementId + gatewayCondition`)

### 5. Länkning mellan E2E scenarios och Feature Goal-tester

**Problem:**
- Ingen tydlig länkning mellan E2E scenarios och Feature Goal-tester
- Svårt att spåra var Feature Goal-tester kommer ifrån

**Lösning:**
- Spara referens från Feature Goal-tester till E2E scenarios
- Lägg till `e2eScenarioId` i `node_planned_scenarios` tabellen

---

## 📊 Kvalitetsbedömning

### Nuvarande Kvalitet: 70-75%

**Vad fungerar bra:**
- ✅ Tydlig process med steg-för-steg-logik
- ✅ Automatisk generering av både E2E scenarios och Feature Goal-tester
- ✅ Validering av dokumentation innan generering
- ✅ Filtrering av paths baserat på prioriterade scenarios
- ✅ Berikning med Feature Goal-dokumentation

**Vad kan förbättras:**
- ⚠️ Felhantering och feedback till användaren
- ⚠️ Innehållsvalidering av LLM-output
- ⚠️ Matchning av E2E scenarios med paths
- ⚠️ Deduplicering av tester
- ⚠️ Länkning mellan E2E scenarios och Feature Goal-tester

### Förväntad Kvalitet efter Förbättringar: 85-90%

**Om vi implementerar:**
- Innehållsvalidering av LLM-output
- Förbättrad felhantering och feedback
- Förbättrad matchning av paths
- Deduplicering av tester
- Länkning mellan E2E scenarios och Feature Goal-tester

---

## 🎯 Rekommendationer

### Prioritet 1: Kritiska Förbättringar (Måste fixas)

1. **Förbättra felhantering och feedback**
   - Samla alla fel och varningar
   - Visa dem i UI med tydliga meddelanden
   - Ge användaren möjlighet att se detaljer

2. **Lägg till innehållsvalidering av LLM-output**
   - Validera minsta längd på fält
   - Validera att Feature Goal-namn finns i texten
   - Validera att gateway-conditions finns

3. **Förbättra matchning av E2E scenarios med paths**
   - Förbättra matchning-algoritmen
   - Eller: Spara paths tillsammans med E2E scenarios

### Prioritet 2: Viktiga Förbättringar (Bör fixas)

4. **Implementera deduplicering av tester**
   - Kontrollera om test scenario redan finns innan sparning
   - Använd unika nycklar

5. **Lägg till länkning mellan E2E scenarios och Feature Goal-tester**
   - Spara referens från Feature Goal-tester till E2E scenarios
   - Lägg till `e2eScenarioId` i `node_planned_scenarios` tabellen

6. **Förbättra path-filtrering**
   - Överväg att generera scenarios för ALLA paths, men markera prioriterade
   - Eller: Låt användaren välja vilka typer av scenarios som ska genereras

### Prioritet 3: Önskvärda Förbättringar (Kan fixas)

7. **Implementera retry-logik för LLM-anrop**
   - Om validering misslyckas, försök igen med förbättrade instruktioner
   - Max 2-3 försök per path

8. **Lägg till versioning och historik**
   - Versionera E2E scenarios och Feature Goal-tester
   - Spara historik över genererade tester

9. **Förbättra validering av dokumentationskvalitet**
   - Validera att dokumentation innehåller minsta nödvändiga fält
   - Varna användaren om dokumentation är ofullständig

---

## ✅ Checklista: Vad Fungerar Bra

- [x] Tydlig process med steg-för-steg-logik
- [x] Automatisk generering av både E2E scenarios och Feature Goal-tester
- [x] Validering av dokumentation innan generering
- [x] Filtrering av paths baserat på prioriterade scenarios
- [x] Berikning med Feature Goal-dokumentation
- [x] Gateway-kontext inkluderas i Feature Goal-tester
- [x] Strukturell validering av LLM-output

---

## ⚠️ Checklista: Vad Behöver Förbättras

- [ ] Felhantering och feedback till användaren
- [ ] Innehållsvalidering av LLM-output
- [ ] Matchning av E2E scenarios med paths
- [ ] Deduplicering av tester
- [ ] Länkning mellan E2E scenarios och Feature Goal-tester
- [ ] Retry-logik för LLM-anrop
- [ ] Versioning och historik
- [ ] Validering av dokumentationskvalitet

---

## 🎯 Slutsats

**Nuvarande Status:**
- Processen fungerar och genererar både E2E scenarios och Feature Goal-tester
- Kvaliteten är 70-75% - bra, men kan förbättras

**Viktigaste Förbättringar:**
1. Förbättra felhantering och feedback (Prioritet 1)
2. Lägg till innehållsvalidering av LLM-output (Prioritet 1)
3. Förbättra matchning av E2E scenarios med paths (Prioritet 1)

**Efter dessa förbättringar:**
- Kvaliteten kommer att öka till 85-90%
- Användaren får bättre feedback
- Tester blir mer pålitliga och användbara

---

**Status:** Analys klar. Rekommendationer prioriterade och dokumenterade.



