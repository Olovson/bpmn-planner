# Analys: Projektkonfiguration Pivot

## Svar på frågorna

### 1. Nuvarande integration checkbox-logik

**Var lagras avcheckade integrationer?**
- Tabell: `integration_overrides` i Supabase
- Kolumner: `bpmn_file`, `element_id`, `uses_stacc_integration` (boolean)
- Composite primary key: `(bpmn_file, element_id)`

**Hur hämtar vi listan över avcheckade integrationer?**
- Via `IntegrationContext` → `getAllIntegrationStates()`
- Returnerar: `Record<string, boolean>` där key = `${bpmnFile}:${elementId}`
- `true` = använder Stacc (default)
- `false` = ersätts med Bankens integration

**Vilken identifierare används?**
- Composite key: `bpmn_file` + `element_id`
- I kod: `${bpmnFile}:${elementId}` som string key

---

### 2. Timeline-generering

**Var sker timeline-beräkningen?**
- `src/lib/ganttDataConverter.ts` → `buildGanttTasksWithHierarchicalScheduling()`
- Använder `src/lib/timelineScheduling.ts`:
  - `computeLeafCountsAndDurations()` - beräknar leafCount och durationDays
  - `scheduleTree()` - schemalägger alla noder sekventiellt

**Hur läggs nya tasks in i timeline?**
- Tasks läggs till i `addScheduledNodes()` funktionen rekursivt
- Sekventiell ordning: varje leaf node startar när föregående slutar
- Hårdkodad: 14 dagar (2 veckor) per leaf node

**Finns det en funktion för att "inject" tasks före BPMN-aktiviteter?**
- ❌ Nej, det finns ingen sådan funktion ännu
- Vi behöver skapa en ny funktion som kan injicera tasks före/efter BPMN-aktiviteter

---

### 3. UI-placering

**Ska konfigurationssidan vara på `/configuration` eller `/settings`?**
- ✅ Behåll `/configuration` (redan implementerat)
- Konsistent med nuvarande routing

**Ska det finnas en länk från timeline-sidan till konfiguration?**
- ✅ Ja, redan implementerat (Settings-knapp i timeline-sidan)

---

### 4. Default templates

**Ska "Implementeringsprojekt" och "Plattformsprojekt" vara pre-skapade första gången?**
- ✅ Nej, användaren ska aktivt välja från mall-lista
- Ger användaren kontroll och gör det tydligt att de är valfria

---

## Ny arkitektur - Föreslag

### Datastruktur

```typescript
interface GlobalProjectConfig {
  // 1. Generell task-duration
  defaultTaskWeeks: number; // Default: 2

  // 2. Bank-implementerade integrationer
  bankIntegrationWorkItems: {
    analysisWeeks: number;      // Default: 2
    implementationWeeks: number; // Default: 4
    testingWeeks: number;       // Default: 2
    validationWeeks: number;    // Default: 1
  };

  // 3. Custom projektaktiviteter
  customActivities: CustomActivity[];
}

interface CustomActivity {
  id: string;
  name: string;
  weeks: number;
  placement: 'before-all' | 'after-all';
  order: number; // För sortering av aktiviteter i samma placement
}
```

### Timeline-generering - Ny ordning

1. **Custom activities med placement: 'before-all'** (sorterade efter order)
2. **Bank-integrationer** (för varje avcheckad integration på integrationssidan):
   - Analys (X veckor)
   - Implementering (Y veckor)
   - Testing (Z veckor)
   - Validering (W veckor)
   - Sedan själva integrationen (med defaultTaskWeeks)
3. **Standard BPMN-aktiviteter** (med defaultTaskWeeks som duration)
4. **Custom activities med placement: 'after-all'** (sorterade efter order)

### Implementation-steg

1. ✅ Skapa ny `GlobalProjectConfig` typ
2. ✅ Skapa ny `GlobalProjectConfigContext` (eller utöka befintlig)
3. ✅ Skapa ny enkel konfigurationssida med 3 sektioner
4. ✅ Modifiera `ganttDataConverter.ts` för att:
   - Läsa `defaultTaskWeeks` istället för hårdkodad 14 dagar
   - Injicera custom activities före/efter BPMN-aktiviteter
   - Injicera bank-integration work items före avcheckade integrationer
5. ✅ Koppla till `IntegrationContext` för att hämta avcheckade integrationer

---

## Nästa steg

1. **Ta bort** nuvarande komplexa `ProjectConfigurationPage`
2. **Skapa** ny enkel konfigurationssida med 3 sektioner
3. **Implementera** ny timeline-generering med injektion av tasks

