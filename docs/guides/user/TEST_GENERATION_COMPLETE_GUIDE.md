# Komplett Guide: Testfall-generering med Claude

## 🎯 Översikt

Systemet genererar testfall från befintlig dokumentation och BPMN-processflöde **med Claude**.

**VIKTIGT:** Systemet läser från **befintlig dokumentation** och ändrar den inte.

---

## 🔄 Hur Det Fungerar

### Steg 1: Extrahera User Stories

Systemet läser befintlig Epic- och Feature Goal-dokumentation från Supabase Storage:

1. **Läser HTML-filer** från `docs/claude/epics/` och `docs/claude/feature-goals/`
2. **Parserar HTML** för att hitta user stories med acceptanskriterier
3. **Strukturerar data** till `ExtractedUserStory[]`

**Exempel:**
```typescript
{
  id: "US-1",
  role: "Kund",
  goal: "skapa ansökan",
  value: "jag kan ansöka om lån",
  acceptanceCriteria: [
    "Systemet ska validera att alla obligatoriska fält är ifyllda",
    "Systemet ska visa tydliga felmeddelanden om fält saknas"
  ],
  bpmnFile: "mortgage-se-application.bpmn",
  bpmnElementId: "application"
}
```

---

### Steg 2: Bygg BPMN-processgraf

Systemet bygger en graf från BPMN-filer:

1. **Läser BPMN-filer** och parserar struktur
2. **Identifierar paths** (happy-path, error-path)
3. **Extraherar error events** och gateways
4. **Bygger graf** med nodtyper, sequence flows, dependencies

**Exempel:**
```typescript
{
  root: {
    id: "fetch-party-information",
    type: "ServiceTask",
    name: "Fetch party information",
    children: [
      { id: "screen-party", type: "BusinessRuleTask", ... },
      { id: "is-party-rejected", type: "Gateway", ... }
    ]
  }
}
```

---

### Steg 3: Bygg Kontext för Claude

Systemet kombinerar user stories + BPMN-processflöde:

1. **Kombinerar** user stories från dokumentation med BPMN-processflöde
2. **Inkluderar** dokumentation (summary, flowSteps, dependencies)
3. **Inkluderar** BPMN-struktur (paths, error events, gateways)

**Kontext-payload:**
```typescript
{
  nodeContext: {
    bpmnFile: "mortgage-se-application.bpmn",
    elementId: "application",
    nodeType: "userTask",
    nodeName: "Application"
  },
  documentation: {
    userStories: [...],
    summary: "...",
    flowSteps: [...],
    dependencies: [...]
  },
  bpmnProcessFlow: {
    paths: [...],
    errorEvents: [...],
    gateways: [...]
  }
}
```

---

### Steg 4: Anropa Claude för Analys

Systemet anropar Claude med kontext:

1. **Claude analyserar** semantik (inte bara keywords)
2. **Claude genererar** konkreta steg baserat på dokumentation
3. **Claude identifierar** edge cases som kanske saknas
4. **Claude prioriterar** baserat på risk (inte bara roll)

**Claude-output:**
```json
{
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Happy Path: Skapa ansökan",
      "description": "Kunden skapar ansökan genom att fylla i formulär och skicka in",
      "category": "happy-path",
      "priority": "P1",
      "steps": [
        {
          "order": 1,
          "action": "Kunden öppnar ansökningsformuläret",
          "expectedResult": "Formuläret visas med alla obligatoriska fält markerade"
        },
        {
          "order": 2,
          "action": "Kunden fyller i personuppgifter (personnummer, namn, adress) och önskat lånebelopp",
          "expectedResult": "Alla fält är ifyllda och validerade i realtid"
        }
      ],
      "acceptanceCriteria": [...],
      "prerequisites": [...],
      "edgeCases": [...]
    }
  ]
}
```

---

### Steg 5: Validera och Spara

Systemet validerar och sparar scenarios:

1. **Validerar** Claude-output mot schema
2. **Konverterar** till TestScenario-format
3. **Sparar** till `node_planned_scenarios`-tabellen

---

## 📊 Kvalitet

### Vad Du Faktiskt Får

**Konkreta steg:**
- ✅ "Kunden fyller i personuppgifter (personnummer, namn, adress) och önskat lånebelopp"
- ✅ Inte bara "Systemet exekverar X"
- ✅ Baserat på dokumentation + BPMN-processflöde

**Korrekt kategorisering:**
- ✅ Semantisk analys (förstår kontexten, inte bara keywords)
- ✅ "Systemet ska validera fel" → happy-path (validering är normal funktionalitet)
- ✅ "Systemet ska visa felmeddelande" → error-case (felhantering)

**Identifierade edge cases:**
- ✅ "Ansökan med maximalt lånebelopp"
- ✅ "Ansökan med minimalt lånebelopp"

**Risk-baserad prioritering:**
- ✅ Error-case får P0 (högre prioritet)
- ✅ Happy-path får P1 (lägre prioritet)

**Vad saknas:**
- ❌ Konkreta API-endpoints: `POST /api/application`
- ❌ UI-selectors: `[data-testid='application-form']`
- ❌ Specifika testdata: `{ personnummer: "198001011234", ... }`

---

## 🛡️ Säkerhet

### Vad Kan Gå Fel

**1. Kvalitetsvariation (10-20% sannolikhet)**
- Claude kan generera scenarios med varierande kvalitet
- Vissa scenarios kan sakna detaljer
- Vissa scenarios kan ha felaktig kategorisering

**Mitigering:**
- ✅ Validering mot schema (struktur, men inte innehåll)
- ✅ Manuell översyn (rekommenderat)

**2. API-beroende (20-30% sannolikhet)**
- Claude API kan vara nere
- Rate limits kan begränsa användning
- API-anrop kan misslyckas

