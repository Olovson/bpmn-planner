# Implementeringsplan: Lägga till Testgenerering-sektion i v2 Feature Goal-filer

## Översikt

Lägga till en ny "Testgenerering"-sektion i slutet av alla 28 befintliga v2 Feature Goal HTML-filer i `public/local-content/feature-goals/`.

## Plan

### Steg 1: Skapa script för att lägga till sektionen

**Filer:**
- `scripts/add-test-generation-section.ts` (ny fil)

**Funktionalitet:**
1. Läsa alla HTML-filer i `public/local-content/feature-goals/`
2. För varje fil:
   - Parsa HTML för att extrahera information
   - Generera testgenerering-sektion baserat på innehåll
   - Lägga till sektionen före `</div></body></html>`

### Steg 2: Extrahera information från befintligt innehåll

**Från "Omfattning"-sektionen:**
- Identifiera User tasks, Service tasks, Business rule tasks, Call activities
- Extrahera aktivitetsnamn och beskrivningar
- Identifiera lanes (Stakeholder, Compliance, System) för persona-inferens

**Från "Processteg - Output":**
- Identifiera happy path (positiva utfall)
- Identifiera error cases (felmeddelanden, avvisningar)
- Identifiera edge cases (manuell granskning, komplettering)

**Från "Beskrivning av FGoal":**
- Identifiera process-typ för assertion type (KYC → compliance)

**Från "Beroenden":**
- Identifiera API-tjänster och system för implementation mapping

### Steg 3: Auto-generera innehåll

#### Testscenarier (Huvudtabell)

**Auto-genererat:**
- ✅ **ID**: S1, S2, S3, etc. (sekventiellt)
- ✅ **Namn**: Från "Processteg - Output" (happy path, error cases)
- ✅ **Typ**: 
  - Happy: Positiva utfall från Output
  - Error: Felmeddelanden, avvisningar från Output
  - Edge: Manuell granskning, komplettering från Output
- ✅ **Outcome**: Direkt från "Processteg - Output"
- ⚠️ **Persona**: 
  - Härleds från "Omfattning" (User task (Stakeholder lane) → customer)
  - User task (Compliance lane) → advisor
  - Service task (System lane) → system
  - Default: unknown
- ⚠️ **Assertion Type**:
  - KYC-process → compliance
  - Vanlig process → functional
  - Default: functional
- ❌ **Risk Level**: P1 (default, kräver manuell bedömning)
- ❌ **Status**: "⏳ TODO" (kräver manuell uppdatering)

#### UI Flow per Scenario

**Auto-genererat:**
- ✅ **Steg**: Sekventiellt baserat på "Omfattning" och "BPMN - Process" beskrivning
- ⚠️ **Page ID**: Härleds från aktivitetsnamn (t.ex. "Confirm application" → "confirm-application")
- ⚠️ **Action**: 
  - User task → fill/click/verify
  - Service task → API call
  - Default: navigate
- ❌ **Locator ID**: "[TODO: Lägg till locator]" (placeholder)
- ❌ **Data Profile**: "[TODO: Definiera testdata]" (placeholder)
- ✅ **Kommentar**: Från aktivitetsbeskrivning i "Omfattning"

#### Testdata-referenser

**Auto-genererat:**
- ⚠️ **Data-typer**: Härleds från "Processteg - Input" (t.ex. inkomst → customer-high-income)
- ❌ **Faktiska testdata**: "[TODO: Definiera testdata för X]" (placeholder)

#### Implementation Mapping

**Auto-genererat:**
- ✅ **BPMN Aktivitet**: Från "Omfattning" (alla aktiviteter listade)
- ✅ **Type**: 
  - User task → UI
  - Service task → API
  - Business rule task → API
  - Call activity → UI (eller Both)
