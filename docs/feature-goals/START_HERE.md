# 🚀 START HÄR: Förbättra HTML-innehåll i Feature Goals

**Detta dokument är din startpunkt VARJE GÅNG du förbättrar HTML-innehåll.**

## ⚠️ PERMANENT REGEL - LÄS DETTA FÖRST

**INNAN du börjar förbättra HTML-filer, MÅSTE du:**

1. ✅ **Läsa `REMEMBER_REUSED_FEATURE_GOALS.md`** - Påminnelse om återkommande feature goals
2. ✅ **Läsa `LANE_ANALYSIS_RULE.md`** - Påminnelse om lane-analys (kundaktivitet vs handläggaraktivitet)
3. ✅ **Läsa `TARGET_AUDIENCE_VALIDATION.md`** - Påminnelse om validering för målgrupper (OBLIGATORISK - INGEN fil är klar förrän alla målgrupper har all information de behöver)
4. ✅ **Köra `npx tsx scripts/analyze-reused-feature-goals.ts`** - Identifiera återkommande feature goals
5. ✅ **Läsa `REUSED_FEATURE_GOALS_ANALYSIS.md`** - Se vilka feature goals som är återkommande
6. ✅ **Läsa `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`** - Huvudarbetsprocessen

**Detta är en PERMANENT regel som ALDRIG får glömmas.**

## Snabbguide

### Steg 1: Identifiera återkommande feature goals
```bash
npx tsx scripts/analyze-reused-feature-goals.ts
```

Detta genererar `REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals.

### Steg 2: Förbättra HTML-filer
Följ `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` för varje fil.

**För återkommande feature goals:**
- Lägg till "Anropningskontexter" sektion i Beskrivning
- Lägg till kontextspecifika input/output-krav
- Följ strukturen i `REUSED_FEATURE_GOAL_TEMPLATE.md`

### Steg 3: Kvalitetskontroll
Följ checklistan i `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`.

## Viktiga dokument

- **Start här:** `START_HERE.md` (detta dokument)
- **Påminnelse:** `REMEMBER_REUSED_FEATURE_GOALS.md` - Läs VARJE GÅNG
- **Arbetsprocess:** `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - Huvudprocessen
- **Strategi:** `REUSED_FEATURE_GOALS_STRATEGY.md` - Strategi för återkommande feature goals
- **Mall:** `REUSED_FEATURE_GOAL_TEMPLATE.md` - HTML-mall
- **Analys:** `REUSED_FEATURE_GOALS_ANALYSIS.md` - Automatisk analys (genereras)
- **Permanent regel:** `REUSED_FEATURE_GOALS_PERMANENT_RULE.md` - Permanent regel

## Kompatibilitet med appen

**✅ Alla ändringar fungerar i appen:**
- HTML-strukturen (h3-rubriker, listor, etc.) är standard HTML som renderas korrekt
- Appen läser filer från `public/local-content/feature-goals/` direkt
- Inga specialkrav - standard HTML fungerar perfekt

## Hållbarhet

**✅ Processen är permanent dokumenterad:**
- Permanent regel i `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`
- Automatisk identifiering via `analyze-reused-feature-goals.ts`
- Tydlig dokumentation och mallar
- Checklista som alltid inkluderar återkommande feature goals

**När du förbättrar HTML-innehåll om en månad:**
1. Läs `START_HERE.md` (detta dokument)
2. Läs `REMEMBER_REUSED_FEATURE_GOALS.md`
3. Kör `analyze-reused-feature-goals.ts`
4. Följ `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`

**Processen kommer att vara densamma och allt kommer att fungera!**

