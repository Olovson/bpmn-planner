# Gantt Timeline View - Analys & Förslag

## 1. Befintliga Strukturer

### 1.1 Tidsordning (Time Ordering)

**Huvudfält:**
- `orderIndex: number` - Primär tidsordning, beräknas från sequence flows
- `branchId: string | null` - Identifierar parallella grenar (t.ex. "main", "entry-2", "main-branch-1")
- `scenarioPath: string[]` - Fullständig sökväg genom branches (t.ex. ["main", "main-branch-1"])

**Var logiken finns:**
- `src/lib/bpmn/processGraphBuilder.ts` - `assignLocalOrderForFile()` beräknar orderIndex baserat på sequence flows
- `supabase/functions/build-process-tree/index.ts` - `calculateOrderIndex()` gör samma sak i Edge Function
- Använder DFS/BFS-traversal från start events för att tilldela ordning

**Hur det används:**
- `src/lib/bpmn/processTreeBuilder.ts` - `sortByOrderIndex()` sorterar noder
- `src/pages/NodeMatrix.tsx` - Sorterar noder efter `orderIndex` som standard
- `src/lib/ganttDataConverter.ts` - Använder `orderIndex` för sortering av subprocesser

### 1.2 Subprocesser / Feature Goals

**Huvudkällor:**
- `useProcessTree(rootFile)` - Returnerar `ProcessTreeNode` med full hierarki
- `useAllBpmnNodes()` - Returnerar flat lista av alla noder, inklusive callActivities
- `ProcessTreeNode.type === 'callActivity'` - Identifierar subprocesser

**Struktur:**
```typescript
interface ProcessTreeNode {
  id: string;
  label: string;
  type: 'callActivity' | 'userTask' | ...;
  orderIndex?: number;
  visualOrderIndex?: number; // Visuell ordning baserad på DI-koordinater, används endast när orderIndex saknas
  branchId?: string | null;
  scenarioPath?: string[];
  bpmnFile: string;
  bpmnElementId?: string;
  children: ProcessTreeNode[];
  // ...
}
```

### 1.3 Befintliga Sidor & Navigation

**Routing:**
- `src/App.tsx` - Definierar routes med `react-router-dom`
- `src/components/AppHeaderWithTabs.tsx` - Vänstermeny med navigation
- HashRouter används (`#/route`)

**Liknande sidor:**
- `ProcessExplorer` - Visar hierarkin som träd, använder `useProcessTree`
- `NodeMatrix` - Visar alla noder i tabell, använder `useAllBpmnNodes`
- `TimelinePage` - Visar subprocesser i Gantt-chart, använder `useProcessTree`

## 2. Var Det Bästa Stället Att Integrera

### 2.1 Rekommenderad Plats

**Ny sida:** `src/pages/TimelinePage.tsx`

**Routing:**
- Route: `/timeline` eller `/planning`
- Lägg till i `App.tsx` routes
- Lägg till i `AppHeaderWithTabs` navigation (ny ikon, t.ex. Calendar eller GanttChart)

**Varför:**
- Separerad sida gör det enkelt att fokusera på timeline-funktionalitet
- Följer samma mönster som `ProcessExplorer` och `NodeMatrix`
- Kan återanvända samma hooks (`useProcessTree`)

### 2.2 Dataflöde

```
useProcessTree(rootFile)
  ↓
ProcessTreeNode (hierarki)
  ↓
Extrahera alla callActivity-noder (rekursivt)
  ↓
Sortera efter orderIndex
  ↓
Konvertera till DHTMLX Gantt-format
  ↓
Rendera Gantt-komponent
```

## 3. Dataformatering för DHTMLX Gantt

### 3.1 DHTMLX Gantt Dataformat

DHTMLX Gantt förväntar sig:
```typescript
interface GanttTask {
  id: string | number;
  text: string; // Task name
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration?: number; // Days
  progress?: number; // 0-1
  parent?: string | number; // For hierarchical tasks
  // ... other optional fields
}
```

### 3.2 Konvertering från ProcessTreeNode

**Steg:**
1. Rekursivt extrahera alla `callActivity`-noder från `ProcessTreeNode`
2. Sortera efter `orderIndex` → `visualOrderIndex` → `branchId` → `label`
3. Konvertera varje nod till `GanttTask`:
   - `id`: `node.id` eller `node.bpmnElementId`
   - `text`: `node.label`
   - `start_date`: Baserat på orderIndex (staggered) eller base date
   - Sortering: orderIndex → visualOrderIndex → branchId → label
   - `end_date`: start_date + 2 veckor
   - `duration`: 14 (dagar)

**Exempel:**
```typescript
function extractCallActivities(node: ProcessTreeNode): ProcessTreeNode[] {
  const result: ProcessTreeNode[] = [];
  if (node.type === 'callActivity') {
    result.push(node);
  }
  node.children.forEach(child => {
    result.push(...extractCallActivities(child));
  });
  return result;
}

function convertToGanttTasks(
  callActivities: ProcessTreeNode[],
  baseDate: Date = new Date('2026-01-01')
): GanttTask[] {
  const sorted = [...callActivities].sort((a, b) => {
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  return sorted.map((node, index) => {
    // Stagger start dates slightly based on orderIndex
    const daysOffset = index * 0; // Start all at base date initially
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + daysOffset);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14); // 2 weeks

    return {
      id: node.id,
      text: node.label,
      start_date: formatDateForGantt(startDate),
      end_date: formatDateForGantt(endDate),
      duration: 14,
      progress: 0,
    };
  });
}
```

