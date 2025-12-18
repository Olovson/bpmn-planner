# Implementationsplan: Förbättra Innehållskvalitet

**Datum:** 2025-01-27  
**Uppdaterad:** 2025-01-27 (Förenklad approach)  
**Syfte:** Systematiskt förbättra UI Flow-tabeller och Implementation Mapping i Feature Goals

**⚠️ VIKTIGT:** Denna plan använder en **förenklad approach** för UI Flow-tabeller. Se `docs/CONTENT_IMPROVEMENT_STRATEGY_REVISION.md` för detaljerad analys och motivering.

---

## 🎯 Mål

### Primära Mål
1. **Komplettera UI Flow-tabeller** - Förenklad approach: 3-5 steg per UserTask med länkar till Epic-filer (se `CONTENT_IMPROVEMENT_STRATEGY_REVISION.md`)
2. **Komplettera Implementation Mapping** - Lägg till saknade aktiviteter (KALP, Screen KALP, gateways, etc.)

### Sekundära Mål
3. **JSON Schemas** - Skapa strukturerade schemas för API-kontrakt (nice-to-have)
4. **UI/UX-specifikationer** - Detaljerade formulär-specifikationer (nice-to-have)

---

## 📋 Fas 1: Inventering och Prioritering (1 dag)

### Steg 1.1: Identifiera alla Feature Goals som behöver förbättringar
- [ ] Skanna alla Feature Goal-filer för TODO i UI Flow-tabeller
- [ ] Identifiera saknade aktiviteter i Implementation Mapping
- [ ] Skapa prioritetslista baserat på:
  - Antal TODO:s
  - Kritiska aktiviteter (används ofta)
  - Beroenden (aktiviteter som många andra beror på)

### Steg 1.2: Analysera E2E-scenarion för referens
- [ ] Gå igenom E2E-scenarion för att hitta exempel på:
  - Page IDs (routes)
  - Locator IDs (formulärfält, knappar)
  - Data Profile-värden
  - API-endpoints

### Steg 1.3: Skapa mallar och standarder
- [ ] Definiera standardformat för Page IDs (t.ex. `/application/stakeholder/consent`)
- [ ] Definiera standardformat för Locator IDs (t.ex. `input-consent-checkbox`, `btn-submit-consent`)
- [ ] Definiera standardformat för Data Profile-värden
- [ ] Skapa checklista för vad som ska finnas i varje UI Flow-rad

---

## 📋 Fas 2: Komplettera UI Flow-tabeller (1-2 veckor) - FÖRENKLAD APPROACH

**⚠️ VIKTIGT: Förenklad approach** - Se `docs/CONTENT_IMPROVEMENT_STRATEGY_REVISION.md` för detaljerad analys.

**Princip:** UI Flow-tabeller ska vara **översiktliga referenser**, inte detaljerade guider. Detaljer finns i Epic-filer och E2E-scenarion.

### Steg 2.1: Börja med högsta prioritet Feature Goals
- [ ] `mortgage-se-application-stakeholder-v2.html` - consent-to-credit-check, register-personal-economy-information
- [ ] `mortgage-mortgage-commitment-v2.html` - decide-mortgage-commitment
- [ ] Andra Feature Goals med flest TODO:s

### Steg 2.2: För varje User Task i Feature Goal (FÖRENKLAT)
- [ ] **Steg 1:** Navigera till sidan (Page ID från Implementation Mapping)
- [ ] **Steg 2:** Utför uppgift (referens till Epic-fil för detaljer)
- [ ] **Steg 3:** Verifiera resultat (optional)

**Inte:**
- ❌ Varje fill/click/verify-steg
- ❌ Detaljerade Locator IDs (finns i Epic-filer)
- ❌ Detaljerade Data Profile-värden (finns i E2E-scenarion)

**Exempel:**
```html
<tr>
  <td>1</td>
  <td>/application/stakeholder/consent</td>
  <td>navigate</td>
  <td>nav-consent-to-credit-check</td>
  <td>stakeholder-primary</td>
  <td>Navigera till samtyckessidan. Se Epic: consent-to-credit-check för detaljerade UI-steg.</td>
</tr>
<tr>
  <td>2</td>
  <td>/application/stakeholder/consent</td>
  <td>complete</td>
  <td>-</td>
  <td>stakeholder-primary</td>
  <td>Ge samtycke till kreditupplysning. Se Epic: consent-to-credit-check för formulärfält och validering.</td>
</tr>
```

