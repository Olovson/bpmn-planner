# Analys: Batch API och Hierarkisk Generering

**Datum:** 2025-12-22  
**Syfte:** Analysera hur Batch API skulle fungera med hierarkisk generering och dependencies

## Sammanfattning

Hierarkisk generering kräver att child nodes genereras FÖRE parent nodes eftersom parent nodes behöver `childrenDocumentation`. Batch API är asynkron, vilket skapar utmaningar för dependencies. Flera strategier är möjliga.

---

## 1. Nuvarande Hierarkisk Generering

### Flöde

**Pass 1: Leaf nodes först (högst depth)**
1. Sortera noder efter depth (lägre depth = subprocesser, högre depth = parent nodes)
2. Generera dokumentation för leaf nodes (epics/tasks) först
3. Spara dokumentation i `generatedChildDocs` Map
4. Varje request är synkron (väntar på svar)

**Pass 2: Parent nodes (lägst depth)**
1. Generera dokumentation för parent nodes (Feature Goals/callActivities)
2. Använd `generatedChildDocs` för att inkludera child documentation i prompts
3. Child documentation begränsas till max 40 items för att undvika token overflow

### Dependencies

**Parent nodes behöver:**
- `childrenDocumentation` från child nodes
- Dokumentation sparas i `generatedChildDocs` Map under Pass 1
- Används i `buildContextPayload()` för att bygga prompts

**Exempel:**
- Feature Goal (callActivity) behöver dokumentation från:
  - Direkta children (subprocesser)
  - Leaf nodes (tasks/epics) i subprocesser
  - Max 40 items totalt (redan begränsat)

---

## 2. Problem med Batch API

### Utmaning 1: Asynkron Processing

**Problem:**
- Batch API är asynkron (processas inom 24 timmar)
- Kan inte vänta på Pass 1 resultat innan Pass 2 skickas
- Parent nodes behöver child documentation som inte finns tillgänglig

**Exempel:**
```
Pass 1 Batch: 100 leaf nodes → skickas samtidigt
Pass 2 Batch: 20 parent nodes → skickas samtidigt (men child docs finns inte än!)
```

**Resultat:**
- Parent nodes får prompts UTAN child documentation
- Sämre kvalitet på genererad dokumentation
- Motsäger hierarkisk genereringsprincip

### Utmaning 2: Prompt-storlek

**Problem:**
- Om vi inkluderar all child documentation i parent prompts blir de enorma
- Redan begränsat till max 40 items, men det kan fortfarande vara stort
- Risk för token overflow (>200K tokens per request)

**Nuvarande begränsningar:**
- Max 40 items för Feature Goals (rad 710 i `llmDocumentation.ts`)
- Scenarios begränsas till max 3 per node
- Prioritering: 1) Direkta children, 2) Leaf nodes, 3) Övriga

**Med Batch API:**
- Om vi skickar 10 filer åt gången, kan varje fil ha många noder
- Parent prompts skulle inkludera child docs från alla filer
- Potentiellt mycket större prompts än nuvarande

---

## 3. Strategier för Batch API med Hierarki

### Strategi 1: Multi-Stage Batches (Rekommenderad)

**Koncept:**
- Dela upp i flera batch-steg baserat på depth
- Vänta på varje steg innan nästa skickas

**Flöde:**
```
Stage 1 Batch: Alla leaf nodes (depth 3+)
  ↓ (vänta på completion)
Stage 2 Batch: Parent nodes med depth 2 (använder Stage 1 results)
  ↓ (vänta på completion)
Stage 3 Batch: Root nodes med depth 1 (använder Stage 1+2 results)
```

**Fördelar:**
- ✅ Bevarar hierarkisk generering
- ✅ Parent nodes får child documentation
- ✅ 50% rabatt på alla stages

**Nackdelar:**
- ⚠️ Längre total tid (måste vänta mellan stages)
- ⚠️ Mer komplex implementation (måste hantera dependencies)
- ⚠️ Måste hämta och processa results mellan stages

