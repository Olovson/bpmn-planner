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
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Optional file
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local - required for seeding DoR/DoD data.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const subprocesses = [
  { id: 'application', title: 'Application', nodeType: 'CallActivity', bpmnFile: 'mortgage.bpmn', bpmnElementId: 'application' },
  { id: 'credit-evaluation', title: 'Credit Evaluation', nodeType: 'CallActivity', bpmnFile: 'mortgage.bpmn', bpmnElementId: 'credit-evaluation' },
  { id: 'internal-data-gathering', title: 'Internal Data Gathering', nodeType: 'CallActivity', bpmnFile: 'mortgage-se-application.bpmn', bpmnElementId: 'internal-data-gathering' },
  { id: 'stakeholder', title: 'Stakeholder', nodeType: 'CallActivity', bpmnFile: 'mortgage-se-application.bpmn', bpmnElementId: 'stakeholder' },
  { id: 'household', title: 'Household', nodeType: 'CallActivity', bpmnFile: 'mortgage-se-application.bpmn', bpmnElementId: 'household' },
  { id: 'object', title: 'Object', nodeType: 'CallActivity', bpmnFile: 'mortgage-se-application.bpmn', bpmnElementId: 'object' },
];

const dorCriteria = [
  {
    criterion_category: 'process_krav',
    criterion_key: 'dor_scope_defined',
    criterion_text: 'Process scope, owner och syfte är dokumenterat och förankrat.',
  },
  {
    criterion_category: 'data_input_output',
    criterion_key: 'dor_inputs_identified',
    criterion_text: 'Alla obligatoriska inputkällor, datafält och integrationer är identifierade.',
  },
  {
    criterion_category: 'planering_beroenden',
    criterion_key: 'dor_dependencies_cleared',
    criterion_text: 'Eventuella beroenden/backlog items är planerade eller blockerare lyfta.',
  },
];

const dodCriteria = [
  {
    criterion_category: 'test_kvalitet',
    criterion_key: 'dod_tests_implemented',
    criterion_text: 'Automatiska eller manuella tester täcker huvudflöden och edge cases.',
  },
  {
    criterion_category: 'dokumentation',
    criterion_key: 'dod_docs_updated',
    criterion_text: 'Operativa instruktioner, BPMN och Confluence är uppdaterade.',
  },
  {
    criterion_category: 'overlamning',
    criterion_key: 'dod_handover_done',
    criterion_text: 'Handover till drift/förvaltning är genomförd och accepterad.',
  },
];

const rows = [];

for (const subprocess of subprocesses) {
  for (const criterion of dorCriteria) {
    rows.push({
      subprocess_name: subprocess.id,
      node_type: subprocess.nodeType,
      bpmn_file: subprocess.bpmnFile,
      bpmn_element_id: subprocess.bpmnElementId,
      criterion_type: 'dor',
      criterion_category: criterion.criterion_category,
      criterion_key: `${criterion.criterion_key}`,
      criterion_text: `${criterion.criterion_text} (${subprocess.title})`,
      is_completed: false,
    });
  }

  for (const criterion of dodCriteria) {
    rows.push({
      subprocess_name: subprocess.id,
      node_type: subprocess.nodeType,
      bpmn_file: subprocess.bpmnFile,
      bpmn_element_id: subprocess.bpmnElementId,
      criterion_type: 'dod',
      criterion_category: criterion.criterion_category,
      criterion_key: `${criterion.criterion_key}`,
      criterion_text: `${criterion.criterion_text} (${subprocess.title})`,
      is_completed: false,
    });
  }
}

async function seedDorDod() {
  const { error } = await supabase
    .from('dor_dod_status')
    .upsert(rows, { onConflict: 'subprocess_name,criterion_type,criterion_key' });

  if (error) {
    console.error('Failed to seed DoR/DoD data:', error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} DoR/DoD criteria across ${subprocesses.length} subprocesses.`);
}

seedDorDod()
  .then(() => console.log('DoR/DoD seeding complete.'))
  .catch((err) => {
    console.error('Unexpected error while seeding DoR/DoD data:', err);
    process.exit(1);
  });
