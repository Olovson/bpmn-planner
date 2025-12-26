# Fix: Hierarkisk Schemaläggning i Gantt

## Problem

Användaren såg att dessa noder inte startade samtidigt:
1. mortgage (root)
2. Application (Feature goal)
3. Application - Internal data gathering (Feature goal)
4. Application - Internal data gathering - Fetch party information (Epic)

**Förväntat:** I en hierarkisk Gantt bör parent och children starta samtidigt (parent börjar när första child börjar).

## Lösning Implementerad

### Före
- Alla leaf nodes samlades sekventiellt över hela trädet
- Alla leaf nodes schemalades sekventiellt (en efter en)
- Parent fick startDate = min av children, men children hade redan schemalagts sekventiellt

### Efter
- **Hierarkisk schemaläggning (top-down)**
- Parent och children startar tillsammans (parent startar när första child börjar)
- Endast syskon (siblings) kan vara sekventiella eller parallella
- Parent startDate = min av children's startDates (börjar med första child)
- Parent endDate = max av children's endDates (slutar när sista child slutar)

### Ny Algoritm

```typescript
scheduleNode(node, startDate):
  if (isLeafNode):
    // Schedule leaf directly
    return { startDate, endDate: startDate + duration }
  
  // Schedule children first
  if (siblingsAreParallel):
    // All children start at same time
    scheduleChildren(parallelStartDate)
  else:
    // Children scheduled sequentially
    scheduleChildren(sequentialStartDate)
  
  // Parent starts when first child starts
  parent.startDate = min(children.startDates)
  parent.endDate = max(children.endDates)
```

## Resultat

**Före:**
```
mortgage: 2026-01-01
Application: 2026-01-15 (efter första leaf)
Internal data gathering: 2026-01-29 (efter fler leaves)
Fetch party: 2026-01-01 (första leaf)
```

**Efter:**
```
mortgage: 2026-01-01 (börjar när första child börjar)
Application: 2026-01-01 (börjar när första child börjar)
Internal data gathering: 2026-01-01 (börjar när första child börjar)
Fetch party: 2026-01-01 (första leaf)
```

Alla startar nu samtidigt eftersom de är i samma hierarki och parent börjar när första child börjar.

## Debug Logging

Lagt till debug logging för att se:
- När leaf nodes schemaläggs
- När parent nodes schemaläggs
- Start/end dates för varje node
- Children start dates för parent nodes

