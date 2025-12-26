# Resultat av Legacy Dokumentation Migration

## Migration Kördes: 2025-12-26

### Sammanfattning

- **Totalt antal Feature Goal filer i Storage:** 50
- **Migrerade filer:** 11
- **Hoppade över filer:** 39
- **Misslyckade migrationer:** 0

### Migrerade Filer (11 st)

1. ✅ `mortgage-se-appeal.html` → `mortgage-appeal.html`
2. ✅ `mortgage-se-application.html` → `mortgage-application.html`
3. ✅ `mortgage-se-collateral-registration.html` → `mortgage-collateral-registration.html`
4. ✅ `mortgage-se-household.html` → `mortgage-se-application-household.html`
5. ✅ `mortgage-se-kyc.html` → `mortgage-kyc.html`
6. ✅ `mortgage-se-manual-credit-evaluation.html` → `mortgage-manual-credit-evaluation.html`
7. ✅ `mortgage-se-mortgage-commitment.html` → `mortgage-mortgage-commitment.html`
8. ✅ `mortgage-se-object-control.html` → `mortgage-se-manual-credit-evaluation-object-control.html`
9. ✅ `mortgage-se-object-valuation.html` → `mortgage-object-valuation.html`
10. ✅ `mortgage-se-object.html` → `mortgage-se-application-object.html`
11. ✅ `mortgage-se-stakeholder.html` → `mortgage-se-application-stakeholder.html`

### Hoppade Över Filer (39 st)

#### Anledning: Flera möjliga matchningar (osäker matchning)

Dessa filer hoppades över eftersom samma subprocess anropas från flera olika parents, och vi kan inte veta vilken som är korrekt:

1. `mortgage-se-credit-decision.html` - 3 matchningar:
   - `mortgage-se-offer.bpmn` → `credit-decision`
   - `mortgage-se-offer.bpmn` → `sales-contract-credit-decision`
   - `mortgage.bpmn` → `credit-decision`

2. `mortgage-se-credit-evaluation.html` - 6 matchningar:
   - `mortgage-se-manual-credit-evaluation.bpmn` → `Activity_1gzlxx4`
   - `mortgage-se-manual-credit-evaluation.bpmn` → `credit-evaluation`
   - `mortgage-se-mortgage-commitment.bpmn` → `credit-evaluation-1`
   - `mortgage-se-mortgage-commitment.bpmn` → `credit-evaluation-2`
   - `mortgage-se-object-control.bpmn` → `credit-evaluation`
   - `mortgage.bpmn` → `credit-evaluation`

3. `mortgage-se-disbursement.html` - 2 matchningar:
   - `mortgage.bpmn` → `disbursement`
   - `mortgage.bpmn` → `disbursement-advance`

4. `mortgage-se-document-generation.html` - 2 matchningar:
   - `mortgage.bpmn` → `document-generation`
   - `mortgage.bpmn` → `document-generation-advance`

5. `mortgage-se-documentation-assessment.html` - 3 matchningar:
   - `mortgage-se-manual-credit-evaluation.bpmn` → `documentation-assessment`
   - `mortgage-se-mortgage-commitment.bpmn` → `documentation-assessment`
   - `mortgage-se-offer.bpmn` → `documentation-assessment`

6. `mortgage-se-internal-data-gathering.html` - 2 matchningar:
   - `mortgage-se-application.bpmn` → `internal-data-gathering`
   - `mortgage-se-stakeholder.bpmn` → `internal-data-gathering`

7. `mortgage-se-object-information.html` - 3 matchningar:
   - `mortgage-se-mortgage-commitment.bpmn` → `object-information`
   - `mortgage-se-object-control.bpmn` → `object-information`
   - `mortgage-se-object.bpmn` → `object-information`

8. `mortgage-se-signing.html` - 2 matchningar:
   - `mortgage.bpmn` → `signing`
   - `mortgage.bpmn` → `signing-advance`

#### Anledning: Ingen matchning i bpmn-map.json

Dessa filer hittades inte i bpmn-map.json (kan vara process-noder eller filer med annat namn):

- `mortgage-appeal.html` (redan hierarchical?)
- `mortgage-application.html` (redan hierarchical?)
- `mortgage-collateral-registration.html` (redan hierarchical?)
- `mortgage-credit-decision.html` (redan hierarchical?)
- `mortgage-credit-evaluation.html` (redan hierarchical?)
- `mortgage-disbursement-advance.html` (redan hierarchical?)
- `mortgage-disbursement.html` (redan hierarchical?)
- `mortgage-document-generation-advance.html` (redan hierarchical?)
- `mortgage-document-generation.html` (redan hierarchical?)
- `mortgage-kyc.html` (redan hierarchical?)
- `mortgage-manual-credit-evaluation.html` (redan hierarchical?)
- `mortgage-mortgage-commitment.html` (redan hierarchical?)
- `mortgage-object-valuation.html` (redan hierarchical?)
- `mortgage-offer.html` (redan hierarchical?)
- `mortgage-se-application-household.html` (redan hierarchical?)
- `mortgage-se-application-internal-data-gathering.html` (redan hierarchical?)
- `mortgage-se-application-object.html` (redan hierarchical?)
- `mortgage-se-application-stakeholder.html` (redan hierarchical?)
- `mortgage-se-manual-credit-evaluation-Activity_1gzlxx4.html` (special case)
- `mortgage-se-manual-credit-evaluation-documentation-assessment.html` (redan hierarchical?)
- `mortgage-se-manual-credit-evaluation-object-control.html` (redan hierarchical?)
- `mortgage-se-mortgage-commitment-credit-evaluation-1.html` (redan hierarchical?)
- `mortgage-se-mortgage-commitment-credit-evaluation-2.html` (redan hierarchical?)
- `mortgage-se-mortgage-commitment-documentation-assessment.html` (redan hierarchical?)
- `mortgage-se-mortgage-commitment-object-information.html` (redan hierarchical?)
- `mortgage-se-object-control-credit-evaluation-2.html` (redan hierarchical?)
- `mortgage-se-object-control-object-information.html` (redan hierarchical?)
- `mortgage-se-object-object-information.html` (redan hierarchical?)
- `mortgage-se-stakeholder-internal-data-gathering.html` (redan hierarchical?)
- `mortgage-signing-advance.html` (redan hierarchical?)
- `mortgage-signing.html` (redan hierarchical?)

