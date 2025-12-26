# Analys av Test-problem

## Problem 1: Timeout vid navigering till process-explorer

**Verklig orsak:** Inte timeout vid navigering, utan CSS selector-fel!
- Felet var: `Error: locator.count: Unexpected token "=" while parsing css selector "svg, [data-testid="process-tree"], text=/process/i"`
- Problemet: Playwright accepterar inte regex (`text=/process/i`) i en kombinerad CSS selector
- **Fix:** Separerade selectors i olika locators och kollade varje separat

## Problem 2: Login fungerar inte i test 2

**Verklig orsak:** Test 2 anropade `stepNavigateToFiles` direkt utan att först logga in!
- Testet förväntade sig att `storageState` skulle fungera, men det verkar inte fungera korrekt
- **Fix:** Lade till login-check i början av test 2, samma som i test 1

## Ytterligare problem upptäckta

1. **Filer visas inte i tabellen efter upload:**
   - `ensureBpmnFileExists` laddar upp filen, men filen visas inte omedelbart i tabellen
   - **Fix:** Lade till mer robust väntning med retry-logik

2. **`ensureFileCanBeSelected` hittar inga filer:**
   - Selector hittar inte filer i tabellen
   - **Fix:** Uppdaterade selector för att hitta filer i `td`, `th`, `a`, `button` element

3. **`stepSelectFile` misslyckas:**
   - Filen hittas men kan inte klickas
   - Möjlig orsak: Filen är inte klickbar eller selector är fel

## Status

- ✅ Login fungerar nu i båda testerna
- ✅ CSS selector-fel fixat för process-explorer
- ⚠️ Filer visas inte alltid i tabellen efter upload (timing-problem)
- ⚠️ `stepSelectFile` misslyckas (möjligen relaterat till att filen inte hittas korrekt)

## Nästa steg

1. Förbättra väntning efter file upload
2. Förbättra selector för att hitta filer i tabellen
3. Förbättra `stepSelectFile` för att hantera olika typer av fil-element

