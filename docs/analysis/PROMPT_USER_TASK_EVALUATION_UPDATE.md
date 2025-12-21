# Uppdatering: Claude Evaluering av User Task Användare

**Datum:** 2025-01-XX  
**Status:** ✅ Implementerad

---

## 📊 Problem

Tidigare förlitade sig systemet på BPMN lane-namn för att avgöra om en User Task var kund eller handläggare. Men lane-namn kan vara missvisande:

**Exempel:**
- En lane som heter "application" kan innehålla både kund-uppgifter (t.ex. "Register source of equity") och handläggare-uppgifter (t.ex. "Evaluate application")
- Lane-namn är inte alltid representativa för vem som faktiskt genomför uppgiften

---

## ✅ Lösning

### Uppdaterad Prompt-strategi

Istället för att förlita sig på lane-namn, instruerar vi nu Claude att **själv evaluera** om en User Task är kund eller handläggare baserat på:

1. **Task-namnet** - Vad säger namnet om vem som gör uppgiften?
2. **Funktionalitet** - Vad gör uppgiften? Samlar den in information från kunden eller bedömer/granskar information?
3. **Lane som HINT** - Lane-information används som en hint, inte som absolut sanning

### Nya Instruktioner i Prompten

**Lagt till i `feature_epic_prompt.md` (v1.9.0):**

1. **Kritiskt avsnitt om evaluering:**
   - Tydliga principer för vad som är kund- vs handläggare-uppgifter
   - Exempel på båda typerna
   - Instruktioner om hur man evaluerar baserat på task-namn och funktionalitet

2. **Uppdaterad `processContext.lane` beskrivning:**
   - Lane-information används som **HINT**, inte som absolut sanning
   - Claude måste själv evaluera baserat på task-namnet och funktionalitet

3. **Uppdaterade fält-instruktioner:**
   - `summary`: Evaluera själv om kund eller handläggare
   - `flowSteps`: Använd korrekt användarbenämning baserat på evaluering
   - `userStories`: Evaluera roll baserat på task-namn och funktionalitet

---

## 🔍 Teknisk Detalj

### Kund-uppgifter (Identifiering)

**Nyckelord i task-namn:**
- "register", "upload", "fill", "consent", "confirm"
- "provide", "submit", "enter"

**Funktionalitet:**
- Kunden fyller i information
- Kunden laddar upp dokument
- Kunden bekräftar eller godkänner något
- Kunden interagerar med systemet för att starta/fortsätta process

**Exempel:**
- "Register source of equity" → **Kund**
- "Upload documentation" → **Kund**
- "Consent to credit check" → **Kund**
- "Fill in application" → **Kund**

### Handläggare/anställd-uppgifter (Identifiering)

**Nyckelord i task-namn:**
- "review", "evaluate", "assess", "granska", "utvärdera", "verify"
- "advanced-underwriting", "manual", "distribute", "archive"
- "board", "committee", "four eyes"

**Funktionalitet:**
- Anställd granskar, utvärderar eller bedömer
- Kräver expertkunskap eller intern bedömning
- Interna processer (t.ex. board decision)

**Exempel:**
- "Evaluate application" → **Handläggare**
- "Review KYC" → **Handläggare**
- "Four eyes review" → **Handläggare**
- "Advanced underwriting" → **Handläggare**

### Evalueringsprocess

1. **Titta på task-namnet**: Innehåller det kund- eller handläggare-nyckelord?
2. **Titta på funktionalitet**: Vad gör uppgiften? Samlar den in information eller bedömer den?
3. **Använd lane som HINT**: Om lane är "Stakeholder" → troligen kund. Om lane är "Caseworker" → troligen handläggare. Men lita inte blint på lane-namnet.

---

## ✅ Resultat

När Claude genererar dokumentation kommer den nu att:

1. **Evaluera själv** om en User Task är kund eller handläggare baserat på task-namn och funktionalitet
2. **Använda lane som HINT**, inte som absolut sanning
3. **Hantera specialfall** där lane-namnet är missvisande (t.ex. "application" lane med både kund- och handläggare-uppgifter)
4. **Använda korrekt användarbenämning** i alla fält (summary, flowSteps, userStories)

---

## 📝 Exempel

### Före:
- Task: "Register source of equity" i lane "application"
- Claude använder lane "application" → otydligt om kund eller handläggare
- Resultat: Kan bli inkorrekt beroende på hur lane tolkas

### Efter:
- Task: "Register source of equity" i lane "application"
- Claude evaluerar: "register" → kund-nyckelord, funktionalitet är att samla in information → **Kund**
- Lane "application" används som hint men inte som absolut sanning
- Resultat: **Kund** (korrekt)

### Specialfall:
- Task: "Evaluate application" i lane "application"
- Claude evaluerar: "evaluate" → handläggare-nyckelord, funktionalitet är att bedöma → **Handläggare**
- Lane "application" används som hint men evaluering baseras på task-namn
- Resultat: **Handläggare** (korrekt)

---

## 🔧 Relaterade Filer

- `prompts/llm/feature_epic_prompt.md` - Uppdaterad med evalueringsinstruktioner (v1.9.0)
- `docs/analysis/PROMPT_USER_TASK_EVALUATION_UPDATE.md` - Denna dokumentation



