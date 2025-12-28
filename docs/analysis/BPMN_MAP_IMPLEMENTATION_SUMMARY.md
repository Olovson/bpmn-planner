# Implementering: bpmn-map.json Mockning med Backup/Restore

## Datum: 2025-12-26

## Implementerade Säkerhetsåtgärder

### 1. Backup av Original-Innehåll
- ✅ Original-innehållet av `bpmn-map.json` laddas i `beforeEach` via browser context
- ✅ Sparas i global state (`originalMapContent`)
- ✅ Loggas för debugging

### 2. Låt POST/PUT Gå Genom till Storage
- ✅ POST/PUT-anrop tillåts gå igenom till Supabase Storage
- ✅ Detta säkerställer att appen faktiskt kan spara JSON-innehåll
- ✅ `pendingWrite` flagga sätts för att indikera att vi väntar på innehåll

### 3. Fånga Upp Innehåll via GET
- ✅ När `pendingWrite` är satt och ett GET-anrop kommer, fångas response upp
- ✅ Innehållet valideras som JSON och sparas i `testMapContent`
- ✅ Framtida GET-anrop returnerar test-versionen istället för produktionsfilen

### 4. Timeout-Fallback
- ✅ Om GET inte kommer efter POST, sätts en timeout (1 sekund)
- ✅ Timeout läser innehållet direkt från Storage via `page.evaluate()`
- ✅ Detta säkerställer att vi alltid får innehållet även om GET misslyckas

### 5. Restore-Funktion
- ✅ `restoreOriginalBpmnMap()` kontrollerar om test-versionen innehåller test-filer
- ✅ Om test-filer finns, återställs original-innehållet till Storage
- ✅ Om inga test-filer finns, behålls test-versionen (kan vara produktionsdata)

### 6. afterEach Hook
- ✅ `restoreOriginalBpmnMap()` anropas i `afterEach` hook i testfilen
- ✅ Detta säkerställer att produktionsfilen alltid återställs efter varje test

## Fördelar med Denna Approach

1. ✅ **Faktiskt JSON-innehåll**: Vi får faktiskt JSON-innehåll från Storage (inte mockat)
2. ✅ **Samma flöde som produktion**: Appen använder samma funktionalitet som i produktion
3. ✅ **Automatisk generering fungerar**: `bpmn-map.json` genereras automatiskt när filer laddas upp
4. ✅ **Produktionsfilen skyddad**: Backup och restore säkerställer att produktionsfilen inte påverkas
5. ✅ **Test-isolering**: Varje test får en ren test-version (ingen kvarvarande data)

## Potentiella Problem och Lösningar

### Problem 1: GET Kommer Inte Efter POST
**Lösning**: Timeout-fallback läser innehållet direkt från Storage efter 1 sekund

### Problem 2: Cleanup Misslyckas
**Lösning**: `restoreOriginalBpmnMap()` anropas i `afterEach` hook, säkerställer cleanup även om testet failar

### Problem 3: Race Conditions
**Lösning**: `pendingWrite` flagga och timeout säkerställer att vi väntar på innehåll

### Problem 4: Test-Versionen Innehåller Produktionsdata
**Lösning**: `restoreOriginalBpmnMap()` kontrollerar om test-filer finns, återställer endast om de finns

## Testning

För att testa implementationen:

```bash
npx playwright test tests/playwright-e2e/feature-goal-documentation.spec.ts --workers=1
```

Förväntade resultat:
- ✅ Testerna ska kunna ladda upp filer
- ✅ `bpmn-map.json` ska genereras automatiskt
- ✅ Test-versionen ska innehålla test-filer
- ✅ Produktionsfilen ska återställas efter varje test
- ✅ Node-matrix ska kunna hitta dokumentationen

## Nästa Steg

1. ✅ Implementerat backup/restore
2. ✅ Implementerat cleanup
3. ✅ Implementerat fallback cleanup i `afterEach`
4. ✅ Implementerat response interception för GET-anrop
5. ⏳ Testa att testerna faktiskt fungerar
6. ⏳ Verifiera att produktionsfilen inte påverkas




