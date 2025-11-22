import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderFeatureGoalDocFromLlm,
  renderEpicDocFromLlm,
  renderBusinessRuleDocFromLlm,
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { __setAllowFeatureGoalLlmFallbackForTests } from '@/lib/featureGoalLlmMapper';
import { __setAllowEpicLlmFallbackForTests } from '@/lib/epicLlmMapper';
import { __setAllowBusinessRuleLlmFallbackForTests } from '@/lib/businessRuleLlmMapper';

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
    const outputDir = join(process.cwd(), 'tests', 'llm-output');

    const ensureOutputDir = () => {
      try {
        mkdirSync(outputDir, { recursive: true });
      } catch {
        // ignore mkdir errors in tests
      }
      return outputDir;
    };

    // Stäng av LLM-fallback i dessa tester så vi verifierar
    // att modellen returnerar strukturerad JSON enligt kontraktet.
    beforeAll(() => {
      __setAllowFeatureGoalLlmFallbackForTests(false);
      __setAllowEpicLlmFallbackForTests(false);
      __setAllowBusinessRuleLlmFallbackForTests(false);
    });

    afterAll(() => {
      __setAllowFeatureGoalLlmFallbackForTests(true);
      __setAllowEpicLlmFallbackForTests(true);
      __setAllowBusinessRuleLlmFallbackForTests(true);
    });

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

      const llmHtml = renderFeatureGoalDocFromLlm(context, links, raw || '');
      expect(llmHtml).toContain('Feature Goal');
      expect(llmHtml).toContain('Sammanfattning');

      // Lokalt genererad dokumentation (utan LLM) för diff jämförelse
      const localHtml = renderFeatureGoalDoc(context, links);

      const dir = ensureOutputDir();
      writeFileSync(join(dir, 'llm-feature-goal-smoke.html'), llmHtml, 'utf8');
      writeFileSync(join(dir, 'local-feature-goal-smoke.html'), localHtml, 'utf8');
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

      const llmHtml = renderEpicDocFromLlm(context, links, raw || '');
      expect(llmHtml).toContain('Epic');
      expect(llmHtml).toContain('Syfte');

      const localHtml = renderEpicDoc(context, links);

      const dir = ensureOutputDir();
      writeFileSync(join(dir, 'llm-epic-smoke.html'), llmHtml, 'utf8');
      writeFileSync(join(dir, 'local-epic-smoke.html'), localHtml, 'utf8');
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

      const llmHtml = renderBusinessRuleDocFromLlm(context, links, raw || '');
      expect(llmHtml).toContain('Business Rule');
      expect(llmHtml).toContain('Sammanfattning');

      const localHtml = renderBusinessRuleDoc(context, links);

      const dir = ensureOutputDir();
      writeFileSync(join(dir, 'llm-business-rule-smoke.html'), llmHtml, 'utf8');
      writeFileSync(join(dir, 'local-business-rule-smoke.html'), localHtml, 'utf8');
    }, 60000);
  });
}
