# Analys: Använda Claude för bpmn-map.json Generering

## Nuvarande Process och Begränsningar

### Nuvarande Approach (Regex + Heuristik)

**Hur det fungerar nu:**
1. Parsar BPMN-filer med regex och BpmnParser
2. Använder `SubprocessMatcher` med heuristik för att matcha call activities:
   - Filnamnsmatchning (exakt, fuzzy)
   - Process ID-matchning
   - CalledElement-matchning
   - Confidence scores (0-1)
3. Automatisk generering via `generateBpmnMapFromFiles()`

**Begränsningar:**
- Regex kan missa strukturella ändringar
- Heuristik kan ge felaktiga matchningar vid tvetydiga namn
- Svårt att hantera komplexa strukturer (subProcesses, nested call activities)
- Kan inte förstå semantisk betydelse
- Svårt att detektera när call activities försvinner eller ändras strukturellt

### Problem vi stött på:
1. Call activities i map som inte längre finns i filer (5 st)
2. Strukturella ändringar (call activities i subProcesses) som inte detekteras korrekt
3. Tvetydiga matchningar som kräver manuell granskning
4. Svårt att validera om mappningar är semantiskt korrekta

---

## Claude-baserad Approach

### Koncept

**Använd Claude för att:**
1. Analysera alla BPMN-filer semantiskt
2. Förstå process-hierarkier och relationer
3. Matcha call activities till subprocesses baserat på kontext och semantik
4. Detektera strukturella ändringar och avvikelser
5. Generera en korrekt bpmn-map.json med hög konfidens

### Fördelar

✅ **Semantisk förståelse**: Claude kan förstå vad processer gör, inte bara matcha namn
✅ **Kontextuell matching**: Kan använda processbeskrivningar, lanes, och flöde för bättre matchningar
✅ **Strukturell analys**: Kan identifiera när call activities är i subProcesses vs root-nivå
✅ **Ändringsdetektering**: Kan detektera när strukturer ändrats, inte bara när call activities försvinner
✅ **Validering**: Kan validera om mappningar är logiskt korrekta
✅ **Förklaringar**: Kan ge förklaringar till varför matchningar gjordes

### Nackdelar

❌ **Kostnad**: Varje generering kräver Claude API-anrop (kan bli dyrt med många filer)
❌ **Prestanda**: Långsammare än deterministisk kod (sekunder vs millisekunder)
❌ **API-beroende**: Kräver internet och aktiv Claude API-nyckel
❌ **Variabilitet**: Kan ge olika resultat vid olika körningar (även med låg temperature)
❌ **Validering**: Behöver fortfarande validera output mot faktiska filer

---

## Implementation Approach

### Alternativ 1: Fullständig Claude-generering

**Process:**
1. Läs alla BPMN-filer
2. Skicka alla filer till Claude i en prompt
3. Claude analyserar och genererar komplett bpmn-map.json
4. Validera output mot faktiska filer

**Prompt-struktur:**
```
Du är en expert på BPMN-processmappning. Analysera följande BPMN-filer och skapa en korrekt bpmn-map.json.

BPMN-filer:
[Alla BPMN-filer som XML]

Uppgift:
1. Identifiera alla call activities i varje fil
2. Matcha varje call activity till rätt subprocess-fil baserat på:
   - Semantisk betydelse
   - Process-hierarkier
   - CalledElement-attribut
   - Processbeskrivningar
3. Detektera strukturella ändringar (call activities i subProcesses)
4. Generera bpmn-map.json enligt schema: [JSON Schema]

Validera att:
- Alla call activities i filerna finns i map
- Inga call activities i map saknas i filerna
- Subprocess-mappningar är korrekta
```

