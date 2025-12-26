# Fix för Dokumentationsräkning

## Datum: 2025-12-26

### Problem

Nästan alla filer visade samma antal dokumentationer (11), vilket inte stämde med faktiska filer i Storage.

### Rotorsak

1. **Legacy naming matchade fel filer**: När vi använde legacy naming (utan parent) för call activities, kunde samma feature-goal-fil matcha call activities från olika parent-filer. Till exempel kunde `mortgage-se-credit-evaluation.html` matcha både:
   - Call activity i `mortgage.bpmn` (korrekt)
   - Call activity i `mortgage-se-object-control.bpmn` (felaktigt)

2. **Process Feature Goals räknades inte korrekt**: Process Feature Goal dokumentation (t.ex. `mortgage-se-object-control.html`) är dokumentation för processen själv, inte för noder i filen, och ska inte räknas i node documentation coverage.

### Lösning

1. **Använd bara hierarchical naming**: Tog bort legacy naming-fallback när vi räknar dokumentation för call activities. Nu använder vi bara hierarchical naming (med parent prefix), vilket säkerställer att vi matchar rätt fil.

2. **Ignorera process-noder**: Lade till explicit check för att ignorera process-noder när vi räknar dokumentation, eftersom de har Feature Goal dokumentation som är separat och inte räknas som "node documentation".

### Ändringar

**`src/hooks/useFileArtifactCoverage.ts`:**
- Tog bort legacy naming-fallback för call activities
- Lade till explicit check för att ignorera process-noder
- Uppdaterade kommentarer för att förklara varför vi bara använder hierarchical naming

**Före:**
```typescript
const legacyKey = getFeatureGoalDocFileKey(
  node.subprocessFile,
  node.bpmnElementId,
  undefined,
  undefined, // Ingen parent
);
// ...
if (featureGoalNames.has(hierarchicalFileName) || featureGoalNames.has(legacyFileName)) {
  foundDoc = true;
}
```

**Efter:**
```typescript
// Använd BARA hierarchical naming för att undvika att matcha fel filer
// Legacy naming kan matcha samma fil för call activities från olika parent-filer
if (featureGoalNames.has(hierarchicalFileName)) {
  foundDoc = true;
}
```

### Resultat

Nu borde dokumentationsräkningen visa korrekt antal för varje fil, baserat på faktiska noder i filen och deras dokumentation med hierarchical naming.

### Validering

Kör `npm run check:storage-docs <fileName>` för att se vilka dokumentationer som faktiskt finns i Storage för en specifik fil.

