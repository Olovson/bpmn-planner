# Analys: Saknade Feature Goal Dokumentationer

## Problem Identifierat

Användaren har rätt - vi saknar dokumentation för vissa feature goals, särskilt nested subprocesser.

## Filnamnsstrategi

### Hur appen hittar filer

Appen använder `getFeatureGoalDocFileKey(bpmnFile, elementId, templateVersion)` som skapar filnamn:

1. **Om elementId ingår i baseName:** Använd bara `baseName-v2.html`
   - Exempel: `mortgage-se-application.bpmn` + `application` → `mortgage-se-application-v2.html`

2. **Om elementId INTE ingår i baseName:** Använd `baseName-elementId-v2.html`
   - Exempel: `mortgage-se-application.bpmn` + `internal-data-gathering` → `mortgage-se-application-internal-data-gathering-v2.html`

### Application-processens Subprocesser

När Application-processen anropar subprocesser, förväntar sig appen:

1. **internal-data-gathering:**
   - Förväntat: `mortgage-se-application-internal-data-gathering-v2.html`
   - Vi har: `mortgage-se-internal-data-gathering-v2.html` ✅ (matchas via Strategy 5 i analyze-feature-goal-sync.ts)

2. **object:**
   - Förväntat: `mortgage-se-application-object-v2.html`
   - Vi har: **SAKNAS** ❌
   - Vi har: `mortgage-se-object-control-v2.html` (detta är Object Control, inte Object)

3. **household:**
   - Förväntat: `mortgage-se-application-household-v2.html`
   - Vi har: `mortgage-se-household-v2.html` ✅ (matchas via Strategy 5)

4. **stakeholder:**
   - Förväntat: `mortgage-se-application-stakeholder-v2.html`
   - Vi har: `mortgage-se-stakeholder-v2.html` ✅ (matchas via Strategy 5)

## Saknade Dokumentationer

### 1. Object-processen (`mortgage-se-object.bpmn`)

**Status:** ❌ SAKNAS HELT

**Information:**
- BPMN-fil: `mortgage-se-object.bpmn`
- Element ID i Application: `object`
- Förväntat filnamn (från Application): `mortgage-se-application-object-v2.html`
- Alternativt filnamn: `mortgage-se-object-v2.html`
- App-namn: `Application - Object`

**Object-processen har 1 call activity:**
- `object-information` → `mortgage-se-object-information.bpmn` ✅ (finns)

**Vi har:**
- `mortgage-se-object-control-v2.html` (Object Control, inte Object)
- `mortgage-se-object-information-v2.html` (Object Information, subprocess till Object)
- `mortgage-se-object-valuation-v2.html` (Object Valuation, subprocess till Object Control)

**Men saknar:**
- `mortgage-se-object-v2.html` eller `mortgage-se-application-object-v2.html`

## Rekommendationer

### 1. Skapa saknad dokumentation

**Prioritet 1: Object-processen**
- Skapa `mortgage-se-object-v2.html` för Object-processen
- Detta är en viktig subprocess till Application
- Object-processen hanterar objektinformation och anropar Object Information

### 2. Verifiera matchning

Kontrollera att `analyze-feature-goal-sync.ts` matchar alla filer korrekt:
- Strategy 5 matchar `mortgage-se-internal-data-gathering-v2.html` till `internal-data-gathering` i Application
- Men Object-processen saknas helt, så den kan inte matchas

### 3. Uppdatera FEATURE_GOAL_STATUS.md

Lägg till Object-processen i listan som saknad dokumentation.

## Nästa Steg

1. ✅ Identifiera saknade dokumentationer (KLART - Object saknas)
2. ⏳ Skapa `mortgage-se-object-v2.html` för Object-processen
3. ⏳ Verifiera att alla andra nested subprocesser har dokumentation
4. ⏳ Uppdatera `FEATURE_GOAL_STATUS.md`

