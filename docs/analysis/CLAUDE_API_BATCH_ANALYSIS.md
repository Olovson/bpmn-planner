# Analys: Claude API Batch API och Premium Rates

**Datum:** 2025-12-22  
**Syfte:** Analysera token-användning, premium rates, och Batch API-möjligheter

## Sammanfattning

Analys av Claude API-användning visar att:
- **Premium rates (>200K tokens):** Troligen INTE relevant för enskilda requests, men kan vara relevant för aggregerade batch-jobb
- **Batch API:** Mycket relevant för stora genereringsjobb (300+ noder) med 50% rabatt och asynkron processing
- **Kostnadsbesparing:** Potentiellt 50% rabatt + undvika premium rates för stora batch-jobb

---

## 1. Premium Rates (>200K tokens per request)

### Nuvarande situation

**Premium rates:**
- Requests över 200K tokens debiteras med premium rates
- **Standard:** $3/M input, $15/M output (Claude Sonnet 4.5)
- **Premium:** $6/M input (2x), $22.50/M output (1.5x)

**Vår token-användning per request:**

| DocType | Max Output Tokens | Typisk Input Tokens | Total Tokens (uppskattat) |
|---------|------------------|---------------------|---------------------------|
| Feature Goal | 6000 | ~50-100K | ~55-106K |
| Epic | 1800 | ~20-50K | ~22-52K |
| Business Rule | 1800 | ~15-30K | ~17-32K |
| Test Script | ~2000 | ~10-30K | ~12-32K |

**Slutsats:**
- **Enskilda requests:** Troligen INTE över 200K tokens
- **Feature Goals:** Kan vara nära gränsen (55-106K tokens), men troligen under 200K
- **Epics/Business Rules:** Tydligt under 200K tokens

**När premium rates skulle gälla:**
- Om vi skickar mycket stora context-payloads (t.ex. hela hierarkin i en request)
- Om vi aggregerar flera noders kontext i en request
- För mycket komplexa Feature Goals med många child nodes

**Rekommendation:**
- Övervaka token-användning per request
- Varning om requests närmar sig 200K tokens
- Överväg att dela upp stora requests om de närmar sig gränsen

---

## 2. Batch API - Översikt

### Hur det fungerar

**Grundläggande:**
1. **Batch Submission:** Skicka upp till 10,000 requests i en batch
2. **Asynkron Processing:** Batch processas inom 24 timmar
3. **Result Retrieval:** Hämta resultat med custom IDs
4. **50% Rabatt:** Både input och output tokens

**Pricing (Claude Sonnet 4.5):**
- **Standard API:** $3/M input, $15/M output
- **Batch API:** $1.50/M input, $7.50/M output (50% rabatt)
- **Premium rates gäller INTE för Batch API** (batch processas i mindre chunks)

**Begränsningar:**
- Max 10,000 requests per batch
- Processing inom 24 timmar (inte real-time)
- Asynkron (måste polla för status)
- Ingen streaming (alla resultat returneras när klart)

---

## 3. Nuvarande API-användning i appen

### Synkrona requests

**Flöde:**
1. `generateAllFromBpmnWithGraph()` loopar genom noder
2. För varje nod: `generateDocumentationWithLlm()` → `generateWithFallback()` → `cloudLlmClient.generateText()`
3. Varje request är synkron (väntar på svar)
4. Rate limiting: 8K output tokens/min, 50 requests/min

**Problem:**
- **Långsam:** 300+ noder kan ta timmar
- **UI-blockering:** Användaren måste vänta
- **Rate limits:** Måste throttla requests
- **Höga kostnader:** Standard pricing för alla requests

**Exempel:**
- 300 noder × 50K tokens (input) + 3K tokens (output) = ~15M input + 900K output tokens
- **Kostnad (standard):** $45 + $13.50 = **$58.50**
- **Kostnad (batch):** $22.50 + $6.75 = **$29.25** (50% rabatt)

---

## 4. Hur Batch API skulle fungera för vår app

### Arkitektur

