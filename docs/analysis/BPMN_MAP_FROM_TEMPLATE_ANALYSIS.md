# Analys: Extrahera BPMN Map från mortgage-template-main

## Översikt

I `mortgage-template-main` finns call activity handlers som definierar mappningen mellan call activities och process-filer. Dessa handlers kan användas för att automatiskt generera `bpmn-map.json` istället för att manuellt underhålla den.

## Källor för Mapping-Information

### 1. Root Level Call Activity Handlers
**Plats:** `modules/mortgage-se/process-config/mortgage/handlers/call-activities/`

Varje fil i denna mapp motsvarar en call activity i `mortgage.bpmn` och innehåller:
- Handler-namn = call activity ID i BPMN-filen
- `selectFlowDefinition()` returnerar process-id som matchar filnamnet

**Exempel:**
- `application.ts` → `selectFlowDefinition()` returnerar `'mortgage-se-application'`
- Detta mappar call activity `application` i `mortgage.bpmn` till `mortgage-se-application.bpmn`

### 2. Subprocess Call Activity Handlers
**Plats:** `modules/mortgage-se/processes/{process-name}/handlers/call-activities/`

Varje subprocess kan ha egna call activities med handlers som mappar till andra processer.

**Exempel:**
- `modules/mortgage-se/processes/offer/handlers/call-activities/documentation-handling.ts`
  - Mappar call activity `documentation-handling` i `mortgage-se-offer.bpmn` till `mortgage-se-documentation-handling.bpmn`

### 3. Module.yaml
**Plats:** `modules/mortgage-se/module.yaml`

Listar alla processer i modulen, vilket kan användas för att verifiera att alla processer finns.

## Struktur

```
modules/mortgage-se/
├── module.yaml                          # Listar alla processer
├── process-config/
│   └── mortgage/
│       ├── diagrams/
│       │   └── mortgage.bpmn            # Root BPMN-fil
│       └── handlers/
│           └── call-activities/         # Root level call activity handlers
│               ├── application.ts       # application -> mortgage-se-application
│               ├── credit-evaluation.ts # credit-evaluation -> mortgage-se-credit-evaluation
│               └── ...
└── processes/
    ├── application/
    │   ├── diagrams/
    │   │   └── mortgage-se-application.bpmn
    │   └── handlers/
    │       └── call-activities/         # Subprocess call activity handlers
    │           ├── household.ts         # household -> mortgage-se-household
    │           └── ...
    └── offer/
        ├── diagrams/
        │   └── mortgage-se-offer.bpmn
        └── handlers/
            └── call-activities/
                ├── documentation-handling.ts  # documentation-handling -> mortgage-se-documentation-handling
                └── credit-decision.ts        # credit-decision -> mortgage-se-credit-decision
```

## Mapping-Regler

### Handler-namn → Process ID → BPMN-fil

1. **Handler-namn** = call activity ID i BPMN-filen (t.ex. `application`, `credit-evaluation`)
2. **Process ID** = returneras av `selectFlowDefinition()` (t.ex. `mortgage-se-application`)
3. **BPMN-fil** = `{process-id}.bpmn` (t.ex. `mortgage-se-application.bpmn`)

### Exempel

**Root level (mortgage.bpmn):**
- Handler: `application.ts`
- Call activity ID: `application`
- Process ID: `mortgage-se-application` (från `selectFlowDefinition()`)
- BPMN-fil: `mortgage-se-application.bpmn`

**Subprocess level (mortgage-se-offer.bpmn):**
- Handler: `documentation-handling.ts` i `processes/offer/handlers/call-activities/`
- Call activity ID: `documentation-handling`
- Process ID: `mortgage-se-documentation-handling` (från `selectFlowDefinition()`)
- BPMN-fil: `mortgage-se-documentation-handling.bpmn`

## Extraktionsplan

### Steg 1: Extrahera Root Level Mappningar

1. Läs alla filer i `modules/mortgage-se/process-config/mortgage/handlers/call-activities/`
2. För varje fil:
   - Handler-namn = filnamn utan `.ts`
   - Extrahera process-id från `selectFlowDefinition()` (regex: `process\.env\.MORTGAGE_SE_(\w+)_PROCESS_ID\s*\|\|\s*'([^']+)'`)
   - Mappa: `mortgage.bpmn` → call activity `{handler-namn}` → `{process-id}.bpmn`

### Steg 2: Extrahera Subprocess Mappningar

1. För varje process i `modules/mortgage-se/processes/`:
   - Om `handlers/call-activities/` finns:
     - Läs alla `.ts` filer
     - För varje fil:
       - Handler-namn = filnamn utan `.ts`
       - Process-namn = process-mappen (t.ex. `offer`)
       - Extrahera process-id från `selectFlowDefinition()`
       - Mappa: `mortgage-se-{process-namn}.bpmn` → call activity `{handler-namn}` → `{process-id}.bpmn`

### Steg 3: Verifiera mot BPMN-filer

1. Läs alla BPMN-filer i `modules/mortgage-se/processes/*/diagrams/*.bpmn`
2. Verifiera att alla process-IDs från handlers matchar faktiska BPMN-filer
3. Verifiera att alla call activities i BPMN-filer har motsvarande handlers (eller kan matchas automatiskt)

### Steg 4: Bygg bpmn-map.json

1. Skapa process-entries för varje BPMN-fil
2. Lägg till call_activities baserat på extraherade mappningar
3. Använd `module.yaml` för att verifiera att alla processer är inkluderade

