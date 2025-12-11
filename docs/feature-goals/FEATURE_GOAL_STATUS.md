# Feature Goal Dokumentation - Status

**Genererad:** 2025-12-11T21:18:29.619Z
**BPMN-källa:** mortgage-se 2025.12.11 18:11

---

## 📊 Sammanfattning

- 📝 **Total HTML-filer:** 32
- ✅ **Matchade feature goals:** 19 (av 34 totalt)
- ⚠️  **Orphaned (saknar feature goal):** 13
- ✨ **Förbättrade:** 4
- 📋 **Återstående:** 28

---

## ✅ Matchade Feature Goals

Dessa filer matchar feature goals i BPMN-filerna. Markera med `[x]` när du har förbättrat dem.

- [ ] `mortgage-se-appeal-v2.html`
- [ ] `mortgage-se-application-v2.html`
- [ ] `mortgage-se-collateral-registration-v2.html`
- [ ] `mortgage-se-credit-decision-sales-contract-credit-decision-v2.html`
  - Feature Goal: Credit decision (`credit-decision`) ⚠️ 1 saknade aktiviteter
- [ ] `mortgage-se-credit-evaluation-Activity_1gzlxx4-v2.html`
  - Feature Goal: Automatic Credit Evaluation (`Activity_1gzlxx4`) ⚠️ 7 saknade aktiviteter
- [x] `mortgage-se-disbursement-disbursement-advance-v2.html` ✨ Förbättrad
- [x] `mortgage-se-document-generation-document-generation-advance-v2.html` ✨ Förbättrad
- [ ] `mortgage-se-documentation-assessment-v2.html`
  - Feature Goal: Documentation assessment (`documentation-assessment`) ⚠️ 3 saknade aktiviteter
- [ ] `mortgage-se-household-v2.html`
- [ ] `mortgage-se-internal-data-gathering-v2.html`
- [ ] `mortgage-se-kyc-v2.html`
- [ ] `mortgage-se-manual-credit-evaluation-v2.html`
- [ ] `mortgage-se-mortgage-commitment-v2.html`
- [ ] `mortgage-se-object-control-v2.html`
  - Feature Goal: Object (`object`) ⚠️ 5 saknade aktiviteter
- [ ] `mortgage-se-object-information-v2.html`
- [ ] `mortgage-se-object-valuation-v2.html`
- [ ] `mortgage-se-offer-v2.html`
  - Feature Goal: Offer preparation (`offer`) ⚠️ 3 saknade aktiviteter
- [x] `mortgage-se-signing-per-digital-document-package-v2.html` ✨ Förbättrad
- [ ] `mortgage-se-stakeholder-v2.html`
  - Feature Goal: Stakeholder (`stakeholder`) ⚠️ 3 saknade aktiviteter

---

## ⚠️  Orphaned Dokumentation

Dessa filer matchar inte längre någon feature goal i BPMN-filerna.

**Första steget:** Identifiera om filen ska tas bort eller uppdateras.

### Steg 1: Identifiera åtgärd

För varje fil, avgör:
- 🗑️  **Ta bort** - Om filen är inaktuell och inte längre relevant
- 🔄 **Uppdatera** - Om filen fortfarande är relevant men behöver mappas om
- ⏸️  **Behåll** - Om filen ska behållas men inte matchar någon feature goal

### Steg 2: Markera när klar

Markera med `[x]` när du har tagit beslut och utfört åtgärden.

- [ ] `mortgage-Activity_17f0nvn-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-credit-decision-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [x] `mortgage-se-credit-evaluation-credit-evaluation-1-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-credit-evaluation-credit-evaluation-2-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-credit-evaluation-loop-household-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-credit-evaluation-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-disbursement-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-document-generation-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-object-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-signing-per-sign-order-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-signing-per-signee-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-signing-signing-advance-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll
- [ ] `mortgage-se-signing-v2.html` (Senast ändrad: 2025-12-11)
  - [ ] Identifierad åtgärd: [ ] Ta bort | [ ] Uppdatera | [ ] Behåll

---

## 📝 Användning

1. **Kör scriptet** för att uppdatera listan:
   ```bash
   npx tsx scripts/generate-feature-goal-status.ts
   ```

2. **Öppna status-filen**: `docs/feature-goals/FEATURE_GOAL_STATUS.md`

3. **Markera förbättrade filer** med `[x]` i checkboxen

4. **För orphaned filer**: Först identifiera åtgärd, sedan markera när klar

5. **Kör scriptet igen** när du vill uppdatera listan
