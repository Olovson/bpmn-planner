# Jämförelse: Två Alternativ för Filordning

## Datum: 2025-12-28

## Översikt

Det finns två möjliga sätt att sortera filer för dokumentationsgenerering:

1. **Alternativ A: Matcha UI-ordningen exakt** - Application först, sedan dess subprocesser
2. **Alternativ B: Topologisk ordning** - Subprocesser före parent, men följer root callActivities-ordningen

---

## Alternativ A: Matcha UI-ordningen exakt

**Princip:** Varje root callActivity och dess subprocesser processas tillsammans, i den ordning de visas i UI:n.

**Ordning:**
1. Application (visual:0) + dess subprocesser
2. Mortgage commitment (visual:1) + dess subprocesser
3. Credit Evaluation (visual:3) + dess subprocesser
... etc.

**Fördelar:**
- ✅ Matchar exakt hur UI:n visar processer
- ✅ Lättare att följa i loggarna
- ✅ Intuitivt för användare

**Nackdelar:**
- ❌ Subprocesser genereras EFTER parent (kan sakna child-dokumentation när parent Feature Goal genereras)

---

## Alternativ B: Topologisk ordning (nuvarande)

**Princip:** Subprocesser genereras FÖRE parent, men följer root callActivities-ordningen.

**Ordning:**
1. Application subprocesser (internal-data-gathering, stakeholder, household, object-information, object)
2. Application
3. Credit Evaluation subprocesser
4. Credit Evaluation
... etc.

**Fördelar:**
- ✅ Subprocesser genereras FÖRE parent (child-dokumentation finns tillgänglig när parent Feature Goal genereras)
- ✅ Topologiskt korrekt (ingen dependency-problem)

**Nackdelar:**
- ❌ Matchar inte UI-ordningen exakt
- ❌ Kan vara förvirrande i loggarna

---

## Jämförelse: Första 50 Dokumenten

### Alternativ A: Matcha UI-ordningen exakt

```
📄 1. mortgage-se-application.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-application)
   📝 Epics (1): Confirm application
   📄 Combined (file-level documentation)

📄 2. mortgage-se-internal-data-gathering.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-internal-data-gathering
   📝 Epics (4): Fetch credit report, Fetch income data, Fetch employment data, Validate application data
   📄 Combined (file-level documentation)

📄 3. mortgage-se-stakeholder.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-stakeholder
   📝 Epics (3): Identify stakeholders, Validate stakeholder data, Register stakeholder
   📄 Combined (file-level documentation)

📄 4. mortgage-se-household.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-household
   📝 Epics (4): Identify household members, Validate household data, Register household, Calculate household income
   📄 Combined (file-level documentation)

📄 5. mortgage-se-object-information.bpmn (subprocess till Object)
   🎯 Feature Goals (1): mortgage-se-object-object-information
   📝 Epics (3): Fetch object information, Validate object data, Register object information
   📄 Combined (file-level documentation)

📄 6. mortgage-se-object.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-object
   📝 Epics (2): Identify object, Validate object data
   📄 Combined (file-level documentation)

📄 7. mortgage-se-mortgage-commitment.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-mortgage-commitment)
   📝 Epics (1): Decide on mortgage commitment
   📄 Combined (file-level documentation)

📄 8. mortgage-se-credit-evaluation.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-credit-evaluation)
   📝 Epics (9): Amortisation, Calculate household affordability, Evaluate application, Evaluate credit policies, Evaluate household, Evaluate stakeholders, Fetch price, Fetch product, Fetch risk classification
   📄 Combined (file-level documentation)

📄 9. mortgage-se-appeal.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-appeal)
   📝 Epics (2): Process appeal, Review appeal decision
   📄 Combined (file-level documentation)

📄 10. mortgage-se-manual-credit-evaluation.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-manual-credit-evaluation)
   📝 Epics (1): Perform manual credit evaluation
   📄 Combined (file-level documentation)

📄 11. mortgage-se-documentation-assessment.bpmn (subprocess till Manual credit evaluation)
   🎯 Feature Goals (1): mortgage-se-manual-credit-evaluation-documentation-assessment
   📝 Epics (3): Assess documentation, Validate documentation, Register documentation assessment
   📄 Combined (file-level documentation)

📄 12. mortgage-se-kyc.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-kyc)
   📝 Epics (5): Evaluate KYC/AML, Fetch AML / KYC risk score, Fetch sanctions and PEP, Review KYC, Submit self declaration
   📄 Combined (file-level documentation)

📄 13. mortgage-se-credit-decision.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-credit-decision)
   📝 Epics (4): Credit decision rules, Evaluate application x3
   📄 Combined (file-level documentation)

📄 14. mortgage-se-offer.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-offer)
   📝 Epics (2): Decide on offer, Perform advanced underwriting
   📄 Combined (file-level documentation)

📄 15. mortgage-se-document-generation.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-document-generation)
   📝 Epics (3): Generate documents, Validate documents, Register documents
   📄 Combined (file-level documentation)

📄 16. mortgage-se-signing.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-signing)
   📝 Epics (2): Sign documents, Validate signatures
   📄 Combined (file-level documentation)

📄 17. mortgage-se-disbursement.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-disbursement)
   📝 Epics (2): Process disbursement, Validate disbursement
   📄 Combined (file-level documentation)

📄 18. mortgage-se-collateral-registration.bpmn
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-collateral-registration)
   📝 Epics (2): Register collateral, Validate collateral registration
   📄 Combined (file-level documentation)

📄 19. mortgage.bpmn (root)
   🎯 Feature Goals (1): Root Feature Goal (mortgage)
   📝 Epics (0): (inga epics i root-processen)
   📄 Combined (file-level documentation)
```

