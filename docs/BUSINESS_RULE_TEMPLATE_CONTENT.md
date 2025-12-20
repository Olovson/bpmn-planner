# Innehåll i Claude-genererade Business Rule-mallar

## Översikt

Business Rule-dokumentationen använder `BusinessRuleDocModel` och prompten `dmn_businessrule_prompt.md` (v1.0.0) för att generera dokumentation för DMN-beslutsregler i kreditprocessen.

## BusinessRuleDocModel Struktur

```typescript
{
  summary: string;                    // 2-4 meningar om syfte och scope
  inputs: string[];                   // 3+ formaterade strängar om indata
  decisionLogic: string[];            // 3-6 strängar om beslutslogik
  outputs: string[];                  // 3-5 formaterade strängar om utdata
  businessRulesPolicy: string[];      // 3-6 strängar om policys och regler
  relatedItems: string[];             // 2-4 strängar om relaterade regler/processer
}
```

## Detaljerad Beskrivning av Fält

### 1. Summary (Sammanfattning & Scope)

**Innehåll:**
- 2-4 meningar som beskriver:
  - Vad regeln gör (vilken typ av beslut/klassificering)
  - Vilka kunder/produkter som typiskt omfattas
  - Vilken del av kreditprocessen regeln stödjer (t.ex. förhandsbedömning, huvudbeslut)
  - Vad som ingår respektive inte ingår på hög nivå

**Exempel:**
> "Regeln bedömer kundens kreditvärdighet baserat på inkomst, skuldsättning och kreditpoäng. Den används i riskbedömningsfasen för att avgöra om ansökan ska godkännas, hänvisas till manuell granskning eller avslås. Regeln omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom konsekvent tillämpning av riskkriterier."

**Viktigt:**
- Får inte lämnas tomt eller vara en ren upprepning av nodnamnet
- Ingen metadata, inga tekniska detaljer, inga HTML-taggar

**Renderas som:** Paragraf (`<p>`)

---

### 2. Inputs (Indata & Datakällor)

**Innehåll:**
- 3+ strängar, varje sträng i EXAKT formatet:

```text
Fält: ...; Datakälla: ...; Typ: ...; Obligatoriskt: Ja/Nej; Validering: ...; Felhantering: ...
```

**Exempel:**
- `"Fält: månadsinkomst; Datakälla: kundregister; Typ: decimal; Obligatoriskt: Ja; Validering: > 0; Felhantering: returnera null om saknas"`
- `"Fält: totala skulder; Datakälla: kreditbyrå; Typ: decimal; Obligatoriskt: Ja; Validering: >= 0; Felhantering: använd 0 om saknas"`
- `"Fält: kreditpoäng; Datakälla: UC; Typ: integer; Obligatoriskt: Ja; Validering: 300-850; Felhantering: avvisa om utanför range"`

**Viktigt:**
- Minst 3 rader (om det är rimligt utifrån regeln)
- Varje rad måste ha ifyllda delar för både `Validering` och `Felhantering`
- Om tröskelvärden anges (t.ex. ålder, kreditpoäng, belåningsgrad, belopp), lägg till **"(exempelvärde)"** direkt efter värdet

**Renderas som:** Lista (`<ul>` med `<li>` per rad)

---

### 3. DecisionLogic (Beslutslogik / DMN-regler)

**Innehåll:**
- 3-6 strängar som tillsammans:
  - Beskriver huvudprincipen (första strängen)
  - Beskriver typiska regler/villkor, gärna med exempelvärden
  - Inkluderar minst ett **kombinationsvillkor**

**Exempel:**
- `"Om kreditpoäng < 600 (exempelvärde) → DECLINE"`
- `"Om skuldkvot > 6.0 (exempelvärde) → REFER"`
- `"Om kreditpoäng >= 700 (exempelvärde) och skuldkvot < 4.0 (exempelvärde) → APPROVE"`
- `"Låg kreditvärdighet + hög skuldsättning → manuell granskning."`
- `"Annars → REFER"`

**Viktigt:**
- Inga HTML-taggar, inga tekniska implementationsdetaljer (endpoints, kod)
- Numeriska tröskelvärden måste ha **"(exempelvärde)"** efter värdet

