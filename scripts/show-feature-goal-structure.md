# Feature Goal Documentation för Internal Data Gathering

## BPMN-fil: mortgage-se-internal-data-gathering.bpmn

### Process-struktur:
- **Start Event**: Event_1iswmjx
- **Service Task**: fetch-party-information (Fetch party information)
- **Business Rule Task**: pre-screen-party (Pre-screen party)
- **Gateway**: is-approved (Approved?)
- **Service Task**: fetch-engagements (Fetch engagements)
- **End Events**: 
  - Event_0rzxyhh (Pre-screening rejected)
  - Event_02y6rvx (Success)

---

## Feature Goal HTML-struktur (baserat på appens logik):

```html
<section class="doc-section">
  <span class="doc-badge">Feature Goal</span>
  <h1>Internal Data Gathering</h1>
  <p class="muted">callActivity i mortgage-se-internal-data-gathering mellan Processstart → Nästa steg.</p>
  <ul>
    <li><strong>BPMN-element:</strong> mortgage-se-internal-data-gathering (callActivity)</li>
    <li><strong>Kreditprocess-steg:</strong> mortgage-se-internal-data-gathering</li>
  </ul>
</section>

<section class="doc-section" data-source-summary="llm">
  <h2>Sammanfattning</h2>
  <p>Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut. Processen omfattar alla typer av kreditansökningar och stödjer bankens kreditstrategi genom att tillhandahålla komplett och kvalitetssäkrad data för riskbedömning.</p>
</section>

<section class="doc-section" data-source-included-tasks="context">
  <h2>Ingående komponenter</h2>
  <p class="muted">Översikt över service tasks, user tasks, call activities och business rules som ingår i detta Feature Goal.</p>
  
  <div style="margin-bottom: 1.5rem;">
    <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Service Tasks (2)</h3>
    <ul style="margin-top: 0;">
      <li><a href="#/doc-viewer/nodes/mortgage-se-internal-data-gathering/fetch-party-information" style="color: #3b82f6; text-decoration: none;">Fetch party information</a> <code style="font-size: 0.875rem; color: #64748b;">(fetch-party-information)</code></li>
      <li><a href="#/doc-viewer/nodes/mortgage-se-internal-data-gathering/fetch-engagements" style="color: #3b82f6; text-decoration: none;">Fetch engagements</a> <code style="font-size: 0.875rem; color: #64748b;">(fetch-engagements)</code></li>
    </ul>
  </div>
  
  <div style="margin-bottom: 1.5rem;">
    <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">Business Rules (1)</h3>
    <ul style="margin-top: 0;">
      <li><a href="#/doc-viewer/nodes/mortgage-se-internal-data-gathering/pre-screen-party" style="color: #3b82f6; text-decoration: none;">Pre-screen party</a> <code style="font-size: 0.875rem; color: #64748b;">(pre-screen-party)</code></li>
    </ul>
  </div>
</section>

<section class="doc-section" data-source-flow="llm">
  <h2>Funktionellt flöde</h2>
  <ol>
    <li>Systemet hämtar partsinformation från interna system baserat på personnummer eller kundnummer</li>
    <li>Systemet utför pre-screening av kunden baserat på grundläggande uppgifter (ålder, bosättning, identitetsverifiering)</li>
    <li>Om pre-screening godkänns, hämtar systemet kundens befintliga engagemang från bankens interna system</li>
    <li>Systemet sammanställer all hämtad data och gör den tillgänglig för efterföljande kreditbedömning</li>
  </ol>
</section>

<section class="doc-section" data-source-dependencies="llm">
  <h2>Beroenden</h2>
  <ul>
    <li>Process: Ansökan måste vara initierad innan intern datainsamling kan starta</li>
    <li>System: Interna kunddatabaser måste vara tillgängliga för att hämta partsinformation</li>
    <li>System: UC-integration (Upplysningscentralen) måste vara tillgänglig för kreditupplysningar</li>
    <li>System: Core System måste vara tillgängligt för att hämta engagemang</li>
  </ul>
</section>

<section class="doc-section" data-source-user-stories="llm">
  <h2>User Stories</h2>
  <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
  
  <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
    <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
      <strong>US-1:</strong> Som <strong>Handläggare</strong> vill jag <strong>Få komplett partsinformation automatiskt</strong> så att <strong>Spara tid genom att inte behöva söka fram partsdata manuellt från olika system</strong>
    </h3>
    <div style="margin-top: 1rem;">
      <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
      <ul style="margin-top: 0;">
        <li>Systemet ska automatiskt hämta partsinformation när ansökan är initierad</li>
        <li>Systemet ska hämta data från alla relevanta interna källor baserat på partstyp</li>
        <li>Systemet ska hantera fel och timeouts på ett kontrollerat sätt med tydliga felmeddelanden</li>
      </ul>
    </div>
    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil länkas via node_test_links</p>
  </div>
  
  <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
    <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
      <strong>US-2:</strong> Som <strong>Kund</strong> vill jag <strong>Få snabb bedömning av min ansökan</strong> så att <strong>Jag kan få svar på min kreditansökan så snabbt som möjligt</strong>
    </h3>
    <div style="margin-top: 1rem;">
      <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
      <ul style="margin-top: 0;">
        <li>Systemet ska slutföra datainsamling inom rimlig tid för att inte fördröja processen</li>
        <li>Systemet ska hantera tillfälliga systemfel med retry-logik för att säkerställa robusthet</li>
        <li>Systemet ska ge tydlig status om datainsamlingens framsteg och resultat</li>
      </ul>
    </div>
    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil länkas via node_test_links</p>
  </div>
  
  <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
    <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
      <strong>US-3:</strong> Som <strong>Processägare</strong> vill jag <strong>Säkerställa att all relevant intern data används i kreditbedömning</strong> så att <strong>Minimera risk genom att alltid ha fullständig bild av kundens engagemang hos banken</strong>
    </h3>
    <div style="margin-top: 1rem;">
      <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
      <ul style="margin-top: 0;">
        <li>Systemet ska hämta alla typer av engagemang som är relevanta för kreditbedömning</li>
        <li>Systemet ska logga alla hämtade engagemang för spårbarhet och revision</li>
        <li>Systemet ska hantera edge cases som kunder med många engagemang eller komplexa produktstrukturer</li>
      </ul>
    </div>
    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil länkas via node_test_links</p>
  </div>
</section>
```

---

## Viktiga punkter:

1. **Header-sektion**: Visar Feature Goal badge, namn, och metadata
2. **Sammanfattning**: 3-5 meningar om syfte och värde (genereras av LLM)
3. **Ingående komponenter**: Automatiskt genererad lista över alla tasks/activities i processen
4. **Funktionellt flöde**: 4-8 steg som beskriver processens flöde (genereras av LLM)
5. **Beroenden**: Process-kontext och tekniska system (genereras av LLM)
6. **User Stories**: 3-6 user stories med acceptanskriterier (genereras av LLM)

Allt utom "Ingående komponenter" genereras av LLM baserat på BPMN-strukturen och kontexten.


