# Implementation Plan: JSON Export/Import för Feature Goals

## Översikt

Implementera JSON-baserad export/import för Feature Goal-dokumentation som ersätter HTML-redigering. Detta gör manuell redigering kompatibel med appens befintliga arkitektur.

---

## Steg 1: Utöka FeatureGoalDocModel.scenarios

### Mål
Lägg till testgenerering-fält till scenario-strukturen så den matchar `EpicScenario`.

### Ändringar

**Fil:** `src/lib/featureGoalLlmTypes.ts`

```typescript
// Före:
scenarios: {
  id: string;
  name: string;
  type: string;
  outcome: string;
}[];

// Efter:
scenarios: {
  id: string;
  name: string;
  type: string;
  outcome: string;
  // Nya fält för testgenerering:
  persona?: 'customer' | 'advisor' | 'system' | 'unknown';
  riskLevel?: 'P0' | 'P1' | 'P2';
  assertionType?: 'functional' | 'regression' | 'compliance' | 'other';
  uiFlow?: {
    pageId: string;
    action: string;
    locatorId?: string;
    dataProfileId?: string;
  }[];
  dataProfileId?: string;
}[];
```

### Validering
- TypeScript-kompilering ska fungera
- Befintlig kod ska fortsätta fungera (backward compatible)
- LLM-mapper ska hantera både gamla och nya format

---

## Steg 2: Skapa exportFeatureGoalToJson()

### Mål
Exportera `FeatureGoalDocModel` som JSON-fil.

### Funktion

**Fil:** `src/lib/featureGoalJsonExport.ts` (ny fil)

```typescript
export async function exportFeatureGoalToJson(
  bpmnFile: string,
  elementId: string,
  outputDir: string = 'exports/feature-goals'
): Promise<string> // Returnerar sökväg till exporterad fil
```

### Funktionalitet
1. Hämta befintlig dokumentation från Supabase Storage eller generera base model
2. Extrahera `FeatureGoalDocModel` från dokumentationen
3. Konvertera till JSON (med pretty-print)
4. Spara till `{outputDir}/{bpmnFile}-{elementId}.json`
5. Returnera sökväg till filen

### CLI Script

**Fil:** `scripts/export-feature-goal-json.ts`

```bash
npm run export:feature-goal:json -- bpmnFile elementId [outputDir]
```

### Exempel
```bash
npm run export:feature-goal:json -- mortgage-se-application.bpmn application
# Skapar: exports/feature-goals/mortgage-se-application-application.json
```

---

## Steg 3: Skapa importFeatureGoalFromJson()

### Mål
Importera JSON-fil och behandla den som om den genererats i appen.

### Funktion

**Fil:** `src/lib/featureGoalJsonImport.ts` (ny fil)

```typescript
export async function importFeatureGoalFromJson(
  jsonFilePath: string,
  bpmnFile: string,
  elementId: string
): Promise<void>
```

### Funktionalitet
1. Läsa JSON-fil
2. Validera mot `FeatureGoalDocModel` (TypeScript-typer)
3. Hämta base model från context
4. Merga JSON med base model (som override eller LLM-patch)
5. Rendera HTML med `renderFeatureGoalDoc()`
6. Spara till Supabase Storage (samma struktur som genererad dokumentation)
7. Markera med metadata att det är manuellt importerat

### CLI Script

**Fil:** `scripts/import-feature-goal-json.ts`

```bash
npm run import:feature-goal:json -- exports/feature-goals/{bpmnFile}-{elementId}.json
```

### Metadata
Lägg till i genererad HTML:
```html
<meta name="x-generation-source" content="manual-json-import" />
<meta name="x-import-date" content="2024-01-15T10:30:00.000Z" />
```

---

## Steg 4: Uppdatera v2-template rendering

### Mål
Uppdatera `buildFeatureGoalDocHtmlFromModelV2()` för att rendera nya scenario-fält.

### Ändringar

**Fil:** `src/lib/documentationTemplates.ts`

Uppdatera testgenerering-sektionen i `buildTestGenerationSectionV2()`:
- Använd `scenario.persona`, `scenario.riskLevel`, `scenario.assertionType` från model
- Använd `scenario.uiFlow` för UI Flow-steg
- Använd `scenario.dataProfileId` för testdata-referenser