**Före (synkron):**
```
User triggers generation
  ↓
For each node:
  - Build prompt
  - Call Claude API (wait)
  - Save result
  - Update progress
  ↓
Complete (hours later)
```

**Efter (Batch API):**
```
User triggers generation
  ↓
1. Build all prompts (all nodes)
2. Create batch with 10,000 requests
3. Submit batch to Claude
4. Return immediately (batch ID)
  ↓
Background process:
  - Poll batch status
  - When complete, retrieve results
  - Save to database/storage
  - Notify user
```

### Implementation-steg

**1. Batch Creation:**
- Samla alla requests för en generering
- Skapa batch med custom IDs (t.ex. `{bpmnFile}:{nodeId}:{docType}`)
- Submit batch till Claude API

**2. Status Polling:**
- Poll batch status varje 5-10 minuter
- Status: `validating` → `in_progress` → `finalizing` → `completed` / `expired` / `cancelled`

**3. Result Retrieval:**
- När batch är `completed`, hämta alla resultat
- Matcha resultat med custom IDs
- Spara till database/storage
- Uppdatera UI med progress

**4. Error Handling:**
- Hantera `expired` batches (re-submit)
- Hantera `cancelled` batches (re-submit)
- Hantera felaktiga resultat (re-generate individuellt)

---

## 5. Fördelar med Batch API

### Kostnadsbesparing

**Exempel: 300 noder:**
- **Standard API:** $58.50
- **Batch API:** $29.25
- **Besparing:** $29.25 (50%)

**Exempel: 1000 noder:**
- **Standard API:** $195
- **Batch API:** $97.50
- **Besparing:** $97.50 (50%)

**Årlig besparing (om 10 stora genereringar/månad):**
- 10 × $29.25 × 12 = **$3,510/år**

### Prestanda

**Före:**
- 300 noder: ~3-4 timmar (med rate limiting)
- UI blockerad under hela tiden
- Användaren måste vänta

**Efter:**
- Batch submission: ~1-2 minuter
- UI omedelbart tillgänglig
- Resultat tillgängliga inom 24 timmar (ofta mycket snabbare)
- Användaren kan fortsätta arbeta

### Skalbarhet

**Före:**
- Rate limits begränsar hastighet
- Måste throttla requests
- Svårt att skala till 1000+ noder

**Efter:**
- Inga rate limits för batch submission
- Kan skicka 10,000 requests i en batch
- Bättre skalbarhet för stora projekt

---

## 6. Utmaningar och överväganden

### Asynkron processing

**Problem:**
- Användaren får inte omedelbart resultat
- Måste vänta på batch completion
- Svårt att visa real-time progress

**Lösning:**
- Visa batch status i UI
- Notifiera när batch är klar
- Tillåt användaren att fortsätta arbeta medan batch processas

### Error handling

**Problem:**
- Batch kan `expire` eller `cancel`
- Individuella requests kan faila
- Svårt att retry specifika requests

**Lösning:**
- Implementera retry-logik för failed batches
- För failed requests, re-generera individuellt
- Logga alla fel för debugging

### Status polling

**Problem:**
- Måste polla batch status
- Kan vara resurskrävande
- Svårt att veta när batch är klar

**Lösning:**
- Poll varje 5-10 minuter (inte för ofta)
- Använd webhooks om tillgängliga (futuristiskt)
- Cache batch status i database

### Hybrid approach

**Rekommendation:**
- **Små genereringar (<50 noder):** Använd standard API (snabbare, real-time)
- **Stora genereringar (50+ noder):** Använd Batch API (billigare, asynkron)
- **Kritisk tid:** Använd standard API (om resultat behövs omedelbart)

---

## 7. Implementation-rekommendationer

### Fas 1: Batch API Support (Grundläggande)

**Mål:**
- Stöd för Batch API för stora genereringar
- Status polling och result retrieval
- Basic error handling

**Komponenter:**
1. **Batch Manager:**
   - `createBatch()` - Skapa batch från requests
   - `submitBatch()` - Submit till Claude API
   - `pollBatchStatus()` - Poll batch status
   - `retrieveBatchResults()` - Hämta resultat

