# E2E Quality Validation - Dokumentation

## Problem

E2E-testscenarion behöver valideras för att säkerställa kvalitet, men valideringsscriptet kan inte importera scenarios direkt eftersom `E2eTestsOverviewPage.tsx` har browser-beroenden (t.ex. React, Supabase client).

## Lösning

Vi har skapat två alternativ:

### Alternativ 1: Valideringssida i appen (Rekommenderat)

En valideringssida i appen som körs i browser-miljön där alla beroenden är tillgängliga.

**Fördelar:**
- Alla beroenden är tillgängliga
- Kan köras direkt i appen
- Kan visas som en dashboard

**Nackdelar:**
- Kräver att appen körs

### Alternativ 2: JSON-export + Valideringsscript

Ett script som exporterar scenarios till JSON, och sedan ett valideringsscript som läser JSON.

**Fördelar:**
- Kan köras standalone
- Ingen browser krävs

**Nackdelar:**
- Kräver två steg (export + validering)
- JSON kan bli inaktuell

## Implementering

### Steg 1: Skapa valideringssida i appen

Skapa en sida `/e2e-quality-validation` som:
1. Importerar scenarios från `E2eTestsOverviewPage.tsx`
2. Kör valideringar
3. Visar resultat som en dashboard

### Steg 2: Valideringsfunktionalitet

Valideringsfunktionaliteten kontrollerar:

1. **ServiceTasks**
   - Alla ServiceTasks har `apiCall` dokumenterat
   - Alla API-anrop har motsvarande mocks

2. **UserTasks**
   - Alla UserTasks har `uiInteraction` definierat

3. **BusinessRuleTasks**
   - Alla BusinessRuleTasks har `dmnDecision` dokumenterat

4. **Subprocesses**
   - Alla subprocesser har `given`, `when`, `then` dokumenterade

5. **API Mocks**
   - Alla API-anrop har motsvarande mocks i `mortgageE2eMocks.ts`

## Nästa steg

1. Skapa valideringssida i appen
2. Implementera valideringslogik
3. Visa resultat som dashboard
4. Lägg till automatiska förbättringsförslag

