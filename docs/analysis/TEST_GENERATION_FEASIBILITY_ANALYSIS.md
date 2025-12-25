# Objektiv analys: Sannolikhet att generera konkreta testfall med bra kvalitet

## 🎯 Syfte

Bedöma sannolikheten att vi kan generera det föreslagna innehållet (konkreta testfall med API-anrop, UI-interaktioner, DMN-beslut) baserat på den information vi faktiskt har i BPMN-filerna och Feature Goals.

---

## 📊 Vad vi HAR i systemet

### 1. BPMN-filer

**Vad vi har:**
- ✅ Nodtyper: `ServiceTask`, `BusinessRuleTask`, `UserTask`, `CallActivity`, `Gateway`
- ✅ Nodnamn: `"Fetch party information"`, `"Pre-screen party"`
- ✅ Nod-ID: `"fetch-party-information"`, `"pre-screen-party"`
- ✅ Sequence flows: Vet vad som händer före/efter varje steg
- ✅ DataStoreReferences: `"Internal systems"`, `"Core System"`
- ✅ Text annotations: Lite beskrivning (t.ex. "Fetch existing information: - id - other available personal information...")
- ✅ Error events: `"pre-screen-rejected"`

**Vad vi INTE har:**
- ❌ API-endpoints
- ❌ HTTP-metoder (GET, POST, etc.)
- ❌ Request bodies
- ❌ Response structures
- ❌ UI-selectors (`data-testid`, etc.)
- ❌ DMN-tabellnamn (bara BusinessRuleTask-typ, inte vilken tabell)
- ❌ Backend states
- ❌ Konkreta testdata

**Sannolikhet att extrahera API-endpoints från BPMN:** **0%**
- BPMN innehåller ingen information om API-endpoints
- ServiceTask-namn ger bara affärsbeskrivning, inte tekniska endpoints

**Sannolikhet att extrahera UI-selectors från BPMN:** **0%**
- BPMN innehåller ingen information om UI-selectors
- UserTask-namn ger bara affärsbeskrivning, inte tekniska selectors

**Sannolikhet att extrahera DMN-tabellnamn från BPMN:** **0%**
- BPMN innehåller ingen information om DMN-tabellnamn
- BusinessRuleTask-namn ger bara affärsbeskrivning, inte tekniska tabellnamn

---

### 2. Feature Goals (HTML)

**Vad vi har:**
- ✅ Given/When/Then i textformat
- ✅ Beskrivning av processflöde
- ✅ "Implementation mapping" tabell med API-endpoints (i HTML-format)
  - Exempel: `/api/party/information`, `/api/dmn/pre-screen-party`
- ✅ Beskrivning av vad som händer i varje steg

**Vad vi INTE har:**
- ❌ Strukturerad data (bara HTML)
- ❌ UI-selectors
- ❌ Request/response structures
- ❌ Backend states
- ❌ Konkreta testdata

**Sannolikhet att extrahera API-endpoints från Feature Goals:** **60-70%**
- Feature Goals har "Implementation mapping" tabell med API-endpoints
- Men: Detta är i HTML-format, måste parsas
- Men: Inte alla Feature Goals har denna tabell
- Men: Endpoints kan vara inaktuella eller felaktiga

**Sannolikhet att extrahera UI-selectors från Feature Goals:** **10-20%**
- Feature Goals har beskrivning av UI-interaktioner i textformat
- Men: Inga strukturerade selectors (`data-testid`, etc.)
- Men: Måste tolkas från naturlig text

**Sannolikhet att extrahera DMN-tabellnamn från Feature Goals:** **40-50%**
- Feature Goals nämner ibland DMN-beslut i textformat
- Men: Inte alltid strukturerat
- Men: Måste tolkas från naturlig text

---

### 3. E2E-scenarios (hardkodade)

