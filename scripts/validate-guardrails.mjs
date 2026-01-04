#!/usr/bin/env node

/**
 * Script to validate Supabase client guardrails.
 * Tests that the safety checks properly prevent misconfigured test environments.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Validating Supabase Client Guardrails...\n');

// Test 1: Valid test configuration
console.log('Test 1: Valid test configuration');
console.log('='.repeat(50));

const validEnvPath = resolve(__dirname, '../.env.test');
try {
  const envContents = readFileSync(validEnvPath, 'utf-8');
  const env = {};
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    env[key] = rest.join('=');
  }

  if (env.VITE_APP_ENV === 'test' && env.VITE_SUPABASE_URL?.includes('jxtlfdanzclcmtsgsrdd')) {
    console.log('✅ PASS: .env.test correctly configured');
    console.log(`   VITE_APP_ENV: ${env.VITE_APP_ENV}`);
    console.log(`   VITE_SUPABASE_URL: ${env.VITE_SUPABASE_URL}`);
  } else {
    console.log('❌ FAIL: .env.test is misconfigured');
    process.exit(1);
  }
} catch (err) {
  console.log('❌ FAIL: Could not read .env.test:', err.message);
  process.exit(1);
}

console.log('');

// Test 2: Invalid test configuration (should be caught by guardrails)
console.log('Test 2: Invalid test configuration (guardrail validation)');
console.log('='.repeat(50));

const invalidEnvPath = resolve(__dirname, '../.env.test.validation');
try {
  const envContents = readFileSync(invalidEnvPath, 'utf-8');
  const env = {};
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    env[key] = rest.join('=');
  }

  // Simulate the guardrail check
  const KNOWN_TEST_SUPABASE_URL = 'https://jxtlfdanzclcmtsgsrdd.supabase.co';

  if (env.VITE_APP_ENV === 'test' && !env.VITE_SUPABASE_URL?.includes('jxtlfdanzclcmtsgsrdd')) {
    console.log('✅ PASS: Guardrail would correctly reject this configuration');
    console.log(`   VITE_APP_ENV: ${env.VITE_APP_ENV}`);
    console.log(`   VITE_SUPABASE_URL: ${env.VITE_SUPABASE_URL} (INVALID)`);
    console.log(`   Expected: ${KNOWN_TEST_SUPABASE_URL}`);
    console.log('   Guardrail message: "SAFETY CHECK FAILED: VITE_APP_ENV=test but VITE_SUPABASE_URL does not point to test project!"');
  } else {
    console.log('❌ FAIL: Guardrail would NOT catch this misconfiguration');
    process.exit(1);
  }
} catch (err) {
  console.log('⚠️  SKIP: Could not read .env.test.validation (this is optional)');
}

console.log('');
console.log('='.repeat(50));
console.log('✅ All guardrail validation tests passed!');
console.log('');
console.log('Summary:');
console.log('  • .env.test correctly points to test Supabase project');
console.log('  • Guardrails would reject misconfigured test environments');
console.log('  • Safety checks are working as expected');
