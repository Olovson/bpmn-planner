# Analys: Ordning av Aktiviteterna i mortgage.bpmn

## Översikt

Denna analys följer sequence flows i `mortgage.bpmn` för att bestämma den korrekta sekventiella ordningen av call activities.

## Huvudflöde (Happy Path)

### 1. Start → Application
- **StartEvent**: `Event_0ssbeto`
- **Sequence Flow**: `Flow_1fn7ls8`
- **Call Activity**: `application` ("Application")
- **Sequence Flow**: `Flow_0us992j`
- **Intermediate Event**: `event-application-evaluation-completed` ("Application completed")

### 2. Application → Purchase Decision
- **Sequence Flow**: `Flow_05h03ml`
- **Gateway**: `is-purchase` ("Is purchase?")
  - **Om "Yes"**:
    - **Call Activity**: `mortgage-commitment` ("Mortgage commitment")
    - **Sequence Flow**: `Flow_0cdajbw`
    - **Gateway**: `Gateway_0m8pi2g`
  - **Om "No"**:
    - **Sequence Flow**: `is-purchase-no`
    - **Gateway**: `Gateway_0m8pi2g`

### 3. Gateway → Credit Evaluation
- **Sequence Flow**: `Flow_06f0lv1`
- **Call Activity**: `credit-evaluation` ("Automatic Credit Evaluation")
- **Sequence Flow**: `Flow_0l53m32`
- **Intermediate Event**: `event-credit-evaluation-completed` ("Credit evaluation completed")

### 4. Credit Evaluation → Approval Decision
- **Sequence Flow**: `Flow_1gie2jo`
- **Gateway**: `is-automatically-approved` ("Automatically approved?")
  - **Om "Yes"**:
    - **Sequence Flow**: `is-automatically-approved-yes`
    - **Intermediate Event**: `event-automatically-approved` ("Application automatically approved")
    - **Sequence Flow**: `Flow_0h4stlf`
    - **Gateway**: `Gateway_0kd315e`
  - **Om "No"**:
    - **Sequence Flow**: `is-automatically-approved-no`
    - **Gateway**: `is-automatically-rejected` ("Automatically rejected?")
      - **Om "No"**:
        - **Sequence Flow**: `is-automatically-rejected-no`
        - **Call Activity**: `manual-credit-evaluation` ("Manual credit evaluation")
        - **Sequence Flow**: `Flow_0p5lcqb`
        - **Intermediate Event**: `event-application-manually-approved` ("Application manually evaluated")
        - **Sequence Flow**: `Flow_0tmgquz`
        - **Gateway**: `Gateway_0kd315e`
      - **Om "Yes"**:
        - **Sequence Flow**: `is-automatically-rejected-yes`
        - **Gateway**: `Gateway_0f1a2lu`
        - **Sequence Flow**: `Flow_0b4xof6`
        - **Call Activity**: `appeal` ("Appeal")
        - **Sequence Flow**: `Flow_105pnkf`
        - **Gateway**: `Gateway_1qiy2jr`
        - **Sequence Flow**: `Flow_1jetu85`
        - **Call Activity**: `manual-credit-evaluation` ("Manual credit evaluation")
        - (sedan samma flöde som ovan)

### 5. Gateway → Credit Evaluation Complete
- **Sequence Flow**: `Flow_01vw629`
- **Intermediate Event**: `event-credit-evaluation-complete` ("Credit evaluation completed")

### 6. Credit Evaluation Complete → KYC
- **Sequence Flow**: `Flow_1cnua0l`
- **Call Activity**: `kyc` ("KYC")
- **Sequence Flow**: `Flow_0sh7kx6`
- **Call Activity**: `credit-decision` ("Credit decision")

### 7. Credit Decision → Approval Check
- **Sequence Flow**: `Flow_1cd4ae2`
- **Gateway**: `is-credit-approved` ("Credit approved?")
  - **Om "Yes"**:
    - **Sequence Flow**: `is-credit-approved-yes`
    - **Intermediate Event**: `event-credit-decision-completed` ("Credit decision completed")
    - **Sequence Flow**: `Flow_1fvldyx`
    - **Intermediate Event**: `Event_111bwbu` ("Offer created")
    - **Sequence Flow**: `Flow_1m7kido`
    - **Call Activity**: `offer` ("Offer")
  - **Om "No"**:
    - **Sequence Flow**: `is-credit-approved-no`
    - **End Event**: `Event_0trq2wb` ("Credit decision rejected")

### 8. Offer → Document Generation
- **Sequence Flow**: `Flow_0rb02vx`
- **Intermediate Event**: `event-loan-ready` ("Loan ready")
- **Sequence Flow**: `Flow_1micci3`
- **Call Activity**: `document-generation` ("Document generation")
- **Sequence Flow**: `Flow_103801l`
- **Intermediate Event**: `Event_1u29t2f` ("Documents generated")
- **Sequence Flow**: `Flow_13h9ucs`
- **Call Activity**: `signing` ("Signing")

### 9. Signing → Disbursement
- **Sequence Flow**: `Flow_0grhoob`
- **Intermediate Event**: `event-signing-completed` ("Signing completed")
- **Sequence Flow**: `Flow_0vtuz4d`
- **Call Activity**: `disbursement` ("Disbursement")
- **Sequence Flow**: `Flow_0wxwicl`
- **Intermediate Event**: `event-loan-paid-out` ("Loan paid out")