**Vad vi har:**
- ✅ `bankProjectTestSteps` med:
  - API-anrop: `"GET /api/party/information"`, `"POST /api/credit-decision"`
  - UI-interaktioner: Långa strängar med `Navigate`, `Verify`, `Fill`, `Click`
  - DMN-beslut: `"evaluate-kyc-aml"`, `"is-automatically-approved gateway decision"`
  - Backend states: Detaljerade states som `"KYC.status = 'APPROVED'"`
  - Assertions: Detaljerade assertions

**Vad vi INTE har:**
- ❌ Genererade från BPMN (de är manuellt skapade)
- ❌ Strukturerad data (bara hardkodade i `E2eTestsOverviewPage.tsx`)

**Sannolikhet att använda E2E-scenarios som mall:** **80-90%**
- E2E-scenarios har exakt det vi behöver
- Men: De är hardkodade, inte genererade
- Men: Kan användas som mall för att generera nya

---

## 🎯 Vad vi vill generera

### Prioritet 1: Konkreta testfall med integration

```typescript
{
  steps: [
    {
      type: "api-call",
      method: "GET",
      endpoint: "/api/customer-data",
      expectedResponse: { status: 200, body: {...} }
    },
    {
      type: "ui-interaction",
      selector: "[data-testid='customer-data-display']",
      expectedState: "visible"
    },
    {
      type: "dmn-decision",
      dmnTable: "evaluate-customer-risk",
      input: {...},
      expectedOutput: {...}
    }
  ],
  testData: { customerId: "12345", income: 50000 }
}
```

**Sannolikhet att generera detta med bra kvalitet:**

#### API-anrop:
- **Från BPMN:** 0% (BPMN har ingen information om API-endpoints)
- **Från Feature Goals:** 60-70% (Feature Goals har "Implementation mapping" tabell, men måste parsas från HTML)
- **Från E2E-scenarios som mall:** 80-90% (E2E-scenarios har exakt det vi behöver, men måste mappas till nya noder)
- **Kombinerat:** **70-80%** (om vi kombinerar Feature Goals + E2E-scenarios som mall)

#### UI-interaktioner:
- **Från BPMN:** 0% (BPMN har ingen information om UI-selectors)
- **Från Feature Goals:** 10-20% (Feature Goals har beskrivning i textformat, måste tolkas)
- **Från E2E-scenarios som mall:** 80-90% (E2E-scenarios har exakt det vi behöver, men måste mappas till nya noder)
- **Kombinerat:** **50-60%** (om vi kombinerar Feature Goals + E2E-scenarios som mall, men UI-selectors är svåra att generera)

#### DMN-beslut:
- **Från BPMN:** 0% (BPMN har ingen information om DMN-tabellnamn)
- **Från Feature Goals:** 40-50% (Feature Goals nämner ibland DMN-beslut i textformat)
- **Från E2E-scenarios som mall:** 80-90% (E2E-scenarios har exakt det vi behöver, men måste mappas till nya noder)
- **Kombinerat:** **60-70%** (om vi kombinerar Feature Goals + E2E-scenarios som mall)

#### Testdata:
- **Från BPMN:** 0% (BPMN har ingen information om testdata)
- **Från Feature Goals:** 20-30% (Feature Goals har beskrivning i textformat, måste tolkas)
- **Från E2E-scenarios som mall:** 70-80% (E2E-scenarios har exempel på testdata, men måste anpassas)
- **Kombinerat:** **40-50%** (om vi kombinerar Feature Goals + E2E-scenarios som mall, men testdata är svåra att generera)

---

### Prioritet 2: Testöversikt med prioritering

```typescript
{
  nodeId: "internal-data-gathering",
  priority: "P0",
  estimatedTime: "15 min",
  riskLevel: "high",
  testCases: [...]
}
```

**Sannolikhet att generera detta med bra kvalitet:**

#### Prioritering:
- **Från BPMN:** 50-60% (BPMN har sequence flows, kan identifiera kritiska noder)
- **Från Feature Goals:** 40-50% (Feature Goals har beskrivning av viktiga steg)
- **Kombinerat:** **60-70%** (om vi kombinerar BPMN + Feature Goals)

