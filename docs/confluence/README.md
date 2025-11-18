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

For BusinessRuleTask nodes (decision points), additional detailed documentation is maintained in `public/docs/` as HTML files:
- `pre-screen-party.html`
- `evaluate-fastighet.html`
- `evaluate-bostadsratt.html`
- `evaluate-personal-information.html`
- `assess-stakeholder.html`

These DMN documents contain:
- Complete decision table structures
- Business rules and validation logic
- All input/output specifications
- Comprehensive test cases and examples
- Regulatory constraints
- Change logs

The Confluence documentation should reference these detailed DMN documents but maintain a higher-level overview suitable for stakeholders.

## Linking

The Confluence URL for each node should point to the actual Confluence page that mirrors this content.
These markdown files serve as version-controlled source of truth that can be synced to Confluence.
