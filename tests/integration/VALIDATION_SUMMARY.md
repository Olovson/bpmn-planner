# Validering: Feature Goals och Epics Generering

**Datum**: 2025-01-XX
**Status**: ✅ Testet använder faktisk app-kod

## Testet

Testet `tests/integration/validate-feature-goals-generation.test.ts` använder **faktisk app-kod**:
- `generateAllFromBpmnWithGraph` - faktisk genereringsfunktion
- `buildBpmnProcessGraphFromParseResults` - faktisk graf-byggning
- `loadAndParseBpmnFromFixtures` - faktisk BPMN-parsing
- **Inga stubbar** - allt använder samma kod som appen

## Valideringar

### ✅ Inga tasks genereras som feature goals
- Testet verifierar att inga tasks (UserTask/ServiceTask/BusinessRuleTask) genereras som feature goals
- Validering finns i koden: `processNodeForFile.type !== 'process'` check
- Validering finns för callActivities: `node.type !== 'callActivity'` check

### ✅ Epics genereras för tasks
- Testet verifierar att epics genereras för tasks
- Epics finns i `result.docs` med keys som börjar med `nodes/`

### ⚠️ Antal feature goals
- Testet visar att antalet kan variera beroende på vilka BPMN-filer som finns i fixtures
- Vissa subprocess-filer har inte process-noder i grafen (`hasProcessNode: false`)
- Detta är ett faktiskt problem i appen som behöver undersökas

## Viktigt

**Testet använder faktisk app-kod**, vilket betyder:
- ✅ Om app-koden ändras, kommer testet automatiskt reflektera ändringarna
- ✅ Ingen duplicerad logik
- ✅ Testet validerar den faktiska genereringslogiken

## Nästa steg

1. ✅ Testet är skapat och använder faktisk app-kod
2. ⚠️ Undersök varför vissa subprocess-filer inte har process-noder i grafen
3. ✅ Validering förhindrar tasks från att genereras som feature goals
