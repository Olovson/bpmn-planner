#!/usr/bin/env node

/**
 * Script som kontrollerar om Supabase körs lokalt.
 * 
 * Användning:
 *   node scripts/check-supabase-status.mjs
 *   eller
 *   npm run check:supabase-status
 */

import { execSync } from 'child_process';

function checkSupabaseStatus() {
  try {
    const output = execSync('supabase status', { 
      encoding: 'utf-8', 
      stdio: 'pipe',
      timeout: 5000 
    });
    
    if (output.includes('API URL:')) {
      console.log('✅ Supabase körs');
      console.log(output);
      return true;
    } else {
      console.log('❌ Supabase körs inte (ingen API URL hittades)');
      return false;
    }
  } catch (error) {
    console.log('❌ Supabase körs inte');
    console.log('   Kör "supabase start" för att starta Supabase');
    return false;
  }
}

const isRunning = checkSupabaseStatus();
process.exit(isRunning ? 0 : 1);