**Implementation:**
1. Gruppera noder efter depth
2. Skapa Stage 1 batch (högst depth)
3. Poll status tills Stage 1 är klar
4. Hämta Stage 1 results, spara i `generatedChildDocs`
5. Skapa Stage 2 batch (nästa depth) med child docs
6. Upprepa för varje depth level

---

### Strategi 2: Hybrid Approach (Snabbare)

**Koncept:**
- Leaf nodes i Batch API (inga dependencies)
- Parent nodes synkront (efter batch completion)

**Flöde:**
```
Batch: Alla leaf nodes (depth 3+)
  ↓ (vänta på completion)
Synkron: Parent nodes (depth 1-2) med child docs från batch
```

**Fördelar:**
- ✅ Snabbare än multi-stage (bara ett batch-steg)
- ✅ Parent nodes får child documentation
- ✅ 50% rabatt på leaf nodes (oftast flest)

**Nackdelar:**
- ⚠️ Parent nodes betalar standard pricing
- ⚠️ Måste vänta på batch completion
- ⚠️ Hybrid approach (blandad pricing)

**Implementation:**
1. Identifiera leaf nodes (inga children eller children redan genererade)
2. Skapa batch för leaf nodes
3. Poll status tills batch är klar
4. Hämta results, spara i `generatedChildDocs`
5. Generera parent nodes synkront med child docs

---

### Strategi 3: Använd Befintlig Dokumentation (Snabbast)

**Koncept:**
- Använd dokumentation från Storage istället för att vänta på batch results
- För parent nodes: hämta child docs från Storage

**Flöde:**
```
Batch: Alla noder (både leaf och parent)
  ↓ (parallellt)
Parent nodes använder child docs från Storage (om tillgängligt)
```

**Fördelar:**
- ✅ Snabbast (inga dependencies)
- ✅ 50% rabatt på alla noder
- ✅ Enklast implementation

**Nackdelar:**
- ⚠️ Parent nodes kan använda gamla child docs (om child docs inte finns i Storage)
- ⚠️ Risk för inkonsistens (gamla vs nya child docs)
- ⚠️ Kvalitet kan påverkas om child docs är gamla

**Implementation:**
1. För parent nodes: hämta child docs från Storage
2. Om child docs saknas: använd tomma eller fallback
3. Skapa batch för alla noder (både leaf och parent)
4. Parent prompts inkluderar child docs från Storage

**När det fungerar:**
- Om child docs redan finns i Storage (från tidigare generering)
- För inkrementella uppdateringar (bara vissa noder ändras)

**När det inte fungerar:**
- För första generering (inga child docs i Storage)
- För fullständig regenerering (gamla child docs kan vara inkonsistenta)

---

### Strategi 4: Begränsad Child Documentation (Kompromiss)

**Koncept:**
- Begränsa child documentation i parent prompts
- Använd bara summaries, inte fullständig dokumentation

**Flöde:**
```
Batch: Alla noder (både leaf och parent)
Parent prompts: Inkludera bara summaries från child nodes
```

**Fördelar:**
- ✅ 50% rabatt på alla noder
- ✅ Mindre prompts (undviker token overflow)
- ✅ Enklare implementation

**Nackdelar:**
- ⚠️ Sämre kvalitet (mindre kontext för parent nodes)
- ⚠️ Parent nodes får inte fullständig child documentation
- ⚠️ Kan påverka aggregering av innehåll

**Implementation:**
1. För parent nodes: inkludera bara summaries från child nodes
2. Begränsa till max 20-30 items (istället för 40)
3. Prioritera direkta children över descendants
4. Skapa batch för alla noder

---

## 4. Jämförelse av Strategier

| Strategi | Kostnad | Hastighet | Kvalitet | Komplexitet |
|----------|---------|-----------|----------|-------------|
| **Multi-Stage Batches** | 50% rabatt | Långsam (väntar mellan stages) | Hög (full child docs) | Hög |
| **Hybrid Approach** | 50% leaf, 100% parent | Medel (väntar på batch) | Hög (full child docs) | Medel |
| **Befintlig Dokumentation** | 50% rabatt | Snabbast (inga dependencies) | Varierar (gamla docs) | Låg |
| **Begränsad Child Docs** | 50% rabatt | Snabbast (inga dependencies) | Medel (begränsad kontext) | Låg |