**Renderas som:** Numrerad lista (`<ol>`)

---

### 4. Outputs (Output & Effekter)

**Innehåll:**
- 3-5 strängar, varje sträng i formatet:

```text
Outputtyp: ...; Typ: ...; Effekt: ...; Loggning: ...
```

**Exempel:**
- `"Outputtyp: beslut; Typ: enum; Effekt: APPROVE/REFER/DECLINE; Loggning: beslutsgrund och värden loggas"`
- `"Outputtyp: flagga; Typ: boolean; Effekt: hög_skuldsättning=true om skuldkvot > 5.0; Loggning: flaggans värde loggas"`
- `"Outputtyp: riskklass; Typ: string; Effekt: LÅG/MEDEL/HÖG baserat på kombination av faktorer; Loggning: riskklass och motivering loggas"`

**Viktigt:**
- Måste beskriva både huvudbeslutet och minst en flagga/effekt
- Skriv inte generiska texter utan konkret beslutsbeteende
- Inga filpaths, inga systemnamn, ingen HTML

**Renderas som:** Lista (`<ul>`)

---

### 5. BusinessRulesPolicy (Affärsregler & Policystöd)

**Innehåll:**
- 3-6 strängar som:
  - Refererar till interna policyprinciper (generellt, inga dokument-ID:n)
  - Beskriver hur regeln stödjer dessa (t.ex. skuldkvotstak, belåningsgradstak, exklusionskriterier)
  - Kan nämna övergripande regulatoriska krav (konsumentkreditlag, AML/KYC) på principnivå

**Exempel:**
- `"Följer bankens skuldkvotspolicy (max 6.0 för standardkunder)"`
- `"Stödjer konsumentkreditlagens krav på kreditvärdighetsbedömning"`
- `"Implementerar AML/KYC-principer för riskklassificering"`
- `"Följer bankens belåningsgradstak för olika kundsegment"`

**Viktigt:**
- Ingen detalj-juridik, inga faktiska referensnummer
- Håll det generellt och principbaserat

**Renderas som:** Lista (`<ul>`)

---

### 6. RelatedItems (Relaterade Regler & Subprocesser)

**Innehåll:**
- 2-4 strängar som beskriver:
  - Relaterade regler/DMN på över-/underordnad nivå (generella namn)
  - Relevanta subprocesser i kreditresan (t.ex. förhandsbedömning, huvudbeslut, utbetalning)
  - Övergripande dokumentation som är viktig för helheten (t.ex. kreditpolicy-dokumentation)

**Exempel:**
- `"Riskbedömningsprocess (mortgage-se-risk-assessment.bpmn)"`
- `"UC-integration (fetch-credit-score service task)"`
- `"Relaterad regel: Förhandsbedömning (används före huvudbeslut)"`
- `"Kreditpolicy-dokumentation (övergripande riktlinjer för kreditbeslut)"`

**Viktigt:**
- Inga länkar, inga filpaths, inga hårdkodade filnamn
- Beskriv på beskrivningsnivå, inte med tekniska detaljer

**Renderas som:** Lista (`<ul>`)

---

## Formatkrav

### Inputs-format
Varje input måste följa EXAKT formatet:
```
Fält: <namn>; Datakälla: <källa>; Typ: <typ>; Obligatoriskt: Ja/Nej; Validering: <validering>; Felhantering: <felhantering>
```

### Outputs-format
Varje output måste följa EXAKT formatet:
```
Outputtyp: <typ>; Typ: <datatyp>; Effekt: <effekt>; Loggning: <loggning>
```

### Numeriska Tröskelvärden
Alla numeriska tröskelvärden (kreditpoäng, belåningsgrad, inkomstnivåer, ålder) måste ha **"(exempelvärde)"** direkt efter värdet.

Exempel:
- `Skuldkvot över 6.0 (exempelvärde)`
- `Kreditvärdighet under 620 (exempelvärde)`
- `Belåningsgrad över 85 % (exempelvärde)`

---

## Exempel på Komplett JSON

