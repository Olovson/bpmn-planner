# Lista över filer som behöver uppdateras - Acceptanskriterier-struktur

**Datum:** 2025-01-XX  
**Syfte:** Identifiera filer där acceptanskriterier börjar med BPMN-referenser istället för funktionalitet

## Sammanfattning

- **Totalt antal filer:** 26
- **Filer med user stories:** 26
- **Filer som behöver uppdateras:** 16
- **Filer som redan är bra:** 10

## Status efter första uppdateringsomgång

### ✅ Uppdaterade filer (högsta prioritet - klar)

1. ✅ **mortgage-manual-credit-evaluation-v2.html** (8/9 → 2/9 user stories) - **KLAR**
   - Uppdaterade: 6 user stories
   - Återstår: 2 user stories

2. ✅ **mortgage-kyc-v2.html** (7/9 → 1/9 user stories) - **KLAR**
   - Uppdaterade: 6 user stories
   - Återstår: 1 user story

3. ✅ **mortgage-offer-v2.html** (7/8 → 3/8 user stories) - **KLAR**
   - Uppdaterade: 4 user stories
   - Återstår: 3 user stories

4. ✅ **mortgage-mortgage-commitment-v2.html** (6/11 → 2/11 user stories) - **KLAR**
   - Uppdaterade: 4 user stories
   - Återstår: 2 user stories

5. ✅ **mortgage-se-credit-decision-v2.html** (5/6 → 2/6 user stories) - **KLAR**
   - Uppdaterade: 3 user stories
   - Återstår: 2 user stories

6. ✅ **mortgage-se-credit-decision-sales-contract-credit-decision-v2.html** (5/6 → 2/6 user stories) - **KLAR**
   - Uppdaterade: 3 user stories
   - Återstår: 2 user stories

## Prioritering - Återstående filer

Filer sorterade efter antal problematiska user stories (högst först):

### Medel prioritet (2-4 problematiska user stories)

1. **mortgage-appeal-v2.html** (3/10 user stories behöver uppdateras)
   - Några acceptanskriterier börjar med "När" + BPMN-referenser

2. **mortgage-se-application-object-v2.html** (3/4 user stories behöver uppdateras)
   - Många acceptanskriterier börjar med "När", "Efter" + BPMN-referenser

3. **mortgage-se-signing-v2.html** (3/13 user stories behöver uppdateras)
   - Några acceptanskriterier börjar med BPMN-referenser

4. **mortgage-application-v2.html** (2/12 user stories behöver uppdateras)
   - ⚠️ **OBS:** Denna fil har redan uppdaterats, men scriptet hittade fortfarande 2 problematiska user stories. Kolla om de missades eller om scriptet hittar fler mönster.

5. **mortgage-se-documentation-assessment-v2.html** (2/7 user stories behöver uppdateras)
   - Några acceptanskriterier börjar med "När" + BPMN-referenser

6. **mortgage-se-application-stakeholder-v2.html** (2/4 user stories behöver uppdateras)
   - Några acceptanskriterier börjar med BPMN-referenser

7. **mortgage-se-credit-decision-v2.html** (2/6 user stories behöver uppdateras) - **Delvis uppdaterad**
   - Återstår: 2 user stories

8. **mortgage-se-credit-decision-sales-contract-credit-decision-v2.html** (2/6 user stories behöver uppdateras) - **Delvis uppdaterad**
   - Återstår: 2 user stories

9. **mortgage-manual-credit-evaluation-v2.html** (2/9 user stories behöver uppdateras) - **Delvis uppdaterad**
   - Återstår: 2 user stories

10. **mortgage-mortgage-commitment-v2.html** (2/11 user stories behöver uppdateras) - **Delvis uppdaterad**
    - Återstår: 2 user stories

11. **mortgage-offer-v2.html** (3/8 user stories behöver uppdateras) - **Delvis uppdaterad**
    - Återstår: 3 user stories

12. **mortgage-kyc-v2.html** (1/9 user stories behöver uppdateras) - **Delvis uppdaterad**
    - Återstår: 1 user story

### Låg prioritet (1 problematisk user story)

1. **mortgage-collateral-registration-v2.html** (1/9 user stories behöver uppdateras)
   - En acceptanskriterie börjar med "Om" + BPMN-referens

2. **mortgage-se-disbursement-disbursement-advance-v2.html** (1/4 user stories behöver uppdateras)
   - En acceptanskriterie börjar med BPMN-referens

3. **mortgage-se-disbursement-v2.html** (1/4 user stories behöver uppdateras)
   - En acceptanskriterie börjar med BPMN-referens

4. **mortgage-se-manual-credit-evaluation-object-control-v2.html** (1/14 user stories behöver uppdateras)
   - En acceptanskriterie börjar med "När" + BPMN-referens

## Filer som redan är bra (10 filer)

Dessa filer har acceptanskriterier som redan börjar med funktionalitet:

- ✅ mortgage-Activity_17f0nvn-v2.html (3 user stories)
- ✅ mortgage-object-valuation-v2.html (1 user story)
- ✅ mortgage-se-application-household-v2.html (1 user story)
- ✅ mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html (5 user stories)
- ✅ mortgage-se-credit-evaluation-v2.html (5 user stories)
- ✅ mortgage-se-document-generation-document-generation-advance-v2.html (3 user stories)
- ✅ mortgage-se-document-generation-v2.html (3 user stories)
- ✅ mortgage-se-internal-data-gathering-v2.html (4 user stories)
- ✅ mortgage-se-object-information-v2.html (5 user stories)
- ✅ mortgage-se-signing-per-digital-document-package-v2.html (3 user stories)

## Arbetsprocess

För varje fil som behöver uppdateras:

1. **Läs user stories-sektionen** i filen
2. **Identifiera problematiska acceptanskriterier** som börjar med:
   - "Efter 'X' gateway..."
   - "När 'Y' call activity..."
   - "Om 'Z' boundary event..."
   - etc.
3. **Omformulera acceptanskriterier** så att de:
   - Börjar med funktionalitet (vad användaren ser, vad systemet gör, UI/UX, valideringar, felmeddelanden)
   - Lägger BPMN-referenser som teknisk kontext i slutet
4. **Förbättra UI/UX-detaljer** där det saknas (statusindikatorer, progress bars, ikoner, etc.)

## Exempel på omformulering

**❌ Dåligt (börjar med BPMN-referens):**
```
Efter parallel gateway (Gateway_1960pk9) samlar flöden från både "Household" call activity (household) och "Per stakeholder" subprocess (stakeholders), ska "Confirm application" user task (confirm-application) aktiveras. Sammanfattningen ska visa alla insamlade data...
```

**✅ Bra (börjar med funktionalitet):**
```
Sammanfattningen ska visa alla insamlade data i ett strukturerat format med tydliga rubriker (Intern data, Hushållsekonomi, Stakeholders, Objekt), tillåta mig att gå tillbaka och ändra information via tydliga länkar, och visa en tydlig "Bekräfta"-knapp. När både hushållsekonomi och stakeholder-information är klara, ska "Confirm application" user task (confirm-application) aktiveras via parallel gateway (Gateway_1960pk9) som samlar flöden från både "Household" call activity (household) och "Per stakeholder" subprocess (stakeholders).
```

## Referenser

- Se `USER_STORY_IMPROVEMENT_PROMPT.md` för detaljerad process
- Se `USER_STORY_QUALITY_CHECKLIST.md` för kvalitetskriterier
- Se `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` för arbetsprocess

## Script för analys

Kör följande script för att analysera filer:
```bash
npx tsx scripts/analyze-acceptance-criteria-structure.ts
```

