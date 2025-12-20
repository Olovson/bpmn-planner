# Analys: Förenkling av Epic-mall för Service Tasks och User Tasks

## Nuvarande EpicDocModel (11 fält)

```typescript
{
  summary: string;                    // ✅ BEHÖVS - Vad gör epiken?
  prerequisites: string[];            // ✅ BEHÖVS - Vad måste vara klart innan?
  inputs: string[];                   // ✅ BEHÖVS - Vad kommer in?
  flowSteps: string[];                // ✅ BEHÖVS - Hur går det till?
  interactions: string[];              // ⚠️  VIKTIGT för User Tasks, mindre för Service Tasks
  dataContracts: string[];            // ❌ KAN SLÅS IHOP - Redundans med inputs/outputs
  businessRulesPolicy: string[];      // ⚠️  KAN FÖRENKLAS - Ofta generiskt
  scenarios: EpicScenario[];          // ✅ BEHÖVS - För testning
  testDescription: string;            // ✅ BEHÖVS - Hur testar man?
  implementationNotes: string[];      // ✅ BEHÖVS - Tekniska detaljer
  relatedItems: string[];             // ❌ KAN TAS BORT - Mindre värde för implementation
}
```

## Vad behövs faktiskt för att bygga en Task?

### Kritiskt (måste ha):
1. **Vad ska den göra?** → `summary` + `flowSteps`
2. **Vad behöver den för att starta?** → `prerequisites` + `inputs`
3. **Vad producerar den?** → **SAKNAS!** (outputs)
4. **Hur interagerar den?** → `interactions` (kritisk för User Tasks)
5. **Hur testar man den?** → `scenarios` + `testDescription`
6. **Tekniska detaljer?** → `implementationNotes`

### Viktigt men kan förenklas:
- **Vilka regler gäller?** → `businessRulesPolicy` (ofta generiskt, kan förenklas)
- **Data-kontrakt?** → `dataContracts` (redundant med inputs/outputs)

### Mindre värde:
- **Relaterade items?** → `relatedItems` (bra för kontext, men inte nödvändigt för implementation)

## Föreslagen förenklad version

### Minimal version (6 fält):
```typescript
{
  summary: string;                    // Vad gör epiken? (2-3 meningar)
  prerequisites: string[];            // Vad måste vara klart innan? (2-3 punkter)
  inputs: string[];                   // Vad kommer in? (3-5 punkter)
  outputs: string[];                  // NYTT! Vad producerar den? (2-4 punkter)
  flowSteps: string[];                // Hur går det till? (4-6 steg)
  scenarios: EpicScenario[];          // Testscenarier (3-5 scenarier)
  implementationNotes: string[];     // Tekniska detaljer (3-5 punkter)
}
```

### Alternativ: Medvalbar version (8 fält):
```typescript
{
  summary: string;                    // Vad gör epiken?
  prerequisites: string[];            // Vad måste vara klart innan?
  inputs: string[];                   // Vad kommer in?
  outputs: string[];                  // NYTT! Vad producerar den?
  flowSteps: string[];                // Hur går det till?
  interactions?: string[];            // OPCIONAL - Endast för User Tasks
  scenarios: EpicScenario[];          // Testscenarier
  implementationNotes: string[];      // Tekniska detaljer
}
```

## Detaljerad analys per fält

### ✅ BEHÅLL (Kritiskt)

#### 1. `summary` (string)
**Varför:** Kortfattad beskrivning av vad epiken gör - första intrycket.
**Förenkling:** Behåll som är, men begränsa till 2-3 meningar istället för 2-4.

#### 2. `prerequisites` (string[])
**Varför:** Viktigt för att förstå när epiken kan starta.
**Förenkling:** Behåll, men begränsa till 2-3 punkter istället för 2-5.

#### 3. `inputs` (string[])
**Varför:** Kritiskt för implementation - vad behöver epiken?
**Förenkling:** Behåll formatet, men begränsa till 3-5 punkter istället för 3-6.

#### 4. `flowSteps` (string[])
**Varför:** Kärnan i epiken - hur fungerar den?
**Förenkling:** Behåll, men begränsa till 4-6 steg istället för 4-8.

#### 5. `scenarios` (EpicScenario[])
**Varför:** Kritiskt för testning - vilka scenarier måste fungera?
**Förenkling:** Behåll, men begränsa till 3-5 scenarier istället för 3-6.

#### 6. `implementationNotes` (string[])
**Varför:** Tekniska detaljer som utvecklare behöver.
**Förenkling:** Behåll, men begränsa till 3-5 punkter istället för 3-6.

### ⚠️  FÖRENKLA ELLER GÖR OPCIONAL