**JSON Schema för structured output:**
```json
{
  "type": "object",
  "properties": {
    "generated_at": {"type": "string"},
    "note": {"type": "string"},
    "orchestration": {
      "type": "object",
      "properties": {
        "root_process": {"type": "string"}
      }
    },
    "processes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "bpmn_file": {"type": "string"},
          "process_id": {"type": "string"},
          "call_activities": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "bpmn_id": {"type": "string"},
                "name": {"type": "string"},
                "called_element": {"type": ["string", "null"]},
                "subprocess_bpmn_file": {"type": ["string", "null"]},
                "needs_manual_review": {"type": "boolean"}
              }
            }
          }
        }
      }
    }
  }
}
```

**Kostnad (uppskattning):**
- ~22 BPMN-filer
- Varje fil ~5-50 KB XML
- Total input: ~500 KB text
- Output: ~50 KB JSON
- **Uppskattad kostnad: $0.50 - $2.00 per generering** (beroende på modell)

---

### Alternativ 2: Hybrid Approach (Rekommenderad)

**Process:**
1. Använd deterministisk kod för grundläggande parsing och matchning
2. Använd Claude för:
   - Validering av matchningar
   - Detektering av strukturella ändringar
   - Matchning av tvetydiga fall
   - Förklaringar och konfidensnivåer

**Implementation:**
```typescript
async function generateBpmnMapHybrid(): Promise<BpmnMap> {
  // 1. Deterministisk parsing (snabbt, gratis)
  const deterministicMap = await generateBpmnMapFromFiles();
  
  // 2. Claude-validering och förbättring
  const validatedMap = await validateAndImproveMapWithClaude(
    deterministicMap,
    allBpmnFiles
  );
  
  return validatedMap;
}

async function validateAndImproveMapWithClaude(
  map: BpmnMap,
  files: BpmnFile[]
): Promise<BpmnMap> {
  // Skicka map + filer till Claude för validering
  const prompt = buildValidationPrompt(map, files);
  const result = await claudeClient.generateText({
    systemPrompt: VALIDATION_SYSTEM_PROMPT,
    userPrompt: prompt,
    responseFormat: {
      type: 'json_schema',
      json_schema: BPMN_MAP_VALIDATION_SCHEMA
    }
  });
  
  // Claude returnerar:
  // - Validerade matchningar
  // - Korrigerade matchningar
  // - Detekterade strukturella ändringar
  // - Förklaringar för varje ändring
  
  return parseClaudeValidation(result);
}
```

**Kostnad (uppskattning):**
- Input: ~500 KB (map + filer)
- Output: ~50 KB (validerad map + förklaringar)
- **Uppskattad kostnad: $0.30 - $1.50 per validering**

---

### Alternativ 3: Incremental Claude-validering

**Process:**
1. Använd deterministisk kod för grundläggande generering
2. När filer laddas upp eller ändras:
   - Skicka bara ändrade/nya filer till Claude
   - Claude validerar och förbättrar matchningar för dessa filer
   - Uppdatera map inkrementellt

**Fördelar:**
- Lägre kostnad (bara ändrade filer)
- Snabbare (mindre data att processa)
- Kan köras kontinuerligt vid filuppladdningar

---

## Prompt Design

### System Prompt

```
Du är en expert på BPMN-processmappning och processautomatisering. Din uppgift är att analysera BPMN-filer och skapa korrekta mappningar mellan call activities och subprocess-filer.

VIKTIGA REGLER:
1. Varje call activity MÅSTE mappas till exakt en subprocess-fil (eller null om ingen matchning finns)
2. Matchningar ska baseras på semantisk betydelse, inte bara namn-matchning
3. Använd calledElement-attribut när det finns
4. Identifiera när call activities är i subProcesses vs root-nivå
5. Detektera strukturella ändringar (call activities som försvunnit eller ändrats)
6. Validera att alla call activities i filerna finns i map
7. Validera att inga call activities i map saknas i filerna

MATCHNINGSPRIORITETER:
1. CalledElement matchar process_id i subprocess-fil (högsta konfidens)
2. Semantisk matchning baserat på processbeskrivningar
3. Filnamnsmatchning (exakt > fuzzy)
4. Process-hierarki och kontext

STRUKTURELL ANALYS:
- Identifiera call activities i subProcesses (de ska fortfarande mappas)
- Detektera när strukturer ändrats (t.ex. call activity flyttats till subProcess)
- Identifiera när call activities försvunnit från filer men finns kvar i map
```

