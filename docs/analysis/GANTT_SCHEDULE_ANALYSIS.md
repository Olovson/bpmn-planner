# Analys: Gantt Schema Beräkning

## Nuvarande Algoritm

### 1. computeLeafCountsAndDurations
- **Leaf nodes**: leafCount = 1, durationDays = från durationCalculator (default 14 dagar)
- **Non-leaf nodes**: leafCount = sum av barnens leafCount, durationDays = sum av barnens durationDays

### 2. scheduleTree
- Samlar alla leaf nodes i ordning (baserat på visualOrderIndex/orderIndex)
- Schemalägger leaf nodes **sekventiellt** (varje börjar när föregående slutar)
- Propagera datum uppåt: parent startDate = min av barnens startDates, endDate = max av barnens endDates

### 3. buildGanttTasksWithHierarchicalScheduling
- Bygger Gantt tasks från scheduled tree
- Hanterar custom activities (before-all, after-all)

## Identifierade Problem

### Problem 1: Sekventiell Schemaläggning av Leaf Nodes
**Nuvarande beteende:**
- Alla leaf nodes schemaläggs sekventiellt, oavsett om de är syskon eller i olika branches
- Om en parent har 3 children, kommer alla 3 att schemaläggas efter varandra

**Exempel:**
```
Parent (callActivity)
  ├─ Child1 (leaf, 14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (leaf, 14 dagar) → 2026-01-15 till 2026-01-29
  └─ Child3 (leaf, 14 dagar) → 2026-01-29 till 2026-02-12
```

**Problem:** Detta är korrekt för sekventiella flöden, men om children kan köras parallellt (t.ex. i olika branches), borde de schemaläggas parallellt istället.

### Problem 2: Parent Duration = Sum av Children
**Nuvarande beteende:**
- Non-leaf nodes får durationDays = sum av barnens durationDays
- Men parent's startDate/endDate är min/max av barnens datum

**Exempel:**
```
Parent (callActivity)
  ├─ Child1 (14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (14 dagar) → 2026-01-15 till 2026-01-29
  └─ Child3 (14 dagar) → 2026-01-29 till 2026-02-12

Parent durationDays = 14 + 14 + 14 = 42 dagar
Parent startDate = 2026-01-01 (min)
Parent endDate = 2026-02-12 (max)
Parent faktisk duration = 42 dagar (korrekt!)
```

**Problem:** Om children kan köras parallellt, borde parent's duration vara max av children's durations, inte sum.

### Problem 3: Ingen Hantering av Parallella Flöden
**Nuvarande beteende:**
- Alla leaf nodes behandlas som sekventiella
- Ingen analys av BPMN-strukturen för att avgöra om flöden är parallella eller sekventiella

**Exempel:**
```
Parallel Gateway
  ├─ Branch1: Task1 (14 dagar)
  └─ Branch2: Task2 (14 dagar)

Nuvarande: Task1 → 2026-01-01-15, Task2 → 2026-01-15-29 (sekventiellt)
Borde vara: Task1 → 2026-01-01-15, Task2 → 2026-01-01-15 (parallellt)
```

### Problem 4: Visual Order vs Execution Order
**Nuvarande beteende:**
- Leaf nodes sorteras baserat på visualOrderIndex/orderIndex
- Detta är baserat på DI-koordinater i BPMN-diagrammet, inte faktisk exekveringsordning

**Problem:** Visual order kan vara annorlunda än faktisk exekveringsordning, särskilt med branches och gateways.

## Förslag på Förbättringar

### Förbättring 1: Analysera BPMN-struktur för Parallella Flöden
- Identifiera parallel gateways och branches
- Schemalägg parallella branches parallellt (samma startDate)
- Behåll sekventiell schemaläggning för sekventiella flöden

### Förbättring 2: Förbättrad Parent Duration Beräkning
- Om children är parallella: parent duration = max av children's durations
- Om children är sekventiella: parent duration = sum av children's durations (nuvarande)

### Förbättring 3: Execution Order istället för Visual Order
- Använd BPMN execution order (baserat på flödesordning) istället för visual order
- Visual order kan användas som fallback om execution order saknas

### Förbättring 4: Hantera Dependencies
- Identifiera dependencies mellan tasks (t.ex. via sequence flows)
- Respektera dependencies vid schemaläggning

## Implementeringsstrategi

1. **Fas 1: Identifiera Parallella Flöden**
   - Analysera BPMN-struktur för parallel gateways
   - Markera branches som parallella

2. **Fas 2: Förbättrad Schemaläggning**
   - Schemalägg parallella branches parallellt
   - Behåll sekventiell schemaläggning för sekventiella flöden

3. **Fas 3: Validering**
   - Testa med olika BPMN-strukturer
   - Verifiera att schemat är korrekt

