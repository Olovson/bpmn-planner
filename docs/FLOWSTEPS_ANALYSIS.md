# Analys: Hur Beskrivs flowSteps - Människa eller Teknisk BPMN?

## Nuvarande Situation

### Vad Säger Prompten?

**För Epic flowSteps** (prompts/llm/feature_epic_prompt.md rad 184-193):

```
### flowSteps

**Syfte:** Beskriva epikens ansvar i processen, steg för steg.

**Innehåll (`flowSteps`):**
- 4–6 strängar, varje sträng en full mening som beskriver ett steg:
  - vad användaren gör,
  - vad systemet gör,
  - hur epiken påverkar flödet (t.ex. status, beslut).
- Fokusera på epikens **egna** ansvar, inte hela kundresan.
```

**För Feature Goal flowSteps** (rad 95-103):

```
### flowSteps

**Syfte:** Beskriva Feature Goal-nivåns affärsflöde från start till slut.

**Innehåll (`flowSteps`):**
- 4–8 strängar, varje sträng en full mening som beskriver ett steg i flödet:
  - kundens/handläggarens handlingar,
  - systemets respons,
  - viktiga beslutspunkter.
```

### Vad Skickas till LLM?

**Context som skickas** (`buildContextPayload`):
- `currentNodeContext.node`: id, name, type, file
- `currentNodeContext.hierarchy`: trail, pathLabel, depth
- `currentNodeContext.children`: lista med child nodes
- `currentNodeContext.flows`: incoming, outgoing (BPMN flow references)
- `currentNodeContext.documentation`: snippets från BPMN-element
- `currentNodeContext.descendantNodes`: alla descendant nodes (strukturell info)
- `currentNodeContext.descendantTypeCounts`: antal noder per typ

**Vad INTE skickas:**
- ❌ Teknisk BPMN-terminologi som instruktion
- ❌ "Beskriv med BPMN-termer som sequenceFlow, callActivity"
- ❌ "Använd teknisk terminologi"

### Vad Genereras i Praktiken?

**Exempel från faktiska genererade dokument:**

#### Exempel 1: Service Task (fetch-fastighets-information)
```
1. Epiken triggas automatiskt när object-information subprocessen startar och objekttyp är småhus (fastighet).
2. Systemet identifierar fastighetsinformation (adress, fastighetsbeteckning) från ansökningsdata.
3. Ett API-anrop görs till Lantmäteriet eller liknande fastighetsregister för att hämta fastighetsinformation.
4. Hämtad data valideras mot förväntat format och kompletteras med metadata.
5. Fastighetsinformation sparas i processens datastore och görs tillgänglig för efterföljande steg.
```

**Analys:**
- ✅ Beskriver vad som händer på ett sätt som en människa förstår
- ⚠️ Innehåller tekniska termer: "API-anrop", "datastore", "subprocessen"
- ✅ Fokus på affärslogik: "identifierar fastighetsinformation", "hämta fastighetsinformation"

#### Exempel 2: Business Rule Task (evaluate-personal-information)
```
1. Epiken triggas automatiskt när fetch-personal-information har slutförts och personinformation är tillgänglig.
2. DMN-motorn läser in relevanta indata: ålder, inkomst, kreditscore, och anställningsstatus från personinformation.
3. DMN-regeln utvärderar indata mot beslutslogik och affärsregler för borrower profile validation.
4. Regeln returnerar ett beslut: APPROVED (kan fortsätta) eller REJECTED (stoppas) tillsammans med motivering.
5. Resultatet sparas i processens datastore tillsammans med motivering och eventuella flaggor.
6. Beroende på resultat fortsätter processen: APPROVED → fetch-credit-information, REJECTED → processen avslutas med fel.
```

**Analys:**
- ✅ Beskriver vad som händer på ett sätt som en människa förstår
- ⚠️ Innehåller tekniska termer: "DMN-motorn", "DMN-regeln", "datastore", "processen"
- ✅ Fokus på affärslogik: "utvärderar indata", "returnerar ett beslut", "fortsätter processen"