#### 7. `interactions` (string[])
**Varför:** Viktigt för User Tasks (UI/UX), mindre viktigt för Service Tasks.
**Förenkling:** 
- Gör **opcional** (`interactions?: string[]`)
- Eller slå ihop med `flowSteps` för User Tasks
- För Service Tasks: kan tas bort helt eller förenklas till API-endpoints

#### 8. `businessRulesPolicy` (string[])
**Varför:** Kopplar till affärsregler, men ofta generiskt.
**Förenkling:**
- **Alternativ 1:** Ta bort helt (regler dokumenteras i Business Rule-dokumentation)
- **Alternativ 2:** Förenkla till 1-2 punkter om kritiska regler
- **Alternativ 3:** Flytta till `implementationNotes` som en punkt

### ❌ TA BORT ELLER SLÅ IHOP

#### 9. `dataContracts` (string[])
**Varför:** Beskriver data in/ut, men redundant med `inputs`/`outputs`.
**Förenkling:**
- **Ta bort helt** - informationen finns redan i `inputs` och `outputs`
- Eller slå ihop med `inputs`/`outputs` om mer detalj behövs

#### 10. `testDescription` (string)
**Varför:** Förklarar hur scenarier mappas till tester.
**Förenkling:**
- **Ta bort** - scenarierna är självförklarande
- Eller flytta till `implementationNotes` som en punkt

#### 11. `relatedItems` (string[])
**Varför:** Kontext, men inte nödvändigt för implementation.
**Förenkling:**
- **Ta bort helt** - informationen finns i BPMN-grafen och process tree
- Eller behåll endast om det ger värde (t.ex. kritiska beroenden)

## NYTT FÄLT: `outputs`

**Varför saknas det?** Nuvarande modell beskriver vad som kommer in, men inte vad som produceras.

**Föreslag:**
```typescript
outputs: string[];  // Vad producerar epiken? (2-4 punkter)
```

**Format (liknande inputs):**
```
Outputtyp: ...; Typ: ...; Konsument: ...; Beskrivning: ...
```

**Exempel:**
- `Outputtyp: Status; Typ: String; Konsument: Nästa steg i processen; Beskrivning: "approved", "rejected", eller "requires_manual_review"`
- `Outputtyp: Berikad data; Typ: JSON; Konsument: Kreditbedömning; Beskrivning: Kunddata med kompletterande information från externa källor`

## Rekommendation: Minimal version (6 fält)

### Förmåner:
1. **Enklare för LLM** - Färre fält = mindre risk för fel
2. **Snabbare generering** - Mindre innehåll att generera
3. **Fokus på det viktiga** - Bara det som behövs för implementation
4. **Lättare att underhålla** - Färre fält att validera och uppdatera

### Nackdelar:
1. **Mindre kontext** - Vissa detaljer kan saknas
2. **Färre länkar** - `relatedItems` kan vara användbart

### Kompromiss:
- **Minimal version** för standard-generering
- **Utökad version** kan användas via node-doc overrides om mer detalj behövs

## Implementation-förslag

### Steg 1: Lägg till `outputs`-fält
```typescript
export interface EpicDocModel {
  summary: string;
  prerequisites: string[];
  inputs: string[];
  outputs: string[];  // NYTT
  flowSteps: string[];
  scenarios: EpicScenario[];
  implementationNotes: string[];
}
```

### Steg 2: Gör `interactions` opcional
```typescript
interactions?: string[];  // Endast för User Tasks
```

### Steg 3: Ta bort följande fält:
- `dataContracts` (redundant med inputs/outputs)
- `businessRulesPolicy` (flytta till implementationNotes om nödvändigt)
- `testDescription` (scenarierna är självförklarande)
- `relatedItems` (information finns i BPMN-grafen)

### Steg 4: Uppdatera prompt
- Förenkla instruktioner för kvarvarande fält
- Lägg till instruktioner för `outputs`
- Ta bort instruktioner för borttagna fält

## Exempel: Före vs Efter

### Före (11 fält):
```json
{
  "summary": "...",
  "prerequisites": ["...", "..."],
  "inputs": ["...", "...", "..."],
  "flowSteps": ["...", "...", "...", "..."],
  "interactions": ["...", "..."],
  "dataContracts": ["...", "..."],
  "businessRulesPolicy": ["...", "...", "..."],
  "scenarios": [...],
  "testDescription": "...",
  "implementationNotes": ["...", "...", "..."],
  "relatedItems": ["...", "..."]
}
```

### Efter (6 fält):
```json
{
  "summary": "...",
  "prerequisites": ["...", "..."],
  "inputs": ["...", "...", "..."],
  "outputs": ["...", "..."],
  "flowSteps": ["...", "...", "...", "..."],
  "scenarios": [...],
  "implementationNotes": ["...", "...", "..."]
}
```

**Resultat:** 45% färre fält, fokus på det viktiga, lättare att generera och underhålla.

