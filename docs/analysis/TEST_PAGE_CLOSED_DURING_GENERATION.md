# Analys: Sidan stängs under generering i E2E-test

## Problem

Sidan stängs/kraschar när testet väntar på att genereringen ska slutföras. Detta händer specifikt när `bpmnMapAutoGenerator` körs.

## Observationer från loggning

```
🚀 [test] Starting generation...
✅ [test] Generation started, waiting for completion...
⏳ [stepWaitForGenerationComplete] Waiting for generation to complete (timeout: 30000ms)...
📋 [console.log] 
[bpmnMapAutoGenerator] === Generation Statistics ===
[bpmnMapTestHelper] Request body is not valid JSON, treating as text
[bpmnMapTestHelper] ✓ Test bpmn-map.json saved to memory (content detected, NOT written to Storage)
❌ [test] Page was closed unexpectedly!
❌ [stepWaitForGenerationComplete] Page closed during wait!
```

## Tidslinje

1. ✅ Filuppladdning fungerar
2. ✅ Filval fungerar
3. ✅ Generering startar
4. ⚠️ `bpmnMapAutoGenerator` körs (troligen via `analyzeAndSuggestMapUpdates`)
5. ❌ Sidan stängs/kraschar

## Möjliga orsaker

### 1. JavaScript-fel i `bpmnMapAutoGenerator`

**Hypotes:** Ett JavaScript-fel i `generateBpmnMapFromFiles` kan orsaka att sidan kraschar.

**Bevis:**
- Sidan stängs precis efter att `bpmnMapAutoGenerator` börjar köra
- Det finns ingen explicit navigation i koden som skulle stänga sidan

**Möjliga fel:**
- `parseBpmnFile` kan krascha för testfiler
- Storage-anrop kan misslyckas
- JSON-parsing kan misslyckas

### 2. Navigation eller redirect

**Hypotes:** Något i genereringsprocessen navigerar bort från sidan eller stänger den.

**Bevis:**
- Sidan stängs, inte bara navigerar (annars skulle vi se en URL-ändring)

**Möjliga orsaker:**
- Auth-fel som loggar ut användaren
- Error boundary som kraschar
- Unhandled promise rejection

### 3. Memory-leak eller stack overflow

**Hypotes:** `bpmnMapAutoGenerator` kan orsaka en stack overflow eller memory-leak som kraschar browsern.

**Bevis:**
- Detta skulle förklara varför sidan stängs helt

**Möjliga orsaker:**
- Rekursiv parsing av många filer
- Oändlig loop i matching-logik
- För stora datastrukturer

### 4. Race condition med `bpmnMapTestHelper`

**Hypotes:** Det finns en race condition mellan `bpmnMapAutoGenerator` som försöker läsa/skriva `bpmn-map.json` och `bpmnMapTestHelper` som mockar dessa anrop.

**Bevis:**
- Loggen visar: `[bpmnMapTestHelper] Request body is not valid JSON, treating as text`
- Detta händer precis innan sidan stängs

**Möjliga orsaker:**
- `bpmnMapAutoGenerator` försöker läsa från Storage, men `bpmnMapTestHelper` mockar inte GET-anrop korrekt
- `bpmnMapAutoGenerator` försöker spara till Storage, men mockningen misslyckas
- JSON-parsing av mockad data misslyckas

## Rekommenderade åtgärder

### 1. Förbättra mockning av `bpmn-map.json` GET-anrop

**Problem:** `bpmnMapAutoGenerator` anropar `loadBpmnMapFromStorageSimple` som gör GET-anrop till Storage. `bpmnMapTestHelper` mockar POST/PUT, men kanske inte GET korrekt.

**Lösning:**
- Verifiera att `bpmnMapTestHelper` mockar alla GET-anrop till `bpmn-map.json`
- Se till att mockad data är korrekt JSON

### 2. Lägg till error handling i `bpmnMapAutoGenerator`

**Problem:** Om `bpmnMapAutoGenerator` kraschar kan det orsaka att sidan stängs.

**Lösning:**
- Lägg till try-catch runt alla kritiska operationer
- Logga fel istället för att krascha
- Returnera en tom map vid fel istället för att kasta

### 3. Förhindra att `bpmnMapAutoGenerator` körs under test

**Problem:** `analyzeAndSuggestMapUpdates` anropas automatiskt efter filuppladdning, vilket triggar `bpmnMapAutoGenerator`.

**Lösning:**
- Mocka `analyzeAndSuggestMapUpdates` så att den inte körs under test
- Eller se till att `bpmnMapAutoGenerator` inte körs i test-miljö

### 4. Lägg till mer loggning i `bpmnMapAutoGenerator`

**Problem:** Vi vet inte exakt var i `bpmnMapAutoGenerator` som felet uppstår.

**Lösning:**
- Lägg till console.log vid varje steg i `bpmnMapAutoGenerator`
- Logga när filer parsas, när matching sker, etc.

## Nästa steg

1. ✅ Förbättra loggning (redan gjort)
2. ✅ Verifiera att `bpmnMapTestHelper` mockar GET-anrop korrekt (redan gjort)
3. ✅ Lägg till error handling i `analyzeAndSuggestMapUpdates` (redan gjort)
4. ⏭️ Testa att förhindra att `analyzeAndSuggestMapUpdates` körs under test
5. ⏭️ Förbättra error handling i `bpmnMapAutoGenerator` för att förhindra kraschar

## Ytterligare observationer

### Problem med JSON-parsing

**Observation:**
```
[bpmnMapTestHelper] Request body is not valid JSON, treating as text
[bpmnMapTestHelper] testMapContent is not valid JSON, using empty map
```

**Analys:**
- När POST/PUT-anrop görs till `bpmn-map.json`, sparas innehållet som text istället för JSON
- Detta gör att när `loadBpmnMapFromStorageSimple` försöker läsa det, kan det misslyckas
- Men vi har nu error handling som använder en tom map istället

**Möjlig orsak:**
- Request body kan vara en blob eller form-data istället för JSON
- `bpmnMapTestHelper` försöker parsa det som JSON, men det är faktiskt text

### Sidan stängs precis efter generering startar

**Observation:**
- Sidan stängs precis efter att `stepStartGeneration` körs
- Detta händer INNAN `bpmnMapAutoGenerator` hinner köra (ingen loggning från den)
- Detta tyder på att problemet är i genereringsprocessen själv, inte i `bpmnMapAutoGenerator`

**Möjlig orsak:**
- När generering startar, kan det finnas ett JavaScript-fel som kraschar sidan
- Det kan vara ett fel i `useFileGeneration` hooken
- Det kan vara ett fel i `GenerationDialog` komponenten
- Det kan vara ett fel i mockningen av Claude API

## Rekommenderade åtgärder (uppdaterade)

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

### 4. Lägg till mer loggning i genereringsprocessen

**Problem:** Vi vet inte exakt var i genereringsprocessen som felet uppstår.

**Lösning:**
- Lägg till console.log vid varje steg i `useFileGeneration`
- Logga när generation dialog öppnas/stängs
- Logga när API-anrop görs
- Logga när fel uppstår

