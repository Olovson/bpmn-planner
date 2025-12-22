#!/usr/bin/env node
/**
 * Enkelt test-script för att verifiera att Claude API fungerar
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..');

// Ladda .env.local
config({ path: resolve(projectRoot, '.env.local') });

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌ VITE_ANTHROPIC_API_KEY saknas i .env.local');
  process.exit(1);
}

console.log('🧪 Testar Claude API...\n');
console.log(`📝 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

const client = new Anthropic({
  apiKey: API_KEY,
});

async function testClaude() {
  try {
    console.log('📤 Skickar test-anrop till Claude...\n');
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: 'Du är en hjälpsam assistent.',
      messages: [
        {
          role: 'user',
          content: 'Hej! Kan du svara med bara "Test lyckades" om detta fungerar?',
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('✅ Claude API fungerar!');
      console.log(`📥 Svar: ${content.text}\n`);
      console.log(`📊 Metadata:`);
      console.log(`   - Model: ${response.model}`);
      console.log(`   - Tokens: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);
      console.log(`   - Stop reason: ${response.stop_reason}\n`);
      return true;
    } else {
      console.error('❌ Oväntat svar-format från Claude');
      return false;
    }
  } catch (error) {
    console.error('❌ Fel vid Claude API-anrop:');
    console.error(error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    if (error.error) {
      console.error(`   Error: ${JSON.stringify(error.error, null, 2)}`);
    }
    return false;
  }
}

testClaude().then((success) => {
  process.exit(success ? 0 : 1);
});

















