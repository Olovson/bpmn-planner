# Prioritering: Förbättra Existerande Innehåll

**Datum:** 2025-01-27  
**Syfte:** Identifiera vilken BEFINTLIG dokumentation som ger mest värde att förbättra

---

## 📊 Analys: Vad Finns Redan?

### Epic-filer (19 st) - UserTasks, ServiceTasks, BusinessRuleTasks
**Status:** Markeras som "KOMPLETTA" i `IMPROVEMENTS_SUMMARY.md`

**Vad som finns:**
- ✅ Detaljerad affärslogik, inputs/outputs, funktionellt flöde
- ✅ API-dokumentation med endpoints, request/response (textformat)
- ✅ Externa API:er dokumenterade
- ✅ Timeout och retry nämns
- ✅ Felhantering dokumenterad
- ✅ Testscenarier (EPIC-S1, EPIC-S2, etc.)

**Vad som KAN förbättras:**
- ⚠️ Request/Response i textformat → JSON Schema skulle hjälpa
- ⚠️ Timeout/retry nämns men kan vara mer strukturerat
- ⚠️ API-kontrakt kan vara mer detaljerade (valideringsregler, exempel)

**Användning:** Direkt av utvecklare för att implementera aktiviteter

### Feature Goals (26 st) - CallActivities/Subprocesser
**Status:** Många har TODO:s i UI Flow-tabeller, saknade aktiviteter i Implementation Mapping

**Vad som finns:**
- ✅ Omfattande affärslogik, effekt, user stories
- ✅ Tekniska krav (timeout, retry, error codes)
- ✅ Implementation Mapping (routes/endpoints) - **MEN ofullständigt**
- ✅ UI Flow-tabeller - **MEN många TODO:s**

**Vad som KAN förbättras:**
- ⚠️ Implementation Mapping saknar aktiviteter (KALP, Screen KALP, gateways)
- ⚠️ UI Flow-tabeller har TODO:s (men vi har nu förenklad approach)

**Användning:** Översikt av subprocesser, routes/endpoints för utvecklare

### E2E-scenarion
**Status:** Mycket detaljerade, kompletta

**Vad som finns:**
- ✅ Mycket detaljerade UI-interaktioner med page IDs, locator IDs
- ✅ Exakta API-anrop med HTTP-metoder
- ✅ Backend states dokumenterade
- ✅ DMN-beslut dokumenterade

**Användning:** Testgenerering, validering

---

## 🎯 Prioritering: Vad Ger Mest Värde?

### 1. Implementation Mapping i Feature Goals (HÖGSTA PRIORITET) ⭐⭐⭐

**Varför:**
- **Direkt blockerande** - Utvecklare vet inte vilka endpoints som ska användas
- **Används ofta** - Varje Feature Goal används för att hitta routes/endpoints
- **Konkret problem** - `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` identifierar specifika saknade aktiviteter
- **Lätt att förbättra** - Bara lägga till rader i tabellen, inte skapa nytt innehåll

**Vad som saknas (från `TEST_SCENARIOS_ANALYSIS.md`):**
- KALP service task: `/api/application/kalp` (POST)
- Screen KALP DMN: `/api/dmn/screen-kalp` (POST)
- Fetch credit information: `/api/application/fetch-credit-information` (POST)
- Gateways (KALP OK, Skip step, Sammanför flöden) - logiska gateways
- Timeout boundary event på "Confirm application" (30 dagar)

**Effekt:**
- Utvecklare kan direkt implementera utan att gissa
- Minskar frågor och iterationer
- Komplett bild av alla integrationer

**Arbete:** 1-2 veckor för alla Feature Goals

---

### 2. API-dokumentation i Epic-filer (HÖG PRIORITET) ⭐⭐

**Varför:**
- **Används direkt** - Utvecklare läser Epic-filer för att implementera ServiceTasks
- **Ofullständigt** - Request/Response finns i textformat men saknar strukturerade schemas
- **Högt värde** - JSON Schema skulle låta utvecklare generera TypeScript-typer automatiskt
- **Många filer** - 8 ServiceTasks + 5 BusinessRuleTasks = 13 filer att förbättra

**Vad som kan förbättras:**
- Konvertera textformat Request/Response till JSON Schema
- Lägg till valideringsregler (required, format, min/max, enum)
- Lägg till exempel på request/response
- Strukturera timeout/retry-information bättre

**Effekt:**
- Automatisk TypeScript-typgenerering
- API-kontrakt kan valideras automatiskt
- Minska integration-fel

**Arbete:** 1-2 veckor för alla ServiceTasks

---

### 3. UI Flow-tabeller i Feature Goals (MEDEL PRIORITET) ⭐

**Varför:**
- **Förenklad approach** - Vi har nu en strategi som minskar arbetet med 80%
- **Mindre blockerande** - E2E-scenarion har redan detaljerad info
- **Används för översikt** - Inte primär källa för implementation

