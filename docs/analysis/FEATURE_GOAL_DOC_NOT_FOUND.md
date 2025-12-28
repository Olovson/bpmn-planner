# Problem: Feature Goal Documentation Not Found in Node-Matrix

## Datum: 2025-12-26

## Problem

Testet `should generate and find Feature Goal documentation for multiple file upload` misslyckas eftersom dokumentationen inte hittas i node-matrix (`hasDocs1` är `false`).

## Analys

### Flöde

1. **Generering**: Dokumentation genereras för call activities med hierarchical naming
   - Filnamn: `feature-goals/{parentBaseName}-{elementId}.html`
   - T.ex. `feature-goals/test-xxx-mortgage-se-application-internal-data-gathering.html`

2. **Sparande**: Dokumentationen sparas under subprocess-filens version hash
   - `extractBpmnFileFromDocFileName` används för att hitta rätt BPMN-fil
   - Dokumentationen sparas under: `docs/claude/{subprocessFileName}/{versionHash}/feature-goals/{parentBaseName}-{elementId}.html`

3. **Sökning**: Node-matrix söker efter dokumentationen
   - `useAllBpmnNodes` använder `getFeatureGoalDocStoragePaths` för att generera sökvägar
   - Sökvägar: `docs/claude/{subprocessFileName}/{versionHash}/feature-goals/{parentBaseName}-{elementId}.html`

### Möjliga Problem

1. **`extractBpmnFileFromDocFileName` matchar inte korrekt**
   - För hierarchical naming (t.ex. "test-xxx-mortgage-se-application-internal-data-gathering")
   - Borde matcha mot "test-xxx-mortgage-se-internal-data-gathering.bpmn"
   - Men logiken kan misslyckas för test-filer med komplexa namn

2. **`subprocessFile` matchar inte korrekt**
   - `subprocessFile` kommer från `bpmn-map.json` via process tree
   - Om `bpmn-map.json` innehåller produktionsfiler, kan `subprocessFile` vara produktionsfilnamn istället för test-filnamn

3. **Version hash matchar inte**
   - Dokumentationen sparas under subprocess-filens version hash
   - Men när den söks, kan version hash vara annorlunda

## Fixar Implementerade

1. ✅ Normaliserat `parentBpmnFile` i `useAllBpmnNodes.ts`
2. ✅ Förbättrat `getBaseName` för att hantera både med och utan `.bpmn` extension
3. ✅ Förbättrat `extractBpmnFileFromDocFileName` för att matcha test-filer bättre
4. ✅ Lagt till debug-logging

## Nästa Steg

1. Verifiera att dokumentationen faktiskt sparas korrekt i Storage
2. Verifiera att `subprocessFile` matchar korrekt i process tree
3. Verifiera att version hash matchar när dokumentationen söks




