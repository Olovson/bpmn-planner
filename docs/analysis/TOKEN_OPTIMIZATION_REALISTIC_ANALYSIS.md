# Realistisk Analys: Token-Optimering för E2E Scenarios

**Datum:** 2025-01-XX  
**Syfte:** Analysera faktisk token-skillnad mellan olika optimeringsstrategier

---

## 📊 Vad Innehåller En Typisk Feature Goal?

### Enligt Prompten:
- **flowSteps:** 4-8 steg (varje steg ~20-30 tokens)
- **userStories:** 3-6 user stories (varje user story ~50-100 tokens)
  - Varje user story har 2-4 acceptanceCriteria (~10-20 tokens var)
- **dependencies:** 3-6 strängar (~30-50 tokens var)
- **subprocesses:** 2-5 objekt (~50-100 tokens var)
- **serviceTasks:** 5-10 objekt (~30-50 tokens var)
- **userTasks:** 5-10 objekt (~30-50 tokens var)
- **businessRules:** 3-5 objekt (~30-50 tokens var)

### Token-uppskattning per Feature Goal:

| Fält | Antal | Tokens per item | Totalt |
|------|-------|-----------------|--------|
| summary | 1 | 100-200 | 100-200 |
| flowSteps | 4-8 | 20-30 | 80-240 |
| userStories | 3-6 | 50-100 | 150-600 |
| dependencies | 3-6 | 30-50 | 90-300 |
| subprocesses | 2-5 | 50-100 | 100-500 |
| serviceTasks | 5-10 | 30-50 | 150-500 |
| userTasks | 5-10 | 30-50 | 150-500 |
| businessRules | 3-5 | 30-50 | 90-250 |
| **TOTALT** | | | **910-3090 tokens** |

---

## 🔍 Min Optimering (Ta Bort Data)

### Vad jag tog bort:
- flowSteps: 5 av 4-8 → tar bort 0-3 steg = **0-90 tokens**
- userStories: 2 av 3-6 → tar bort 1-4 user stories = **50-400 tokens**
- acceptanceCriteria: 3 av 2-4 → tar bort 0-1 per user story = **0-20 tokens per user story**
- **Tog bort helt:** dependencies, subprocesses, serviceTasks, userTasks, businessRules = **580-2050 tokens**

### Token-minskning per Feature Goal:
- **Minimivärde:** 0 + 50 + 0 + 580 = **630 tokens**
- **Maximivärde:** 90 + 400 + 20 + 2050 = **2560 tokens**

### För 3 Feature Goals:
- **Minimivärde:** 1890 tokens
- **Maximivärde:** 7680 tokens

---

## ⚠️ Problem Med Min Optimering

### 1. **Vi Förlorar Viktig Information**
- **userStories:** Vi tar bort 1-4 user stories som kan innehålla viktiga acceptanskriterier
- **flowSteps:** Vi tar bort 0-3 steg som kan vara viktiga för att förstå flödet
- **subprocesses/serviceTasks/userTasks/businessRules:** Dessa används i prompten för att generera detaljerade `when/then` i subprocessSteps

### 2. **Kvaliteten På E2E-scenarios Kan Sjunka**
- LLM får inte all information den behöver
- Kan generera generiska scenarios istället för konkreta
- Kan missa viktiga steg eller acceptanskriterier

### 3. **Token-minskningen Är Inte Så Stor Som Förväntat**
- Om vi har 3 Feature Goals med 4-8 flowSteps och 3-6 userStories var:
  - flowSteps: 3 Feature Goals × 3 extra steg × 25 tokens = **225 tokens**
  - userStories: 3 Feature Goals × 4 extra user stories × 75 tokens = **900 tokens**
  - **Totalt:** ~1125 tokens (inte 5000-8000 som jag sa)

---

## ✅ Bättre Optimering

### Strategi 1: Ta Bort Stora Arrays, Behåll Viktiga Data

**Ta bort:**
- `subprocesses` (100-500 tokens) - kan infereras från BPMN
- `serviceTasks` (150-500 tokens) - kan infereras från BPMN
- `userTasks` (150-500 tokens) - kan infereras från BPMN
- `businessRules` (90-250 tokens) - kan infereras från BPMN

**Behåll:**
- `flowSteps` (alla) - **kritiskt för action/assertion**
- `userStories` (alla) - **kritiskt för assertion**
- `dependencies` (valfritt) - kan vara viktigt för kontext

**Token-minskning:** 490-1750 tokens per Feature Goal
**För 3 Feature Goals:** 1470-5250 tokens

### Strategi 2: Förenkla System Prompt

**Nuvarande:** 486 rader (~2000-3000 tokens)
**Förenklad:** ~200 rader (~800-1200 tokens)

**Token-minskning:** 1200-1800 tokens

### Strategi 3: Kombinera Båda

**Total minskning:**
- Strategi 1: 1470-5250 tokens
- Strategi 2: 1200-1800 tokens
- **Totalt:** 2670-7050 tokens

**Före:** 9000-14000 tokens
**Efter:** 1950-11330 tokens (med behållen kvalitet)

---

## 🎯 Rekommendation

### Kortsiktigt:
1. **Behåll ALLA flowSteps och userStories** (kritiskt för kvalitet)
2. **Ta bort subprocesses, serviceTasks, userTasks, businessRules** (kan infereras från BPMN)
3. **Öka maxTokens till 3000** (för säkerhets skull)

### Långsiktigt:
1. **Förenkla system prompten** (reducera från 486 rader till ~200 rader)
2. **Överväg att dela upp genereringen** (root-level först, sedan subprocessSteps)

---

## 📊 Jämförelse

| Approach | flowSteps | userStories | Arrays | System Prompt | Totalt | Kvalitet |
|----------|-----------|-------------|--------|---------------|--------|----------|
| **Nuvarande** | Alla | Alla | Alla | 486 rader | 9000-14000 | Hög |
| **Min optimering** | 5 första | 2 första | Inga | 486 rader | 3500-5800 | **Låg** |
| **Bättre optimering** | Alla | Alla | Inga | 486 rader | 4500-8500 | Hög |
| **Bästa optimering** | Alla | Alla | Inga | 200 rader | 2500-5500 | Hög |



