/**
 * Test Claude API med ökande komplexitet tills vi hittar felet
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

// Robust JSON parsing (samma som i appen, men förbättrad)
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
    
    // Om vi har balanserat alla klammerparenteser, detta är slutet
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
    // Om parsing misslyckas, visa mer info
    console.error('JSON parse error at position:', error.message);
    const errorMatch = error.message.match(/position (\d+)/);
    if (errorMatch) {
      const pos = parseInt(errorMatch[1], 10);
      console.error('Text around error:', jsonText.substring(Math.max(0, pos - 100), Math.min(jsonText.length, pos + 100)));
    }
    throw error;
  }
}

describe('Claude API - Ökande komplexitet', () => {
  const client = new Anthropic({
    apiKey: API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  it('Test 1: Enkel struktur med array', async () => {
    const systemPrompt = 'Du ska alltid svara med JSON. Inga markdown-code blocks, ingen text före eller efter JSON.';
    const userPrompt = `Returnera ett JSON-objekt med följande struktur:
{
  "summary": "En kort sammanfattning",
  "items": ["item1", "item2", "item3"]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Test 1 - Raw:', text);
    
    const parsed = parseJsonResponse(text);
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.items)).toBe(true);
    console.log('✅ Test 1 passed:', parsed);
  }, 30000);

  it('Test 2: Nästlade objekt i array', async () => {
    const systemPrompt = 'Du ska alltid svara med JSON. Inga markdown-code blocks, ingen text före eller efter JSON.';
    const userPrompt = `Returnera ett JSON-objekt med följande struktur:
{
  "summary": "En kort sammanfattning",
  "epics": [
    { "id": "epic1", "name": "Epic 1", "description": "Beskrivning", "team": "Team A" },
    { "id": "epic2", "name": "Epic 2", "description": "Beskrivning 2", "team": "Team B" }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Test 2 - Raw:', text.substring(0, 200));
    
    const parsed = parseJsonResponse(text);
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.epics)).toBe(true);
    expect(parsed.epics[0].id).toBeDefined();
    expect(parsed.epics[0].name).toBeDefined();
    console.log('✅ Test 2 passed:', { summary: parsed.summary, epicsCount: parsed.epics.length });
  }, 30000);

  it('Test 3: Komplex struktur med flera arrayer och nästlade objekt', async () => {
    const systemPrompt = 'Du ska alltid svara med JSON. Inga markdown-code blocks, ingen text före eller efter JSON.';
    const userPrompt = `Returnera ett JSON-objekt med följande struktur:
{
  "summary": "En kort sammanfattning",
  "effectGoals": ["goal1", "goal2"],
  "scopeIncluded": ["scope1"],
  "epics": [
    { "id": "epic1", "name": "Epic 1", "description": "Beskrivning", "team": "Team A" }
  ],
  "scenarios": [
    { "id": "scenario1", "name": "Scenario 1", "type": "Happy", "outcome": "Success" }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Test 3 - Raw:', text.substring(0, 300));
    
    const parsed = parseJsonResponse(text);
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.effectGoals)).toBe(true);
    expect(Array.isArray(parsed.scopeIncluded)).toBe(true);
    expect(Array.isArray(parsed.epics)).toBe(true);
    expect(Array.isArray(parsed.scenarios)).toBe(true);
    expect(parsed.scenarios[0].type).toBe('Happy');
    console.log('✅ Test 3 passed');
  }, 30000);

  it('Test 4: Full FeatureGoalDocModel struktur (som vår app använder)', async () => {
    const systemPrompt = `Du är en erfaren processanalytiker. Du ska generera ett enda JSON-objekt på svenska.
Svara alltid med exakt ett JSON-objekt (ingen fri text före/efter, ingen Markdown, ingen HTML).
Outputen ska börja direkt med { och avslutas med }.`;

    const userPrompt = `Returnera ett JSON-objekt enligt FeatureGoalDocModel:
{
  "summary": "string",
  "effectGoals": ["string"],
  "scopeIncluded": ["string"],
  "scopeExcluded": ["string"],
  "epics": [
    { "id": "string", "name": "string", "description": "string", "team": "string" }
  ],
  "flowSteps": ["string"],
  "dependencies": ["string"],
  "scenarios": [
    { "id": "string", "name": "string", "type": "Happy", "outcome": "string" }
  ],
  "testDescription": "string",
  "implementationNotes": ["string"],
  "relatedItems": ["string"]
}

Fyll i med exempeldata på svenska.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.35,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Test 4 - Raw length:', text.length);
    console.log('Test 4 - Raw start:', text.substring(0, 200));
    console.log('Test 4 - Raw end:', text.substring(text.length - 200));
    
    const parsed = parseJsonResponse(text);
    
    // Validera alla required fields
    expect(parsed.summary).toBeDefined();
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
    
    console.log('✅ Test 4 passed - Full FeatureGoalDocModel struktur fungerar!');
    console.log('Summary:', parsed.summary);
    console.log('Epics:', parsed.epics.length);
    console.log('Scenarios:', parsed.scenarios.length);
  }, 60000);

  it('Test 5: Med faktisk prompt från appen (feature_epic_prompt.md)', async () => {
    // Läs faktisk prompt
    const fs = await import('fs');
    const promptPath = path.join(projectRoot, 'prompts/llm/feature_epic_prompt.md');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
    
    const userPrompt = JSON.stringify({
      type: 'Feature',
      processContext: {
        processName: 'Test Process',
        fileName: 'test.bpmn',
      },
      currentNodeContext: {
        node: {
          id: 'test-node',
          name: 'Test Node',
          type: 'userTask',
        },
      },
    }, null, 2);

    // Använd mycket högre max_tokens för att säkerställa fullständig JSON
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50000, // Mycket högt för att säkerställa fullständig JSON
      temperature: 0.35,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Test 5 - Raw length:', text.length);
    console.log('Test 5 - Raw start:', text.substring(0, 300));
    
    // Kontrollera om svaret är komplett (slutar med })
    if (!text.trim().endsWith('}')) {
      console.warn('⚠️  JSON verkar ofullständig - slutar inte med }');
      console.log('Test 5 - Raw end:', text.substring(text.length - 200));
    }
    
    try {
      const parsed = parseJsonResponse(text);
    
    // Validera required fields
    expect(parsed.summary).toBeDefined();
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
    
      console.log('✅ Test 5 passed - Med faktisk prompt från appen!');
      console.log('Summary:', parsed.summary?.substring(0, 100));
    } catch (error: any) {
      console.error('❌ Test 5 failed - JSON parse error:', error.message);
      console.error('Error position:', errorPos);
      console.error('Text around error:', text.substring(errorPos - 200, errorPos + 200));
      throw error;
    }
  }, 60000);
});

