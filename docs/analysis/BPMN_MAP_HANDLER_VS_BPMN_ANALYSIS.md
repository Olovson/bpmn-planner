# Analys: Handler-baserad vs BPMN-baserad Mappning

> **⚠️ LÄS DETTA FÖRST INNAN DU UPPDATERAR bpmn-map.json!**
> 
> Handlers täcker INTE alla call activities. Du MÅSTE alltid kombinera handler-mappningar
> med BPMN-parsing eller manuell granskning. Se "Instruktioner för Nästa Gång" längre ner.

## Problem: Missmatch mellan Handlers och BPMN-filer

### Identifierade Skillnader

När vi jämförde den handler-baserade mappningen med den befintliga BPMN-baserade mappningen hittade vi följande skillnader:

1. **`Activity_1gzlxx4` vs `credit-evaluation`**
   - **BPMN-fil:** Har call activity med ID `Activity_1gzlxx4` och `calledElement="credit-evaluation"`
   - **Handler:** Finns bara `credit-evaluation.ts` handler
   - **Resultat:** Scriptet hittar `credit-evaluation` handler men missar `Activity_1gzlxx4` call activity

2. **`documentation-assessment`**
   - **BPMN-fil:** Finns i flera BPMN-filer (manual-credit-evaluation, mortgage-commitment, offer)
   - **Handler:** **INGEN handler-fil finns**
   - **Resultat:** Scriptet kan inte hitta denna call activity eftersom det saknas handler

3. **`sales-contract-credit-decision`**
   - **BPMN-fil:** Finns i `mortgage-se-offer.bpmn`
   - **Handler:** **INGEN handler-fil finns**
   - **Resultat:** Scriptet kan inte hitta denna call activity

4. **`mortgage-se-documentation-assessment.bpmn`**
   - **Process:** Processen finns i befintlig `bpmn-map.json`
   - **Template:** Processen finns **INTE** i `mortgage-template-main` (ingen mapp under `processes/`)
   - **Resultat:** Scriptet kan inte hitta denna process

## Orsaker till Missmatch

### 1. Handlers är Runtime-mappningar

**Handlers** (`selectFlowDefinition()`) definierar vilken process som ska köras när en call activity anropas vid **runtime**. De är:
- **Tekniska implementationer** - de mappar call activity ID till process ID
- **Inte alltid synkroniserade** med BPMN-filernas call activity IDs
- **Kan saknas** för call activities som inte är implementerade ännu

### 2. BPMN-filer är Deklarativa

**BPMN-filer** definierar call activities i diagrammet. De är:
- **Deklarativa** - de beskriver processflödet
- **Kan ha call activities** som inte har handlers ännu
- **Kan använda `calledElement`** istället för att matcha direkt mot handler-namn

### 3. Skillnader i ID-mappning

**Problem:** BPMN-filen kan ha:
- Call activity med ID `Activity_1gzlxx4` och `calledElement="credit-evaluation"`
- Call activity med ID `credit-evaluation` (utan `calledElement`)

**Handler-systemet** använder `calledElement` för att matcha, så båda pekar på samma handler (`credit-evaluation.ts`), men vårt script ser bara handler-namnet och missar `Activity_1gzlxx4`.

## Konsekvenser

### ✅ Vad vi KAN lita på från Handlers

1. **Korrekta mappningar** - När en handler finns, är mappningen till process ID korrekt
2. **Runtime-verifiering** - Handlers är vad som faktiskt körs i produktion
3. **Process ID → Filnamn** - Handlers ger oss rätt process ID som kan mappas till filnamn

### ⚠️ Vad vi INTE kan lita på från Handlers

1. **Komplett coverage** - Handlers täcker INTE alla call activities i BPMN-filer
2. **Call activity IDs** - Handler-namn matchar INTE alltid call activity ID i BPMN-filen
3. **Nya call activities** - Call activities som lagts till i BPMN-filer men inte implementerats ännu saknas

## Rekommenderad Strategi

### Hybrid-approach: Kombinera Handlers + BPMN-parsing

**Steg 1: Extrahera från Handlers (som nu)**
- Få korrekta mappningar för call activities som har handlers
- Detta ger oss "source of truth" för runtime-mappningar

