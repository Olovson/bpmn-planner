# Analys: Förbättringsmöjligheter för feature_epic_prompt.md

## Syfte
Göra en grundlig analys av `prompts/llm/feature_epic_prompt.md` för att identifiera förbättringsmöjligheter som kan öka kvaliteten och konsistensen i genererad dokumentation.

---

## 1. Kontextanvändning - Förbättringspotential

### Nuvarande Situation
- Prompten nämner inte explicit hur `processContext` och `currentNodeContext` ska användas
- `processContext.phase` och `processContext.lane` nämns i `PROMPT_CONTRACT.md` men inte i själva prompten
- `childrenDocumentation` finns i kontexten men prompten instruerar inte hur den ska användas

### Problem
- LLM vet inte att den ska använda `phase` och `lane` för att placera noden i rätt kontext
- LLM vet inte hur den ska använda `childrenDocumentation` när den genererar Feature Goals
- Risk för att LLM hittar på egna faser/roller istället för att använda de som finns i kontexten

### Förslag på Förbättring
```markdown
**Använd kontextinformation:**
- Använd `processContext.phase` (t.ex. "Ansökan", "Datainsamling", "Riskbedömning", "Beslut") för att placera noden i rätt fas i kreditprocessen
- Använd `processContext.lane` (t.ex. "Kund", "Handläggare", "Regelmotor") för att förstå vilken roll som är involverad
- Låt `summary`, `flowSteps`, `effectGoals` spegla denna fas/roll
- **Hitta INTE på** egna faser/roller eller system utanför det som går att härleda från `processContext` och `currentNodeContext`
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att förstå vad child nodes gör när du genererar Feature Goal-dokumentation
```

---

## 2. Tydlighet om Obligatoriska vs Valfria Fält

### Nuvarande Situation
- `interactions` är markerat som "OPCIONAL" för Epic
- Andra fält är inte explicit markerade som obligatoriska eller valfria
- LLM kan vara osäker på om den ska inkludera alla fält eller bara vissa

### Problem
- LLM kan utelämna viktiga fält om det inte är tydligt att de är obligatoriska
- LLM kan inkludera valfria fält när de inte är relevanta

### Förslag på Förbättring
```markdown
**Obligatoriska fält (måste alltid inkluderas):**
- Feature Goal: summary, effectGoals, scopeIncluded, scopeExcluded, flowSteps, dependencies, implementationNotes, relatedItems
- Epic: summary, prerequisites, flowSteps, userStories, implementationNotes

**Valfria fält (inkludera endast om relevant):**
- Feature Goal: epics (inkludera endast om det finns epics i Feature Goalet)
- Epic: interactions (inkludera endast för User Tasks, kan utelämnas för Service Tasks)
```

---

## 3. Tydlighet om Längd och Detaljnivå

### Nuvarande Situation
- Vissa fält har intervall (t.ex. "3–5 strängar", "4–8 strängar")
- Det är inte alltid tydligt när man ska använda kortare vs längre versioner
- Det är inte tydligt om längden ska baseras på komplexitet eller något annat

### Problem
- LLM kan generera för korta eller för långa listor utan tydlig vägledning
- Konsistens mellan olika noder kan saknas

### Förslag på Förbättring
```markdown
**Riktlinjer för längd:**
- Använd längre listor (övre delen av intervallet) för komplexa noder med många child nodes eller många steg
- Använd kortare listor (nedre delen av intervallet) för enkla noder med få child nodes eller få steg
- Var konsekvent: om en Feature Goal har många epics, använd längre listor för effectGoals och flowSteps också
- Om en Epic har många prerequisites, använd längre listor för flowSteps också
```

---

## 4. Tydlighet om Format och Struktur

### Nuvarande Situation
- Vissa fält har specifika format (t.ex. dependencies: "Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>.")
- Formatet är tydligt för dependencies men inte lika tydligt för andra fält
- Exempel finns men de är inte alltid tillräckliga

### Problem
- LLM kan använda inkonsekvent format mellan olika noder
- LLM kan missförstå formatet och skapa felaktiga strukturer

### Förslag på Förbättring
```markdown
**Formatkrav:**
- Dependencies: Använd EXAKT formatet "Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."
- ScopeIncluded/ScopeExcluded: Varje element ska vara en full mening, börja med "Ingår:" eller "Ingår inte:" om det är naturligt
- FlowSteps: Varje element ska vara en full mening som beskriver ett steg i flödet
- EffectGoals: Varje element ska vara en full mening som beskriver ett konkret effektmål
```

---

## 5. Användning av childrenDocumentation

### Nuvarande Situation
- `childrenDocumentation` finns i `currentNodeContext` när den genereras för Feature Goals
- Prompten instruerar inte hur den ska användas
- LLM vet inte att den ska använda denna information för att skapa bättre Feature Goal-dokumentation

### Problem
- LLM kan ignorera `childrenDocumentation` även om den finns
- Feature Goal-dokumentation kan bli generisk istället för att reflektera vad child nodes faktiskt gör

