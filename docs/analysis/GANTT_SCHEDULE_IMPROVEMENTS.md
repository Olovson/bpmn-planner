# Förbättringar: Gantt Schema Beräkning

## Problem Identifierat

### Huvudproblem: Sekventiell Schemaläggning av Alla Leaf Nodes

**Nuvarande beteende:**
- Alla leaf nodes i hela trädet schemaläggs sekventiellt, oavsett om de är syskon eller i olika branches
- Detta ger felaktiga tidslinjer när flöden faktiskt är parallella

**Exempel:**
```
Parent (callActivity)
  ├─ Child1 (leaf, 14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (leaf, 14 dagar) → 2026-01-15 till 2026-01-29
  └─ Child3 (leaf, 14 dagar) → 2026-01-29 till 2026-02-12

Parent duration = 42 dagar (sum)
```

**Om dessa är parallella borde det vara:**
```
Parent (callActivity)
  ├─ Child1 (leaf, 14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (leaf, 14 dagar) → 2026-01-01 till 2026-01-15 (parallellt)
  └─ Child3 (leaf, 14 dagar) → 2026-01-01 till 2026-01-15 (parallellt)

Parent duration = 14 dagar (max)
```

## Lösningsstrategi

### Steg 1: Identifiera Parallella vs Sekventiella Flöden

**Indikatorer för parallella flöden:**
1. **Samma branchId**: Noder med samma branchId kan vara parallella
2. **Samma parent**: Syskon-noder kan vara parallella
3. **Visual order**: Om syskon har liknande visualOrderIndex kan de vara parallella

**Indikatorer för sekventiella flöden:**
1. **Olika branchId**: Noder med olika branchId är ofta sekventiella
2. **Stor skillnad i visualOrderIndex**: Stora skillnader indikerar sekventiellt flöde
3. **Hierarkisk struktur**: Noder i olika nivåer är ofta sekventiella

### Steg 2: Förbättrad Schemaläggning

**Ny algoritm:**
1. **Schemalägg syskon parallellt** om de har samma branchId och liknande visualOrderIndex
2. **Schemalägg sekventiellt** om syskon har olika branchId eller stora skillnader i visualOrderIndex
3. **Parent duration**: 
   - Om syskon är parallella: max av children's durations
   - Om syskon är sekventiella: sum av children's durations

### Steg 3: Implementation

**Ny funktion: `scheduleTreeWithParallelSupport`**
- Identifierar parallella syskon
- Schemalägger parallella syskon parallellt
- Behåller sekventiell schemaläggning för sekventiella flöden

## Testfall

### Testfall 1: Parallella Syskon
```
Parent
  ├─ Child1 (14 dagar, branchId: "main", visualOrderIndex: 10)
  ├─ Child2 (14 dagar, branchId: "main", visualOrderIndex: 11)
  └─ Child3 (14 dagar, branchId: "main", visualOrderIndex: 12)

Förväntat:
- Alla children börjar samtidigt: 2026-01-01
- Alla children slutar samtidigt: 2026-01-15
- Parent duration: 14 dagar (max)
```

### Testfall 2: Sekventiella Syskon
```
Parent
  ├─ Child1 (14 dagar, branchId: "main", visualOrderIndex: 10)
  ├─ Child2 (14 dagar, branchId: "branch-1", visualOrderIndex: 50)
  └─ Child3 (14 dagar, branchId: "branch-2", visualOrderIndex: 100)

Förväntat:
- Child1: 2026-01-01 till 2026-01-15
- Child2: 2026-01-15 till 2026-01-29
- Child3: 2026-01-29 till 2026-02-12
- Parent duration: 42 dagar (sum)
```

### Testfall 3: Mix av Parallella och Sekventiella
```
Parent
  ├─ Group1 (parallellt)
  │   ├─ Child1 (14 dagar, branchId: "main", visualOrderIndex: 10)
  │   └─ Child2 (14 dagar, branchId: "main", visualOrderIndex: 11)
  └─ Group2 (efter Group1)
      └─ Child3 (14 dagar, branchId: "branch-1", visualOrderIndex: 50)

Förväntat:
- Child1: 2026-01-01 till 2026-01-15
- Child2: 2026-01-01 till 2026-01-15 (parallellt med Child1)
- Child3: 2026-01-15 till 2026-01-29 (efter Group1)
- Parent duration: 28 dagar (14 + 14)
```

