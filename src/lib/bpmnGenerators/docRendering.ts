import type { NodeDocumentationContext } from '../documentationContext';
import type { TemplateLinks } from '../documentationTemplates';
import {
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
} from '../documentationTemplates';
import { generateDocumentationWithLlm, type DocumentationDocType, type ChildNodeDocumentation } from '../llmDocumentation';
import { wrapLlmContentAsDocument } from '../wrapLlmContent';
import { saveLlmDebugArtifact } from '../llmDebugStorage';
import { logLlmFallback } from '../llmMonitoring';
import { isLlmEnabled } from '../llmClient';
import { getLlmClient } from '../llmClients';
import type { LlmProvider } from '../llmClientAbstraction';
import type { ProcessPath, FlowGraph } from '../bpmnFlowExtractor';
import { supabase } from '@/integrations/supabase/client';

/**
 * Insert generation metadata into HTML
 */
export function insertGenerationMeta(html: string, source: string): string {
  if (!source) return html;
  if (html.includes('x-generation-source')) return html;
  const metaTag = `<meta name="x-generation-source" content="${source}" />`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n  ${metaTag}`);
  }
  return `<!-- generation-source:${source} -->\n${html}`;
}

/**
 * Extract documentation information from docJson
 */
export function extractDocInfoFromJson(docJson: unknown): {
  summary: string;
  flowSteps: string[];
  inputs?: string[];
  outputs?: string[];
  scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
} | null {
  if (!docJson || typeof docJson !== 'object') return null;
  
  const obj = docJson as any;
  return {
    summary: obj.summary || '',
    flowSteps: Array.isArray(obj.flowSteps) ? obj.flowSteps : [],
    inputs: Array.isArray(obj.inputs) ? obj.inputs : undefined,
    outputs: Array.isArray(obj.outputs) ? obj.outputs : undefined,
    scenarios: Array.isArray(obj.scenarios) ? obj.scenarios : undefined,
  };
}

/**
 * Load child documentation from Storage
 * This is used when leaf nodes are skipped but we still need to collect
 * child documentation for Feature Goals.
 */
export async function loadChildDocFromStorage(
  bpmnFile: string,
  elementId: string,
  docFileKey: string,
  versionHash: string | null,
  generationSourceLabel: string
): Promise<{
  summary: string;
  flowSteps: string[];
  inputs?: string[];
  outputs?: string[];
  scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
} | null> {
  try {
    // Försök ladda JSON från llm-debug/docs-raw/ först (snabbast och mest komplett)
    const identifier = `${bpmnFile}-${elementId}`;
    const safeId = identifier.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    const { data: rawFiles, error: rawError } = await supabase.storage
      .from('bpmn-files')
      .list('llm-debug/docs-raw', {
        search: safeId,
        limit: 100,
      });
    
    if (!rawError && rawFiles && rawFiles.length > 0) {
      // Sortera manuellt efter created_at (nyaste först)
      rawFiles.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      
      const latestRawFile = rawFiles[0];
      const { data: rawData, error: downloadError } = await supabase.storage
        .from('bpmn-files')
        .download(`llm-debug/docs-raw/${latestRawFile.name}`);
      
      if (!downloadError && rawData) {
        const rawText = await rawData.text();
        try {
          // Parse JSON från raw text (använd samma logik som i llmDocumentation.ts)
          let jsonText = rawText.trim();
          jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
          jsonText = jsonText.replace(/\/\/.*$/gm, '');
          jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
          
          const firstBrace = jsonText.indexOf('{');
          if (firstBrace >= 0) {
            jsonText = jsonText.slice(firstBrace);
            let braceCount = 0;
            let end = -1;
            for (let i = 0; i < jsonText.length; i++) {
              if (jsonText[i] === '{') braceCount++;
              if (jsonText[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  end = i + 1;
                  break;
                }
              }
            }
            if (end > 0) {
              jsonText = jsonText.slice(0, end);
            }
          }
          
          const docJson = JSON.parse(jsonText);
          const docInfo = extractDocInfoFromJson(docJson);
          if (docInfo) {
            if (import.meta.env.DEV) {
              console.log(`[bpmnGenerators] ✅ Loaded child doc from llm-debug/docs-raw for ${elementId}`);
            }
            return docInfo;
          }
        } catch (parseError) {
          // Ignorera parse-fel, försök nästa metod
          if (import.meta.env.DEV) {
            console.warn(`[bpmnGenerators] Could not parse JSON from llm-debug/docs-raw for ${elementId}:`, parseError);
          }
        }
      }
    }
    
    // Fallback: Försök ladda HTML och extrahera information (mer komplext, görs senare om behövs)
    // För nu, returnera null så att Feature Goals samlar från andra noder som faktiskt genereras
    
    return null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[bpmnGenerators] Error loading child doc from Storage for ${elementId}:`, error);
    }
    return null;
  }
}