### 10. Disbursement → Collateral Registration (Optional)
- **Sequence Flow**: `Flow_0lvbdw7`
- **Gateway**: `needs-collateral-registration` ("Needs collateral registration?")
  - **Om "Yes"**:
    - **Sequence Flow**: `needs-collateral-registration-yes`
    - **Call Activity**: `collateral-registration` ("Collateral registration")
    - **Sequence Flow**: `Flow_1rvmwyv`
    - **Intermediate Event**: `event-collateral-registration-completed` ("Collateral registration completed")
    - **Sequence Flow**: `Flow_1si5bet`
    - **Gateway**: `Gateway_13v2pnb`
  - **Om "No"**:
    - **Sequence Flow**: `needs-collateral-registration-no`
    - **Gateway**: `Gateway_13v2pnb`

### 11. Gateway → End
- **Sequence Flow**: `Flow_19yg364`
- **End Event**: `event-application-evaluated` ("Done")

## Sekventiell Ordning (Huvudflöde)

Baserat på sequence flows ovan, här är den korrekta sekventiella ordningen:

1. **Application** (`application`)
2. **Mortgage commitment** (`mortgage-commitment`) - *endast om "Is purchase? = Yes"*
3. **Automatic Credit Evaluation** (`credit-evaluation`)
4. **Manual credit evaluation** (`manual-credit-evaluation`) - *endast om "Automatically approved? = No" och "Automatically rejected? = No"*
5. **Appeal** (`appeal`) - *endast om "Automatically rejected? = Yes"*
6. **KYC** (`kyc`)
7. **Credit decision** (`credit-decision`)
8. **Offer** (`offer`) - *endast om "Credit approved? = Yes"*
9. **Document generation** (`document-generation`)
10. **Signing** (`signing`)
11. **Disbursement** (`disbursement`)
12. **Collateral registration** (`collateral-registration`) - *endast om "Needs collateral registration? = Yes"*

## Viktiga Observationer

### Intermediate Events i Sequence Flows

Flera intermediate events är kritiska för att förstå ordningen:

1. **`event-credit-evaluation-complete`** (`Event_17c905q`):
   - Kommer efter `Gateway_0kd315e`
   - Ligger mellan credit evaluation och KYC
   - **Sequence Flow**: `Flow_1cnua0l` → `kyc`

2. **`Event_111bwbu`** ("Offer created"):
   - Kommer efter `event-credit-decision-completed`
   - Ligger mellan credit decision och offer
   - **Sequence Flow**: `Flow_1m7kido` → `offer`

3. **`event-loan-ready`**:
   - Kommer efter `offer`
   - Ligger mellan offer och document generation
   - **Sequence Flow**: `Flow_1micci3` → `document-generation`

### KYC och Credit Decision Ordning

**Korrekt ordning:**
1. `event-credit-evaluation-complete` (intermediate event)
2. **KYC** (`kyc`)
3. **Credit decision** (`credit-decision`)
4. `event-credit-decision-completed` (intermediate event)
5. `Event_111bwbu` ("Offer created") (intermediate event)
6. **Offer** (`offer`)

**Anledning:**
- `Flow_1cnua0l`: `event-credit-evaluation-complete` → `kyc`
- `Flow_0sh7kx6`: `kyc` → `credit-decision`
- `Flow_1fvldyx`: `event-credit-decision-completed` → `Event_111bwbu`
- `Flow_1m7kido`: `Event_111bwbu` → `offer`

### Parallelle Flöden

1. **Advance-flöde** (från offer boundary event):
   - `event-trigger-advance` → `event-advance-ready` → `document-generation-advance` → `signing-advance` → `disbursement-advance` → `event-advance-paid-out`
   - Detta är ett parallellt flöde som kan triggas medan offer pågår

2. **Appeal-flöde**:
   - Kan triggas från flera ställen:
     - Från `is-automatically-rejected` gateway (om "Yes")
     - Från `Event_0y9br1l` boundary event på `credit-decision` ("Manual re-evaluation required")
   - Båda flödena går tillbaka till `manual-credit-evaluation`

## Slutsats: Förväntad Ordning

För huvudflödet (happy path) borde ordningen vara:

1. **Application**
2. **Mortgage commitment** (villkorligt)
3. **Automatic Credit Evaluation**
4. **Manual credit evaluation** (villkorligt)
5. **KYC** ← **KRITISKT: Kommer FÖRE Credit decision**
6. **Credit decision** ← **KRITISKT: Kommer FÖRE Offer**
7. **Offer** ← **KRITISKT: Kommer EFTER Credit decision**
8. **Document generation**
9. **Signing**
10. **Disbursement**
11. **Collateral registration** (villkorligt)

### Nyckelinsikt

**KYC → Credit decision → Offer** är den korrekta ordningen eftersom:
- `event-credit-evaluation-complete` → `kyc` (Flow_1cnua0l)
- `kyc` → `credit-decision` (Flow_0sh7kx6)
- `event-credit-decision-completed` → `Event_111bwbu` → `offer` (Flow_1fvldyx → Flow_1m7kido)

Intermediate events (`event-credit-evaluation-complete` och `Event_111bwbu`) är kritiska för att förstå denna ordning, eftersom de ligger på sequence flows mellan call activities.


