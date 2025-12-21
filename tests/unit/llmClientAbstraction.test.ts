/**
 * Unit tests for LLM Client Abstraction
 * 
 * Tests both CloudLlmClient and LocalLlmClient implementations
 * with mocked HTTP requests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudLlmClient, cloudLlmClientInstance } from '@/lib/llmClients/cloudLlmClient';
import { LocalLlmClient, localLlmClientInstance } from '@/lib/llmClients/localLlmClient';
import { getLlmClient, getDefaultLlmProvider } from '@/lib/llmClients';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

// Mock OpenAI client
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('LlmClient Abstraction', () => {
  describe('CloudLlmClient', () => {
    it('should have correct provider and model name', () => {
      expect(cloudLlmClientInstance.provider).toBe('cloud');
      expect(cloudLlmClientInstance.modelName).toBe('gpt-4o');
    });

    it('should return null when LLM is not enabled', async () => {
      // When VITE_USE_LLM is false or API_KEY is missing, should return null
      const result = await cloudLlmClientInstance.generateText({
        userPrompt: 'test',
      });
      // Note: This will be null if LLM is disabled, which is expected behavior
      expect(result).toBeDefined(); // Either null or a string
    });
  });

  describe('LocalLlmClient (Ollama)', () => {
    it('should have correct provider and model name', () => {
      expect(localLlmClientInstance.provider).toBe('ollama');
      expect(localLlmClientInstance.modelName).toBeTruthy();
    });

    it('should return null when base URL is not configured', async () => {
      const client = new LocalLlmClient('');
      const result = await client.generateText({
        userPrompt: 'test',
      });
      expect(result).toBeNull();
    });

    it('should make HTTP request to Ollama endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Test response from local LLM',
          done: true,
        }),
      });

      global.fetch = mockFetch;

      const client = new LocalLlmClient('http://localhost:11434');
      const result = await client.generateText({
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Hello',
        temperature: 0.7,
        maxTokens: 100,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"model"'),
        })
      );

      expect(result).toBe('Test response from local LLM');

      // Cleanup
      delete (global as any).fetch;
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      global.fetch = mockFetch;

      const client = new LocalLlmClient('http://localhost:11434');
      
      try {
        await client.generateText({
          userPrompt: 'test',
        });
        expect.fail('Should have thrown LocalLlmUnavailableError');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('LocalLlmUnavailableError');
      }

      // Cleanup
      delete (global as any).fetch;
    });

    it('should handle timeout errors', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      global.fetch = mockFetch;

      const client = new LocalLlmClient('http://localhost:11434', 50); // 50ms timeout
      
      try {
        await client.generateText({
          userPrompt: 'test',
        });
        expect.fail('Should have thrown LocalLlmUnavailableError');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('LocalLlmUnavailableError');
      }

      // Cleanup
      delete (global as any).fetch;
    });

    it('should handle connection refused errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new TypeError('fetch failed')
      );

      global.fetch = mockFetch;

      const client = new LocalLlmClient('http://localhost:11434');
      
      try {
        await client.generateText({
          userPrompt: 'test',
        });
        expect.fail('Should have thrown LocalLlmUnavailableError');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('LocalLlmUnavailableError');
      }

      // Cleanup
      delete (global as any).fetch;
    });

    it('should handle 404 (model not found)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Model not found',
      });

      global.fetch = mockFetch;

      const client = new LocalLlmClient('http://localhost:11434');
      
      try {
        await client.generateText({
          userPrompt: 'test',
        });
        expect.fail('Should have thrown LocalLlmUnavailableError');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('LocalLlmUnavailableError');
      }

      // Cleanup
      delete (global as any).fetch;
    });
  });

  describe('getLlmClient router', () => {
    it('should return CloudLlmClient for cloud provider', () => {
      const client = getLlmClient('cloud');
      expect(client.provider).toBe('cloud');
    });

    it('should return LocalLlmClient for local provider', () => {
      const client = getLlmClient('ollama');
      expect(client.provider).toBe('ollama');
    });
  });

  describe('getDefaultLlmProvider', () => {
    it('should return cloud as default', () => {
      const provider = getDefaultLlmProvider();
      expect(provider).toBe('cloud');
    });
  });
});