## Implementation

### Script: `scripts/generate-bpmn-map-from-template.ts`

Detta script skulle:
1. Läsa call activity handlers från `mortgage-template-main`
2. Extrahera mappningar
3. Parsa BPMN-filer för att verifiera call activity IDs
4. Generera `bpmn-map.json` i rätt format

### Fördelar

- ✅ Automatisk synkronisering med källan
- ✅ Mindre manuellt arbete
- ✅ Färre fel (ingen manuell mappning)
- ✅ Uppdateras automatiskt när handlers ändras

### Utmaningar

- ⚠️ Handler-namn måste matcha call activity IDs i BPMN-filer
- ⚠️ Vissa call activities kan sakna handlers (använd automatisk matchning som fallback)
- ⚠️ Process ID kan skilja sig från filnamn (t.ex. `mortgage-se-document-disbursement` vs `mortgage-se-disbursement.bpmn`)

## Verifiering

### Process-IDs som inte matchar filnamn

Några handlers returnerar process-IDs som inte matchar filnamn direkt:
- `mortgage-se-document-signing` → faktisk fil: `mortgage-se-signing.bpmn`
- `mortgage-se-document-disbursement` → faktisk fil: `mortgage-se-disbursement.bpmn`

Dessa behöver specialhantering i extraktionsscriptet.

### Extraherade Mappningar

**Root level (mortgage.bpmn):** 17 call activities
**Subprocess level:** 13 call activities över 7 subprocesser

**Totalt:** 30 call activity mappningar kan extraheras automatiskt från handlers.

## Implementation Status

1. ✅ Analysera strukturen (KLAR)
2. ✅ Skapa script för att extrahera mappningar från handlers (KLAR)
3. ✅ Hantera process-ID → filnamn-mappningar (KLAR)
4. ✅ Verifiera mot faktiska BPMN-filer (KLAR)
5. ✅ Generera `bpmn-map.json` automatiskt (KLAR)
6. ✅ Integrera som manuellt script (KLAR)
7. ⚠️ **VIKTIGT:** Identifierat missmatch mellan handlers och BPMN-filer (se separat analys – ej inkluderad i repo)

## ⚠️ Viktig Varning: Handler-baserad Mappning är INTE Komplett

**Vi kan INTE enbart använda handler-baserat script** eftersom:

1. **Handlers täcker inte alla call activities:**
   - `documentation-assessment` finns i BPMN-filer men saknar handler
   - `sales-contract-credit-decision` finns i BPMN-filer men saknar handler
   - `Activity_1gzlxx4` finns i BPMN-fil men saknar handler (använder `calledElement` istället)

2. **Handlers matchar inte alltid call activity IDs:**
   - Handler-namn (`credit-evaluation`) matchar inte alltid call activity ID (`Activity_1gzlxx4`)
   - BPMN-filer kan använda `calledElement` för att peka på handlers

3. **Nya call activities kan saknas handlers:**
   - Call activities som lagts till i BPMN-filer men inte implementerats ännu saknas handlers

**Rekommendation:** Använd **hybrid-approach** som kombinerar handlers + BPMN-parsing. (Detaljerad analys saknas i repo.)

## Användning

```bash
# Generera bpmn-map.json från mortgage-template-main
npm run generate:bpmn-map:template

# Eller med anpassad sökväg
npx tsx scripts/generate-bpmn-map-from-template.ts /path/to/mortgage-template-main
```

**⚠️ VIKTIGT:** Scriptet genererar `bpmn-map-from-template.json` som **INTE är komplett**!

### Steg-för-steg Process

1. **Generera från handlers:**
   ```bash
   npm run generate:bpmn-map:template
   ```

2. **Jämför med befintlig:**
   - Öppna `bpmn-map-from-template.json` och `bpmn-map.json`
   - Identifiera call activities som saknas i genererad fil

3. **Kombinera resultaten:**
   - Använd handler-mappningar som primär källa (de är korrekta)
   - Lägg till call activities från befintlig `bpmn-map.json` som saknas handlers
   - Markera call activities utan handlers som `needs_manual_review: true`

4. **Verifiera:**
   - Alla call activities från BPMN-filer ska finnas i `bpmn-map.json`
   - Call activities med handlers ska ha korrekta mappningar
   - Call activities utan handlers ska vara markerade för review

### Automatiserad Kombinering

För att automatisera steg 2-3, använd hybrid‑approach (handlers + BPMN‑parsing). (Detaljerad analys saknas i repo.)

## Resultat

- **22 processer** hittade
- **34 call activities** extraherade (17 root level + 17 subprocess)
- **Automatisk mappning** från handlers till BPMN-filer
- **Specialfall hanterade** (document-signing → signing.bpmn, etc.)

**⚠️ OBS:** Detta är INTE komplett! Befintlig `bpmn-map.json` har 38-39 call activities, vilket betyder att 4-5 call activities saknas handlers och måste läggas till manuellt eller via BPMN-parsing.

## Se även

- [`bpmn-map.json`](../../bpmn-map.json) - Nuvarande manuellt underhållen map
- [`scripts/generate-bpmn-map-auto.ts`](../../scripts/generate-bpmn-map-auto.ts) - Automatisk generering från BPMN-filer
- [`src/lib/bpmn/bpmnMapAutoGenerator.ts`](../../src/lib/bpmn/bpmnMapAutoGenerator.ts) - Auto-genereringslogik
