#!/usr/bin/env node

/**
 * Script to reset the test Supabase database.
 *
 * This script:
 * 1. Truncates all relevant tables
 * 2. Clears the bpmn-files storage bucket
 * 3. Re-runs the seed script
 *
 * Usage:
 *   node scripts/reset-test-db.mjs [--skip-seed]
 *   npm run reset:test-db
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line args
const skipSeed = process.argv.includes('--skip-seed');

// Load .env.test
const envPath = resolve(__dirname, '../.env.test');
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
} catch (err) {
  console.error('❌ Failed to load .env.test:', err.message);
  console.error('   Make sure .env.test exists with test Supabase credentials.');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_TEST;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables in .env.test:');
  if (!SUPABASE_URL) console.error('   - VITE_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY_TEST');
  process.exit(1);
}

// Verify we're pointing at the test project
if (!SUPABASE_URL.includes('jxtlfdanzclcmtsgsrdd')) {
  console.error('❌ SAFETY CHECK FAILED: VITE_SUPABASE_URL does not point to the test project!');
  console.error(`   Expected: https://jxtlfdanzclcmtsgsrdd.supabase.co`);
  console.error(`   Got: ${SUPABASE_URL}`);
  console.error('   Aborting to prevent resetting production database.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const bucketName = 'bpmn-files';

/**
 * Truncate all test data tables
 */
async function truncateTables() {
  console.log('🗑️  Truncating tables...');

  // Tables with composite keys or no id column need special handling
  const tablesWithCompositeKeys = {
    'integration_overrides': 'bpmn_file', // Use any non-null column
  };

  const tables = [
    'node_planned_scenarios',
    'generation_jobs',
    'llm_generation_logs',
    'integration_overrides',
    'timeline_dates',
    'bpmn_file_diffs',
    'bpmn_file_versions',
    'bpmn_dependencies',
    'bpmn_files',
  ];

  for (const table of tables) {
    try {
      let query;

      if (tablesWithCompositeKeys[table]) {
        // For tables with composite keys, use a different column
        const column = tablesWithCompositeKeys[table];
        query = adminClient.from(table).delete().neq(column, '__nonexistent__');
      } else {
        // For tables with id column
        query = adminClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;

      if (error) {
        console.warn(`   ⚠️  Failed to truncate ${table}:`, error.message);
      } else {
        console.log(`   ✅ Truncated ${table}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Error truncating ${table}:`, err.message);
    }
  }
}

/**
 * Clear storage bucket
 */
async function clearStorageBucket() {
  console.log(`🗑️  Clearing storage bucket "${bucketName}"...`);

  try {
    // List all files in bucket
    const { data: files, error: listError } = await adminClient.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      console.warn(`   ⚠️  Failed to list files:`, listError.message);
      return;
    }

    if (!files || files.length === 0) {
      console.log(`   ✅ Bucket is already empty.`);
      return;
    }

    // Delete all files
    const filePaths = files.map(f => f.name);
    const { error: deleteError } = await adminClient.storage
      .from(bucketName)
      .remove(filePaths);

    if (deleteError) {
      console.warn(`   ⚠️  Failed to delete files:`, deleteError.message);
    } else {
      console.log(`   ✅ Deleted ${filePaths.length} file(s) from storage.`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Error clearing storage:`, err.message);
  }
}

/**
 * Delete all auth users
 */
async function clearAuthUsers() {
  console.log('🗑️  Clearing auth users...');

  try {
    const { data, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      console.warn(`   ⚠️  Failed to list users:`, listError.message);
      return;
    }

    if (!data || data.users.length === 0) {
      console.log(`   ✅ No users to delete.`);
      return;
    }

    let deletedCount = 0;
    for (const user of data.users) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.warn(`   ⚠️  Failed to delete user ${user.email}:`, deleteError.message);
      } else {
        deletedCount++;
      }
    }

    console.log(`   ✅ Deleted ${deletedCount} user(s).`);
  } catch (err) {
    console.warn(`   ⚠️  Error clearing users:`, err.message);
  }
}

/**
 * Main reset function
 */
async function main() {
  console.log('🔄 Resetting test database...');
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log('');

  try {
    // Step 1: Truncate tables
    await truncateTables();
    console.log('');

    // Step 2: Clear storage
    await clearStorageBucket();
    console.log('');

    // Step 3: Clear auth users
    await clearAuthUsers();
    console.log('');

    console.log('✅ Test database reset complete!');

    // Step 4: Re-seed if not skipped
    if (!skipSeed) {
      console.log('');
      console.log('🌱 Re-seeding test database...');
      console.log('');

      try {
        execSync('node scripts/seed-test-db.mjs', {
          stdio: 'inherit',
          cwd: resolve(__dirname, '..'),
        });
      } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
      }
    } else {
      console.log('');
      console.log('⏭️  Skipping re-seed (--skip-seed flag set).');
      console.log('   Run "npm run seed:test-db" to seed the database.');
    }
  } catch (err) {
    console.error('\n❌ Reset failed:', err.message);
    process.exit(1);
  }
}

main();
