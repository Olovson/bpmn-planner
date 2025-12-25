# Jämförelse: Befintlig Test Coverage Explorer vs Föreslagen automatisk generering

## 🎯 Syfte

Jämföra vad som redan finns i "Test Coverage Explorer" med vad vi föreslår att automatiskt generera.

---

## 📊 Vad finns redan i Test Coverage Explorer

### 1. Hårdkodade E2E-scenarios

**Var:** `src/pages/E2eTestsOverviewPage.tsx`

**Vad:**
- Manuellt skapade E2E-scenarios (t.ex. `E2E_BR001`, `E2E_BR006`)
- Varje scenario innehåller:
  - `featureGoals`: Feature Goals (Call Activities) i ordning
  - `bankProjectTestSteps`: Teststeg med UI-interaktioner, API-anrop, DMN-beslut
  - `subprocessSteps`: Subprocess-steg med Given/When/Then
  - `given`, `when`, `then`: Scenario-beskrivningar

**Exempel:**
```typescript
{
  id: 'E2E_BR001',
  name: 'E2E-BR-001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)',
  type: 'happy-path',
  featureGoals: ['application', 'mortgage-commitment', 'object-valuation', ...],
  bankProjectTestSteps: [
    {
      bpmnNodeId: 'application',
      bpmnNodeType: 'CallActivity',
      action: 'Kunden fyller i komplett ansökan...',
      uiInteraction: 'Navigate: application-start...',
      apiCall: 'GET /api/party/information...',
      assertion: 'Ansökan är komplett...'
    }
  ]
}
```

---

### 2. Test Coverage Table

**Var:** `src/components/TestCoverageTable.tsx`

**Vad:**
- Visar hela kreditprocessen i tabellform
- Visar test coverage per nod (Call Activity)
- Visar test-information (Given, When, Then, UI-interaktion, API-anrop, DMN-beslut) per nod
- Bygger paths genom processen och visar vilka Feature Goals som ingår

**Funktionalitet:**
- Flattenar process tree till paths
- Matchar scenarios mot callActivities i paths
- Visar test-information per callActivity

---

### 3. Path-identifiering

**Var:** `src/lib/testCoverageHelpers.ts`

**Vad:**
- `flattenToPaths()`: Flattenar process tree till paths
- `buildTestInfoMap()`: Bygger map över test-information för callActivities
- `findTestInfoForCallActivity()`: Hittar test-information för en callActivity

**Funktionalitet:**
- Identifierar Feature Goals (Call Activities) i paths
- Kopplar scenarios till callActivities
- Visar test-information per path

---

## 🔍 Vad vi föreslår att automatiskt generera

### 1. Automatisk scenario-struktur (60-70% kvalitet)

**Vad:**
- Extrahera Feature Goals i paths från BPMN-filer
- Identifiera error paths
- Identifiera gateways
- Bygga grundläggande scenario-struktur

**Skillnad från befintligt:**
- ✅ **Automatisk** (istället för manuellt)
- ✅ **Dynamisk** (baserat på BPMN-filer)
- ❌ **Lägre kvalitet** (60-70% vs 100% manuellt)

---

### 2. Claude-förbättrad struktur (70-80% kvalitet)

**Vad:**
- Skicka scenario-struktur + Feature Goal-dokumentation till Claude
- Låt Claude tolka gateway-namn, lägga till Given/When/Then, identifiera test data-behov

**Skillnad från befintligt:**
- ✅ **Automatisk** (istället för manuellt)
- ✅ **Dynamisk** (baserat på BPMN-filer + Feature Goal-dokumentation)
- ❌ **Lägre kvalitet** (70-80% vs 100% manuellt)

---

## 📊 Jämförelse: Befintligt vs Föreslaget