2. **Database Schema:**
   - `generation_batches` tabell:
     - `batch_id` (Claude batch ID)
     - `status` (validating, in_progress, completed, etc.)
     - `created_at`, `completed_at`
     - `total_requests`, `completed_requests`
     - `bpmn_file`, `generation_source`

3. **UI:**
   - Batch status view
   - Progress indicator
   - Notification när batch är klar

### Fas 2: Hybrid Approach

**Mål:**
- Automatisk val av standard vs batch API
- Baserat på antal noder och användarpreferenser

**Logik:**
- <50 noder: Standard API (real-time)
- 50-1000 noder: Batch API (asynkron)
- >1000 noder: Dela upp i flera batches

### Fas 3: Avancerad funktionalitet

**Mål:**
- Retry-logik för failed batches
- Partial results (visa resultat när de kommer in)
- Cost tracking och analytics

---

## 8. Kostnadsjämförelse

### Scenario 1: 100 noder

| Metod | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |
|-------|--------------|---------------|------------|-------------|-------|
| Standard API | 5M | 300K | $15 | $4.50 | **$19.50** |
| Batch API | 5M | 300K | $7.50 | $2.25 | **$9.75** |
| **Besparing** | | | | | **$9.75 (50%)** |

### Scenario 2: 300 noder

| Metod | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |
|-------|--------------|---------------|------------|-------------|-------|
| Standard API | 15M | 900K | $45 | $13.50 | **$58.50** |
| Batch API | 15M | 900K | $22.50 | $6.75 | **$29.25** |
| **Besparing** | | | | | **$29.25 (50%)** |

### Scenario 3: 1000 noder

| Metod | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |
|-------|--------------|---------------|------------|-------------|-------|
| Standard API | 50M | 3M | $150 | $45 | **$195** |
| Batch API | 50M | 3M | $75 | $22.50 | **$97.50** |
| **Besparing** | | | | | **$97.50 (50%)** |

---

## 9. Slutsatser och rekommendationer

### Premium Rates

**Slutsats:**
- Troligen INTE relevant för enskilda requests
- Kan vara relevant för mycket stora context-payloads
- Övervaka token-användning per request

**Rekommendation:**
- Lägg till token-tracking per request
- Varning om requests närmar sig 200K tokens
- Överväg att dela upp stora requests

### Batch API

**Slutsats:**
- Mycket relevant för stora genereringsjobb
- 50% kostnadsbesparing
- Bättre användarupplevelse (ingen UI-blockering)
- Bättre skalbarhet

**Rekommendation:**
- **Prioritet 1:** Implementera Batch API support för stora genereringar (300+ noder)
- **Prioritet 2:** Hybrid approach (automatisk val baserat på antal noder)
- **Prioritet 3:** Avancerad funktionalitet (retry, partial results, analytics)

**Förväntad ROI:**
- Kostnadsbesparing: 50% för stora genereringar
- Tidsbesparing: Användaren kan fortsätta arbeta
- Skalbarhet: Stöd för 1000+ noder utan problem

---

## 10. Nästa steg

1. **Forskningsfas:**
   - Testa Batch API med små batches (10-20 requests)
   - Verifiera pricing och processing time
   - Dokumentera API-användning

2. **Designfas:**
   - Designa batch manager-arkitektur
   - Designa database schema
   - Designa UI för batch status

3. **Implementation:**
   - Implementera batch manager
   - Implementera status polling
   - Implementera result retrieval
   - Implementera UI

4. **Testing:**
   - Testa med små batches
   - Testa med stora batches (300+ noder)
   - Testa error handling
   - Testa retry-logik

5. **Deployment:**
   - Rollout till production
   - Övervaka kostnader och prestanda
   - Iterera baserat på feedback

---

## Relaterade dokument

- `STRATEGIC_IMPROVEMENTS_OVERVIEW.md` - Strategiska förbättringar
- `TODO.md` - Batch-API för massgenerering (redan dokumenterat)
- Anthropic API Documentation: https://docs.anthropic.com/en/docs/build-with-claude/message-batches
