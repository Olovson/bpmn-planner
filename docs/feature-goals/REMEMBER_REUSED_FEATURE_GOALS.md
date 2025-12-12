# ⚠️ KOMP IHÅG: Återkommande Feature Goals

**Detta dokument är en påminnelse som ska läsas VARJE GÅNG du förbättrar HTML-innehåll.**

## Snabbchecklist

**INNAN du börjar förbättra HTML-filer:**

1. ✅ Har jag kört `npx tsx scripts/analyze-reused-feature-goals.ts`?
2. ✅ Har jag läst `REUSED_FEATURE_GOALS_ANALYSIS.md` för att se vilka feature goals som är återkommande?
3. ✅ Har jag läst `REUSED_FEATURE_GOALS_STRATEGY.md` för att förstå strategin?
4. ✅ Har jag läst `REUSED_FEATURE_GOAL_TEMPLATE.md` för att se strukturen?

**FÖR VARJE FIL du förbättrar:**

1. ✅ Är detta feature goal återkommande? (Kontrollera i `REUSED_FEATURE_GOALS_ANALYSIS.md`)
2. ✅ Om ja: Har jag lagt till "Anropningskontexter" sektion?
3. ✅ Har jag lagt till kontextspecifika input/output-krav?
4. ✅ Följer jag strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`?

## Varför detta är viktigt

- **8 av våra feature goals är återkommande** (anropas från 2-5 ställen)
- **Dokumentationen måste förklara varför processen anropas igen** (vilken ny information)
- **Utan detta blir dokumentationen ofullständig och förvirrande**

## Vad händer om du glömmer detta?

- ❌ Dokumentationen blir ofullständig
- ❌ Användare förstår inte varför processen anropas igen
- ❌ Vi måste gå tillbaka och fixa filerna manuellt
- ❌ Kvaliteten sjunker

## Lösning: Automatiserad process

**Framtida uppdateringar kommer automatiskt att:**
1. Identifiera återkommande feature goals via `analyze-reused-feature-goals.ts`
2. Generera analysrapport med alla anropningskontexter
3. Påminna dig att uppdatera filerna enligt strategin

**Men du måste fortfarande:**
- Läsa analysrapporten
- Följa strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`
- Lägga till "Anropningskontexter" sektioner manuellt (eller be mig göra det)

## Relaterade dokument

- **Strategi:** `REUSED_FEATURE_GOALS_STRATEGY.md`
- **Mall:** `REUSED_FEATURE_GOAL_TEMPLATE.md`
- **Analys:** `REUSED_FEATURE_GOALS_ANALYSIS.md` (genereras automatiskt)
- **Permanent regel:** `REUSED_FEATURE_GOALS_PERMANENT_RULE.md`
- **Arbetsprocess:** `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` (innehåller permanent regel)

**⚠️ LÄS DETTA VARJE GÅNG INNAN DU BÖRJAR FÖRBÄTTRA HTML-INNEHÅLL!**

