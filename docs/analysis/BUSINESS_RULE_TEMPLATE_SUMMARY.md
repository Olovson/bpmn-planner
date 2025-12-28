# Business Rule Mall - Sammanfattning

**Datum:** 2025-12-28

## Nuvarande Mall - Vad Som Finns

### Sektioner (8 st, alla alltid synliga):

1. **Header** ✅
2. **Sammanfattning & scope** (fallback om LLM saknas)
3. **Förutsättningar & kontext** (alltid fallback - finns inte i modellen!)
4. **Inputs & datakällor** 📊 **TABELL** (fallback-tabell om LLM saknas)
5. **Beslutslogik (DMN / regler)** (fallback om LLM saknas)
6. **Output & effekter** 📊 **TABELL** (fallback-tabell om LLM saknas)
7. **Affärsregler & policystöd** (fallback om LLM saknas)
8. **Relaterade regler & subprocesser** (fallback + länkar)

### Tabeller

#### 1. Inputs-tabellen (Inputs & datakällor)
**Kolumner:** Fält | Datakälla | Typ/format | Obligatoriskt | Validering | Felhantering

**Format för LLM:**
```
"Fält: <fältnamn>; Datakälla: <källa>; Typ: <typ>; Obligatoriskt: <ja/nej>; Validering: <validering>; Felhantering: <felhantering>."
```

**Exempel:**
```
"Fält: inkomst; Datakälla: Ansökningsformulär; Typ: Decimal (SEK); Obligatoriskt: Ja; Validering: > 0; Felhantering: Flagga för manuell granskning vid saknade data"
```

#### 2. Outputs-tabellen (Output & effekter)
**Kolumner:** Outputtyp | Typ | Effekt | Loggning

**Format för LLM:**
```
"Outputtyp: <typ>; Typ: <typ>; Effekt: <effekt>; Loggning: <loggning>."
```

**Exempel:**
```
"Outputtyp: Beslut; Typ: APPROVE/REFER/DECLINE; Effekt: Kreditprocessen fortsätter, pausas eller avslutas; Loggning: Beslut, huvudparametrar och regelversion loggas för audit."
```

---

## Vad Blir Kvar Efter Ändringar?

### Efter att ta bort fallback-texter och göra conditional:

1. **Header** ✅ (alltid synlig)
2. **Sammanfattning & scope** ✅ (conditional - endast om LLM genererat)
3. ~~**Förutsättningar & kontext**~~ ❌ (tas bort - finns inte i modellen)
4. **Inputs & datakällor** 📊 ✅ (conditional - endast om LLM genererat) **TABELL BEHÅLLS**
5. **Beslutslogik (DMN / regler)** ✅ (conditional - endast om LLM genererat)
6. **Output & effekter** 📊 ✅ (conditional - endast om LLM genererat) **TABELL BEHÅLLS**
7. **Affärsregler & policystöd** ✅ (conditional - endast om LLM genererat)
8. **Relaterade regler & subprocesser** ✅ (conditional - endast om länkar finns eller LLM genererat)

**Totalt: 1-7 sektioner (Header + 0-6 conditional)**

**Tabellerna behålls** - de renderas endast om LLM genererat inputs/outputs (inga fallback-tabeller).

---

## Rekommendation för Claude-generering (utan DMN-filer)

### Instruktioner för Claude:

1. **Generera realistiska affärsregler** baserat på:
   - BPMN-nodens namn och kontext
   - Svenska kreditsystem (UC, konsumentkreditlag, AML/KYC)
   - Realistiska kreditparametrar (inkomst, skuldsättningsgrad, kreditupplysning)

2. **Använd tabell-format** för inputs och outputs:
   - **Inputs:** Specifika fält baserat på regeln (t.ex. "inkomst", "skuldsättningsgrad", "kreditupplysningsdata", "fastighetsvärdering")
   - **Outputs:** Specifika output-typer (t.ex. "Beslut: APPROVE/REFER/DECLINE", "Riskflagga", "Processpåverkan")

3. **Generera specifika regler** för varje Business Rule-nod:
   - Inte generiska "auto-approve" utan specifika villkor
   - Baserat på nodens namn och position i processen
   - Realistiska för svenska kreditsystem

4. **Business Rules Policy:**
   - Specifika svenska regulatoriska krav (t.ex. "Konsumentkreditlag (2010:1846)", "UC-regler", "AML/KYC-krav")
   - Interna bankpolicyer baserat på regeln

### Exempel på vad Claude ska generera:

**Inputs (tabell-format):**
```
"Fält: månadsinkomst; Datakälla: Ansökningsformulär; Typ: Decimal (SEK); Obligatoriskt: Ja; Validering: > 0 och < 10 000 000; Felhantering: Flagga för manuell granskning vid saknade eller orimliga värden"
"Fält: skuldsättningsgrad; Datakälla: Intern beräkning; Typ: Procent; Obligatoriskt: Ja; Validering: 0-100%; Felhantering: Avslå eller skicka till manuell granskning vid saknade data"
"Fält: kreditupplysningsdata; Datakälla: UC (Upplysningscentralen); Typ: JSON-objekt; Obligatoriskt: Ja; Validering: Validerad UC-respons; Felhantering: Flagga för manuell granskning vid saknade eller ogiltiga data"
```

**Decision Logic:**
```
"Om månadsinkomst >= 50 000 SEK och skuldsättningsgrad < 5% och inga betalningsanmärkningar → APPROVE"
"Om skuldsättningsgrad >= 5% och < 8% eller ofullständig kreditupplysningsdata → REFER till manuell granskning"
"Om aktiva betalningsanmärkningar eller skuldsättningsgrad >= 8% → DECLINE"
```

**Outputs (tabell-format):**
```
"Outputtyp: Beslut; Typ: APPROVE/REFER/DECLINE; Effekt: Kreditprocessen fortsätter vid APPROVE, pausas i manuell kö vid REFER, avslutas vid DECLINE; Loggning: Beslut, huvudparametrar (inkomst, skuldsättningsgrad, kreditupplysning) och regelversion loggas för audit"
"Outputtyp: Riskflagga; Typ: Hög/Låg; Effekt: Flagga för manuell granskning vid hög risk; Loggning: Riskflagga + orsak (t.ex. hög skuldsättningsgrad) loggas för spårbarhet"
```

**Business Rules Policy:**
```
"Stödjer intern kreditpolicy för bolån med max skuldsättningsgrad 8% enligt bankens riskmandat"
"Följer Konsumentkreditlag (2010:1846) krav på kreditupplysning och information till konsument"
"Tar hänsyn till UC-regler för kreditupplysning och AML/KYC-krav enligt Finansinspektionens föreskrifter"
```

---

## Nästa Steg

1. ✅ Behålla tabellerna (inputs och outputs)
2. ✅ Ta bort fallback-texter
3. ✅ Gör sektioner conditional
4. ✅ Ta bort "Förutsättningar"-sektionen
5. ⚠️ Uppdatera prompten för att betona:
   - Realistiska svenska kreditsystem-regler
   - Specifika regler baserat på BPMN-innehåll
   - Tabell-format för inputs/outputs
   - Inga DMN-filer - Claude ska hitta på regler

