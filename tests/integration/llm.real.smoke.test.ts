import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isLlmEnabled } from '@/lib/llmClient';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';
import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import {
  renderFeatureGoalDocFromLlm,
  renderEpicDocFromLlm,
  renderBusinessRuleDocFromLlm,
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import {
  __setAllowFeatureGoalLlmFallbackForTests,
  mapFeatureGoalLlmToSections,
} from '@/lib/featureGoalLlmMapper';
import { __setAllowEpicLlmFallbackForTests, mapEpicLlmToSections } from '@/lib/epicLlmMapper';
import {
  __setAllowBusinessRuleLlmFallbackForTests,
  mapBusinessRuleLlmToSections,
} from '@/lib/businessRuleLlmMapper';

// Real LLM smoke-test: kör riktiga anrop mot LLM när
// VITE_USE_LLM=true, VITE_ALLOW_LLM_IN_TESTS=true och VITE_OPENAI_API_KEY är satt.
// Om LLM inte är aktiverat i test-miljö, markeras hela describe-blocket som skip.
//
const PROVIDERS: LlmProvider[] = ['cloud', 'local'];

if (!isLlmEnabled()) {
  describe.skip('Real LLM smoke tests (skipped – LLM not enabled in tests)', () => {
    it('skipped', () => {
      // no-op
    });
  });
} else {
  const injectOriginComment = (html: string, comment: string): string => {
    const marker = '<div class="doc-shell">';
    const index = html.indexOf(marker);
    if (index === -1) return html;
    const insertAt = index + marker.length;
    return `${html.slice(0, insertAt)}\n  ${comment}${html.slice(insertAt)}`;
  };

  describe('Real LLM smoke tests (cloud + local)', () => {
    const outputDir = join(process.cwd(), 'tests', 'llm-output');

    const ensureOutputDir = () => {
      try {
        mkdirSync(outputDir, { recursive: true });
        mkdirSync(join(outputDir, 'html'), { recursive: true });
        mkdirSync(join(outputDir, 'json'), { recursive: true });
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

    const providers: LlmProvider[] = PROVIDERS;

    it('genererar Feature Goal-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: featureNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of providers) {
        const raw = await generateDocumentationWithLlm(
          'feature',
          context,
          links,
          provider,
          provider === 'local',
        );

        if (!raw || !raw.trim().length) {
          if (provider === 'local') {
            throw new Error(
              'Local LLM returned empty response. Make sure Ollama is running and the model is available.',
            );
          }
          throw new Error(`LLM returned empty response for provider=${provider}`);
        }

        const sections = mapFeatureGoalLlmToSections(raw || '');

        const originComment =
          '<!-- LLM_SECTION_ORIGIN: ' +
          [
            `summary=${sections.summary ? 'llm' : 'fallback'}`,
            `effectGoals=${sections.effectGoals.length ? 'llm' : 'fallback'}`,
            `scopeIncluded=${sections.scopeIncluded.length ? 'llm' : 'fallback'}`,
            `scopeExcluded=${sections.scopeExcluded.length ? 'llm' : 'fallback'}`,
            `epics=${sections.epics.length ? 'llm' : 'fallback'}`,
            `flowSteps=${sections.flowSteps.length ? 'llm' : 'fallback'}`,
            `dependencies=${sections.dependencies.length ? 'llm' : 'fallback'}`,
            `scenarios=${sections.scenarios.length ? 'llm' : 'fallback'}`,
            `testDescription=${sections.testDescription ? 'llm' : 'fallback'}`,
            `implementationNotes=${sections.implementationNotes.length ? 'llm' : 'fallback'}`,
            `relatedItems=${sections.relatedItems.length ? 'llm' : 'fallback'}`,
            // Tekniska & externa beroenden saknar eget LLM-fält och är alltid fallback i HTML-buildern
            'technicalDependencies=fallback',
          ].join(', ') +
          ' -->';

        const llmHtmlRaw = renderFeatureGoalDocFromLlm(context, links, raw || '');
        const llmHtml = injectOriginComment(llmHtmlRaw, originComment);
        expect(llmHtml).toContain('Feature Goal');
        expect(llmHtml).toContain('Sammanfattning');

        // Lokalt genererad dokumentation (utan LLM) för diff jämförelse
        const localHtml = renderFeatureGoalDoc(context, links);

        writeFileSync(
          join(dir, 'html', `llm-feature-goal-smoke.${provider}.html`),
          llmHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'html', 'local-feature-goal-smoke.html'),
          localHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'json', `llm-feature-goal-smoke.${provider}.json`),
          raw,
          'utf8',
        );
      }
    }, 60000);

    it('genererar Epic-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: epicNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of providers) {
        const raw = await generateDocumentationWithLlm(
          'epic',
          context,
          links,
          provider,
          provider === 'local',
        );

        if (!raw || !raw.trim().length) {
          if (provider === 'local') {
            throw new Error(
              'Local LLM returned empty response. Make sure Ollama is running and the model is available.',
            );
          }
          throw new Error(`LLM returned empty response for provider=${provider}`);
        }

        const sections = mapEpicLlmToSections(raw || '');

        const originComment =
          '<!-- LLM_SECTION_ORIGIN: ' +
          [
            `summary=${sections.summary ? 'llm' : 'fallback'}`,
            `prerequisites=${sections.prerequisites.length ? 'llm' : 'fallback'}`,
            `inputs=${sections.inputs.length ? 'llm' : 'fallback'}`,
            `flowSteps=${sections.flowSteps.length ? 'llm' : 'fallback'}`,
            `interactions=${sections.interactions.length ? 'llm' : 'fallback'}`,
            `dataContracts=${sections.dataContracts.length ? 'llm' : 'fallback'}`,
            `businessRulesPolicy=${sections.businessRulesPolicy.length ? 'llm' : 'fallback'}`,
            `scenarios=${sections.scenarios.length ? 'llm' : 'fallback'}`,
            `testDescription=${sections.testDescription ? 'llm' : 'fallback'}`,
            `implementationNotes=${sections.implementationNotes.length ? 'llm' : 'fallback'}`,
            `relatedItems=${sections.relatedItems.length ? 'llm' : 'fallback'}`,
            // Tekniska & externa beroenden-sektionen har ingen dedikerad LLM-del i modellen
            'technicalDependencies=fallback',
          ].join(', ') +
          ' -->';

        const llmHtmlRaw = renderEpicDocFromLlm(context, links, raw || '');
        const llmHtml = injectOriginComment(llmHtmlRaw, originComment);
        expect(llmHtml).toContain('Epic');
        expect(llmHtml).toContain('Syfte');

        const localHtml = renderEpicDoc(context, links);

        writeFileSync(
          join(dir, 'html', `llm-epic-smoke.${provider}.html`),
          llmHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'html', 'local-epic-smoke.html'),
          localHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'json', `llm-epic-smoke.${provider}.json`),
          raw,
          'utf8',
        );
      }
    }, 60000);

    it('genererar Business Rule-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: ruleNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of providers) {
        const raw = await generateDocumentationWithLlm(
          'businessRule',
          context,
          links,
          provider,
          provider === 'local',
        );

        if (!raw || !raw.trim().length) {
          if (provider === 'local') {
            throw new Error(
              'Local LLM returned empty response. Make sure Ollama is running and the model is available.',
            );
          }
          throw new Error(`LLM returned empty response for provider=${provider}`);
        }

        const sections = mapBusinessRuleLlmToSections(raw || '');

        const originComment =
          '<!-- LLM_SECTION_ORIGIN: ' +
          [
            `summary=${sections.summary ? 'llm' : 'fallback'}`,
            `inputs=${sections.inputs.length ? 'llm' : 'fallback'}`,
            `decisionLogic=${sections.decisionLogic.length ? 'llm' : 'fallback'}`,
            `outputs=${sections.outputs.length ? 'llm' : 'fallback'}`,
            `businessRulesPolicy=${sections.businessRulesPolicy.length ? 'llm' : 'fallback'}`,
            `scenarios=${sections.scenarios.length ? 'llm' : 'fallback'}`,
            `testDescription=${sections.testDescription ? 'llm' : 'fallback'}`,
            `implementationNotes=${sections.implementationNotes.length ? 'llm' : 'fallback'}`,
            `relatedItems=${sections.relatedItems.length ? 'llm' : 'fallback'}`,
          ].join(', ') +
          ' -->';

        const llmHtmlRaw = renderBusinessRuleDocFromLlm(context, links, raw || '');
        const llmHtml = injectOriginComment(llmHtmlRaw, originComment);
        expect(llmHtml).toContain('Business Rule');
        expect(llmHtml).toContain('Sammanfattning');

        const localHtml = renderBusinessRuleDoc(context, links);

        writeFileSync(
          join(dir, 'html', `llm-business-rule-smoke.${provider}.html`),
          llmHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'html', 'local-business-rule-smoke.html'),
          localHtml,
          'utf8',
        );
        writeFileSync(
          join(dir, 'json', `llm-business-rule-smoke.${provider}.json`),
          raw,
          'utf8',
        );
      }
    }, 60000);
  });
}
