import type { NodeDocumentationContext } from '@/lib/documentationContext';
import type { DocumentationDocType, ChildNodeDocumentation } from '@/lib/llmDocumentation';
import { generateDocumentationWithLlm } from '@/lib/llmDocumentation';
import { generateTestSpecWithLlm } from '@/lib/llmTests';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { getLlmClient, getDefaultLlmProvider } from '@/lib/llmClients';
import { logLlmFallback } from '@/lib/llmMonitoring';
import { saveLlmDebugArtifact } from '@/lib/llmDebugStorage';

export interface LlmGenerationResult {
  content: string;
  docJson?: unknown;
  provider: LlmProvider;
  fallbackUsed: boolean;
}

export interface LlmGenerationService {
  getDefaultProvider(): LlmProvider;
  getClient(provider?: LlmProvider): ReturnType<typeof getLlmClient>;
  generateNodeDocumentation(
    docType: DocumentationDocType,
    context: NodeDocumentationContext,
    docLinks: { bpmnViewerLink: string; dorLink?: string; testLink?: string },
    useLlm: boolean,
    preferredProvider?: LlmProvider,
    checkCancellation?: () => void,
    abortSignal?: AbortSignal,
  ): Promise<LlmGenerationResult>;
  generateNodeTestSpecs(options: {
    context: NodeDocumentationContext;
    provider: LlmProvider;
    useLlm: boolean;
    checkCancellation?: () => void;
    abortSignal?: AbortSignal;
  }): Promise<unknown>;
}

export function createLlmGenerationService(): LlmGenerationService {
  return {
    getDefaultProvider() {
      return getDefaultLlmProvider();
    },
    getClient(provider) {
      return getLlmClient(provider);
    },
    async generateNodeDocumentation(
      docType,
      context,
      docLinks,
      useLlm,
      preferredProvider,
      checkCancellation,
      abortSignal,
    ) {
      let finalProvider = preferredProvider ?? getDefaultLlmProvider();
      let fallbackUsed = false;
      let lastDocJson: unknown | undefined;

      const content = await generateDocumentationWithLlm(
        docType,
        context,
        docLinks,
        useLlm,
        finalProvider,
        async (provider, didFallback, docJson) => {
          finalProvider = provider;
          fallbackUsed = didFallback;
          lastDocJson = docJson;

          if (didFallback) {
            logLlmFallback('documentation', provider);
          }
          if (docJson && useLlm) {
            try {
              await saveLlmDebugArtifact('documentation-json', JSON.stringify(docJson, null, 2));
            } catch {
              // Best-effort debug logging; ignore failures
            }
          }
        },
        undefined,
        undefined,
        checkCancellation,
        abortSignal,
      );

      return {
        content,
        docJson: lastDocJson,
        provider: finalProvider,
        fallbackUsed,
      };
    },
    async generateNodeTestSpecs({ context, provider, useLlm, checkCancellation, abortSignal }) {
      return generateTestSpecWithLlm(context, provider, useLlm, checkCancellation, abortSignal);
    },
  };
}