### User Prompt Template

```
Analysera följande BPMN-filer och generera/validera bpmn-map.json:

BEFINTLIG MAP (om validering):
[Current bpmn-map.json]

BPMN-FILER:
[Alla BPMN-filer som XML eller parseade strukturer]

UPPGIFT:
1. Identifiera alla call activities i varje BPMN-fil
2. Matcha varje call activity till rätt subprocess-fil
3. Detektera strukturella ändringar jämfört med befintlig map (om given)
4. Generera komplett bpmn-map.json

VALIDERING:
- Kontrollera att alla call activities i filerna finns i map
- Kontrollera att inga call activities i map saknas i filerna
- Verifiera att subprocess-mappningar är korrekta
- Identifiera call activities som behöver manuell granskning
```

---

## Implementation Plan

### Steg 1: Skapa Claude-baserad Map Generator

**Fil:** `src/lib/bpmn/bpmnMapClaudeGenerator.ts`

```typescript
export async function generateBpmnMapWithClaude(
  bpmnFiles: BpmnFile[],
  existingMap?: BpmnMap
): Promise<BpmnMap> {
  // 1. Bygg prompt med alla BPMN-filer
  const prompt = buildClaudePrompt(bpmnFiles, existingMap);
  
  // 2. Anropa Claude med structured output
  const result = await claudeClient.generateText({
    systemPrompt: BPMN_MAP_SYSTEM_PROMPT,
    userPrompt: prompt,
    responseFormat: {
      type: 'json_schema',
      json_schema: BPMN_MAP_JSON_SCHEMA
    },
    maxTokens: 8000, // Stort output för många processer
    temperature: 0.1 // Låg för konsistens
  });
  
  // 3. Parse och validera resultat
  const map = JSON.parse(result) as BpmnMap;
  validateClaudeGeneratedMap(map, bpmnFiles);
  
  return map;
}
```

### Steg 2: Hybrid Approach

**Fil:** `src/lib/bpmn/bpmnMapHybridGenerator.ts`

```typescript
export async function generateBpmnMapHybrid(
  bpmnFiles: BpmnFile[]
): Promise<BpmnMap> {
  // 1. Deterministisk generering (snabbt)
  const deterministicMap = await generateBpmnMapFromFiles();
  
  // 2. Claude-validering och förbättring
  const improvedMap = await validateAndImproveWithClaude(
    deterministicMap,
    bpmnFiles
  );
  
  return improvedMap;
}

async function validateAndImproveWithClaude(
  map: BpmnMap,
  files: BpmnFile[]
): Promise<BpmnMap> {
  // Bygg prompt som fokuserar på:
  // - Validering av matchningar
  // - Detektering av strukturella ändringar
  // - Förbättring av tvetydiga matchningar
  
  const prompt = buildValidationPrompt(map, files);
  const result = await claudeClient.generateText({
    systemPrompt: VALIDATION_SYSTEM_PROMPT,
    userPrompt: prompt,
    responseFormat: {
      type: 'json_schema',
      json_schema: BPMN_MAP_VALIDATION_SCHEMA
    }
  });
  
  return parseValidationResult(result, map);
}
```

### Steg 3: Integration i UI

**Fil:** `src/pages/BpmnFileManager.tsx`

```typescript
// Lägg till knapp för Claude-generering
<Button onClick={handleGenerateMapWithClaude}>
  Generera Map med Claude
</Button>

// Eller automatisk validering vid filuppladdning
async function onFileUploaded() {
  // ... existing upload logic ...
  
  // Validera map med Claude (valfritt)
  if (shouldValidateWithClaude) {
    const validatedMap = await validateMapWithClaude(currentMap, uploadedFiles);
    // Visa förslag i MapSuggestionsDialog
  }
}
```

