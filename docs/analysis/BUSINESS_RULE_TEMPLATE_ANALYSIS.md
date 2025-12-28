# Business Rule Mall - Analys

**Datum:** 2025-12-28

## BusinessRuleDocModel Struktur

```typescript
export interface BusinessRuleDocModel {
  summary: string;                    // Obligatoriskt
  inputs: string[];                   // Obligatoriskt
  decisionLogic: string[];            // Obligatoriskt
  outputs: string[];                 // Obligatoriskt
  businessRulesPolicy: string[];      // Obligatoriskt
  relatedItems: string[];             // Obligatoriskt
}
```

## HTML-Mall Struktur

Business Rule-mallen renderar följande sektioner:

1. **Header** (alltid synlig)
   - Badge: "Business Rule"
   - Nodnamn
   - Typ och processsteg
   - BPMN-element, kreditprocess-steg, swimlane/ägare

2. **Sammanfattning** (alltid synlig)
   - Fallback-text om LLM inte genererat: `${nodeName} kombinerar flera risk- och kreditparametrar för att avgöra om en ansökan kan godkännas, ska skickas till manuell granskning eller avslås. Regeln säkerställer konsekvent tillämpning av kreditpolicy och riskmandat för målgrupperna.`

3. **Inputs & datakällor** (alltid synlig)
   - Tabell med kolumner: Fält, Datakälla, Typ/format, Obligatoriskt, Validering, Felhantering
   - Fallback-tabell om LLM inte genererat (med riskScore, debtToIncomeRatio, loanToValue)
   - Om LLM genererat: Parsar inputs med format `"Fält: <fält>; Datakälla: <källa>; Typ: <typ>; ..."`

4. **Beslutslogik (DMN / regler)** (alltid synlig)
   - Lista med beslutslogik
   - Fallback-text om LLM inte genererat:
     - "Hög riskScore och måttlig skuldsättning ger normalt auto-approve."
     - "Mellanrisk eller ofullständig data leder till manuell granskning."
     - "Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline."

5. **Output & effekter** (alltid synlig)
   - Tabell med kolumner: Outputtyp, Typ, Effekt, Loggning
   - Fallback-tabell om LLM inte genererat (med APPROVE/REFER/DECLINE, Processpåverkan, Flaggor, Loggning)
   - Om LLM genererat: Parsar outputs med format `"Outputtyp: <typ>; Typ: <typ>; Effekt: <effekt>; Loggning: <loggning>."`

6. **Affärsregler & policystöd** (alltid synlig)
   - Lista med policystöd
   - Fallback-text om LLM inte genererat:
     - "Stödjer intern kreditpolicy och mandat för respektive produkt och segment."
     - "Bygger på dokumenterade riskramverk och beslutsmodeller."
     - "Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå."

7. **Relaterade regler / subprocesser** (alltid synlig)
   - Lista med relaterade items
   - Fallback-text om LLM inte genererat:
     - DMN-länk (om finns) eller "Ingen DMN-länk konfigurerad ännu..."
     - BPMN viewer-länk (om finns) eller "Subprocess-länk sätts via BPMN viewer."
     - Överordnad nod (om finns) eller "Överordnad nod: Rotprocess"

## Jämförelse med Epic-Mall

| Aspekt | Epic | Business Rule |
|--------|------|---------------|
| **Fallback-texter** | ❌ Inga fallback-texter | ✅ Generiska fallback-texter för alla sektioner |
| **Conditional rendering** | ✅ Sektioner visas endast om innehåll finns | ❌ Alla sektioner alltid synliga |
| **Antal sektioner** | 1-6 (Header + 0-5 conditional) | 7 (Header + 6 alltid synliga) |
| **Minimum-mall** | ✅ Ja - fokus på värde | ❌ Nej - många generiska fallback-texter |
| **LLM-krav** | ✅ Allt måste genereras av LLM | ⚠️ Kan fungera med fallback-texter |

## Problem med Nuvarande Business Rule-Mall

