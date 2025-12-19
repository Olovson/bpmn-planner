/**
 * Enkelt test för att validera Claude API med minimal response_format
 * 
 * Bygger upp komplexitet steg för steg för att hitta problemet.
 */

import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

// Ladda .env.local
try {
  dotenv.config({ path: path.join(projectRoot, '.env.local') });
} catch {}

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!API_KEY) {
  throw new Error('VITE_ANTHROPIC_API_KEY måste vara satt');
}

describe('Claude API - Systematisk testning', () => {
  const client = new Anthropic({
    apiKey: API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  it('Test 1: Enklaste möjliga anrop utan response_format', async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'Say "hello" in JSON format: {"message": "hello"}' },
      ],
    });

    expect(response.content[0].type).toBe('text');
    console.log('✅ Test 1 passed - Basic call works');
  }, 30000);

  it('Test 2: Testa olika modell-versioner med response_format', async () => {
    const models = [
      'claude-3-5-sonnet-20241022', // Äldre modell som definitivt stödjer structured outputs
      'claude-sonnet-4-20250514',    // Nyare modell
    ];

    for (const model of models) {
      try {
        console.log(`\n🧪 Testing model: ${model}`);
        const response = await client.messages.create({
          model,
          max_tokens: 100,
          messages: [
            { role: 'user', content: 'Return {"message": "hello"}' },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'Greeting',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
                required: ['message'],
              },
            },
          },
        } as any);

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text);
        expect(parsed.message).toBeDefined();
        console.log(`✅ Model ${model} WORKS! Response: ${text}`);
        return; // Om en modell fungerar, vi har hittat lösningen
      } catch (error: any) {
        console.log(`❌ Model ${model} failed: ${error.message}`);
        if (error.error?.message) {
          console.log(`   Error details: ${error.error.message}`);
        }
        if (model === models[models.length - 1]) {
          // Sista modellen - kasta fel
          throw new Error(`All models failed. Last error: ${error.message}`);
        }
      }
    }
  }, 60000);

  it('Test 3: Testa utan beta header', async () => {
    const clientNoBeta = new Anthropic({
      apiKey: API_KEY,
      // Ingen beta header
    });

    try {
      const response = await clientNoBeta.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          { role: 'user', content: 'Return {"message": "hello"}' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Greeting',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
              required: ['message'],
            },
          },
        },
      } as any);

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log(`✅ Works WITHOUT beta header! Response: ${text}`);
    } catch (error: any) {
      console.log(`❌ Failed WITHOUT beta header: ${error.message}`);
      throw error;
    }
  }, 30000);

  it('Test 4: Testa med olika beta header-versioner', async () => {
    const betaVersions = [
      'structured-outputs-2025-11-13',
      'structured-outputs-2024-10-22',
      'structured-outputs-2024-09-30',
    ];

    for (const betaVersion of betaVersions) {
      try {
        console.log(`\n🧪 Testing beta header: ${betaVersion}`);
        const testClient = new Anthropic({
          apiKey: API_KEY,
          defaultHeaders: {
            'anthropic-beta': betaVersion,
          },
        });

        const response = await testClient.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
          messages: [
            { role: 'user', content: 'Return {"message": "hello"}' },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'Greeting',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
                required: ['message'],
              },
            },
          },
        } as any);

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        console.log(`✅ Beta header ${betaVersion} WORKS! Response: ${text}`);
        return; // Om en version fungerar, vi har hittat lösningen
      } catch (error: any) {
        console.log(`❌ Beta header ${betaVersion} failed: ${error.message}`);
        if (betaVersion === betaVersions[betaVersions.length - 1]) {
          throw new Error(`All beta versions failed. Last error: ${error.message}`);
        }
      }
    }
  }, 90000);
});