---

## Kostnadsanalys

### Fullständig Claude-generering
- **Input tokens**: ~125,000 (500 KB text)
- **Output tokens**: ~12,500 (50 KB JSON)
- **Kostnad per generering**: $0.50 - $2.00
- **Frekvens**: Vid filuppladdningar eller manuell regenerering

### Hybrid Approach (validering)
- **Input tokens**: ~100,000 (map + filer)
- **Output tokens**: ~10,000 (validerad map + förklaringar)
- **Kostnad per validering**: $0.30 - $1.50
- **Frekvens**: Vid filuppladdningar eller manuell validering

### Incremental Approach
- **Input tokens**: ~10,000 - 50,000 (bara ändrade filer)
- **Output tokens**: ~1,000 - 5,000 (bara ändringar)
- **Kostnad per uppdatering**: $0.05 - $0.30
- **Frekvens**: Kontinuerligt vid varje filuppladdning

---

## Rekommendation

### Hybrid Approach med Incremental Validering

**Varför:**
1. ✅ Kombinerar snabbhet från deterministisk kod med noggrannhet från Claude
2. ✅ Lägre kostnad än fullständig Claude-generering
3. ✅ Kan köras kontinuerligt utan att bli för dyrt
4. ✅ Ger förklaringar och konfidensnivåer
5. ✅ Detekterar strukturella ändringar som regex missar

**Implementation:**
1. Använd deterministisk kod för grundläggande generering (snabbt, gratis)
2. Använd Claude för validering och förbättring vid:
   - Filuppladdningar (inkrementell validering)
   - Manuell "Validera med Claude"-knapp
   - Periodisk validering (t.ex. dagligen)
3. Claude fokuserar på:
   - Detektering av strukturella ändringar
   - Validering av tvetydiga matchningar
   - Förklaringar för varför matchningar gjordes
   - Identifiering av call activities som behöver manuell granskning

**Kostnad:**
- Initial generering: Gratis (deterministisk)
- Validering vid filuppladdning: $0.05 - $0.30 per fil
- Manuell validering: $0.30 - $1.50 per körning
- **Total månadskostnad (uppskattning)**: $5 - $20 (beroende på användning)

---

## Nästa Steg

1. **Skapa prompt-filer** för Claude-generering/validering
2. **Implementera `bpmnMapClaudeGenerator.ts`** med hybrid approach
3. **Lägg till UI-knapp** för Claude-validering
4. **Integrera i filuppladdningsflöde** (valfritt, inkrementell validering)
5. **Testa med faktiska BPMN-filer** och jämför med nuvarande approach
6. **Iterera på prompts** baserat på resultat

---

## Exempel: Claude Prompt för Validering

```
System: Du är en expert på BPMN-processmappning...

User: 
Validera följande bpmn-map.json mot faktiska BPMN-filer:

BEFINTLIG MAP:
{
  "processes": [
    {
      "bpmn_file": "mortgage-se-manual-credit-evaluation.bpmn",
      "call_activities": [
        {"bpmn_id": "credit-evaluation", ...},
        {"bpmn_id": "documentation-assessment", ...}
      ]
    }
  ]
}

FAKTISK BPMN-FIL (mortgage-se-manual-credit-evaluation.bpmn):
[XML-innehåll]

UPPGIFT:
1. Identifiera alla call activities i BPMN-filen
2. Jämför med call activities i map
3. Detektera avvikelser:
   - Call activities i map som saknas i filen
   - Call activities i filen som saknas i map
   - Strukturella ändringar (t.ex. call activity flyttats till subProcess)
4. Generera korrigerad map med förklaringar

RETURNERA:
{
  "validated_map": {...},
  "issues": [
    {
      "type": "missing_in_file",
      "call_activity": "credit-evaluation",
      "explanation": "Call activity finns i map men saknas i filen. Endast Activity_1gzlxx4 finns."
    }
  ],
  "confidence": 0.95
}
```