/**
 * Generates documentation using LLM. REQUIRES LLM to work - no fallback.
 * If LLM is disabled or fails, throws an error.
 */
export async function renderDocWithLlm(
  docType: DocumentationDocType,
  context: NodeDocumentationContext,
  links: TemplateLinks,
  llmAllowed: boolean,
  llmProvider?: LlmProvider,
  onLlmResult?: (provider: LlmProvider, fallbackUsed: boolean, docJson?: unknown) => void,
  childrenDocumentation?: Map<string, {
    summary: string;
    flowSteps: string[];
    inputs?: string[];
    outputs?: string[];
  }>,
  structuralInfo?: { paths: ProcessPath[]; flowGraph?: FlowGraph },
  checkCancellation?: () => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const llmActive = llmAllowed && isLlmEnabled();
  const basePayload = {
    docType,
    nodeId: context.node.bpmnElementId,
    nodeName: context.node.name,
    bpmnFile: context.node.bpmnFile,
  };

  // LLM måste vara aktivt - inga fallbacks
  if (!llmActive) {
    throw new Error(`LLM is required for ${docType} documentation generation but is disabled or not available`);
  }

  // Kontrollera avbrytning INNAN LLM-anrop
  if (checkCancellation) {
    checkCancellation();
  }

  try {
    // Convert childrenDocumentation to ChildNodeDocumentation format if needed
    const convertedChildrenDoc = childrenDocumentation ? new Map<string, ChildNodeDocumentation>() : undefined;
    if (childrenDocumentation && convertedChildrenDoc) {
      // We need to get node info from graph, but for now we'll create a minimal conversion
      // The actual conversion should happen at the call site where we have node information
      for (const [key, value] of childrenDocumentation.entries()) {
        convertedChildrenDoc.set(key, {
          id: key,
          name: key,
          type: 'unknown',
          summary: value.summary,
          flowSteps: value.flowSteps,
          inputs: value.inputs,
          outputs: value.outputs,
        });
      }
    }
    
    const llmResult = await generateDocumentationWithLlm(
      docType,
      context,
      links,
      llmProvider,
      false, // localAvailable
      true, // allowFallback
      convertedChildrenDoc,
      abortSignal, // Pass abort signal for LLM calls
      structuralInfo, // structuralInfo
    );
    
    if (!llmResult || !llmResult.text || !llmResult.text.trim()) {
      throw new Error(`LLM returned empty response for ${docType} documentation (${context.node.bpmnFile}::${context.node.bpmnElementId})`);
    }

    onLlmResult?.(llmResult.provider, llmResult.fallbackUsed, llmResult.docJson);
    // Hämta provider-info för metadata från faktisk provider
    const llmClient = getLlmClient(llmResult.provider);
    
    // Map provider to 'cloud' | 'local' for LlmMetadata
    const providerForMetadata: 'cloud' | 'local' = 
      llmClient.provider === 'cloud' ? 'cloud' : 'local';
    const finalProviderForMetadata: 'cloud' | 'local' = 
      llmResult.provider === 'cloud' ? 'cloud' : 'local';
    
    const llmMetadata = {
      llmMetadata: {
        provider: providerForMetadata,
        model: llmClient.modelName,
      },
      fallbackUsed: llmResult.fallbackUsed,
      finalProvider: finalProviderForMetadata,
    };

    // Use unified render functions - they handle base + overrides + LLM patch
    if (docType === 'feature') {
      return await renderFeatureGoalDoc(context, links, llmResult.text, llmMetadata);
    }

    if (docType === 'epic') {
      return await renderEpicDoc(context, links, llmResult.text, llmMetadata);
    }

    if (docType === 'businessRule') {
      return await renderBusinessRuleDoc(context, links, llmResult.text, llmMetadata);
    }

    const identifier = `${context.node.bpmnFile || 'unknown'}-${context.node.bpmnElementId || context.node.id}`;
    await saveLlmDebugArtifact('doc', identifier, llmResult.text);
    const title =
      context.node.name ||
      context.node.bpmnElementId ||
      (docType === 'feature'
        ? 'Feature'
        : docType === 'epic'
        ? 'Epic'
        : 'Business Rule');
    const wrapped = wrapLlmContentAsDocument(llmResult.text, title, { docType });
    if (!/<html[\s>]/i.test(wrapped) || !/<body[\s>]/i.test(wrapped)) {
      throw new Error(`LLM returned invalid HTML for ${docType} documentation (${context.node.bpmnFile}::${context.node.bpmnElementId})`);
    }
    return wrapped;
  } catch (error) {
    console.error(`[LLM Documentation] Failed to generate ${docType} documentation for ${context.node.bpmnFile}::${context.node.bpmnElementId}:`, error);
    await logLlmFallback({
      eventType: 'documentation',
      status: 'error',
      reason: error instanceof Error ? error.message : 'unknown-error',
      error,
      ...basePayload,
    });
    // Kasta fel vidare - inga fallbacks
    throw error;
  }
}