```json
{
  "summary": "Regeln bedömer kundens kreditvärdighet baserat på inkomst, skuldsättning och kreditpoäng. Den används i riskbedömningsfasen för att avgöra om ansökan ska godkännas, hänvisas till manuell granskning eller avslås.",
  "inputs": [
    "Fält: månadsinkomst; Datakälla: kundregister; Typ: decimal; Obligatoriskt: Ja; Validering: > 0; Felhantering: returnera null om saknas",
    "Fält: totala skulder; Datakälla: kreditbyrå; Typ: decimal; Obligatoriskt: Ja; Validering: >= 0; Felhantering: använd 0 om saknas",
    "Fält: kreditpoäng; Datakälla: UC; Typ: integer; Obligatoriskt: Ja; Validering: 300-850; Felhantering: avvisa om utanför range"
  ],
  "decisionLogic": [
    "Om kreditpoäng < 600 (exempelvärde) → DECLINE",
    "Om skuldkvot > 6.0 (exempelvärde) → REFER",
    "Om kreditpoäng >= 700 (exempelvärde) och skuldkvot < 4.0 (exempelvärde) → APPROVE",
    "Annars → REFER"
  ],
  "outputs": [
    "Outputtyp: beslut; Typ: enum; Effekt: APPROVE/REFER/DECLINE; Loggning: beslutsgrund och värden loggas",
    "Outputtyp: flagga; Typ: boolean; Effekt: hög_skuldsättning=true om skuldkvot > 5.0; Loggning: flaggans värde loggas"
  ],
  "businessRulesPolicy": [
    "Följer bankens skuldkvotspolicy (max 6.0 för standardkunder)",
    "Stödjer konsumentkreditlagens krav på kreditvärdighetsbedömning",
    "Implementerar AML/KYC-principer för riskklassificering"
  ],
  "relatedItems": [
    "Riskbedömningsprocess (mortgage-se-risk-assessment.bpmn)",
    "UC-integration (fetch-credit-score service task)"
  ]
}
```

---

## Jämförelse med Feature Goal och Epic

### Likheter
- Samma grundläggande struktur (summary, implementationNotes, relatedItems)
- Samma krav på affärsspråk och undvikande av teknisk terminologi
- Samma krav på numeriska tröskelvärden med "(exempelvärde)"

### Skillnader
- **Business Rule** har specifika fält för beslutslogik (`decisionLogic`, `inputs`, `outputs`, `businessRulesPolicy`)
- **Feature Goal/Epic** har fält för processflöde (`flowSteps`, `prerequisites`, `userStories`)
- **Business Rule** fokuserar på beslut och regler, medan **Feature Goal/Epic** fokuserar på processer och användarinteraktioner

---

## Viktiga Noteringar

1. **Prompt-version:** Business Rule-prompten är v2.0.0 (jämfört med Feature/Epic som är v1.4.0)
2. **Formatkrav:** Inputs och Outputs har strikta formatkrav som måste följas exakt
3. **Numeriska värden:** Alla numeriska tröskelvärden måste ha "(exempelvärde)" efter värdet
4. **Kontextanvändning:** Prompten instruerar att använda `processContext.phase` och `processContext.lane` för att placera regeln i rätt kontext

---

## Förväntat Innehåll per Fält

| Fält | Antal Items | Format | Exempel |
|------|-------------|--------|---------|
| summary | 1 sträng (2-4 meningar) | Ren text | "Regeln bedömer kundens kreditvärdighet..." |
| inputs | 3+ strängar | Exakt format med semikolon | "Fält: ...; Datakälla: ...; Typ: ..." |
| decisionLogic | 3-6 strängar | Beskrivning av regler | "Om kreditpoäng < 600 → DECLINE" |
| outputs | 3-5 strängar | Exakt format med semikolon | "Outputtyp: ...; Typ: ...; Effekt: ..." |
| businessRulesPolicy | 3-6 strängar | Policyreferenser | "Följer bankens skuldkvotspolicy..." |
| relatedItems | 2-4 strängar | Relaterade regler/processer | "Riskbedömningsprocess..." |
