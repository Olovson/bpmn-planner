# Vad Vi Faktiskt Genererar för Feature Goals

## Datum: 2025-12-30

## Sammanfattning

Efter en omfattande analys har vi identifierat att dokumentationen var felaktig och beskriver en gammal version av modellen. Denna dokumentation beskriver vad som **faktiskt** genereras för Feature Goals i systemet.

---

## Faktisk Modell (`FeatureGoalDocModel`)

```typescript
export interface FeatureGoalDocModel {
  summary: string;                    // REQUIRED - 3-5 meningar
  flowSteps: string[];                 // REQUIRED - 4-8 steg
  dependencies?: string[];              // OPTIONAL - 3-6 beroenden
  userStories: Array<{                 // REQUIRED - 3-6 user stories
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];       // 2-4 kriterier per story
  }>;
}
```

---

## Vad Som Genereras

### 1. Summary (Sammanfattning) - REQUIRED

**Vad det är:**
- 3-5 meningar som beskriver Feature Goalets syfte och värde
- Placering i kreditprocessen
- Vilka kunder/segment som omfattas
- Hur det stödjer bankens strategi

**Exempel:**
> "Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut. Processen omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom att tillhandahålla komplett och kvalitetssäkrad data för riskbedömning."

**Renderas som:** Paragraf i sektion "Sammanfattning"

---

### 2. Ingående komponenter (Automatiskt genererad sektion)

**Vad det är:**
- En översiktlig lista över alla service tasks, user tasks, call activities och business rules som ingår i Feature Goalet
- Genereras automatiskt från BPMN-strukturen (ingen LLM-generering)
- Visar bara namn och ID för varje komponent (inga detaljer för att undvika duplicering)

**Exempel:**
- Service Tasks (3)
  - Fetch party information (fetch-party-information)
  - Pre-screen party (pre-screen-party)
  - Fetch engagements (fetch-engagements)
- User Tasks (1)
  - Confirm application (confirm-application)

**Renderas som:** Lista med grupperade tasks per typ i sektion "Ingående komponenter"

---

### 3. FlowSteps (Funktionellt flöde) - REQUIRED

**Vad det är:**
- 4-8 steg som beskriver processens flöde
- Varje steg är en full mening
- Beskriver kundens/handläggarens handlingar och systemets respons

**Exempel:**
1. "Processen startar när en kreditansökan har registrerats i systemet."
2. "Systemet initierar automatiskt insamling av intern kund- och engagemangsdata från relevanta källor."
3. "Den insamlade datan kvalitetssäkras och valideras mot förväntade format och regler."
4. "Data berikas med metadata och flaggor som är relevanta för kreditbedömning."
5. "Resultaten görs tillgängliga för efterföljande steg i kreditprocessen."

**Renderas som:** Numrerad lista (`<ol>`) i sektion "Funktionellt flöde"

---

### 4. Dependencies (Beroenden) - OPTIONAL

**Vad det är:**
- 3-6 beroenden i exakt format: `"Beroende: <typ>; Id: <namn>; Beskrivning: <förklaring>."`
- Inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra)

**Exempel:**
- `"Beroende: Process; Id: application; Beskrivning: En kreditansökan måste ha registrerats i systemet med grundläggande kund- och ansökningsdata validerade."`
- `"Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik."`
- `"Beroende: Regelmotor; Id: data-validation-rules; Beskrivning: används för att validera och kvalitetssäkra insamlad data."`

**Renderas som:** Lista (`<ul>`) i sektion "Beroenden" (endast om dependencies finns)

---

### 5. User Stories (User Stories) - REQUIRED

**Vad det är:**
- 3-6 user stories med format: "Som [roll] vill jag [mål] så att [värde]"
- Varje user story har 2-4 acceptanskriterier
- Roller: "Kund", "Handläggare" eller "Processägare" (ALDRIG "System")

