# Feature Goal Mall - HTML Template

## Översikt
Feature Goal-mallen finns i två versioner:
- **V1**: `buildFeatureGoalDocHtmlFromModel()` (rad 527-754)
- **V2**: `buildFeatureGoalDocHtmlFromModelV2()` (rad 760-918)

V2 är standard och används när `templateVersion = 'v2'` (default).

---

## V1 Mall - Struktur

### 1. Header-sektion
```html
<section class="doc-section">
  <span class="doc-badge">Feature Goal</span>
  <h1>{nodeName}</h1>
  <ul>
    <li><strong>Initiativ:</strong> {initiative}</li>
    <li><strong>BPMN Call Activity:</strong> {bpmnElementId} ({nodeName})</li>
    <li><strong>Regel/affärsägare:</strong> {owner}</li>
    <li><strong>Kreditprocess-steg:</strong> {initiative}</li>
    <li><strong>Version / datum:</strong> {versionLabel}</li>
  </ul>
</section>
```

### 2. Sammanfattning & Scope
```html
<section class="doc-section">
  <h2>Sammanfattning & scope</h2>
  <p>{summaryText}</p>
  {scopeIncluded.length > 0 ? `
    <h3>Ingår</h3>
    <ul>
      {scopeIncluded.map(item => `<li>${cleanScopeItem(item)}</li>`).join('')}
    </ul>
  ` : ''}
  {scopeExcluded.length > 0 ? `
    <h3>Ingår inte</h3>
    <ul>
      {scopeExcluded.map(item => `<li>${cleanScopeItem(item)}</li>`).join('')}
    </ul>
  ` : ''}
</section>
```
- **Källa**: `model.summary`, `model.scopeIncluded`, `model.scopeExcluded`
- **Fallback**: Generisk text

### 3. Effektmål
```html
<section class="doc-section">
  <h2>Effektmål</h2>
  {renderList(effectGoals)}
</section>
```
- **Källa**: `model.effectGoals` (required)
- **Fallback**: Generiska effektmål (automatisering, handläggningstid, datakvalitet, etc.)

### 4. Ingående Epics
```html
<section class="doc-section">
  <h2>Ingående Epics</h2>
  {epicRows.length > 0 ? `
    <table>
      <tr>
        <th>Epic-ID</th>
        <th>Epic-namn</th>
        <th>Beskrivning</th>
        <th>Team</th>
      </tr>
      {epicRows.map(row => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name}</td>
          <td>${row.description}</td>
          <td>${row.team}</td>
        </tr>
      `).join('')}
    </table>
  ` : '<p class="muted">Inga epics identifierade ännu...</p>'}
</section>
```
- **Källa**: `model.epics` (required)
- **Fallback**: Genererar från descendantEpics (max 6)

### 5. Affärsflöde
```html
<section class="doc-section">
  <h2>Affärsflöde</h2>
  <ol>
    {flowSteps.map(step => `<li>${step}</li>`).join('')}
  </ol>
</section>
```
- **Källa**: `model.flowSteps` (required)
- **Fallback**: Generiska flödessteg

### 6. Beroenden
```html
<section class="doc-section">
  <h2>Beroenden</h2>
  {dependencies.length > 0
    ? renderList(dependencies)
    : '<p class="muted">Inga beroenden identifierade ännu.</p>'}
</section>
```
- **Källa**: `model.dependencies` (required)
- **Fallback**: Generiska beroenden

### 7. Relaterade regler / subprocesser
```html
<section class="doc-section">
  <h2>Relaterade regler / subprocesser</h2>
  {renderList(relatedItems)}
</section>
```
- **Källa**: `model.relatedItems` (required)
- **Fallback**: BPMN viewer-länk, DMN-länk, föregående noder

### 8. Definition of Ready
```html
<section class="doc-section">
  <h2>Definition of Ready</h2>
  {renderList(dorBullets)}
</section>
```
- **Statiskt innehåll**: Alltid samma DoR-punkter

### 9. Definition of Done
```html
<section class="doc-section">
  <h2>Definition of Done</h2>
  {renderList(dodBullets)}
</section>
```
- **Statiskt innehåll**: Alltid samma DoD-punkter

---

## V2 Mall - Struktur (Standard)

### 1. Header-sektion
```html
<section class="doc-section">
  <span class="doc-badge">Feature Goal</span>
  <h1>{nodeName}</h1>
  <p class="muted">Call Activity i {processStep} mellan {upstreamName} → {downstreamName}.</p>
  <ul>
    <li><strong>BPMN-element:</strong> {bpmnElementId} ({type})</li>
    <li><strong>Kreditprocess-steg:</strong> {processStep}</li>
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
- **Källa**: `model.summary` (required)
- **Fallback**: Generisk text
- **Skillnad från V1**: Scope är inte inkluderat här

### 3. Förutsättningar
```html
<section class="doc-section" data-source-prerequisites="{prerequisitesSource}">
  <h2>Förutsättningar</h2>
  {renderList(prerequisites)}
</section>
```
- **Källa**: `model.prerequisites` (required)
- **Fallback**: Generiska förutsättningar
- **Skillnad från V1**: V1 har inte denna sektion

