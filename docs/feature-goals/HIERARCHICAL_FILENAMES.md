# Hierarkiska Filnamn för Feature Goals

## Syfte

Feature goal dokumentation använder hierarkiska filnamn som matchar Jira-namnen direkt. Detta säkerställer konsistens mellan appens Jira-namngivning och dokumentationsfilnamn.

## Filnamnsformat

### För icke-återkommande feature goals

**Format:** `{parent_bpmn_file}-{elementId}-v2.html`

**Exempel:**
- Jira-namn: `Application - Internal data gathering`
- Filnamn: `mortgage-se-application-internal-data-gathering-v2.html`
- Parent BPMN-fil: `mortgage-se-application.bpmn`
- Element ID: `internal-data-gathering`

**Hur det genereras:**
```typescript
getFeatureGoalDocFileKey(
  'mortgage-se-internal-data-gathering.bpmn', // subprocess BPMN file
  'internal-data-gathering', // elementId
  'v2',
  'mortgage-se-application.bpmn' // parent BPMN file (för hierarkiskt namn)
)
// → 'feature-goals/mortgage-se-application-internal-data-gathering-v2.html'
```

### För återkommande feature goals

**Format:** `{subprocess_bpmn_file}-v2.html` (behåller legacy-namn)

**Exempel:**
- Jira-namn: `Credit Evaluation` (anropas från flera ställen)
- Filnamn: `mortgage-se-credit-evaluation-v2.html`
- Subprocess BPMN-fil: `mortgage-se-credit-evaluation.bpmn`

**Varför legacy-namn?**
- Återkommande feature goals anropas från flera ställen med olika kontexter
- En gemensam fil används för alla kontexter (enligt `REUSED_FEATURE_GOALS_STRATEGY.md`)
- Legacy-namn säkerställer att alla kontexter hittar samma fil

## Implementation

### `getFeatureGoalDocFileKey` funktion

Funktionen i `src/lib/nodeArtifactPaths.ts` stödjer hierarkiska filnamn:

```typescript
export const getFeatureGoalDocFileKey = (
  bpmnFile: string,           // subprocess BPMN file
  elementId: string,          // call activity element ID
  templateVersion?: 'v1' | 'v2',
  parentBpmnFile?: string     // parent BPMN file (för hierarkiskt namn)
): string
```

**Logik:**
1. Om `parentBpmnFile` är angiven → generera hierarkiskt namn
2. Om `parentBpmnFile` inte är angiven → fallback till legacy-namn

### Appens filuppslagning

`DocViewer.tsx` försöker hitta filer i denna ordning:

1. **Hierarkiskt namn** (prioriterat för icke-återkommande feature goals)
   - `/local-content/feature-goals/{parent}-{elementId}-v2.html`
2. **Legacy-namn** (bakåtkompatibilitet)
   - `/local-content/feature-goals/{subprocess}-{elementId}-v2.html`
3. **Original baseName** (bakåtkompatibilitet)
   - `/local-content/feature-goals/{baseName}-{elementId}-v2.html`

## När ska hierarkiska filnamn användas?

### ✅ Använd hierarkiska filnamn när:
- Feature goal är **icke-återkommande** (anropas från ett ställe)
- Parent-processen är känd
- Du vill matcha Jira-namnet direkt

### ❌ Använd INTE hierarkiska filnamn när:
- Feature goal är **återkommande** (anropas från flera ställen)
- Du skapar en gemensam fil för alla kontexter
- Legacy-namn behövs för bakåtkompatibilitet

## Omdöpning av befintliga filer

Använd scriptet `scripts/rename-feature-goal-files-to-hierarchical.ts`:

```bash
# Dry-run (visa vad som skulle hända)
npx tsx scripts/rename-feature-goal-files-to-hierarchical.ts --dry-run

# Utför omdöpning
npx tsx scripts/rename-feature-goal-files-to-hierarchical.ts
```

**Scriptet:**
- Identifierar återkommande feature goals (behåller legacy-namn)
- Döper om icke-återkommande feature goals till hierarkiska namn
- Skapar backup av originalfiler

## Validering

Valideringsskriptet (`scripts/validate-feature-goal-documentation.ts`) använder samma logik som appen:

1. Försöker först med hierarkiskt namn (om parent-processen är känd)
2. Fallback till legacy-namn (för bakåtkompatibilitet)
3. Accepterar både hierarkiska och legacy-namn

## Relaterade dokument

- `FILENAME_VS_JIRA_NAME_MISMATCH.md` - Analys av problemet
- `FILENAME_HIERARCHY_SOLUTION.md` - Lösningsförslag
- `REUSED_FEATURE_GOALS_STRATEGY.md` - Strategi för återkommande feature goals
- `VALIDATION_PROCESS.md` - Valideringsprocess
- `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - Huvudarbetsprocessen

