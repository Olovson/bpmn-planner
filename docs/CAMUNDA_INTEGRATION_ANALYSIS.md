# 🔄 Camunda Integration Analysis

## Översikt

Detta dokument analyserar hur man skulle implementera **Camunda** för att faktiskt exekvera BPMN-filerna i BPMN Planner, istället för att bara visualisera och dokumentera dem.

---

## 1. Vad är Camunda?

**Camunda** är en plattform för Business Process Management (BPM) som kan:
- **Parsa BPMN-filer** och skapa processdefinitioner
- **Exekvera processer** enligt BPMN-specifikationen
- **Hantera processinstanser** (runtime state)
- **Hantera tasks** (UserTasks, ServiceTasks, BusinessRuleTasks)
- **Hantera variabler** och processdata
- **Hantera events** (start events, end events, boundary events)
- **Hantera gateways** (exclusive, parallel, inclusive)
- **Hantera subprocesser** (callActivity, embedded subprocess)

### Camunda-varianter

1. **Camunda Platform** (tidigare Camunda BPM)
   - Fullständig BPM-plattform med REST API
   - Kräver separat server (Java-baserad)
   - Bra för enterprise-användning
   - Har web UI (Cockpit, Tasklist, Admin)

2. **Camunda Platform 8** (Zeebe)
   - Cloud-native, skalbar
   - Event-driven architecture
   - Bättre för microservices
   - Kräver Camunda Cloud eller self-hosted Zeebe

3. **Embedded Camunda Engine**
   - Embedded i Java-applikation
   - Ingen separat server
   - Enklare setup, men begränsad skalbarhet
   - Bra för mindre applikationer

---

## 2. Nuvarande Arkitektur

### 2.1 Frontend (React + Vite)
- **BPMN-parsing**: `bpmn-js` för att läsa BPMN XML
- **Visualisering**: Process Explorer, Node Matrix, Timeline
- **Dokumentation**: Generering av docs, tester, DoR/DoD
- **Backend**: Supabase (PostgreSQL + Storage + Edge Functions)

### 2.2 Backend (Supabase)
- **Storage**: BPMN-filer lagras i Supabase Storage
- **Database**: PostgreSQL med tabeller för:
  - `bpmn_files` (metadata)
  - `bpmn_element_mappings` (noder)
  - `node_test_links` (tester)
  - `dor_dod_status` (DoR/DoD)
  - `generation_jobs` (genereringshistorik)
- **Edge Functions**: Node.js-funktioner för server-side logik

### 2.3 BPMN-struktur
- **Multi-fil**: Processer är uppdelade över många BPMN-filer
- **Hierarki**: CallActivities länkar till subprocesser i andra filer
- **Nodtyper**: UserTasks, ServiceTasks, BusinessRuleTasks, CallActivities
- **Sequence flows**: Definierar exekveringsordning

---

## 3. Implementation-alternativ

### 3.1 Alternativ A: Camunda Platform (REST API)

**Arkitektur:**
```
Frontend (React)
    ↓ HTTP
Supabase Edge Functions
    ↓ REST API
Camunda Platform Server
    ↓
PostgreSQL (Camunda DB)
```

**Fördelar:**
- ✅ Fullständig BPM-funktionalitet
- ✅ Web UI (Cockpit, Tasklist) out-of-the-box
- ✅ REST API för all interaktion
- ✅ Bra för enterprise-användning
- ✅ Stöd för komplexa processer

**Nackdelar:**
- ❌ Kräver separat Java-server
- ❌ Mer komplex deployment
- ❌ Överkill för enklare användningsfall
- ❌ Ytterligare infrastruktur att hantera

**Implementation:**
1. Deploya Camunda Platform Server (Docker eller standalone)
2. Skapa Supabase Edge Function som proxy till Camunda REST API
3. Frontend anropar Edge Functions som anropar Camunda
4. Processdefinitioner deployas till Camunda via REST API
5. Processinstanser startas via REST API
6. Tasks hanteras via REST API

---

### 3.2 Alternativ B: Embedded Camunda Engine (Node.js)

**Arkitektur:**
```
Frontend (React)
    ↓ HTTP
Supabase Edge Functions
    ↓
Camunda Engine (embedded i Edge Function)
    ↓
Supabase PostgreSQL (process state)
```

