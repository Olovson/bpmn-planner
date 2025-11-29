# Analys: Konfigurationssida för projektparametrar och timeline-anpassning

## 1. Sammanfattning - Bekräftelse av krav

Jag förstår att du vill skapa en konfigurationssida där användare kan:

1. **Definiera integration ownership** (Stacc vs Banken) med möjlighet att lägga till extra arbetsmoment för bankens egna integrationer
2. **Lägga till förberedande aktiviteter** (generella Feature Goals) som ska visas FÖRST på timeline
3. **Dynamiskt påverka timeline-generering** baserat på dessa konfigurationer

Detta är en naturlig utökning av den befintliga `IntegrationContext`-funktionaliteten och timeline-systemet.

---

## 2. Nuvarande implementation - Timeline

### 2.1 Dataflöde

```
1. useProcessTree(rootFile) 
   → Hämtar ProcessTree från Supabase/byggs från BPMN-filer

2. buildGanttTasksFromProcessTree(processTree, baseDate, defaultDurationDays)
   → Bygger hierarkiska Gantt-tasks från ProcessTree
   → Root-process → Root callActivities → Subprocess-innehåll
   → Använder hierarchical scheduling (timelineScheduling.ts)

3. IntegrationContext.useStaccIntegration(bpmnFile, elementId)
   → Kontrollerar integration ownership från Supabase (integration_overrides)
   → Default: true (Stacc)
   → Påverkar färg i timeline (grön = bank, blå = Stacc)

4. TimelinePage renderar DHTMLX Gantt med tasks
```

### 2.2 Viktiga komponenter

- **`src/pages/TimelinePage.tsx`**: Huvudkomponent för timeline
- **`src/lib/ganttDataConverter.ts`**: Konverterar ProcessTree → GanttTasks
- **`src/lib/timelineScheduling.ts`**: Beräknar tidsplanering (leafCount, durationDays, startDate, endDate)
- **`src/contexts/IntegrationContext.tsx`**: Hanterar integration ownership
- **`src/hooks/useProcessTree.ts`**: Hämtar ProcessTree

### 2.3 Nuvarande datastruktur

**GanttTask:**
```typescript
interface GanttTask {
  id: string;
  text: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration: number; // Days
  progress: number; // 0-1
  parent?: string | number;
  type?: 'task' | 'project';
  bpmnFile?: string;
  bpmnElementId?: string;
  // ... metadata
}
```

**Integration ownership:**
- Lagras i Supabase: `integration_overrides` tabell
- Format: `(bpmn_file, element_id, uses_stacc_integration)`
- Default: `uses_stacc_integration = true` (Stacc)

### 2.4 Timeline-generering

- **Base date**: 2026-01-01 (hardcoded)
- **Default duration**: 14 dagar (2 veckor) per leaf node
- **Sortering**: Använder `orderIndex`, `branchId`, `scenarioPath` från ProcessTree
- **Hierarki**: Root-process → Root callActivities → Subprocess-innehåll

---

## 3. Arkitekturförslag

### 3.1 Datalagring

**Rekommendation: Supabase (persistent per projekt)**

**Motivering:**
- ✅ Konsistent med nuvarande arkitektur (`integration_overrides` finns redan)
- ✅ Delad mellan användare (team-baserad)
- ✅ Persistent över sessioner
- ✅ Enkelt att versionera/migrera
- ✅ Stöd för rollbaserad access (RLS policies)

**Förslag på tabellstruktur:**

```sql
-- Projektkonfiguration (en per root BPMN-fil/projekt)
create table project_configurations (
  id uuid primary key default gen_random_uuid(),
  root_bpmn_file text not null unique, -- t.ex. "mortgage.bpmn"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- Förberedande aktiviteter
create table preparatory_activities (
  id uuid primary key default gen_random_uuid(),
  project_config_id uuid not null references project_configurations(id) on delete cascade,
  name text not null,
  description text,
  estimated_weeks numeric(5,2) not null check (estimated_weeks > 0),
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_config_id, order_index)
);

-- Integration-konfiguration (utökning av integration_overrides)
-- Alternativ 1: Utöka befintlig tabell
alter table integration_overrides 
  add column extra_work_items jsonb default '[]'::jsonb;

-- Alternativ 2: Ny tabell för extra arbetsmoment
create table integration_extra_work_items (
  id uuid primary key default gen_random_uuid(),
  bpmn_file text not null,
  element_id text not null,
  name text not null,
  description text,
  estimated_weeks numeric(5,2) not null check (estimated_weeks > 0),
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bpmn_file, element_id) 
    references integration_overrides(bpmn_file, element_id) 
    on delete cascade,
  unique(bpmn_file, element_id, order_index)
);
```

