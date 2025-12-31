# Analys: Risk för Dubbelgenerering av Process Feature Goals

## Nuvarande Situation

### Process Feature Goal (non-hierarchical)
- **Filnamn**: `feature-goals/mortgage-se-application.html`
- **Genereras för**: Subprocess-filen `mortgage-se-application.bpmn`
- **När**: När subprocess-filen genereras (isolerad eller batch)
- **Villkor**: `isSubprocessFile && hasProcessNode && !hasCallActivities`

### CallActivity Feature Goal (hierarchical) - TAS BORT
- **Filnamn**: `feature-goals/mortgage-application.html` (hierarchical)
- **Genererades för**: CallActivity "Application" i `mortgage.bpmn`
- **Status**: ❌ TAS BORT (genereras inte längre)

## Risk för Dubbelgenerering

### Scenario 1: Isolerad Generering
**Användaren genererar `mortgage-se-application.bpmn` isolerat:**
1. Process Feature Goal genereras: `feature-goals/mortgage-se-application.html`
2. ✅ Ingen dubbelgenerering (bara en fil genereras)

### Scenario 2: Batch Generering
**Användaren genererar alla filer (mortgage.bpmn, mortgage-se-application.bpmn, etc.):**
1. När `mortgage-se-application.bpmn` genereras → Process Feature Goal: `feature-goals/mortgage-se-application.html`
2. När `mortgage.bpmn` genereras → CallActivity Feature Goal genereras INTE (tagen bort)
3. ✅ Ingen dubbelgenerering (bara Process Feature Goal genereras)

### Scenario 3: Om vi tar bort villkoret "inga callActivities"
**Nya logiken: Generera Process Feature Goal för ALLA subprocess-filer**

**Användaren genererar alla filer:**
1. När `mortgage-se-application.bpmn` genereras → Process Feature Goal: `feature-goals/mortgage-se-application.html`
2. När `mortgage.bpmn` genereras → CallActivity Feature Goal genereras INTE (tagen bort)
3. ✅ Ingen dubbelgenerering (bara Process Feature Goal genereras)

**Användaren genererar `mortgage-se-application.bpmn` isolerat:**
1. Process Feature Goal genereras: `feature-goals/mortgage-se-application.html`
2. ✅ Ingen dubbelgenerering (bara en fil genereras)

## Skydd mot Dubbelgenerering

### 1. `result.docs.has()` Check
```typescript
if (!result.docs.has(processFeatureDocPath)) {
  result.docs.set(processFeatureDocPath, content);
} else {
  console.warn(`⚠️ Process Feature Goal already exists, skipping`);
}
```
**Skydd**: Förhindrar dubbelgenerering inom samma körning

### 2. Olika Filnamn
- Process Feature Goal: `feature-goals/mortgage-se-application.html` (non-hierarchical)
- CallActivity Feature Goal (tagen bort): `feature-goals/mortgage-application.html` (hierarchical)
**Skydd**: Olika filnamn = ingen konflikt

### 3. CallActivity Feature Goal-generering TAS BORT
- Vi genererar INTE längre CallActivity Feature Goals
- Så det finns ingen risk för konflikt mellan Process Feature Goal och CallActivity Feature Goal

## Slutsats

**✅ INGEN RISK för dubbelgenerering**

**Anledningar:**
1. CallActivity Feature Goal-generering är borttagen (ingen konflikt)
2. Process Feature Goal använder non-hierarchical naming (olika filnamn)
3. `result.docs.has()` check förhindrar dubbelgenerering inom samma körning
4. Process Feature Goal genereras bara EN gång per fil (när filen genereras)

**Om vi tar bort villkoret "inga callActivities":**
- Process Feature Goal genereras för ALLA subprocess-filer
- Detta är korrekt eftersom CallActivities i parent-processer behöver dokumentation
- Ingen risk för dubbelgenerering (samma skydd gäller)

