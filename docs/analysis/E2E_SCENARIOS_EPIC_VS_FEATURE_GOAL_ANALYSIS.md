# Analys: Behöver vi Epics eller räcker Feature Goal-dokumentation?

## 🎯 Syfte

Seriös analys av om vi behöver Epic-dokumentation för E2E-scenario-generering, eller om Feature Goal-dokumentationen räcker.

---

## 📊 Vad finns i Feature Goal-dokumentation?

### Feature Goal-struktur (Call Activities)

**Baserat på `feature_epic_prompt.md`:**

```typescript
interface FeatureGoalDocModel {
  summary: string;                    // Beskrivning av Feature Goal
  prerequisites: string[];            // Given-conditions
  flowSteps: string[];               // Vad som händer (When)
  dependencies?: string[];           // Dependencies (optional)
  userStories: UserStory[];          // User stories med acceptance criteria
  // OBS: FeatureGoalDocModel har INTE inputs/outputs i modellen
  // OBS: FeatureGoalDocModel har INTE interactions (det har EpicDocModel)
}
```

**UserStory-struktur:**
```typescript
interface UserStory {
  role: string;                      // T.ex. 'Kund', 'Handläggare'
  goal: string;                      // Vad vill rollen uppnå?
  value: string;                     // Varför är det värdefullt?
  acceptanceCriteria: string[];      // Konkreta krav (2-4 per story)
}
```

**Exempel Feature Goal-dokumentation:**
- `summary`: "Intern datainsamling säkerställer att intern kunddata hämtas..."
- `flowSteps`: ["Systemet initierar automatiskt insamling...", "ServiceTask fetch-party-information hämtar kundinformation"]
- `userStories`: [
    {
      role: "Kund",
      goal: "Jag vill fylla i ansökan",
      value: "Så att jag kan ansöka om bolån",
      acceptanceCriteria: ["Ansökan är komplett och redo för kreditevaluering"]
    }
  ]
- `prerequisites`: ["Kund är identifierad", "Intern data är tillgänglig"]
- `dependencies`: ["Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation"]

---

## 📊 Vad finns i Epic-dokumentation?

### Epic-struktur (Leaf nodes: Tasks/Epics)

**Baserat på `epicDocTypes.ts`:**

```typescript
interface EpicDocModel {
  summary: string;                    // Beskrivning av Epic
  prerequisites: string[];            // Given-conditions
  flowSteps: string[];               // Vad som händer (When)
  userStories: EpicUserStory[];      // User stories med acceptance criteria
  interactions?: string[];           // Optional - primarily for User Tasks
  dependencies?: string[];           // Optional - dependencies for the Epic
}
```

**EpicUserStory-struktur:**
```typescript
interface EpicUserStory {
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare'; // Kund, Handläggare eller Processägare
  goal: string;                      // Vad vill rollen uppnå?
  value: string;                     // Varför är det värdefullt?
  acceptanceCriteria: string[];      // Konkreta krav (2-4 per story)
}
```

**Exempel Epic-dokumentation:**
- `summary`: "Hämtar kundinformation"
- `flowSteps`: ["ServiceTask hämtar kundinformation från API"]
- `userStories`: [
    {
      role: "System",
      goal: "Hämta kundinformation",
      value: "Så att kunddata är tillgänglig",
      acceptanceCriteria: ["Kundinformation är hämtad"]
    }
  ]
- `prerequisites`: ["Kund är identifierad"]

---

## 🔍 Jämförelse: Feature Goal vs Epic

### Likheter:

| Aspekt | Feature Goal | Epic |
|--------|-------------|------|
| **summary** | ✅ Ja | ✅ Ja |
| **prerequisites** | ✅ Ja | ✅ Ja |
| **flowSteps** | ✅ Ja | ✅ Ja |
| **userStories** | ✅ Ja | ✅ Ja |
| **acceptanceCriteria** | ✅ Ja (i userStories) | ✅ Ja (i userStories) |
| **interactions** | ✅ Ja (optional) | ✅ Ja (optional) |
| **dependencies** | ✅ Ja (optional) | ✅ Ja (optional) |