### 4. Funktionellt flöde
```html
<section class="doc-section" data-source-flow="{flowStepsSource}">
  <h2>Funktionellt flöde</h2>
  <ol>
    {flowSteps.map(step => `<li>${step}</li>`).join('')}
  </ol>
</section>
```
- **Källa**: `model.flowSteps` (required)
- **Fallback**: Generiska flödessteg

### 5. Beroenden
```html
<section class="doc-section" data-source-dependencies="{dependenciesSource}">
  <h2>Beroenden</h2>
  {renderList(dependencies)}
</section>
```
- **Källa**: `model.dependencies` (required)
- **Fallback**: Generiska beroenden

### 6. Effektmål (Conditional)
```html
{effectGoals.length > 0 ? `
<section class="doc-section" data-source-effect-goals="{effectGoalsSource}">
  <h2>Effektmål</h2>
  {renderList(effectGoals)}
</section>
` : ''}
```
- **Källa**: `model.effectGoals` (required)
- **Visas endast**: Om effectGoals finns och har innehåll
- **Skillnad från V1**: V1 visar alltid effektmål

### 7. User Stories (Conditional)
```html
{userStories.length > 0 ? `
<section class="doc-section" data-source-user-stories="{userStoriesSource}">
  <h2>User Stories</h2>
  <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
  {userStories.map(story => `
    <div class="user-story" style="...">
      <h3>
        <strong>${story.id}:</strong> Som <strong>${story.role}</strong> 
        vill jag <strong>${story.goal}</strong> 
        så att <strong>${story.value}</strong>
      </h3>
      <div>
        <p>Acceptanskriterier:</p>
        <ul>
          {story.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}
        </ul>
      </div>
      {testLink ? `<p>Testfil: <code>${testLink}</code></p>` : ''}
    </div>
  `).join('')}
</section>
` : ''}
```
- **Källa**: `model.userStories` (optional)
- **Visas endast**: Om userStories finns och har innehåll
- **Skillnad från V1**: V1 har inte user stories

### 8. Implementation Notes
```html
<section class="doc-section" data-source-implementation-notes="{implementationNotesSource}">
  <h2>Implementation Notes</h2>
  {renderList(implementationNotes)}
</section>
```
- **Källa**: `model.implementationNotes` (required)
- **Fallback**: Generiska implementation notes
- **Skillnad från V1**: V1 har inte denna sektion

### 9. Testgenerering (V2 only, via `buildTestGenerationSectionV2()`)
```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  <p class="muted">Information för att generera automatiserade tester...</p>
  
  <h3>Testscenarier</h3>
  <table>
    <!-- Scenario table med ID, Namn, Typ, Persona, Risk Level, Assertion Type, Outcome, Status -->
  </table>
  
  <h3>UI Flow per Scenario</h3>
  <!-- Expandable details för varje scenario med steg-tabell -->
  
  <h3>Testdata-referenser</h3>
  <ul>
    <!-- Testdata-profilerna -->
  </ul>
  
  <h3>Implementation Mapping</h3>
  <table>
    <!-- Mapping mellan BPMN-aktiviteter och implementation -->
  </table>
</section>
```
- **Källa**: Genereras från `plannedScenarios` och `e2eTestInfo` (optional)
- **Skillnad från V1**: V1 har inte testgenerering

---

## Jämförelse V1 vs V2

| Sektion | V1 | V2 |
|---------|----|----|
| Header | ✅ | ✅ (lite annorlunda) |
| Sammanfattning | ✅ (med scope) | ✅ (utan scope) |
| Förutsättningar | ❌ | ✅ |
| Funktionellt flöde | ✅ (Affärsflöde) | ✅ |
| Beroenden | ✅ | ✅ |
| Effektmål | ✅ (alltid) | ✅ (conditional) |
| Ingående Epics | ✅ (tabell) | ❌ |
| Relaterade items | ✅ | ❌ |
| Definition of Ready | ✅ | ❌ |
| Definition of Done | ✅ | ❌ |
| User Stories | ❌ | ✅ (conditional) |
| Implementation Notes | ❌ | ✅ |
| Testgenerering | ❌ | ✅ (om data finns) |

## Data-källor

Varje sektion i V2 har en `data-source-*` attribut som indikerar om innehållet kommer från:
- `"llm"` - Genererat av Claude/LLM
- `"fallback"` - Fallback-värde från base model

## Renderingsflöde

1. **Base model** byggs från context (`buildFeatureGoalDocModelFromContext`)
2. **Overrides** appliceras (om de finns i `src/data/node-docs/feature/`)
3. **LLM patch** appliceras (om `llmContent` finns från Claude)
4. **Validering** av modellen
5. **HTML rendering** via `buildFeatureGoalDocHtmlFromModelV2()` (eller V1)
6. **Testgenerering** läggs till (V2 only, om data finns)
7. **Wrap** i fullständigt HTML-dokument via `wrapDocument()`

## Viktiga skillnader

### V1 fokuserar på:
- Scope (Ingår/Ingår inte)
- Epics-tabell
- Definition of Ready/Done
- Relaterade items

### V2 fokuserar på:
- Förutsättningar
- User Stories (optional)
- Implementation Notes
- Testgenerering (om data finns)
- Mer strukturerad med data-source attribut

V2 är standard och rekommenderas för ny användning.