**Alternativ: Local Storage (per användare)**
- ❌ Inte delad mellan användare
- ❌ Försvinner vid cache-rensning
- ✅ Enklare implementation
- ✅ Ingen backend-ändring

**Rekommendation: Supabase** för produktionsanvändning, men vi kan börja med Local Storage för prototyp.

### 3.2 State Management

**Rekommendation: React Context API (konsistent med nuvarande arkitektur)**

**Motivering:**
- ✅ Redan använt för `IntegrationContext`
- ✅ Enkelt att integrera med befintlig kod
- ✅ Inga extra dependencies
- ✅ Bra för projektets storlek

**Förslag på struktur:**

```typescript
// src/contexts/ProjectConfigurationContext.tsx
interface ProjectConfigurationContextType {
  // Förberedande aktiviteter
  preparatoryActivities: PreparatoryActivity[];
  addPreparatoryActivity: (activity: Omit<PreparatoryActivity, 'id'>) => Promise<void>;
  updatePreparatoryActivity: (id: string, updates: Partial<PreparatoryActivity>) => Promise<void>;
  removePreparatoryActivity: (id: string) => Promise<void>;
  
  // Integration-konfiguration
  getIntegrationConfig: (bpmnFile: string, elementId: string) => IntegrationConfig | null;
  setIntegrationOwner: (bpmnFile: string, elementId: string, owner: 'stacc' | 'bank') => Promise<void>;
  addExtraWorkItem: (bpmnFile: string, elementId: string, workItem: Omit<WorkItem, 'id'>) => Promise<void>;
  removeExtraWorkItem: (bpmnFile: string, elementId: string, workItemId: string) => Promise<void>;
  
  // Loading state
  loading: boolean;
}
```

### 3.3 Timeline-integration

**Förslag på ändringar i `ganttDataConverter.ts`:**

```typescript
export function buildGanttTasksFromProcessTree(
  processTree: ProcessTreeNode | null,
  baseDate: Date = new Date('2026-01-01'),
  defaultDurationDays: number = 14,
  config?: ProjectConfiguration // NYTT PARAMETER
): GanttTask[] {
  const tasks: GanttTask[] = [];
  let currentDate = baseDate;
  
  // 1. Lägg till förberedande aktiviteter FÖRST
  if (config?.preparatoryActivities) {
    for (const activity of config.preparatoryActivities.sort((a, b) => a.order - b.order)) {
      const durationDays = activity.estimatedWeeks * 7;
      const endDate = addDays(currentDate, durationDays);
      
      tasks.push({
        id: `preparatory:${activity.id}`,
        text: activity.name,
        start_date: formatDate(currentDate),
        end_date: formatDate(endDate),
        duration: durationDays,
        progress: 0,
        type: 'task',
        parent: '0', // Root level
        // Custom metadata
        meta: {
          kind: 'preparatory',
          description: activity.description,
        },
      });
      
      currentDate = endDate; // Nästa aktivitet startar när denna slutar
    }
  }
  
  // 2. Lägg till extra arbetsmoment för bank-integrationer
  // (Innan standard ProcessTree-tasks)
  // ... implementation ...
  
  // 3. Lägg till standard ProcessTree-tasks (befintlig logik)
  // ... befintlig implementation ...
  
  return tasks;
}
```

**Förslag på ändringar i `TimelinePage.tsx`:**

```typescript
const TimelinePage = () => {
  const { data: projectConfig } = useProjectConfiguration(rootFile);
  // ... existing code ...
  
  useEffect(() => {
    if (!processTree || !projectConfig) return;
    
    const tasks = buildGanttTasksFromProcessTree(
      processTree,
      baseDate,
      defaultDurationDays,
      projectConfig // Passera konfiguration
    );
    
    setTasks(tasks);
  }, [processTree, projectConfig, baseDate, defaultDurationDays]);
};
```