### Förslag på Förbättring
```markdown
**Använd childrenDocumentation när den finns:**
- Om `currentNodeContext.childrenDocumentation` finns (för Feature Goals), använd den för att:
  - Förstå vad child nodes/epics gör när du skriver `summary` och `effectGoals`
  - Skapa mer precisa `flowSteps` som reflekterar det faktiska flödet genom child nodes
  - Identifiera `dependencies` baserat på vad child nodes behöver
  - Skapa mer relevanta `relatedItems` baserat på child nodes
- Referera INTE direkt till child node-namn i texten, men använd deras funktionalitet för att skapa bättre dokumentation
```

---

## 6. Tydlighet om Affärsspråk - Ytterligare Förtydligande

### Nuvarande Situation
- Generell instruktion om affärsspråk finns
- Specifika exempel finns för flowSteps
- Men det kan vara mer tydligt för andra fält också

### Problem
- LLM kan fortfarande använda teknisk terminologi i vissa fält även om instruktioner finns
- Exempel finns främst för flowSteps, inte för andra fält

### Förslag på Förbättring
```markdown
**Exempel på affärsspråk för olika fält:**

**Summary (Feature Goal):**
- ✅ Bra: "Feature Goalet möjliggör automatisk datainsamling från externa källor för att påskynda kreditbedömningen."
- ❌ Dåligt: "Feature Goalet innehåller callActivities som anropar ServiceTasks för att hämta data från externa system."

**EffectGoals:**
- ✅ Bra: "Minskar manuellt arbete genom automatisering av datainsamling."
- ❌ Dåligt: "Automatiserar API-anrop till externa system."

**Dependencies:**
- ✅ Bra: "Beroende: Regelmotor; Id: kreditvärdighetsbedömning; Beskrivning: används för att fatta preliminära och slutliga kreditbeslut."
- ❌ Dåligt: "Beroende: DMN-engine; Id: credit-evaluation-dmn; Beskrivning: DMN-motorn körs för att evaluera kredit."
```

---

## 7. Tydlighet om Edge Cases

### Nuvarande Situation
- Prompten nämner inte vad som ska hända om vissa fält saknas eller är tomma
- Det är inte tydligt vad som ska hända om en nod har inga children eller inga siblings

### Problem
- LLM kan bli osäker på hur den ska hantera edge cases
- LLM kan hitta på information när den inte borde

### Förslag på Förbättring
```markdown
**Hantering av Edge Cases:**
- Om en nod har inga children: Använd tom array `[]` för `epics` (Feature Goal) eller `childrenDocumentation` (om relevant)
- Om en nod har inga siblings: Det är okej, dokumentera noden som om den är den enda i sin kontext
- Om `processContext.phase` eller `processContext.lane` saknas: Använd generiska termer som "processen" eller "systemet" istället för att hitta på specifika faser/roller
- Om `childrenDocumentation` saknas: Generera dokumentation baserat på nodens namn, typ och kontext, utan att referera till child nodes
```

---

## 8. Konsistens mellan Feature och Epic

### Nuvarande Situation
- Vissa instruktioner upprepas för både Feature och Epic (t.ex. affärsspråk)
- Vissa instruktioner är specifika för en typ (t.ex. flowSteps har olika instruktioner)

### Problem
- Upprepning kan göra prompten längre än nödvändigt
- Men det kan också vara bra för tydlighet

### Bedömning
- Upprepning är okej eftersom det gör prompten tydligare
- Men vi kan förbättra genom att ha en tydlig "Gemensamma regler"-sektion som refereras från båda typerna

---

## 9. Tydlighet om User Stories

### Nuvarande Situation
- User Stories har tydliga instruktioner
- Men det kan vara mer tydligt om när man ska använda olika roller
- Det kan vara mer tydligt om acceptanskriterier ska vara tekniska eller affärsnära

### Problem
- LLM kan använda fel roller (t.ex. "System" för User Tasks)
- LLM kan skriva tekniska acceptanskriterier istället för affärsnära

### Förslag på Förbättring
```markdown
**User Stories - Ytterligare vägledning:**
- För User Tasks: Använd roller som "Kund", "Handläggare", "Administratör" - INTE "System"
- För Service Tasks: Använd roller som "Handläggare", "Systemadministratör", "Processägare" - fokusera på vem som drar nytta
- Acceptanskriterier ska vara affärsnära och testbara, INTE tekniska implementationdetaljer
- Exempel på bra acceptanskriterium: "Systemet ska validera att alla obligatoriska fält är ifyllda innan formuläret kan skickas"
- Exempel på dåligt acceptanskriterium: "ServiceTask ska anropa validateForm API-endpoint"
```

---

## 10. Tydlighet om Implementation Notes

### Nuvarande Situation
- Implementation Notes har instruktioner om vad som ska inkluderas
- Men det är inte tydligt om de ska vara tekniska eller affärsnära
- Det är inte tydligt om de ska vara detaljerade eller på hög nivå