#### Exempel 3: User Task (register-source-of-equity)
```
1. Epiken triggas när föregående steg i object-processen har slutförts och kunden behöver registrera källa till eget kapital.
2. Systemet presenterar formulär för källa till eget kapital med sektioner för olika källor.
3. Kunden eller handläggare väljer typ av källa och fyller i belopp för varje källa.
4. Systemet validerar att totalt eget kapital matchar det efterfrågade beloppet.
5. Kunden eller handläggare bekräftar och sparar informationen.
6. Efter bekräftelse markeras källa till eget kapital som registrerad och processen fortsätter till nästa steg.
```

**Analys:**
- ✅ Beskriver vad som händer på ett sätt som en människa förstår
- ✅ Fokus på användarens handlingar: "Kunden eller handläggare väljer", "fyller i", "bekräftar"
- ✅ Fokus på systemets respons: "Systemet presenterar", "validerar", "markeras"
- ⚠️ Innehåller tekniska termer: "processen", "object-processen"

### Fallback-Exempel (utan LLM)

**User Task:**
```
1. Användaren öppnar vyn och ser sammanfattad ansöknings- och kundinformation.
2. Formulär eller val presenteras baserat på föregående steg och riskprofil.
3. Användaren fyller i eller bekräftar uppgifter och skickar vidare.
4. Systemet validerar indata och uppdaterar processens status samt triggar nästa steg.
```

**Service Task:**
```
1. Processmotorn triggar tjänsten med relevant ansöknings- och kunddata.
2. Tjänsten anropar interna och/eller externa system för att hämta eller berika data.
3. Svar kontrolleras mot förväntade format och felkoder hanteras på övergripande nivå.
4. Resultatet lagras och vidarebefordras till nästa BPMN-nod.
```

**Analys:**
- ✅ Fallback-exemplen är skrivna på ett sätt som en människa förstår
- ⚠️ Innehåller tekniska termer: "Processmotorn", "BPMN-nod", "processens status"
- ✅ Fokus på vad som händer, inte bara teknisk beskrivning

## Bedömning

### Är flowSteps Skrivna för Människor?

**JA, men med teknisk terminologi när det är relevant:**

1. **Fokus på affärslogik och användarhandlingar:**
   - "Kunden eller handläggare väljer typ av källa"
   - "Systemet presenterar formulär"
   - "DMN-regeln utvärderar indata"

2. **Teknisk terminologi används när det är relevant:**
   - "DMN-motorn" (för Business Rule Tasks)
   - "API-anrop" (för Service Tasks)
   - "processens datastore" (för att beskriva var data sparas)
   - "BPMN-nod" (ibland i fallback-exempel)

3. **INTE bara teknisk BPMN-beskrivning:**
   - FlowSteps beskriver INTE bara "sequenceFlow från A till B"
   - FlowSteps beskriver INTE bara "callActivity anropar subprocess"
   - FlowSteps beskriver VAD som händer, inte bara HUR det är strukturerat i BPMN

### Problem Identifierat

**Risk för teknisk terminologi:**
- LLM kan ibland använda för mycket teknisk terminologi (t.ex. "processens datastore", "BPMN-nod")
- Detta kan göra texten mindre begriplig för icke-tekniska läsare

**Lösning:**
- Prompten instruerar redan att fokusera på "vad användaren gör" och "vad systemet gör"
- Men prompten nämner INTE att undvika teknisk terminologi
- Prompten nämner INTE att använda affärsspråk istället för tekniska termer

## Rekommendation

### ✅ Förbättring Implementerad

**Uppdaterad instruktion i prompten (v1.2.0):**

**Generell instruktion för allt innehåll:**
En generell sektion om affärsspråk har lagts till i "Gemensamma regler" som gäller för **alla fält** i dokumentationen:
- summary
- flowSteps
- prerequisites
- interactions
- userStories
- implementationNotes
- dependencies
- effectGoals
- scopeIncluded
- scopeExcluded
- relatedItems
- epics (description)
- etc.

**Specifika instruktioner för flowSteps (v1.1.0):**

