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
    node: {
      id: 'test-node',
      bpmnElementId: 'test-node',
      name: 'Test Node',
      type: 'userTask',
      bpmnFile: 'test.bpmn',
    },
    parentChain: [],
    childNodes: [],
    siblingNodes: [],
    descendantNodes: [],
  };

  const mockLinks: TemplateLinks = {};

  describe('getPromptForDocType', () => {
    it('should return correct prompt for each docType', () => {
      expect(getPromptForDocType('feature')).toBe('Feature prompt content');
      expect(getPromptForDocType('epic')).toBe('Epic prompt content');
      expect(getPromptForDocType('businessRule')).toBe('Business Rule prompt content');
    });
  });

  describe('buildLlmInputPayload', () => {
    it('should build valid JSON payload for all docTypes', () => {
      const featurePayload = JSON.parse(buildLlmInputPayload('feature', mockContext, mockLinks));
      expect(featurePayload).toHaveProperty('type', 'Feature');
      expect(featurePayload).toHaveProperty('processContext');
      expect(featurePayload).toHaveProperty('currentNodeContext');

      const epicPayload = JSON.parse(buildLlmInputPayload('epic', mockContext, mockLinks));
      expect(epicPayload).toHaveProperty('type', 'Epic');

      const businessRulePayload = JSON.parse(buildLlmInputPayload('businessRule', mockContext, mockLinks));
      expect(businessRulePayload).toHaveProperty('processContext');
    });
  });

  describe('buildLlmRequestStructure', () => {
    it('should build complete request structure with correct prompts', () => {
      const request = buildLlmRequestStructure('feature', mockContext, mockLinks);
      expect(request).toHaveProperty('systemPrompt');
      expect(request).toHaveProperty('userPrompt');
      expect(request.systemPrompt).toBe('Feature prompt content');
      expect(request.userPrompt).toContain('"type": "Feature"');
    });
  });

  describe('mapLlmResponseToModel', () => {
    it('should map LLM responses to correct models', () => {
      const featureModel = mapLlmResponseToModel('feature', '{"summary": "Test"}');
      expect(featureModel).toHaveProperty('summary');
      expect(featureModel.summary).toContain('Feature:');

      const epicModel = mapLlmResponseToModel('epic', '{"summary": "Test"}');
      expect(epicModel.summary).toContain('Epic:');

      const businessRuleModel = mapLlmResponseToModel('businessRule', '{"summary": "Test"}');
      expect(businessRuleModel.summary).toContain('Business Rule:');
    });
  });
});

