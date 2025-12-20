#!/usr/bin/env node
/**
 * Verifierar om det finns pågående generation jobs i Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ladda .env.local först, sedan .env
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY saknas i .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOngoingProcesses() {
  console.log('🔍 Kontrollerar pågående generation jobs...\n');

  try {
    const { data: runningJobs, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Fel vid kontroll av generation jobs:', error.message);
      return;
    }

    if (!runningJobs || runningJobs.length === 0) {
      console.log('✅ Inga pågående generation jobs hittades.');
      console.log('   Alla processer verkar ha stoppats korrekt.\n');
      return;
    }

    console.log(`⚠️  Hittade ${runningJobs.length} pågående generation job(s):\n`);

    for (const job of runningJobs) {
      const created = new Date(job.created_at);
      const started = job.started_at ? new Date(job.started_at) : null;
      const now = new Date();
      const duration = started 
        ? Math.round((now - started) / 1000) 
        : Math.round((now - created) / 1000);

      console.log(`   📋 Job ID: ${job.id}`);
      console.log(`      Fil: ${job.file_name}`);
      console.log(`      Operation: ${job.operation}`);
      console.log(`      Status: ${job.status}`);
      console.log(`      Progress: ${job.progress || 0}/${job.total || '?'}`);
      console.log(`      Skapad: ${created.toLocaleString('sv-SE')}`);
      if (started) {
        console.log(`      Startad: ${started.toLocaleString('sv-SE')}`);
      }
      console.log(`      Varaktighet: ${duration} sekunder`);
      console.log('');
    }

    console.log('💡 Tips:');
    console.log('   - Om dessa jobs är "stuck", kan du manuellt uppdatera dem i Supabase');
    console.log('   - Eller vänta några sekunder och kör scriptet igen');
    console.log('   - Pågående API-anrop kan ta några sekunder att slutföras även efter cancellation\n');
  } catch (error) {
    console.error('❌ Oväntat fel:', error.message);
  }
}

checkOngoingProcesses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fel:', error);
    process.exit(1);
  });