För Epic flowSteps:
```
**Viktigt – använd affärsspråk:**
- Beskriv **VAD** som händer i affärstermer, inte **HUR** det är strukturerat i BPMN.
- Undvik teknisk BPMN-terminologi (t.ex. "callActivity", "sequenceFlow", "gateway", "BPMN-nod", "datastore") om det inte är absolut nödvändigt.
- Använd istället affärstermer som "processen", "systemet", "kunden", "handläggaren", "nästa steg", "data sparas".
- För Service Tasks: Beskriv vad systemet gör automatiskt (t.ex. "Systemet hämtar kunddata från externa källor") istället för tekniska detaljer (t.ex. "ServiceTask anropar API-endpoint").
- För Business Rule Tasks: Beskriv vad regeln bedömer (t.ex. "Systemet utvärderar kundens kreditvärdighet") istället för tekniska detaljer (t.ex. "DMN-motorn kör beslutslogik").
- Exempel på bra beskrivning: "Kunden fyller i ansökningsinformation och systemet validerar uppgifterna innan processen fortsätter."
- Exempel på dålig beskrivning: "UserTask exekveras och sequenceFlow går till nästa callActivity-nod."
```

För Feature Goal flowSteps:
```
**Viktigt – använd affärsspråk:**
- Beskriv **VAD** som händer i affärstermer, inte **HUR** det är strukturerat i BPMN.
- Undvik teknisk BPMN-terminologi (t.ex. "callActivity", "sequenceFlow", "gateway", "BPMN-nod") om det inte är absolut nödvändigt.
- Använd istället affärstermer som "processen", "systemet", "kunden", "handläggaren", "nästa steg".
- Exempel på bra beskrivning: "Kunden fyller i ansökningsinformation och systemet validerar uppgifterna innan processen fortsätter."
- Exempel på dålig beskrivning: "UserTask exekveras och sequenceFlow går till nästa callActivity-nod."
```

### Exempel på Förbättring

**Före (för teknisk):**
```
1. Processmotorn triggar tjänsten med relevant ansöknings- och kunddata.
2. Tjänsten anropar interna och/eller externa system för att hämta eller berika data.
3. Resultatet lagras och vidarebefordras till nästa BPMN-nod.
```

**Efter (mer affärsnära):**
```
1. Systemet startar automatiskt när ansökningsdata är tillgänglig.
2. Systemet hämtar kompletterande information från externa källor (t.ex. kreditupplysning, folkbokföring).
3. Systemet validerar och berikar data innan den skickas vidare till nästa steg i processen.
```

## Sammanfattning

**Nuvarande status:**
- ✅ FlowSteps är skrivna på ett sätt som en människa förstår
- ⚠️ Men de innehåller ibland teknisk terminologi (DMN-motorn, API-anrop, datastore, BPMN-nod)
- ✅ Fokus på affärslogik och användarhandlingar, inte bara teknisk BPMN-struktur

**✅ Förbättring implementerad (v1.2.0):**

**Generell instruktion för allt innehåll:**
- En generell sektion om affärsspråk har lagts till i "Gemensamma regler"
- Gäller för **alla fält** i dokumentationen (summary, flowSteps, prerequisites, interactions, userStories, implementationNotes, dependencies, effectGoals, scopeIncluded, scopeExcluded, relatedItems, etc.)
- Instruerar att beskriva VAD som händer i affärstermer, inte HUR det är strukturerat i BPMN
- Undvika teknisk BPMN-terminologi (callActivity, sequenceFlow, gateway, BPMN-nod, datastore, UserTask, ServiceTask, BusinessRuleTask)
- Använd affärstermer: "processen", "systemet", "kunden", "handläggaren", "nästa steg", "data sparas", "ansökan", "beslut"
- Specifika instruktioner för Service Tasks och Business Rule Tasks
- Specifika exempel på bra vs dålig beskrivning

**Förväntat resultat:**
- **Allt innehåll** kommer att vara mer affärsnära och mindre teknisk
- Fokus på vad som händer i affärstermer, inte hur det är strukturerat i BPMN
- Mindre användning av teknisk terminologi som "DMN-motorn", "datastore", "BPMN-nod", "UserTask", "ServiceTask"
- Konsistent affärsspråk genom hela dokumentationen
