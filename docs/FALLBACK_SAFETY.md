# Fallback Safety & Debugging Guide

## Översikt

Detta dokument beskriver hur vi säkerställer att fallback-resultat inte dyker upp i appen eller testerna där de inte behövs, och hur man identifierar och felsöker fallback-resultat.

## Fallback-Markering

### 1. Metadata i HTML

Alla LLM-genererade dokument innehåller metadata som identifierar fallback:

```html
<div class="doc-shell" 
     data-llm-provider="local" 
     data-llm-model="llama3"
     data-llm-fallback-used="true">
```

**Attribut:**
- `data-llm-provider`: Provider som faktiskt användes (`cloud` eller `local`)
- `data-llm-model`: Modellnamn
- `data-llm-fallback-used`: `"true"` om fallback användes, `"false"` annars

### 2. Visuella Indikatorer

När fallback används visas tydliga banners:

```html
<div class="llm-fallback-banner">
  ChatGPT (moln-LLM) kunde inte nås. Detta dokument är genererat av lokal LLM (Ollama) som fallback.
</div>
```

### 3. Sektions-Source Markering

Varje sektion i dokumentet markeras med `data-source-*` attribut:

```html
<section class="doc-section" data-source-summary="llm">
  <!-- LLM-genererat innehåll -->
</section>

<section class="doc-section" data-source-summary="fallback">
  <!-- Fallback-innehåll (mallbaserat) -->
</section>
```

## Säkerhet i Tester

### Tester Använder INTE LLM som Standard

Tester är konfigurerade att **inte** använda LLM som standard:

```typescript
// tests/setup/vitest.setup.ts
const ALLOW_LLM_IN_TESTS = process.env.VITE_ALLOW_LLM_IN_TESTS === 'true';
const USE_LLM = process.env.VITE_USE_LLM === 'true';

// Om LLM inte är explicit aktiverat i tester → använd fallback
if (!ALLOW_LLM_IN_TESTS || !USE_LLM) {
  // Mock LLM-anrop eller använd fallback
}
```

### Explicit LLM-Tester

Endast specifika tester som explicit aktiverar LLM kan använda det:

```bash
# Endast dessa tester använder riktig LLM:
npm run test:llm:smoke        # VITE_ALLOW_LLM_IN_TESTS=true
npm run test:llm:smoke:cloud # Strikt ChatGPT
npm run test:llm:smoke:local # Ollama
```

**Säkerhet:**
- ✅ Vanliga tester (`npm test`) använder INTE LLM
- ✅ Vanliga tester använder INTE fallback-resultat
- ✅ Endast explicit LLM-tester kan producera LLM-resultat

## Identifiera Fallback i Produktion

### 1. I Browser DevTools

```javascript
// Hitta alla dokument med fallback
document.querySelectorAll('[data-llm-fallback-used="true"]')

// Hitta alla sektioner med fallback-innehåll
document.querySelectorAll('[data-source-summary="fallback"]')

// Kontrollera provider
document.querySelector('.doc-shell')?.getAttribute('data-llm-provider')
```

### 2. I Koden

```typescript
// llmDocumentation.ts
const result = await generateDocumentationWithLlm(...);
if (result.fallbackUsed) {
  console.warn('LLM fallback was used:', result.provider);
}

// bpmnGenerators.ts
const llmMetadata = {
  llmMetadata: { provider: 'local', model: 'llama3' },
  fallbackUsed: true,  // ← Tydlig flagga
  finalProvider: 'local',
};
```

### 3. I HTML-Output

```html
<!-- Fallback-banner syns alltid när fallback används -->
<div class="llm-fallback-banner">...</div>

<!-- Metadata i data-attribut -->
<div class="doc-shell" data-llm-fallback-used="true">...</div>
```

## Förhindra Fallback i Produktion

### 1. Inaktivera Fallback

```bash
# Inaktivera fallback till cloud
VITE_LLM_FALLBACK_TO_CLOUD_ON_LOCAL_ERROR=false

# Inaktivera fallback till local
VITE_LLM_FALLBACK_TO_LOCAL_ON_CLOUD_ERROR=false
```

### 2. Validera i Koden

```typescript
// Säkerställ att fallback inte används i kritiska flöden
const result = await generateDocumentationWithLlm(...);
if (result.fallbackUsed) {
  throw new Error('Fallback should not be used in this context');
}
```

### 3. Assertions i Tester