## Status Efter Migration

### Dokumentation Status för mortgage.bpmn

- **Totalt call activities:** 39
- **✅ Hittade dokumentation:** 31
- **❌ Saknade dokumentation:** 8

### Saknade Dokumentationer (8 st)

1. **Documentation handling** (från `mortgage-se-manual-credit-evaluation.bpmn`)
   - Subprocess: `mortgage-se-documentation-handling.bpmn`
   - ElementId: `documentation-handling`
   - Parent: `mortgage-se-manual-credit-evaluation.bpmn`

2. **Documentation handling** (från `mortgage-se-mortgage-commitment.bpmn`)
   - Subprocess: `mortgage-se-documentation-handling.bpmn`
   - ElementId: `documentation-handling`
   - Parent: `mortgage-se-mortgage-commitment.bpmn`

3. **Automatic Credit Evaluation** (från `mortgage-se-object-control.bpmn`)
   - Subprocess: `mortgage-se-credit-evaluation.bpmn`
   - ElementId: `credit-evaluation`
   - Parent: `mortgage-se-object-control.bpmn`
   - **Anledning:** Legacy fil `mortgage-se-credit-evaluation.html` har 6 matchningar - kunde inte migreras automatiskt

4. **Credit decision** (från `mortgage-se-offer.bpmn`)
   - Subprocess: `mortgage-se-credit-decision.bpmn`
   - ElementId: `credit-decision`
   - Parent: `mortgage-se-offer.bpmn`
   - **Anledning:** Legacy fil `mortgage-se-credit-decision.html` har 3 matchningar - kunde inte migreras automatiskt

5. **Documentation assessment** (från `mortgage-se-offer.bpmn`)
   - Subprocess: `mortgage-se-documentation-assessment.bpmn`
   - ElementId: `documentation-assessment`
   - Parent: `mortgage-se-offer.bpmn`
   - **Anledning:** Legacy fil `mortgage-se-documentation-assessment.html` har 3 matchningar - kunde inte migreras automatiskt

6. **Documentation handling** (från `mortgage-se-offer.bpmn`)
   - Subprocess: `mortgage-se-documentation-handling.bpmn`
   - ElementId: `documentation-handling`
   - Parent: `mortgage-se-offer.bpmn`

7. **Credit decision** (från `mortgage-se-offer.bpmn`)
   - Subprocess: `mortgage-se-credit-decision.bpmn`
   - ElementId: `sales-contract-credit-decision`
   - Parent: `mortgage-se-offer.bpmn`
   - **Anledning:** Legacy fil `mortgage-se-credit-decision.html` har 3 matchningar - kunde inte migreras automatiskt

8. **Handle Terminations** (från `mortgage.bpmn`)
   - Subprocess: `mortgage-se-handle-terminations.bpmn`
   - ElementId: `handle-terminations`
   - Parent: `mortgage.bpmn`

## Nästa Steg

### För Saknade Dokumentationer

1. **Documentation handling** (3 instanser) - Generera ny dokumentation med hierarchical naming
2. **Credit evaluation från object-control** - Manuell migration från legacy fil (6 matchningar)
3. **Credit decision från offer** (2 instanser) - Manuell migration från legacy fil (3 matchningar)
4. **Documentation assessment från offer** - Manuell migration från legacy fil (3 matchningar)
5. **Handle Terminations** - Generera ny dokumentation

### För Filer med Flera Matchningar

Dessa filer behöver manuell hantering eftersom samma subprocess anropas från flera parents:

- `mortgage-se-credit-decision.html` → Skapa kopior för varje parent
- `mortgage-se-credit-evaluation.html` → Skapa kopior för varje parent
- `mortgage-se-disbursement.html` → Skapa kopior för varje parent
- `mortgage-se-document-generation.html` → Skapa kopior för varje parent
- `mortgage-se-documentation-assessment.html` → Skapa kopior för varje parent
- `mortgage-se-internal-data-gathering.html` → Skapa kopior för varje parent
- `mortgage-se-object-information.html` → Skapa kopior för varje parent
- `mortgage-se-signing.html` → Skapa kopior för varje parent

## Rekommendation

1. **Generera ny dokumentation** för de 8 saknade filerna (snabbast)
2. **Manuell migration** för filer med flera matchningar (om legacy innehåll är viktigt att behålla)
3. **Ta bort legacy filer** efter verifiering (för att spara storage)

