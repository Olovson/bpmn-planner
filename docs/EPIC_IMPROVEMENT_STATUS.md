# Epic Documentation Improvement - Status & Checklista

**Senast uppdaterad:** 2024-12-19

## Översikt

**Viktigt:** Det finns en subprocess `object-information` i `mortgage-se-object.bpmn` som innehåller 5 ytterligare epics som saknar HTML-dokumentation.

Totalt antal epics: **19** (14 från huvudprocesser + 5 från object-information subprocess)
- ✅ Klart: **19** (ALLA EPICS ÄR KLARA!)
- ⏳ Pågående: **0**
- ⬜ Återstår: **0**

**Notera:** Många filer har Mermaid-stöd men saknar diagram. Kontrollera varje fil individuellt.

---

## Detaljerad status per epic

### ServiceTask Epics (6 st)

#### ✅ 1. fetch-personal-information
**Fil:** `mortgage-se-stakeholder/fetch-personal-information-v2.html`
**Status:** ✅ KLAR
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram

#### ✅ 2. fetch-credit-information
**Fil:** `mortgage-se-stakeholder/fetch-credit-information-v2.html`
**Status:** ✅ KLAR
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram

#### ✅ 3. valuate-property
**Fil:** `mortgage-se-object/valuate-property-v2.html`
**Status:** ✅ KLAR (har alla arkitekturdiagram)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram
- ✅ Data Flow Diagram

#### ✅ 4. fetch-party-information
**Fil:** `mortgage-se-internal-data-gathering/fetch-party-information-v2.html`
**Status:** ✅ KLAR (har alla arkitekturdiagram)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram

#### ✅ 5. fetch-engagements
**Fil:** `mortgage-se-internal-data-gathering/fetch-engagements-v2.html`
**Status:** ✅ KLAR (har alla arkitekturdiagram)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram

#### ✅ 6. evaluate-personal-information
**Fil:** `mortgage-se-stakeholder/evaluate-personal-information-v2.html`
**Status:** ✅ KLAR (har alla arkitekturdiagram)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Komponentdiagram
- ✅ Sekvensdiagram

---

### BusinessRuleTask Epics (2 st)

#### ✅ 7. assess-stakeholder
**Fil:** `mortgage-se-stakeholder/assess-stakeholder-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ C4 System Context Diagram
- ✅ Sekvensdiagram
- ✅ Komponentdiagram
- ✅ DMN Decision Table (årsinkomst, DTI-ratio, kreditscore → beslut, riskkategori)
- ✅ Regelträd / Decision Tree (beslutslogik)
- ✅ Tröskelvärden tabell (min årsinkomst: 200k SEK, max DTI-ratio: 50%, etc.)

#### ✅ 8. pre-screen-party
**Fil:** `mortgage-se-internal-data-gathering/pre-screen-party-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ DMN Decision Table (eligibility criteria → APPROVED/REJECTED/REVIEW)
- ✅ Regelträd / Decision Tree (beslutslogik)
- ✅ Tröskelvärden tabell (eligibility criteria)
- ✅ C4 System Context Diagram
- ✅ Sekvensdiagram
- ✅ Komponentdiagram

---

### UserTask Epics (6 st)

#### ✅ 9. register-household-economy-information
**Fil:** `mortgage-se-household/register-household-economy-information-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram
- ✅ Data Flow Diagram

#### ✅ 10. register-loan-details
**Fil:** `mortgage-se-object/register-loan-details-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram

#### ✅ 11. register-personal-economy-information
**Fil:** `mortgage-se-stakeholder/register-personal-economy-information-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram
- ✅ Data Flow Diagram

#### ✅ 12. confirm-application
**Fil:** `mortgage-se-application/confirm-application-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram

#### ✅ 13. consent-to-credit-check
**Fil:** `mortgage-se-stakeholder/consent-to-credit-check-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram

#### ✅ 14. register-source-of-equity
**Fil:** `mortgage-se-object/register-source-of-equity-v2.html`
**Status:** ✅ KLAR (har alla förbättringar)
**Förbättringar:**
- ✅ Mermaid-stöd (script + CSS)
- ✅ User Journey Map
- ✅ Interaktionsflöde
- ✅ Process Flow Diagram

---

## Prioriterad arbetsordning

### Fas 1: ServiceTask med externa integrationer (Högsta prioritet)
1. ✅ fetch-personal-information - KLAR
2. ✅ fetch-credit-information - KLAR
3. ✅ valuate-property - KLAR
4. ✅ fetch-party-information - KLAR
5. ✅ fetch-engagements - KLAR
6. ✅ evaluate-personal-information - KLAR

### Fas 2: BusinessRuleTask med DMN (Högsta prioritet)
1. ✅ assess-stakeholder - KLAR
2. ✅ pre-screen-party - KLAR

### Fas 3: UserTask med komplexa flöden (Medium prioritet)
1. ✅ register-household-economy-information - KLAR
2. ✅ register-loan-details - KLAR
3. ✅ register-personal-economy-information - KLAR
4. ✅ confirm-application - KLAR
5. ✅ consent-to-credit-check - KLAR
6. ✅ register-source-of-equity - KLAR

---

## Mermaid-stöd template

För varje epic behöver följande läggas till i `<head>` sektionen:

```html
.mermaid {
  margin: 16px 0;
  text-align: center;
}
details {
  margin: 12px 0;
}
details summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--primary);
  padding: 8px;
  background: var(--accent);
  border-radius: 4px;
}
details summary:hover {
  background: #bfdbfe;
}
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
```

---

## Nästa steg

**✅ ALLA EPICS ÄR NU KLARA!**

Alla 19 epics har nu HTML-dokumentation med:
- ✅ Korrekt struktur och styling
- ✅ Mermaid-stöd för diagram
- ✅ Relevant diagramtyp baserat på epic-typ (ServiceTask, BusinessRuleTask, UserTask)
- ✅ Tydliga beskrivningar och förklaringar

**Sammanfattning:**
- 14 epics från huvudprocesser: ✅ KLARA
- 5 epics från object-information subprocess: ✅ KLARA
- **Totalt: 19/19 epics klara (100%)**
