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
**Syfte**: Bygger hierarkiska DHTMLX Gantt-tasks direkt från ProcessTree

**Funktioner:**
- `sortCallActivities(nodes, mode)` – sorteringslogik för root- respektive subprocess-nivå.
- `buildSubprocessUsageIndex()` – räknar hur många callActivities som pekar på samma subprocess-fil (för `isReusedSubprocess`-flaggan).
- `buildGanttTasksFromProcessTree()` – skapar en hierarki: root-process → root-callActivities → deras subprocess-innehåll.
- `addRootCallActivities()`, `addSubprocessChildren()` – hjälper till att skapa `project`/`task`-rader med korrekta föräldrar.
- (Legacy helpers `extractCallActivities()` och `convertToGanttTasks()` finns kvar för kompatibilitet men används inte längre av timeline-vyn.)

**Dataformat (utdrag):**
```ts
interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  parent?: string | number;
  type?: 'task' | 'project';
  orderIndex?: number;
  branchId?: string | null;
  bpmnFile?: string;
  bpmnElementId?: string;
  meta?: {
    kind: 'process' | ProcessTreeNode['type'];
    orderIndex: number | null;
    visualOrderIndex: number | null;
    branchId: string | null;
    scenarioPath: string[];
    subprocessFile?: string | null;
    matchedProcessId?: string | null;
    isReusedSubprocess?: boolean;
  };
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
1. `useProcessTree(rootFile)`
2. `buildGanttTasksFromProcessTree(processTree, baseDate, duration)`  
   - Root-process blir `project` (parent `0`)
   - Root-callActivities blir `project`-barn
   - Subprocess-innehåll (callActivities + tasks) blir hierarkiska underbarn
   - Metadata (`meta`) följer med varje rad
3. Supabase `bpmn_element_mappings` hämtas och injiceras (Jira-data)
4. DHTMLX Gantt initialiseras och får den hierarkiska datan (`parent`, `type`, `open`)
5. Användaren kan redigera datum → `onAfterTaskUpdate`
6. React-state uppdateras → Gantt renderas om
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

**Root-nivå (`mode: 'root'`):**
1. `orderIndex`
2. `visualOrderIndex`
3. `branchId` (main → entry-2 → entry-3)
4. `label`

**Subprocess-nivå (`mode: 'subprocess'`):**
1. `orderIndex`
2. `visualOrderIndex`
3. `label`

**Visuell ordning (visualOrderIndex):**
- Beräknas per BPMN-fil när sequence flows saknas (se `docs/VISUAL_ORDERING_IMPLEMENTATION.md`).
- Gör att t.ex. root-level callActivities i `mortgage.bpmn` sorteras vänster→höger enligt BPMN-diagrammet.

**Exempel:**
- Subprocess med `orderIndex: 1, branchId: 'main'` kommer före
- Subprocess med `orderIndex: 2, branchId: 'main'` som kommer före
- Subprocess med `orderIndex: undefined, visualOrderIndex: 0` (när orderIndex saknas)
- Subprocess med `orderIndex: undefined, visualOrderIndex: 1` (när orderIndex saknas)

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