#### Uppskattad tid:
- **Från BPMN:** 30-40% (BPMN har ingen information om komplexitet)
- **Från Feature Goals:** 30-40% (Feature Goals har beskrivning, men ingen explicit komplexitet)
- **Kombinerat:** **40-50%** (måste estimeras baserat på antal steg och typ)

#### Risknivå:
- **Från BPMN:** 50-60% (BPMN har error events, kan identifiera riskområden)
- **Från Feature Goals:** 40-50% (Feature Goals har beskrivning av felhantering)
- **Kombinerat:** **60-70%** (om vi kombinerar BPMN + Feature Goals)

---

### Prioritet 3: Edge cases med konkreta testdata

```typescript
{
  name: "Timeout från extern API",
  testData: { simulateTimeout: true },
  expectedResult: "Systemet hanterar timeout korrekt"
}
```

**Sannolikhet att generera detta med bra kvalitet:**

#### Edge cases:
- **Från BPMN:** 40-50% (BPMN har error events, kan identifiera edge cases)
- **Från Feature Goals:** 50-60% (Feature Goals har beskrivning av felhantering)
- **Kombinerat:** **60-70%** (om vi kombinerar BPMN + Feature Goals)

#### Konkreta testdata:
- **Från BPMN:** 0% (BPMN har ingen information om testdata)
- **Från Feature Goals:** 20-30% (Feature Goals har beskrivning i textformat, måste tolkas)
- **Kombinerat:** **30-40%** (testdata är svåra att generera)

---

## 📊 Sammanfattning: Sannolikhet per komponent

| Komponent | Sannolikhet | Kvalitet | Kommentar |
|-----------|-------------|----------|-----------|
| **API-anrop** | 70-80% | Medel-Hög | Feature Goals har "Implementation mapping" tabell, E2E-scenarios som mall |
| **UI-interaktioner** | 50-60% | Medel | Feature Goals har beskrivning i textformat, E2E-scenarios som mall, men UI-selectors är svåra |
| **DMN-beslut** | 60-70% | Medel-Hög | Feature Goals nämner ibland DMN-beslut, E2E-scenarios som mall |
| **Testdata** | 40-50% | Låg-Medel | Feature Goals har beskrivning i textformat, E2E-scenarios som mall, men testdata är svåra |
| **Prioritering** | 60-70% | Medel-Hög | BPMN har sequence flows, Feature Goals har beskrivning |
| **Uppskattad tid** | 40-50% | Medel | Måste estimeras baserat på antal steg och typ |
| **Risknivå** | 60-70% | Medel-Hög | BPMN har error events, Feature Goals har beskrivning av felhantering |
| **Edge cases** | 60-70% | Medel-Hög | BPMN har error events, Feature Goals har beskrivning av felhantering |

---

## 🎯 Slutsats: Sannolikhet för hela systemet

### Om vi kombinerar alla källor:

**Sannolikhet att generera konkreta testfall med bra kvalitet:** **60-70%**

**Breakdown:**
- ✅ **API-anrop:** 70-80% (bra)
- ⚠️ **UI-interaktioner:** 50-60% (medel, UI-selectors är svåra)
- ✅ **DMN-beslut:** 60-70% (bra)
- ⚠️ **Testdata:** 40-50% (medel, testdata är svåra)
- ✅ **Prioritering:** 60-70% (bra)
- ⚠️ **Uppskattad tid:** 40-50% (medel)
- ✅ **Risknivå:** 60-70% (bra)
- ✅ **Edge cases:** 60-70% (bra)

### Vad som fungerar bra:

1. **API-anrop** - Feature Goals har "Implementation mapping" tabell
2. **DMN-beslut** - Feature Goals nämner ibland DMN-beslut
3. **Prioritering** - BPMN har sequence flows, kan identifiera kritiska noder
4. **Risknivå** - BPMN har error events, kan identifiera riskområden
5. **Edge cases** - BPMN har error events, Feature Goals har beskrivning av felhantering