### 3.4 Navigation

**Rekommendation: Separat route `/configuration`**

**Motivering:**
- ✅ Tydlig separation of concerns
- ✅ Enkel att länka från timeline-sidan
- ✅ Kan öppnas i ny flik
- ✅ Konsistent med nuvarande routing-struktur

**Förslag på UI-integration:**

```typescript
// I TimelinePage.tsx - lägg till knapp i header
<Button onClick={() => navigate('/configuration')}>
  ⚙️ Projektkonfiguration
</Button>

// I App.tsx - lägg till route
<Route path="/configuration" element={<ProjectConfigurationPage />} />
```

---

## 4. Identifierade risker

### 4.1 Tekniska risker

1. **Timeline-beräkning blir komplex**
   - Risk: Förberedande aktiviteter + extra arbetsmoment + ProcessTree kan skapa komplexa beroenden
   - Mitigation: Tydlig separation i `buildGanttTasksFromProcessTree`, testa edge cases

2. **Data-synkronisering**
   - Risk: Konfiguration ändras men timeline uppdateras inte
   - Mitigation: Använd React Context med `useEffect` dependencies, eller real-time subscriptions (Supabase Realtime)

3. **Performance**
   - Risk: Många förberedande aktiviteter + extra arbetsmoment kan göra timeline långsam
   - Mitigation: Memoization (`useMemo`), lazy loading, virtualisering i Gantt

4. **Migration av befintliga projekt**
   - Risk: Befintliga projekt har ingen konfiguration → timeline kan bli tom eller fel
   - Mitigation: Default-värden, migration-script, tydlig felhantering

### 4.2 UX-risker

1. **Användare glömmer att konfigurera**
   - Risk: Timeline visar fel data om konfiguration saknas
   - Mitigation: Tydliga varningar, default-värden, onboarding-guide

2. **Konfiguration blir för komplex**
   - Risk: Användare förstår inte hur de ska konfigurera
   - Mitigation: Stegvis onboarding, templates, tooltips, exempel

3. **Real-time vs. Save-knapp**
   - Risk: Användare förväntar sig auto-save men ändringar försvinner
   - Mitigation: Tydlig indikering (sparad/ej sparad), auto-save med debounce, eller explicit save-knapp

### 4.3 Data-risker

1. **Validering**
   - Risk: Negativa tider, saknade obligatoriska fält, cirkulära beroenden
   - Mitigation: Client-side + server-side validering, tydliga felmeddelanden

2. **Concurrent edits**
   - Risk: Två användare redigerar samtidigt → dataförlust
   - Mitigation: Optimistic locking, last-write-wins, eller Supabase Realtime för real-time sync

---

## 5. Implementationsplan

### Fas 1: Grundläggande struktur (1-2 dagar)

1. **Skapa datamodell**
   - Skapa Supabase-tabeller (eller börja med Local Storage)
   - Definiera TypeScript-interfaces
   - Skapa migration-script

2. **Skapa ProjectConfigurationContext**
   - Grundläggande CRUD för förberedande aktiviteter
   - Grundläggande CRUD för integration-konfiguration
   - Loading states

3. **Skapa konfigurationssida (UI)**
   - Grundläggande layout
   - Lista förberedande aktiviteter (lägg till/ta bort)
   - Lista integrationer (visa ownership, ändra)

### Fas 2: Integration med timeline (1-2 dagar)

4. **Uppdatera `ganttDataConverter.ts`**
   - Lägg till stöd för förberedande aktiviteter
   - Lägg till stöd för extra arbetsmoment
   - Uppdatera tidsberäkning

5. **Uppdatera `TimelinePage.tsx`**
   - Hämta projektkonfiguration
   - Passera till `buildGanttTasksFromProcessTree`
   - Testa att timeline uppdateras korrekt

### Fas 3: Extra arbetsmoment för bank-integrationer (1-2 dagar)

6. **Utöka integration-konfiguration**
   - UI för att lägga till/ta bort extra arbetsmoment
   - Validering (endast om "Banken" valt)
   - Spara till Supabase

