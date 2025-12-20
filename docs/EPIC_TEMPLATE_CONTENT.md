# Innehåll i Claude-genererade Epic-mallar för Service Tasks och User Tasks

## Översikt

Både **Service Tasks** och **User Tasks** använder samma `EpicDocModel` och samma prompt (`feature_epic_prompt.md`), men innehållet anpassas baserat på nodtyp.

**Viktigt – Affärsspråk:**
Allt innehåll i Epic-dokumentationen ska vara skrivet i affärstermer, inte teknisk BPMN-terminologi. Se generella instruktioner i prompten (v1.2.0) för detaljer. Detta gäller för alla fält: summary, prerequisites, flowSteps, interactions, userStories, implementationNotes.

## EpicDocModel Struktur

```typescript
{
  summary: string;                    // 2-4 meningar om syfte och värde
  prerequisites: string[];            // 2-3 strängar om förutsättningar
  flowSteps: string[];                // 4-6 strängar om processsteg
  interactions?: string[];            // 2-3 strängar (primärt för User Tasks)
  userStories: EpicUserStory[];       // 3-6 user stories
  implementationNotes: string[];      // 3-5 strängar om tekniska detaljer
}
```

## Detaljerad Beskrivning av Fält

### 1. Summary (Syfte & Effekt)

**Innehåll:**
- 2-4 meningar som beskriver:
  - Vad epiken gör (ur affärs- och användarperspektiv)
  - Vilken roll den har i processen
  - Om det är en User Task eller Service Task

**Viktigt – affärsspråk:**
- Beskriv vad som händer i affärstermer, inte teknisk BPMN-terminologi
- Använd termer som "kunden", "handläggaren", "systemet", "processen" istället för "UserTask", "ServiceTask", "BPMN-nod"

**Exempel (User Task):**
> "Epiken möjliggör att kunder kan fylla i ansökningsinformation via webbgränssnitt. Den samlar in grundläggande kund- och ansökningsdata som behövs för att initiera kreditprocessen. Processen är designad för att vara enkel och vägledande för användaren."

**Exempel (Service Task):**
> "Epiken automatiskt hämtar och berikar kunddata från externa källor. Den anropar kreditupplysningstjänster och folkbokföringsregister för att komplettera ansökningsinformationen. Processen körs i bakgrunden utan användarinteraktion."

### 2. Prerequisites (Förutsättningar)

**Innehåll:**
- 2-3 strängar om:
  - Data, kontroller eller beslut som måste vara uppfyllda
  - Vilken föregående process eller regel som måste ha körts

**Viktigt – affärsspråk:**
- Beskriv förutsättningar i affärstermer (t.ex. "Ansökan måste vara komplett" istället för "UserTask måste vara klar")

**Exempel:**
- "Triggas normalt efter [föregående nod]."
- "Förutsätter att grundläggande kund- och ansökningsdata är validerade."
- "Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända."

### 3. FlowSteps (Funktionellt flöde)

**Innehåll:**
- 4-6 strängar, varje sträng en full mening som beskriver ett steg:
  - Vad användaren gör (User Tasks)
  - Vad systemet gör (Service Tasks)
  - Hur epiken påverkar flödet (status, beslut)

**Viktigt – affärsspråk:**
- Beskriv **VAD** som händer i affärstermer, inte **HUR** det är strukturerat i BPMN
- Undvik teknisk BPMN-terminologi (callActivity, sequenceFlow, gateway, BPMN-nod, datastore) om det inte är absolut nödvändigt
- Använd affärstermer: "processen", "systemet", "kunden", "handläggaren", "nästa steg", "data sparas"

**Exempel (User Task):**
1. "Kunden öppnar sidan och ser sammanfattad ansöknings- och kundinformation."
2. "Systemet visar formulär eller val baserat på föregående steg och riskprofil."
3. "Kunden fyller i eller bekräftar uppgifter och skickar vidare."
4. "Systemet validerar uppgifterna och uppdaterar processen innan den fortsätter till nästa steg."

**Exempel (Service Task) - Affärsnära:**
1. "Systemet startar automatiskt när ansökningsdata är tillgänglig."
2. "Systemet hämtar kompletterande information från externa källor (t.ex. kreditupplysning, folkbokföring)."
3. "Systemet validerar att informationen är korrekt och komplett."
4. "Systemet sparar resultatet och skickar vidare till nästa steg i processen."