**Exempel:**
```json
{
  "id": "US-1",
  "role": "Kreditevaluator",
  "goal": "Få tillgång till komplett intern kunddata för kreditbedömning",
  "value": "Kunna fatta välgrundade kreditbeslut baserat på komplett information",
  "acceptanceCriteria": [
    "Systemet ska automatiskt samla in intern kund- och engagemangsdata från relevanta källor",
    "Systemet ska kvalitetssäkra och validera insamlad data mot förväntade format",
    "Systemet ska göra data tillgänglig för efterföljande steg i kreditprocessen"
  ]
}
```

**Renderas som:** Kort med user story-information i sektion "User Stories" (alltid synlig, visar varning om tom)

---

## Vad Som INTE Genereras (Men Fanns i Gammal Dokumentation)

Följande fält fanns i den gamla dokumentationen men genereras **INTE** längre:

1. ❌ **`effectGoals`** - 3-5 strängar om effektmål
2. ❌ **`scopeIncluded`** - 4-7 strängar om omfattning
3. ❌ **`scopeExcluded`** - 2-3 strängar om avgränsningar
4. ❌ **`epics`** - 2-5 objekt om ingående epics
5. ❌ **`relatedItems`** - 2-4 strängar om relaterade items

**Anledning:** Modellen har förenklats för att fokusera på kärnfunktionalitet. Dessa fält kan eventuellt läggas till i framtiden om de behövs.

---

## HTML-struktur

När Feature Goal-dokumentationen renderas, får den följande struktur:

```html
<section class="doc-section">
  <span class="doc-badge">Feature Goal</span>
  <h1>[Feature Goal-namn]</h1>
  <p class="muted">[Metadata]</p>
</section>

<section class="doc-section" data-source-summary="llm">
  <h2>Sammanfattning</h2>
  <p>[Summary-text]</p>
</section>

<section class="doc-section" data-source-flow="llm">
  <h2>Funktionellt flöde</h2>
  <ol>
    <li>[Flow step 1]</li>
    <li>[Flow step 2]</li>
    ...
  </ol>
</section>

<section class="doc-section" data-source-dependencies="llm">
  <h2>Beroenden</h2>
  <ul>
    <li>[Dependency 1]</li>
    <li>[Dependency 2]</li>
    ...
  </ul>
</section>

<section class="doc-section" data-source-user-stories="llm">
  <h2>User Stories</h2>
  <div class="user-story">
    <h3>[US-1]: Som [Roll] vill jag [Mål] så att [Värde]</h3>
    <div>
      <p>Acceptanskriterier:</p>
      <ul>
        <li>[Criterion 1]</li>
        <li>[Criterion 2]</li>
        ...
      </ul>
    </div>
  </div>
  ...
</section>
```

---

## Validering

Systemet validerar att:
- ✅ `summary` är en icke-tom sträng
- ✅ `flowSteps` är en array med minst 1 element
- ✅ `userStories` är en array med minst 1 element
- ✅ Varje user story har alla required fields (id, role, goal, value, acceptanceCriteria)
- ✅ `dependencies` är antingen undefined eller en array (om det finns, måste varje element följa exakt format)

**Warnings genereras om:**
- ⚠️ `flowSteps` är tom
- ⚠️ `userStories` är tom
- ⚠️ `dependencies` saknar process-kontext dependencies

---

## Slutsats

**Vad vi faktiskt genererar:**
1. ✅ **Summary** - Sammanfattning (required, LLM-genererad)
2. ✅ **Ingående komponenter** - Översiktlig lista över tasks/activities (automatisk, från BPMN)
3. ✅ **FlowSteps** - Funktionellt flöde (required, LLM-genererad)
4. ✅ **Dependencies** - Beroenden (optional, LLM-genererad)
5. ✅ **User Stories** - User stories med acceptanskriterier (required, LLM-genererad)

**Total:** 5 sektioner (4 LLM-genererade, 1 automatisk från BPMN)

**Vad vi INTE genererar längre:**
- ❌ effectGoals
- ❌ scopeIncluded
- ❌ scopeExcluded
- ❌ epics
- ❌ relatedItems

Modellen är nu enkel och fokuserad på kärnfunktionalitet.

