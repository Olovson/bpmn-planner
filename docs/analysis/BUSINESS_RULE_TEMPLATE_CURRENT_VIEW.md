# Business Rule Mall - Nuvarande Vy

**Datum:** 2025-12-28

## Hur Mallen Ser Ut Nu

### Sektioner som renderas (alla alltid synliga):

1. **Header** (alltid synlig)
   ```
   Business Rule / DMN
   [Nodnamn]
   - Regel-ID: [bpmnElementId]
   - BPMN-element: [bpmnElementId] ([type])
   - Kreditprocess-steg: [bpmnFile]
   ```

2. **Sammanfattning & scope** (alltid synlig)
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "[Nodnamn] avgör om en ansökan ligger inom bankens riktlinjer för kreditgivning."
     "Regeln används för att automatisera delar av kreditbeslutet och säkerställa likabehandling."
     "Omfattar endast den aktuella kreditprodukten – andra produkter hanteras i separata regler."
     ```

3. **Förutsättningar & kontext** (alltid synlig, alltid fallback)
   - Lista med:
     ```
     "Triggas normalt efter [upstreamNode]."
     "Kräver att central kund- och ansökningsdata är komplett och validerad."
     "Förutsätter att nödvändiga externa registerslagningar (t.ex. UC, kreditupplysning) är gjorda."
     ```

4. **Inputs & datakällor** (alltid synlig) 📊 **TABELL**
   - Om LLM genererat: parsa inputs och visa som tabell
   - Om INTE LLM genererat: fallback-tabell med:
     ```
     | Fält              | Datakälla          | Typ / format      | Obligatoriskt | Validering              | Felhantering                          |
     |-------------------|--------------------|--------------------|---------------|-------------------------|----------------------------------------|
     | riskScore         | Kreditmotor / UC   | Tal (0–1000)       | Ja            | Inom definierat intervall| Avslå eller skicka till manuell granskning |
     | debtToIncomeRatio| Intern beräkning   | Decimal            | Ja            | >= 0                    | Flagga för manuell granskning vid saknade data |
     | loanToValue       | Fastighetsvärdering| Procent            | Ja            | 0–100 %                 | Avslå vid orimliga värden |
     ```
   - **Format för LLM-genererade inputs:**
     ```
     "Fält: <fältnamn>; Datakälla: <källa>; Typ: <typ>; Obligatoriskt: <ja/nej>; Validering: <validering>; Felhantering: <felhantering>."
     ```

5. **Beslutslogik (DMN / regler)** (alltid synlig)
   - Lista med beslutslogik
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "Hög riskScore och måttlig skuldsättning ger normalt auto-approve."
     "Mellanrisk eller ofullständig data leder till manuell granskning."
     "Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline."
     ```

6. **Output & effekter** (alltid synlig) 📊 **TABELL**
   - Om LLM genererat: parsa outputs och visa som tabell
   - Om INTE LLM genererat: fallback-tabell med:
     ```
     | Outputtyp        | Typ                | Effekt                                                      | Loggning                                    |
     |------------------|--------------------|-------------------------------------------------------------|---------------------------------------------|
     | Beslut           | APPROVE/REFER/DECLINE | Kreditprocessen fortsätter, pausas eller avslutas         | Beslut, huvudparametrar och regelversion loggas för audit |
     | Processpåverkan  | Flödesstyrning     | Fortsätter till [downstreamName] vid APPROVE, pausas vid REFER, avslutas vid DECLINE | Flödesbeslut loggas med tidsstämpel |
     | Flagga           | Risk/Datakvalitet  | T.ex. hög skuldsättning, bristfällig dokumentation, sanktions-/fraudträff | Flagga + orsak loggas för spårbarhet |
     | Loggning         | Audit              | Underlag för revision och efterhandskontroll               | Beslut, inputparametrar och regelversion |
     ```
   - **Format för LLM-genererade outputs:**
     ```
     "Outputtyp: <typ>; Typ: <typ>; Effekt: <effekt>; Loggning: <loggning>."
     ```