7. **Integrera i timeline**
   - Lägg till extra arbetsmoment FÖRE standard-tasks
   - Korrekt tidsberäkning
   - Visuell skillnad (t.ex. annan färg)

### Fas 4: Förfining och polish (1-2 dagar)

8. **Validering och felhantering**
   - Client-side validering
   - Server-side validering (om Supabase)
   - Tydliga felmeddelanden

9. **UX-förbättringar**
   - Drag & drop för sortering (valfritt)
   - Auto-save eller explicit save
   - Loading states
   - Success/error feedback

10. **Dokumentation**
    - README-uppdatering
    - Kommentarer i kod
    - Användar-guide

---

## 6. Frågor som behöver förtydligas

### 6.1 Tekniska frågor

1. **Datalagring - Supabase vs. Local Storage?**
   - Ska konfigurationen vara delad mellan användare (Supabase) eller per användare (Local Storage)?
   - **Min rekommendation:** Supabase för produktionsanvändning, men börja med Local Storage för prototyp.

2. **Projekt-identifiering**
   - Hur identifierar vi vilket projekt en konfiguration tillhör?
   - **Förslag:** `root_bpmn_file` (t.ex. "mortgage.bpmn") som unik identifierare
   - **Alternativ:** Projekt-ID, projektnamn, eller annat?

3. **Integration-identifiering**
   - Hur identifierar vi vilka integrationer som finns i projektet?
   - **Förslag:** Använd `STACC_INTEGRATION_MAPPING` som bas, plus dynamisk lista från ProcessTree (alla serviceTasks)
   - **Alternativ:** Manuell lista i konfiguration?

4. **Extra arbetsmoment - var placeras de?**
   - Ska extra arbetsmoment för en bank-integration placeras:
     - **FÖRE** den integrationens standard-tasks?
     - **EFTER** den integrationens standard-tasks?
     - **ISTÄLLET FÖR** den integrationens standard-tasks?
   - **Min rekommendation:** FÖRE standard-tasks (som du nämnde)

5. **Tidsberäkning**
   - Ska förberedande aktiviteter och extra arbetsmoment använda samma tidsberäkning som ProcessTree (14 dagar per leaf)?
   - **Förslag:** Använd `estimatedWeeks` direkt (konvertera till dagar: `weeks * 7`)
   - **Alternativ:** Använd samma logik som ProcessTree?

### 6.2 UX-frågor

6. **Real-time uppdatering**
   - Ska timeline uppdateras direkt när konfiguration ändras, eller först när användaren klickar "Spara"?
   - **Min rekommendation:** Auto-save med debounce (1-2 sekunder), eller explicit save-knapp med tydlig feedback

7. **Default-värden**
   - Ska vi ha fördefinierade templates för vanliga aktiviteter (t.ex. "Etablering", "Plattformsetablering")?
   - **Förslag:** Ja, med möjlighet att anpassa

8. **Navigation**
   - Ska konfigurationssidan nås från:
     - Timeline-sidan (knapp i header)?
     - Settings-meny?
     - Båda?
   - **Min rekommendation:** Båda (knapp i timeline + settings-meny)

### 6.3 Scope-frågor

9. **Migration**
   - Har ni befintliga projekt som behöver migreras?
   - **Förslag:** Om ja, skapa migration-script som skapar default-konfiguration

10. **Validering**
    - Vilka valideringsregler behöver vi?
    - **Förslag:**
      - `estimatedWeeks > 0`
      - `name` är obligatoriskt
      - `order` är unik per projekt
      - Extra arbetsmoment kan endast läggas till om `implementedBy === 'bank'`

11. **Permissions**
    - Ska alla användare kunna ändra konfiguration, eller behövs rollbaserad access?
    - **Förslag:** Börja med alla autentiserade användare, lägg till RLS policies senare om behövs

12. **Beroenden mellan aktiviteter**
    - Ska vi stödja beroenden (t.ex. "Plattformsetablering måste slutföras innan Integration X kan starta")?
    - **Förslag:** Nej i första versionen, men designa datamodellen så att det kan läggas till senare

---

## 7. Ytterligare överväganden

### 7.1 Datamodell - förtydligande