**Mitigering:**
- ✅ Error handling (graceful degradation)
- ✅ Om Claude misslyckas för en nod, hoppas den över och genereringen fortsätter för övriga noder

**3. Dokumentationskvalitet (30-40% sannolikhet)**
- Om dokumentation är vag → Claude genererar generiska scenarios
- Om dokumentation saknar detaljer → Claude kan inte generera konkreta steg

**Mitigering:**
- ⚠️ Kräver bra dokumentation (användarens ansvar)
- ✅ Claude använder BPMN-struktur som backup

---

## 👨‍💼 Hur En Testare Använder Detta

### 1. Navigera till Testgenerering-sidan

1. Öppna appen
2. Klicka på "Testgenerering"-knappen i vänstermenyn
3. Du ser en sektion för "Generera Testfall med Claude"

---

### 2. Generera Testfall

1. **Kontrollera att Claude API är aktiverad**
   - Se till att `VITE_USE_LLM=true` och `VITE_ANTHROPIC_API_KEY` är satt i din `.env`-fil
   - Om inte aktiverad, visas en varning

2. **Klicka på "Generera Testfall med Claude"**
   - Systemet extraherar user stories från dokumentation
   - Systemet bygger BPMN-processgraf
   - Systemet bygger kontext för Claude
   - Systemet anropar Claude för varje nod
   - Systemet validerar och sparar scenarios
   - **Tid:** Minuter (API-anrop per nod)
   - **Kostnad:** API-anrop per nod

3. **Se resultat**
   - Om lyckad: "X testscenarios genererade för Y noder"
   - Om misslyckad: Felmeddelande med detaljer

---

### 3. Använda Genererade Scenarios

**I Test Report-sidan:**
- Se översikt över alla scenarios
- Filtrera på process, status, kategori
- Klicka på en nod för att se dess scenarios

**I RightPanel:**
- Välj en nod i BPMN-viewern
- Öppna "Tests"-fliken
- Se alla scenarios för den noden

**För Testdesign:**
- Använd scenarios som grund för testfall
- Lägg till konkreta detaljer (API, UI, testdata)
- Prioritera baserat på riskLevel
- Följ steg-för-steg genom processen

---

## ⚠️ Viktiga Punkter

### 1. Inga Ändringar i Dokumentation

- Testgenereringen **läser endast** från befintlig dokumentation
- Den **ändrar inte** dokumentationen
- Du kan köra genereringen flera gånger utan risk

---

### 2. Kräver Befintlig Dokumentation

- För user story-scenarios: Du måste ha Epic- eller Feature Goal-dokumentation med user stories
- För process flow-scenarios: Du måste ha BPMN-filer
- Om dokumentation saknas: Inga scenarios genereras för den noden

---

### 3. Upsert-logik

- Systemet använder `upsert` (update or insert)
- Om du genererar om: Befintliga scenarios uppdateras
- Manuella ändringar: Bevaras om `bpmn_file`, `bpmn_element_id`, `provider`, `origin` matchar

---

### 4. Fallback

- Om Claude misslyckas för en nod: Noden hoppas över och genereringen fortsätter för övriga noder
- Om Claude API är nere: Inga scenarios genereras (men inget kraschar)

---

## 📊 Förväntad Kvalitet

### User Story-scenarios

**Kvalitet:** ⭐⭐⭐⭐ Hög (85-95%)

**Vad du får:**
- ✅ Konkreta steg baserat på dokumentation
- ✅ Korrekt kategorisering (semantisk analys)
- ✅ Identifierade edge cases
- ✅ Risk-baserad prioritering

**Säkerhet för kvalitet:**
- ⭐⭐⭐ Medel-Hög (70-80%)
- Fungerar bra om dokumentation är detaljerad
- Kan sakna detaljer om dokumentation är vag
- Kräver manuell översyn och redigering

---

### Process Flow-scenarios

**Kvalitet:** ⭐⭐⭐⭐ Hög (80-90%)

**Vad du får:**
- ✅ Konkreta steg baserat på dokumentation + BPMN
- ✅ Identifierade prerequisites
- ✅ Detaljerade expected results

**Säkerhet för kvalitet:**
- ⭐⭐⭐ Medel-Hög (70-80%)
- Fungerar bra om dokumentation är detaljerad
- Kan sakna detaljer om dokumentation är vag
- Kräver manuell översyn och redigering

---

## 💡 Rekommendationer

### För Bästa Kvalitet

1. **Säkerställ bra dokumentation**
   - Detaljerade user stories med acceptanskriterier
   - Tydliga flowSteps i dokumentationen
   - Specifika dependencies och prerequisites

2. **Manuell översyn**
   - Överskåda genererade scenarios
   - Redigera om nödvändigt
   - Lägg till konkreta detaljer (API, UI, testdata)

3. **Iterativ förbättring**
   - Generera scenarios
   - Använd i testdesign
   - Förbättra dokumentation baserat på feedback
   - Generera om för bättre kvalitet

---

## 📚 Ytterligare Information

- [`TEST_GENERATION_EXPLANATION.md`](./TEST_GENERATION_EXPLANATION.md) - Detaljerad förklaring
- [`TEST_GENERATION_SUMMARY.md`](./TEST_GENERATION_SUMMARY.md) - Snabb översikt
- [`TEST_GENERATION_EXPECTATIONS.md`](./TEST_GENERATION_EXPECTATIONS.md) - Vad du får
- [`../analysis/TEST_GENERATION_CLAUDE_CONCRETE_ANALYSIS.md`](../analysis/TEST_GENERATION_CLAUDE_CONCRETE_ANALYSIS.md) - Konkret analys

---

**Datum:** 2025-12-22
**Version:** 2.0.0 (Endast Claude)
