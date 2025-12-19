/**
 * Test Claude API för application -> Object -> Object information
 * Med mycket höga max_tokens för att säkerställa fullständig JSON
 */

import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

// Robust JSON parsing (samma som i appen)
function parseJsonResponse(text: string): any {
  let jsonText = text.trim();
  
  // Steg 1: Ta bort markdown-code blocks
  jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
  
  // Steg 2: Hitta första JSON-struktur
  const firstBrace = jsonText.indexOf('{');
  const firstBracket = jsonText.indexOf('[');
  const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
  
  if (startCandidates.length === 0) {
    throw new Error('No JSON structure found (no { or [)');
  }
  
  const start = Math.min(...startCandidates);
  if (start > 0) {
    jsonText = jsonText.slice(start);
  }
  
  // Steg 3: Hitta sista matchande avslutning (räkna balanserade klammerparenteser)
  let braceCount = 0;
  let bracketCount = 0;
  let end = -1;
  
  for (let i = 0; i < jsonText.length; i++) {
    if (jsonText[i] === '{') braceCount++;
    if (jsonText[i] === '}') braceCount--;
    if (jsonText[i] === '[') bracketCount++;
    if (jsonText[i] === ']') bracketCount--;
    
    if (braceCount === 0 && bracketCount === 0 && i > 0) {
      end = i;
      break;
    }
  }
  
  if (end >= 0 && end + 1 < jsonText.length) {
    jsonText = jsonText.slice(0, end + 1);
  } else if (end === -1) {
    // Fallback: använd lastIndexOf om balansering misslyckas
    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
      end = jsonText.lastIndexOf('}');
    } else if (firstBracket >= 0) {
      end = jsonText.lastIndexOf(']');
    }
    if (end >= 0 && end + 1 < jsonText.length) {
      jsonText = jsonText.slice(0, end + 1);
    }
  }
  
  jsonText = jsonText.trim();
  
  // Steg 4: Fixa vanliga JSON-problem
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Fix trailing commas
  jsonText = jsonText.replace(/,\s*,/g, ','); // Fix double commas
  
  // Steg 5: Försök parsa
  try {
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error('JSON parse error:', error.message);
    const errorMatch = error.message.match(/position (\d+)/);
    if (errorMatch) {
      const pos = parseInt(errorMatch[1], 10);
      console.error('Text around error:', jsonText.substring(Math.max(0, pos - 100), Math.min(jsonText.length, pos + 100)));
    }
    throw error;
  }
}

describe('Claude API - Application -> Object -> Object information', () => {
  const client = new Anthropic({
    apiKey: API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  it('Test: Generera Feature Goal för Object information noden', async () => {
    // Läs faktisk prompt
    const promptPath = path.join(projectRoot, 'prompts/llm/feature_epic_prompt.md');
    const systemPrompt = readFileSync(promptPath, 'utf-8');
    
    // Bygg userPrompt som appen gör för Object information noden
    const userPrompt = JSON.stringify({
      type: 'Feature',
      processContext: {
        processName: 'Application Process',
        fileName: 'mortgage-se-application.bpmn',
        entryPoints: ['Start'],
        keyNodes: ['Object information'],
      },
      currentNodeContext: {
        node: {
          id: 'Object_information',
          name: 'Object information',
          type: 'userTask',
          file: 'mortgage-se-application.bpmn',
        },
        hierarchy: {
          trail: ['Application Process', 'Object information'],
          pathLabel: 'Application Process > Object information',
          depth: 1,
        },
        flows: {
          incoming: ['flow1'],
          outgoing: ['flow2'],
        },
      },
    }, null, 2);

    console.log('📤 Skickar request till Claude...');
    console.log('User prompt length:', userPrompt.length);
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000, // Högt men rimligt för FeatureGoalDocModel (8K output tokens/min rate limit)
      temperature: 0.35,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Visa token-användning
    console.log('📊 Token-användning:');
    console.log('   Input tokens:', response.usage.input_tokens);
    console.log('   Output tokens:', response.usage.output_tokens);
    console.log('   Total tokens:', response.usage.input_tokens + response.usage.output_tokens);
    console.log('   Rate limit: 8K output tokens/min för Claude Sonnet 4.5');
    console.log('   Användning av output quota:', ((response.usage.output_tokens / 8000) * 100).toFixed(1) + '%');
    
    console.log('📥 Response length:', text.length);
    console.log('📥 Response start:', text.substring(0, 300));
    
    // Kontrollera om svaret är komplett
    if (!text.trim().endsWith('}')) {
      console.warn('⚠️  JSON verkar ofullständig - slutar inte med }');
      console.log('📥 Response end:', text.substring(text.length - 300));
    } else {
      console.log('✅ JSON verkar komplett (slutar med })');
    }
    
    // Parsa JSON
    const parsed = parseJsonResponse(text);
    
    // Validera alla required fields
    console.log('🔍 Validerar JSON-struktur...');
    expect(parsed.summary).toBeDefined();
    expect(typeof parsed.summary).toBe('string');
    expect(parsed.summary.length).toBeGreaterThan(0);
    
    expect(Array.isArray(parsed.effectGoals)).toBe(true);
    expect(Array.isArray(parsed.scopeIncluded)).toBe(true);
    expect(Array.isArray(parsed.scopeExcluded)).toBe(true);
    expect(Array.isArray(parsed.epics)).toBe(true);
    expect(Array.isArray(parsed.flowSteps)).toBe(true);
    expect(Array.isArray(parsed.dependencies)).toBe(true);
    expect(Array.isArray(parsed.scenarios)).toBe(true);
    expect(typeof parsed.testDescription).toBe('string');
    expect(Array.isArray(parsed.implementationNotes)).toBe(true);
    expect(Array.isArray(parsed.relatedItems)).toBe(true);
    
    // Validera nästlade strukturer
    if (parsed.epics.length > 0) {
      expect(parsed.epics[0].id).toBeDefined();
      expect(parsed.epics[0].name).toBeDefined();
      expect(parsed.epics[0].description).toBeDefined();
      expect(parsed.epics[0].team).toBeDefined();
    }
    
    if (parsed.scenarios.length > 0) {
      expect(parsed.scenarios[0].id).toBeDefined();
      expect(parsed.scenarios[0].name).toBeDefined();
      expect(['Happy', 'Edge', 'Error']).toContain(parsed.scenarios[0].type);
      expect(parsed.scenarios[0].outcome).toBeDefined();
    }
    
    console.log('✅ Alla valideringar passerade!');
    console.log('📊 Resultat:');
    console.log('  - Summary length:', parsed.summary.length);
    console.log('  - Effect goals:', parsed.effectGoals.length);
    console.log('  - Epics:', parsed.epics.length);
    console.log('  - Scenarios:', parsed.scenarios.length);
    console.log('  - Flow steps:', parsed.flowSteps.length);
    console.log('  - Implementation notes:', parsed.implementationNotes.length);
    
    // Visa en del av summary för att verifiera kvalitet
    console.log('📝 Summary (första 200 tecken):', parsed.summary.substring(0, 200));
  }, 120000); // 2 minuter timeout
});