Din föreslagna datastruktur ser bra ut, men jag föreslår några justeringar:

```typescript
interface ProjectConfiguration {
  rootBpmnFile: string; // Identifierare för projektet
  preparatoryActivities: PreparatoryActivity[];
  integrations: IntegrationConfig[];
}

interface PreparatoryActivity {
  id: string;
  name: string;
  description: string;
  estimatedWeeks: number;
  order: number; // För sortering
}

interface IntegrationConfig {
  bpmnFile: string;
  elementId: string;
  implementedBy: 'stacc' | 'bank';
  extraWorkItems?: WorkItem[]; // Endast om "bank"
}

interface WorkItem {
  id: string;
  name: string;
  estimatedWeeks: number;
  description?: string;
  order?: number; // För sortering inom samma integration
}
```

**Förslag på förbättringar:**
- Lägg till `rootBpmnFile` i `ProjectConfiguration` för tydlig projekt-identifiering
- Lägg till `order` i `WorkItem` för sortering
- Överväg `estimatedDays` som alternativ till `estimatedWeeks` (eller konvertera automatiskt)

### 7.2 Timeline-generering - detaljerad algoritm

**Förslag på algoritm:**

```
1. Start: baseDate (t.ex. 2026-01-01)
2. currentDate = baseDate

3. Förberedande aktiviteter (sorterade efter order):
   För varje aktivitet:
     - startDate = currentDate
     - durationDays = estimatedWeeks * 7
     - endDate = startDate + durationDays
     - Lägg till task i timeline
     - currentDate = endDate

4. Extra arbetsmoment för bank-integrationer (sorterade per integration, sedan order):
   För varje integration där implementedBy === 'bank':
     För varje extraWorkItem:
       - startDate = currentDate
       - durationDays = estimatedWeeks * 7
       - endDate = startDate + durationDays
       - Lägg till task i timeline (med parent = integration-task)
       - currentDate = endDate

5. Standard ProcessTree-tasks (befintlig logik):
   - Start från currentDate (inte baseDate!)
   - Fortsätt med befintlig hierarchical scheduling
```

### 7.3 UI-komponenter - förslag

**Förberedande aktiviteter:**
- Lista med drag & drop (valfritt, kan börja med enkel lista)
- Inline-redigering (klick för att redigera)
- Validering i realtid

**Integrationer:**
- Radio buttons eller Toggle för Stacc/Banken
- Conditional rendering: Visa extra arbetsmoment endast om "Banken" valt
- Lista med lägg till/ta bort för extra arbetsmoment

**Layout:**
- Tabs eller Accordion för olika sektioner
- Tydlig visual feedback (sparad/ej sparad)
- Loading states

---

## 8. Nästa steg

1. **Bekräfta förståelse:** Bekräfta att analysen stämmer med dina förväntningar
2. **Besvara frågor:** Svar på frågorna i sektion 6
3. **Prioritera:** Vilken fas ska vi börja med?
4. **Prototyp:** Ska vi börja med Local Storage eller direkt med Supabase?

---

## 9. Sammanfattning

**Jag förstår att du vill:**
- ✅ Skapa en konfigurationssida för projektparametrar
- ✅ Definiera integration ownership (Stacc vs Banken)
- ✅ Lägga till förberedande aktiviteter
- ✅ Lägga till extra arbetsmoment för bank-integrationer
- ✅ Dynamiskt påverka timeline-generering

**Min rekommendation:**
- ✅ Supabase för datalagring (konsistent med nuvarande arkitektur)
- ✅ React Context API för state management
- ✅ Separat route `/configuration`
- ✅ Auto-save med debounce eller explicit save-knapp
- ✅ Stegvis implementation (4 faser)

**Identifierade risker:**
- ⚠️ Komplex timeline-beräkning
- ⚠️ Data-synkronisering
- ⚠️ Migration av befintliga projekt

**Vad behöver förtydligas:**
- ❓ Datalagring (Supabase vs Local Storage)
- ❓ Projekt-identifiering
- ❓ Integration-identifiering
- ❓ Placering av extra arbetsmoment
- ❓ Real-time uppdatering vs Save-knapp

Väntar på dina svar innan jag börjar implementera! 🚀