| Aspekt | Befintligt (Test Coverage Explorer) | Föreslaget (Automatisk generering) |
|--------|-------------------------------------|-----------------------------------|
| **Scenario-struktur** | ✅ Manuellt skapad (100% kvalitet) | ⚠️ Automatisk (60-70% kvalitet) |
| **Feature Goals i paths** | ✅ Manuellt definierade | ⚠️ Automatisk extraktion (50-70% coverage) |
| **Given/When/Then** | ✅ Manuellt skrivna | ⚠️ Claude-genererade (70-80% kvalitet) |
| **UI-interaktioner** | ✅ Manuellt definierade | ❌ Saknas (0%) |
| **API-anrop** | ✅ Manuellt definierade | ❌ Saknas (0%) |
| **DMN-beslut** | ✅ Manuellt definierade | ❌ Saknas (0%) |
| **Test data** | ✅ Manuellt definierade | ❌ Saknas (0%) |
| **Underhåll** | ❌ Manuellt (tidskrävande) | ✅ Automatisk (snabb) |
| **Dynamisk** | ❌ Statisk (hårdkodad) | ✅ Dynamisk (baserat på BPMN) |

---

## 🎯 Slutsats

### Vad är samma sak?

1. ✅ **Feature Goals i paths** - Både befintligt och föreslaget identifierar Feature Goals i paths
2. ✅ **Path-identifiering** - Både befintligt och föreslaget bygger paths genom processen
3. ✅ **Scenario-struktur** - Både befintligt och föreslaget har scenario-struktur med Feature Goals

### Vad är skillnaden?

1. **Kvalitet:**
   - **Befintligt:** 100% kvalitet (manuellt skapad)
   - **Föreslaget:** 60-80% kvalitet (automatisk generering)

2. **Underhåll:**
   - **Befintligt:** Manuellt (tidskrävande)
   - **Föreslaget:** Automatisk (snabb)

3. **Dynamisk:**
   - **Befintligt:** Statisk (hårdkodad)
   - **Föreslaget:** Dynamisk (baserat på BPMN)

4. **Detaljnivå:**
   - **Befintligt:** Komplett (UI-interaktioner, API-anrop, DMN-beslut, test data)
   - **Föreslaget:** Grundstruktur (Feature Goals, paths, gateway-beslut)

---

## 💡 Rekommendation

### Vad ger faktiskt värde?

**Nej, det vi föreslår är INTE samma sak som befintligt:**

1. **Befintligt:** Komplett, manuellt skapad, 100% kvalitet
2. **Föreslaget:** Grundstruktur, automatisk generering, 60-80% kvalitet

**Vad ger faktiskt värde:**

1. ✅ **Automatisk uppdatering** när BPMN-filer ändras
   - Befintligt: Måste manuellt uppdatera scenarios
   - Föreslaget: Automatisk uppdatering

2. ✅ **Grundstruktur för nya scenarios**
   - Befintligt: Måste manuellt skapa från scratch
   - Föreslaget: Automatisk grundstruktur att bygga vidare på

3. ❌ **Komplett scenarios**
   - Befintligt: 100% komplett
   - Föreslaget: 60-80% komplett (saknar UI-interaktioner, API-anrop, DMN-beslut, test data)

---

## 🎯 Slutsats

**Ja, det vi föreslår är mer eller mindre det som redan finns, MEN:**

1. **Befintligt:** Manuellt skapad, komplett, 100% kvalitet
2. **Föreslaget:** Automatisk generering, grundstruktur, 60-80% kvalitet

**Vad ger faktiskt värde:**

1. ✅ **Automatisk uppdatering** när BPMN-filer ändras
2. ✅ **Grundstruktur för nya scenarios** (sparar tid)
3. ❌ **Komplett scenarios** (saknar detaljer som UI-interaktioner, API-anrop, etc.)

**Rekommendation:** Fokusera på automatisk uppdatering av befintliga scenarios när BPMN-filer ändras, istället för att generera nya scenarios från scratch.

---

**Datum:** 2025-12-22
**Status:** Jämförelse klar - Föreslaget är likt befintligt men med lägre kvalitet