### Steg 2.3: Lägg till länkar till Epic-filer
- [ ] För varje UserTask, lägg till referens till Epic-fil i kommentaren
- [ ] Verifiera att Epic-filer finns och är tillgängliga

### Steg 2.4: Validera mot Implementation Mapping
- [ ] Kontrollera att Page IDs matchar Implementation Mapping
- [ ] Kontrollera att länkar till Epic-filer fungerar
- [ ] Verifiera att översikten är korrekt

---

## 📋 Fas 3: Komplettera Implementation Mapping (1-2 veckor)

### Steg 3.1: Identifiera saknade aktiviteter
- [ ] Gå igenom `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` för lista över saknade aktiviteter
- [ ] Identifiera saknade ServiceTasks (KALP, Fetch credit information, etc.)
- [ ] Identifiera saknade Gateways (KALP OK, Skip step, etc.)
- [ ] Identifiera saknade DMN-anrop (Screen KALP, etc.)
- [ ] Identifiera saknade Timeout boundary events

### Steg 3.2: För varje saknad aktivitet
- [ ] Identifiera endpoint/route baserat på:
  - BPMN-element ID
  - BPMN-element namn
  - Kontext (vilken process, vilken subprocess)
  - E2E-scenarion (om tillgängligt)
- [ ] Identifiera HTTP-metod (GET, POST, etc.)
- [ ] Identifiera timeout-värden från Epic-dokumentationen eller tekniska krav
- [ ] Lägg till kommentar med beskrivning

### Steg 3.3: Validera mot E2E-scenarion
- [ ] Kontrollera att endpoints matchar E2E-scenarion
- [ ] Kontrollera att timeout-värden matchar tekniska krav
- [ ] Uppdatera om det finns skillnader

### Steg 3.4: Dokumentera förbättringar
- [ ] Uppdatera `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` när aktiviteter läggs till
- [ ] Markera Feature Goals som "komplett" när alla aktiviteter är dokumenterade

---

## 📋 Fas 4: JSON Schemas (1 vecka) - OPTIONAL

### Steg 4.1: Skapa JSON Schema-struktur
- [ ] Definiera standardformat för JSON Schema
- [ ] Skapa mallar för Request/Response schemas

### Steg 4.2: För varje ServiceTask
- [ ] Extrahera Request/Response från Epic-dokumentationen
- [ ] Konvertera till JSON Schema-format
- [ ] Lägg till valideringsregler (required, format, min/max)
- [ ] Lägg till exempel

### Steg 4.3: Integrera i Feature Goals
- [ ] Lägg till JSON Schema-sektion i Feature Goals
- [ ] Länka från API-dokumentation till JSON Schema

---

## 📋 Fas 5: UI/UX-specifikationer (1 vecka) - OPTIONAL

### Steg 5.1: För varje User Task
- [ ] Extrahera formulärfält från Epic-dokumentationen
- [ ] Skapa form data schema
- [ ] Dokumentera validation rules (client-side och server-side)
- [ ] Dokumentera UI states

### Steg 5.2: Integrera i Feature Goals
- [ ] Lägg till UI/UX-specifikation-sektion i Feature Goals
- [ ] Länka från UI Flow till UI/UX-specifikationer

---

## 🛠️ Verktyg och Scripts

### Scripts att skapa
1. **`scripts/analyze-feature-goals-todos.ts`**
   - Skannar alla Feature Goal-filer
   - Identifierar TODO:s i UI Flow-tabeller
   - Identifierar saknade aktiviteter i Implementation Mapping
   - Genererar prioritetslista

2. **`scripts/extract-e2e-references.ts`**
   - Extraherar Page IDs, Locator IDs, och Data Profile-värden från E2E-scenarion
   - Skapar referenslista för varje Feature Goal

3. **`scripts/validate-feature-goal-completeness.ts`**
   - Validerar att Feature Goal är komplett
   - Kontrollerar att alla TODO:s är borta
   - Kontrollerar att alla aktiviteter finns i Implementation Mapping

