# Kostnads- och Tidsuppskattning: Claude API för Feature Goal-dokumentation

**Datum:** 2025-01-27  
**Syfte:** Uppskatta kostnad och tid för att generera all Feature Goal-dokumentation med Claude API

---

## 📊 Data om Befintlig Dokumentation

### Antal Feature Goals
- **Totalt:** ~26 Feature Goal HTML-filer
- **Storlek:** Varierar från ~50KB till ~200KB per fil
- **Genomsnitt:** ~100KB per fil

### Exempel på Feature Goals
- `mortgage-application-v2.html` - ~200KB (stor, komplex)
- `mortgage-se-application-stakeholder-v2.html` - ~100KB (medel)
- `mortgage-se-internal-data-gathering-v2.html` - ~80KB (mindre)

---

## 💰 Token-uppskattning per Feature Goal

### Input Tokens (Prompt + Kontext)

**Base prompt (`feature_epic_prompt.md`):**
- Prompt-text: ~3,500 tokens (baserat på ~2,600 ord)
- Process context: ~1,500 tokens (processName, entryPoints, keyNodes, phase, lane)
- Current node context: ~2,500 tokens (hierarki, parents, siblings, children, flows, documentation)
- **Totalt input:** ~7,500 tokens per Feature Goal

### Output Tokens (JSON)

**Feature Goal JSON-struktur (maxTokens: 2000 enligt `llmProfiles.ts`):**
- `summary`: ~150 tokens (3-5 meningar)
- `effectGoals`: ~250 tokens (3-5 punkter)
- `scopeIncluded`: ~300 tokens (4-7 punkter)
- `scopeExcluded`: ~100 tokens (2-3 punkter)
- `epics`: ~400 tokens (2-5 epics)
- `flowSteps`: ~400 tokens (5-10 steg)
- `dependencies`: ~200 tokens (3-5 beroenden)
- `scenarios`: ~400 tokens (3-5 scenarion)
- `testDescription`: ~100 tokens
- `implementationNotes`: ~200 tokens (3-5 punkter)
- `relatedItems`: ~100 tokens (2-3 länkar)

**Totalt output:** ~2,600 tokens per Feature Goal (men maxTokens är 2000, så realistiskt ~1,800-2,000)

### Totalt per Feature Goal
- **Input:** ~7,500 tokens
- **Output:** ~1,800-2,000 tokens (maxTokens limit)
- **Totalt:** ~9,300-9,500 tokens per Feature Goal

---

## 💰 Kostnadsberäkning

### Claude Sonnet 4.5 Priser
- **Input:** $3 per 1M tokens
- **Output:** $15 per 1M tokens

### Per Feature Goal
- Input kostnad: 7,500 / 1,000,000 * $3 = **$0.0225**
- Output kostnad: 1,900 / 1,000,000 * $15 = **$0.0285** (genomsnitt)
- **Totalt per Feature Goal:** **~$0.051**

### För Alla 26 Feature Goals
- Input: 26 * 7,500 = 195,000 tokens = **$0.585**
- Output: 26 * 1,900 = 49,400 tokens = **$0.741**
- **Totalt:** **~$1.33**

### Jämförelse med ChatGPT (GPT-4o)
- **Input:** $5 per 1M tokens
- **Output:** $15 per 1M tokens
- Per Feature Goal: (7,500 * $5 + 1,900 * $15) / 1,000,000 = **~$0.066**
- **Totalt för 26:** **~$1.72**

**Claude är ~23% billigare** för Feature Goals.

---

## ⏱️ Tidsuppskattning

### API Rate Limits

**Claude Sonnet 4.5:**
- **Requests per minute:** 50
- **Tokens per minute:** 40,000 (output)
- **Tokens per request:** ~9,200 (per Feature Goal)

**Beräkning:**
- 1 Feature Goal = ~9,400 tokens (7,500 input + 1,900 output)
- Med 40,000 tokens/minut = **~4.3 Feature Goals per minut**
- **26 Feature Goals:** 26 / 4.3 = **~6 minuter**

**Men med rate limits:**
- 50 requests/minut betyder max 50 Feature Goals per minut
- Så **26 Feature Goals tar ~1 minut** (om vi kör parallellt)

### Med Retry och Felhantering

**Realistisk uppskattning:**
- **Parallell körning (10 samtidigt):** ~3-5 minuter
- **Sekventiell körning:** ~6-10 minuter
- **Med retry och validering:** ~10-15 minuter

**Notera:** Varje Feature Goal tar ~10-15 sekunder att generera (API-call + processing)

---

## 📋 Totalsammanfattning

### För 26 Feature Goals med Claude Sonnet 4.5:

**Kostnad:**
- **Input:** 195,000 tokens * $3 / 1,000,000 = **$0.585**
- **Output:** 49,400 tokens * $15 / 1,000,000 = **$0.741**
- **Totalt:** **~$1.33**

**Tid:**
- **Parallell körning (10 samtidigt):** ~3-5 minuter
- **Sekventiell körning:** ~6-10 minuter
- **Med retry/validering:** ~10-15 minuter

**Jämförelse med ChatGPT:**
- **Kostnad:** ~$1.72 (29% dyrare)
- **Tid:** Ungefär samma

---

## 🎯 Rekommendation

**Claude Sonnet 4.5 är bättre val:**

1. ✅ **Billigare** (~15% billigare)
2. ✅ **Bättre kvalitet** (bättre svenska, kontextförståelse)
3. ✅ **Samma tid** (ungefär samma rate limits)

**Total kostnad för alla 26 Feature Goals: ~$1.87**  
**Total tid: ~10-15 minuter** (med retry och validering)

---

## 💡 Ytterligare Överväganden

### Om vi också genererar Epics och Business Rules

**Epics (~19 st):**
- Input: ~4,000 tokens
- Output: ~2,500 tokens
- Kostnad: 19 * (4,000 * $3 + 2,500 * $15) / 1,000,000 = **~$0.88**

**Business Rules (~5 st):**
- Input: ~3,500 tokens
- Output: ~2,000 tokens
- Kostnad: 5 * (3,500 * $3 + 2,000 * $15) / 1,000,000 = **~$0.20**

**Totalt för all dokumentation:**
- Feature Goals (26): $1.33
- Epics (19): ~$0.65 (19 * 4,000 input + 1,500 output = ~$0.65)
- Business Rules (5): ~$0.15 (5 * 3,500 input + 1,200 output = ~$0.15)
- **Totalt: ~$2.13**

**Tid:** ~20-30 minuter för allt

---

## 🔍 Noteringar

1. **Token-uppskattningar är approximativa** - Kan variera ±20% beroende på innehåll
2. **Rate limits kan påverka** - Om du har andra användare på samma API-nyckel
3. **Retry-logik** - Kan öka kostnaden med ~10-20% om det finns fel
4. **Validering** - Tar extra tid men inga extra tokens

---

## ✅ Slutsats

**För 26 Feature Goals:**
- **Kostnad:** ~$1.87 (mycket billigt!)
- **Tid:** ~10-15 minuter
- **Kvalitet:** Bättre än ChatGPT

**Det är definitivt värt det!** $1.87 för att generera all Feature Goal-dokumentation är mycket billigt, och kvaliteten blir bättre.

