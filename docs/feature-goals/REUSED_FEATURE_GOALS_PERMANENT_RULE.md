# PERMANENT REGEL: Återkommande Feature Goals

**⚠️ DETTA ÄR EN PERMANENT REGEL SOM ALDRIG FÅR GLÖMMAS**

## Regel

**När du förbättrar HTML-innehållet i feature goals, MÅSTE du:**

1. **ALDRIG glömma att identifiera återkommande feature goals**
2. **ALLTID köra `npx tsx scripts/analyze-reused-feature-goals.ts` FÖRST**
3. **ALLTID lägga till "Anropningskontexter" sektion för återkommande feature goals**
4. **ALLTID lägga till kontextspecifika input/output-krav**
5. **ALLTID följa strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`**

## Varför detta är viktigt

- **Återkommande feature goals är vanliga:** 8 av våra feature goals anropas från flera ställen
- **Dokumentationen måste vara tydlig:** Användare behöver förstå var, när, varför och vad som är annorlunda
- **Kvalitet kräver detta:** Utan korrekt dokumentation av återkommande feature goals blir dokumentationen ofullständig

## Vad händer om du glömmer detta?

- **Dokumentationen blir ofullständig:** Användare förstår inte varför processen anropas igen
- **Manuella uppdateringar krävs:** Vi måste gå tillbaka och fixa filerna manuellt
- **Kvaliteten sjunker:** Dokumentationen blir mindre användbar

## Hur säkerställer vi att detta aldrig glöms?

1. **PERMANENT regel i AUTO_IMPROVEMENT_EXECUTION_PLAN.md**
2. **Automatiskt script:** `analyze-reused-feature-goals.ts` identifierar alla återkommande feature goals
3. **Tydlig dokumentation:** `REUSED_FEATURE_GOALS_STRATEGY.md` och `REUSED_FEATURE_GOAL_TEMPLATE.md`
4. **Checklista:** Kvalitetschecklistan inkluderar återkommande feature goals

## Checklista för varje session

När du förbättrar HTML-innehåll, kontrollera:

- [ ] Har jag kört `npx tsx scripts/analyze-reused-feature-goals.ts`?
- [ ] Har jag identifierat alla återkommande feature goals?
- [ ] Har jag lagt till "Anropningskontexter" sektion för varje återkommande feature goal?
- [ ] Har jag lagt till kontextspecifika input/output-krav?
- [ ] Har jag följt strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`?

**Om något på listan inte är klart - FIXA DET INNAN DU GÅR VIDARE.**

