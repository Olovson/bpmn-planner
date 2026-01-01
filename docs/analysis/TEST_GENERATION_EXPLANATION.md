# Förklaring: Hur testgenerering fungerar

## Nuvarande beteende

### Testgenerering körs per fil

När du kör testgenerering för `mortgage.bpmn`:

1. **Hittar call activities i root-processen** (`mortgage.bpmn`)
   - I ditt fall: 15 call activities (t.ex. "credit-evaluation", "application", "signing", etc.)

2. **Kontrollerar dokumentation för varje call activity**
   - Letar efter Process Feature Goal-dokumentation för subprocess-filen som call activity anropar
   - "14 av 15" betyder att 14 av 15 call activities har dokumentation
   - Den saknade är "KYC" (ingen subprocess-fil hittades via bpmn-map.json)

3. **Genererar E2E-scenarios för root-processen** (`mortgage.bpmn`)
   - Genererar endast E2E-scenarios för paths i `mortgage.bpmn`
   - I ditt fall: 1 E2E-scenario genererades (för path "update-party → Event_0toyt0y")

4. **Extraherar Feature Goal-tester från E2E-scenarios**
   - Extraherar Feature Goal-tester för call activities som finns i E2E-scenarios
   - I ditt fall: 1 Feature Goal-test-scenario genererades (från 1 E2E-scenario)

### Varför genereras inte tester för `application.bpmn` och `internal-data-gathering.bpmn`?

**Kort svar:** Testgenerering körs per fil. För att få tester för `application.bpmn` och `internal-data-gathering.bpmn` måste du köra testgenerering för varje fil separat.

**Detaljerat:**
- `application.bpmn` och `internal-data-gathering.bpmn` är **subprocess-filer** som anropas från `mortgage.bpmn`
- När du kör testgenerering för `mortgage.bpmn`, genereras tester för **call activities i root-processen**, inte för subprocess-filerna själva
- Feature Goal-tester extraheras från E2E-scenarios, och E2E-scenarios genereras bara för root-processen

### "14 av 15 Feature Goals" - vad betyder det?

- Detta räknar **call activities i `mortgage.bpmn`**, inte subprocess-filer
- Flera call activities kan peka på samma subprocess-fil:
  - T.ex. flera call activities pekar på `mortgage-se-application.bpmn`
  - Varje call activity räknas separat
- "14 av 15" betyder att 14 call activities har Process Feature Goal-dokumentation, 1 saknas ("KYC")

## Exempel

För `mortgage.bpmn` med 15 call activities:

| Call Activity | Subprocess-fil | Dokumentation hittad? |
|---------------|----------------|----------------------|
| credit-evaluation | mortgage-se-application.bpmn | ✅ |
| credit-decision | mortgage-se-application.bpmn | ✅ |
| application | mortgage-se-application.bpmn | ✅ |
| signing | mortgage-se-internal-data-gathering.bpmn | ✅ |
| disbursement | mortgage-se-internal-data-gathering.bpmn | ✅ |
| ... | ... | ... |
| kyc | (ingen fil hittad) | ❌ |

**Resultat:** 14 av 15 call activities har dokumentation.

## Hur få tester för subprocess-filer?

För att få tester för `application.bpmn` och `internal-data-gathering.bpmn`:

1. **Kör testgenerering för varje fil separat:**
   - Kör testgenerering för `mortgage-se-application.bpmn`
   - Kör testgenerering för `mortgage-se-internal-data-gathering.bpmn`

2. **Vad genereras för varje subprocess-fil:**
   - E2E-scenarios för paths i subprocess-filen (om den har call activities)
   - Feature Goal-tester för call activities i subprocess-filen

## Förbättringsmöjlighet

Om du vill att testgenerering automatiskt ska generera tester för alla subprocess-filer i hierarkin, skulle vi kunna:

1. **Identifiera alla subprocess-filer** från call activities i root-processen
2. **Köra testgenerering rekursivt** för varje subprocess-fil
3. **Aggregera resultat** från alla filer

Ska jag implementera detta?