---

## 5. Rekommenderad Strategi: Hybrid Approach

### Varför Hybrid Approach?

**Balans mellan:**
- ✅ Kostnadsbesparing (50% på leaf nodes, ofta flest)
- ✅ Kvalitet (parent nodes får fullständig child documentation)
- ✅ Hastighet (snabbare än multi-stage)
- ✅ Komplexitet (medel, hanterbar)

### Implementation-detaljer

**Steg 1: Identifiera Leaf Nodes**
- Noder med depth 3+ (eller noder utan children)
- Dessa har inga dependencies

**Steg 2: Skapa Batch för Leaf Nodes**
- Samla alla leaf node requests
- Skapa batch med custom IDs
- Submit batch till Claude API

**Steg 3: Vänta på Batch Completion**
- Poll batch status varje 5-10 minuter
- När `completed`: hämta alla results
- Spara i `generatedChildDocs` Map

**Steg 4: Generera Parent Nodes Synkront**
- Använd `generatedChildDocs` för child documentation
- Generera parent nodes med standard API (synkron)
- Fullständig child documentation tillgänglig

**Exempel:**
- 300 noder totalt
- 250 leaf nodes → Batch API (50% rabatt)
- 50 parent nodes → Standard API (100% pricing)
- **Kostnad:** ~$40 (istället för $58.50 med standard API)

---

## 6. Alternativ: Multi-Stage Batches (Om Kvalitet är Kritiskt)

### När att använda Multi-Stage

**Använd när:**
- Kvalitet är absolut kritiskt
- Alla parent nodes måste ha fullständig child documentation
- Kostnad är mindre viktigt än kvalitet

**Implementation:**
1. Gruppera noder efter depth
2. För varje depth level:
   - Skapa batch för noder på denna depth
   - Vänta på completion
   - Hämta results, spara i `generatedChildDocs`
   - Använd child docs för nästa depth level

**Exempel:**
- Depth 3: 200 noder → Batch 1
- Depth 2: 80 noder → Batch 2 (använder Batch 1 results)
- Depth 1: 20 noder → Batch 3 (använder Batch 1+2 results)

**Kostnad:** 50% rabatt på alla = $29.25 (istället för $58.50)

**Tid:** ~3-4 timmar (väntar mellan stages)

---

## 7. Prompt-storlek Analys

### Nuvarande Prompt-storlek

**Feature Goal (callActivity):**
- System prompt: ~5-10K tokens
- User prompt: ~50-100K tokens (inkluderar child docs)
- Max output: 6000 tokens
- **Total:** ~55-116K tokens per request

**Epic (task):**
- System prompt: ~5-10K tokens
- User prompt: ~20-50K tokens
- Max output: 1800 tokens
- **Total:** ~25-62K tokens per request

### Med Batch API (10 filer åt gången)

**Scenario:**
- 10 filer, ~30 noder per fil = 300 noder totalt
- Om alla skickas i en batch:
  - Varje request är separat (inte kombinerad)
  - Prompt-storlek per request är samma som nuvarande
  - **INGEN förändring i prompt-storlek**

**Viktigt:**
- Batch API skickar varje request separat
- Prompter kombineras INTE
- Varje request har samma storlek som nuvarande

**Slutsats:**
- ✅ Prompt-storlek påverkas INTE av batch-storlek
- ✅ Varje request är oberoende
- ✅ Ingen risk för token overflow från batch-storlek

---

## 8. Dependencies och Ordering

### Nuvarande Dependencies

**Parent → Child:**
- Parent nodes behöver child documentation
- Child nodes måste genereras FÖRE parent nodes
- Sortering efter depth säkerställer ordning

**Med Batch API:**
- Batch är asynkron (alla requests skickas samtidigt)
- Ingen garanti på ordning
- Måste hantera dependencies explicit

### Lösningar

**1. Multi-Stage Batches:**
- Explicit ordering genom stages
- Varje stage väntar på föregående

**2. Hybrid Approach:**
- Leaf nodes i batch (inga dependencies)
- Parent nodes synkront (efter batch, med child docs)

