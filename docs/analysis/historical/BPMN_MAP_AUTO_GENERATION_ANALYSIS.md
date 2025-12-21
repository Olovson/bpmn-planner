# Analys: Automatisk Generering av bpmn-map.json

## Nuvarande Situation

### Hur systemet fungerar idag

1. **Prioritering**: Systemet försöker matcha callActivities i denna ordning:
   - **Först**: `bpmn-map.json` (om den finns)
   - **Sedan**: Automatisk matching via `matchCallActivityToProcesses()`

2. **Automatisk matching** (`SubprocessMatcher.ts`):
   - Använder `calledElement` från BPMN (högsta konfidens)
   - Naming conventions: `mortgage-se-{element-id}.bpmn` eller `{element-id}.bpmn`
   - Fuzzy matching baserat på namn
   - Returnerar `matchStatus`: `'matched' | 'lowConfidence' | 'ambiguous' | 'unresolved'`

3. **bpmn-map.json används för**:
   - Explicit mappning när automatisk matching inte fungerar
   - Fallback när naming conventions inte matchar
   - Manual review flaggar (`needs_manual_review: true`)

## Kan vi automatiskt generera bpmn-map.json?

### ✅ JA - med vissa förbehåll

**Systemet kan automatiskt generera bpmn-map.json baserat på:**

1. **Automatiska matchningar** från `matchCallActivityToProcesses()`
2. **calledElement** från BPMN-filer (högsta konfidens)
3. **Naming conventions** som redan används

### Fördelar med automatisk generering

1. **Mindre manuellt arbete**: Ingen behov av att hårdmappa varje callActivity
2. **Konsekvent**: Använder samma logik som runtime-matching
3. **Uppdateras automatiskt**: När nya BPMN-filer läggs till
4. **Förbättrad traceability**: Kan spåra vilka matchningar som är automatiska vs manuella

### Nackdelar / Förbehåll

1. **Ambiguous matches**: När flera subprocesser matchar lika bra behövs manuell review
2. **Low confidence matches**: När matchningen har låg konfidens behövs manuell review
3. **Unresolved matches**: När ingen matchning hittas behövs manuell mappning
4. **Naming conventions**: Förutsätter att filer följer konventioner (t.ex. `mortgage-se-{id}.bpmn`)

## Förslag: Hybrid-approach

### Strategi

1. **Automatisk generering som bas**: Generera bpmn-map.json automatiskt från BPMN-filer
2. **Manual review för problematiska fall**: Flagga matchningar som behöver manuell review
3. **Override-möjlighet**: Tillåt manuella överrides för edge cases

### Implementation

```typescript
// Pseudokod för automatisk generering
function generateBpmnMapFromBpmnFiles(
  allBpmnFiles: BpmnFile[],
  existingMap?: BpmnMap
): BpmnMap {
  const processes: BpmnMapProcess[] = [];
  
  for (const file of allBpmnFiles) {
    const parseResult = parseBpmnFile(file);
    const callActivities: BpmnMapCallActivity[] = [];
    
    for (const ca of parseResult.callActivities) {
      // Försök matcha automatiskt
      const match = matchCallActivityToProcesses(
        {
          id: ca.id,
          name: ca.name,
          calledElement: ca.calledElement,
        },
        allProcessDefs
      );
      
      if (match.matchStatus === 'matched' && match.matchedFileName) {
        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement || null,
          subprocess_bpmn_file: match.matchedFileName,
          needs_manual_review: false, // Hög konfidens matchning
        });
      } else if (match.matchStatus === 'lowConfidence' && match.matchedFileName) {
        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement || null,
          subprocess_bpmn_file: match.matchedFileName,
          needs_manual_review: true, // Låg konfidens - behöver review
        });
      } else if (match.matchStatus === 'ambiguous') {
        // Välj bästa matchningen men flagga för review
        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement || null,
          subprocess_bpmn_file: match.matchedFileName || null,
          needs_manual_review: true, // Ambiguous - behöver review
        });
      } else {
        // Unresolved - behöver manuell mappning
        callActivities.push({
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement || null,
          subprocess_bpmn_file: null,
          needs_manual_review: true, // Unresolved - behöver manuell mappning
        });
      }
    }
    
    processes.push({
      id: parseResult.processId,
      alias: parseResult.processName || parseResult.processId,
      bpmn_file: file.name,
      process_id: parseResult.processId,
      description: parseResult.processName || parseResult.processId,
      call_activities: callActivities,
    });
  }
  
  return {
    generated_at: new Date().toISOString(),
    note: 'Auto-generated from BPMN files using automatic matching. Review entries with needs_manual_review: true',
    orchestration: {
      root_process: findRootProcess(allBpmnFiles),
    },
    processes,
  };
}
```

## Rekommendation

### ✅ JA - Automatisk generering är möjlig och rekommenderas

**Anledningar:**

1. **Systemet har redan automatisk matching**: `matchCallActivityToProcesses()` fungerar bra
2. **Naming conventions är konsekventa**: `mortgage-se-{id}.bpmn` pattern används konsekvent
3. **calledElement i BPMN**: Många callActivities har `calledElement` som direkt matchar processId
4. **Fallback-mekanism**: Systemet kan fortfarande använda bpmn-map.json för edge cases

### Implementation-steg

1. **Skapa script**: `scripts/generate-bpmn-map-auto.ts`
   - Läs alla BPMN-filer
   - Parsa varje fil
   - Matcha callActivities automatiskt
   - Generera bpmn-map.json med `needs_manual_review` flaggor

2. **Integrera i workflow**:
   - Kör automatiskt när nya BPMN-filer läggs till
   - Eller som separat kommando: `npm run generate-bpmn-map`

3. **Manual review UI**:
   - Visa matchningar med `needs_manual_review: true`
   - Tillåt användare att korrigera/överrida matchningar
   - Spara överrides tillbaka till bpmn-map.json

### Vad behöver fortfarande manuell mappning?

1. **Unresolved matches**: När ingen automatisk matchning hittas
2. **Ambiguous matches**: När flera subprocesser matchar lika bra
3. **Low confidence matches**: När matchningen har låg konfidens (< 0.75)
4. **Edge cases**: När naming conventions inte följs

## Slutsats

**bpmn-map.json behöver INTE hårdmappas manuellt för de flesta fall.**

Systemet kan automatiskt generera bpmn-map.json baserat på:
- `calledElement` från BPMN (högsta konfidens)
- Naming conventions (`mortgage-se-{id}.bpmn`)
- Automatisk matching via `matchCallActivityToProcesses()`

**bpmn-map.json behövs fortfarande för:**
- Edge cases som inte matchar naming conventions
- Manuella överrides för problematiska matchningar
- Explicit mappning när automatisk matching misslyckas

**Rekommendation**: Implementera automatisk generering som standard, med möjlighet till manuell override för edge cases.
