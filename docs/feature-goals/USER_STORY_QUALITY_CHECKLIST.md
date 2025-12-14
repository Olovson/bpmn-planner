# User Story Quality Checklist

## Syfte
Denna checklista säkerställer att user stories ger värde för utvecklare och inte bara beskriver BPMN-syntax.

---

## ✅ Kvalitetskriterier

### 1. Ger värde för utvecklare
- [ ] User story beskriver **VAD** som ska implementeras, inte bara **HUR** BPMN-processen fungerar
- [ ] User story ger **affärskontext** och förklarar **varför** funktionaliteten behövs
- [ ] User story beskriver **funktionalitet, affärslogik eller användarupplevelse**, inte bara BPMN-mekanik
- [ ] En utvecklare kan **implementera direkt** baserat på user story och acceptanskriterier

### 2. Undviker BPMN-syntax
- [ ] User story beskriver **inte** "processen startar via start event" (detta är BPMN-syntax)
- [ ] User story beskriver **inte** "sequence flow går till" (detta är BPMN-syntax)
- [ ] User story beskriver **inte** "gateway dirigerar" (detta är BPMN-syntax)
- [ ] User story beskriver **inte** "service task automatiskt genomför" utan förklarar **vad** som görs
- [ ] User story innehåller **inte** BPMN-referenser i mål-specifikationen (t.ex. "via 'X' service task (x-id)") - dessa ska endast finnas i acceptanskriterierna

### 3. Användarcentrerad
- [ ] Persona är en **riktig användare** (kund, handläggare, värderare), inte teknisk abstraktion
- [ ] Mål beskriver vad **användaren/systemet gör**, inte BPMN-processens mekanik
- [ ] Värde är **användarcentrerat** (vad får personan ut av det?), inte teknisk konsekvens
- [ ] Undviker "systemadministratör" som persona för automatiserade processer (använd endast när det ger tydligt värde)
- [ ] Föredrar användarperspektiv även för automatiserade processer (t.ex. "Som handläggare vill jag att systemet automatiskt..." istället för "Som system vill jag...")

### 4. Funktionella acceptanskriterier
- [ ] Acceptanskriterier beskriver **funktionalitet**, inte BPMN-flöde
- [ ] Acceptanskriterier är **testbara** med funktionella tester
- [ ] Acceptanskriterier inkluderar **affärslogik, valideringar, felmeddelanden, användarupplevelse**
- [ ] Acceptanskriterier undviker "ska triggas när", "ska gå till via Flow_X" (detta är BPMN-syntax)

### 5. Ger implementation-detaljer
- [ ] User story beskriver **vad användaren ser** (UI/UX)
- [ ] User story beskriver **vilka valideringar** som behövs
- [ ] User story beskriver **vilka felmeddelanden** som visas
- [ ] User story beskriver **affärslogik och beslutsregler** (inte bara BPMN-gateways)

### 6. Undviker dubblering
- [ ] User story **dubblerar inte** BPMN-diagrammet
- [ ] User story ger **mer information** än vad BPMN-diagrammet visar
- [ ] User story fokuserar på **funktionalitet och affärslogik**, inte bara processflöde

---

## ❌ Rödflaggor (ta bort eller omformulera)

### User stories som bara beskriver BPMN-syntax:
- ❌ "Som systemadministratör vill jag att processen startar via start event (start-event) så att Disbursement-processen kan initieras"
- ❌ "Som systemadministratör vill jag att 'Handle disbursement' service task (handle-disbursement) automatiskt genomför utbetalning via Core system"
- ❌ "Som systemadministratör vill jag att event-based gateway (Gateway_15wjsxm) väntar på antingen 'Disbursement completed' eller 'Disbursement cancelled' message event"

### Acceptanskriterier som bara beskriver BPMN-flöde:
- ❌ "Start event (start-event) ska triggas när Disbursement-processen anropas från huvudprocessen via 'disbursement' call activity efter 'Flow_0vtuz4d' sequence flow. Efter start event, ska flödet gå till 'Handle disbursement' service task (handle-disbursement) via Flow_1o0uuwd."

---

## ✅ Exempel på bra user stories

### Exempel 1: Användarcentrerad med funktionella krav
```
Som kund vill jag kunna överklaga en automatiskt avvisad bolåneansökan via 'Submit appeal' user task (submit-appeal) i Stakeholder-portalen så att jag kan få en andra chans att få min ansökan godkänd med kompletterande information.

Acceptanskriterier: Systemet ska tillåta kunder att skicka in överklagan via ett formulär som kräver motivering och kompletterande dokumentation. Formuläret ska validera att motivering är ifylld och att minst ett dokument är bifogat innan överklagan kan skickas in. Systemet ska visa tydlig feedback om vad som saknas.
```

### Exempel 2: Systemperspektiv med värde
```
Som handläggare vill jag att systemet automatiskt hanterar utbetalning via 'Handle disbursement' service task (handle-disbursement) så att jag endast behöver hantera avbrutna utbetalningar, vilket sparar tid.

Acceptanskriterier: Systemet ska automatiskt genomföra utbetalning via Core system API med retry-logik (max 3 försök, exponential backoff). Endast avbrutna utbetalningar ska eskaleras för manuell hantering. Systemet ska visa tydlig status för utbetalning (pågående, slutförd, avbruten) med visuella indikatorer i handläggarens gränssnitt.
```

### Exempel 3: Affärslogik och validering
```
Som handläggare vill jag kunna granska överklaganden från kunder via 'Screen appeal' user task (screen-appeal) i Caseworker-systemet så att jag kan acceptera ansökningar som borde ha godkänts från början.

Acceptanskriterier: Systemet ska tilldela 'Screen appeal' user task till handläggare i Caseworker lane. Handläggaren ska kunna se kundens motivering och kompletterande dokumentation, samt information om varför ansökan initialt avvisades. Handläggaren ska kunna acceptera eller avvisa överklagan med en motiverad bedömning. Systemet ska validera att en bedömning är ifylld innan beslutet kan sparas.
```

---

## Användning

**Innan du godkänner user stories:**
1. Gå igenom varje user story med denna checklista
2. Om en user story inte uppfyller kriterierna, omformulera eller ta bort den
3. Fokusera på funktionalitet, affärslogik och användarupplevelse, inte BPMN-syntax
4. Se till att utvecklare kan implementera direkt baserat på user story och acceptanskriterier

**Frågor att ställa:**
- Ger denna user story värde för utvecklare?
- Beskriver den VAD som ska implementeras, inte bara HUR BPMN-processen fungerar?
- Kan en utvecklare implementera direkt baserat på user story och acceptanskriterier?
- Ger den affärskontext och värde, inte bara teknisk information?
- Dubblerar den inte bara BPMN-diagrammet?