### Problem
- LLM kan skriva för tekniska implementation notes
- LLM kan skriva för detaljerade eller för generiska implementation notes

### Förslag på Förbättring
```markdown
**Implementation Notes - Ytterligare vägledning:**
- Skriv på hög nivå, fokusera på principer och mönster, INTE specifika implementationdetaljer
- Använd affärsspråk där möjligt, men tekniska termer är okej när de är nödvändiga (t.ex. "API", "loggning", "audit-spår")
- Fokusera på VAD som behöver implementeras, INTE HUR det ska implementeras
- Exempel på bra: "Systemet behöver logga alla kreditbeslut för spårbarhet och regelefterlevnad."
- Exempel på dåligt: "Implementera en ServiceTask som anropar audit-service med POST-request till /api/audit/log."
```

---

## 11. Tydlighet om Related Items

### Nuvarande Situation
- Related Items har instruktioner om vad som ska inkluderas
- Men det är inte tydligt hur man identifierar relaterade items
- Det är inte tydligt om man ska använda kontextinformation (t.ex. siblings, parents) för att identifiera relaterade items

### Problem
- LLM kan hitta på relaterade items istället för att använda kontextinformation
- LLM kan missa viktiga relaterade items som finns i kontexten

### Förslag på Förbättring
```markdown
**Related Items - Ytterligare vägledning:**
- Använd `currentNodeContext.siblings` för att identifiera relaterade epics i samma Feature Goal
- Använd `currentNodeContext.parents` för att identifiera relaterade Feature Goals eller processer
- Använd `currentNodeContext.hierarchy.trail` för att förstå sammanhanget
- Beskriv relaterade items på beskrivningsnivå, INTE med hårdkodade IDs eller filpaths
- Exempel på bra: "Relaterad Feature Goal: Intern datainsamling (hanterar datainsamling från interna källor)"
- Exempel på dåligt: "Relaterad Feature Goal: internal-data-gathering.bpmn"
```

---

## 12. Sammanfattning av Förbättringsförslag

### Högsta Prioritet
1. **Lägg till instruktioner om kontextanvändning** - Hur ska `processContext` och `currentNodeContext` användas?
2. **Lägg till instruktioner om childrenDocumentation** - Hur ska den användas när den finns?
3. **Förtydliga obligatoriska vs valfria fält** - Vad måste alltid inkluderas?

### Medel Prioritet
4. **Förtydliga längd och detaljnivå** - När ska man använda kortare vs längre listor?
5. **Förtydliga format och struktur** - Vad är exakta formatkrav?
6. **Lägg till fler exempel på affärsspråk** - För alla fält, inte bara flowSteps

### Lägre Prioritet
7. **Förtydliga edge cases** - Vad händer om vissa fält saknas?
8. **Förtydliga User Stories** - När ska man använda olika roller?
9. **Förtydliga Implementation Notes** - Tekniska vs affärsnära, detaljnivå
10. **Förtydliga Related Items** - Hur identifierar man relaterade items?

---

## 13. Rekommenderad Implementeringsordning

1. **Först**: Lägg till sektion om kontextanvändning (högsta prioritet)
2. **Sedan**: Lägg till sektion om childrenDocumentation (högsta prioritet)
3. **Sedan**: Förtydliga obligatoriska vs valfria fält (högsta prioritet)
4. **Sedan**: Lägg till fler exempel på affärsspråk för alla fält (medel prioritet)
5. **Slutligen**: Förtydliga övriga områden (lägre prioritet)

---

## 14. Exempel på Förbättrad Prompt-Struktur

```markdown
## Använd Kontextinformation

När du genererar dokumentation, använd följande kontextinformation:

**processContext:**
- `processContext.phase`: Använd för att placera noden i rätt fas (t.ex. "Ansökan", "Datainsamling", "Riskbedömning", "Beslut")
- `processContext.lane`: Använd för att förstå vilken roll som är involverad (t.ex. "Kund", "Handläggare", "Regelmotor")
- `processContext.keyNodes`: Använd för att förstå processens struktur och viktiga noder

**currentNodeContext:**
- `currentNodeContext.hierarchy`: Använd för att förstå nodens position i hierarkin
- `currentNodeContext.parents`, `siblings`, `children`: Använd för att förstå nodens relationer
- `currentNodeContext.childrenDocumentation`: Om den finns (för Feature Goals), använd den för att förstå vad child nodes gör
- `currentNodeContext.flows`: Använd för att förstå flödet in och ut från noden
- `currentNodeContext.documentation`: Använd befintlig dokumentation från BPMN om den finns

**Viktigt:**
- Hitta INTE på egna faser/roller eller system utanför det som går att härleda från kontexten
- Om information saknas i kontexten, använd generiska termer istället för att hitta på specifika detaljer
```

---

## 15. Nästa Steg

1. Granska denna analys med teamet
2. Prioritera förbättringar baserat på vad som ger störst värde
3. Implementera förbättringar stegvis
4. Testa förbättringar med faktiska BPMN-filer
5. Iterera baserat på resultat
