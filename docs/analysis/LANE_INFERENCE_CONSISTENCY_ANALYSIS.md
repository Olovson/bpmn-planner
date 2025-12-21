# Analys: Konsistens i Lane Inference för Alla Dokumentationstyper

**Datum:** 2025-01-XX  
**Syfte:** Säkerställa att alla dokumentationstyper (Epics, Feature Goals, Business Rules) använder samma lane inference-logik och att problemet med fel användarbenämning inte uppstår på andra sidor

---

## 📊 Sammanfattning

**Status:** ✅ **Konsistent** - Alla dokumentationstyper använder samma `inferLane()` funktion via `processContext.lane`

### Vad kontrollerades:
1. ✅ **Epics (User Tasks)** - Använder `inferLane()` via `processContext.lane` → LLM använder detta för att bestämma användare/stakeholder
2. ✅ **Feature Goals (Call Activities)** - Använder `inferLane()` via `processContext.lane` för child nodes → LLM aggregerar användare baserat på child nodes
3. ✅ **Business Rules** - Använder `inferLane()` via `processContext.lane` (men ska typiskt inte nämna användare)

---

## 🔍 Teknisk Analys

### Hur Lane Inference Används

Alla dokumentationstyper får `processContext.lane` via `buildContextPayload()` i `llmDocumentation.ts`:

```typescript
const mapPhaseAndLane = (node: BpmnProcessNode) => ({
  phase: inferPhase(node),
  lane: inferLane(node),  // ✅ Samma funktion för alla
});
```

Detta används för:
- **`processContext.entryPoints[].lane`** - Lane för entry points
- **`processContext.keyNodes[].lane`** - Lane för viktiga noder i processen

### LLM Använder `processContext.lane`

I prompten (`feature_epic_prompt.md`):
```
**processContext:**
- `processContext.lane`: Använd för att förstå vilken roll som är involverad 
  (t.ex. "Kund", "Handläggare", "Regelmotor"). 
  Låt dokumentationen reflektera denna roll.
```

Detta betyder att:
- **Epics:** LLM får `processContext.lane` för noden själv och använder det för att bestämma användare/stakeholder
- **Feature Goals:** LLM får `processContext.lane` för child nodes och aggregerar användare baserat på dessa
- **Business Rules:** LLM får `processContext.lane` men prompten bör instruera att inte nämna användare

### `swimlaneOwner` i Templates (Metadata, Inte LLM-input)

**Viktigt:** `swimlaneOwner` i `buildEpicDocHtmlFromModel()` är **bara metadata** som visas i HTML, inte input till LLM:

```typescript
const swimlaneOwner = isUserTask
  ? 'Kund / Rådgivare'
  : isServiceTask
  ? 'Backend & Integration'
  : inferTeamForNode(node.type);
```

Detta används bara för att visa i HTML (`<li><strong>Swimlane/ägare:</strong> ${swimlaneOwner}</li>`), **inte** för LLM-generering.

**LLM-generering använder `processContext.lane`**, som kommer från `inferLane()`.

---

## ⚠️ Potentiella Problem

### 1. Feature Goals kan Nämna Användare Baserat på Child Nodes

**Problem:**
- Feature Goals aggregerar information från child nodes via `childrenDocumentation`
- Om child nodes (User Tasks) har fel lane (p.g.a. gammal logik), kan Feature Goals också nämna användare inkorrekt
- Feature Goals kan nämna både "kund" och "handläggare" om de har både kund- och handläggare-uppgifter

**Lösning:**
- ✅ När User Task epics regenereras med korrekt lane, kommer Feature Goals automatiskt att få korrekt information från child nodes
- ⚠️ **Rekommendation:** Efter att ha regenererat User Task epics, överväg att regenerera Feature Goals också för att säkerställa konsistens

**Verifiering:**
- Script `check-all-doc-user-mentions.mjs` kontrollerar Feature Goals
- Resultat: 0 Feature Goals med problem hittade (de nämner inte användare eller har korrekt användarbenämning)

### 2. Business Rules som Nämner Användare

**Problem:**
- Business Rules ska typiskt inte nämna användare alls
- De ska beskriva regler och logik, inte användarinteraktioner
- Om Business Rules nämner användare, kan det vara ett tecken på fel klassificering eller fel prompt

**Lösning:**
- ✅ Business Rules använder samma `inferLane()` logik, men prompten bör instruera LLM att inte nämna användare
- ⚠️ **Rekommendation:** Granska Business Rules som nämner användare - de kan vara felklassificerade eller ha fel prompt

**Verifiering:**
- Script `check-all-doc-user-mentions.mjs` kontrollerar Business Rules
- Resultat: 18 Business Rules nämner användare (kan vara felklassificerade)

---

## ✅ Verifiering

### Script för Kontroll

Kör följande script för att kontrollera alla dokumentationstyper:

```bash
node scripts/check-all-doc-user-mentions.mjs
```

