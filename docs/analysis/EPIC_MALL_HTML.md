# Epic Mall - HTML Template

## Översikt
Epic-mallen renderas av funktionen `buildEpicDocHtmlFromModel()` i `documentationTemplates.ts` (rad 1840-2038).

## Mallstruktur

### 1. Header-sektion
```html
<section class="doc-section">
  <span class="doc-badge">Epic</span>
  <h1>{nodeName}</h1>
  <p class="muted">{node.type} i {processStep} mellan {upstreamName} → {downstreamName}.</p>
  <ul>
    <li><strong>BPMN-element:</strong> {bpmnElementId} ({type})</li>
    <li><strong>Kreditprocess-steg:</strong> {processStep}</li>
    <li><strong>Swimlane/ägare:</strong> {swimlaneOwner}</li>
    <li><strong>Version & datum:</strong> {versionLabel}</li>
  </ul>
</section>
```

### 2. Sammanfattning
```html
<section class="doc-section" data-source-summary="{summarySource}">
  <h2>Sammanfattning</h2>
  <p>{summaryText}</p>
</section>
```
- **Källa**: `model.summary` (från LLM eller fallback)
- **Fallback**: Generisk text baserad på node-namn

### 3. Förutsättningar
```html
<section class="doc-section" data-source-prerequisites="{prerequisitesSource}">
  <h2>Förutsättningar</h2>
  {renderList(prerequisites)}
</section>
```
- **Källa**: `model.prerequisites` (required field)
- **Fallback**: Generiska förutsättningar baserat på previousNode

### 4. Funktionellt flöde
```html
<section class="doc-section" data-source-flow="{flowStepsSource}">
  <h2>Funktionellt flöde</h2>
  <ol>
    {flowSteps.map(step => `<li>${step}</li>`).join('')}
  </ol>
</section>
```
- **Källa**: `model.flowSteps` (required field)
- **Fallback**: Olika beroende på om det är UserTask eller ServiceTask

### 5. Interaktioner (Optional)
```html
{interactions && interactions.length > 0 ? `
<section class="doc-section" data-source-interactions="{interactionsSource}">
  <h2>Interaktioner</h2>
  {renderList(interactions)}
</section>
` : ''}
```
- **Källa**: `model.interactions` (optional field)
- **Fallback**: Olika beroende på om det är UserTask eller ServiceTask
- **Visas endast**: Om interactions finns och har innehåll

### 6. Beroenden
```html
<section class="doc-section" data-source-dependencies="{dependenciesSource}">
  <h2>Beroenden</h2>
  {renderList(dependencies)}
</section>
```
- **Källa**: `model.dependencies` (optional field)
- **Fallback**: Generiska beroenden (kreditmotor, integrationer, etc.)

### 7. User Stories
```html
<section class="doc-section" data-source-user-stories="{userStoriesSource}">
  <h2>User Stories</h2>
  <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
  {userStories.map(story => `
    <div class="user-story" style="margin-bottom: 2rem; padding: 1rem; border-left: 3px solid #3b82f6; background: #f8fafc;">
      <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
        <strong>${story.id}:</strong> Som <strong>${story.role}</strong> vill jag <strong>${story.goal}</strong> så att <strong>${story.value}</strong>
      </h3>
      <div style="margin-top: 1rem;">
        <p style="margin-bottom: 0.5rem; font-weight: 600;">Acceptanskriterier:</p>
        <ul style="margin-top: 0;">
          {story.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}
        </ul>
      </div>
      {testLink ? `<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">Testfil: <code>${testLink}</code></p>` : ''}
    </div>
  `).join('')}
</section>
```
- **Källa**: `model.userStories` (required field, 3-6 user stories)
- **Fallback**: En generisk user story baserad på om det är UserTask eller ServiceTask
- **Struktur**: Varje user story har id, role, goal, value, och acceptanceCriteria

### 8. Implementation Notes
```html
<section class="doc-section" data-source-implementation-notes="{implementationNotesSource}">
  <h2>Implementation Notes</h2>
  {renderList(implementationNotes)}
</section>
```
- **Källa**: `model.implementationNotes` (required field)
- **Fallback**: Generiska implementation notes (API:er, logging, edge-cases, etc.)

## Data-källor

Varje sektion har en `data-source-*` attribut som indikerar om innehållet kommer från:
- `"llm"` - Genererat av Claude/LLM
- `"fallback"` - Fallback-värde från base model

## Fallback-värden

### UserTask fallback:
- **flowSteps**: Kunden öppnar sidan → Systemet visar formulär → Kunden fyller i → Systemet validerar
- **interactions**: Kanal: web/app, UI ska vara förklarande, Felmeddelanden ska vara begripliga

### ServiceTask fallback:
- **flowSteps**: Systemet startar automatiskt → Hämtar information → Validerar → Sparar resultat
- **interactions**: Primära API:er, Hantera timeouts/fel, Deterministisk respons

## Renderingsflöde

1. **Base model** byggs från context (`buildEpicDocModelFromContext`)
2. **Overrides** appliceras (om de finns i `src/data/node-docs/epic/`)
3. **LLM patch** appliceras (om `llmContent` finns från Claude)
4. **Validering** av modellen
5. **HTML rendering** via `buildEpicDocHtmlFromModel()`
6. **Wrap** i fullständigt HTML-dokument via `wrapDocument()`

## Exempel på genererad HTML

```html
<section class="doc-section">
  <span class="doc-badge">Epic</span>
  <h1>Granska ansökan</h1>
  <p class="muted">userTask i mortgage-application mellan Ansökan → Kreditbedömning.</p>
  <ul>
    <li><strong>BPMN-element:</strong> review-application (userTask)</li>
    <li><strong>Kreditprocess-steg:</strong> mortgage-application</li>
    <li><strong>Swimlane/ägare:</strong> Handläggare</li>
    <li><strong>Version & datum:</strong> 1.0 (exempel) – uppdateras vid ändring</li>
  </ul>
</section>

<section class="doc-section" data-source-summary="llm">
  <h2>Sammanfattning</h2>
  <p>Granska ansökan är ett delsteg i kreditflödet som säkerställer att rätt data, regler och interaktioner hanteras innan processen går vidare.</p>
</section>

<section class="doc-section" data-source-prerequisites="llm">
  <h2>Förutsättningar</h2>
  <ul>
    <li>Triggas normalt efter <strong>Ansökan</strong>.</li>
    <li>Förutsätter att grundläggande kund- och ansökningsdata är validerade.</li>
    <li>Eventuella föregående KYC/AML- och identitetskontroller ska vara godkända.</li>
  </ul>
</section>

<!-- ... resten av sektionerna ... -->
```

