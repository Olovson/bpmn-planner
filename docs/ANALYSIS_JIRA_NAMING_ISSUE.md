# Analys: Jira-namn inkluderar "Mortgage commitment" när det inte borde

## Problem

Användaren rapporterar att Jira-namn på node-matrix-sidan inkluderar "Mortgage commitment" när det inte borde. Exempel:
- **Före**: "Assess documentation"
- **Nu**: "Mortgage commitment - Documentation assessmen" (stavfel?)

Användaren säger att "Mortgage" borde inte ingå i namnet.

## Nuvarande Logik

### `buildJiraName()` i `src/lib/jiraNaming.ts`

```typescript
export function buildJiraName(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
  parentPath: string[] = [],
): string {
  // Build full path from root to node (excluding root)
  const fullPath = buildParentPath(node, rootNode);
  
  // Add the node's own label
  const jiraName = [...fullPath, node.label].join(' - ');
  
  return jiraName || node.label;
}
```

### `buildParentPath()` i `src/lib/jiraNaming.ts`

```typescript
export function buildParentPath(
  node: ProcessTreeNode,
  rootNode: ProcessTreeNode,
): string[] {
  const ancestors = findAncestors(node, rootNode);
  // Filter out the root and return labels
  return ancestors
    .filter((ancestor) => ancestor.id !== rootNode.id)
    .map((ancestor) => ancestor.label)
    .filter(Boolean);
}
```

**Problemet**: `buildParentPath()` inkluderar ALLA föräldrar (utom root-processen), inklusive top-level callActivities.

## Exempel: Struktur för "Assess documentation"

```
Mortgage (root process) - EXKLUDERAS
  └─ Mortgage commitment (callActivity, top-level) - INKLUDERAS
      └─ Documentation assessment (callActivity) - INKLUDERAS
          └─ Assess documentation (userTask) - INKLUDERAS (som node.label)
```

**Nuvarande resultat**: "Mortgage commitment - Documentation assessment - Assess documentation"

## Dokumentation vs. Implementation

### README.md säger:

**Top-level subprocess** (direkt under root):
- Format: `<SubprocessLabel>`
- Exempel: `Application`

**Nested subprocess** (under en annan subprocess):
- Format: `<Parent1> - <Parent2> - ... - <SubprocessLabel>`
- Exempel: `Application - Internal data gathering`

**Epics** (userTask, serviceTask, businessRuleTask):
- Format: `<Parent1> - <Parent2> - ... - <TaskLabel>`
- Exempel: `Automatic Credit Evaluation - Calculate household affordability`

### Men implementationen gör:

**Alla noder** (inklusive top-level callActivities):
- Format: `<parent1> - <parent2> - ... - <node.label>`
- Inkluderar ALLA föräldrar (utom root-processen)

## Möjliga Orsaker

1. **Inkonsekvens mellan dokumentation och implementation**
   - Dokumentationen säger att top-level callActivities bara ska ha sitt eget namn
   - Implementationen inkluderar alla föräldrar

2. **Användarens förväntning**
   - Användaren förväntar sig att "Mortgage commitment" (top-level callActivity) inte ska ingå i Jira-namn för noder under den
   - Men enligt nuvarande logik borde det ingå

3. **Tidigare beteende**
   - Användaren säger "verkar inte bli korrekta längre", vilket tyder på att det fungerade tidigare
   - Något kan ha ändrats i ProcessTree-strukturen eller i `buildParentPath()`-logiken

## Vad Borde Hända?

Enligt README.md borde:
- **"Mortgage commitment"** (top-level callActivity) → "Mortgage commitment"
- **"Documentation assessment"** (nested callActivity) → "Mortgage commitment - Documentation assessment"
- **"Assess documentation"** (epic under nested callActivity) → "Mortgage commitment - Documentation assessment - Assess documentation"

Men användaren säger att "Mortgage commitment" inte borde ingå alls.

## Nästa Steg

1. **Verifiera ProcessTree-strukturen**
   - Kontrollera om "Mortgage commitment" faktiskt är en top-level callActivity
   - Kontrollera om "Assess documentation" ligger under "Documentation assessment"

2. **Kontrollera databasen**
   - Se vilka Jira-namn som faktiskt finns i `bpmn_element_mappings`
   - Se om de genererades med gammal eller ny logik

3. **Förstå användarens förväntning**
   - Borde "Assess documentation" bara heta "Assess documentation"?
   - Eller borde det heta "Documentation assessment - Assess documentation" (utan "Mortgage commitment")?

## Observationer

- Användaren nämner "Documentation assessmen" (stavfel?) - kan vara en trunkering eller faktiskt stavfel i databasen
- Användaren säger "Mortgage borde inte ingå" - men "Mortgage commitment" är inte "Mortgage", det är en callActivity
- Det kan vara så att användaren menar att top-level callActivities inte ska ingå i paths för sina barn

