# Gantt Timeline View - Implementation Summary

## Analys & Förslag

Se `docs/GANTT_TIMELINE_ANALYSIS.md` för fullständig analys.

### Huvudpunkter:
- **Tidsordning**: Använder `orderIndex`, `branchId`, `scenarioPath` från ProcessTree
- **Dataflöde**: `useProcessTree` → extrahera callActivities → sortera → konvertera till Gantt-format
- **Plats**: Ny sida `/timeline` med egen komponent

## Implementation

### 1. Installerade Paket

```bash
npm install dhtmlx-gantt
```

### 2. Skapade Filer

#### `src/lib/ganttDataConverter.ts`
**Syfte**: Utility-funktioner för att konvertera ProcessTreeNode till DHTMLX Gantt-format

**Funktioner:**
- `extractCallActivities()` - Rekursiv extraktion av callActivity-noder
- `sortCallActivities()` - Sorterar efter orderIndex, branchId, label
- `convertToGanttTasks()` - Konverterar till GanttTask-format
- `buildGanttTasksFromProcessTree()` - Huvudfunktion som kombinerar ovanstående

**Dataformat:**
```typescript
interface GanttTask {
  id: string;
  text: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration: number; // Days
  progress: number; // 0-1
  orderIndex?: number;
  branchId?: string | null;
  bpmnFile?: string;
  bpmnElementId?: string;
}
```

#### `src/pages/TimelinePage.tsx`
**Syfte**: Huvudkomponent för timeline/planning-vyn

**Funktionalitet:**
- Använder `useProcessTree` hook för att hämta ProcessTree
- Extraherar och sorterar callActivities via `buildGanttTasksFromProcessTree()`
- Initierar DHTMLX Gantt-instans
- Hanterar date editing via `onAfterTaskUpdate` event
- Uppdaterar local state när användaren redigerar datum

**Konfiguration:**
- Base date: 2026-01-01
- Default duration: 14 dagar (2 veckor)
- Editable: Ja (drag & drop, date editing)
- Columns: Subprocess, Start, End, Duration

### 3. Uppdaterade Filer

#### `src/App.tsx`
- Lagt till route: `/timeline` → `<TimelinePage />`
- Importerat `TimelinePage` komponent

#### `src/components/AppHeaderWithTabs.tsx`
- Lagt till `'timeline'` i `ViewKey` type
- Lagt till Calendar-ikon från lucide-react
- Lagt till timeline-navigation-knapp i huvudmenyn

#### `src/pages/Index.tsx`
- Uppdaterat `currentView` logik för att inkludera `/timeline`
- Uppdaterat `handleViewChange` för att hantera timeline-navigation

## Dataflöde

```
1. useProcessTree(rootFile)
   ↓
2. ProcessTreeNode (hierarki med orderIndex, branchId, scenarioPath)
   ↓
3. extractCallActivities() - Rekursiv extraktion
   ↓
4. sortCallActivities() - Sortera efter orderIndex → branchId → label
   ↓
5. convertToGanttTasks() - Konvertera till DHTMLX-format
   ↓
6. DHTMLX Gantt instance.render()
   ↓
7. User edits dates → onAfterTaskUpdate event
   ↓
8. Update local state (tasks)
   ↓
9. Re-render Gantt with updated data
```

## Redigering av Datum

**Hur det fungerar:**
1. Användaren klickar/drager en task-bar i Gantt-charten
2. DHTMLX Gantt triggar `onAfterTaskUpdate` event
3. Event handler uppdaterar `tasks` state med nya datum
4. `useEffect` re-renderar Gantt med uppdaterad data

**Framtida förbättringar:**
- Spara redigerade datum till backend/database
- Lägg till validering (t.ex. end_date måste vara efter start_date)
- Lägg till undo/redo funktionalitet

## Sortering & Tidsordning

**Prioritet:**
1. `orderIndex` (primär tidsordning från sequence flows)
2. `branchId` (main → entry-2 → entry-3, etc.)
3. `label` (alfabetisk fallback)

**Exempel:**
- Subprocess med `orderIndex: 1, branchId: 'main'` kommer före
- Subprocess med `orderIndex: 2, branchId: 'main'` som kommer före
- Subprocess med `orderIndex: 1, branchId: 'entry-2'`

## Användning

1. Navigera till `/timeline` via vänstermenyn (Calendar-ikon)
2. Sidan laddar automatiskt ProcessTree och visar alla callActivities
3. Varje subprocess visas som en rad i Gantt-charten
4. Alla startar på 2026-01-01 med 2 veckors duration
5. Klicka och dra task-bars för att ändra datum
6. Dubbelklicka för att redigera detaljer

## Nästa Steg (Valfritt)

1. **Backend Integration**: Spara redigerade datum till Supabase
2. **Validering**: Lägg till datum-validering och felhantering
3. **Staggering**: Automatisk staggering av datum baserat på orderIndex
4. **Dependencies**: Visa dependencies mellan subprocesser i Gantt
5. **Export**: Exportera timeline till Excel/PDF
6. **Filtering**: Filtrera subprocesser baserat på branchId eller scenarioPath

## Tekniska Detaljer

### DHTMLX Gantt Konfiguration
```typescript
gantt.config.date_format = '%Y-%m-%d';
gantt.config.editable = true;
gantt.config.drag_resize = true;
gantt.config.drag_move = true;
```

### State Management
- `tasks: GanttTask[]` - Håller alla tasks med aktuella datum
- `isGanttInitialized: boolean` - Förhindrar flera initieringar
- `ganttContainerRef: RefObject<HTMLDivElement>` - Referens till Gantt-container

### Cleanup
- `gantt.destructor()` anropas vid unmount för att rensa upp event listeners och DOM

