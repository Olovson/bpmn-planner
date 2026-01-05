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
      // Om LLM är avstängt för denna körning, returnera tomt resultat
      if (!useLlm) {
        const provider = preferredProvider ?? getDefaultLlmProvider();
        return {
          content: '',
          docJson: undefined,
          provider,
          fallbackUsed: false,
        };
      }

      const result = await generateDocumentationWithLlm(
        docType,
        context,
        docLinks,
        preferredProvider,
        false, // localAvailable (används inte längre)
        true, // allowFallback
        undefined, // childrenDocumentation hanteras i bpmnGenerators/docRendering
        abortSignal,
        undefined, // structuralInfo hanteras i docRendering
      );

      // Om LLM är avstängt globalt eller misslyckas hårt, returnera tomt resultat
      if (!result) {
        const provider = preferredProvider ?? getDefaultLlmProvider();
        return {
          content: '',
          docJson: undefined,
          provider,
          fallbackUsed: false,
        };
      }

      const { text, provider, fallbackUsed, docJson } = result as any;

      if (docJson && useLlm) {
        try {
          await saveLlmDebugArtifact(
            'documentation-json',
            JSON.stringify(docJson, null, 2),
          );
        } catch {
          // Best-effort debug logging; ignore failures
        }
      }

      if (fallbackUsed) {
        logLlmFallback('documentation', provider);
      }

      return {
        content: text,
        docJson,
        provider,
        fallbackUsed,
      };
    },
    async generateNodeTestSpecs({ context, provider, useLlm, checkCancellation, abortSignal }) {
      return generateTestSpecWithLlm(context, provider, useLlm, checkCancellation, abortSignal);
    },
  };
}
