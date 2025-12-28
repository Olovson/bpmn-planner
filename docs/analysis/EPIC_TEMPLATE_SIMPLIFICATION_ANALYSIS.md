# Analys: Förenkling av Epic Mallar

**Datum:** 2025-12-28

## Översikt

Analys av `buildEpicDocModelFromContext` och `buildEpicDocHtmlFromModel` för att identifiera:
1. Duplicerad information
2. Information som inte ger värde
3. Oanvända variabler och beräkningar

---

## 1. Duplicerad Information

### 1.1 Duplicerad Beräkning av Kontextvariabler

**Problem:** Samma variabler beräknas i både `buildEpicDocModelFromContext` och `buildEpicDocHtmlFromModel`:

```typescript
// I buildEpicDocModelFromContext (rad 450-465):
const nodeName = node.name || node.bpmnElementId || 'Epic';
const previousNode = context.parentChain.length ? ... : undefined;
const nextNode = context.childNodes.length ? ... : undefined;
const upstreamName = previousNode ? formatNodeName(previousNode) : 'Processstart';
const downstreamName = nextNode ? formatNodeName(nextNode) : 'Nästa steg';
const processStep = node.bpmnFile.replace('.bpmn', '');
const isUserTask = node.type === 'userTask';
const isServiceTask = node.type === 'serviceTask';
const swimlaneOwner = isUserTask ? 'Kund / Rådgivare' : isServiceTask ? 'Backend & Integration' : ...;

// I buildEpicDocHtmlFromModel (rad 670-691):
// EXAKT SAMMA BERÄKNINGAR IGEN!
```

**Lösning:** Flytta dessa beräkningar till en gemensam funktion eller skicka dem som parametrar.

**Fördelar:**
- ✅ Minskar kodduplicering
- ✅ Enklare att underhålla
- ✅ Mindre risk för inkonsistens

---

### 1.2 Duplicerad Nodtyp-identifiering

**Problem:** Logiken för att identifiera nodtyp (isDataGathering, isEvaluation, isDecision) finns i båda funktionerna:

```typescript
// I buildEpicDocModelFromContext (rad 703-706):
const nodeNameLower = nodeName.toLowerCase();
const isDataGathering = nodeNameLower.includes('data') && ...;
const isEvaluation = nodeNameLower.includes('evaluation') || ...;
const isDecision = nodeNameLower.includes('decision') || ...;

// I buildEpicDocHtmlFromModel (rad 702-706):
// EXAKT SAMMA LOGIK IGEN!
```

**Lösning:** Extrahera till en gemensam funktion `identifyNodeType(nodeName: string)`.

---

### 1.3 Duplicerad Fallback-logik

**Problem:** Fallback-logiken för `flowSteps`, `interactions`, `dependencies`, och `userStories` är nästan identisk i båda funktionerna:

- `buildEpicDocModelFromContext` (rad 493-650): Skapar fallback userStories
- `buildEpicDocHtmlFromModel` (rad 708-866): Skapar fallback flowSteps, interactions, dependencies, userStories

**Lösning:** Extrahera fallback-logiken till separata funktioner som kan användas av båda.

---

## 2. Oanvända Variabler och Beräkningar

### 2.1 Variabler som Beräknas men Inte Används

**I `buildEpicDocModelFromContext`:**

1. **`scopeBullets`** (rad 476-483)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

2. **`triggerBullets`** (rad 485-491)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

3. **`highLevelStepsUser`** (rad 493-498)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort (används inte ens i fallback)

4. **`highLevelStepsService`** (rad 500-505)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort (används inte ens i fallback)

5. **`interactionBulletsUser`** (rad 507-511)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort (används inte ens i fallback)

6. **`interactionBulletsService`** (rad 513-517)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort (används inte ens i fallback)

7. **`dataTable`** (rad 519-540)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

8. **`businessRuleRefs`** (rad 542-546)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

9. **`testRows`** (rad 548-567)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

10. **`relatedList`** (rad 569-571)
    - Beräknas men används aldrig
    - **Rekommendation:** Ta bort

11. **`relatedNodes`** (rad 457-461)
    - Beräknas men används bara för `relatedList` som inte används
    - **Rekommendation:** Ta bort

12. **`downstreamNodes`** (rad 456)
    - Beräknas men används bara för `relatedNodes` som inte används
    - **Rekommendation:** Ta bort

13. **`apiSlug`** (rad 462)
    - Beräknas men används bara i fallback-interaktioner (rad 755)
    - **Rekommendation:** Behåll (används i fallback)

14. **`ownerLabel`** (rad 474)
    - Beräknas men används aldrig
    - **Rekommendation:** Ta bort

**I `buildEpicDocHtmlFromModel`:**

1. **`relatedNodes`** (rad 676-680)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

2. **`versionLabel`** (rad 692)
   - Hårdkodad till "1.0 (exempel) – uppdateras vid ändring"
   - Används i HTML (rad 878) men ger inte värde
   - **Rekommendation:** Ta bort eller ersätt med faktisk version

3. **`ownerLabel`** (rad 693)
   - Beräknas men används aldrig
   - **Rekommendation:** Ta bort

---

## 3. Information som Inte Ger Värde

### 3.1 Version Label

**Problem:**
```typescript
const versionLabel = '1.0 (exempel) – uppdateras vid ändring';
```

- Hårdkodad och ger ingen faktisk information
- Visas i HTML men är meningslös för användare
- **Rekommendation:** Ta bort eller ersätt med faktisk version från BPMN-fil

### 3.2 Interaktioner för Service Tasks

**Problem:** Interaktioner-sektionen för service tasks innehåller generisk information som inte ger värde:

```typescript
[
  `Primära API:er: t.ex. POST /api/${apiSlug} för exekvering.`,
  'Tjänsten ska hantera timeouts och felkoder från beroenden på ett kontrollerat sätt (retry/circuit breaker på plattformsnivå).',
  'Respons ska vara deterministisk och innehålla tydliga statusfält som går att logga och följa upp.',
]
```

- För generisk och ger inte specifik information
- **Rekommendation:** Ta bort interaktioner-sektionen för service tasks (eller gör den valfri)

### 3.3 Beroenden - Duplicerad Information

**Problem:** Beroenden-sektionen innehåller ofta information som redan finns i "Förutsättningar" eller "Funktionellt flöde":

- "Tillgång till kreditregler, riskmodeller..." (generisk)
- "Komplett kund- och ansökningsdata från föregående steg..." (redan nämnt i flöde)
- "Överenskommen målbild..." (generisk)

**Rekommendation:** 
- Förenkla beroenden till faktiska tekniska beroenden (API:er, databaser, externa tjänster)
- Ta bort generiska affärsberoenden som redan nämns i andra sektioner

---

## 4. Överflödiga User Stories

### 4.1 Generiska Fallback User Stories

**Problem:** Fallback user stories är mycket generiska och ger inte värde:

```typescript
{
  id: 'US-1',
  role: 'Handläggare',
  goal: 'Få systemet att automatiskt hantera processsteg',
  value: 'Spara tid genom automatisering',
  acceptanceCriteria: [
    'Systemet ska automatiskt exekvera tjänsten när föregående steg är klart',
    'Systemet ska hantera fel och timeouts på ett kontrollerat sätt',
    'Systemet ska logga alla viktiga steg för spårbarhet',
  ],
}
```

- För generisk och applicerbar på alla service tasks
- Ger inte specifik information om denna epic
- **Rekommendation:** Ta bort fallback user stories helt, eller gör dem mycket mer specifika

---

## 5. Sammanfattning av Rekommendationer

### 5.1 Högsta Prioritet (Ta Bort Omedelbart)

1. ✅ **Ta bort oanvända variabler i `buildEpicDocModelFromContext`:**
   - `scopeBullets`
   - `triggerBullets`
   - `highLevelStepsUser`
   - `highLevelStepsService`
   - `interactionBulletsUser`
   - `interactionBulletsService`
   - `dataTable`
   - `businessRuleRefs`
   - `testRows`
   - `relatedList`
   - `relatedNodes`
   - `downstreamNodes`
   - `ownerLabel`

2. ✅ **Ta bort oanvända variabler i `buildEpicDocHtmlFromModel`:**
   - `relatedNodes`
   - `ownerLabel`

3. ✅ **Ta bort eller förbättra `versionLabel`:**
   - Antingen ta bort helt, eller ersätt med faktisk version

### 5.2 Medium Prioritet (Förenkla)

4. ✅ **Extrahera duplicerad logik:**
   - Skapa gemensam funktion för kontextvariabler
   - Skapa gemensam funktion för nodtyp-identifiering
   - Extrahera fallback-logik till separata funktioner

5. ✅ **Förenkla beroenden-sektionen:**
   - Fokusera på tekniska beroenden
   - Ta bort generiska affärsberoenden

6. ✅ **Gör interaktioner valfritt för service tasks:**
   - Dölj sektionen om den bara innehåller generisk information

### 5.3 Låg Prioritet (Överväg)

7. ⚠️ **Ta bort fallback user stories:**
   - Eller gör dem mycket mer specifika
   - LLM genererar bättre user stories ändå

---

## 6. Förväntad Effekt

### 6.1 Kodreduktion

- **Före:** ~220 rader i `buildEpicDocModelFromContext` (varav ~150 rader oanvända)
- **Efter:** ~70 rader (endast det som faktiskt används)
- **Reduktion:** ~68% mindre kod

### 6.2 Underhållbarhet

- ✅ Mindre kod att underhålla
- ✅ Mindre risk för buggar
- ✅ Enklare att förstå
- ✅ Snabbare att köra (färre onödiga beräkningar)

### 6.3 Dokumentationskvalitet

- ✅ Mindre generisk information
- ✅ Fokus på faktiskt värdefull information
- ✅ Enklare att läsa och förstå

---

## 7. Implementationsplan

### Steg 1: Ta bort oanvända variabler
- Ta bort alla variabler som identifierats som oanvända
- Testa att inget bryts

### Steg 2: Extrahera duplicerad logik
- Skapa gemensamma funktioner för kontextvariabler
- Skapa gemensam funktion för nodtyp-identifiering
- Uppdatera båda funktionerna att använda gemensam logik

### Steg 3: Förenkla beroenden och interaktioner
- Förenkla beroenden-sektionen
- Gör interaktioner valfritt för service tasks

### Steg 4: Överväg fallback user stories
- Ta bort eller förbättra fallback user stories

---

## 8. Riskbedömning

### Låg Risk
- Ta bort oanvända variabler (de används inte)
- Extrahera duplicerad logik (ingen funktionell förändring)

### Medium Risk
- Förenkla beroenden (kan påverka dokumentationskvalitet)
- Gör interaktioner valfritt (kan påverka visning)

### Hög Risk
- Ta bort fallback user stories (kan påverka dokumentation när LLM inte genererar)

---

## Slutsats

**Övergripande:** Det finns betydande möjligheter att förenkla epic-mallarna genom att:
1. Ta bort ~150 rader oanvänd kod
2. Extrahera duplicerad logik
3. Förenkla generiska sektioner

**Rekommendation:** Börja med att ta bort oanvända variabler (låg risk, hög effekt), sedan extrahera duplicerad logik, och slutligen förenkla beroenden och interaktioner.