7. **Affärsregler & policystöd** (alltid synlig)
   - Lista med policystöd
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "Stödjer intern kreditpolicy och mandat för respektive produkt och segment."
     "Bygger på dokumenterade riskramverk och beslutsmodeller."
     "Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå."
     ```

8. **Relaterade regler & subprocesser** (alltid synlig)
   - Lista med relaterade items
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text med länkar (om de finns)
     ```
     "Relaterad DMN-modell: [länk]" (om länk finns)
     "Ingen DMN-länk konfigurerad ännu..." (om länk saknas)
     "Relaterad BPMN-subprocess: [länk]" (om länk finns)
     "Subprocess-länk sätts via BPMN viewer." (om länk saknas)
     "Överordnad nod: [parentNode]" (om finns)
     "Överordnad nod: Rotprocess" (om saknas)
     ```

---

## Tabeller i Mallen

### 1. Inputs-tabellen (Inputs & datakällor)
**Kolumner:**
- Fält
- Datakälla
- Typ / format
- Obligatoriskt
- Validering
- Felhantering

**Parsing:**
- LLM genererar inputs med format: `"Fält: <fält>; Datakälla: <källa>; Typ: <typ>; Obligatoriskt: <ja/nej>; Validering: <validering>; Felhantering: <felhantering>."`
- Parsas och renderas som tabell

### 2. Outputs-tabellen (Output & effekter)
**Kolumner:**
- Outputtyp
- Typ
- Effekt
- Loggning

**Parsing:**
- LLM genererar outputs med format: `"Outputtyp: <typ>; Typ: <typ>; Effekt: <effekt>; Loggning: <loggning>."`
- Parsas och renderas som tabell

---

## Scenarios (finns i koden men renderas INTE)

I `buildBusinessRuleDocModelFromContext` finns en `scenarios`-array (rad 781-800):
```typescript
const scenarios = [
  {
    id: 'BR1',
    name: 'Standardkund med låg risk',
    input: 'Stabil inkomst, låg skuldsättning, normal kreditdata.',
    outcome: 'Beslut: APPROVE utan manuell granskning.',
  },
  {
    id: 'BR2',
    name: 'Kund med hög skuldsättning',
    input: 'Hög debt-to-income, flera befintliga krediter.',
    outcome: 'Beslut: REFER till manuell granskning med tydlig flagga.',
  },
  {
    id: 'BR3',
    name: 'Kund med allvarliga betalningsanmärkningar',
    input: 'Aktiva betalningsanmärkningar eller inkassoärenden.',
    outcome: 'Beslut: DECLINE enligt exklusionskriterier.',
  },
];
```

**Men:** Denna array returneras INTE i modellen och renderas INTE i HTML-mallen!

---

## Vad Blir Kvar Efter Ändringar?

### Efter att ta bort fallback-texter och göra conditional:

1. **Header** (alltid synlig) ✅
2. **Sammanfattning & scope** (conditional - endast om `model.summary` finns) ✅
3. ~~**Förutsättningar & kontext**~~ ❌ **TAS BORT** (finns inte i modellen)
4. **Inputs & datakällor** (conditional - endast om `model.inputs.length > 0`) ✅ **TABELL BEHÅLLS**
5. **Beslutslogik (DMN / regler)** (conditional - endast om `model.decisionLogic.length > 0`) ✅
6. **Output & effekter** (conditional - endast om `model.outputs.length > 0`) ✅ **TABELL BEHÅLLS**
7. **Affärsregler & policystöd** (conditional - endast om `model.businessRulesPolicy.length > 0`) ✅
8. **Relaterade regler & subprocesser** (conditional - endast om länkar finns eller LLM genererat) ✅

**Totalt: 1-7 sektioner (Header + 0-6 conditional)**

---

## Rekommendation för Claude-generering

Eftersom ni inte har DMN-filer, bör Claude:
1. **Generera realistiska affärsregler** baserat på BPMN-innehåll och svenska kreditsystem
2. **Använda tabell-format** för inputs och outputs (som redan finns)
3. **Generera specifika regler** för varje Business Rule-nod (inte generiska)

**Exempel på vad Claude ska generera:**
- **Inputs:** Specifika fält baserat på BPMN-nodens namn och kontext (t.ex. "inkomst", "skuldsättningsgrad", "kreditupplysningsdata" för svenska kreditsystem)
- **Decision Logic:** Specifika regler baserat på nodens syfte (t.ex. "Om inkomst > 500 000 SEK och skuldsättningsgrad < 5% → APPROVE")
- **Outputs:** Specifika output-typer baserat på regeln (t.ex. "Beslut: APPROVE/REFER/DECLINE", "Riskflagga: Hög/Låg", etc.)
- **Business Rules Policy:** Specifika svenska regulatoriska krav (t.ex. "Konsumentkreditlag (2010:1846)", "UC-regler", "AML/KYC-krav")

