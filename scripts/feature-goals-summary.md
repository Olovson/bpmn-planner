# Feature Goals - Verifiering och Status

## Sammanfattning

**Datum**: 2025-01-XX
**Status efter rensning**: ✅ Felaktigt genererade feature goals borttagna

## Resultat

### 1. Verifiering av kvarvarande feature goals

- **Totalt antal**: 55 feature goals (efter rensning)
- **Subprocess process nodes**: 26/20 ✅ (några dubblerade med olika namnformat)
- **Call activities**: 23/34 ⚠️ (21 saknas)
- **Root process**: 1 fil borttagen (ska inte ha feature goal)

### 2. Kategorisering

#### ✅ Korrekta subprocess process nodes (26)
- Full name format: `mortgage-se-{processId}.html`
- Short name format: `{processId}.html` (t.ex. `appeal.html` → `mortgage-se-appeal`)
- With prefix: `mortgage-{processId}.html` (t.ex. `mortgage-appeal.html`)

#### ✅ Korrekta call activities (23)
- Hierarchical naming: `mortgage-se-{parent}-{elementId}.html`
- Exempel: `mortgage-se-application-internal-data-gathering.html`

#### ⚠️ Saknade call activities (21)
Följande CallActivities saknar feature goal-dokumentation:

1. `mortgage-se-manual-credit-evaluation.bpmn::Activity_1gzlxx4` (Automatic Credit Evaluation)
2. `mortgage-se-mortgage-commitment.bpmn::documentation-assessment` (Documentation assessment)
3. `mortgage-se-object-control.bpmn::object-information` (Object information)
4. `mortgage-se-object-control.bpmn::credit-evaluation-2` (Automatic Credit Evaluation)
5. `mortgage-se-object.bpmn::object-information` (Object information)
6. `mortgage-se-offer.bpmn::documentation-assessment` (Documentation assessment)
7. `mortgage-se-offer.bpmn::sales-contract-credit-decision` (Credit decision)
8. `mortgage-se-stakeholder.bpmn::internal-data-gathering` (Internal data gathering)
9. `mortgage.bpmn::credit-evaluation` (Automatic Credit Evaluation)
10. `mortgage.bpmn::credit-decision` (Credit decision)
11. `mortgage.bpmn::offer` (Offer preparation)
12. `mortgage.bpmn::collateral-registration` (Collateral registration)
13. `mortgage.bpmn::mortgage-commitment` (Mortgage commitment)
14. `mortgage.bpmn::kyc` (KYC)
15. `mortgage.bpmn::signing-advance` (Signing)
16. `mortgage.bpmn::disbursement-advance` (Disbursement)
17. `mortgage.bpmn::document-generation-advance` (Document generation)
18. `mortgage.bpmn::application` (Application)
19. `mortgage.bpmn::appeal` (Appeal)
20. `mortgage.bpmn::manual-credit-evaluation` (Manual credit evaluation)
21. `mortgage.bpmn::object-valuation` (Object valuation)

#### ❌ Borttagna felaktiga feature goals (51)
- Tasks (ServiceTask/UserTask) som felaktigt genererats som feature goals
- Exempel: `se-application.bpmn-activity_0p3rqyp.html` (ServiceTask "KALP")

#### ⚠️ Root process (1 borttagen)
- `mortgage.html` - Root process ska INTE ha feature goal

## Nästa steg

1. ✅ **Klart**: Ta bort felaktigt genererade feature goals (51 filer)
2. ✅ **Klart**: Ta bort root process feature goal (1 fil)
3. ⚠️ **Kvarstår**: Generera feature goal-dokumentation för 21 saknade CallActivities
4. ⚠️ **Kvarstår**: Fixa buggen i genereringskoden som skapar feature goals för tasks

## Rekommendationer

1. **Generera saknade CallActivity feature goals**: 
   - Kör generation för de 21 saknade CallActivities
   - Använd hierarchical naming: `mortgage-se-{parent}-{elementId}.html`

2. **Fixa genereringsbuggen**:
   - Säkerställ att endast CallActivities och subprocess process nodes genererar feature goals
   - Tasks (ServiceTask/UserTask/BusinessRuleTask) ska generera Epic-dokumentation, inte feature goals

3. **Validering**:
   - Skapa validering som förhindrar att tasks genereras som feature goals
   - Verifiera att alla CallActivities har feature goal-dokumentation