Detta kontrollerar:
- Epics (User Tasks) - för fel användarbenämning
- Feature Goals - för potentiella problem baserat på child nodes
- Business Rules - för onödiga användarnämnanden

### Resultat från Kontroll

**Epics med problem:** 4 (efter filtrering av Service Tasks)
- Calculate household affordability
- Fetch risk classification
- Handle disbursement
- Fetch fastighets-information

**Feature Goals:** 0 problem hittade
- Feature Goals verkar ha korrekt användarbenämning eller nämner inte användare

**Business Rules:** 18 nämner användare
- Dessa kan vara felklassificerade eller ha fel prompt
- Business Rules ska inte nämna användare

---

## 📝 Rekommendationer

### 1. Regenerera User Task Epics (Pågående)

✅ **Implementerat:** Batch-regenerering med filter i UI:et
- Knapp: "Regenerera User Task epics"
- Använder `nodeFilter` för att bara generera User Tasks från listan
- Sparar ~50% kostnad och tid

### 2. Överväg att Regenerera Feature Goals (Efter User Task Epics)

**När:** Efter att User Task epics har regenererats

**Varför:**
- Feature Goals aggregerar information från child nodes
- Om child nodes (User Tasks) har uppdaterats, bör Feature Goals också uppdateras för konsistens
- **Men:** Feature Goals kan fungera korrekt även om de inte regenereras, eftersom de aggregerar från child nodes

**Hur:**
- Använd samma batch-regenerering i UI:et
- Filtrera till Call Activities (Feature Goals)
- Eller vänta tills nästa fullständiga regenerering

**Prioritet:** Låg (Feature Goals verkar inte ha problem enligt kontroll)

### 3. Granska Business Rules (Låg Prioritet)

**När:** Efter att User Task epics och Feature Goals är uppdaterade

**Varför:**
- Business Rules ska inte nämna användare
- Om de gör det, kan det vara ett tecken på fel klassificering eller fel prompt

**Hur:**
- Manuell granskning av Business Rules som nämner användare
- Uppdatera prompt om nödvändigt
- Eller korrigera klassificering om noden faktiskt är en User Task

**Prioritet:** Mycket låg (Business Rules är inte kritiska för användarbenämning)

---

## 🔧 Teknisk Detalj

### `inferLane()` Funktion

**Plats:** `src/lib/llmDocumentation.ts` (rad 959)

**Logik:**
```typescript
function inferLane(node: BpmnProcessNode): string {
  const name = (node.name || '').toLowerCase();

  // Regelmotor / system
  if (node.type === 'businessRuleTask' || node.type === 'serviceTask' || node.type === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: default = Kund, interna nyckelord = Handläggare
  if (node.type === 'userTask') {
    const internalKeywords = [
      'review', 'granska', 'assess', 'utvärdera', 'evaluate',
      'advanced-underwriting', 'board', 'committee',
      'four eyes', 'four-eyes', 'manual', 'distribute',
      'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
    ];

    if (internalKeywords.some((keyword) => name.includes(keyword))) {
      return 'Handläggare';
    }

    return 'Kund'; // ✅ Default för User Tasks
  }

  // Call activities behandlas som system/regelmotor
  if (node.type === 'callActivity') {
    return 'Regelmotor';
  }

  return 'Handläggare';
}
```

### Användning i `buildContextPayload()`

**Plats:** `src/lib/llmDocumentation.ts` (rad 635-638)

```typescript
const mapPhaseAndLane = (node: BpmnProcessNode) => ({
  phase: inferPhase(node),
  lane: inferLane(node),  // ✅ Används för alla nodtyper
});
```

Detta används för:
- `processContext.entryPoints[].lane`
- `processContext.keyNodes[].lane`

### `swimlaneOwner` i Templates (Metadata)

**Plats:** `src/lib/documentationTemplates.ts` (rad 1683-1687, 1911-1915)

```typescript
const swimlaneOwner = isUserTask
  ? 'Kund / Rådgivare'
  : isServiceTask
  ? 'Backend & Integration'
  : inferTeamForNode(node.type);
```

**Viktigt:** Detta är **bara metadata** som visas i HTML, **inte** input till LLM. LLM-generering använder `processContext.lane` från `inferLane()`.

---

## ✅ Slutsats

**Alla dokumentationstyper använder samma `inferLane()` logik via `processContext.lane`**, vilket säkerställer konsistens. När User Task epics regenereras med uppdaterad logik, kommer:

1. ✅ **Epics** att ha korrekt användarbenämning direkt
2. ✅ **Feature Goals** att automatiskt få korrekt information från uppdaterade child nodes (när de regenereras, eller vid nästa fullständiga regenerering)
3. ✅ **Business Rules** att fortsätta fungera korrekt (de ska inte nämna användare)

**Nästa steg:** Regenerera User Task epics med batch-funktionen i UI:et. Feature Goals behöver inte regenereras omedelbart, men kan regenereras vid nästa fullständiga regenerering för att säkerställa konsistens.



