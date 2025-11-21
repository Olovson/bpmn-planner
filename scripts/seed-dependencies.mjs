import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch (err) {
  // File optional
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const dependencies = [
  // Root process to application subprocess
  { parent_file: 'mortgage.bpmn', child_process: 'application', child_file: 'mortgage-se-application.bpmn' },
  { parent_file: 'mortgage.bpmn', child_process: 'credit-evaluation', child_file: 'mortgage-se-credit-evaluation.bpmn' },
  // Known subprocesses inside mortgage-se-application
  { parent_file: 'mortgage-se-application.bpmn', child_process: 'internal-data-gathering', child_file: 'mortgage-se-internal-data-gathering.bpmn' },
  { parent_file: 'mortgage-se-application.bpmn', child_process: 'stakeholder', child_file: 'mortgage-se-stakeholder.bpmn' },
  { parent_file: 'mortgage-se-application.bpmn', child_process: 'object', child_file: 'mortgage-se-object.bpmn' },
  { parent_file: 'mortgage-se-application.bpmn', child_process: 'household', child_file: 'mortgage-se-household.bpmn' },
];

async function seedDependencies() {
  const { error } = await supabase.from('bpmn_dependencies').upsert(dependencies, {
    onConflict: 'parent_file,child_process',
  });

  if (error) {
    console.error('Failed to seed dependencies:', error.message);
    process.exit(1);
  }

  console.log(`Seeded ${dependencies.length} dependency rows.`);
}

seedDependencies()
  .then(() => {
    console.log('Dependency seeding complete.');
  })
  .catch((err) => {
    console.error('Unexpected error while seeding dependencies:', err);
    process.exit(1);
  });