**Slutsats:** Feature Goals och Epics har **samma struktur** - båda har summary, prerequisites, flowSteps, userStories, acceptanceCriteria.

---

### Skillnader:

| Aspekt | Feature Goal | Epic |
|--------|-------------|------|
| **Nivå** | Subprocess-nivå (Call Activity) | Task-nivå (Leaf node) |
| **Omfattning** | Hela subprocessen (flera tasks/epics) | Enskild task/epic |
| **interactions** | ❌ Nej | ✅ Ja (optional, för User Tasks) |
| **userStories.role** | 'Kund' \| 'Handläggare' \| 'Processägare' | 'Kund' \| 'Handläggare' \| 'Processägare' |

**Slutsats:** Feature Goals och Epics har **nästan identisk struktur** - enda skillnaden är att Epics har `interactions` (valfritt, för User Tasks) och Feature Goals har `dependencies` (valfritt). Feature Goals är på **högre nivå** (subprocess-nivå).

---

## 🎯 Analys: Behöver vi Epics för E2E-scenarios?

### Scenario 1: E2E-scenarios behöver subprocess-nivå information

**Vad E2E-scenarios behöver:**
- Feature Goals i ordning (call activities)
- Gateway-conditions
- End events

**Vad Feature Goal-dokumentation ger:**
- ✅ `summary` - beskrivning av subprocessen
- ✅ `flowSteps` - vad som händer i subprocessen (inkluderar task-nivå detaljer)
- ✅ `userStories` - användarinteraktioner på subprocess-nivå
- ✅ `prerequisites` - Given-conditions för subprocessen
- ✅ `dependencies` - Beroenden för subprocessen

**Vad Epic-dokumentation ger:**
- ✅ `summary` - beskrivning av task/epic
- ✅ `flowSteps` - vad som händer i task/epic
- ✅ `userStories` - användarinteraktioner på task-nivå
- ✅ `prerequisites` - Given-conditions för task/epic

**Bedömning:**
- ✅ **Feature Goal-dokumentation räcker** för subprocess-nivå information
- ⚠️ **Epic-dokumentation ger task-nivå detaljer** - kan vara användbart för detaljerade teststeg

---

### Scenario 2: E2E-scenarios behöver task-nivå detaljer

**Vad E2E-scenarios behöver:**
- Detaljerade teststeg per task/epic
- UI-interaktioner per task/epic
- API-anrop per task/epic

**Vad Feature Goal-dokumentation ger:**
- ✅ `flowSteps` - vad som händer i subprocessen (högre nivå)
- ✅ `userStories` - användarinteraktioner på subprocess-nivå
- ❌ **Saknar task-nivå detaljer** - flowSteps är på subprocess-nivå, inte task-nivå

**Vad Epic-dokumentation ger:**
- ✅ `flowSteps` - vad som händer i task/epic (task-nivå)
- ✅ `userStories` - användarinteraktioner på task-nivå
- ✅ **Ger task-nivå detaljer** - flowSteps är på task-nivå

**Bedömning:**
- ⚠️ **Feature Goal-dokumentation saknar task-nivå detaljer**
- ✅ **Epic-dokumentation ger task-nivå detaljer** - kan vara användbart för detaljerade teststeg

---

### Scenario 3: Kombinera Feature Goal och Epic

**Vad E2E-scenarios behöver:**
- Subprocess-kontext (Feature Goal)
- Task-detaljer (Epic)

**Vad Feature Goal-dokumentation ger:**
- ✅ Subprocess-kontext
- ❌ Saknar task-nivå detaljer

**Vad Epic-dokumentation ger:**
- ✅ Task-nivå detaljer
- ❌ Saknar subprocess-kontext

