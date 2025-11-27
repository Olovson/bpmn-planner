/**
 * Implementation Mapping Inference
 * 
 * Infers implementation mapping (routes/endpoints) from BPMN node names and types.
 * Uses pattern matching and heuristics to provide smart defaults.
 * 
 * These are starting points - actual routes/endpoints should be verified
 * and updated in the complete environment.
 */

import type { BpmnElement } from '@/lib/bpmnParser';
import type { TestAppContext } from './testContextTypes';

export interface InferredImplementationMapping {
  implementationType: 'ui' | 'api' | 'both' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  ui?: {
    pageId: string;
    route: string;
    baseUrl?: string;
  };
  api?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    baseUrl?: string;
  };
  warnings: string[];
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Infer implementation mapping from BPMN node name and type
 * Uses pattern matching and heuristics to guess implementation
 */
export function inferImplementationMapping(
  element: BpmnElement,
  appContext: TestAppContext = 'FICTIONAL_APP'
): InferredImplementationMapping {
  const nodeName = (element.name || element.id).toLowerCase();
  const nodeType = element.type.replace('bpmn:', '');
  const warnings: string[] = [];

  // Convert to kebab-case for routes/endpoints
  const kebabName = toKebabCase(element.name || element.id);

  // Pattern matching for API indicators
  const apiPatterns = [
    /fetch|get|retrieve|load|read/i,
    /create|post|add|insert/i,
    /update|put|modify|change/i,
    /delete|remove|destroy/i,
  ];

  const isApiCall = apiPatterns.some((pattern) => pattern.test(nodeName));

  // Pattern matching for UI indicators
  const uiPatterns = [
    /submit|confirm|approve|reject|decline/i,
    /register|enter|fill|input/i,
    /view|show|display|open/i,
  ];

  const isUiAction = uiPatterns.some((pattern) => pattern.test(nodeName));

  // Determine implementation type based on node type and patterns
  let implementationType: 'ui' | 'api' | 'both' | 'unknown' = 'unknown';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (nodeType === 'ServiceTask') {
    implementationType = 'api';
    confidence = isApiCall ? 'high' : 'medium';
  } else if (nodeType === 'UserTask') {
    implementationType = 'ui';
    confidence = isUiAction ? 'high' : 'medium';
  } else if (nodeType === 'BusinessRuleTask') {
    implementationType = 'api';
    confidence = 'medium';
  } else if (nodeType === 'CallActivity') {
    implementationType = 'both';
    confidence = 'low';
  }

  // Generate inferred mapping
  const mapping: InferredImplementationMapping = {
    implementationType,
    confidence,
    warnings: [],
  };

  // Generate UI mapping if applicable
  if (implementationType === 'ui' || implementationType === 'both') {
    mapping.ui = {
      pageId: kebabName,
      route: `/${kebabName}`,
    };

    if (confidence === 'low') {
      warnings.push(`⚠️ UI route inferred from node name. Verify: /${kebabName}`);
    }
  }

  // Generate API mapping if applicable
  if (implementationType === 'api' || implementationType === 'both') {
    // Infer HTTP method from node name
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
    if (/create|post|add|insert|submit/i.test(nodeName)) {
      method = 'POST';
    } else if (/update|put|modify|change/i.test(nodeName)) {
      method = 'PUT';
    } else if (/delete|remove|destroy/i.test(nodeName)) {
      method = 'DELETE';
    }

    mapping.api = {
      endpoint: `/api/v1/${kebabName}`,
      method,
    };

    if (confidence === 'low') {
      warnings.push(`⚠️ API endpoint inferred from node name. Verify: /api/v1/${kebabName}`);
    }
  }

  if (implementationType === 'unknown') {
    warnings.push('⚠️ Could not infer implementation type. Manual mapping required.');
  }

  mapping.warnings = warnings;
  return mapping;
}