### 1. ❌ Generiska Fallback-texter
- **Summary:** Generisk text om "risk- och kreditparametrar" som inte är specifik för regeln
- **Inputs:** Generisk tabell med riskScore, debtToIncomeRatio, loanToValue som kanske inte är relevanta
- **Decision Logic:** Generiska regler om "auto-approve", "manuell granskning", "auto-decline" som kanske inte stämmer
- **Outputs:** Generisk tabell med APPROVE/REFER/DECLINE som kanske inte är relevanta
- **Business Rules Policy:** Generiska texter om "kreditpolicy", "riskramverk", "regulatoriska krav" som är för allmänna
- **Related Items:** Generiska länkar som kanske inte finns

### 2. ❌ Alla Sektioner Alltid Synliga
- Sektioner visas även om de innehåller bara generiska fallback-texter
- Ingen conditional rendering - användaren ser alltid alla sektioner även om de är tomma/generiska

### 3. ❌ Ingen Minimum-Mall
- Många sektioner med generiskt innehåll som inte ger reellt värde
- Fokus på att alltid visa något istället för att visa endast värdefullt innehåll

## Rekommendationer för Förenkling

### Alternativ 1: Ta bort alla fallback-texter (som Epic)
- **Summary:** Conditional - visas endast om LLM genererat
- **Inputs:** Conditional - visas endast om LLM genererat (ingen fallback-tabell)
- **Decision Logic:** Conditional - visas endast om LLM genererat
- **Outputs:** Conditional - visas endast om LLM genererat (ingen fallback-tabell)
- **Business Rules Policy:** Conditional - visas endast om LLM genererat
- **Related Items:** Conditional - visas endast om LLM genererat (men kan behålla länkar om de finns)

**Fördelar:**
- ✅ Konsistent med Epic-mall
- ✅ Minimum-mall - endast värdefullt innehåll
- ✅ Tvingar LLM att generera specifikt innehåll

**Nackdelar:**
- ❌ Kan resultera i tomma dokument om LLM misslyckas
- ❌ Kräver att LLM alltid genererar innehåll

### Alternativ 2: Behåll endast viktiga sektioner
- **Summary:** Obligatorisk (men kräv LLM-genererat, ingen fallback)
- **Decision Logic:** Obligatorisk (men kräv LLM-genererat, ingen fallback)
- **Outputs:** Obligatorisk (men kräv LLM-genererat, ingen fallback)
- **Inputs:** Valfritt (conditional)
- **Business Rules Policy:** Valfritt (conditional)
- **Related Items:** Valfritt (conditional, men behåll länkar om de finns)

**Fördelar:**
- ✅ Fokus på kärnfunktionalitet (beslutslogik och output)
- ✅ Mindre sektioner att fylla i
- ✅ Behåller viktigaste informationen

**Nackdelar:**
- ⚠️ Inputs kan vara viktigt för att förstå regeln

### Alternativ 3: Behåll Related Items med länkar (conditional)
- Alla sektioner conditional (som Epic)
- **Related Items:** Visas endast om:
  - LLM genererat innehåll, ELLER
  - Det finns faktiska länkar (DMN, BPMN viewer, överordnad nod)

**Fördelar:**
- ✅ Konsistent med Epic-mall
- ✅ Behåller värdefulla länkar även om LLM inte genererat text
- ✅ Minimum-mall för övrigt

## Rekommendation: Alternativ 1 + 3 (Kombinerat)

**Princip:** Ta bort alla generiska fallback-texter, gör alla sektioner conditional, men behåll Related Items om det finns faktiska länkar.

**Implementation:**
1. Ta bort alla fallback-texter från `buildBusinessRuleDocModelFromContext`
2. Gör alla sektioner conditional i `buildBusinessRuleDocHtmlFromModel`
3. Behåll Related Items-logik för länkar (visas om länkar finns, även om LLM inte genererat text)
4. Uppdatera prompten för att betona att allt måste genereras av LLM (som Epic)

**Resultat:**
- Minimum-mall med fokus på värde
- Konsistent med Epic-mall
- Behåller värdefulla länkar
- Tvingar LLM att generera specifikt innehåll

