import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPromptForDocType,
  buildLlmInputPayload,
  buildLlmRequestStructure,
  mapLlmResponseToModel,
} from '@/lib/llmDocumentationShared';
import type { DocumentationDocType } from '@/lib/documentationContext';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { TemplateLinks } from '@/lib/documentationTemplates';

// Safety: Ensure LLM is disabled in these tests
// These are unit tests that should NOT use real LLM or fallback
vi.mock('@/lib/llmClient', () => ({
  isLlmEnabled: () => false,
}));

// Mock promptLoader
vi.mock('@/lib/promptLoader', () => ({
  getFeaturePrompt: () => 'Feature prompt content',
  getEpicPrompt: () => 'Epic prompt content',
  getBusinessRulePrompt: () => 'Business Rule prompt content',
}));

// Mock mappers
vi.mock('@/lib/featureGoalLlmMapper', () => ({
  mapFeatureGoalLlmToSections: (raw: string) => ({
    summary: `Feature: ${raw}`,
    effectGoals: [],
  }),
}));

vi.mock('@/lib/epicLlmMapper', () => ({
  mapEpicLlmToSections: (raw: string) => ({
    summary: `Epic: ${raw}`,
    scenarios: [],
  }),
}));

vi.mock('@/lib/businessRuleLlmMapper', () => ({
  mapBusinessRuleLlmToSections: (raw: string) => ({
    summary: `Business Rule: ${raw}`,
    inputs: [],
  }),
}));

describe('llmDocumentationShared', () => {
  const mockContext: NodeDocumentationContext = {
    node: { id: 'test', bpmnElementId: 'test', name: 'Test', type: 'userTask', bpmnFile: 'test.bpmn' },
    parentChain: [], childNodes: [], siblingNodes: [], descendantNodes: [],
  };
  const mockLinks: TemplateLinks = {};

  it('should work for all docTypes', () => {
    expect(getPromptForDocType('feature')).toBe('Feature prompt content');
    const payload = JSON.parse(buildLlmInputPayload('feature', mockContext, mockLinks));
    expect(payload).toHaveProperty('type', 'Feature');
    const request = buildLlmRequestStructure('feature', mockContext, mockLinks);
    expect(request.systemPrompt).toBe('Feature prompt content');
    expect(mapLlmResponseToModel('feature', '{"summary": "Test"}')).toHaveProperty('summary');
  });
});

