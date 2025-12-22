# Analys av dokumentation i Supabase Storage

**Datum:** 2025-12-22  
**Status:** ⚠️ Flera problem identifierade

## Sammanfattning

Analys av vad som faktiskt finns i Supabase Storage visar flera problem:

### Totalt i Storage

- **Feature Goals:** 178 (115 versioned + 63 non-versioned)
- **Epics:** 150 (alla versioned)
- **Business Rules:** 0
- **Andra:** 2

### Förväntat

- **Feature Goals:** 54 (20 subprocess process nodes + 34 call activities)
- **Epics:** 72 (alla tasks)
- **Business Rules:** Varierar (BusinessRuleTask)

### Skillnader

- **Feature Goals:** +124 extra (178 vs 54)
- **Epics:** +78 extra (150 vs 72)

## Identifierade problem

### 1. För många Feature Goals (178 vs 54)

**Problem:** Det finns 124 fler Feature Goals än förväntat.

**Möjliga orsaker:**
- Dubletter från olika genereringar
- Tasks som genererats som Feature Goals (fel!)
- Process nodes som genererats som Feature Goals (fel!)
- Gamla filer från tidigare migreringar

### 2. För många Epics (150 vs 72)

**Problem:** Det finns 78 fler Epics än förväntat.

**Möjliga orsaker:**
- Dubletter från olika genereringar
- Call activities som genererats som Epics (fel!)
- Gamla filer från tidigare genereringar

### 3. Felaktiga Feature Goal-namn (54 filer)

**Problem:** 54 Feature Goals har felaktiga namn:
- `activity_17f0nvn.html` - Detta ser ut som en **task**, inte en Feature Goal!
- `se-application.bpmn-activity_0p3rqyp.html` - Detta ser också ut som en **task**
- `se-application.bpmn-mortgage-se-application.html` - Detta ser ut som en **process node**
- Format: `se-{file}.bpmn-{elementId}.html` (felaktig namngivning)

**Förväntat format:**
- Call activities: `mortgage-se-application-internal-data-gathering.html` (hierarchical naming)
- Process nodes: `mortgage-se-application.html`

**Faktiskt format (felaktigt):**
- `se-application.bpmn-internal-data-gathering.html`
- `se-application.bpmn-mortgage-se-application.html`

### 4. Non-versioned filer (63 Feature Goals)

**Problem:** 63 Feature Goals är non-versioned (gamla sökvägar).

**Förväntat format:**
- `docs/claude/{bpmnFile}/{versionHash}/feature-goals/...`

**Faktiskt format (non-versioned):**
- `docs/claude/feature-goals/...`

### 5. Versioned filer verkar korrekta

**Positivt:** Versioned filer verkar ha korrekt struktur:
- `docs/claude/{bpmnFile}/{versionHash}/feature-goals/...`
- `docs/claude/{bpmnFile}/{versionHash}/nodes/...`

## Exempel på problematiska filer

### Feature Goals med felaktiga namn:
- `activity_17f0nvn.html` - Task som genererats som Feature Goal
- `se-application.bpmn-activity_0p3rqyp.html` - Task som genererats som Feature Goal
- `se-application.bpmn-mortgage-se-application.html` - Process node som genererats som Feature Goal
- `se-application.bpmn-fetch-credit-information.html` - Task som genererats som Feature Goal

### Non-versioned Feature Goals:
- Alla 63 filer i `docs/claude/feature-goals/...` (utan version hash)

## Rekommendationer

### 1. Rensa gamla/non-versioned filer
- Ta bort alla 63 non-versioned Feature Goals
- De är från gammal migrering och använder felaktiga namn

### 2. Identifiera och ta bort dubletter
- Jämför versioned filer med förväntat antal
- Ta bort dubletter från olika genereringar

### 3. Verifiera namngivning
- Säkerställ att hierarchical naming används korrekt
- Kontrollera att tasks genereras som Epics, inte Feature Goals
- Kontrollera att process nodes genereras korrekt

### 4. Regenerera allt
- Kör en fullständig regenerering med korrekt namngivning
- Verifiera att antal matchar förväntat (54 Feature Goals, 72 Epics)

## Nästa steg

1. **Analysera versioned filer närmare:**
   - Kontrollera om de har korrekt namngivning
   - Identifiera dubletter
   - Verifiera att de matchar förväntat antal

2. **Rensa non-versioned filer:**
   - Ta bort alla 63 non-versioned Feature Goals
   - De är från gammal migrering och använder felaktiga namn

3. **Verifiera genereringslogiken:**
   - Säkerställ att tasks genereras som Epics, inte Feature Goals
   - Säkerställ att hierarchical naming används korrekt
