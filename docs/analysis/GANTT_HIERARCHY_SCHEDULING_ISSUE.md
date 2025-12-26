# Problem: Hierarkisk Schemaläggning i Gantt

## Problem Identifierat

Användaren ser att dessa noder inte startar samtidigt:
1. mortgage (root)
2. Application (Feature goal)
3. Application - Internal data gathering (Feature goal)
4. Application - Internal data gathering - Fetch party information (Epic)

**Förväntat beteende:**
- I en hierarkisk Gantt-chart bör parent och children starta samtidigt
- Parent börjar när första child börjar
- Children kan vara parallella eller sekventiella (beroende på BPMN-struktur)
- Men parent och children är INTE sekventiella - de är tillsammans

## Nuvarande Problem

**Nuvarande algoritm:**
1. Samlar alla leaf nodes sekventiellt (över hela trädet)
2. Schemalägger alla leaf nodes sekventiellt (en efter en)
3. Propagera datum uppåt (parent startDate = min av children)

**Problem:**
- Alla leaf nodes behandlas som sekventiella, även om de är i olika nivåer
- Parent och children får olika startDates eftersom children schemaläggs sekventiellt först

**Exempel:**
```
Leaf nodes samlas: [Fetch party, Screen party, Fetch engagements, ...]
Schemaläggs: 
  Fetch party: 2026-01-01
  Screen party: 2026-01-15
  Fetch engagements: 2026-01-29
  ...

Sedan propagera uppåt:
  Internal data gathering: startDate = 2026-01-01 (min), endDate = ...
  Application: startDate = 2026-01-01 (min), endDate = ...
  mortgage: startDate = 2026-01-01 (min), endDate = ...
```

Men detta ger fel resultat eftersom parent och children inte börjar samtidigt i visualiseringen.

## Lösning

**Ny algoritm:**
1. Schemalägg hierarkiskt (top-down)
2. Parent startar när första child börjar
3. Children schemaläggs relativt till parent (inte globalt sekventiellt)
4. Endast syskon (siblings) kan vara sekventiella eller parallella

**Ny logik:**
- För varje parent:
  - Schemalägg children först (parallellt eller sekventiellt)
  - Parent startDate = min av children startDates
  - Parent endDate = max av children endDates
- Parent och children startar tillsammans (parent startar när första child börjar)

