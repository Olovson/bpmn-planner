# Confluence Documentation

This directory contains Confluence documentation for all BPMN nodes in the mortgage process.

## Structure

Each BPMN node has its own markdown file named after the `element_id` from the BPMN diagram:
- `application.md` - Application subprocess documentation
- `credit-evaluation.md` - Credit Evaluation subprocess documentation
- etc.

## Template

Use `template.md` as a starting point when creating new documentation pages.

## Sections

Each documentation page should include:
1. **Overview** - Description and purpose of the BPMN node
2. **User Stories** - Relevant user stories and business requirements
3. **Input/Output Specification** - Data contracts
4. **Business Rules** - Decision criteria and validation rules
5. **DMN Decision Logic** - _(BusinessRuleTask only)_ Decision table overview, thresholds, and detailed DMN documentation links
6. **API Documentation** - Integration points and endpoints
7. **Technical Flow** - Technical flowchart/diagram
8. **Dependencies** - External systems and services
9. **Error Handling** - Error scenarios and recovery
10. **Security** - Authentication, authorization, data protection
11. **Performance Requirements** - SLA, timeouts, response times
12. **Acceptance Criteria** - Testing requirements
13. **Test Report** - Link to automated tests (including DMN-specific tests for BusinessRuleTask nodes)
14. **Figma Design** - UI/UX design reference
15. **Team & Ownership** - Responsible team and contacts
16. **Compliance** - Regulatory requirements (GDPR, banking regulations)
17. **Monitoring & Alerts** - Production monitoring setup
18. **Known Issues** - Current limitations
19. **Changelog** - Version history

## DMN Documentation

För BusinessRuleTask‑noder (decision points) finns detaljerad DMN‑dokumentation som HTML i samma Supabase‑bucket som övriga docs. I koden refereras de via `SubprocessRegistry.htmlDoc` (t.ex. `/docs/pre-screen-party.html`), men i praktiken visas de alltid genom appens DocViewer:

- `#/doc-viewer/<docId>` – för nodspecifika docs.
- `#/doc-viewer/...`‑länkar genereras automatiskt från BPMN‑fil + elementId.

Dessa DMN‑dokument innehåller bl.a.:
- kompletta decision tables,
- regler och valideringslogik,
- input/output‑specifikationer,
- testfall och exempel,
- regulatoriska begränsningar,
- enklare ändringslogg.

Confluence‑dokumentationen ska länka till dessa DMN‑dokument (antingen via appens DocViewer‑URL eller direkta docs‑URL:er) men hålla sig på en mer sammanfattande nivå anpassad för stakeholders.

## Linking

The Confluence URL for each node should point to the actual Confluence page that mirrors this content.
These markdown files serve as version-controlled source of truth that can be synced to Confluence.
