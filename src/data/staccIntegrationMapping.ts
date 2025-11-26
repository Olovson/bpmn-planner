/**
 * Static mapping of Service Tasks to Stacc's integration sources.
 * 
 * This file contains a hardcoded list of Service Tasks and their corresponding
 * Stacc integration sources. This mapping is used throughout the application,
 * primarily in the Node Matrix page to auto-populate the "Staccs integrationskälla" column.
 */

export interface StaccIntegrationMapping {
  bpmnFile: string;
  elementName: string;
  elementId: string;
  type: 'ServiceTask';
  description: string;
  integrationSource: string;
}

/**
 * Static mapping of Service Tasks to their Stacc integration sources.
 * 
 * Each entry maps a Service Task (identified by bpmnFile and elementId)
 * to its corresponding Stacc integration source(s).
 */
export const STACC_INTEGRATION_MAPPING: StaccIntegrationMapping[] = [
  {
    bpmnFile: 'mortgage-se-documentation-assessment.bpmn',
    elementName: 'Analyse documentation',
    elementId: 'analyse-documentation',
    type: 'ServiceTask',
    description: 'Analyzes documentation using OCR and document analysis services',
    integrationSource: 'Scrive OCR / Signicat Document Analysis',
  },
  {
    bpmnFile: 'mortgage-se-disbursement.bpmn',
    elementName: 'Archive documents',
    elementId: 'archive-documents',
    type: 'ServiceTask',
    description: 'Archives documents to document management systems',
    integrationSource: 'Filenet / OpenText / SharePoint Archive',
  },
  {
    bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
    elementName: 'Calculate household affordability',
    elementId: 'calculate-household-affordability',
    type: 'ServiceTask',
    description: 'Calculates household affordability using credit decisioning services',
    integrationSource: 'Stacc CreditEngine / TietoEvry Credit Decisioning',
  },
  {
    bpmnFile: 'mortgage-se-signing.bpmn',
    elementName: 'Create sign order',
    elementId: 'create-signing-order',
    type: 'ServiceTask',
    description: 'Creates signing orders for document signing',
    integrationSource: 'Scrive / Signicat Signature / BankID',
  },
  {
    bpmnFile: 'mortgage-se-disbursement.bpmn',
    elementName: 'Disburse loan',
    elementId: 'disburse-loan',
    type: 'ServiceTask',
    description: 'Disburses loans through core banking systems',
    integrationSource: 'TietoEvry Loan Management / SAP Banking Services / Finastra',
  },
  {
    bpmnFile: 'mortgage-se-kyc.bpmn',
    elementName: 'Fetch AML / KYC risk score',
    elementId: 'fetch-aml-kyc-risk',
    type: 'ServiceTask',
    description: 'Fetches AML and KYC risk scores from risk assessment providers',
    integrationSource: 'Refinitiv World-Check / Dow Jones / ComplyAdvantage',
  },
  {
    bpmnFile: 'mortgage-se-object-information.bpmn',
    elementName: 'Fetch bostadsrätts-information',
    elementId: 'fetch-bostadsratts-information',
    type: 'ServiceTask',
    description: 'Fetches bostadsrätt information from property registries',
    integrationSource: 'Lantmäteriet Bostadsrättsregister / Bolagsverket',
  },
  {
    bpmnFile: 'mortgage-se-object-information.bpmn',
    elementName: 'Fetch BRF-information',
    elementId: 'fetch-brf-information',
    type: 'ServiceTask',
    description: 'Fetches BRF (Bostadsrättsförening) information',
    integrationSource: 'Bolagsverket / UC BRF-info',
  },
  {
    bpmnFile: 'mortgage-se-stakeholder.bpmn',
    elementName: 'Fetch credit information',
    elementId: 'fetch-credit-information',
    type: 'ServiceTask',
    description: 'Fetches credit information from credit bureaus',
    integrationSource: 'UC / Bisnode / Creditsafe',
  },
  {
    bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
    elementName: 'Fetch engagements',
    elementId: 'fetch-engagements',
    type: 'ServiceTask',
    description: 'Fetches customer engagements from core banking systems',
    integrationSource: 'TietoEvry Core Banking / SAP Banking / Finastra',
  },
  {
    bpmnFile: 'mortgage-se-object-information.bpmn',
    elementName: 'Fetch fastighets-information',
    elementId: 'fetch-fastighets-information',
    type: 'ServiceTask',
    description: 'Fetches property (fastighet) information from property registries',
    integrationSource: 'Lantmäteriet / Mäklarstatistik / Booli',
  },
  {
    bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
    elementName: 'Fetch party information',
    elementId: 'fetch-party-information',
    type: 'ServiceTask',
    description: 'Fetches party information from government registries',
    integrationSource: 'SPAR / Skatteverket',
  },
  {
    bpmnFile: 'mortgage-se-stakeholder.bpmn',
    elementName: 'Fetch personal information',
    elementId: 'fetch-personal-information',
    type: 'ServiceTask',
    description: 'Fetches personal information from government registries',
    integrationSource: 'SPAR / Skatteverket',
  },
  {
    bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
    elementName: 'Fetch price',
    elementId: 'fetch-price',
    type: 'ServiceTask',
    description: 'Fetches property prices from valuation services',
    integrationSource: 'Mäklarstatistik / Booli / Värderingsdata',
  },
  {
    bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
    elementName: 'Fetch risk classification',
    elementId: 'fetch-risk-classification',
    type: 'ServiceTask',
    description: 'Fetches risk classification from credit scoring services',
    integrationSource: 'Stacc CreditEngine / TietoEvry Risk Scoring',
  },
  {
    bpmnFile: 'mortgage-se-kyc.bpmn',
    elementName: 'Fetch sanctions and PEP',
    elementId: 'fetch-screening-and-sanctions',
    type: 'ServiceTask',
    description: 'Fetches sanctions and PEP (Politically Exposed Person) screening data',
    integrationSource: 'Refinitiv / ComplyAdvantage',
  },
  {
    bpmnFile: 'mortgage-se-document-generation.bpmn',
    elementName: 'Generate Document',
    elementId: 'generate-documents',
    type: 'ServiceTask',
    description: 'Generates documents using document generation services',
    integrationSource: 'Stacc Document Generator / Filenet / SharePoint',
  },
  {
    bpmnFile: 'mortgage-se-signing.bpmn',
    elementName: 'Store signed documents',
    elementId: 'store-signed-document',
    type: 'ServiceTask',
    description: 'Stores signed documents in archive systems',
    integrationSource: 'Scrive Archive / Signicat Archive',
  },
  {
    bpmnFile: 'mortgage-se-signing.bpmn',
    elementName: 'Upload document',
    elementId: 'upload-document',
    type: 'ServiceTask',
    description: 'Uploads documents to signing and storage services',
    integrationSource: 'Scrive / SharePoint / Signicat',
  },
  {
    bpmnFile: 'mortgage-se-object.bpmn',
    elementName: 'Valuate bostad',
    elementId: 'valuate-property',
    type: 'ServiceTask',
    description: 'Valuates properties using valuation services',
    integrationSource: 'SBAB Värderingsdata / Mäklarstatistik / UC Värdering',
  },
];