**Exempel (Service Task) - För teknisk (undvik):**
1. "Processmotorn triggar tjänsten med relevant ansöknings- och kunddata."
2. "Tjänsten anropar interna och/eller externa system för att hämta eller berika data."
3. "Svar kontrolleras mot förväntade format och felkoder hanteras på övergripande nivå."
4. "Resultatet lagras och vidarebefordras till nästa BPMN-nod."

**Renderas som:** Numrerad lista (`<ol>`)

### 4. Interactions (Interaktioner) - OPCIONAL

**Innehåll:**
- 2-3 strängar om:
  - Användargränssnitt (web/app/intern klient) - **User Tasks**
  - API-endpoints - **Service Tasks**
  - Felmeddelanden och guidning
  - Integrationer ur UX-perspektiv

**Viktigt – affärsspråk:**
- Beskriv interaktioner ur användarens perspektiv (t.ex. "Kunden ser tydliga felmeddelanden" istället för "Systemet visar valideringsfel från UserTask")

**Exempel (User Task):**
- "Kanal: web/app eller internt handläggargränssnitt beroende på roll."
- "UI ska vara förklarande, med tydlig koppling till kreditbeslut och nästa steg."
- "Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd."

**Exempel (Service Task):**
- `Primära API:er: t.ex. POST /api/[epic-slug] för exekvering.`
- "Tjänsten ska hantera timeouts och felkoder från beroenden på ett kontrollerat sätt (retry/circuit breaker på plattformsnivå)."
- "Respons ska vara deterministisk och innehålla tydliga statusfält som går att logga och följa upp."

**Renderas som:** Lista (endast om `interactions` finns och har innehåll)

### 5. User Stories

**Struktur:**
```typescript
{
  id: string;                    // "US-1", "US-2", etc.
  role: string;                  // "Kund", "Handläggare", "System", etc.
  goal: string;                  // Vad vill rollen uppnå?
  value: string;                 // Varför är det värdefullt?
  acceptanceCriteria: string[];  // 2-4 konkreta krav
}
```

**Format:** "Som [role] vill jag [goal] så att [value]"

**Viktigt – affärsspråk:**
- User stories ska vara skrivna i affärstermer från användarens perspektiv
- Acceptanskriterier ska beskriva vad systemet gör i affärstermer (t.ex. "Systemet validerar uppgifterna" istället för "ServiceTask kör validering")

**Exempel (User Task):**
```json
{
  "id": "US-1",
  "role": "Kund",
  "goal": "Fylla i ansökningsinformation",
  "value": "Kunna ansöka om lån på ett enkelt sätt",
  "acceptanceCriteria": [
    "Systemet ska validera att alla obligatoriska fält är ifyllda innan formuläret kan skickas",
    "Systemet ska visa tydliga felmeddelanden om fält saknas eller är ogiltiga",
    "Systemet ska spara utkast automatiskt så att användaren inte förlorar information"
  ]
}
```

**Exempel (Service Task):**
```json
{
  "id": "US-1",
  "role": "Handläggare",
  "goal": "Få systemet att automatiskt hantera processsteg",
  "value": "Spara tid genom automatisering",
  "acceptanceCriteria": [
    "Systemet ska automatiskt exekvera tjänsten när föregående steg är klart",
    "Systemet ska hantera fel och timeouts på ett kontrollerat sätt",
    "Systemet ska logga alla viktiga steg för spårbarhet"
  ]
}
```

**Krav:**
- Minst 3 user stories, max 6 user stories
- För User Tasks: Fokus på användarens behov (Kund, Handläggare, etc.)
- För Service Tasks: Fokus på vem som drar nytta (Handläggare, System, etc.)
- Varje user story ska ha 2-4 acceptanskriterier
- Acceptanskriterier ska täcka både happy path, edge cases och felhantering

**Renderas som:** Stylade boxar med:
- Rubrik: `US-1: Som [role] vill jag [goal] så att [value]`
- Acceptanskriterier som lista
- Länk till testfil (om tillgänglig)

### 6. Implementation Notes

