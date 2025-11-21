export type DorDodCriterion = {
  criterion_type: 'dor' | 'dod';
  criterion_category: string;
  criterion_key: string;
  criterion_text: string;
};

type CriterionTemplate = Omit<DorDodCriterion, 'criterion_key'> & { keySuffix: string };

const baseServiceTask: CriterionTemplate[] = [
  { criterion_type: 'dor', criterion_category: 'process_krav', keySuffix: 'purpose_defined', criterion_text: 'Syftet med ServiceTasken är beskrivet och godkänt (vilken data som hämtas eller skrivs och varför).' },
  { criterion_type: 'dor', criterion_category: 'data_api', keySuffix: 'api_spec_complete', criterion_text: 'API-specifikationen är komplett (endpoint, payload, schema, felkoder, idempotency).' },
  { criterion_type: 'dor', criterion_category: 'teknik_arkitektur', keySuffix: 'integration_dependencies_known', criterion_text: 'Alla integrationsberoenden (interna/externa system) är identifierade och godkända av arkitekt.' },
  { criterion_type: 'dor', criterion_category: 'data_input_output', keySuffix: 'io_defined', criterion_text: 'Input- och outputfält är definierade, inklusive obligatoriska fält och valideringsregler.' },
  { criterion_type: 'dor', criterion_category: 'teknik_arkitektur', keySuffix: 'error_strategy_defined', criterion_text: 'Felhanteringsstrategi är definierad (felkoder, retries, timeouts, fallback-beteende).' },
  { criterion_type: 'dor', criterion_category: 'test_kvalitet', keySuffix: 'test_scenarios_defined', criterion_text: 'Testscenarier för happy path, felhantering, timeouts och edge cases är definierade.' },
  { criterion_type: 'dor', criterion_category: 'planering_beroenden', keySuffix: 'no_blocking_dependencies', criterion_text: 'Eventuella blockerande beroenden (andra tjänster, beslut, konfiguration) är identifierade och hanterade.' },
  { criterion_type: 'dod', criterion_category: 'funktion_krav', keySuffix: 'behavior_implemented', criterion_text: 'ServiceTasken uppfyller definierat beteende i processen (rätt data hämtas eller skrivs vid rätt tidpunkt).' },
  { criterion_type: 'dod', criterion_category: 'data_api', keySuffix: 'api_implemented', criterion_text: 'API-anrop är implementerat enligt specifikation och validerat mot avtalat schema.' },
  { criterion_type: 'dod', criterion_category: 'teknik_drift', keySuffix: 'timeouts_retries', criterion_text: 'Timeout- och retrylogik är implementerad enligt överenskommen strategi, inklusive idempotency där det krävs.' },
  { criterion_type: 'dod', criterion_category: 'teknik_drift', keySuffix: 'logging_monitoring', criterion_text: 'Relevant logging och monitoring är implementerad (framgång, fel, edge cases).' },
  { criterion_type: 'dod', criterion_category: 'test_kvalitet', keySuffix: 'tests_passing', criterion_text: 'Automatiska tester (unit/integration/E2E) för definierade scenarier är implementerade och passerar i CI.' },
  { criterion_type: 'dod', criterion_category: 'dokumentation', keySuffix: 'docs_updated', criterion_text: 'Dokumentation (payload-exempel, felkoder, beroenden) är uppdaterad i systemets dokumentation.' },
  { criterion_type: 'dod', criterion_category: 'overlamning', keySuffix: 'review_approved', criterion_text: 'Code review är genomförd och godkänd av ansvarig utvecklare/arkitekt.' },
];