**3. Dependency Graph:**
- Bygg dependency graph
- Skicka endast noder utan dependencies i varje batch
- Upprepa tills alla noder är processade

---

## 9. Slutsatser och Rekommendationer

### Slutsats 1: Prompt-storlek påverkas INTE

**Viktigt:**
- Batch API skickar varje request separat
- Varje request har samma storlek som nuvarande
- Ingen risk för token overflow från batch-storlek

### Slutsats 2: Dependencies måste hanteras

**Problem:**
- Parent nodes behöver child documentation
- Batch API är asynkron (ingen garanti på ordning)
- Måste explicit hantera dependencies

### Slutsats 3: Hybrid Approach är Bäst

**Rekommendation:**
- **Leaf nodes:** Batch API (50% rabatt, inga dependencies)
- **Parent nodes:** Standard API (synkron, med child docs)
- **Balans:** Kostnad, hastighet, kvalitet, komplexitet

**Alternativ:**
- **Multi-Stage Batches:** Om kvalitet är absolut kritiskt
- **Befintlig Dokumentation:** Om child docs redan finns i Storage

### Slutsats 4: Implementation-steg

**Fas 1: Hybrid Approach**
1. Identifiera leaf nodes (depth 3+ eller inga children)
2. Skapa batch för leaf nodes
3. Vänta på completion
4. Generera parent nodes synkront

**Fas 2: Multi-Stage (Om behövs)**
1. Gruppera noder efter depth
2. Skapa batches per depth level
3. Vänta mellan stages
4. Använd child docs mellan stages

---

## 10. Exempel: 300 Noder

### Scenario
- 300 noder totalt
- 250 leaf nodes (depth 3+)
- 50 parent nodes (depth 1-2)

### Hybrid Approach

**Steg 1: Leaf Nodes Batch**
- 250 requests i batch
- ~15M input tokens, ~450K output tokens
- **Kostnad:** $22.50 + $3.38 = $25.88 (50% rabatt)

**Steg 2: Parent Nodes Synkront**
- 50 requests synkront
- ~2.5M input tokens, ~90K output tokens
- **Kostnad:** $7.50 + $1.35 = $8.85 (standard pricing)

**Total:**
- **Kostnad:** $34.73 (istället för $58.50)
- **Besparing:** $23.77 (41%)
- **Tid:** ~1-2 timmar (batch) + ~30 min (synkron) = ~2-2.5 timmar

### Multi-Stage Batches

**Stage 1: Depth 3+ (250 noder)**
- Batch: 250 requests
- Kostnad: $25.88 (50% rabatt)

**Stage 2: Depth 2 (40 noder)**
- Batch: 40 requests (med child docs från Stage 1)
- Kostnad: $4.14 (50% rabatt)

**Stage 3: Depth 1 (10 noder)**
- Batch: 10 requests (med child docs från Stage 1+2)
- Kostnad: $1.04 (50% rabatt)

**Total:**
- **Kostnad:** $31.06 (50% rabatt på alla)
- **Besparing:** $27.44 (47%)
- **Tid:** ~3-4 timmar (väntar mellan stages)

---

## 11. Nästa Steg

1. **Forskningsfas:**
   - Testa Hybrid Approach med små batches (10-20 leaf nodes)
   - Verifiera att child docs kan hämtas från batch results
   - Testa parent node generation med child docs

2. **Designfas:**
   - Designa batch manager för leaf nodes
   - Designa dependency resolver
   - Designa result processor

3. **Implementation:**
   - Implementera leaf node identifiering
   - Implementera batch creation och submission
   - Implementera result retrieval och child doc mapping
   - Implementera parent node generation med child docs

4. **Testing:**
   - Testa med små batches (10-20 noder)
   - Testa med stora batches (300+ noder)
   - Testa dependency handling
   - Testa error scenarios

---

## Relaterade dokument

- `CLAUDE_API_BATCH_ANALYSIS.md` - Batch API översikt
- `STRATEGIC_IMPROVEMENTS_OVERVIEW.md` - Strategiska förbättringar
- `GENERATION_LOGIC_EXPLANATION.md` - Hierarkisk generering