```typescript
// Tester ska alltid verifiera att fallback inte används
const result = await generateDocumentationWithLlm(...);
expect(result.fallbackUsed).toBe(false);
expect(result.provider).toBe('cloud'); // eller 'local' om det är avsiktligt
```

## Debugging Fallback

### 1. Loggning

Fallback-loggar skapas automatiskt:

```typescript
// llmFallback.ts
await logLlmFallback({
  eventType: 'documentation',
  status: 'fallback',
  reason: 'local-unavailable',
  docType: 'feature',
  nodeId: 'test-node',
});
```

### 2. Kontrollera Metadata

```typescript
// I browser console
const doc = document.querySelector('.doc-shell');
console.log({
  provider: doc?.getAttribute('data-llm-provider'),
  model: doc?.getAttribute('data-llm-model'),
  fallbackUsed: doc?.getAttribute('data-llm-fallback-used'),
});
```

### 3. Identifiera Sektioner

```typescript
// Hitta alla sektioner med fallback-innehåll
const fallbackSections = document.querySelectorAll('[data-source-*="fallback"]');
fallbackSections.forEach(section => {
  console.log('Fallback section:', section.getAttribute('class'));
});
```

## Best Practices

### 1. I Tester

✅ **Gör:**
- Använd mockade LLM-klienter i vanliga tester
- Verifiera att `fallbackUsed === false` i tester som förväntar sig LLM
- Använd temporära kataloger för testdata

❌ **Gör INTE:**
- Använd riktig LLM i vanliga tester
- Lita på fallback-resultat i tester
- Skriv till produktionskataloger

### 2. I Produktion

✅ **Gör:**
- Logga när fallback används
- Visa tydliga indikatorer för användare
- Validera att fallback inte används i kritiska flöden

❌ **Gör INTE:**
- Dölj fallback-status
- Använd fallback-resultat utan att markera dem
- Ignorera fallback-varningar

### 3. I Debugging

✅ **Gör:**
- Kontrollera `data-llm-fallback-used` attribut
- Granska loggar för fallback-events
- Verifiera provider i metadata

❌ **Gör INTE:**
- Anta att allt är LLM-genererat
- Ignorera fallback-banners
- Mixa fallback- och LLM-resultat utan att markera

## Exempel: Säker Test

```typescript
describe('Documentation Generation', () => {
  it('should generate without fallback', async () => {
    // Mock LLM-klient
    vi.mock('@/lib/llmClients', () => ({
      getLlmClient: () => ({
        generateText: vi.fn().mockResolvedValue('{"summary": "Test"}'),
      }),
    }));

    const result = await generateDocumentationWithLlm(...);
    
    // Verifiera att fallback INTE användes
    expect(result.fallbackUsed).toBe(false);
    expect(result.provider).toBe('cloud'); // eller 'local' om avsiktligt
  });
});
```

## Exempel: Identifiera Fallback i Produktion

```typescript
// I browser console eller debugging
function checkFallbackStatus() {
  const doc = document.querySelector('.doc-shell');
  if (!doc) return null;

  const fallbackUsed = doc.getAttribute('data-llm-fallback-used') === 'true';
  const provider = doc.getAttribute('data-llm-provider');
  
  if (fallbackUsed) {
    console.warn('⚠️ Fallback was used!', {
      provider,
      model: doc.getAttribute('data-llm-model'),
    });
    
    // Räkna fallback-sektioner
    const fallbackSections = document.querySelectorAll('[data-source-*="fallback"]');
    console.log(`Found ${fallbackSections.length} sections with fallback content`);
  }
  
  return { fallbackUsed, provider };
}
```

## Troubleshooting

### Problem: Fallback dyker upp i tester

**Lösning:**
1. Kontrollera att `VITE_ALLOW_LLM_IN_TESTS` inte är satt
2. Verifiera att LLM-klienter är mockade
3. Lägg till explicit assertion: `expect(result.fallbackUsed).toBe(false)`

### Problem: Fallback dyker upp i produktion när det inte ska

**Lösning:**
1. Kontrollera `data-llm-fallback-used` attribut
2. Granska loggar för fallback-events
3. Verifiera att fallback är inaktiverad om det behövs
4. Lägg till validering i kritiska flöden

### Problem: Svårt att identifiera fallback-resultat

**Lösning:**
1. Använd browser DevTools för att inspektera `data-*` attribut
2. Sök efter `llm-fallback-banner` i HTML
3. Kontrollera `data-source-*` attribut på sektioner
4. Använd `checkFallbackStatus()` funktionen ovan