**Fördelar:**
- ✅ Ingen separat server
- ✅ Enklare deployment (allt i Supabase)
- ✅ Lägre latens (inga externa API-anrop)
- ✅ Bättre integration med Supabase

**Nackdelar:**
- ❌ Camunda Engine är Java-baserad (kräver Java runtime)
- ❌ Edge Functions kör Node.js (inte Java)
- ❌ Begränsad skalbarhet
- ❌ Ingen web UI out-of-the-box

**Implementation:**
- **Problem**: Camunda Engine är Java, men Edge Functions är Node.js
- **Lösning**: Använd **Camunda External Task Client** (Node.js) eller bygg egen execution engine

---

### 3.3 Alternativ C: Egen Execution Engine (Rekommenderat)

**Arkitektur:**
```
Frontend (React)
    ↓ HTTP
Supabase Edge Functions
    ↓
Custom BPMN Execution Engine (Node.js)
    ↓
Supabase PostgreSQL (process state)
```

**Fördelar:**
- ✅ Full kontroll över implementation
- ✅ Perfekt integration med Supabase
- ✅ Kan använda befintlig BPMN-parsing (`bpmn-js`)
- ✅ Enklare att anpassa till specifika behov
- ✅ Ingen externa dependencies

**Nackdelar:**
- ❌ Måste implementera execution logic själv
- ❌ Mer utvecklingsarbete
- ❌ Måste hantera edge cases själv

**Implementation:**
- Bygg på befintlig `BpmnParser` och `BpmnProcessGraph`
- Implementera execution state machine
- Hantera processinstanser i Supabase
- Hantera tasks via Supabase-tabeller

---

## 4. Rekommenderad Approach: Hybrid (Camunda Platform + Supabase)

### 4.1 Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Process Explorer (visuell)                                │
│  - Process Execution View (ny)                               │
│  - Task List (ny)                                             │
│  - Process Instance Monitor (ny)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                          │
│  - deploy-process.ts (deploy BPMN till Camunda)              │
│  - start-process.ts (starta processinstans)                  │
│  - get-tasks.ts (hämta tasks för användare)                  │
│  - complete-task.ts (komplettera task)                        │
│  - get-process-instance.ts (hämta processstatus)              │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Camunda Platform Server                         │
│  - Process Engine (exekverar BPMN)                           │
│  - Task Service (hanterar UserTasks)                          │
│  - REST API (endpoints för allt)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Camunda Database (PostgreSQL)                   │
│  - Process Definitions                                        │
│  - Process Instances                                         │
│  - Tasks                                                      │
│  - Variables                                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                            │
│  - bpmn_files (metadata)                                     │
│  - process_executions (sync med Camunda)                      │
│  - task_assignments (användaruppdrag)                         │
│  - execution_history (audit log)                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Varför Hybrid?

1. **Separation of Concerns**
   - Camunda hanterar process execution (specialiserat)
   - Supabase hanterar applikationsdata (metadata, användare, etc.)

2. **Bästa av båda världar**
   - Camunda: Robust BPM-execution, testad och stabil
   - Supabase: Enkel integration, real-time, auth

3. **Flexibilitet**
   - Kan byta Camunda mot annan engine senare
   - Applikationsdata förblir i Supabase

---

## 5. Detaljerad Implementation Plan

### 5.1 Phase 1: Setup & Infrastructure

#### 5.1.1 Deploya Camunda Platform

**Docker Compose (lokal utveckling):**
```yaml
version: '3.8'
services:
  camunda:
    image: camunda/camunda-bpm-platform:latest
    ports:
      - "8080:8080"
    environment:
      - DB_DRIVER=org.postgresql.Driver
      - DB_URL=jdbc:postgresql://postgres:5432/camunda
      - DB_USERNAME=camunda
      - DB_PASSWORD=camunda
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=camunda
      - POSTGRES_USER=camunda
      - POSTGRES_PASSWORD=camunda
    volumes:
      - camunda_db_data:/var/lib/postgresql/data

volumes:
  camunda_db_data:
```

**Produktion:**
- Deploya Camunda Platform på egen server eller cloud
- Konfigurera PostgreSQL-databas
- Sätt upp REST API-autentisering

