# Valideringsprocess för Feature Goal Dokumentation

## Syfte

Detta dokument beskriver den obligatoriska valideringsprocessen som säkerställer att alla feature goals (call activities) i BPMN-filerna har korrekt dokumentation.

## ⚠️ PERMANENT REGEL

**Validering MÅSTE alltid köras innan dokumentation anses komplett.**

Detta är en **PERMANENT del av arbetsprocessen** och ska **ALDRIG hoppas över**.

## Valideringsscript

### `scripts/validate-feature-goal-documentation.ts`

Detta script använder **`bpmn-map.json` direkt** för att validera dokumentation. Ingen komplex matchningslogik behövs - vi vet redan exakt vilka filer som ska finnas!

**Hur det fungerar:**
1. Läser `bpmn-map.json` för att hitta alla call activities (feature goals)
2. För varje call activity:
   - Tar `subprocess_bpmn_file` (t.ex. `mortgage-se-object.bpmn`)
   - Genererar förväntat filnamn med `getFeatureGoalDocFileKey`-logik (samma som appen)
   - Kontrollera om filen finns
   - Verifiera att filen refererar till rätt BPMN-fil

**Varför ingen matchningslogik?**
- `bpmn-map.json` innehåller redan all information vi behöver
- Varje call activity har `subprocess_bpmn_file` som direkt säger vilken BPMN-fil som är feature goal-processen
- Appen använder samma logik (`getFeatureGoalDocFileKey`) för att generera filnamn
- Om `bpmn-map.json` inte är korrekt, kommer varken appen eller scripts att fungera

### Hur det fungerar

1. **Läser `bpmn-map.json`** för att hitta alla call activities (feature goals)
2. **Läser alla HTML-filer** i `public/local-content/feature-goals/`
3. **Matchar varje feature goal** till en dokumentationsfil med samma logik som appen
4. **Validerar matchningen** genom att:
   - Kontrollera att filnamnet matchar subprocess BPMN-filnamnet (primär validering)
   - Kontrollera att HTML-innehållet refererar till rätt BPMN-fil
5. **Rapporterar resultat:**
   - ✅ Validerade dokumentationer
   - ⚠️ Varningar (t.ex. filnamn mismatch men innehåll korrekt)
   - ❌ Saknade dokumentationer

### Filnamnsgenerering (samma som appen)

Scriptet använder **exakt samma logik** som `getFeatureGoalDocFileKey` i `nodeArtifactPaths.ts`:

**⚠️ HIERARKISKA FILNAMN (matchar Jira-namnen):**

För icke-återkommande feature goals används hierarkiska filnamn som matchar Jira-namnen:
- **Format:** `{parent_bpmn_file}-{elementId}-v2.html`
- **Exempel:** `mortgage-se-application-internal-data-gathering-v2.html` (matchar Jira-namn: "Application - Internal data gathering")
- **Parent BPMN-fil:** `parent_bpmn_file` från bpmn-map.json (t.ex. `mortgage-se-application.bpmn`)
- **Element ID:** `bpmn_id` från call activity (t.ex. `internal-data-gathering`)

**För återkommande feature goals:**
- Samma subprocess kan anropas med olika `bpmn_id` från olika ställen
- **Behåller legacy-namn:** `{subprocess_bpmn_file}-v2.html` (t.ex. `mortgage-se-credit-evaluation-v2.html`)
- **En gemensam fil** för alla kontexter (enligt `REUSED_FEATURE_GOALS_STRATEGY.md`)
- Valideringen accepterar både hierarkiska namn OCH legacy-namn (för bakåtkompatibilitet)

**Legacy-namn (bakåtkompatibilitet):**
- Om hierarkiskt namn inte finns, försöker appen med legacy-namn
- **Format:** `{subprocess_bpmn_file}-{elementId}-v2.html` eller `{subprocess_bpmn_file}-v2.html`
- Används för bakåtkompatibilitet och återkommande feature goals

## När ska valideringen köras?

### Obligatoriskt före dokumentation anses komplett

Valideringen MÅSTE köras:
1. **Innan dokumentation anses komplett** - Efter att alla filer har förbättrats
2. **Efter att nya dokumentationer har skapats** - För att säkerställa att de matchar korrekt
3. **Efter att BPMN-filer har uppdaterats** - För att identifiera nya eller ändrade feature goals
4. **Som del av kontinuerlig kvalitetskontroll** - Regelbundet för att säkerställa att dokumentationen är komplett