const baseUserTask: CriterionTemplate[] = [
  { criterion_type: 'dor', criterion_category: 'process_krav', keySuffix: 'user_flow_defined', criterion_text: 'Syfte och användarflöde för UserTasken är beskrivet (happy path och grundläggande fel-flöden).' },
  { criterion_type: 'dor', criterion_category: 'design', keySuffix: 'figma_ready', criterion_text: 'Relevant Figma-design är framtagen, inklusive layout, states och felmeddelanden.' },
  { criterion_type: 'dor', criterion_category: 'data_input_output', keySuffix: 'form_fields_defined', criterion_text: 'Formulärfält, obligatoriska fält och grundläggande valideringsregler är definierade.' },
  { criterion_type: 'dor', criterion_category: 'test_kvalitet', keySuffix: 'ux_test_cases_defined', criterion_text: 'Testscenarier för valideringsfel, edge cases (tomma fält, fel format) och avbrutna flöden är definierade.' },
  { criterion_type: 'dor', criterion_category: 'team_alignment', keySuffix: 'po_ux_dev_aligned', criterion_text: 'Produktägare, UX och utveckling är överens om scope och beteende för UserTasken.' },
  { criterion_type: 'dor', criterion_category: 'planering_beroenden', keySuffix: 'no_blocking_backend', criterion_text: 'Eventuella beroenden mot backend och andra UI-flöden är identifierade och blockerande beroenden hanterade.' },
  { criterion_type: 'dod', criterion_category: 'funktion_krav', keySuffix: 'ui_behavior_implemented', criterion_text: 'UserTasken beter sig enligt överenskommet flöde (inklusive navigation, states och felhantering).' },
  { criterion_type: 'dod', criterion_category: 'design', keySuffix: 'matches_figma', criterion_text: 'UI är implementerat i linje med Figma-design eller avvikelser är dokumenterade och godkända.' },
  { criterion_type: 'dod', criterion_category: 'data_input_output', keySuffix: 'data_persisted_correctly', criterion_text: 'Användarinmatad data lagras, valideras och konsumeras korrekt enligt specifikation.' },
  { criterion_type: 'dod', criterion_category: 'test_kvalitet', keySuffix: 'ui_tests_passing', criterion_text: 'Automatiska UI-tester (t.ex. Playwright) täcker definierade scenarier och passerar i CI.' },
  { criterion_type: 'dod', criterion_category: 'dokumentation', keySuffix: 'ux_docs_updated', criterion_text: 'Dokumentation av användarflöde, fält och felmeddelanden är uppdaterad.' },
  { criterion_type: 'dod', criterion_category: 'overlamning', keySuffix: 'accepted_by_po', criterion_text: 'UserTasken är demo:ad och accepterad av produktägare.' },
];

const baseBusinessRule: CriterionTemplate[] = [
  { criterion_type: 'dor', criterion_category: 'process_krav', keySuffix: 'decision_purpose_defined', criterion_text: 'Beslutsfrågan (decision question) är tydligt formulerad och kopplad till processen.' },
  { criterion_type: 'dor', criterion_category: 'data_input_output', keySuffix: 'dmn_io_defined', criterion_text: 'Inputs och outputs för DMN-beslutet är definierade och mappade mot data-/API-modell.' },
  { criterion_type: 'dor', criterion_category: 'test_kvalitet', keySuffix: 'dmn_test_cases_defined', criterion_text: 'Testfall per regel (minst ett happy path, negativa fall och kantfall) är identifierade.' },
  { criterion_type: 'dor', criterion_category: 'teknik_arkitektur', keySuffix: 'dmn_integration_defined', criterion_text: 'Hur DMN-beslutet anropas från tjänst eller motor är beskrivet (API, engine, parameters).' },
  { criterion_type: 'dor', criterion_category: 'planering_beroenden', keySuffix: 'business_risk_signoff_planned', criterion_text: 'Behov av godkännande från business/risk är identifierat och inplanerat.' },
  { criterion_type: 'dod', criterion_category: 'funktion_krav', keySuffix: 'rules_implemented', criterion_text: 'Samtliga överenskomna regler är implementerade i DMN-tabellen.' },
  { criterion_type: 'dod', criterion_category: 'data_api', keySuffix: 'dmn_io_validated', criterion_text: 'Input/Output är verifierade mot verkliga payloads och konsumerande system.' },
  { criterion_type: 'dod', criterion_category: 'test_kvalitet', keySuffix: 'dmn_tests_passing', criterion_text: 'Automatiska tester av DMN-regler (inklusive edge/negativa fall) finns och passerar i CI.' },
  { criterion_type: 'dod', criterion_category: 'dokumentation', keySuffix: 'dmn_docs_updated', criterion_text: 'DMN-dokumentation (regeltabell och beskrivning) är uppdaterad i verktyget.' },
  { criterion_type: 'dod', criterion_category: 'teknik_drift', keySuffix: 'dmn_monitoring_in_place', criterion_text: 'Eventuell logging/monitorering av DMN-beslut är på plats enligt överenskommen nivå.' },
  { criterion_type: 'dod', criterion_category: 'overlamning', keySuffix: 'business_risk_approved', criterion_text: 'Regeluppsättningen är godkänd av business och, vid behov, riskfunktion.' },
];

