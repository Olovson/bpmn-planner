# Analys: Login-problem i Playwright-tester

## Problem

Tester redirectas till `/auth` trots login-försök. URL:en blir `http://localhost:8080/files#/auth`.

## Rotorsak

1. **Supabase client läser sessionen från localStorage**
   - `ProtectedRoute` använder `supabase.auth.getSession()` för att kolla om användaren är inloggad
   - Om `getSession()` returnerar `null`, redirectas användaren till `/auth`

2. **Sessionen sparas inte korrekt i localStorage**
   - Vi försöker spara sessionen manuellt med fel format
   - Supabase client använder ett specifikt format för localStorage-nyckeln
   - Formatet är: `sb-{url-hash}-auth-token` där url-hash är en hash av Supabase URL:en

3. **Vi kan inte importera Supabase client i `page.evaluate()`**
   - `page.evaluate()` körs i browser-kontexten, inte i Node.js
   - Vi kan inte importera ES-moduler där

## Lösning

Använd Supabase client från appen direkt genom att:
1. Ladda appen (Supabase client skapas automatiskt)
2. Exponera Supabase client via `window` objektet eller använd det direkt
3. Använd `supabase.auth.signInWithPassword()` för att logga in
4. Supabase client sparar automatiskt sessionen i rätt format

## Implementation

Istället för att försöka spara sessionen manuellt, använd Supabase client från appen:

```typescript
// I page.evaluate(), använd Supabase client från appen
const supabase = window.__SUPABASE_CLIENT__ || // om vi exponerar det
  // eller använd appens Supabase client direkt
```

Eller ännu enklare: Använd UI-login men gör den mer robust genom att vänta på att sessionen faktiskt är etablerad.

