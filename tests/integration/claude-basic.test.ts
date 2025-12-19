/**
 * Enklaste möjliga test - bara verifiera att Claude API fungerar
 */

import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
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

describe('Claude API - Grundläggande test', () => {
  const client = new Anthropic({
    apiKey: API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  it('Test 1: Enklaste möjliga anrop - bara text', async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'Say "hello" in Swedish' },
      ],
    });

    expect(response.content[0].type).toBe('text');
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    expect(text.length).toBeGreaterThan(0);
    console.log('✅ API fungerar! Svar:', text);
  }, 30000);

  it('Test 2: Be Claude returnera JSON i texten (som våra prompter gör)', async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'Du ska alltid svara med JSON. Inga markdown-code blocks, ingen text före eller efter JSON.',
      messages: [
        { 
          role: 'user', 
          content: 'Returnera ett JSON-objekt med följande struktur: {"message": "hello", "language": "swedish"}' 
        },
      ],
    });

    expect(response.content[0].type).toBe('text');
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Raw response:', text);
    
    // Försök parsa JSON (som vår kod gör)
    let jsonText = text.trim();
    
    // Ta bort markdown-code blocks om de finns
    jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
    
    // Hitta första {
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace >= 0) {
      jsonText = jsonText.slice(firstBrace);
    }
    
    // Hitta sista }
    const lastBrace = jsonText.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace + 1 < jsonText.length) {
      jsonText = jsonText.slice(0, lastBrace + 1);
    }
    
    jsonText = jsonText.trim();
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Fix trailing commas
    
    console.log('Cleaned JSON:', jsonText);
    
    const parsed = JSON.parse(jsonText);
    expect(parsed.message).toBeDefined();
    expect(parsed.language).toBeDefined();
    console.log('✅ JSON parsing fungerar! Parsed:', parsed);
  }, 30000);
});