const baseCallActivity: CriterionTemplate[] = [
  { criterion_type: 'dor', criterion_category: 'process_krav', keySuffix: 'subprocess_scope_defined', criterion_text: 'Scope och syfte för subprocessen är definierat, inklusive start-/slutvillkor.' },
  { criterion_type: 'dor', criterion_category: 'data_input_output', keySuffix: 'subprocess_io_defined', criterion_text: 'Input- och output-data mellan parent-process och subprocess är definierade.' },
  { criterion_type: 'dor', criterion_category: 'teknik_arkitektur', keySuffix: 'called_element_mapped', criterion_text: 'calledElement är mappad till korrekt BPMN-fil och teknisk integration är förankrad hos arkitekt.' },
  { criterion_type: 'dor', criterion_category: 'planering_beroenden', keySuffix: 'dependencies_identified', criterion_text: 'Beroenden mot andra subprocesser/system är identifierade och planerade.' },
  { criterion_type: 'dor', criterion_category: 'team_alignment', keySuffix: 'teams_aligned', criterion_text: 'Berörda team (t.ex. de som bygger parent- och child-processen) är överens om ansvar och gränssnitt.' },
  { criterion_type: 'dod', criterion_category: 'funktion_krav', keySuffix: 'subprocess_behavior_implemented', criterion_text: 'Subprocessen uppfyller överenskommet beteende och kontrakt (input/output, felhantering).' },
  { criterion_type: 'dod', criterion_category: 'teknik_arkitektur', keySuffix: 'integration_verified', criterion_text: 'Integration mellan parent och subprocess är verifierad (dataflöden, korrelation, felvägar).' },
  { criterion_type: 'dod', criterion_category: 'test_kvalitet', keySuffix: 'subprocess_tests_passing', criterion_text: 'Automatiska tester för kontrakt och kritiska flöden mellan parent/subprocess finns och passerar.' },
  { criterion_type: 'dod', criterion_category: 'dokumentation', keySuffix: 'subprocess_docs_updated', criterion_text: 'Dokumentation av subprocessens gränssnitt och beroenden är uppdaterad.' },
  { criterion_type: 'dod', criterion_category: 'overlamning', keySuffix: 'operational_signoff', criterion_text: 'Operativt ansvariga har godkänt drift/övervakning av subprocessen.' },
];

const templateMap = {
  ServiceTask: baseServiceTask,
  UserTask: baseUserTask,
  BusinessRuleTask: baseBusinessRule,
  CallActivity: baseCallActivity,
};

export type DorDodNodeType = keyof typeof templateMap;

export function buildDorDodCriteria(nodeType: DorDodNodeType, normalizedName: string): DorDodCriterion[] {
  const templates = templateMap[nodeType] || [];
  return templates.map((t) => ({
    criterion_type: t.criterion_type,
    criterion_category: t.criterion_category,
    criterion_key: `${normalizedName}_${t.keySuffix}`,
    criterion_text: t.criterion_text,
  }));
}

export function getDorDodTemplates() {
  return templateMap;
}