**Totalt: ~50 dokument** (19 Feature Goals + 19 Combined + ~12 Epics från första filerna)

---

### Alternativ B: Topologisk ordning (nuvarande)

```
📄 1. mortgage-se-internal-data-gathering.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-internal-data-gathering
   📝 Epics (4): Fetch credit report, Fetch income data, Fetch employment data, Validate application data
   📄 Combined (file-level documentation)

📄 2. mortgage-se-stakeholder.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-stakeholder
   📝 Epics (3): Identify stakeholders, Validate stakeholder data, Register stakeholder
   📄 Combined (file-level documentation)

📄 3. mortgage-se-household.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-household
   📝 Epics (4): Identify household members, Validate household data, Register household, Calculate household income
   📄 Combined (file-level documentation)

📄 4. mortgage-se-object-information.bpmn (subprocess till Object)
   🎯 Feature Goals (1): mortgage-se-object-object-information
   📝 Epics (3): Fetch object information, Validate object data, Register object information
   📄 Combined (file-level documentation)

📄 5. mortgage-se-object.bpmn (subprocess till Application)
   🎯 Feature Goals (1): mortgage-se-application-object
   📝 Epics (2): Identify object, Validate object data
   📄 Combined (file-level documentation)

📄 6. mortgage-se-application.bpmn (Application - visual:0)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-application)
   📝 Epics (1): Confirm application
   📄 Combined (file-level documentation)

📄 7. mortgage-se-credit-evaluation.bpmn (Credit Evaluation - visual:3)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-credit-evaluation)
   📝 Epics (9): Amortisation, Calculate household affordability, Evaluate application, Evaluate credit policies, Evaluate household, Evaluate stakeholders, Fetch price, Fetch product, Fetch risk classification
   📄 Combined (file-level documentation)

📄 8. mortgage-se-documentation-assessment.bpmn (subprocess till Manual credit evaluation)
   🎯 Feature Goals (1): mortgage-se-manual-credit-evaluation-documentation-assessment
   📝 Epics (3): Assess documentation, Validate documentation, Register documentation assessment
   📄 Combined (file-level documentation)

📄 9. mortgage-se-mortgage-commitment.bpmn (Mortgage commitment - visual:1)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-mortgage-commitment)
   📝 Epics (1): Decide on mortgage commitment
   📄 Combined (file-level documentation)

📄 10. mortgage-se-appeal.bpmn (Appeal - visual:4)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-appeal)
   📝 Epics (2): Process appeal, Review appeal decision
   📄 Combined (file-level documentation)

📄 11. mortgage-se-manual-credit-evaluation.bpmn (Manual credit evaluation - visual:5)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-manual-credit-evaluation)
   📝 Epics (1): Perform manual credit evaluation
   📄 Combined (file-level documentation)

📄 12. mortgage-se-kyc.bpmn (KYC - visual:6)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-kyc)
   📝 Epics (5): Evaluate KYC/AML, Fetch AML / KYC risk score, Fetch sanctions and PEP, Review KYC, Submit self declaration
   📄 Combined (file-level documentation)

📄 13. mortgage-se-credit-decision.bpmn (Credit decision - visual:7)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-credit-decision)
   📝 Epics (4): Credit decision rules, Evaluate application x3
   📄 Combined (file-level documentation)

📄 14. mortgage-se-offer.bpmn (Offer - visual:8)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-offer)
   📝 Epics (2): Decide on offer, Perform advanced underwriting
   📄 Combined (file-level documentation)

📄 15. mortgage-se-document-generation.bpmn (Document generation - visual:9)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-document-generation)
   📝 Epics (3): Generate documents, Validate documents, Register documents
   📄 Combined (file-level documentation)

📄 16. mortgage-se-signing.bpmn (Signing - visual:11)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-signing)
   📝 Epics (2): Sign documents, Validate signatures
   📄 Combined (file-level documentation)

📄 17. mortgage-se-disbursement.bpmn (Disbursement - visual:12)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-disbursement)
   📝 Epics (2): Process disbursement, Validate disbursement
   📄 Combined (file-level documentation)

📄 18. mortgage-se-collateral-registration.bpmn (Collateral registration - visual:15)
   🎯 Feature Goals (1): Root Feature Goal (mortgage-se-collateral-registration)
   📝 Epics (2): Register collateral, Validate collateral registration
   📄 Combined (file-level documentation)

📄 19. mortgage.bpmn (root)
   🎯 Feature Goals (1): Root Feature Goal (mortgage)
   📝 Epics (0): (inga epics i root-processen)
   📄 Combined (file-level documentation)
```

