#!/usr/bin/env node

/**
 * Script to create the seed user in Supabase after db reset.
 * 
 * Usage:
 *   node scripts/create-seed-user.mjs
 *   npm run create:seed-user
 */

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
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'seed-bot@local.test';
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Passw0rd!';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local first.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function createSeedUser() {
  console.log('🔍 Checking for existing seed user...');
  
  const { data, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
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
      process.exit(1);
    }

    console.log(`✅ Seed user updated successfully!`);
    console.log(`   Email: ${SEED_USER_EMAIL}`);
    console.log(`   Password: ${SEED_USER_PASSWORD}`);
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
    process.exit(1);
  }

  console.log(`✅ Seed user created successfully!`);
  console.log(`   Email: ${SEED_USER_EMAIL}`);
  console.log(`   Password: ${SEED_USER_PASSWORD}`);
  console.log(`   User ID: ${created.user.id}`);
  
  return created.user.id;
}

createSeedUser()
  .then(() => {
    console.log('\n✨ Done! You can now log in with:');
    console.log(`   Email: ${SEED_USER_EMAIL}`);
    console.log(`   Password: ${SEED_USER_PASSWORD}`);
  })
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });

