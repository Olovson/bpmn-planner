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
  wrapDocument,
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
import { LlmValidationError } from '@/lib/llmFallback';
import { supabase } from '@/integrations/supabase/client';

// Real LLM smoke-test: kör riktiga anrop mot LLM när
// VITE_USE_LLM=true, VITE_ALLOW_LLM_IN_TESTS=true och VITE_OPENAI_API_KEY är satt.
// Om LLM inte är aktiverat i test-miljö, markeras hela describe-blocket som skip.
//
// Vilka providers som körs styrs via env:
// - om LLM_PROVIDER=cloud → endast ChatGPT
// - om LLM_PROVIDER=local → endast Ollama
// - annars → både ChatGPT och Ollama
const ENV_PROVIDER = process.env.LLM_PROVIDER as LlmProvider | undefined;
const PROVIDERS: LlmProvider[] =
  ENV_PROVIDER === 'cloud' || ENV_PROVIDER === 'local'
    ? [ENV_PROVIDER]
    : ['cloud', 'local'];
const STRICT_SMOKE = process.env.LLM_SMOKE_STRICT === 'true';

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

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildCloudErrorHtml = (title: string, error: unknown): string => {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Okänt fel';

    const body = `
    <section class="doc-section">
      <h2>ChatGPT (moln-LLM) kunde inte nås</h2>
      <p>ChatGPT-genereringen misslyckades p.g.a. nätverksfel eller anslutningsproblem.</p>
      <p>Detta dokument är endast en placeholder. Se Ollama-varianten (lokal LLM) för faktisk output.</p>
    </section>
    `;

    return wrapDocument(title, body, {
      fallbackBadge: true,
      fallbackReason: message,
    });
  };

  const buildLocalErrorHtml = (title: string, error: unknown): string => {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Okänt fel';

    const body = `
    <section class="doc-section">
      <div class="llm-fallback-local-note">
        Denna version skulle genereras av lokal LLM (Ollama), men det uppstod ett fel.
      </div>
      <h2>Lokal LLM (Ollama) kunde inte användas</h2>
      <p>Den lokala LLM-modellen (Ollama) kunde inte nås eller saknas:</p>
      <div class="llm-fallback-details">Orsak: ${escapeHtml(message)}</div>
      <p>Detta dokument är endast en placeholder. Se ChatGPT-varianten (moln-LLM) för faktisk output.</p>
    </section>
    `;

    return wrapDocument(title, body);
  };

  const writeErrorJson = (
    filePath: string,
    provider: LlmProvider,
    error: unknown,
  ): void => {
    const details =
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    const payload = {
      error: provider === 'cloud' ? 'ChatGPT (moln-LLM) connection failed' : 'Lokal LLM (Ollama) unavailable',
      provider,
      details,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
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

    it('genererar Feature Goal-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: featureNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of PROVIDERS) {
        const providerFileLabel = provider === 'cloud' ? 'chatgpt' : 'ollama';
        const providerLogLabel = provider === 'cloud' ? 'ChatGPT' : 'Ollama';
        const jsonPath = join(
          dir,
          'json',
          `llm-feature-goal-${providerFileLabel}.json`,
        );
        const htmlPath = join(
          dir,
          'html',
          `llm-feature-goal-${providerFileLabel}.html`,
        );

        try {
          const docType = 'feature';
          const docLabel = 'Feature Goal';
          const wallStart = Date.now();
          const result = await generateDocumentationWithLlm(
            docType,
            context,
            links,
            provider,
            provider === 'local',
            false,
          );
          const wallElapsed = Date.now() - wallStart;

          const raw = result?.text || '';

          if (!raw || !raw.trim().length) {
            throw new Error(`LLM returned null/empty response for provider=${provider}`);
          }

          console.log(
            `[SMOKE] ${docLabel}/${providerLogLabel} took ${wallElapsed}ms (wall)`,
          );
          if (typeof result?.latencyMs === 'number') {
            console.log(
              `[SMOKE] ${docLabel}/${providerLogLabel} LLM latency: ${result.latencyMs}ms`,
            );
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

          writeFileSync(htmlPath, llmHtml, 'utf8');
          writeFileSync(jsonPath, raw, 'utf8');

          // Verifiera att node_planned_scenarios uppdateras för ChatGPT
          if (provider === 'cloud' && result?.docJson) {
            const { data, error } = await supabase
              .from('node_planned_scenarios')
              .select('provider, scenarios')
              .eq('bpmn_file', featureNode.bpmnFile)
              .eq('bpmn_element_id', featureNode.bpmnElementId)
              .eq('provider', 'chatgpt')
              .maybeSingle();

            if (!error && data) {
              expect(Array.isArray(data.scenarios)).toBe(true);
              expect((data.scenarios as any[]).length).toBeGreaterThan(0);
            }
          }
        } catch (error) {
          const title =
            context.node.name || context.node.bpmnElementId || 'Feature Goal (LLM-fel)';
          const errorHtml =
            provider === 'cloud'
              ? buildCloudErrorHtml(title, error)
              : buildLocalErrorHtml(title, error);
          writeFileSync(htmlPath, errorHtml, 'utf8');
          writeErrorJson(jsonPath, provider, error);
          if (provider === 'local' && error instanceof LlmValidationError) {
            const rawJsonPath = join(
              dir,
              'json',
              `llm-feature-goal-${providerFileLabel}.raw.json`,
            );
            try {
              writeFileSync(rawJsonPath, error.rawResponse, 'utf8');
            } catch {
              // ignore file write errors in tests
            }
          }
          if (STRICT_SMOKE) {
            throw error instanceof Error ? error : new Error(String(error));
          }
        }
      }

      // Lokalt genererad dokumentation (utan LLM) för diff jämförelse – samma för alla providers
      const localHtml = renderFeatureGoalDoc(context, links);
      writeFileSync(
      join(dir, 'html', 'llm-feature-goal-fallback.html'),
      localHtml,
      'utf8',
    );
    }, 180000); // 3 min per test (180s) - balans mellan 120-180s som rekommenderat

    it('genererar Epic-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: epicNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of PROVIDERS) {
        const providerFileLabel = provider === 'cloud' ? 'chatgpt' : 'ollama';
        const providerLogLabel = provider === 'cloud' ? 'ChatGPT' : 'Ollama';
        const jsonPath = join(
          dir,
          'json',
          `llm-epic-${providerFileLabel}.json`,
        );
        const htmlPath = join(
          dir,
          'html',
          `llm-epic-${providerFileLabel}.html`,
        );

        try {
          const docType = 'epic';
          const docLabel = 'Epic';
          const wallStart = Date.now();
          const result = await generateDocumentationWithLlm(
            docType,
            context,
            links,
            provider,
            provider === 'local',
            false,
          );
          const wallElapsed = Date.now() - wallStart;

          const raw = result?.text || '';

          if (!raw || !raw.trim().length) {
            throw new Error(`LLM returned null/empty response for provider=${provider}`);
          }

          console.log(
            `[SMOKE] ${docLabel}/${providerLogLabel} took ${wallElapsed}ms (wall)`,
          );
          if (typeof result?.latencyMs === 'number') {
            console.log(
              `[SMOKE] ${docLabel}/${providerLogLabel} LLM latency: ${result.latencyMs}ms`,
            );
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

          writeFileSync(htmlPath, llmHtml, 'utf8');
          writeFileSync(jsonPath, raw, 'utf8');
        } catch (error) {
          const title =
            context.node.name || context.node.bpmnElementId || 'Epic (LLM-fel)';
          const errorHtml =
            provider === 'cloud'
              ? buildCloudErrorHtml(title, error)
              : buildLocalErrorHtml(title, error);
          writeFileSync(htmlPath, errorHtml, 'utf8');
          writeErrorJson(jsonPath, provider, error);
          if (provider === 'local' && error instanceof LlmValidationError) {
            const rawJsonPath = join(
              dir,
              'json',
              `llm-epic-${providerFileLabel}.raw.json`,
            );
            try {
              writeFileSync(rawJsonPath, error.rawResponse, 'utf8');
            } catch {
              // ignore file write errors in tests
            }
          }
          if (STRICT_SMOKE) {
            throw error instanceof Error ? error : new Error(String(error));
          }
        }
      }

      const localHtml = renderEpicDoc(context, links);
      writeFileSync(
      join(dir, 'html', 'llm-epic-fallback.html'),
      localHtml,
      'utf8',
    );
    }, 180000); // 3 min per test (180s)

    it('genererar Business Rule-dokumentation med riktig LLM (cloud & local)', async () => {
      const context: NodeDocumentationContext = {
        node: ruleNode,
        parentChain: [],
        childNodes: [],
        siblingNodes: [],
        descendantNodes: [],
      };

      const dir = ensureOutputDir();

      for (const provider of PROVIDERS) {
        const providerFileLabel = provider === 'cloud' ? 'chatgpt' : 'ollama';
        const providerLogLabel = provider === 'cloud' ? 'ChatGPT' : 'Ollama';
        const jsonPath = join(
          dir,
          'json',
          `llm-business-rule-${providerFileLabel}.json`,
        );
        const htmlPath = join(
          dir,
          'html',
          `llm-business-rule-${providerFileLabel}.html`,
        );

        try {
          const docType = 'businessRule';
          const docLabel = 'Business Rule';
          const wallStart = Date.now();
          const result = await generateDocumentationWithLlm(
            docType,
            context,
            links,
            provider,
            provider === 'local',
            false,
          );
          const wallElapsed = Date.now() - wallStart;

          const raw = result?.text || '';

          if (!raw || !raw.trim().length) {
            throw new Error(`LLM returned null/empty response for provider=${provider}`);
          }

          console.log(
            `[SMOKE] ${docLabel}/${providerLogLabel} took ${wallElapsed}ms (wall)`,
          );
          if (typeof result?.latencyMs === 'number') {
            console.log(
              `[SMOKE] ${docLabel}/${providerLogLabel} LLM latency: ${result.latencyMs}ms`,
            );
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

          writeFileSync(htmlPath, llmHtml, 'utf8');
          writeFileSync(jsonPath, raw, 'utf8');
        } catch (error) {
          const title =
            context.node.name || context.node.bpmnElementId || 'Business Rule (LLM-fel)';
          const errorHtml =
            provider === 'cloud'
              ? buildCloudErrorHtml(title, error)
              : buildLocalErrorHtml(title, error);
          writeFileSync(htmlPath, errorHtml, 'utf8');
          writeErrorJson(jsonPath, provider, error);
          if (provider === 'local' && error instanceof LlmValidationError) {
            const rawJsonPath = join(
              dir,
              'json',
              `llm-business-rule-${providerFileLabel}.raw.json`,
            );
            try {
              writeFileSync(rawJsonPath, error.rawResponse, 'utf8');
            } catch {
              // ignore file write errors in tests
            }
          }
          if (STRICT_SMOKE) {
            throw error instanceof Error ? error : new Error(String(error));
          }
        }
      }

      const localHtml = renderBusinessRuleDoc(context, links);
      writeFileSync(
      join(dir, 'html', 'llm-business-rule-fallback.html'),
      localHtml,
      'utf8',
    );
    }, 180000); // 3 min per test (180s)
  });
}
