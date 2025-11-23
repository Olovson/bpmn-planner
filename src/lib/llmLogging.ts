/**
 * LLM Logging & Metrics
 * 
 * Strukturerad loggning för LLM-anrop med in-memory ringbuffer.
 */

import type { LlmProvider } from './llmClientAbstraction';
import type { DocType } from './llmProfiles';

export type LlmErrorCode =
  | 'LOCAL_TIMEOUT'
  | 'LOCAL_CONNECTION_ERROR'
  | 'LOCAL_VALIDATION_FAILED'
  | 'CLOUD_VALIDATION_FAILED'
  | 'LOCAL_UNAVAILABLE'
  | 'CLOUD_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export type LlmEventType = 'INFO' | 'ERROR' | 'TOKEN_WARNING';

export interface LlmLogEvent {
  timestamp: string;
  eventType: LlmEventType;
  docType: DocType;
  attemptedProviders: LlmProvider[];
  finalProvider: LlmProvider;
  fallbackUsed: boolean;
  success: boolean;
  errorCode?: LlmErrorCode;
  validationOk?: boolean;
  latencyMs?: number;
  errorMessage?: string;
  estimatedTokens?: number;
  maxTokens?: number;
  warningFactor?: number;
}

const MAX_EVENTS = 200;
const recentLlmEvents: LlmLogEvent[] = [];

export function getProviderLabel(
  finalProvider: LlmProvider,
  fallbackUsed: boolean
): 'ChatGPT' | 'Ollama' | 'Local-fallback' {
  if (finalProvider === 'cloud') return 'ChatGPT';
  if (fallbackUsed) return 'Local-fallback';
  return 'Ollama';
}

/**
 * Lägger till ett nytt LLM-event i loggen.
 */
export function logLlmEvent(event: Omit<LlmLogEvent, 'timestamp'>): void {
  const fullEvent: LlmLogEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Lägg till i början av arrayen
  recentLlmEvents.unshift(fullEvent);

  // Behåll bara de senaste MAX_EVENTS
  if (recentLlmEvents.length > MAX_EVENTS) {
    recentLlmEvents.splice(MAX_EVENTS);
  }

  // Logga till console också (strukturerat)
  const logLevel =
    event.eventType === 'TOKEN_WARNING'
      ? 'warning'
      : event.success
      ? 'info'
      : 'error';
  const providerLabel = getProviderLabel(event.finalProvider, event.fallbackUsed);
  const baseMessage = `[LLM ${logLevel.toUpperCase()}] ${event.docType} via ${providerLabel}`;

  if (event.eventType === 'TOKEN_WARNING') {
    const tokenInfoParts: string[] = [];
    if (typeof event.estimatedTokens === 'number')
      tokenInfoParts.push(`estimated=${event.estimatedTokens}`);
    if (typeof event.maxTokens === 'number')
      tokenInfoParts.push(`max=${event.maxTokens}`);
    if (typeof event.warningFactor === 'number')
      tokenInfoParts.push(`threshold=${event.warningFactor}`);
    const tokenInfo =
      tokenInfoParts.length > 0
        ? `: token budget risk: ${tokenInfoParts.join(', ')}`
        : ': token budget risk';
    console.warn(baseMessage + tokenInfo);
    return;
  }

  const logMessage = `${baseMessage} - ${
    event.success ? 'Success' : `Failed: ${event.errorCode || 'Unknown'}`
  }${event.latencyMs ? ` (${event.latencyMs}ms)` : ''}`;

  if (event.success) {
    console.log(logMessage);
  } else {
    console.error(
      logMessage,
      event.errorMessage ? `- ${event.errorMessage}` : '',
    );
  }
}

/**
 * Hämtar de senaste LLM-events (max antal).
 */
export function getRecentLlmEvents(maxCount: number = 100): LlmLogEvent[] {
  return recentLlmEvents.slice(0, Math.min(maxCount, recentLlmEvents.length));
}

/**
 * Rensar alla loggade events (användbart för tester).
 */
export function clearLlmEvents(): void {
  recentLlmEvents.length = 0;
}

/**
 * Hämtar statistik över senaste events.
 */
export function getLlmStats(): {
  total: number;
  success: number;
  failed: number;
  fallbackUsed: number;
  tokenWarnings: number;
  byProvider: Record<LlmProvider, number>;
  byDocType: Record<DocType, number>;
  avgLatencyMs: number;
} {
  const stats = {
    total: recentLlmEvents.length,
    success: 0,
    failed: 0,
    fallbackUsed: 0,
    tokenWarnings: 0,
    byProvider: { cloud: 0, local: 0 } as Record<LlmProvider, number>,
    byDocType: {
      businessRule: 0,
      feature: 0,
      epic: 0,
      testscript: 0,
    } as Record<DocType, number>,
    avgLatencyMs: 0,
  };

  let totalLatency = 0;
  let latencyCount = 0;

  for (const event of recentLlmEvents) {
    if (event.eventType === 'TOKEN_WARNING') {
      stats.tokenWarnings++;
    }

    if (event.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    if (event.fallbackUsed) {
      stats.fallbackUsed++;
    }

    stats.byProvider[event.finalProvider]++;
    stats.byDocType[event.docType]++;

    if (event.latencyMs !== undefined) {
      totalLatency += event.latencyMs;
      latencyCount++;
    }
  }

  if (latencyCount > 0) {
    stats.avgLatencyMs = Math.round(totalLatency / latencyCount);
  }

  return stats;
}

/**
 * Extraherar error code från ett Error-objekt.
 */
export function extractErrorCode(error: unknown): LlmErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) {
      return 'LOCAL_TIMEOUT';
    }
    if (message.includes('connection') || message.includes('fetch failed')) {
      return 'LOCAL_CONNECTION_ERROR';
    }
    if (message.includes('validation')) {
      return 'LOCAL_VALIDATION_FAILED';
    }
    if (error.name === 'LocalLlmUnavailableError') {
      return 'LOCAL_UNAVAILABLE';
    }
  }
  return 'UNKNOWN_ERROR';
}
