# Analys: Sidan stängs under generering - Sammanfattning

## Problem

Sidan stängs/kraschar när testet väntar på att genereringen ska slutföras. Detta händer precis efter att genereringen startar.

## Tidslinje från loggning

```
🚀 [test] Starting generation...
✅ [test] Generation started, waiting for completion...
⏳ [stepWaitForGenerationComplete] Waiting for generation to complete (timeout: 30000ms)...
❌ [test] Page was closed unexpectedly!
❌ [stepWaitForGenerationComplete] Page closed during wait!
```

**Viktigt:** Sidan stängs INNAN `bpmnMapAutoGenerator` hinner köra (ingen loggning från den). Detta tyder på att problemet är i genereringsprocessen själv, inte i `bpmnMapAutoGenerator`.

## Identifierade problem

### 1. JSON-parsing problem i bpmnMapTestHelper

**Observation:**
```
[bpmnMapTestHelper] Request body is not valid JSON, treating as text
[bpmnMapTestHelper] testMapContent is not valid JSON, using empty map
```

**Analys:**
- När POST/PUT-anrop görs till `bpmn-map.json`, sparas innehållet som text istället för JSON
- Detta gör att när `loadBpmnMapFromStorageSimple` försöker läsa det, kan det misslyckas
- Vi har nu error handling som använder en tom map istället, men problemet kvarstår

**Möjlig orsak:**
- Request body kan vara en blob eller form-data istället för JSON
- `bpmnMapTestHelper` försöker parsa det som JSON, men det är faktiskt text

### 2. Sidan stängs precis efter generering startar

**Observation:**
- Sidan stängs precis efter att `stepStartGeneration` körs
- Detta händer INNAN `bpmnMapAutoGenerator` hinner köra
- Detta tyder på att problemet är i genereringsprocessen själv

**Möjliga orsaker:**

#### A. JavaScript-fel i genereringsprocessen

**Hypotes:** När generering startar, kan det finnas ett JavaScript-fel som kraschar sidan.

**Möjliga fel:**
- Fel i `useFileGeneration` hooken
- Fel i `GenerationDialog` komponenten
- Fel i mockningen av Claude API
- Unhandled promise rejection
- Stack overflow eller memory-leak

#### B. Navigation eller redirect

**Hypotes:** Något i genereringsprocessen navigerar bort från sidan eller stänger den.

**Möjliga orsaker:**
- Auth-fel som loggar ut användaren
- Error boundary som kraschar
- Navigation till fel sida

#### C. Race condition med bpmn-map.json

**Hypotes:** Det finns en race condition mellan genereringen och `bpmn-map.json` läsning/skrivning.

**Möjliga orsaker:**
- `analyzeAndSuggestMapUpdates` körs samtidigt som genereringen
- `bpmnMapAutoGenerator` försöker läsa/skriva medan genereringen pågår
- Mockningen av `bpmn-map.json` misslyckas under genereringen

## Åtgärder som redan gjorts

1. ✅ Förbättrad loggning i testet
2. ✅ Förbättrad error handling i `bpmnMapTestHelper` för GET-anrop
3. ✅ Förbättrad error handling i `analyzeAndSuggestMapUpdates` (använder tom map vid fel)
4. ✅ Filtrering av gamla testfiler i `bpmnMapAutoGenerator` och `analyzeAndSuggestMapUpdates`
5. ✅ Fixat JavaScript-felet (`handleRegenerateBpmnMap` saknades)

## Rekommenderade åtgärder

### 1. Förbättra error handling i genereringsprocessen

**Problem:** Om något går fel under genereringen, kan det orsaka att sidan kraschar.

**Lösning:**
- Lägg till try-catch runt alla kritiska operationer i `useFileGeneration`
- Se till att fel loggas istället för att krascha
- Returnera null vid fel istället för att kasta

### 2. Verifiera Claude API mockning

**Problem:** Om Claude API mockningen misslyckas, kan det orsaka att genereringen kraschar.

**Lösning:**
- Verifiera att alla Claude API-anrop mockas korrekt
- Se till att mockade svar är korrekt formaterade
- Lägg till error handling för om mockningen misslyckas

### 3. Förhindra att `analyzeAndSuggestMapUpdates` körs under test

**Problem:** `analyzeAndSuggestMapUpdates` körs automatiskt efter filuppladdning, vilket kan orsaka problem.

**Lösning:**
- Mocka `analyzeAndSuggestMapUpdates` så att den inte körs under test
- Eller se till att den hanterar fel gracefully och inte kraschar sidan

### 4. Förbättra JSON-parsing i bpmnMapTestHelper

**Problem:** Request body sparas som text istället för JSON.

**Lösning:**
- Förbättra parsing av request body för att hantera både JSON och text
- Se till att alltid spara som giltig JSON

### 5. Lägg till mer loggning i genereringsprocessen

**Problem:** Vi vet inte exakt var i genereringsprocessen som felet uppstår.

**Lösning:**
- Lägg till console.log vid varje steg i `useFileGeneration`
- Logga när generation dialog öppnas/stängs
- Logga när API-anrop görs
- Logga när fel uppstår

## Nästa steg

1. ⏭️ Lägg till mer loggning i `useFileGeneration` för att se exakt var felet uppstår
2. ⏭️ Förbättra JSON-parsing i `bpmnMapTestHelper` för att hantera text-body korrekt
3. ⏭️ Förhindra att `analyzeAndSuggestMapUpdates` körs under test (eller förbättra error handling)
4. ⏭️ Verifiera att Claude API mockningen fungerar korrekt
5. ⏭️ Lägg till error boundary i React-appen för att fånga fel innan de kraschar sidan


