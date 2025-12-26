# Sammanfattning: Gantt Schema Förbättringar

## Problem Identifierat

Gantt-schemat beräknades felaktigt eftersom alla leaf nodes schemalades sekventiellt, oavsett om de faktiskt var parallella eller sekventiella flöden.

## Förbättringar Implementerade

### 1. Identifiering av Parallella Flöden

**Ny funktion: `areSiblingsParallel`**
- Identifierar när syskon-noder ska schemaläggas parallellt
- Regler:
  - Om syskon har samma `branchId` och liknande `visualOrderIndex` (skillnad ≤ 5) → parallella
  - Om syskon har olika `branchId` eller stor skillnad i `visualOrderIndex` → sekventiella

### 2. Förbättrad Schemaläggning

**Uppdaterad `scheduleTree` funktion:**
- Schemalägger syskon parallellt när de identifieras som parallella
- Behåller sekventiell schemaläggning för sekventiella flöden
- Använder hierarkisk schemaläggning (parent-first approach)

**Förbättringar:**
- Parallella syskon får samma `startDate`
- Parallella syskon slutar när den längsta är klar
- Sekventiella syskon schemaläggs en efter en

### 3. Förbättrad Duration Beräkning

**Uppdaterad `computeLeafCountsAndDurations` funktion:**
- Parallella children: parent duration = **max** av children's durations
- Sekventiella children: parent duration = **sum** av children's durations

**Exempel:**
```
Parallella children (3 × 14 dagar):
- Parent duration = max(14, 14, 14) = 14 dagar ✓

Sekventiella children (3 × 14 dagar):
- Parent duration = sum(14, 14, 14) = 42 dagar ✓
```

## Resultat

### Före Förbättringar
```
Parent (callActivity)
  ├─ Child1 (14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (14 dagar) → 2026-01-15 till 2026-01-29
  └─ Child3 (14 dagar) → 2026-01-29 till 2026-02-12

Parent duration = 42 dagar (alltid sum)
```

### Efter Förbättringar
```
Parallella children:
Parent (callActivity)
  ├─ Child1 (14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (14 dagar) → 2026-01-01 till 2026-01-15 (parallellt)
  └─ Child3 (14 dagar) → 2026-01-01 till 2026-01-15 (parallellt)

Parent duration = 14 dagar (max) ✓

Sekventiella children:
Parent (callActivity)
  ├─ Child1 (14 dagar) → 2026-01-01 till 2026-01-15
  ├─ Child2 (14 dagar) → 2026-01-15 till 2026-01-29
  └─ Child3 (14 dagar) → 2026-01-29 till 2026-02-12

Parent duration = 42 dagar (sum) ✓
```

## Debug Logging

Förbättrad debug logging:
- Loggar när parallella syskon identifieras
- Loggar när max duration används istället för sum
- Loggar schemaläggning av parallella vs sekventiella flöden

## Nästa Steg

1. **Testa med riktiga BPMN-filer** för att verifiera att schemat är korrekt
2. **Finjustera parallellitets-identifiering** baserat på feedback
3. **Överväg att använda BPMN-struktur** (gateways) för mer exakt identifiering av parallella flöden

## Filer Ändrade

- `src/lib/timelineScheduling.ts`:
  - Lagt till `areSiblingsParallel` funktion
  - Uppdaterat `scheduleTree` för att hantera parallella flöden
  - Uppdaterat `computeLeafCountsAndDurations` för att använda max för parallella children

