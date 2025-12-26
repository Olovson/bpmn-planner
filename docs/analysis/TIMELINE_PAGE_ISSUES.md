# Analys: Timeline Page Problem

## Identifierade Problem

### 1. Empty State Visas Inte När Tasks Filtreras Bort

**Problem:** Empty state-meddelandet visas bara när `tasks.length === 0`, men om det finns tasks som filtreras bort (så att `visibleTasks.length === 0`), så visas varken Gantt eller empty state.

**Kod:**
```typescript
{!isLoading && tasks.length === 0 && (
  <p>No subprocesses found...</p>
)}

{visibleTasks.length > 0 && (
  <div ref={ganttContainerRef} />
)}
```

**Konsekvens:** Om alla tasks filtreras bort, ser användaren ingenting - varken Gantt eller meddelande.

### 2. Gantt Initialiseras Inte Om Tasks Filtreras Bort

**Problem:** Gantt initialiseras bara om `tasks.length > 0`, men om tasks filtreras bort så att `visibleTasks.length === 0`, initialiseras inte Gantt. Detta kan orsaka problem när filter ändras.

**Kod:**
```typescript
if (!ganttContainerRef.current || isGanttInitialized || tasks.length === 0) {
  return;
}
```

**Konsekvens:** Om användaren filtrerar bort alla tasks och sedan filtrerar tillbaka dem, kan Gantt inte initialiseras korrekt.

### 3. Test Timeout

**Problem:** Tester timeoutar när de försöker vänta på Gantt-chart, vilket tyder på att:
- Gantt initialiseras inte korrekt
- Gantt-containern renderas inte
- Det finns ett problem med Gantt-biblioteket

**Konsekvens:** Tester kan inte verifiera att sidan fungerar korrekt.

### 4. Gantt Container Renderas Bara När visibleTasks.length > 0

**Problem:** Gantt-containern renderas bara när `visibleTasks.length > 0`, vilket betyder att om alla tasks filtreras bort, finns det ingen container att initialisera Gantt i.

**Kod:**
```typescript
{visibleTasks.length > 0 && (
  <div ref={ganttContainerRef} />
)}
```

**Konsekvens:** Om användaren filtrerar bort alla tasks, försvinner Gantt-containern, och när tasks filtreras tillbaka måste containern renderas om innan Gantt kan initialiseras.

## Lösningsförslag

### 1. Fixa Empty State

Visa empty state när `visibleTasks.length === 0` (inte bara när `tasks.length === 0`):

```typescript
{!isLoading && visibleTasks.length === 0 && (
  <div className="text-center py-8">
    {tasks.length === 0 ? (
      <p>No subprocesses found. Make sure you have uploaded BPMN files and built the hierarchy.</p>
    ) : (
      <p>No tasks match the current filter. Try adjusting your filters.</p>
    )}
  </div>
)}
```

### 2. Rendera Gantt Container Alltid

Render Gantt-containern alltid (inte bara när `visibleTasks.length > 0`), men visa empty state om det inte finns några tasks:

```typescript
{visibleTasks.length > 0 ? (
  <div className="border rounded-lg overflow-hidden bg-white">
    <div ref={ganttContainerRef} />
  </div>
) : (
  <div className="text-center py-8">
    {tasks.length === 0 ? (
      <p>No subprocesses found...</p>
    ) : (
      <p>No tasks match the current filter...</p>
    )}
  </div>
)}
```

### 3. Förbättra Gantt Initialisering

Initialisera Gantt även om det inte finns tasks initialt, så att containern är redo när tasks läggs till:

```typescript
if (!ganttContainerRef.current || isGanttInitialized) {
  return;
}

// Initialize Gantt even if tasks.length === 0
// This ensures the container is ready when tasks are added
```

### 4. Förbättra Test Robusthet

Uppdatera tester för att hantera olika scenarion:
- När det inte finns några tasks
- När tasks filtreras bort
- När Gantt initialiseras

