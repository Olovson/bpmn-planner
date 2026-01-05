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
 * Seed BPMN fixtures from tests/fixtures/bpmn/mortgage-se directories
 *
 * Seeds ALL mortgage process BPMN files from two fixture sets:
 * - mortgage-se 2026.01.04 16:30 (22 files - aktuell struktur för tester)
 *
 * För nu använder vi endast 2026-snapshoten i test-Supabase. Äldre BPMN-filer
 * i test-projektet rensas bort innan seeding, så att endast den aktuella
 * strukturen finns i databasen och i Storage.
 */
async function seedBpmnFixtures() {
  if (skipBpmn) {
    console.log('⏭️  Skipping BPMN fixtures (--skip-bpmn flag set).');
    return;
  }

  console.log('📄 Seeding BPMN fixtures from mortgage-se fixture directories...');

  // För nu använder vi bara 2026-snapshoten som källa till test-Supabase
  const fixtureDirectories = [
    {
      path: resolve(__dirname, '../tests/fixtures/bpmn/mortgage-se 2026.01.04 16:30'),
      label: '2026.01.04 (alternative structure)',
    },
  ];

  let totalSeeded = 0;
  let totalSkipped = 0;

  // Rensa befintliga BPMN-filer i test-Supabase så vi inte blandar gamla snapshots
  console.log('🧹 Clearing existing BPMN files from test database/storage...');
  try {
    const { data: existingFiles, error: existingError } = await adminClient
      .from('bpmn_files')
      .select('file_name, storage_path')
      .eq('file_type', 'bpmn');

    if (existingError) {
      console.warn('   ⚠️  Could not list existing BPMN files:', existingError.message);
    } else if (existingFiles && existingFiles.length > 0) {
      const pathsToRemove = existingFiles
        .map((f) => f.storage_path)
        .filter((p) => typeof p === 'string');

      if (pathsToRemove.length > 0) {
        const { error: removeError } = await adminClient.storage
          .from(bucketName)
          .remove(pathsToRemove);
        if (removeError) {
          console.warn('   ⚠️  Could not remove BPMN files from storage:', removeError.message);
        }
      }

      const { error: deleteError } = await adminClient
        .from('bpmn_files')
        .delete()
        .eq('file_type', 'bpmn');
      if (deleteError) {
        console.warn('   ⚠️  Could not delete BPMN rows from database:', deleteError.message);
      } else {
        console.log(`   ✅ Removed ${existingFiles.length} existing BPMN row(s) from database.`);
      }
    } else {
      console.log('   ✅ No existing BPMN files to clear.');
    }
  } catch (err) {
    console.warn('   ⚠️  Error while clearing existing BPMN files:', err.message);
  }

  for (const { path: dirPath, label } of fixtureDirectories) {
    console.log(`\n  📁 Processing: ${label}`);

    let files;
    try {
      files = await readdir(dirPath);
    } catch (err) {
      console.error(`   ❌ Could not read directory:`, err.message);
      continue;
    }

    // Filter to only .bpmn files (exclude .json, .md, .DS_Store, etc)
    const bpmnFiles = files.filter(f => f.endsWith('.bpmn'));

    console.log(`   Found ${bpmnFiles.length} BPMN file(s)`);

    for (const fileName of bpmnFiles) {
      const filePath = join(dirPath, fileName);

      let fileContents;
      try {
        fileContents = await readFile(filePath);
      } catch (err) {
        console.warn(`   ⚠️  Could not read ${fileName}:`, err.message);
        continue;
      }

      const storagePath = fileName; // Store at root level

      // Check if file already exists in database
      const { data: existingFile } = await adminClient
        .from('bpmn_files')
        .select('file_name')
        .eq('storage_path', storagePath)
        .single();

      if (existingFile) {
        totalSkipped++;
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
        totalSeeded++;
        console.log(`   ✅ ${fileName}`);
      }
    }
  }

  // Also seed simple-process.bpmn from parent directory if it exists
  console.log(`\n  📁 Processing: Additional fixtures`);
  const parentDir = resolve(__dirname, '../tests/fixtures/bpmn');
  const simpleProcessPath = join(parentDir, 'simple-process.bpmn');

  try {
    const fileContents = await readFile(simpleProcessPath);
    const storagePath = 'simple-process.bpmn';

    const { data: existingFile } = await adminClient
      .from('bpmn_files')
      .select('file_name')
      .eq('storage_path', storagePath)
      .single();

    if (existingFile) {
      totalSkipped++;
      console.log(`   ⏭️  simple-process.bpmn (already exists)`);
    } else {
      const { error: uploadError } = await adminClient.storage
        .from(bucketName)
        .upload(storagePath, fileContents, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/xml',
        });

      if (!uploadError) {
        const { error: dbError } = await adminClient.from('bpmn_files').insert({
          file_name: 'simple-process.bpmn',
          storage_path: storagePath,
          file_type: 'bpmn',
          size_bytes: fileContents.byteLength,
          github_synced: false,
          has_structure_changes: false,
          meta: null,
        });

        if (!dbError) {
          totalSeeded++;
          console.log(`   ✅ simple-process.bpmn`);
        }
      }
    }
  } catch (err) {
    console.log(`   ⏭️  simple-process.bpmn (not found, skipping)`);
  }

  // Also upload bpmn-map.json from projektroten (source of truth för aktuell mapping)
  console.log(`\n  📁 Processing: bpmn-map.json`);
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');

  try {
    const bpmnMapContents = await readFile(bpmnMapPath);
    const storagePath = 'bpmn-map.json';

    // Upload to storage (always upsert to ensure latest version)
    const { error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(storagePath, bpmnMapContents, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/json',
      });

    if (!uploadError) {
      console.log(`   ✅ bpmn-map.json (uploaded to storage)`);
    } else {
      console.warn(`   ⚠️  Could not upload bpmn-map.json:`, uploadError.message);
    }
  } catch (err) {
    console.log(`   ⏭️  bpmn-map.json (not found, skipping)`);
  }

  console.log(`\n✅ Seeded ${totalSeeded} BPMN file(s), skipped ${totalSkipped} existing file(s).`);
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
