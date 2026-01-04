#!/usr/bin/env node

/**
 * Script to seed the test Supabase database with baseline data.
 *
 * This script:
 * 1. Creates a test user (seed-bot@local.test)
 * 2. Optionally seeds BPMN fixtures from tests/fixtures/bpmn
 * 3. Ensures the bpmn-files storage bucket exists
 *
 * Usage:
 *   node scripts/seed-test-db.mjs [--skip-bpmn]
 *   npm run seed:test-db
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync } from 'fs';
import { readdir, readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line args
const skipBpmn = process.argv.includes('--skip-bpmn');

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
const SEED_USER_EMAIL = 'seed-bot@local.test';
const SEED_USER_PASSWORD = 'Passw0rd!';

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
  console.error('   Aborting to prevent seeding production database.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const bucketName = 'bpmn-files';

/**
 * Create or update the seed user
 */
async function createSeedUser() {
  console.log('🔍 Checking for existing seed user...');

  const { data, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    throw listError;
  }

  const existing = data.users.find((user) => user.email === SEED_USER_EMAIL);

  if (existing) {
    console.log(`✅ User ${SEED_USER_EMAIL} already exists. Updating password...`);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
      password: SEED_USER_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error('❌ Failed to update seed user:', updateError.message);
      throw updateError;
    }

    console.log(`✅ Seed user updated successfully!`);
    return existing.id;
  }

  console.log(`📝 Creating seed user: ${SEED_USER_EMAIL}...`);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: SEED_USER_EMAIL,
    password: SEED_USER_PASSWORD,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    console.error('❌ Failed to create seed user:', createError?.message ?? 'Unknown error');
    throw createError || new Error('User creation failed');
  }

  console.log(`✅ Seed user created successfully!`);
  console.log(`   User ID: ${created.user.id}`);

  return created.user.id;
}

/**
 * Ensure the bpmn-files storage bucket exists
 */
async function ensureStorageBucket() {
  console.log('🪣 Checking storage bucket...');

  const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
  if (listError) {
    console.error('❌ Failed to list storage buckets:', listError.message);
    throw listError;
  }

  const bucketExists = buckets.some(b => b.name === bucketName);

  if (bucketExists) {
    console.log(`✅ Storage bucket "${bucketName}" already exists.`);
    return;
  }

  console.log(`📦 Creating storage bucket "${bucketName}"...`);

  const { error: createError } = await adminClient.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/xml', 'text/xml'],
  });

  if (createError) {
    console.error('❌ Failed to create storage bucket:', createError.message);
    throw createError;
  }

  console.log(`✅ Storage bucket "${bucketName}" created successfully!`);
}

/**
 * Seed BPMN fixtures from tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11
 *
 * Seeds the mortgage process BPMN files with proper subprocess relationships:
 * - mortgage.bpmn (root process, contains subprocess callActivity to application)
 * - mortgage-se-application.bpmn (subprocess, contains callActivity to internal-data-gathering)
 * - mortgage-se-internal-data-gathering.bpmn (subprocess)
 */
async function seedBpmnFixtures() {
  if (skipBpmn) {
    console.log('⏭️  Skipping BPMN fixtures (--skip-bpmn flag set).');
    return;
  }

  console.log('📄 Seeding BPMN fixtures...');

  // Use the correct mortgage-se directory with proper subprocess relationships
  const bpmnDir = resolve(__dirname, '../tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11');

  // Seed these key files that have subprocess relationships
  const filesToSeed = [
    'mortgage.bpmn',                              // Root process
    'mortgage-se-application.bpmn',               // Subprocess of mortgage
    'mortgage-se-internal-data-gathering.bpmn',   // Subprocess of application
    'simple-process.bpmn',                        // Simple test file (if it exists)
  ];

  let seededCount = 0;
  let skippedCount = 0;

  for (const fileName of filesToSeed) {
    const filePath = join(bpmnDir, fileName);

    // Check if file exists
    let fileContents;
    try {
      fileContents = await readFile(filePath);
    } catch (err) {
      // Try parent directory for simple-process.bpmn
      if (fileName === 'simple-process.bpmn') {
        try {
          const parentDir = resolve(__dirname, '../tests/fixtures/bpmn');
          fileContents = await readFile(join(parentDir, fileName));
        } catch {
          console.log(`   ⏭️  ${fileName} (not found, skipping)`);
          continue;
        }
      } else {
        console.warn(`   ⚠️  Could not read ${fileName}:`, err.message);
        continue;
      }
    }

    const storagePath = fileName; // Store at root level

    // Check if file already exists
    const { data: existingFile } = await adminClient
      .from('bpmn_files')
      .select('file_name')
      .eq('storage_path', storagePath)
      .single();

    if (existingFile) {
      skippedCount++;
      console.log(`   ⏭️  ${fileName} (already exists)`);
      continue;
    }

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(storagePath, fileContents, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/xml',
      });

    if (uploadError) {
      console.error(`   ❌ Failed to upload ${fileName}:`, uploadError.message);
      continue;
    }

    // Save metadata to database
    const { error: dbError } = await adminClient.from('bpmn_files').insert({
      file_name: fileName,
      storage_path: storagePath,
      file_type: 'bpmn',
      size_bytes: fileContents.byteLength,
      github_synced: false,
      has_structure_changes: false,
      meta: null,
    });

    if (dbError) {
      console.error(`   ❌ Failed to save metadata for ${fileName}:`, dbError.message);
    } else {
      seededCount++;
      console.log(`   ✅ ${fileName}`);
    }
  }

  console.log(`\n✅ Seeded ${seededCount} BPMN file(s), skipped ${skippedCount} existing file(s).`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Starting test database seeding...');
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log('');

  try {
    // Step 1: Create seed user
    await createSeedUser();
    console.log('');

    // Step 2: Ensure storage bucket exists
    await ensureStorageBucket();
    console.log('');

    // Step 3: Seed BPMN fixtures
    await seedBpmnFixtures();
    console.log('');

    console.log('✨ Test database seeding complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Seed user: ${SEED_USER_EMAIL}`);
    console.log(`   • Password: ${SEED_USER_PASSWORD}`);
    console.log(`   • Storage bucket: ${bucketName}`);
    console.log('');
    console.log('You can now run tests against this test database.');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

main();
