// Central registry for all subprocess information
// This is the single source of truth for subprocess metadata
// 
// NOTE: The 'htmlDoc' field is deprecated and no longer used.
// Documentation URLs are now dynamically generated from 'bpmnFile' using getDocumentationUrl().
// The field is kept for backward compatibility but can be safely ignored.

export type NodeType = 'UserTask' | 'ServiceTask' | 'BusinessRuleTask' | 'CallActivity';

export interface SubprocessInfo {
  id: string;
  displayName: string;
  subtitle?: string;
  bpmnFile: string;
  htmlDoc: string; // DEPRECATED: Use getDocumentationUrl(bpmnFile) instead
  testFile?: string;
  figmaUrl?: string;
  jiraUrl?: string;
  nodeType: NodeType;
}

export const SUBPROCESS_REGISTRY: SubprocessInfo[] = [
  {
    id: 'application',
    displayName: 'Application',
    subtitle: 'Mortgage Application Collection - Huvudprocess',
    bpmnFile: 'mortgage-se-application.bpmn',
    htmlDoc: '/docs/application.html',
    testFile: 'application.spec.ts',
    figmaUrl: 'https://www.figma.com/design/iSRYo9n5XbWcTuqPjAxMMZ/ci_test?node-id=2-11',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-101',
    nodeType: 'CallActivity'
  },
  {
    id: 'internal-data-gathering',
    displayName: 'Internal Data Gathering',
    subtitle: 'Intern datainsamling och pre-screening',
    bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
    htmlDoc: '/docs/internal-data-gathering.html',
    testFile: 'internal-data-gathering.spec.ts',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-102',
    nodeType: 'CallActivity'
  },
  {
    id: 'fetch-party-information',
    displayName: 'Fetch Party Information',
    bpmnFile: 'mortgage-se-fetch-party-information.bpmn',
    htmlDoc: '/docs/fetch-party-information.html',
    testFile: 'fetch-party-information.spec.ts',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-103',
    nodeType: 'ServiceTask'
  },
  {
    id: 'pre-screen-party',
    displayName: 'Pre-screen Party',
    bpmnFile: 'mortgage-se-pre-screen-party.bpmn',
    htmlDoc: '/docs/pre-screen-party.html',
    testFile: 'pre-screen-party.spec.ts',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-104',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'fetch-engagements',
    displayName: 'Fetch Engagements',
    bpmnFile: 'mortgage-se-fetch-engagements.bpmn',
    htmlDoc: '/docs/fetch-engagements.html',
    testFile: 'fetch-engagements.spec.ts',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-105',
    nodeType: 'ServiceTask'
  },
  {
    id: 'mortgage-commitment',
    displayName: 'Mortgage Commitment',
    bpmnFile: 'mortgage-se-mortgage-commitment.bpmn',
    htmlDoc: '/docs/mortgage-commitment.html',
    figmaUrl: 'https://www.figma.com/design/iSRYo9n5XbWcTuqPjAxMMZ/ci_test?node-id=2-4',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-106',
    nodeType: 'UserTask'
  },
  {
    id: 'credit-evaluation',
    displayName: 'Credit Evaluation',
    subtitle: 'Kreditbedömning och riskanalys',
    bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
    htmlDoc: '/docs/credit-evaluation.html',
    testFile: 'credit-evaluation.spec.ts',
    figmaUrl: 'https://www.figma.com/design/iSRYo9n5XbWcTuqPjAxMMZ/ci_test?node-id=2-12',
    jiraUrl: 'https://pangsci.atlassian.net/browse/MORT-107',
    nodeType: 'CallActivity'
  },
  {
    id: 'stakeholder',
    displayName: 'Stakeholder',
    subtitle: 'Intressentinformation och KYC-process',
    bpmnFile: 'mortgage-se-stakeholder.bpmn',
    htmlDoc: '/docs/stakeholder.html',
    testFile: 'stakeholder.spec.ts',
    nodeType: 'CallActivity'
  },
  {
    id: 'household',
    displayName: 'Household',
    subtitle: 'Hushållsinformation och ekonomisk situation',
    bpmnFile: 'mortgage-se-household.bpmn',
    htmlDoc: '/docs/household.html',
    testFile: 'household.spec.ts',
    nodeType: 'CallActivity'
  },
  {
    id: 'object',
    displayName: 'Object',
    subtitle: 'Fastighetsinformation och säkerhetsvärdering',
    bpmnFile: 'mortgage-se-object.bpmn',
    htmlDoc: '/docs/object.html',
    testFile: 'object.spec.ts',
    nodeType: 'CallActivity'
  },
  {
    id: 'object-information',
    displayName: 'Object Information',
    subtitle: 'Fastighetsinformation per objekt (Embedded Subprocess)',
    bpmnFile: 'mortgage-se-object-information.bpmn',
    htmlDoc: '/docs/object-information.html',
    testFile: 'object-information.spec.ts',
    nodeType: 'CallActivity'
  },
  {
    id: 'assess-stakeholder',
    displayName: 'Assess Stakeholder',
    htmlDoc: '/docs/assess-stakeholder.html',
    bpmnFile: 'mortgage-se-assess-stakeholder.bpmn',
    testFile: 'assess-stakeholder.spec.ts',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'confirm-application',
    displayName: 'Confirm Application',
    htmlDoc: '/docs/confirm-application.html',
    bpmnFile: 'mortgage-se-confirm-application.bpmn',
    testFile: 'confirm-application.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'consent-to-credit-check',
    displayName: 'Consent to Credit Check',
    bpmnFile: 'mortgage-se-consent-to-credit-check.bpmn',
    htmlDoc: '/docs/consent-to-credit-check.html',
    testFile: 'consent-to-credit-check.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'fetch-credit-information',
    displayName: 'Fetch Credit Information',
    bpmnFile: 'mortgage-se-fetch-credit-information.bpmn',
    htmlDoc: '/docs/fetch-credit-information.html',
    testFile: 'fetch-credit-information.spec.ts',
    nodeType: 'ServiceTask'
  },
  {
    id: 'fetch-personal-information',
    displayName: 'Fetch Personal Information',
    bpmnFile: 'mortgage-se-fetch-personal-information.bpmn',
    htmlDoc: '/docs/fetch-personal-information.html',
    testFile: 'fetch-personal-information.spec.ts',
    nodeType: 'ServiceTask'
  },
  {
    id: 'register-household-economy-information',
    displayName: 'Register Household Economy Information',
    bpmnFile: 'mortgage-se-register-household-economy-information.bpmn',
    htmlDoc: '/docs/register-household-economy-information.html',
    testFile: 'register-household-economy-information.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'register-loan-details',
    displayName: 'Register Loan Details',
    bpmnFile: 'mortgage-se-register-loan-details.bpmn',
    htmlDoc: '/docs/register-loan-details.html',
    testFile: 'register-loan-details.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'register-personal-economy-information',
    displayName: 'Register Personal Economy Information',
    bpmnFile: 'mortgage-se-register-personal-economy-information.bpmn',
    htmlDoc: '/docs/register-personal-economy-information.html',
    testFile: 'register-personal-economy-information.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'register-source-of-equity',
    displayName: 'Register Source of Equity',
    bpmnFile: 'mortgage-se-register-source-of-equity.bpmn',
    htmlDoc: '/docs/register-source-of-equity.html',
    testFile: 'register-source-of-equity.spec.ts',
    nodeType: 'UserTask'
  },
  {
    id: 'evaluate-personal-information',
    displayName: 'Evaluate Personal Information',
    bpmnFile: 'mortgage-se-evaluate-personal-information.bpmn',
    htmlDoc: '/docs/evaluate-personal-information.html',
    testFile: 'evaluate-personal-information.spec.ts',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'evaluate-bostadsratt',
    displayName: 'Evaluate Bostadsrätt',
    bpmnFile: 'mortgage-se-evaluate-bostadsratt.bpmn',
    htmlDoc: '/docs/evaluate-bostadsratt.html',
    testFile: 'evaluate-bostadsratt.spec.ts',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'evaluate-fastighet',
    displayName: 'Evaluate Fastighet',
    bpmnFile: 'mortgage-se-evaluate-fastighet.bpmn',
    htmlDoc: '/docs/evaluate-fastighet.html',
    testFile: 'evaluate-fastighet.spec.ts',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'fetch-bostadsratts-information',
    displayName: 'Fetch Bostadsrätts Information',
    bpmnFile: 'mortgage-se-fetch-bostadsratts-information.bpmn',
    htmlDoc: '/docs/fetch-bostadsratts-information.html',
    testFile: 'fetch-bostadsratts-information.spec.ts',
    nodeType: 'ServiceTask'
  },
  {
    id: 'fetch-brf-information',
    displayName: 'Fetch BRF Information',
    bpmnFile: 'mortgage-se-fetch-brf-information.bpmn',
    htmlDoc: '/docs/fetch-brf-information.html',
    testFile: 'fetch-brf-information.spec.ts',
    nodeType: 'ServiceTask'
  },
  {
    id: 'fetch-fastighets-information',
    displayName: 'Fetch Fastighets Information',
    bpmnFile: 'mortgage-se-fetch-fastighets-information.bpmn',
    htmlDoc: '/docs/fetch-fastighets-information.html',
    testFile: 'fetch-fastighets-information.spec.ts',
    nodeType: 'ServiceTask'
  },
  {
    id: 'valuate-property',
    displayName: 'Valuate Property',
    bpmnFile: 'mortgage-se-valuate-property.bpmn',
    htmlDoc: '/docs/valuate-property.html',
    testFile: 'valuate-property.spec.ts',
    nodeType: 'BusinessRuleTask'
  },
  {
    id: 'offer',
    displayName: 'Offer',
    bpmnFile: 'mortgage-se-offer.bpmn',
    htmlDoc: '/docs/offer.html',
    nodeType: 'UserTask'
  },
  {
    id: 'signing',
    displayName: 'Signing',
    bpmnFile: 'mortgage-se-signing.bpmn',
    htmlDoc: '/docs/signing.html',
    nodeType: 'UserTask'
  },
  {
    id: 'collateral-registration',
    displayName: 'Collateral Registration',
    bpmnFile: 'mortgage-se-collateral-registration.bpmn',
    htmlDoc: '/docs/collateral-registration.html',
    nodeType: 'ServiceTask'
  },
  {
    id: 'disbursement',
    displayName: 'Disbursement',
    bpmnFile: 'mortgage-se-disbursement.bpmn',
    htmlDoc: '/docs/disbursement.html',
    nodeType: 'ServiceTask'
  }
];

// Helper function to get subprocess by ID
export function getSubprocessById(id: string): SubprocessInfo | undefined {
  return SUBPROCESS_REGISTRY.find(sp => sp.id === id);
}

// Helper function to get subprocesses by nodeType
export function getSubprocessesByNodeType(nodeType: NodeType): SubprocessInfo[] {
  return SUBPROCESS_REGISTRY.filter(sp => sp.nodeType === nodeType);
}
