#!/usr/bin/env tsx
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDocContent(bpmnFileName: string) {
  console.log(`\n🔍 Checking documentation content for: ${bpmnFileName}\n`);
  
  const filePaths = [
    'docs/nodes/mortgage-se-household/register-household-economy-information.html',
    'docs/slow/chatgpt/mortgage-se-household.bpmn/d78c60ff6cb050cca67e0036563b357b20db67b214e33c65872769d0389c1e3e/nodes/mortgage-se-household/register-household-economy-information.html',
    'docs/mortgage-se-household.html',
  ];

  for (const filePath of filePaths) {
    console.log(`\n📄 Checking: ${filePath}`);
    const { data, error } = await supabase.storage.from('bpmn-files').download(filePath);
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      const text = await data.text();
      console.log(`  ✅ File size: ${text.length} bytes`);
      console.log(`  ✅ Has content: ${text.length > 100}`);
      console.log(`  ✅ First 200 chars: ${text.substring(0, 200)}...`);
      
      // Check if it's empty or just has basic HTML structure
      if (text.length < 500) {
        console.log(`  ⚠️  WARNING: File seems very small!`);
      }
      
      // Check for common content markers
      const hasBody = text.includes('<body>') || text.includes('<body ');
      const hasContent = text.length > 1000;
      const hasH1 = text.includes('<h1>') || text.includes('<h1 ');
      
      console.log(`  📊 Has <body>: ${hasBody}`);
      console.log(`  📊 Has <h1>: ${hasH1}`);
      console.log(`  📊 Has substantial content (>1000 bytes): ${hasContent}`);
    }
  }
}

const bpmnFileName = process.argv[2] || 'mortgage-se-household.bpmn';
checkDocContent(bpmnFileName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });





















