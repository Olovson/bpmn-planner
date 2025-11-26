/**
 * Shared abstraction for LLM documentation generation.
 * 
 * This module extracts the reusable logic for preparing LLM requests and interpreting
 * responses for the ChatGPT API path.
 * 
 * The goal is to have a single source of truth for:
 * - Prompt selection
 * - Context payload building
 * - Response mapping to models
 */

import type { NodeDocumentationContext } from './documentationContext';
import type { TemplateLinks } from './documentationTemplates';
import type { DocumentationDocType } from './llmDocumentation';
import { buildContextPayload as buildContextPayloadInternal } from './llmDocumentation';
import {
  getFeaturePrompt,
  getEpicPrompt,
  getBusinessRulePrompt,
} from './promptLoader';
import {
  mapFeatureGoalLlmToSections,
  type FeatureGoalLlmSections,
} from './featureGoalLlmMapper';
import { mapEpicLlmToSections, type EpicDocModel } from './epicLlmMapper';
import {
  mapBusinessRuleLlmToSections,
  type BusinessRuleDocModel,
} from './businessRuleLlmMapper';

// ============================================================================
// Prompt Selection
// ============================================================================

/**
 * Gets the appropriate prompt for a document type.
 * Reuses the same prompt loader used by the ChatGPT API path.
 */
export function getPromptForDocType(docType: DocumentationDocType): string {
  if (docType === 'businessRule') {
    return getBusinessRulePrompt();
  }
  if (docType === 'feature') {
    return getFeaturePrompt();
  }
  return getEpicPrompt();
}

// ============================================================================
// Context Payload Building
// ============================================================================

/**
 * Builds the LLM input payload from node context.
 * This is the same logic used by generateDocumentationWithLlm.
 * 
 * Returns the JSON payload that should be sent to the LLM as the user message.
 */
export function buildLlmInputPayload(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks
): string {
  const { processContext, currentNodeContext } = buildContextPayloadInternal(context, links);
  const docLabel =
    docType === 'feature'
      ? 'Feature'
      : docType === 'epic'
      ? 'Epic'
      : 'BusinessRule';

  const llmInput = {
    type: docLabel,
    processContext,
    currentNodeContext,
  };

  return JSON.stringify(llmInput, null, 2);
}

/**
 * Builds the full LLM request structure (system prompt + user prompt).
 * This is what would be sent to ChatGPT.
 */
export interface LlmRequestStructure {
  systemPrompt: string;
  userPrompt: string;
}

export function buildLlmRequestStructure(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks
): LlmRequestStructure {
  const systemPrompt = getPromptForDocType(docType);
  const userPrompt = buildLlmInputPayload(docType, context, links);

  return {
    systemPrompt,
    userPrompt,
  };
}

// ============================================================================
// Response Mapping
// ============================================================================

/**
 * Maps raw LLM response text to the appropriate model type.
 * Reuses the same mapper functions used by the ChatGPT API path.
 */
export function mapLlmResponseToModel(
  docType: DocumentationDocType,
  rawContent: string
): FeatureGoalLlmSections | EpicDocModel | BusinessRuleDocModel {
  if (docType === 'feature') {
    return mapFeatureGoalLlmToSections(rawContent);
  }
  if (docType === 'epic') {
    return mapEpicLlmToSections(rawContent);
  }
  return mapBusinessRuleLlmToSections(rawContent);
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Determines the document type from a node type.
 */
export function inferDocTypeFromNodeType(
  nodeType: string
): DocumentationDocType | null {
  if (nodeType === 'callActivity') {
    return 'feature';
  }
  if (nodeType === 'businessRuleTask' || nodeType === 'dmnDecision') {
    return 'businessRule';
  }
  // Most other task types are epics
  if (
    nodeType === 'userTask' ||
    nodeType === 'serviceTask' ||
    nodeType === 'scriptTask' ||
    nodeType === 'task'
  ) {
    return 'epic';
  }
  return null;
}

/**
 * Determines the document type from an override file path or docType string.
 */
export function normalizeDocType(
  docType: string
): DocumentationDocType | null {
  const normalized = docType.toLowerCase().replace(/-/g, '');
  if (normalized === 'featuregoal' || normalized === 'feature') {
    return 'feature';
  }
  if (normalized === 'epic') {
    return 'epic';
  }
  if (normalized === 'businessrule' || normalized === 'business') {
    return 'businessRule';
  }
  return null;
}