## 4. Komponentstruktur

### 4.1 Föreslagen Struktur

```
TimelinePage (main page component)
  ├── useProcessTree() - Hämtar ProcessTree
  ├── extractCallActivities() - Extraherar callActivity-noder
  ├── convertToGanttTasks() - Konverterar till Gantt-format
  ├── useState() - Hanterar redigerade datum
  └── GanttComponent (wrapper för DHTMLX Gantt)
      ├── initGantt() - Initierar DHTMLX Gantt
      ├── handleDateChange() - Uppdaterar datum vid redigering
      └── <div id="gantt-container" />
```

### 4.2 Komponenter

**Huvudkomponent:** `src/pages/TimelinePage.tsx`
- Använder `useProcessTree` för att hämta data
- Extraherar och sorterar callActivities
- Hanterar state för redigerade datum
- Renderar Gantt-komponenten

**Gantt Wrapper:** `src/components/GanttTimeline.tsx` (eller inline i TimelinePage)
- Initierar DHTMLX Gantt-instans
- Hanterar date change events
- Exponerar API för att uppdatera tasks

## 5. Implementation Plan

### Steg 1: Installera DHTMLX Gantt
```bash
npm install dhtmlx-gantt
npm install --save-dev @types/dhtmlx-gantt
```

### Steg 2: Skapa Utility Functions
- `src/lib/ganttDataConverter.ts` - Funktioner för att konvertera ProcessTreeNode → GanttTask
- `extractCallActivities()` - Rekursiv extraktion
- `convertToGanttTasks()` - Konvertering med orderIndex-sortering
- `formatDateForGantt()` - Datumformatering

### Steg 3: Skapa TimelinePage
- Ny fil: `src/pages/TimelinePage.tsx`
- Använder `useProcessTree` hook
- Extraherar callActivities
- Konverterar till Gantt-format
- Initierar DHTMLX Gantt

### Steg 4: Lägg till Routing & Navigation
- Lägg till route i `App.tsx`
- Lägg till navigation i `AppHeaderWithTabs.tsx`
- Välj ikon (Calendar eller GanttChart från lucide-react)

### Steg 5: Implementera Date Editing
- Använd DHTMLX Gantt's inbyggda date editing
- Uppdatera local state när användaren redigerar
- (Framtida: spara till backend)

## 6. Designbeslut

### 6.1 Enkelhet Före Komplexitet

**Val:**
- Inline Gantt-komponent i TimelinePage (inte separat fil först)
- Direkt konvertering ProcessTreeNode → GanttTask (ingen mellanliggande modell)
- Enkel state-hantering med `useState` (inte Redux/Context först)

**Varför:**
- Minskar abstraktionslager
- Lättare att förstå och underhålla
- Kan refaktorera senare om behov uppstår

### 6.2 Datumhantering

**Initialt:**
- Alla subprocesser startar på 2026-01-01
- Alla har 2 veckors duration
- OrderIndex används bara för sortering (inte för datum-staggering initialt)

**Redigering:**
- Användare kan redigera start/end datum direkt i Gantt
- Ändringar sparas i component state
- (Framtida: spara till backend/database)

### 6.3 Sortering

**Prioritet:**
1. `orderIndex` (om tillgängligt)
2. `branchId` (för att gruppera parallella grenar)
3. `label` (alfabetisk fallback)

**Implementation:**
```typescript
function sortCallActivities(nodes: ProcessTreeNode[]): ProcessTreeNode[] {
  return [...nodes].sort((a, b) => {
    // Primary: orderIndex
    const aOrder = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Secondary: branchId (main before branches)
    if (a.branchId !== b.branchId) {
      if (a.branchId === 'main') return -1;
      if (b.branchId === 'main') return 1;
      return (a.branchId || '').localeCompare(b.branchId || '');
    }
    
    // Tertiary: label
    return a.label.localeCompare(b.label);
  });
}
```

## 7. Sammanfattning

### Var Integrationen Sker

1. **Ny sida:** `src/pages/TimelinePage.tsx`
2. **Routing:** Lägg till `/timeline` route i `App.tsx`
3. **Navigation:** Lägg till ikon i `AppHeaderWithTabs.tsx`
4. **Data:** Använd `useProcessTree` hook (samma som ProcessExplorer)
5. **Konvertering:** Ny utility `src/lib/ganttDataConverter.ts`

### Dataflöde

```
useProcessTree(rootFile)
  → ProcessTreeNode (hierarki)
  → extractCallActivities() (rekursiv extraktion)
  → sortCallActivities() (sortera efter orderIndex)
  → convertToGanttTasks() (konvertera till DHTMLX-format)
  → DHTMLX Gantt instance
  → User edits dates
  → Update local state
```

### Komponenter

- **TimelinePage** - Huvudkomponent, hanterar data och state
- **GanttTimeline** (eller inline) - Wrapper för DHTMLX Gantt
- **ganttDataConverter.ts** - Utility functions för konvertering

### Nästa Steg

1. Installera DHTMLX Gantt
2. Skapa utility functions
3. Skapa TimelinePage-komponent
4. Lägg till routing och navigation
5. Testa med befintlig BPMN-data