#### 5.1.2 Supabase Schema-utökning

**Nya tabeller:**
```sql
-- Process executions (sync med Camunda)
CREATE TABLE process_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camunda_process_instance_id TEXT UNIQUE NOT NULL,
  bpmn_file_name TEXT NOT NULL,
  process_definition_key TEXT NOT NULL,
  status TEXT NOT NULL, -- 'RUNNING', 'COMPLETED', 'SUSPENDED', 'TERMINATED'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES auth.users(id),
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task assignments (användaruppdrag)
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camunda_task_id TEXT UNIQUE NOT NULL,
  process_execution_id UUID REFERENCES process_executions(id),
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL, -- 'UserTask', 'ServiceTask', 'BusinessRuleTask'
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL, -- 'CREATED', 'ASSIGNED', 'COMPLETED'
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Execution history (audit log)
CREATE TABLE execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_execution_id UUID REFERENCES process_executions(id),
  event_type TEXT NOT NULL, -- 'PROCESS_STARTED', 'TASK_CREATED', 'TASK_COMPLETED', etc.
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Process definitions (cache)
CREATE TABLE process_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camunda_definition_id TEXT UNIQUE NOT NULL,
  bpmn_file_name TEXT NOT NULL,
  definition_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  xml_content TEXT NOT NULL
);
```

---

### 5.2 Phase 2: Edge Functions

#### 5.2.1 Deploy Process Definition

**`supabase/functions/deploy-process/index.ts`:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CAMUNDA_REST_URL = Deno.env.get('CAMUNDA_REST_URL') || 'http://localhost:8080/engine-rest';