**Innehåll:**
- 3-5 strängar om:
  - Vilka interna tjänster/komponenter epiken använder
  - Loggning och audit-spår
  - Felhantering och timeouts
  - Viktiga kvalitets- eller prestandakrav
  - Eventuella affärsregler eller policykrav

**Exempel:**
- `Primära API:er/tjänster: t.ex. POST /api/[epic-slug] för exekvering.`
- "Viktiga fält och beslut bör loggas för att möjliggöra felsökning och efterkontroll."
- "Eventuella externa beroenden (kreditupplysning, folkbokföring, engagemangsdata) hanteras via plattformens integrationslager."
- "Prestanda- och tillgänglighetskrav hanteras på plattformsnivå men bör beaktas i designen."

**Renderas som:** Lista

## Ytterligare Sektioner i HTML (inte från LLM)

### Tekniska & externa beroenden

**Innehåll (fast, inte från LLM):**
- Beroende tjänster och API:er som epiken anropar eller är beroende av
- Datakällor (tabeller, domäner och register) som epiken läser eller uppdaterar
- Externa system eller tredjepartstjänster som påverkar epikens flöde och tillgänglighet
- Påverkade komponenter i backend, frontend och integrationslager som behöver samspela
- Tekniska risker och känsliga beroenden som kräver särskild övervakning eller fallback-hantering

### Definition of Ready (DoR)

**Innehåll (fast, inte från LLM):**
- Syfte, effektmål och förväntat affärsvärde för epiken är beskrivet och förankrat
- Upstream- och downstream-noder, beroenden och grundläggande affärsregler är identifierade
- Indata, gränssnitt och eventuella externa beroenden är kända och övergripande dokumenterade
- Affärs-scenarion och testkriterier är definierade på en nivå som möjliggör planering av automatiska tester
- Acceptanskriterier och icke‑funktionella krav (prestanda, robusthet, spårbarhet) är övergripande klarlagda

### Definition of Done (DoD)

**Innehåll (fast, inte från LLM):**
- Epiken levererar den avtalade effekten och stöder definierade affärsflöden utan kritiska gap
- Alla in- och utdataflöden fungerar, är testade och dokumenterade med spårbarhet mot beroende noder
- Affärsregler som triggas av epiken är implementerade, testade och dokumenterade
- Automatiska tester täcker huvudflöde, relevanta edge-cases och felhantering
- Monitorering/loggning är på plats och dokumentation är uppdaterad för berörda team

## Skillnader mellan User Tasks och Service Tasks

### User Tasks

**Fokus:**
- Användarinteraktion och UX
- Formulär, validering, felmeddelanden
- Kanal: web/app/handläggargränssnitt

**User Stories:**
- Roller: "Kund", "Handläggare", "Rådgivare"
- Fokus på användarens behov och upplevelse

**Interactions:**
- UI/UX-detaljer
- Felmeddelanden och guidning
- Användarflöden

**FlowSteps:**
- Vad användaren gör
- Vad systemet visar
- Användarens val och bekräftelser

### Service Tasks

**Fokus:**
- Automatiserad systemexekvering
- API-anrop och integrationer
- Felhantering och timeouts

**User Stories:**
- Roller: "Handläggare", "System", "Backend"
- Fokus på automatisering och effektivitet

**Interactions:**
- API-endpoints
- Tekniska integrationer
- Felhantering och retry-logik

**FlowSteps:**
- Vad systemet gör automatiskt
- API-anrop och datahantering
- Statusuppdateringar och vidarebefordran

## Sammanfattning

**Vad genereras av Claude:**
1. ✅ Summary (2-4 meningar)
2. ✅ Prerequisites (2-3 strängar)
3. ✅ FlowSteps (4-6 steg → numrerad lista)
4. ✅ Interactions (2-3 strängar, optional, primärt User Tasks)
5. ✅ User Stories (3-6 stories med acceptanskriterier)
6. ✅ Implementation Notes (3-5 strängar)

**Vad är fast i mallen (inte från LLM):**
- Metadata (BPMN-element, process-steg, swimlane, version, ansvarig)
- Tekniska & externa beroenden (fast lista)

**Totalt:** 6 LLM-genererade sektioner + 1 fast sektion = 7 sektioner i HTML-dokumentet