### Logik
- Om scenario har `uiFlow` → använd den
- Om scenario saknar `uiFlow` → generera från aktiviteter (som nu)
- Om scenario har `persona` → använd den
- Om scenario saknar `persona` → härled från aktiviteter (som nu)

---

## Steg 5: Uppdatera LLM-mapper

### Mål
Se till att `mapFeatureGoalLlmToSections()` hanterar nya fält.

### Ändringar

**Fil:** `src/lib/featureGoalLlmMapper.ts`

Uppdatera `parseStructuredSections()` för att parsa:
- `scenario.persona`
- `scenario.riskLevel`
- `scenario.assertionType`
- `scenario.uiFlow[]`
- `scenario.dataProfileId`

### Backward Compatibility
- Om LLM inte returnerar nya fält → använd defaults (som nu)
- Om LLM returnerar nya fält → använd dem

---

## Steg 6: Testa hela flödet

### Test-scenarier

1. **Export → Redigera → Import**
   ```bash
   # 1. Exportera
   npm run export:feature-goal:json -- mortgage-se-application.bpmn application
   
   # 2. Redigera JSON (lägg till persona, riskLevel, uiFlow)
   
   # 3. Importera
   npm run import:feature-goal:json -- exports/feature-goals/mortgage-se-application-application.json
   
   # 4. Verifiera i appen att HTML innehåller nya fält
   ```

2. **Backward Compatibility**
   - Exportera dokumentation utan nya fält
   - Importera → ska fungera
   - HTML ska rendera korrekt

3. **LLM + Manual Merge**
   - Generera med LLM (med nya fält)
   - Exportera
   - Redigera manuellt
   - Importera → ska merga korrekt

---

## Filstruktur

```
src/lib/
  featureGoalLlmTypes.ts          # Utökad med nya scenario-fält
  featureGoalJsonExport.ts        # Ny: Export-funktion
  featureGoalJsonImport.ts        # Ny: Import-funktion
  documentationTemplates.ts      # Uppdaterad: Rendering av nya fält
  featureGoalLlmMapper.ts         # Uppdaterad: Parsing av nya fält

scripts/
  export-feature-goal-json.ts     # Ny: CLI för export
  import-feature-goal-json.ts     # Ny: CLI för import

exports/feature-goals/            # Ny: JSON-filer här
  mortgage-se-application-application.json
  ...
```

---

## Validering och felhantering

### Export
- ✅ Kontrollera att dokumentation finns
- ✅ Hantera saknad dokumentation gracefully
- ✅ Validera att JSON är korrekt formaterad

### Import
- ✅ Validera JSON mot `FeatureGoalDocModel` (TypeScript-typer)
- ✅ Hantera felaktig JSON gracefully
- ✅ Validera att bpmnFile och elementId matchar JSON-innehåll
- ✅ Hantera merge-konflikter (JSON wins över base model)

---

## Dokumentation

### README-uppdatering
Lägg till sektion om JSON export/import i:
- `README.md`
- `docs/FEATURE_GOAL_HTML_IMPROVEMENT_WORKFLOW.md`

### Exempel-JSON
Skapa `docs/feature-goals/example-feature-goal.json` med:
- Alla fält ifyllda
- Kommentarer för varje fält
- Exempel på uiFlow

---

## Tidsestimering

- **Steg 1:** 30 min (utöka modell)
- **Steg 2:** 1-2 timmar (export-funktion + CLI)
- **Steg 3:** 2-3 timmar (import-funktion + CLI)
- **Steg 4:** 1-2 timmar (uppdatera rendering)
- **Steg 5:** 1 timme (uppdatera LLM-mapper)
- **Steg 6:** 1-2 timmar (testning)

**Totalt:** ~7-11 timmar

---

## Nästa steg efter implementation

1. Migrera befintliga HTML-redigeringar till JSON-format
2. Ta bort HTML-parsing-kod (om den inte längre behövs)
3. Uppdatera dokumentation om workflow
4. Överväg batch-export/import för alla Feature Goals

