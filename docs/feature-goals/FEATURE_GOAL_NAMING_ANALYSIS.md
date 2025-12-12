# Analys: Feature Goal Namngivning - Filnamn vs App-namn

## Problem

Användaren har identifierat att vi verkar ha för få dokumentationsfiler jämfört med antalet subprocesser och call activities. Specifikt:

1. **I appen namnges nested subprocesser med full path:**
   - `Application - Internal data gathering` (enligt README.md)
   - `Application - Object`
   - `Application - Household`
   - `Application - Stakeholder`

2. **Men HTML-filerna heter:**
   - `mortgage-se-internal-data-gathering-v2.html` (utan "Application" prefix)
   - `mortgage-se-object-v2.html` (men vi har `mortgage-se-object-control-v2.html`)
   - `mortgage-se-household-v2.html`
   - `mortgage-se-stakeholder-v2.html`

## Analys

### Antal Feature Goals

- **Total BPMN-filer:** 107
- **Total HTML-filer:** 20
- **Feature goals i bpmn-map.json:** 34 call activities

### Application-processens Subprocesser

Application-processen (`mortgage-se-application.bpmn`) har 4 call activities:

1. **internal-data-gathering** → `mortgage-se-internal-data-gathering.bpmn`
   - HTML-fil: `mortgage-se-internal-data-gathering-v2.html` ✅
   - App-namn: `Application - Internal data gathering`

2. **object** → `mortgage-se-object.bpmn`
   - HTML-fil: **SAKNAS** ❌
   - Vi har: `mortgage-se-object-control-v2.html` (detta är Object Control, inte Object)
   - App-namn: `Application - Object`

3. **household** → `mortgage-se-household.bpmn`
   - HTML-fil: `mortgage-se-household-v2.html` ✅
   - App-namn: `Application - Household`

4. **stakeholder** → `mortgage-se-stakeholder.bpmn`
   - HTML-fil: `mortgage-se-stakeholder-v2.html` ✅
   - App-namn: `Application - Stakeholder`

### Object-processens Subprocesser

Object-processen (`mortgage-se-object.bpmn`) har 1 call activity:

1. **object-information** → `mortgage-se-object-information.bpmn`
   - HTML-fil: `mortgage-se-object-information-v2.html` ✅
   - App-namn: `Application - Object - Object information`

### Object Control-processens Subprocesser

Object Control-processen (`mortgage-se-object-control.bpmn`) har 2 call activities:

1. **object-information** → `mortgage-se-object-information.bpmn`
   - HTML-fil: `mortgage-se-object-information-v2.html` ✅
   - App-namn: `Application - Object - Object Control - Object information`

2. **credit-evaluation-2** → `mortgage-se-credit-evaluation.bpmn`
   - HTML-fil: `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html` ✅
   - App-namn: `Application - Object - Object Control - Automatic Credit Evaluation`

## Slutsats

### Saknade Dokumentationer

1. **`mortgage-se-object-v2.html`** - Object-processen saknas!
   - Detta är en viktig subprocess till Application
   - App-namn: `Application - Object`
   - Vi har `mortgage-se-object-control-v2.html` men inte `mortgage-se-object-v2.html`

### Namngivningsstrategi

**Nuvarande strategi:**
- HTML-filer namnges baserat på BPMN-filnamn: `{bpmn-file}-v2.html`
- Appen använder full path: `{Parent} - {Child}`

**Detta fungerar eftersom:**
- `analyze-feature-goal-sync.ts` matchar feature goals till dokumentation baserat på:
  - Strategy 1: Parent + element ID (e.g., "mortgage-se-application-stakeholder")
  - Strategy 2: Parent + name (e.g., "Application-Stakeholder")
  - Strategy 5: Subprocess file name (e.g., "mortgage-se-stakeholder")

**Men problemet är:**
- Vi saknar `mortgage-se-object-v2.html` för Object-processen
- Object är en viktig subprocess till Application

## Rekommendationer

1. **Skapa saknad dokumentation:**
   - `mortgage-se-object-v2.html` för Object-processen

2. **Verifiera alla nested subprocesser:**
   - Gå igenom alla processer med call activities
   - Kontrollera att alla subprocesser har dokumentation

3. **Uppdatera `FEATURE_GOAL_STATUS.md`:**
   - Lägg till Object-processen i listan
   - Markera som saknad dokumentation

4. **Framtida förbättring:**
   - Skapa ett script som automatiskt identifierar alla saknade dokumentationer
   - Baserat på bpmn-map.json och befintliga HTML-filer

