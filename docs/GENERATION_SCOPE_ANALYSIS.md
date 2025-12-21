# Analys av Genereringsscope och Potentiella Problem

## Problem som redan är fixade

### 1. Subprocess-generering inkluderade parent-filer
**Problem:** När Household (subprocess) genererades med `useHierarchy = true`, inkluderades parent-filen (application.bpmn) i `analyzedFiles`, vilket gjorde att noder från parent-filen också genererades (KALP, object, confirm-application).

**Lösning:** `analyzedFiles` begränsas nu till bara den valda filen (`bpmnFileName`) om det inte är root-fil-generering. Hierarkin används fortfarande för att bygga graf med kontext, men dokumentation genereras bara för den valda filen.

**Kod:** `src/lib/bpmnGenerators.ts:1324-1326`

## Potentiella problem vid batch-generering

### 2. Batch-generering med flera subprocesser
**Scenario:** När flera filer genereras i batch (t.ex. Household, Stakeholder, Object), och varje fil är en subprocess med samma parent (application.bpmn).

**Nuvarande beteende:**
- Varje fil genereras individuellt via `handleGenerateArtifacts` (rad 2444)
- För varje subprocess inkluderas parent i `graphFiles` (rad 1552)
- Men `analyzedFiles` är begränsad till bara den valda filen (tack vare fix #1)

**Status:** ✅ **OK** - Varje fil genereras separat, så parent inkluderas bara i grafen för kontext, inte i `analyzedFiles`.

### 3. Root-fil-generering inkluderar alla subprocesser
**Scenario:** När root-filen (mortgage.bpmn) genereras med `useHierarchy = true`.

**Nuvarande beteende:**
- `isRootFileGeneration = true` om `bpmnFileName` är första filen i `summary.filesIncluded`
- `analyzedFiles = summary.filesIncluded` (alla filer i hierarkin)
- Detta är **avsiktligt** och korrekt för root-fil-generering

**Status:** ✅ **OK** - Detta är önskat beteende för root-fil-generering.

### 4. Batch-generering utan root-fil
**Scenario:** När flera filer genereras i batch utan root-fil (fallback-scenario, rad 2420-2471).

**Nuvarande beteende:**
- Varje fil genereras individuellt via loop (rad 2442)
- Varje fil får sin egen `graphFiles` och `analyzedFiles`
- Fix #1 säkerställer att `analyzedFiles` bara innehåller den valda filen

**Status:** ✅ **OK** - Varje fil genereras isolerat.

## Potentiella framtida problem

### 5. `graphFileScope` inkluderar för många filer
**Scenario:** När en subprocess genereras, inkluderas parent + siblings i `graphFiles` (rad 1552), men `graphFileScope` i `bpmnGenerators.ts` använder `existingBpmnFiles` om `useHierarchy = true` (rad 1284-1285).

**Nuvarande beteende:**
- `graphFileScope` sätts till `existingBpmnFiles` om `useHierarchy = true`
- Men `graphFiles` från `BpmnFileManager.tsx` skickas som `existingBpmnFiles` till `generateAllFromBpmnWithGraph`
- Så `graphFileScope` blir faktiskt `graphFiles` (som redan är begränsad)

**Status:** ✅ **OK** - `graphFileScope` får rätt värde via `existingBpmnFiles`-parametern.

### 6. `nodeFilter` och batch-generering
**Scenario:** När diff-baserad regenerering används med `nodeFilter`, och flera filer genereras i batch.

**Nuvarande beteende:**
- `nodeFilter` skapas per fil baserat på unresolved diffs (rad 1567-1587)
- Varje fil får sin egen `nodeFilter` när den genereras
- `analyzedFiles` är redan begränsad till bara den valda filen

**Status:** ✅ **OK** - `nodeFilter` fungerar korrekt per fil.

## Rekommendationer

1. ✅ **Fixat:** `analyzedFiles` begränsas nu korrekt till bara den valda filen för subprocesser
2. ✅ **Verifierat:** Batch-generering fungerar korrekt eftersom varje fil genereras separat
3. ✅ **Verifierat:** Root-fil-generering fungerar korrekt med fullständig hierarki
4. 📝 **Överväg:** Lägg till mer explicit logging för att visa vilka filer som inkluderas i `graphFileScope` vs `analyzedFiles` (redan implementerat i rad 1328-1340)

## Debug-logging

Debug-logging har lagts till i `bpmnGenerators.ts:1328-1340` för att visa:
- `bpmnFileName`: Den valda filen
- `useHierarchy`: Om hierarki används
- `nodeFilter`: Om filter finns
- `isRootFileGeneration`: Om det är root-fil-generering
- `graphFileScope`: Vilka filer som inkluderas i grafen (för kontext)
- `summaryFilesIncluded`: Vilka filer som finns i grafen
- `analyzedFiles`: Vilka filer som faktiskt får dokumentation genererad

Detta hjälper att identifiera framtida problem med genereringsscope.
