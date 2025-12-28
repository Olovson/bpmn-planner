# Fix: Console-fel från gamla testfiler

## Problem

Efter inloggning ser användaren många fel i konsolen:
```
GET http://127.0.0.1:54321/storage/v1/object/bpmn-files/test-1766766789302-9766-mortgage-se-object-information.bpmn 400 (Bad Request)
Kunde inte parsa test-1766766789302-9766-mortgage-se-object-information.bpmn: Error: Failed to load BPMN file
```

## Orsak

Det finns många gamla testfiler i databasen (`bpmn_files` tabellen) som inte längre finns i Storage. När appen försöker bygga process-grafen, försöker den ladda alla filer från databasen, men många av dem finns inte i Storage längre, vilket orsakar 400-fel.

## Lösning

### 1. Förbättrad error handling

**Filer ändrade:**
- `src/lib/bpmnProcessGraph.ts` - Förbättrad error handling i `parseAllBpmnFiles`
- `src/lib/bpmnParser.ts` - Förbättrad error handling i `parseBpmnFile`

**Vad som ändrats:**
- Testfiler som saknas i Storage loggas nu bara som warnings i dev-miljö
- Produktionsfiler eller andra fel loggas fortfarande som errors
- Detta förhindrar spam i konsolen från gamla testfiler

### 2. Cleanup av gamla testfiler

**Script:**
- `scripts/cleanup-test-files-from-storage.ts` - Rensar gamla testfiler från både Storage och databasen

**Kör:**
```bash
npm run cleanup:test-files:storage
```

**Vad scriptet gör:**
- Rensar testfiler äldre än 10 minuter från Storage
- Rensar testfiler äldre än 10 minuter från databasen (`bpmn_files` tabellen)

## Resultat

Efter fixarna:
- ✅ Gamla testfiler som saknas i Storage orsakar inte längre fel i konsolen
- ✅ Endast warnings i dev-miljö för testfiler som saknas
- ✅ Produktionsfiler eller andra fel loggas fortfarande korrekt
- ✅ Cleanup-scriptet rensar automatiskt gamla testfiler

## Ytterligare åtgärder

### Automatisk cleanup

Testet `tests/playwright-e2e/feature-goal-documentation.spec.ts` har nu automatisk cleanup i `afterEach`:
- Rensar automatiskt testfiler äldre än 10 minuter efter varje test
- Detta förhindrar ackumulering av gamla testfiler

### Manuell cleanup

Om du fortfarande ser många fel:
1. Kör cleanup-scriptet:
   ```bash
   npm run cleanup:test-files:storage
   ```

2. Ladda om sidan för att se om felen försvinner

3. Om felen kvarstår, kan det vara att det finns testfiler i databasen som inte rensats. I så fall kan du manuellt rensa dem från Supabase dashboard.

## Testning

För att testa att fixarna fungerar:
1. Ladda om sidan efter att ha kört cleanup-scriptet
2. Kolla Console - du borde inte se längre se 400-fel för testfiler
3. Om du fortfarande ser fel, kolla om de är för produktionsfiler (inte testfiler)



