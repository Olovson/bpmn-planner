# Analys: Timeline slutar visa rader efter "Mortgage commitment - Automatic Credit Evaluation"

## Problem

Timeline-sidan (`http://localhost:8080/#/timeline`) slutar visa rader efter "Mortgage commitment - Automatic Credit Evaluation", men det finns mer att visa som syns på Process Explorer-sidan.

## Nuvarande Implementation

### `buildGanttTasksFromProcessTree()` i `src/lib/ganttDataConverter.ts`

1. **Root-nivå** (`addRootCallActivities`):
   - Filtrerar noder: `isTimelineNode(node) && node.bpmnFile === root.bpmnFile`
   - Endast noder från samma fil som root-processen inkluderas
   - För "Mortgage commitment" (som pekar på `mortgage-se-mortgage-commitment.bpmn`):
     - Noden har `bpmnFile: 'mortgage.bpmn'` (samma som root)
     - Så den inkluderas ✓

2. **Subprocess-nivå** (`addSubprocessChildren`):
   - Filtrerar noder: `isTimelineNode(node)` (ingen `bpmnFile`-filtrering)
   - Alla timeline-relevanta noder inkluderas, oavsett fil
   - Rekursivt anrop för callActivities med children

## Möjliga Orsaker

### 1. ProcessTree saknar children för "Automatic Credit Evaluation"

Om "Automatic Credit Evaluation" är en callActivity som pekar på en annan fil, men ProcessTree inte har byggt dess children korrekt, så kommer `addSubprocessChildren` att hitta en tom `children`-array och returnera tidigt.

**Kontrollera**: Är `node.children?.length` > 0 för "Automatic Credit Evaluation"?

### 2. DHTMLX Gantt renderar inte korrekt

DHTMLX Gantt kan ha problem med:
- Hierarkiska strukturer med många nivåer
- `parent`-referenser som inte matchar `id`
- `type: 'project'` vs `type: 'task'`-konflikter

**Kontrollera**: Är alla `parent`-referenser korrekta? Matchar de `id`-värden?

### 3. Filtrering stoppar rekursion

Om det finns någon dold filtrering eller begränsning som stoppar rekursionen efter en viss nivå.

**Kontrollera**: Finns det några max-depth-begränsningar eller andra filter?

### 4. `isTimelineNode()` filtrerar bort viktiga noder

Om "Automatic Credit Evaluation" har children som inte matchar `isTimelineNode()`, så kommer de inte att inkluderas.

**Kontrollera**: Vilka nodtyper finns under "Automatic Credit Evaluation"? Matchar de `isTimelineNode()`?

## Debugging-steg

1. **Lägg till console.log i `addSubprocessChildren`**:
   ```typescript
   console.log('[addSubprocessChildren]', {
     parentLabel: parentNode.label,
     childCount: childNodes.length,
     children: childNodes.map(c => ({ label: c.label, type: c.type, bpmnFile: c.bpmnFile }))
   });
   ```

2. **Kontrollera ProcessTree-strukturen**:
   - Använd Process Explorer för att se vilka children "Automatic Credit Evaluation" har
   - Jämför med vad som faktiskt byggs i `buildGanttTasksFromProcessTree`

3. **Kontrollera Gantt-data**:
   - Logga `ganttData` i `TimelinePage.tsx` för att se alla tasks som skapas
   - Verifiera att alla tasks har korrekta `parent`-referenser

4. **Kontrollera DHTMLX Gantt rendering**:
   - Se om det finns några fel i konsolen
   - Kontrollera om Gantt faktiskt får alla tasks men bara inte renderar dem

## Förväntat Beteende

Efter "Mortgage commitment - Automatic Credit Evaluation" borde det finnas:
- Ytterligare callActivities under "Mortgage commitment"
- Children under "Automatic Credit Evaluation" (om det finns några)
- Ytterligare root-nivå noder efter "Mortgage commitment"

## Nästa Steg

1. Lägg till debug-logging för att se vad som faktiskt händer
2. Kontrollera ProcessTree-strukturen för "Mortgage commitment" och "Automatic Credit Evaluation"
3. Verifiera att alla tasks skapas korrekt i `buildGanttTasksFromProcessTree`
4. Kontrollera om DHTMLX Gantt får alla tasks men bara inte renderar dem