**Vad som kan förbättras:**
- Förenkla till 3-5 steg per UserTask
- Lägg till länkar till Epic-filer
- Ta bort TODO:s

**Effekt:**
- Översiktlig referens i Feature Goals
- Mindre duplicering

**Arbete:** 1 vecka med förenklad approach

---

## 🎯 Rekommendation: Fokusera på Implementation Mapping

### Varför Implementation Mapping är viktigast:

1. **Direkt blockerande** - Utvecklare kan inte implementera utan att veta vilka endpoints som ska användas
2. **Konkret problem** - Specifika saknade aktiviteter är identifierade i `TEST_SCENARIOS_ANALYSIS.md`
3. **Högt värde per arbete** - Bara lägga till rader i tabellen, inte skapa nytt innehåll
4. **Används ofta** - Varje Feature Goal används för att hitta routes/endpoints
5. **Komplett bild** - Ger översikt över alla integrationer i en subprocess

### Varför INTE Epic-filer först:

1. **Redan "kompletta"** - Markeras som kompletta i `IMPROVEMENTS_SUMMARY.md`
2. **Nice-to-have** - JSON Schema är bra men inte blockerande (textformat fungerar)
3. **Mer arbete** - Kräver att konvertera textformat till JSON Schema
4. **Mindre blockerande** - Utvecklare kan implementera med textformat

### Varför INTE UI Flow-tabeller först:

1. **Förenklad approach klar** - Strategi finns, men mindre prioritet
2. **E2E-scenarion täcker** - Mycket detaljerad info finns redan
3. **Mindre blockerande** - Används för översikt, inte primär källa

---

## 📋 Konkret Arbetsplan

### Fas 1: Implementation Mapping (1-2 veckor) ⭐⭐⭐

**För varje Feature Goal:**
1. Identifiera saknade aktiviteter från `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md`
2. Hitta endpoints/routes från:
   - E2E-scenarion (`uiInteraction`, `apiCall`)
   - Epic-dokumentationen (Implementation Mapping)
   - BPMN-element ID och namn
3. Lägg till i Implementation Mapping-tabellen
4. Validera mot E2E-scenarion

**Prioritering:**
1. ✅ `mortgage-application-v2.html` - **REDAN KOMPLETT** (har KALP, Screen KALP, Fetch credit information, gateways, timeout)
2. `mortgage-offer-v2.html` - Många TODO:s i Implementation Mapping
3. `mortgage-mortgage-commitment-v2.html` - Många TODO:s i Implementation Mapping
4. `mortgage-collateral-registration-v2.html` - Många TODO:s i Implementation Mapping
5. `mortgage-manual-credit-evaluation-v2.html` - Många TODO:s i Implementation Mapping
6. Andra Feature Goals med TODO:s i Implementation Mapping

**Resultat:**
- Komplett Implementation Mapping för alla Feature Goals
- Utvecklare vet exakt vilka endpoints som ska användas
- Inga gissningar om routes/endpoints

---

### Fas 2: API-dokumentation i Epic-filer (1-2 veckor) ⭐⭐

**För varje ServiceTask Epic:**
1. Extrahera Request/Response från befintlig API-dokumentation
2. Konvertera till JSON Schema-format
3. Lägg till valideringsregler
4. Lägg till exempel

**Prioritering:**
1. ServiceTasks som används ofta (fetch-party-information, fetch-engagements, etc.)
2. ServiceTasks med komplexa API-kontrakt
3. BusinessRuleTasks med DMN-integration

**Resultat:**
- JSON Schema för alla API-kontrakt
- Automatisk TypeScript-typgenerering möjlig
- Bättre API-validering

---

### Fas 3: UI Flow-tabeller (1 vecka) ⭐

**För varje Feature Goal:**
1. Förenkla till 3-5 steg per UserTask
2. Lägg till länkar till Epic-filer
3. Ta bort TODO:s

**Resultat:**
- Översiktliga UI Flow-tabeller
- Länkar till Epic-filer för detaljer
- Inga TODO:s

---

## 🎯 Slutsats

**Fokusera på: Implementation Mapping i Feature Goals**

**Varför:**
- ✅ Direkt blockerande för utvecklare
- ✅ Konkret problem med identifierade saknade aktiviteter
- ✅ Högt värde per arbete (bara lägga till rader)
- ✅ Används ofta för att hitta routes/endpoints
- ✅ Ger komplett bild av integrationer

**Nästa steg:**
1. ✅ `mortgage-application-v2.html` är redan komplett
2. Identifiera Feature Goals med TODO:s i Implementation Mapping (många har `[TODO: Lägg till route]`)
3. Börja med högsta prioritet Feature Goals (t.ex. `mortgage-offer-v2.html`, `mortgage-mortgage-commitment-v2.html`)
4. Hitta endpoints/routes från:
   - E2E-scenarion (`apiCall`, `uiInteraction`)
   - Epic-dokumentationen
   - BPMN-element ID och namn
5. Ersätt TODO:s med konkreta routes/endpoints
6. Validera mot E2E-scenarion