serve(async (req) => {
  const { bpmnFileName, xmlContent } = await req.json();
  
  // 1. Hämta BPMN XML från Supabase Storage
  const supabase = createClient(/* ... */);
  const { data: fileData } = await supabase.storage
    .from('bpmn-files')
    .download(bpmnFileName);
  
  const xml = await fileData.text();
  
  // 2. Deploy till Camunda via REST API
  const formData = new FormData();
  formData.append('deployment-name', bpmnFileName);
  formData.append('deployment-source', 'bpmn-planner');
  formData.append('bpmn-file', new Blob([xml], { type: 'application/xml' }), bpmnFileName);
  
  const response = await fetch(`${CAMUNDA_REST_URL}/deployment/create`, {
    method: 'POST',
    body: formData,
  });
  
  const deployment = await response.json();
  
  // 3. Spara process definition i Supabase
  await supabase.from('process_definitions').insert({
    camunda_definition_id: deployment.deployedProcessDefinitions[0].id,
    bpmn_file_name: bpmnFileName,
    definition_key: deployment.deployedProcessDefinitions[0].key,
    version: deployment.deployedProcessDefinitions[0].version,
    xml_content: xml,
  });
  
  return new Response(JSON.stringify({ success: true, deployment }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### 5.2.2 Start Process Instance

**`supabase/functions/start-process/index.ts`:**
```typescript
serve(async (req) => {
  const { processDefinitionKey, variables, userId } = await req.json();
  
  // 1. Starta processinstans i Camunda
  const response = await fetch(
    `${CAMUNDA_REST_URL}/process-definition/key/${processDefinitionKey}/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables }),
    }
  );
  
  const instance = await response.json();
  
  // 2. Spara i Supabase
  const supabase = createClient(/* ... */);
  await supabase.from('process_executions').insert({
    camunda_process_instance_id: instance.id,
    bpmn_file_name: /* ... */,
    process_definition_key: processDefinitionKey,
    status: 'RUNNING',
    started_by: userId,
    variables: variables || {},
  });
  
  // 3. Logga event
  await supabase.from('execution_history').insert({
    process_execution_id: /* ... */,
    event_type: 'PROCESS_STARTED',
    event_data: { instanceId: instance.id },
  });
  
  return new Response(JSON.stringify({ success: true, instance }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### 5.2.3 Get Tasks

**`supabase/functions/get-tasks/index.ts`:**
```typescript
serve(async (req) => {
  const { userId, processInstanceId } = await req.json();
  
  // 1. Hämta tasks från Camunda
  const url = processInstanceId
    ? `${CAMUNDA_REST_URL}/task?processInstanceId=${processInstanceId}`
    : `${CAMUNDA_REST_URL}/task?assignee=${userId}`;
  
  const response = await fetch(url);
  const tasks = await response.json();
  
  // 2. Synka med Supabase
  const supabase = createClient(/* ... */);
  for (const task of tasks) {
    await supabase.from('task_assignments').upsert({
      camunda_task_id: task.id,
      process_execution_id: /* ... */,
      task_name: task.name,
      task_type: task.taskDefinitionKey,
      assigned_to: userId,
      status: task.assignee ? 'ASSIGNED' : 'CREATED',
    });
  }
  
  return new Response(JSON.stringify({ tasks }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### 5.2.4 Complete Task

**`supabase/functions/complete-task/index.ts`:**
```typescript
serve(async (req) => {
  const { taskId, variables, userId } = await req.json();
  
  // 1. Komplettera task i Camunda
  const response = await fetch(
    `${CAMUNDA_REST_URL}/task/${taskId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables }),
    }
  );
  
  // 2. Uppdatera i Supabase
  const supabase = createClient(/* ... */);
  await supabase
    .from('task_assignments')
    .update({ status: 'COMPLETED' })
    .eq('camunda_task_id', taskId);
  
  // 3. Logga event
  await supabase.from('execution_history').insert({
    event_type: 'TASK_COMPLETED',
    event_data: { taskId, variables },
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### 5.3 Phase 3: Frontend Integration

#### 5.3.1 Process Execution View

**`src/pages/ProcessExecution.tsx`:**
```typescript
export function ProcessExecution() {
  const [processes, setProcesses] = useState<ProcessExecution[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  
  // Hämta processinstanser
  const { data: executions } = useQuery({
    queryKey: ['process-executions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('process_executions')
        .select('*')
        .order('started_at', { ascending: false });
      return data;
    },
  });
  
  // Starta ny processinstans
  const startProcess = async (bpmnFile: string) => {
    const { data } = await supabase.functions.invoke('start-process', {
      body: { processDefinitionKey: bpmnFile, variables: {} },
    });
    // Refresh list
  };
  
  return (
    <div>
      <h1>Process Execution</h1>
      <Button onClick={() => startProcess('mortgage-se-application')}>
        Start Application Process
      </Button>
      {/* Lista över processinstanser */}
      {/* Process instance details */}
    </div>
  );
}
```

#### 5.3.2 Task List

**`src/pages/TaskList.tsx`:**
```typescript
export function TaskList() {
  const { user } = useAuth();
  const { data: tasks } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('get-tasks', {
        body: { userId: user?.id },
      });
      return data.tasks;
    },
  });
  
  const completeTask = async (taskId: string, variables: Record<string, any>) => {
    await supabase.functions.invoke('complete-task', {
      body: { taskId, variables },
    });
    // Refresh
  };
  
  return (
    <div>
      <h1>My Tasks</h1>
      {tasks?.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={(vars) => completeTask(task.id, vars)}
        />
      ))}
    </div>
  );
}
```

#### 5.3.3 Process Instance Monitor

**`src/pages/ProcessInstanceMonitor.tsx`:**
```typescript
export function ProcessInstanceMonitor({ instanceId }: { instanceId: string }) {
  const { data: instance } = useQuery({
    queryKey: ['process-instance', instanceId],
    queryFn: async () => {
      // Hämta från Supabase + Camunda
      const { data } = await supabase
        .from('process_executions')
        .select('*')
        .eq('camunda_process_instance_id', instanceId)
        .single();
      
      // Hämta aktiviteter från Camunda
      const activities = await fetch(
        `${CAMUNDA_REST_URL}/history/activity-instance?processInstanceId=${instanceId}`
      ).then(r => r.json());
      
      return { ...data, activities };
    },
  });
  
  // Visualisera processstatus med bpmn-js
  return (
    <div>
      <BpmnViewer
        bpmnXml={instance?.xml_content}
        highlightActivities={instance?.activities}
      />
      <ExecutionHistory instanceId={instanceId} />
    </div>
  );
}
```

---

### 5.4 Phase 4: Service Task Integration

#### 5.4.1 External Task Pattern

**Camunda External Tasks:**
- ServiceTasks kan implementeras som External Tasks
- Camunda väntar på att extern worker kompletterar tasken
- Worker kan vara Supabase Edge Function

**Implementation:**
```typescript
// supabase/functions/camunda-worker/index.ts
serve(async (req) => {
  // 1. Fetch and lock external tasks från Camunda
  const response = await fetch(
    `${CAMUNDA_REST_URL}/external-task/fetchAndLock`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: 'supabase-worker',
        maxTasks: 10,
        topics: [
          { topicName: 'fetch-party-information', lockDuration: 60000 },
          { topicName: 'calculate-affordability', lockDuration: 60000 },
        ],
      }),
    }
  );
  
  const tasks = await response.json();
  
  // 2. Processera varje task
  for (const task of tasks) {
    try {
      // Kör business logic
      const result = await executeServiceTask(task);
      
      // 3. Komplettera task i Camunda
      await fetch(
        `${CAMUNDA_REST_URL}/external-task/${task.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: 'supabase-worker',
            variables: result,
          }),
        }
      );
    } catch (error) {
      // Hantera fel
      await fetch(
        `${CAMUNDA_REST_URL}/external-task/${task.id}/failure`,
        {
          method: 'POST',
          body: JSON.stringify({
            workerId: 'supabase-worker',
            errorMessage: error.message,
          }),
        }
      );
    }
  }
  
  return new Response(JSON.stringify({ processed: tasks.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function executeServiceTask(task: any) {
  switch (task.topicName) {
    case 'fetch-party-information':
      // Anropa Stacc API eller bankens API
      return await fetchPartyInfo(task.variables);
    case 'calculate-affordability':
      // Beräkna affordability
      return await calculateAffordability(task.variables);
    default:
      throw new Error(`Unknown topic: ${task.topicName}`);
  }
}
```

---

### 5.5 Phase 5: Business Rule Tasks (DMN)

#### 5.5.1 DMN Decision Tables

**Camunda DMN Engine:**
- Kan exekvera DMN Decision Tables
- Integreras med BusinessRuleTasks i BPMN

**Implementation:**
```typescript
// Deploy DMN till Camunda
const formData = new FormData();
formData.append('deployment-name', 'credit-evaluation-dmn');
formData.append('dmn-file', new Blob([dmnXml], { type: 'application/xml' }));

await fetch(`${CAMUNDA_REST_URL}/deployment/create`, {
  method: 'POST',
  body: formData,
});

// Exekvera DMN decision
const response = await fetch(
  `${CAMUNDA_REST_URL}/decision-definition/key/credit-evaluation/evaluate`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variables: {
        creditScore: { value: 750, type: 'Integer' },
        income: { value: 50000, type: 'Integer' },
      },
    }),
  }
);

const result = await response.json();
// Använd result.variables för att fortsätta processen
```

---

## 6. Migration Strategy

### 6.1 Stegvis Migration

**Steg 1: Parallel Deployment**
- Behåll nuvarande funktionalitet (visualisering, dokumentation)
- Lägg till execution-funktionalitet bredvid
- Användare kan välja: "View" eller "Execute"

**Steg 2: Process Deployment**
- När BPMN-fil laddas upp, deploya automatiskt till Camunda
- Synka process definitions mellan Supabase och Camunda

**Steg 3: Execution UI**
- Lägg till "Execute Process"-knapp i Process Explorer
- Lägg till Task List i huvudmenyn
- Lägg till Process Instance Monitor

**Steg 4: Integration**
- Koppla ServiceTasks till befintliga integrationskällor (Stacc, bankens API)
- Använd befintlig `staccIntegrationMapping.ts` för att mappa tasks

---

## 7. Tekniska Utmaningar & Lösningar

### 7.1 Multi-fil Processer

**Problem:** Processer är uppdelade över många BPMN-filer med CallActivities.

**Lösning:**
- Deploya alla relaterade BPMN-filer till Camunda
- Camunda hanterar CallActivities automatiskt
- Använd `bpmn-map.json` för att mappa CallActivities till rätt processdefinitioner

### 7.2 Process Variables

**Problem:** Hur hanterar vi processvariabler mellan Supabase och Camunda?

**Lösning:**
- Spara variabler i både Camunda (runtime) och Supabase (audit)
- Synka vid viktiga events (process start, task completion)
- Använd Supabase för historik, Camunda för runtime

### 7.3 User Task Forms

**Problem:** UserTasks behöver formulär för användarinput.

**Lösning:**
- Generera formulär från BPMN-formData eller egen metadata
- Använd React Hook Form för formulärhantering
- Spara formulärdata som processvariabler

### 7.4 Error Handling

**Problem:** Vad händer om ServiceTask failar?

**Lösning:**
- Använd Boundary Events i BPMN för error handling
- Implementera retry-logik i External Task Workers
- Logga fel i Supabase `execution_history`

---

## 8. Kostnader & Resurser

### 8.1 Infrastructure

- **Camunda Platform**: Open source (gratis) eller Enterprise (licens)
- **Server**: Ytterligare server att hantera (eller cloud deployment)
- **Database**: Ytterligare PostgreSQL-databas för Camunda

### 8.2 Development

- **Tid**: 2-3 månader för full implementation
- **Kompetens**: Java/Camunda-kunskap behövs
- **Testing**: Omfattande testning av process execution

---

## 9. Alternativ: Egen Execution Engine

Om Camunda känns för tungt, kan man bygga en egen execution engine:

### 9.1 Fördelar

- ✅ Full kontroll
- ✅ Perfekt integration med Supabase
- ✅ Kan använda befintlig `BpmnParser`
- ✅ Enklare deployment

### 9.2 Implementation

**State Machine:**
```typescript
interface ProcessInstance {
  id: string;
  processDefinitionKey: string;
  currentActivities: string[];
  variables: Record<string, any>;
  status: 'RUNNING' | 'COMPLETED' | 'SUSPENDED';
}

async function executeProcess(instance: ProcessInstance) {
  // 1. Hämta processdefinition
  const definition = await getProcessDefinition(instance.processDefinitionKey);
  
  // 2. Hitta nästa aktiviteter baserat på sequence flows
  const nextActivities = findNextActivities(
    definition,
    instance.currentActivities
  );
  
  // 3. Exekvera aktiviteter
  for (const activity of nextActivities) {
    if (activity.type === 'UserTask') {
      // Skapa task, vänta på användarinput
      await createUserTask(activity, instance);
    } else if (activity.type === 'ServiceTask') {
      // Exekvera service task
      await executeServiceTask(activity, instance);
    } else if (activity.type === 'CallActivity') {
      // Starta subprocess
      await startSubProcess(activity, instance);
    }
  }
  
  // 4. Uppdatera state
  instance.currentActivities = nextActivities.map(a => a.id);
  await saveProcessInstance(instance);
}
```

**Komplexitet:**
- Måste implementera gateways (exclusive, parallel, inclusive)
- Måste hantera events (start, end, boundary)
- Måste hantera subprocesser
- Måste hantera variabler och expressions

---

## 10. Rekommendation

### 10.1 För MVP: Egen Execution Engine

**Varför:**
- Snabbare att komma igång
- Bättre integration med Supabase
- Mindre infrastruktur
- Kan börja enkelt och bygga ut

**När:**
- Processer är relativt enkla
- Begränsad användning
- Vill ha full kontroll

### 10.2 För Production: Camunda Platform

**Varför:**
- Robust och testad
- Stödjer komplexa processer
- Bra för enterprise
- Har web UI out-of-the-box

**När:**
- Processer är komplexa
- Behöver skalbarhet
- Behöver enterprise-features
- Har resurser för att hantera infrastructure

---

## 11. Nästa Steg

1. **Proof of Concept**: Bygg en enkel execution engine för en process
2. **Utvärdera**: Testa med riktiga processer
3. **Beslut**: Egen engine eller Camunda?
4. **Implementation**: Följ vald approach
5. **Integration**: Koppla till befintlig app

---

## 12. Referenser

- [Camunda Platform Documentation](https://docs.camunda.org/manual/latest/)
- [Camunda REST API](https://docs.camunda.org/manual/latest/reference/rest/)
- [Camunda External Tasks](https://docs.camunda.org/manual/latest/user-guide/process-engine/external-tasks/)
- [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/2.0/)

---

**Senast uppdaterad:** 2025-01-XX

