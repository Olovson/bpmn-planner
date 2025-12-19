# LLM-jämförelse: Claude vs ChatGPT för HTML-dokumentationsgenerering

**Datum:** 2025-01-27  
**Syfte:** Utvärdera vilken LLM som är bäst för att generera HTML-dokumentation

---

## 📊 Nuvarande Setup

### Vad som används nu
- **ChatGPT (GPT-4o)** via OpenAI API
- **Lokal LLM** (Ollama/Llama) som fallback
- **JSON-output** - LLM genererar JSON, koden bygger HTML

### Arkitektur
```
LLM (ChatGPT/Local) 
  → JSON (enligt schema)
  → generateDocumentationHTML() 
  → HTML-filer
```

LLM genererar **INTE** HTML direkt, utan JSON som sedan konverteras till HTML.

---

## 🎯 Jämförelse: Claude vs ChatGPT

### 1. JSON-struktur och Schema-följning

**ChatGPT (GPT-4o):**
- ✅ **Mycket bra** på att följa JSON-scheman strikt
- ✅ **Konsekvent** output-format
- ✅ **Bra** på att följa komplexa strukturer
- ⚠️ Kan ibland lägga till extra fält (men valideras bort)

**Claude (Opus/Sonnet):**
- ✅ **Utmärkt** på att följa scheman
- ✅ **Bättre** på att förstå komplexa instruktioner
- ✅ **Mindre** risk för extra fält
- ✅ **Bättre** kontextförståelse

**Vinnare:** Claude (marginellt bättre)

---

### 2. Svenska Språk och Bankterminologi

**ChatGPT (GPT-4o):**
- ✅ **Mycket bra** svenska
- ✅ **Bra** bankterminologi
- ⚠️ Kan ibland använda engelska termer

**Claude (Opus/Sonnet):**
- ✅ **Utmärkt** svenska
- ✅ **Bättre** bankterminologi och formell ton
- ✅ **Mer konsekvent** svenska genomgående

**Vinnare:** Claude (bättre för formell bankdokumentation)

---

### 3. Kontextförståelse (BPMN, Processer)

**ChatGPT (GPT-4o):**
- ✅ **Bra** kontextförståelse
- ✅ **Förstår** BPMN-strukturer
- ⚠️ Kan ibland missa subtila kopplingar

**Claude (Opus/Sonnet):**
- ✅ **Utmärkt** kontextförståelse
- ✅ **Bättre** på att förstå komplexa processer
- ✅ **Bättre** på att hitta kopplingar mellan noder
- ✅ **Bättre** på att förstå hierarkier

**Vinnare:** Claude (betydligt bättre)

---

### 4. Kostnad

**ChatGPT (GPT-4o):**
- 💰 **$5 per 1M input tokens**
- 💰 **$15 per 1M output tokens**
- 📊 För en Feature Goal: ~$0.10-0.20

**Claude (Opus):**
- 💰 **$15 per 1M input tokens**
- 💰 **$75 per 1M output tokens**
- 📊 För en Feature Goal: ~$0.30-0.50

**Claude (Sonnet 4.5):**
- 💰 **$3 per 1M input tokens**
- 💰 **$15 per 1M output tokens**
- 📊 För en Feature Goal: ~$0.10-0.20 (samma som GPT-4o)

**Vinnare:** ChatGPT eller Claude Sonnet (billigare)

---

### 5. API-tillgänglighet och Integration

**ChatGPT:**
- ✅ **Redan integrerat** i projektet
- ✅ **Stabil** API
- ✅ **Bra** dokumentation
- ✅ **Snabb** response time

**Claude:**
- ⚠️ **Inte integrerat** ännu
- ✅ **Stabil** API (Anthropic)
- ✅ **Bra** dokumentation
- ⚠️ Kräver ny integration

**Vinnare:** ChatGPT (redan integrerat)

---

### 6. Kvalitet på Genererad Innehåll

**ChatGPT (GPT-4o):**
- ✅ **Bra** kvalitet
- ✅ **Konsekvent** struktur
- ⚠️ Kan ibland vara lite generisk

**Claude (Opus/Sonnet):**
- ✅ **Bättre** kvalitet
- ✅ **Mer detaljerad** och specifik
- ✅ **Bättre** affärslogik-förståelse
- ✅ **Mer kreativ** men ändå korrekt

**Vinnare:** Claude (bättre kvalitet)

---

### 7. Rate Limits och Reliability

**ChatGPT:**
- ✅ **Bra** rate limits
- ✅ **Sällan** downtime
- ✅ **Snabb** recovery

**Claude:**
- ✅ **Bra** rate limits
- ✅ **Sällan** downtime
- ✅ **Snabb** recovery

**Vinnare:** Lika bra

---

## 🎯 Rekommendation

### För HTML-dokumentationsgenerering: **Claude Sonnet 4.5**

**Varför:**
1. ✅ **Bättre kvalitet** - Mer detaljerad och specifik innehåll
2. ✅ **Bättre svenska** - Mer formell och konsekvent bankterminologi
3. ✅ **Bättre kontextförståelse** - Förstår BPMN-hierarkier bättre
4. ✅ **Samma kostnad** som GPT-4o
5. ⚠️ Kräver integration (men enkel)

**När ChatGPT är bättre:**
- Om du redan är nöjd med kvaliteten
- Om du vill undvika extra integration
- Om du behöver snabbare response time (marginellt)

---

## 📋 Implementation Plan

### Steg 1: Integrera Claude API

1. **Installera Anthropic SDK:**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Skapa Claude client:**
   - `src/lib/llmClients/claudeLlmClient.ts`
   - Använd `claude-sonnet-4-20250514` (senaste Sonnet)

3. **Uppdatera provider-resolver:**
   - Lägg till `'claude'` som provider
   - Uppdatera `llmProviderResolver.ts`

### Steg 2: Testa Kvalitet

1. **Generera samma dokumentation** med både ChatGPT och Claude
2. **Jämför kvalitet:**
   - Svenska språk
   - Kontextförståelse
   - Detaljnivå
   - Konsistens

### Steg 3: Välj Provider

Baserat på testresultat:
- **Om Claude är bättre:** Använd Claude som default
- **Om ChatGPT är tillräckligt:** Behåll ChatGPT
- **Om båda är bra:** Låt användaren välja

---

## 💡 Alternativ: Hybrid Approach

**Använd båda:**
- **Claude** för Feature Goals och Epics (bättre kontextförståelse)
- **ChatGPT** för Business Rules (snabbare, tillräckligt bra)

Detta ger bästa av båda världar.

---

## 🔍 Testplan

1. **Välj 3-5 representativa noder:**
   - 1 Feature Goal
   - 2 Epics (UserTask, ServiceTask)
   - 1 Business Rule

2. **Generera med båda:**
   - Samma input
   - Samma prompts
   - Jämför output

3. **Utvärdera:**
   - Kvalitet på innehåll
   - Svenska språk
   - Kontextförståelse
   - Kostnad per generation

---

## 🎯 Slutsats

**Rekommendation:** **Claude Sonnet 4.5**

**Varför:**
- ✅ Bättre kvalitet för samma kostnad
- ✅ Bättre svenska och bankterminologi
- ✅ Bättre kontextförståelse för BPMN

**Men:**
- ⚠️ Kräver integration (1-2 timmar arbete)
- ⚠️ ChatGPT fungerar redan bra

**Nästa steg:**
1. Fixa Chroma-felet (pågår)
2. Integrera Claude API
3. Testa båda på samma noder
4. Välj baserat på resultat

