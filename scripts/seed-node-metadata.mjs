import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local so we can share the same config as Vite
const envPath = resolve(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    const value = rest.join('=');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Optional file, ignore if missing
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'seed-bot@example.com';
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'SeedBot123!';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local first.');
  process.exit(1);
}

if (!ANON_KEY) {
  console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const userClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

async function ensureSeedUser() {
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }

  const existing = data.users.find((user) => user.email === SEED_USER_EMAIL);

  if (existing) {
    await adminClient.auth.admin.updateUserById(existing.id, {
      password: SEED_USER_PASSWORD,
      email_confirm: true,
    });
    return existing.id;
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: SEED_USER_EMAIL,
    password: SEED_USER_PASSWORD,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    console.error('Failed to create seed user:', createError?.message ?? 'Unknown error');
    process.exit(1);
  }

  return created.user.id;
}

async function seedNodeMetadata() {
  await ensureSeedUser();

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: SEED_USER_EMAIL,
    password: SEED_USER_PASSWORD,
  });

  if (signInError) {
    console.error('Failed to sign in seed user:', signInError.message);
    process.exit(1);
  }

  const mappings = [
    {
      bpmn_file: 'mortgage.bpmn',
      element_id: 'application',
      jira_issues: [{ id: 'MORT-101', url: 'https://example.atlassian.net/browse/MORT-101', title: 'Implement application subprocess' }],
      confluence_url: 'https://confluence.local/docs/application',
      figma_url: 'https://www.figma.com/file/app-flow',
      test_report_url: 'https://reports.local/applications',
      jira_type: 'feature goal',
      jira_name: 'Mortgage Application',
    },
    {
      bpmn_file: 'mortgage.bpmn',
      element_id: 'credit-evaluation',
      jira_issues: [{ id: 'MORT-202', url: 'https://example.atlassian.net/browse/MORT-202', title: 'Credit evaluation automation' }],
      confluence_url: 'https://confluence.local/docs/credit-evaluation',
      figma_url: 'https://www.figma.com/file/credit-evaluation',
      test_report_url: 'https://reports.local/credit',
      jira_type: 'feature goal',
      jira_name: 'Automated Credit Evaluation',
    },
    {
      bpmn_file: 'mortgage-se-application.bpmn',
      element_id: 'household',
      jira_issues: [{ id: 'MORT-305', url: 'https://example.atlassian.net/browse/MORT-305', title: 'Household data capture' }],
      confluence_url: 'https://confluence.local/docs/household',
      figma_url: 'https://www.figma.com/file/household-flow',
      jira_type: 'epic',
      jira_name: 'Household Intake',
    },
    {
      bpmn_file: 'mortgage-se-application.bpmn',
      element_id: 'stakeholder',
      jira_issues: [{ id: 'MORT-401', url: 'https://example.atlassian.net/browse/MORT-401', title: 'Stakeholder verification' }],
      confluence_url: 'https://confluence.local/docs/stakeholder',
      figma_url: 'https://www.figma.com/file/stakeholder',
      jira_type: 'feature goal',
      jira_name: 'Stakeholder Verification',
    },
  ];

  const testLinks = [
    {
      bpmn_file: 'mortgage.bpmn',
      bpmn_element_id: 'application',
      test_file_path: 'tests/application.spec.ts',
      test_name: 'Application happy path',
    },
    {
      bpmn_file: 'mortgage.bpmn',
      bpmn_element_id: 'credit-evaluation',
      test_file_path: 'tests/credit-evaluation.spec.ts',
      test_name: 'Credit evaluation thresholds',
    },
    {
      bpmn_file: 'mortgage-se-application.bpmn',
      bpmn_element_id: 'stakeholder',
      test_file_path: 'tests/stakeholder.spec.ts',
      test_name: 'Stakeholder onboarding validations',
    },
  ];

  const { error: mappingsError } = await userClient
    .from('bpmn_element_mappings')
    .upsert(mappings, { onConflict: 'bpmn_file,element_id' });

  if (mappingsError) {
    console.error('Failed to seed bpmn_element_mappings:', mappingsError.message);
    process.exit(1);
  }

  const { error: testError } = await userClient
    .from('node_test_links')
    .upsert(testLinks, { onConflict: 'bpmn_file,bpmn_element_id,test_file_path' });

  if (testError) {
    console.error('Failed to seed node_test_links:', testError.message);
    process.exit(1);
  }

  console.log(`Seeded ${mappings.length} mappings and ${testLinks.length} node test links.`);
}

seedNodeMetadata()
  .then(() => console.log('Node metadata seeding complete.'))
  .catch((err) => {
    console.error('Unexpected seeding error:', err);
    process.exit(1);
  });