### Vad som är svårt:

1. **UI-interaktioner** - Feature Goals har beskrivning i textformat, måste tolkas, UI-selectors är svåra
2. **Testdata** - Feature Goals har beskrivning i textformat, måste tolkas, testdata är svåra
3. **Uppskattad tid** - Måste estimeras baserat på antal steg och typ

---

## 💡 Rekommendation

### Vad vi BORDE generera (baserat på sannolikhet):

#### ✅ Prioritet 1: API-anrop (70-80% sannolikhet)
- **Varför:** Feature Goals har "Implementation mapping" tabell med API-endpoints
- **Hur:** Parsa HTML från Feature Goals, extrahera "Implementation mapping" tabell
- **Kvalitet:** Medel-Hög

#### ✅ Prioritet 2: DMN-beslut (60-70% sannolikhet)
- **Varför:** Feature Goals nämner ibland DMN-beslut, E2E-scenarios som mall
- **Hur:** Tolka text från Feature Goals, använd E2E-scenarios som mall
- **Kvalitet:** Medel-Hög

#### ✅ Prioritet 3: Prioritering (60-70% sannolikhet)
- **Varför:** BPMN har sequence flows, kan identifiera kritiska noder
- **Hur:** Analysera BPMN sequence flows, identifiera kritiska noder
- **Kvalitet:** Medel-Hög

#### ⚠️ Prioritet 4: UI-interaktioner (50-60% sannolikhet)
- **Varför:** Feature Goals har beskrivning i textformat, men UI-selectors är svåra
- **Hur:** Tolka text från Feature Goals, använd E2E-scenarios som mall, men acceptera lägre kvalitet
- **Kvalitet:** Medel

#### ⚠️ Prioritet 5: Testdata (40-50% sannolikhet)
- **Varför:** Feature Goals har beskrivning i textformat, men testdata är svåra
- **Hur:** Tolka text från Feature Goals, använd E2E-scenarios som mall, men acceptera lägre kvalitet
- **Kvalitet:** Låg-Medel

### Vad vi INTE borde generera (baserat på sannolikhet):

#### ❌ Konkreta UI-selectors (0% sannolikhet från BPMN, 10-20% från Feature Goals)
- **Varför:** BPMN har ingen information om UI-selectors, Feature Goals har beskrivning i textformat
- **Rekommendation:** Generera generiska beskrivningar istället för konkreta selectors

#### ❌ Konkreta testdata (0% sannolikhet från BPMN, 20-30% från Feature Goals)
- **Varför:** BPMN har ingen information om testdata, Feature Goals har beskrivning i textformat
- **Rekommendation:** Generera generiska beskrivningar istället för konkreta testdata

---

## 🎯 Slutsats

**Sannolikhet att generera konkreta testfall med bra kvalitet:** **60-70%**

**Breakdown:**
- ✅ **API-anrop:** 70-80% (bra)
- ⚠️ **UI-interaktioner:** 50-60% (medel)
- ✅ **DMN-beslut:** 60-70% (bra)
- ⚠️ **Testdata:** 40-50% (medel)
- ✅ **Prioritering:** 60-70% (bra)
- ⚠️ **Uppskattad tid:** 40-50% (medel)
- ✅ **Risknivå:** 60-70% (bra)
- ✅ **Edge cases:** 60-70% (bra)

**Rekommendation:**
- ✅ **Fokusera på API-anrop, DMN-beslut, Prioritering, Risknivå, Edge cases** (60-70% sannolikhet)
- ⚠️ **Acceptera lägre kvalitet för UI-interaktioner och testdata** (40-60% sannolikhet)
- ❌ **Generera INTE konkreta UI-selectors eller testdata** (för låg sannolikhet)

---

**Datum:** 2025-12-22
**Status:** Objektiv analys klar

