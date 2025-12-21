/**
 * LLM Client Abstraction
 * 
 * Detta modul definierar ett abstrakt gränssnitt för LLM-klienter och tillhandahåller
 * implementationer för både molnbaserade (Claude/Anthropic) och lokala (Llama via Ollama) LLM:er.
 */

export type LlmProvider = 'cloud' | 'ollama';

export interface LlmClient {
  /**
   * Genererar text baserat på system- och user-prompts.
   * 
   * @param args - Konfiguration för textgenerering
   * @returns Genererad text eller null om generering misslyckades
   */
  generateText(args: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: { type: 'json_schema'; json_schema: any };
    abortSignal?: AbortSignal;
  }): Promise<string | null>;

  /**
   * Namnet på modellen som används (t.ex. "gpt-4o" eller "llama3.1:8b")
   */
  readonly modelName: string;

  /**
   * Provider-typen (cloud eller ollama)
   */
  readonly provider: LlmProvider;
}