### Manual Process
- Förbättringar görs manuellt i HTML-filerna (eller via script som uppdaterar HTML)
- Varje förbättring valideras mot E2E-scenarion
- Dokumentation uppdateras när förbättringar görs

---

## 📊 Framstegsspårning

### Checklista per Feature Goal
- [ ] UI Flow-tabeller kompletta (förenklade, 3-5 steg per UserTask, länkar till Epic-filer)
- [ ] Implementation Mapping komplett (alla aktiviteter dokumenterade)
- [ ] Länkar till Epic-filer fungerar
- [ ] Dokumentation uppdaterad

### Status per Feature Goal
- **TODO** - Inte påbörjad
- **IN PROGRESS** - Pågående arbete
- **REVIEW** - Klar för granskning
- **COMPLETE** - Komplett och validerad

---

## 🎯 Prioritering

### Högsta prioritet (Fas 2 - Start här)
1. `mortgage-se-application-stakeholder-v2.html` - Används ofta, många TODO:s
2. `mortgage-mortgage-commitment-v2.html` - Används ofta, många TODO:s
3. `mortgage-se-internal-data-gathering-v2.html` - Grundläggande process

### Medel prioritet
4. `mortgage-se-object-information-v2.html` - Används ofta
5. `mortgage-se-object-v2.html` - Används ofta
6. Andra Feature Goals med TODO:s

### Låg prioritet (Fas 4-5 - Optional)
7. JSON Schemas
8. UI/UX-specifikationer

---

## 📝 Noteringar

- **Källor för referens:**
  - E2E-scenarion (`src/data/e2eScenarios.ts`)
  - Epic-dokumentationen (`public/local-content/epics/`)
  - Befintliga Feature Goals med kompletta UI Flow-tabeller

- **Standarder:**
  - Page IDs: `/application/{subprocess}/{task-id}` (t.ex. `/application/stakeholder/consent-to-credit-check`)
  - Locator IDs: `{type}-{field-name}` (t.ex. `input-consent-checkbox`, `btn-submit-consent`)
  - Data Profile: `{customer-type}-{scenario}` (t.ex. `customer-standard-happy`)

- **Validering:**
  - Alla förbättringar valideras mot E2E-scenarion
  - Om E2E-scenarion saknas, använd Epic-dokumentationen som referens
  - Om Epic-dokumentationen saknas, använd BPMN-element namn och kontext

---

## 🚀 Nästa Steg

1. ✅ **Kör inventering** - Identifiera alla Feature Goals som behöver förbättringar (KLART)
2. ✅ **Börja med högsta prioritet** - `mortgage-se-application-stakeholder-v2.html` (PÅGÅR)
3. **Fortsätt med S2 och S3** - Förbättra övriga scenarier i samma fil
4. **Iterera** - Förbättra en Feature Goal i taget, validera, dokumentera

## 📊 Framsteg

### ✅ Genomfört
- **Analysscript skapat** (`scripts/analyze-feature-goals-todos.ts`)
  - Identifierar alla TODO:s i Feature Goals
  - Genererar prioritetslista
  - Resultat: 26 Feature Goals, 16 med TODO:s, totalt 198 TODO:s

- **Strategi reviderad** (`docs/CONTENT_IMPROVEMENT_STRATEGY_REVISION.md`)
  - Analyserat att detaljerade UI Flow-tabeller är onödiga duplicering
  - Föreslagit förenklad approach: 3-5 steg per UserTask med länkar till Epic-filer
  - 80% minskning av arbete

- **Första Feature Goal påbörjad** (`mortgage-se-application-stakeholder-v2.html`)
  - S1-scenario kompletterat med detaljerade steg (kommer förenklas enligt ny strategi)

### 🔄 Pågående
- **S2 och S3-scenarier** i `mortgage-se-application-stakeholder-v2.html`
  - S2: Stakeholder rejected scenario
  - S3: Object rejected scenario

### 📋 Planerat
- **Nästa Feature Goal:** `mortgage-mortgage-commitment-v2.html` (44 TODO:s)
- **Implementation Mapping:** Komplettera saknade aktiviteter

