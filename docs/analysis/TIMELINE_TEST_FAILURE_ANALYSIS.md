# Analys: Timeline Test Failure

## Test som Misslyckas

**Test:** `should handle empty state gracefully` (rad 233)

## Orsaker

### 1. Empty State Text Matchar Inte Regex

**Testet letar efter:**
```typescript
text=/no.*data/i, text=/no.*process/i, text=/no.*files/i, text=/empty/i
```

**Koden visar:**
- "No subprocesses found. Make sure you have uploaded BPMN files and built the hierarchy."
- "No tasks match the current filter. Try adjusting your filters above."

**Problem:** 
- "No subprocesses" matchar `/no.*process/i` ✓
- "No tasks match" matchar INTE någon av regex-patterns ✗

### 2. Gantt Container Saknar Identifierare

**Testet letar efter:**
```typescript
.gantt-container, [data-testid="gantt"], #gantt, .gantt
```

**Koden har:**
- En div med `ref={ganttContainerRef}` men ingen CSS-klass eller data-testid
- När `visibleTasks.length === 0`, är containern dold med `display: none`

**Problem:**
- Testet kan inte hitta Gantt-containern eftersom den saknar identifierare
- När containern är dold (`display: none`), räknas den inte som "visible" men finns i DOM

### 3. Testet Förväntar Sig Antingen Gantt ELLER Empty State

**Test-logik:**
```typescript
const hasGantt = await ganttContainer.count() > 0;
const hasEmptyState = await emptyState.count() > 0;
expect(hasGantt || hasEmptyState).toBeTruthy();
```

**Problem:**
- Om både Gantt och empty state saknas (eller inte hittas), misslyckas testet
- När `tasks.length > 0` men `visibleTasks.length === 0`, finns Gantt-containern men är dold, och empty state visas

## Lösningar

### 1. Lägg Till data-testid på Gantt Container
```typescript
<div 
  ref={ganttContainerRef}
  data-testid="gantt"
  className="gantt-container"
  ...
/>
```

### 2. Förbättra Empty State Selector i Testet
```typescript
text=/no.*subprocesses/i, text=/no.*tasks.*match/i, text=/no.*process/i
```

### 3. Uppdatera Testet för Att Hantera Dold Container
```typescript
// Check if container exists (even if hidden)
const ganttContainer = page.locator('[data-testid="gantt"]');
const hasGantt = await ganttContainer.count() > 0;
const isGanttVisible = hasGantt && await ganttContainer.isVisible().catch(() => false);
```