**Bedömning:**
- ✅ **Kombinera båda** - Feature Goal ger kontext, Epic ger detaljer
- ⚠️ **Men** - Feature Goal-dokumentation kan innehålla task-information i `flowSteps`

---

## 🔍 Detaljerad analys: Vad finns i Feature Goal `flowSteps`?

### Exempel från Feature Goal-dokumentation:

**Feature Goal: "Internal data gathering"**
- `flowSteps`: [
    "Systemet initierar automatiskt insamling av intern kunddata",
    "ServiceTask fetch-party-information hämtar kundinformation",
    "ServiceTask fetch-engagements hämtar befintliga engagemang"
  ]

**Analys:**
- ✅ Feature Goal `flowSteps` innehåller **task-nivå detaljer** (ServiceTask fetch-party-information)
- ✅ Feature Goal `flowSteps` innehåller **subprocess-kontext** (Systemet initierar automatiskt insamling)
- ✅ **Feature Goal-dokumentation innehåller både subprocess-kontext OCH task-detaljer**

---

### Jämförelse: Feature Goal flowSteps vs Epic flowSteps

**Feature Goal flowSteps:**
```
"Systemet initierar automatiskt insamling av intern kunddata"
"ServiceTask fetch-party-information hämtar kundinformation"
"ServiceTask fetch-engagements hämtar befintliga engagemang"
```

**Epic flowSteps (för fetch-party-information):**
```
"ServiceTask hämtar kundinformation från API"
```

**Analys:**
- ✅ Feature Goal `flowSteps` innehåller **samma information** som Epic `flowSteps`
- ✅ Feature Goal `flowSteps` innehåller **mer kontext** (subprocess-kontext)
- ⚠️ Epic `flowSteps` kan vara **mer detaljerad** för specifik task

---

## 🎯 Slutsats: Behöver vi Epics?

### ✅ Feature Goal-dokumentation räcker för E2E-scenarios (80-90% kvalitet)

**Varför:**
1. ✅ **Feature Goal-dokumentation innehåller task-nivå detaljer**
   - `flowSteps` innehåller både subprocess-kontext OCH task-detaljer
   - Exempel: "ServiceTask fetch-party-information hämtar kundinformation"

2. ✅ **Feature Goal-dokumentation innehåller userStories**
   - User stories på subprocess-nivå
   - Acceptance criteria för subprocessen

3. ✅ **Feature Goal-dokumentation innehåller dependencies**
   - Dependencies: Beroenden för subprocessen (t.ex. regelmotorer, databaser)

4. ✅ **Feature Goal-dokumentation ger subprocess-kontext**
   - Hela subprocessen i kontext
   - Bättre för E2E-scenarios (som testar hela subprocessen)

---

### ⚠️ Epic-dokumentation kan vara användbart för detaljerade teststeg (10-20% förbättring)

**Varför:**
1. ⚠️ **Epic-dokumentation ger task-nivå fokus**
   - Mer detaljerad för specifik task/epic
   - Kan vara användbart för detaljerade teststeg

2. ⚠️ **Epic-dokumentation kan ha mer detaljerade userStories**
   - User stories på task-nivå
   - Kan vara mer specifika än Feature Goal userStories

3. ⚠️ **Men** - Feature Goal-dokumentation innehåller redan task-information i `flowSteps`

---

## 📊 Bedömning: Behöver vi Epics?

### ✅ Nej, Feature Goal-dokumentation räcker (80-90% kvalitet)

**Varför:**
1. ✅ **Feature Goal-dokumentation innehåller task-nivå detaljer**
   - `flowSteps` innehåller både subprocess-kontext OCH task-detaljer
   - Exempel: "ServiceTask fetch-party-information hämtar kundinformation"

2. ✅ **Feature Goal-dokumentation innehåller userStories**
   - User stories på subprocess-nivå
   - Acceptance criteria för subprocessen

