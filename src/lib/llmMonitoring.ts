import type { DocumentationDocType } from './llmDocumentation';

type LlmEventType = 'documentation' | 'test';
type LlmStatus = 'fallback' | 'error';

interface LlmLogPayload {
  eventType: LlmEventType;
  status: LlmStatus;
  reason: string;
  docType?: DocumentationDocType;
  nodeId?: string;
  nodeName?: string;
  bpmnFile?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Persists LLM fallback/error events to Supabase so we can monitor when the
 * application falls back to the static templates or skeleton tests.
 */
export async function logLlmFallback(payload: LlmLogPayload): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const errorMessage =
      payload.error instanceof Error
        ? payload.error.message
        : typeof payload.error === 'string'
          ? payload.error
          : null;

    await supabase.from('llm_generation_logs').insert({
      event_type: payload.eventType,
      status: payload.status,
      reason: payload.reason,
      doc_type: payload.docType ?? null,
      node_id: payload.nodeId ?? null,
      node_name: payload.nodeName ?? null,
      bpmn_file: payload.bpmnFile ?? null,
      error_message: errorMessage,
      metadata: payload.metadata ?? null,
    });
  } catch (loggingError) {
    console.error('Failed to log LLM fallback event:', loggingError);
  }
}
