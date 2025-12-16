# Analys: Saknade testinfo för callActivities

## Översikt

Detta dokument analyserar vilka callActivities som saknar testinfo i E2E_BR001 och varför.

## CallActivities som saknar testinfo

### 1. CallActivities som INTE är en del av happy path

Dessa callActivities anropas bara i alternativa flöden (gateway-beslut går åt annat håll):

#### `collateral-registration`
- **Anropas när:** `needs-collateral-registration` gateway = "Yes"
- **I E2E_BR001 happy path:** Gateway = "No" → callActivity anropas INTE
- **Orsak:** Inte en del av happy path för detta scenario
- **Lösning:** Skapa separat E2E-scenario där `needs-collateral-registration` = "Yes"

#### `appeal`
- **Anropas när:** `is-automatically-rejected` gateway = "No (yellow / blue)"
- **I E2E_BR001 happy path:** Gateway = "Yes" (automatiskt godkänd) → callActivity anropas INTE
- **Orsak:** Inte en del av happy path för detta scenario
- **Lösning:** Skapa separat E2E-scenario för appeal-flöde

#### `manual-credit-evaluation`
- **Anropas när:** `is-automatically-rejected` gateway = "No (yellow / blue)"
- **I E2E_BR001 happy path:** Gateway = "Yes" (automatiskt godkänd) → callActivity anropas INTE
- **Orsak:** Inte en del av happy path för detta scenario
- **Lösning:** Skapa separat E2E-scenario för manual credit evaluation

### 2. Subprocesser under "Application" som saknar egna entries

Dessa callActivities anropas INNE i "Application" subprocessen, men saknar egna entries i `subprocessSteps`:

#### `internal-data-gathering`
- **Anropas i:** `application` subprocess
- **Status:** Saknar egen entry i `subprocessSteps`
- **Orsak:** Testinfo finns på "Application"-nivån, inte på subprocess-nivå
- **Lösning:** Lägg till egen entry i `subprocessSteps` om det behövs separat testinfo

#### `stakeholder`
- **Anropas i:** `application` subprocess (multi-instance - körs för varje stakeholder)
- **Status:** Saknar egen entry i `subprocessSteps`
- **Orsak:** Testinfo finns på "Application"-nivån
- **Lösning:** Lägg till egen entry om det behövs separat testinfo

#### `household`
- **Anropas i:** `application` subprocess
- **Status:** Saknar egen entry i `subprocessSteps`
- **Orsak:** Testinfo finns på "Application"-nivån
- **Lösning:** Lägg till egen entry om det behövs separat testinfo

#### `object`
- **Anropas i:** `application` subprocess
- **Status:** Saknar egen entry i `subprocessSteps`
- **Orsak:** Testinfo finns på "Application"-nivån
- **Lösning:** Lägg till egen entry om det behövs separat testinfo

### 3. Subprocesser under "Mortgage Commitment" som saknar egna entries

#### `object-information`
- **Anropas i:** `mortgage-commitment` subprocess
- **Status:** Saknar egen entry i `subprocessSteps`
- **Orsak:** Testinfo finns på "Mortgage Commitment"-nivån
- **Lösning:** Lägg till egen entry om det behövs separat testinfo

## Rekommendationer

### För callActivities som inte är en del av happy path:
1. **Skapa separata E2E-scenarion** för dessa flöden (t.ex. E2E_BR002 för collateral registration, E2E_BR003 för appeal, etc.)

### För subprocesser som saknar egna entries:
1. **Lägg till entries i `subprocessSteps`** om det behövs separat testinfo för dessa subprocesser
2. **Alternativt:** Behåll testinfo på högre nivå (t.ex. "Application") om det är tillräckligt

## Nuvarande status för E2E_BR001

### CallActivities med testinfo:
- ✅ `application`
- ✅ `mortgage-commitment`
- ✅ `object-valuation`
- ✅ `credit-evaluation`
- ✅ `kyc`
- ✅ `credit-decision`
- ✅ `offer`
- ✅ `document-generation`
- ✅ `signing`
- ✅ `disbursement`

### CallActivities utan testinfo (inte i happy path):
- ❌ `collateral-registration` (gateway = "No")
- ❌ `appeal` (gateway = "Yes" → hoppar över)
- ❌ `manual-credit-evaluation` (gateway = "Yes" → hoppar över)

### Subprocesser utan egna entries:
- ⚠️ `internal-data-gathering` (under `application`)
- ⚠️ `stakeholder` (under `application`)
- ⚠️ `household` (under `application`)
- ⚠️ `object` (under `application`)
- ⚠️ `object-information` (under `mortgage-commitment`)