/**
 * Helper function to find integration source for a Service Task.
 * 
 * @param bpmnFile - The BPMN file name where the Service Task is located
 * @param elementId - The element ID of the Service Task
 * @returns The integration source string, or undefined if not found
 */
export function getStaccIntegrationSource(
  bpmnFile: string,
  elementId: string,
): string | undefined {
  const mapping = STACC_INTEGRATION_MAPPING.find(
    (m) => m.bpmnFile === bpmnFile && m.elementId === elementId,
  );
  return mapping?.integrationSource;
}

/**
 * Helper function to get all mappings for a specific BPMN file.
 * 
 * @param bpmnFile - The BPMN file name
 * @returns Array of mappings for the specified BPMN file
 */
export function getMappingsForBpmnFile(
  bpmnFile: string,
): StaccIntegrationMapping[] {
  return STACC_INTEGRATION_MAPPING.filter((m) => m.bpmnFile === bpmnFile);
}

/**
 * Helper function to get all mappings for a specific element ID.
 * 
 * @param elementId - The element ID
 * @returns Array of mappings for the specified element ID
 */
export function getMappingsForElementId(
  elementId: string,
): StaccIntegrationMapping[] {
  return STACC_INTEGRATION_MAPPING.filter((m) => m.elementId === elementId);
}