- ❌ **Route/Endpoint**: "[TODO: Lägg till route/endpoint]" (placeholder)
- ❌ **Method**: "[TODO: Lägg till HTTP method]" (placeholder, endast för API)
- ❌ **Base URL**: "[TODO: Lägg till base URL]" (placeholder)
- ✅ **Kommentar**: Från aktivitetsbeskrivning

### Steg 4: Lägga till placeholder-värden

**Strategi:**
- Om auto-genererat innehåll är för lite, lägg till 2-3 exempel-scenarion med placeholder-värden
- Lägg till 2-3 exempel UI Flow-steg med placeholder-värden
- Lägg till 2-3 exempel testdata-referenser med placeholder-värden
- Lägg till alla identifierade aktiviteter i Implementation Mapping med placeholder-värden

**Exempel på placeholder-innehåll:**
- Locator ID: `[TODO: Lägg till CSS selector eller test ID]`
- Data Profile: `[TODO: Definiera testdata för kund med hög inkomst]`
- Route/Endpoint: `[TODO: Lägg till route, t.ex. /application/confirm]`
- Base URL: `[TODO: Lägg till base URL för miljön]`

### Steg 5: HTML-struktur

**Lägga till före `</div></body></html>`:**
```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  <!-- Innehåll enligt design -->
</section>
```

**Styling:**
- Använda befintliga CSS-klasser (`.doc-section`, `table`, `.muted`)
- Lägga till `<details>` och `<summary>` för expandable sections
- Behålla samma styling som resten av dokumentet

## Exempel på auto-genererat innehåll

### För Application (mortgage-se-application-application-v2.html):

**Testscenarier:**
- S1: "Komplett ansökan bekräftad" (Happy, customer, P1, functional)
- S2: "Pre-screen rejected" (Error, system, P0, functional)
- S3: "Stakeholder rejected" (Error, system, P0, functional)
- S4: "Manuell komplettering behövs" (Edge, customer, P2, functional)

**UI Flow för S1:**
- Steg 1: Navigera till application-form
- Steg 2: Fyll i inkomst (placeholder locator)
- Steg 3: Fyll i hushållsstorlek (placeholder locator)
- Steg 4: Klicka submit (placeholder locator)
- Steg 5: Verifiera bekräftelse (placeholder locator)

**Implementation Mapping:**
- Confirm application (UI, [TODO route], [TODO base URL])
- Internal data gathering (API, [TODO endpoint], GET, [TODO base URL])
- Household (UI, [TODO route], [TODO base URL])
- Stakeholder (UI, [TODO route], [TODO base URL])

## Implementation-steg

1. ✅ Skapa `scripts/add-test-generation-section.ts`
2. ✅ Implementera HTML-parsing och informationsextraktion
3. ✅ Implementera auto-generering av testscenarier
4. ✅ Implementera auto-generering av UI Flow
5. ✅ Implementera auto-generering av Implementation Mapping
6. ✅ Lägga till placeholder-värden där information saknas
7. ✅ Testa på 1-2 filer först
8. ✅ Kör på alla 28 filer
9. ✅ Verifiera att HTML är korrekt formaterad

## Risker och åtgärder

**Risk 1:** HTML-parsing kan missa information
- **Åtgärd:** Använda robusta regex-mönster och fallback-värden

**Risk 2:** För lite auto-genererat innehåll
- **Åtgärd:** Lägga till placeholder-exempel så människor ser vad som ska fyllas i

**Risk 3:** HTML blir korrupt
- **Åtgärd:** Säkerhetskopiera filer innan ändringar, testa på 1-2 filer först

## Förväntat resultat

- Alla 28 filer har en "Testgenerering"-sektion i slutet
- Grundläggande testscenarier är auto-genererade (3-5 scenarion per fil)
- UI Flow-steg är auto-genererade med placeholder-värden
- Implementation Mapping innehåller alla identifierade aktiviteter
- Testdata-referenser har placeholder-värden
- Människor kan enkelt se vad som behöver fyllas i och komplettera

