import type { LlmGenerationService } from './services/llmGeneration';
import type { GenerationStorageService } from './services/generationStorage';

export type GenerationErrorKind =
  | 'parse'
  | 'graph'
  | 'generation'
  | 'storage'
  | 'llm'
  | 'validation'
  | 'unknown';

export interface GenerationErrorContext {
  bpmnFileName?: string;
  useHierarchy?: boolean;
  useLlm?: boolean;
  generationSourceLabel?: string;
}

export class GenerationError extends Error {
  readonly kind: GenerationErrorKind;
  readonly cause?: unknown;
  readonly context?: GenerationErrorContext;

  constructor(
    kind: GenerationErrorKind,
    message: string,
    options?: { cause?: unknown; context?: GenerationErrorContext },
  ) {
    super(message);
    this.name = 'GenerationError';
    this.kind = kind;
    this.cause = options?.cause;
    this.context = options?.context;
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface EngineAdapters {
  llm: LlmGenerationService;
  storage: GenerationStorageService;
  logger?: Logger;
}

