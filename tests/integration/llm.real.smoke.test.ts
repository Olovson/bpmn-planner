import { describe, it, expect } from 'vitest';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderFeatureGoalDocFromLlm,
  renderEpicDocFromLlm,
  renderBusinessRuleDocFromLlm,
  type TemplateLinks,
} from '@/lib/documentationTemplates';

// Real LLM smoke-test: kör riktiga anrop mot LLM när
// VITE_USE_LLM=true, VITE_ALLOW_LLM_IN_TESTS=true och VITE_OPENAI_API_KEY är satt.
// Om LLM inte är aktiverat i test-miljö, markeras hela describe-blocket som skip.

if (!isLlmEnabled()) {
  describe.skip('Real LLM smoke tests (skipped – LLM not enabled in tests)', () => {
    it('skipped', () => {
      // no-op
    });
  });
} else {
  describe('Real LLM smoke tests', () => {
    const featureNode: BpmnProcessNode = {
      id: 'mortgage:Call_InternalData',
      name: 'Internal data gathering',
      type: 'callActivity',
      bpmnFile: 'mortgage-se-application.bpmn',
      bpmnElementId: 'internal-data-gathering',
      children: [],
    } as any;

    const epicNode: BpmnProcessNode = {
      id: 'mortgage:Task_Approve',
      name: 'Approve Application',
      type: 'userTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Task_Approve',
      children: [],
    } as any;

    const ruleNode: BpmnProcessNode = {
      id: 'mortgage:Rule_Eligibility',
      name: 'Eligibility Rule',
      type: 'businessRuleTask',
      bpmnFile: 'mortgage.bpmn',
      bpmnElementId: 'Rule_Eligibility',
      children: [],
    } as any;

    const links: TemplateLinks = {
      bpmnViewerLink: '#/bpmn/mortgage.bpmn',
      dorLink: undefined,
      testLink: 'tests/mortgage.smoke.spec.ts',
      docLink: undefined,
      dmnLink: '/dmn/example.dmn',
    };

    it('genererar Feature Goal-dokumentation med riktig LLM', async () => {
      const context: NodeDocumentationContext = {
        node: featureNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const raw = await generateDocumentationWithLlm('feature', context, links);
      expect(raw && raw.trim().length).toBeGreaterThan(0);

      const html = renderFeatureGoalDocFromLlm(context, links, raw || '');
      expect(html).toContain('Feature Goal');
      expect(html).toContain('Sammanfattning');
    }, 60000);

    it('genererar Epic-dokumentation med riktig LLM', async () => {
      const context: NodeDocumentationContext = {
        node: epicNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const raw = await generateDocumentationWithLlm('epic', context, links);
      expect(raw && raw.trim().length).toBeGreaterThan(0);

      const html = renderEpicDocFromLlm(context, links, raw || '');
      expect(html).toContain('Epic');
      expect(html).toContain('Syfte');
    }, 60000);

    it('genererar Business Rule-dokumentation med riktig LLM', async () => {
      const context: NodeDocumentationContext = {
        node: ruleNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const raw = await generateDocumentationWithLlm('businessRule', context, links);
      expect(raw && raw.trim().length).toBeGreaterThan(0);

      const html = renderBusinessRuleDocFromLlm(context, links, raw || '');
      expect(html).toContain('Business Rule');
      expect(html).toContain('Sammanfattning');
    }, 60000);
  });
}

