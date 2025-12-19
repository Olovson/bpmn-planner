/**
 * Test Claude API med direkt HTTP-anrop för att kringgå SDK-problem
 */

import { describe, it, expect } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

try {
  dotenv.config({ path: path.join(projectRoot, '.env.local') });
} catch {}

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!API_KEY) {
  throw new Error('VITE_ANTHROPIC_API_KEY måste vara satt');
}

describe('Claude API - Direkt HTTP', () => {
  it('Test 1: Direkt HTTP-anrop med minimal response_format', async () => {
    // Testa olika varianter av response_format för att hitta rätt format
    const variants = [
      // Variant 1: Minimalt (bara type och json_schema)
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Return {"message": "hello"}' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Greeting',
            strict: true,
            schema: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
        },
      },
      // Variant 2: Utan "strict"
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Return {"message": "hello"}' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Greeting',
            schema: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
        },
      },
      // Variant 3: Utan "name"
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Return {"message": "hello"}' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            strict: true,
            schema: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
        },
      },
      // Variant 4: Testa om det är "type" som är problemet - kanske ska vara något annat?
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Return {"message": "hello"}' }],
        response_format: {
          json_schema: {
            name: 'Greeting',
            strict: true,
            schema: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
        },
      },
      // Variant 5: Testa utan beta header
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Return {"message": "hello"}' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Greeting',
            strict: true,
            schema: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
        },
        useBetaHeader: false, // Flag för att testa utan beta header
      },
    ];

    for (let i = 0; i < variants.length; i++) {
      const requestBody = variants[i];
      console.log(`\n🧪 Testing variant ${i + 1}:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'structured-outputs-2025-11-13',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${responseText.substring(0, 200)}...`);

      if (response.ok) {
        const data = JSON.parse(responseText);
        expect(data.content).toBeDefined();
        console.log(`✅ Variant ${i + 1} WORKS!`);
        return; // Vi hittade en variant som fungerar
      } else {
        console.log(`❌ Variant ${i + 1} failed`);
        if (i === variants.length - 1) {
          // Sista varianten - kasta fel
          throw new Error(`All variants failed. Last error: HTTP ${response.status}: ${responseText}`);
        }
      }
    }
  }, 30000);
});

