# Djup Analys: Login-problem i Playwright-tester

## Problem

Tester redirectas till `/auth` trots login-försök. URL:en blir `http://localhost:8080/files#/auth`.

## Möjliga Orsaker

### 1. Samma konto används för app och tester
- **Problem:** Om användaren är inloggad i appen med `seed-bot@local.test`, och testerna försöker logga in med samma konto, kan det orsaka konflikter
- **Symptom:** Sessionen kanske inte sparas korrekt eftersom det redan finns en aktiv session
- **Lösning:** Skapa ett dedikerat test-konto (t.ex. `test-bot@local.test`) som endast används för tester

### 2. Sessionen sparas inte korrekt
- **Problem:** Supabase client sparar sessionen i localStorage med ett specifikt format
- **Symptom:** Sessionen finns i localStorage men Supabase client kan inte läsa den
- **Lösning:** Använd Supabase client direkt för att logga in (vilket vi gör i TestLogin.tsx)

### 3. Timing-problem
- **Problem:** `ProtectedRoute` kollar sessionen innan den är helt etablerad
- **Symptom:** Vi navigerar till `/files` men `ProtectedRoute` hittar inte sessionen ännu
- **Lösning:** Vänta längre eller verifiera att sessionen faktiskt är etablerad innan vi navigerar

## Rekommendation

**Skapa ett dedikerat test-konto:**
- **Fördelar:**
  - Tester stör inte användarens session i appen
  - Tester kan köras parallellt med app-användning
  - Tydligare separation mellan test och produktionsdata
  - Mindre risk för konflikter

- **Implementation:**
  1. Skapa `test-bot@local.test` i `global-setup.ts`
  2. Använd `test-bot@local.test` i alla tester
  3. Behåll `seed-bot@local.test` för app-användning