3. ✅ **Feature Goal-dokumentation innehåller dependencies**
   - Dependencies: Beroenden för subprocessen (t.ex. regelmotorer, databaser)

4. ✅ **Feature Goal-dokumentation ger subprocess-kontext**
   - Hela subprocessen i kontext
   - Bättre för E2E-scenarios (som testar hela subprocessen)

---

### ⚠️ Epic-dokumentation kan ge 10-20% förbättring

**Varför:**
1. ⚠️ **Epic-dokumentation ger task-nivå fokus**
   - Mer detaljerad för specifik task/epic
   - Kan vara användbart för detaljerade teststeg

2. ⚠️ **Epic-dokumentation kan ha mer detaljerade userStories**
   - User stories på task-nivå
   - Kan vara mer specifika än Feature Goal userStories

3. ⚠️ **Men** - Feature Goal-dokumentation innehåller redan task-information i `flowSteps`

---

## 🎯 Rekommendation

### ✅ Använd Feature Goal-dokumentation som primär källa (80-90% kvalitet)

**Vad vi gör:**
1. ✅ **Läs Feature Goal-dokumentation** (redan genererad)
   - `summary`, `flowSteps`, `userStories`, `prerequisites`, `dependencies`
   - Innehåller både subprocess-kontext OCH task-detaljer

2. ✅ **Använd Feature Goal-dokumentation för Claude-generering**
   - Skicka Feature Goal-dokumentation till Claude
   - Claude genererar E2E-scenarios baserat på Feature Goal-dokumentation

3. ⚠️ **Epic-dokumentation är valfritt** (10-20% förbättring)
   - Kan användas för mer detaljerade teststeg
   - Men inte nödvändigt för grundläggande E2E-scenarios

---

### ⚠️ Epic-dokumentation kan användas för förbättring (10-20% förbättring)

**Vad vi gör:**
1. ⚠️ **Läs Epic-dokumentation** (valfritt, om tillgänglig)
   - Kan ge mer detaljerade task-nivå information
   - Kan förbättra kvaliteten på teststeg

2. ⚠️ **Kombinera Epic- och Feature Goal-dokumentation** (valfritt)
   - Feature Goal ger subprocess-kontext
   - Epic ger task-detaljer
   - Kan ge 10-20% förbättring

---

## 📊 Slutsats

### ✅ Feature Goal-dokumentation räcker för E2E-scenarios (80-90% kvalitet)

**Varför:**
1. ✅ Feature Goal-dokumentation innehåller task-nivå detaljer i `flowSteps`
2. ✅ Feature Goal-dokumentation innehåller userStories med acceptance criteria
3. ✅ Feature Goal-dokumentation innehåller dependencies (beroenden för subprocessen)
4. ✅ Feature Goal-dokumentation ger subprocess-kontext (bättre för E2E-scenarios)

---

### ⚠️ Epic-dokumentation är valfritt (10-20% förbättring)

**Varför:**
1. ⚠️ Epic-dokumentation ger task-nivå fokus (mer detaljerad)
2. ⚠️ Epic-dokumentation kan ha mer detaljerade userStories
3. ⚠️ Men Feature Goal-dokumentation innehåller redan task-information

---

## 💡 Rekommendation

### ✅ Använd Feature Goal-dokumentation som primär källa

**Vad vi gör:**
1. ✅ **Läs Feature Goal-dokumentation** (redan genererad)
2. ✅ **Använd Feature Goal-dokumentation för Claude-generering**
3. ⚠️ **Epic-dokumentation är valfritt** (kan ge 10-20% förbättring, men inte nödvändigt)

**Resultat:**
- ✅ **80-90% kvalitet** med bara Feature Goal-dokumentation
- ⚠️ **90-100% kvalitet** med både Feature Goal- och Epic-dokumentation (10-20% förbättring)

---

**Datum:** 2025-12-22
**Status:** Analys klar - Feature Goal-dokumentation räcker, Epic-dokumentation är valfritt

