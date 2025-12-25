# Analys: Claude API Mock-implementation

## Översikt

Detta dokument analyserar hur vi mockar Claude API-anrop i Playwright E2E-tester och om implementationen fungerar tillräckligt bra för att köra testerna som är beroende av detta.

## Nuvarande Implementation

### Mock-setup (`fixtures/claudeApiMocks.ts`)

```typescript
await page.route('**/api.anthropic.com/v1/messages*', async (route: Route) => {
  // Mock response baserat på request
});
```

### Hur appen gör Claude API-anrop

1. **Anthropic SDK** (`@anthropic-ai/sdk`) används i `cloudLlmClient.ts`
2. **SDK gör anrop** via `anthropicClient.messages.create(createParams)`
3. **SDK använder fetch** under huven (i browser-miljö)
4. **Endpoint:** `https://api.anthropic.com/v1/messages`
5. **Headers:** Inkluderar `anthropic-version`, `anthropic-beta`, `x-api-key`

## Analys av Mock-implementation

### ✅ Vad som fungerar bra

1. **Route-pattern matchar endpoint**
   - Pattern: `**/api.anthropic.com/v1/messages*`
   - Endpoint: `https://api.anthropic.com/v1/messages`
   - ✅ Matchar korrekt

2. **Response-struktur matchar SDK-förväntningar**
   - Mock returnerar: `{ id, type, role, content, model, stop_reason, usage }`
   - SDK förväntar sig: Samma struktur
   - ✅ Matchar korrekt

3. **Content-format är korrekt**
   - Mock returnerar: `content: [{ type: 'text', text: '...' }]`
   - SDK förväntar sig: Samma format
   - ✅ Matchar korrekt

4. **Error handling finns**
   - Mock kan simulera fel via `simulateError` option
   - ✅ Fungerar korrekt

### ⚠️ Potentiella problem

1. **Route-pattern kan vara för specifik**
   - Nuvarande: `**/api.anthropic.com/v1/messages*`
   - Problem: Om SDK använder query parameters eller andra paths kan det missas
   - **Lösning:** Pattern borde fungera, men kan behöva testas

2. **Request body parsing**
   - Mock läser `request.postDataJSON()` för att avgöra typ
   - Problem: Om request body är stort eller inte JSON kan det misslyckas
   - **Lösning:** Borde fungera för normala anrop

3. **Typ-detektering är enkel**
   - Nuvarande: `userPrompt.includes('test') || userPrompt.includes('scenario')`
   - Problem: Kan ge fel resultat om prompt innehåller dessa ord i annat sammanhang
   - **Lösning:** Fungerar för de flesta fall, men kan förbättras

4. **Headers verifieras inte**
   - Mock kontrollerar inte headers (API key, version, etc.)
   - Problem: Om SDK kräver specifika headers kan det misslyckas
   - **Lösning:** Borde fungera eftersom vi bara mockar response

5. **Structured outputs (JSON schema)**
   - Mock returnerar alltid text, inte structured output
   - Problem: Om appen förväntar sig structured output kan det misslyckas
   - **Lösning:** För nuvarande tester borde det fungera, men kan behöva förbättras

## Testning av Mock-implementation

### Tester som använder mocks

1. **`documentation-generation-from-scratch.spec.ts`**
   - Mockar Claude API för dokumentationsgenerering
   - Verifierar att dokumentation genereras och visas

2. **`test-generation-from-scratch.spec.ts`**
   - Mockar Claude API för testgenerering
   - Verifierar att tester genereras och visas

### Förväntat beteende

1. **Request skickas** → Mock interceptar
2. **Mock returnerar response** → SDK tar emot
3. **Appen processar response** → Dokumentation/tester genereras
4. **UI uppdateras** → Tester verifierar resultat

## Förbättringsförslag

### 1. Förbättra route-pattern (Låg prioritet)

```typescript
// Nuvarande
await page.route('**/api.anthropic.com/v1/messages*', ...);

// Förbättrad (mer flexibel)
await page.route('**/api.anthropic.com/v1/messages**', ...);
// eller
await page.route(/https:\/\/api\.anthropic\.com\/v1\/messages/, ...);
```

**Prioritet:** Låg - Nuvarande pattern borde fungera

### 2. Förbättra typ-detektering (Medel prioritet)

```typescript
// Nuvarande
const isTestGeneration = userPrompt.includes('test') || userPrompt.includes('scenario');

// Förbättrad
const isTestGeneration = 
  userPrompt.toLowerCase().includes('test scenario') ||
  userPrompt.toLowerCase().includes('generate test') ||
  postData?.systemPrompt?.toLowerCase().includes('test scenario');
```

**Prioritet:** Medel - Förbättrar pålitlighet

### 3. Stöd för structured outputs (Hög prioritet om behövs)

```typescript
// Kolla om request har output_format
if (postData?.output_format) {
  // Returnera structured output istället för text
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      // ... structured output format
    })
  });
}
```

**Prioritet:** Hög - Om appen använder structured outputs

### 4. Logging för debugging (Låg prioritet)

```typescript
// Logga request för debugging
console.log('[Claude Mock] Intercepted request:', {
  url: request.url(),
  method: request.method(),
  hasBody: !!postData,
  isTestGeneration,
});
```

**Prioritet:** Låg - Hjälper vid debugging

## Rekommendationer

### ✅ Omedelbart (Fungerar nu)

1. **Behåll nuvarande implementation** - Den borde fungera för de flesta fall
2. **Testa testerna** - Kör `documentation-generation-from-scratch.spec.ts` och `test-generation-from-scratch.spec.ts` för att verifiera
3. **Övervaka fel** - Om testerna misslyckas, kolla om det är mock-relaterat

### 🔄 Kort sikt (Om problem uppstår)

1. **Förbättra typ-detektering** - Om mock returnerar fel typ av response
2. **Lägg till logging** - För att debugga problem
3. **Testa med faktiska anrop** - Jämför mock response med faktisk response

### 📝 Lång sikt (Om structured outputs behövs)

1. **Stöd för structured outputs** - Om appen börjar använda JSON schema responses
2. **Mer realistiska mock-responser** - Matcha faktiska API-responser bättre
3. **Fler test-scenarion** - Testa olika typer av generering

## Slutsats

**Nuvarande implementation borde fungera** för de testerna som är beroende av Claude API-mocks:

✅ **Fungerar:**
- Route-pattern matchar endpoint
- Response-struktur matchar SDK-förväntningar
- Error handling finns
- Typ-detektering fungerar för de flesta fall

⚠️ **Potentiella problem:**
- Typ-detektering kan vara för enkel
- Structured outputs stöds inte (om behövs)
- Headers verifieras inte (borde inte vara problem)

**Rekommendation:** 
1. ✅ **Kör testerna** för att verifiera att mocks fungerar
2. ⚠️ **Övervaka fel** och förbättra vid behov
3. 📝 **Förbättra typ-detektering** om problem uppstår

## Test-körning

För att testa mock-implementationen:

```bash
# Kör dokumentationsgenerering-test
npx playwright test documentation-generation-from-scratch.spec.ts

# Kör testgenerering-test
npx playwright test test-generation-from-scratch.spec.ts

# Kör båda med visuell browser (för debugging)
npx playwright test documentation-generation-from-scratch.spec.ts --headed
npx playwright test test-generation-from-scratch.spec.ts --headed
```

Om testerna misslyckas, kolla:
1. Om route interceptar korrekt (kolla network tab i browser)
2. Om response-struktur matchar SDK-förväntningar
3. Om typ-detektering fungerar korrekt

