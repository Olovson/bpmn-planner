# Fullständig BPMN-analys: Appeal Feature Goal

## BPMN-filer som påverkar Appeal-dokumentationen:

### 1. mortgage-se-appeal.bpmn (själva Appeal-processen)
**Aktiviteter:**
- Start Event (Event_0ssbeto)
- User Task: Submit appeal (submit-appeal) - Stakeholder lane
- User Task: Screen appeal (screen-appeal) - Caseworker lane
- Exclusive Gateway: Screening accepted? (screening-accepted)
- Exclusive Gateway: Gateway_1v59ktc (namnlös, hanterar loop)
- End Event: Event_1pzbohb (när screening accepteras - går vidare)
- Boundary Event: event-appeal-timeout (Timer: P30D på submit-appeal)
- End Event: appeal-timeout (med escalation "appeal-timeout")

**Events/Escalations:**
- Escalation: appeal-timeout (Escalation_34epnhh)
- Message: event-appeal-requested (Message_3g9un62) - definierad

### 2. mortgage.bpmn (huvudprocessen som anropar Appeal)
**Appeal call activity:**
- ID: appeal
- Incoming: Flow_0b4xof6 (från Gateway_0f1a2lu)
- Outgoing: Flow_105pnkf (går till Gateway_1qiy2jr)
- Gateway_1qiy2jr går sedan till manual-credit-evaluation

**Flöde i mortgage.bpmn:**
- is-automatically-rejected (gateway) → Yes → Gateway_0f1a2lu → Appeal
- Appeal → Gateway_1qiy2jr → Manual credit evaluation
- Manual credit evaluation kan trigga "Automatically rejected" → Gateway_0f1a2lu → Appeal (loop)

**Boundary Event på Appeal call activity:**
- event-appeal-timeout (boundary event på Appeal call activity i mortgage.bpmn)
- Escalation: appeal-timeout (Escalation_0b3ql7g)
- Går till: application-automatically-rejected end event

**Viktigt:** Det finns TVÅ olika timeout-mekanismer:
1. Timeout i Appeal-processen själv (30 dagar på submit-appeal user task)
2. Timeout på Appeal call activity i mortgage.bpmn (boundary event)

### 3. mortgage-se-manual-credit-evaluation.bpmn (processen Appeal går vidare till)
**Beroende:**
- Appeal går vidare till Manual credit evaluation när screening accepteras
- Manual credit evaluation kan trigga "Automatically rejected" escalation (Escalation_3ron523)
- Denna escalation går tillbaka till Gateway_0f1a2lu som kan gå tillbaka till Appeal

## Jämförelse med HTML-dokumentation (local--Appeal-v2.html):

### ✅ Vad som redan dokumenteras korrekt:
- Submit appeal (user task)
- Screen appeal (user task)
- Screening accepted? (gateway)
- Timeout (30 dagar) - men bara en timeout nämns
- Loop-mekanism
- Beroende till Manual credit evaluation

### ⚠️ Vad som saknas eller kan förbättras:

1. **Gateway_1v59ktc** - Namnlös gateway i Appeal-processen
   - Hanterar loop när screening avvisas
   - Saknas i dokumentationen
   - Bör nämnas i "Omfattning"

2. **Dubbel timeout-mekanism** - TVÅ olika timeout-hanteringar:
   - **Timeout i Appeal-processen:** 30 dagar på submit-appeal user task → appeal-timeout end event
   - **Timeout på Appeal call activity:** Boundary event i mortgage.bpmn → application-automatically-rejected
   - Bör förtydligas i "Processteg - Output" och "Beroenden"

3. **Flödesbeskrivning i mortgage.bpmn** - Kan förtydligas:
   - Appeal anropas när is-automatically-rejected = Yes
   - Appeal går via Gateway_1qiy2jr till Manual credit evaluation
   - Manual credit evaluation kan trigga "Automatically rejected" som går tillbaka till Appeal
   - Bör förtydligas i "Processteg - Input" och "Beroenden"

4. **Message Event** - event-appeal-requested
   - Definierad men används inte direkt i processen
   - Kan vara relevant för event-driven arkitektur
   - Bör nämnas i "Beroenden" om det används

5. **Escalation Events** - Fler escalation events:
   - appeal-timeout (både i Appeal-processen och mortgage.bpmn)
   - application-rejected (definierad men används inte direkt)
   - credit-evaluation-automatically-rejected (från Manual credit evaluation)
   - Bör förtydligas i "Beroenden"

6. **Lanes** - Stakeholder och Caseworker lanes
   - Vilka aktiviteter tillhör vilken lane kan förtydligas
   - Submit appeal = Stakeholder lane
   - Screen appeal = Caseworker lane

## Rekommenderade förbättringar:

1. **Uppdatera "Omfattning":**
   - Lägg till Gateway_1v59ktc (loop-gateway)

2. **Uppdatera "Processteg - Input":**
   - Förtydliga att Appeal anropas när is-automatically-rejected = Yes
   - Nämn Gateway_0f1a2lu som entry point

3. **Uppdatera "Processteg - Output":**
   - Förtydliga de två olika timeout-mekanismerna
   - Förtydliga flödet till Manual credit evaluation via Gateway_1qiy2jr

4. **Uppdatera "Beroenden":**
   - Lägg till information om boundary event i mortgage.bpmn
   - Förtydliga escalation events
   - Förtydliga loop-mekanismen med Manual credit evaluation

5. **Uppdatera "BPMN - Process":**
   - Förtydliga lanes och vilka aktiviteter som tillhör vilken lane
   - Förtydliga flödet med både gatewayer