**Steg 2: Parsa BPMN-filer för att hitta alla call activities**
- Hitta ALLA call activities i BPMN-filerna (inklusive de utan handlers)
- Matcha mot handlers där det finns
- För de utan handlers, använd automatisk matchning eller markera som `needs_manual_review: true`

**Steg 3: Kombinera resultaten**
- Använd handler-mappningar som primär källa (de är korrekta)
- Lägg till call activities från BPMN-filer som saknas i handlers
- Markera call activities utan handlers som `needs_manual_review: true`

## Implementation

### Förbättring av Scriptet

Scriptet bör:

1. **Extrahera från handlers** (som nu)
2. **Parsa BPMN-filer** för att hitta alla call activities
3. **Matcha call activities mot handlers:**
   - Om handler finns → använd handler-mappning
   - Om `calledElement` finns → matcha mot handler via `calledElement`
   - Om ingen handler → använd automatisk matchning eller markera för review
4. **Kombinera resultaten** med prioritet:
   - Handler-mappningar (högsta prioritet)
   - BPMN-filer med automatisk matchning (lägre prioritet)
   - BPMN-filer utan matchning (markera för review)

### Verifiering

Efter generering, verifiera:
- Alla call activities i BPMN-filer finns i `bpmn-map.json`
- Call activities med handlers har korrekta mappningar
- Call activities utan handlers är markerade för review

## Slutsats

**Vi kan INTE enbart använda handler-baserat script** eftersom:
- Handlers täcker inte alla call activities
- Handlers matchar inte alltid call activity IDs i BPMN-filer
- Nya call activities kan saknas handlers

**Vi BÖR använda hybrid-approach:**
- Handlers för korrekta runtime-mappningar
- BPMN-parsing för komplett coverage
- Automatisk matchning för call activities utan handlers

## Nästa Steg

1. ✅ Förstå problemet (KLAR)
2. ✅ Dokumentera problemet (KLAR)
3. ⏳ Uppdatera scriptet för att kombinera handlers + BPMN-parsing (TODO)
4. ⏳ Verifiera att alla call activities från BPMN-filer inkluderas (TODO)
5. ⏳ Dokumentera vilka call activities som saknar handlers (TODO)

## Instruktioner för Nästa Gång

> **📋 Se [`docs/guides/BPMN_MAP_UPDATE_GUIDE.md`](../guides/BPMN_MAP_UPDATE_GUIDE.md) för komplett steg-för-steg guide!**

**När du ska uppdatera bpmn-map.json från template-handlers:**

1. **Läs guiden först:**
   - [`docs/guides/BPMN_MAP_UPDATE_GUIDE.md`](../guides/BPMN_MAP_UPDATE_GUIDE.md) - Steg-för-steg process
   - Denna analys - Förstå varför handlers inte räcker

2. **Kör scriptet:**
   ```bash
   npm run generate:bpmn-map:template
   ```

3. **Jämför resultat:**
   - Scriptet genererar `bpmn-map-from-template.json`
   - Jämför med befintlig `bpmn-map.json`
   - Identifiera call activities som saknas i genererad fil

4. **Kombinera manuellt eller automatisera:**
   - **Manuellt:** Kopiera saknade call activities från befintlig `bpmn-map.json`
   - **Automatiskt:** Implementera hybrid-approach (se "Implementation" ovan)

5. **Verifiera:**
   - Alla call activities från BPMN-filer ska finnas
   - Call activities med handlers ska ha korrekta mappningar
   - Call activities utan handlers ska vara markerade för review

6. **Validera att bpmn-map.json fungerar:**
   ```bash
   # 1. Hitta filer och analysera diff
   npm test -- tests/integration/local-folder-diff.test.ts
   
   # 2. Validera parsing, graph, tree och dokumentationsgenerering
   BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
   ```
   Detta är **testprocessen** (A-Ö valideringsprocessen) som validerar att `bpmn-map.json` fungerar korrekt hela vägen från parsing till appens UI. Se [`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../guides/validation/VALIDATE_NEW_BPMN_FILES.md) för komplett guide.

**⚠️ KOMMA IHÅG:** Handlers är INTE kompletta! Alltid kombinera med BPMN-parsing eller manuell granskning.

**⚠️ KOMMA IHÅG:** Efter uppdatering, kör ALLTID valideringstestet för att säkerställa att mappningen fungerar!
