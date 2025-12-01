# Prompt för att återuppta Epic Documentation Improvements

## Använd denna prompt om jag kraschar:

```
Läs docs/EPIC_IMPROVEMENT_STATUS.md för att se exakt status på alla epics.

Fortsätt systematiskt med förbättringarna enligt prioriteringen i statusfilen.

Nästa steg enligt statusfilen:
1. assess-stakeholder (epic #7) - Lägg till DMN Decision Table, Regelträd / Decision Tree, och Tröskelvärden tabell i "Affärsregler & Beroenden" sektionen.
2. Sedan fortsätt med fetch-party-information (epic #4) - Lägg till Mermaid-stöd, C4 System Context Diagram, Komponentdiagram, och Sekvensdiagram.

För varje epic:
1. Läs statusfilen för att se exakt vad som behöver göras
2. Lägg till Mermaid-stöd om det saknas (script + CSS i <head>)
3. Lägg till relevanta diagram enligt checklistan
4. Uppdatera statusfilen när du är klar med varje epic
5. Fortsätt till nästa epic i listan

Viktigt:
- Använd endast faktisk information från dokumentationen
- Håll diagrammen enkla och läsbara
- Se till att Mermaid-syntaxen är korrekt
- Uppdatera statusfilen efter varje klar epic

Börja med assess-stakeholder och visa mig resultatet innan du fortsätter.
```

---

## Alternativ prompt för specifik epic:

Om du vill hoppa till en specifik epic:

```
Läs docs/EPIC_IMPROVEMENT_STATUS.md.

Förbättra [EPIC-NAMN] (epic #[NUMMER]) enligt checklistan i statusfilen.

Exempel:
"Förbättra assess-stakeholder (epic #7) enligt checklistan i statusfilen."
"Förbättra fetch-party-information (epic #4) enligt checklistan i statusfilen."

För varje förbättring:
1. Kontrollera vad som redan finns i filen
2. Lägg till saknade komponenter enligt checklistan
3. Uppdatera statusfilen när du är klar
4. Visa mig resultatet
```

---

## Snabbstart-kommando:

```
Läs docs/EPIC_IMPROVEMENT_STATUS.md och fortsätt med nästa epic i prioriteringslistan. Uppdatera statusfilen när du är klar.
```

---

## Template för Mermaid-stöd:

Om en epic saknar Mermaid-stöd, lägg till detta i `<head>` sektionen (efter `.llm-fallback-local-note`):

```html
.mermaid {
  margin: 16px 0;
  text-align: center;
}
details {
  margin: 12px 0;
}
details summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--primary);
  padding: 8px;
  background: var(--accent);
  border-radius: 4px;
}
details summary:hover {
  background: #bfdbfe;
}
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
```

---

## Checklista för varje epic:

För ServiceTask:
- [ ] Mermaid-stöd (om saknas)
- [ ] C4 System Context Diagram
- [ ] Komponentdiagram
- [ ] Sekvensdiagram
- [ ] Data Flow Diagram (om relevant)

För BusinessRuleTask:
- [ ] Mermaid-stöd (om saknas)
- [ ] DMN Decision Table
- [ ] Regelträd / Decision Tree
- [ ] Tröskelvärden tabell
- [ ] C4 System Context Diagram
- [ ] Sekvensdiagram
- [ ] Komponentdiagram

För UserTask:
- [ ] Mermaid-stöd (om saknas)
- [ ] User Journey Map
- [ ] Interaktionsflöde
- [ ] Process Flow Diagram
- [ ] Data Flow Diagram (om relevant)

---

## Tips:

1. **Kontrollera först** - Läs filen för att se vad som redan finns
2. **Uppdatera status** - Markera klara epics i statusfilen
3. **Testa diagram** - Se till att Mermaid-syntaxen är korrekt
4. **Var konsekvent** - Använd samma struktur som i redan klara epics