**Totalt: ~50 dokument** (19 Feature Goals + 19 Combined + ~12 Epics från första filerna)

---

## Skillnader i Ordning

### Första 10 Dokumenten

| Position | Alternativ A (UI-ordning) | Alternativ B (Topologisk) |
|----------|---------------------------|---------------------------|
| 1 | **mortgage-se-application.bpmn** | mortgage-se-internal-data-gathering.bpmn |
| 2 | mortgage-se-internal-data-gathering.bpmn | mortgage-se-stakeholder.bpmn |
| 3 | mortgage-se-stakeholder.bpmn | mortgage-se-household.bpmn |
| 4 | mortgage-se-household.bpmn | mortgage-se-object-information.bpmn |
| 5 | mortgage-se-object-information.bpmn | mortgage-se-object.bpmn |
| 6 | mortgage-se-object.bpmn | **mortgage-se-application.bpmn** |
| 7 | **mortgage-se-mortgage-commitment.bpmn** | mortgage-se-credit-evaluation.bpmn |
| 8 | mortgage-se-credit-evaluation.bpmn | mortgage-se-documentation-assessment.bpmn |
| 9 | mortgage-se-appeal.bpmn | **mortgage-se-mortgage-commitment.bpmn** |
| 10 | mortgage-se-manual-credit-evaluation.bpmn | mortgage-se-appeal.bpmn |

### Nyckelskillnader

1. **Application kommer först i Alternativ A** (position 1), men som 6:e i Alternativ B
2. **Subprocesser kommer FÖRE Application i Alternativ B**, men EFTER i Alternativ A
3. **Mortgage commitment kommer tidigare i Alternativ A** (position 7), men senare i Alternativ B (position 9)

---

## Rekommendation

**Alternativ B (Topologisk ordning)** är att föredra eftersom:

1. ✅ **Child-dokumentation finns tillgänglig** när parent Feature Goals genereras
2. ✅ **Topologiskt korrekt** - ingen risk för dependency-problem
3. ✅ **Följer root callActivities-ordningen** - Application subprocesser kommer före Credit Evaluation subprocesser

**Men:** Om UI-matchning är viktigare än topologisk korrekthet, kan **Alternativ A** vara bättre.

---

## Implementering

### Alternativ A: Matcha UI-ordningen exakt

```typescript
// För varje root callActivity i sorterad ordning:
for (const callActivity of sortedRootCallActivities) {
  // Lägg till parent-filen FÖRST
  if (!visitedFiles.has(callActivity.subprocessFile)) {
    fileOrder.push(callActivity.subprocessFile);
    visitedFiles.add(callActivity.subprocessFile);
  }
  
  // Sedan processera subprocesser
  processFile(callActivity);
}
```

### Alternativ B: Topologisk ordning (nuvarande)

```typescript
// För varje root callActivity i sorterad ordning:
for (const callActivity of sortedRootCallActivities) {
  // Processera subprocesser FÖRST (topologisk)
  processFile(callActivity);
  
  // Sedan lägg till parent-filen
  if (!visitedFiles.has(callActivity.subprocessFile)) {
    fileOrder.push(callActivity.subprocessFile);
    visitedFiles.add(callActivity.subprocessFile);
  }
}
```

