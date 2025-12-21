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

async function storageFileExists(filePath: string): Promise<boolean> {
  const parts = filePath.split('/');
  const fileName = parts.pop();
  const dir = parts.join('/');
  if (!fileName) return false;

  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .list(dir || undefined, { search: fileName, limit: 1 });

  if (error) {
    console.warn('[storageFileExists] list error for', filePath, error);
    return false;
  }

  return Boolean((data ?? []).find((entry) => entry.name === fileName));
}

async function testPaths() {
  const paths = [
    'docs/nodes/mortgage-se-household/register-household-economy-information.html',
    'docs/slow/chatgpt/nodes/mortgage-se-household/register-household-economy-information.html',
    'docs/slow/nodes/mortgage-se-household/register-household-economy-information.html',
    'docs/nodes/mortgage-se-household/register-household-economy-information.html',
  ];

  console.log('\n🔍 Testing storageFileExists function:\n');
  
  for (const path of paths) {
    const exists = await storageFileExists(path);
    console.log(`${exists ? '✅' : '❌'} ${path}`);
  }
}

testPaths()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

