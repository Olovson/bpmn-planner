# Lösning: Hierarkiska Filnamn för Feature Goals

## Problem

Filnamnen matchar inte Jira-namnen:
- **Jira-namn:** `Application - Internal data gathering`
- **Nuvarande filnamn:** `mortgage-se-internal-data-gathering-v2.html`
- **Förväntat filnamn:** `mortgage-se-application-internal-data-gathering-v2.html`

## Lösning

Uppdatera `getFeatureGoalDocFileKey` för att generera hierarkiska filnamn baserat på parent-processen när den är känd.

### Steg 1: Uppdatera `getFeatureGoalDocFileKey`

Lägg till en optional `parentBpmnFile` parameter:

```typescript
export const getFeatureGoalDocFileKey = (
  bpmnFile: string,
  elementId: string,
  templateVersion?: 'v1' | 'v2',
  parentBpmnFile?: string, // Ny parameter
) => {
  const baseName = getBaseName(bpmnFile);
  const sanitizedId = sanitizeElementId(elementId);
  const versionSuffix = templateVersion ? `-${templateVersion}` : '';
  
  // Om parent-processen är känd, använd hierarkiskt namn
  if (parentBpmnFile) {
    const parentBaseName = getBaseName(parentBpmnFile);
    // Undvik upprepning om elementId redan ingår i parentBaseName
    const normalizedParent = parentBaseName.toLowerCase();
    const normalizedElementId = sanitizedId.toLowerCase();
    
    if (normalizedParent.endsWith(`-${normalizedElementId}`) || 
        normalizedParent.endsWith(normalizedElementId)) {
      return `feature-goals/${parentBaseName}${versionSuffix}.html`;
    }
    
    // Använd parent-elementId format
    return `feature-goals/${parentBaseName}-${sanitizedId}${versionSuffix}.html`;
  }
  
  // Fallback till nuvarande logik om parent inte är känd
  // ... (nuvarande logik)
};
```

### Steg 2: Uppdatera alla anrop till `getFeatureGoalDocFileKey`

Uppdatera alla ställen där funktionen anropas för att inkludera parent-processen när den är känd:

1. **`src/lib/bpmnGenerators.ts`** - När feature goals genereras
2. **`src/lib/htmlTestGenerationParser.ts`** - När feature goals hämtas
3. **`scripts/validate-feature-goal-documentation.ts`** - När filnamn valideras
4. **`src/pages/DocViewer.tsx`** - När filer söks (redan har parent-info)

### Steg 3: Döp om befintliga filer

Skapa ett script för att döpa om filer till hierarkiska namn baserat på `bpmn-map.json`:

```typescript
// För varje call activity i bpmn-map.json:
// - Hitta parent BPMN-fil
// - Hitta subprocess BPMN-fil
// - Döp om: {subprocess}-v2.html → {parent}-{elementId}-v2.html
```

### Steg 4: Uppdatera valideringsskript

Uppdatera `scripts/validate-feature-goal-documentation.ts` för att använda hierarkiska namn.

## Exempel

### Application-processens Subprocesser

| Call Activity | Subprocess BPMN | Parent BPMN | Jira-namn | Nuvarande filnamn | Nytt filnamn |
|---------------|-----------------|-------------|-----------|-------------------|--------------|
| `internal-data-gathering` | `mortgage-se-internal-data-gathering.bpmn` | `mortgage-se-application.bpmn` | `Application - Internal data gathering` | `mortgage-se-internal-data-gathering-v2.html` | `mortgage-se-application-internal-data-gathering-v2.html` |
| `object` | `mortgage-se-object.bpmn` | `mortgage-se-application.bpmn` | `Application - Object` | `mortgage-se-object-v2.html` | `mortgage-se-application-object-v2.html` |
| `household` | `mortgage-se-household.bpmn` | `mortgage-se-application.bpmn` | `Application - Household` | `mortgage-se-household-v2.html` | `mortgage-se-application-household-v2.html` |
| `stakeholder` | `mortgage-se-stakeholder.bpmn` | `mortgage-se-application.bpmn` | `Application - Stakeholder` | `mortgage-se-stakeholder-v2.html` | `mortgage-se-application-stakeholder-v2.html` |

## Implementationsordning

1. ✅ Analysera problemet (KLAR)
2. ⏳ Uppdatera `getFeatureGoalDocFileKey` med parent-parameter
3. ⏳ Skapa script för att döpa om filer
4. ⏳ Uppdatera alla anrop till `getFeatureGoalDocFileKey`
5. ⏳ Uppdatera valideringsskript
6. ⏳ Testa att appen hittar filerna korrekt