### I arbetsprocessen

Valideringen ingår som **obligatoriskt steg** i `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`:

```bash
npx tsx scripts/validate-feature-goal-documentation.ts
```

## Tolka resultat

### ✅ Validering lyckad

```
✅ VALIDERING LYCKAD: Alla feature goals har dokumentation!
```

**Betydelse:** Alla feature goals har dokumentation och matchningar är korrekta.

### ⚠️ Validering klar med varningar

```
⚠️  VALIDERING KLAR MED VARNINGAR: Kontrollera varningar ovan!
```

**Betydelse:** Alla feature goals har dokumentation, men vissa matchningar har varningar (t.ex. filnamn mismatch men innehåll korrekt).

**Åtgärd:** Granska varningarna och verifiera att matchningarna är medvetna och korrekta.

### ❌ Validering misslyckad

```
❌ VALIDERING MISSLYCKAD: Saknade dokumentationer måste skapas!
```

**Betydelse:** En eller flera feature goals saknar dokumentation.

**Åtgärd:** Skapa saknade dokumentationer enligt `AUTO_IMPROVEMENT_EXECUTION_PLAN.md`.

## Exempel på varningar

### Filnamn mismatch

```
⚠️  Application → Object
   Fil: mortgage-se-object-control-v2.html
   Varning: ⚠️  FILNAMN MISSMATCH: Förväntat "mortgage-se-object-v2.html" men fick "mortgage-se-object-control-v2.html". Innehållet verkar korrekt, men verifiera att detta är medvetet.
```

**Betydelse:** Matchningen hittade en fil, men filnamnet matchar inte det förväntade namnet baserat på subprocess BPMN-filnamnet.

**Åtgärd:** 
- Om matchningen är korrekt (t.ex. för återkommande feature goals med specifika kontexter), acceptera varningen
- Om matchningen är felaktig, skapa eller omdöpa filen till det förväntade namnet

## Integration med arbetsprocessen

Valideringen är integrerad i `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` som:

1. **Steg 1:** Kör validering för att identifiera saknade dokumentationer
2. **Efter förbättringar:** Kör validering igen för att säkerställa att allt är korrekt
3. **Kvalitetskontroll:** Validering används som kvalitetskontroll innan dokumentation anses komplett

## Automatisering

Valideringen kan integreras i:
- **CI/CD-pipeline:** Köra validering automatiskt vid commits
- **Pre-commit hooks:** Köra validering innan commits accepteras
- **Scheduled jobs:** Köra validering regelbundet för att säkerställa att dokumentationen är komplett

## Felsökning

### Problem: Valideringen hittar inte en fil som finns

**Möjliga orsaker:**
1. Filnamnet matchar inte matchningsstrategierna
2. Filen har fel version-suffix (t.ex. `-v1.html` istället för `-v2.html`)
3. Filen har fel prefix (t.ex. `local--` eller `slow--`)

**Lösning:**
1. Kontrollera filnamnet mot förväntat namn (baserat på subprocess BPMN-filnamn)
2. Verifiera att filen har rätt version-suffix
3. Kontrollera att filen ligger i rätt mapp (`public/local-content/feature-goals/`)

### Problem: Valideringen matchar fel fil

**Möjliga orsaker:**
1. Matchningsstrategin är för generös (t.ex. "object" matchar "object-control")
2. Flera filer matchar samma feature goal

**Lösning:**
1. Kontrollera att filnamnet matchar subprocess BPMN-filnamnet exakt
2. Verifiera att HTML-innehållet refererar till rätt BPMN-fil
3. Om matchningen är felaktig, skapa eller omdöpa filen till det förväntade namnet

## Best Practices

1. **Kör validering regelbundet** - Inte bara när dokumentation skapas/uppdateras
2. **Lös varningar proaktivt** - Varningar kan indikera potentiella problem
3. **Verifiera matchningar** - Även om valideringen lyckas, verifiera att matchningarna är korrekta
4. **Dokumentera undantag** - Om en varning är medveten (t.ex. för återkommande feature goals), dokumentera varför

## Relaterade dokument

- `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - Huvudarbetsprocessen
- `FEATURE_GOAL_STATUS.md` - Status över dokumentationer
- `REUSED_FEATURE_GOALS_STRATEGY.md` - Strategi för återkommande feature goals
- `TARGET_AUDIENCE_VALIDATION.md` - Validering för målgrupper

