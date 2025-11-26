# ChatGPT 429 Error Handling

## Problem

När OpenAI-kontot är inaktivt eller har billing-problem returnerar API:et 429-fel med meddelandet:
```
429 Your account is not active, please check your billing details on our website.
```

**Tidigare beteende:**
- Systemet fortsatte göra flera anrop trots 429-fel
- Detta kostade pengar utan att ge resultat
- Fallback till lokal LLM misslyckades också

## Lösning

### 1. Specifika Error-klasser

Skapade två nya error-klasser i `cloudLlmClient.ts`:

- **`CloudLlmAccountInactiveError`**: Kastas när kontot är inaktivt (permanent fel)
- **`CloudLlmRateLimitError`**: Kastas vid rate limiting (kan vara tillfälligt)

### 2. Global Flagga

En global flagga `accountInactive` stoppar alla framtida anrop när kontot är inaktivt:

```typescript
let accountInactive = false;

export function isCloudLlmAccountInactive(): boolean {
  return accountInactive;
}
```

### 3. Tidig Stoppning

Systemet kontrollerar nu kontostatus **innan** anrop görs:

```typescript
if (accountInactive) {
  console.warn('[Cloud LLM] Account is inactive - skipping request');
  throw new CloudLlmAccountInactiveError('...');
}
```

### 4. Intelligent Error Detection

429-fel analyseras för att identifiera om det är:
- **Permanent** (inaktivt konto) → Stoppa alla anrop
- **Tillfälligt** (rate limit) → Logga och kasta för retry

```typescript
const isAccountInactive = 
  errorMessage.toLowerCase().includes('account is not active') ||
  errorMessage.toLowerCase().includes('billing') ||
  errorMessage.toLowerCase().includes('payment');
```

### 5. Fallback-stoppning

Fallback-logiken stoppar nu om cloud-kontot är inaktivt:

```typescript
if (alternativeProvider === 'cloud' && isCloudLlmAccountInactive()) {
  throw new CloudLlmAccountInactiveError('Cannot fallback to cloud: account is inactive');
}
```

## Resultat

✅ **Inga onödiga API-anrop** när kontot är inaktivt
✅ **Tydliga felmeddelanden** som förklarar problemet
✅ **Automatisk fallback** till lokal dokumentation
✅ **Kostnadsbesparing** - inga misslyckade anrop

## Användning

### Kontrollera kontostatus

```typescript
import { isCloudLlmAccountInactive } from '@/lib/llmClients/cloudLlmClient';

if (isCloudLlmAccountInactive()) {
  console.log('Cloud LLM account is inactive');
}
```

### Återställ kontostatus (efter att ha fixat billing)

```typescript
import { resetCloudLlmAccountStatus } from '@/lib/llmClients/cloudLlmClient';

resetCloudLlmAccountStatus();
```

## Felmeddelanden

När kontot är inaktivt ser du nu tydliga meddelanden:

```
[Cloud LLM] Account is inactive - stopping all future requests
[LLM Fallback] Cloud account is inactive - stopping all requests
[LLM Documentation] Cloud account is inactive - using fallback
```

## Nästa Steg

1. **Kontrollera billing**: Gå till https://platform.openai.com/account/billing
2. **Återställ status**: Efter att ha fixat billing, ladda om sidan eller anropa `resetCloudLlmAccountStatus()`
3. **Försök igen**: Systemet kommer automatiskt att försöka igen när kontot är aktivt

---

**Datum:** 2025-11-26
**Status:** Implementerad och testad

