#!/usr/bin/env node

/**
 * Script som rensar alla data från databasen och storage, men behåller schema och återskapar användare
 * 
 * Användning:
 *   node scripts/clean-database.mjs
 *   eller
 *   npm run clean:database
 * 
 * Detta script:
 * 1. Rensar alla tabeller (TRUNCATE)
 * 2. Rensar storage (behåller bucket-strukturen)
 * 3. Återskapar seed-användare
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message) {
  console.log(`[Clean Database] ${message}`);
}

function error(message) {
  console.error(`[Clean Database] ERROR: ${message}`);
}

// Load environment variables
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
  error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Lista över alla tabeller som ska rensas (i rätt ordning för att undvika foreign key-fel)
const TABLES_TO_CLEAN = [
  // Generated data (kan tas bort först)
  'node_planned_scenarios',
  'e2e_scenarios',
  'node_test_links',
  'test_results',
  'bpmn_docs',
  'dor_dod_status',
  'generation_jobs',
  'llm_generation_logs',
  
  // Dependencies och mappings (mappings innan versions)
  'bpmn_dependencies',
  'node_references',
  'bpmn_element_mappings', // Måste rensas innan versions
  'bpmn_file_diffs',
  
  // Versions (innan files)
  'versions', // Måste rensas innan bpmn_files eftersom bpmn_element_mappings refererar till den
  'bpmn_file_versions',
  
  // Files (sist, eftersom andra tabeller refererar till dem)
  'bpmn_files',
  
  // Timeline och integration
  'timeline_dates',
  'integration_overrides',
];

async function cleanDatabase() {
  log('Rensar databas...');
  
  const cleaned = {};
  const errors = [];
  
  for (const table of TABLES_TO_CLEAN) {
    try {
      // Räkna rader först
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        // Tabellen kanske inte finns eller vi har inte access
        log(`⚠️  Kunde inte räkna rader i ${table}: ${countError.message}`);
        continue;
      }
      
      const rowCount = count || 0;
      
      if (rowCount === 0) {
        log(`✓ ${table}: redan tom (0 rader)`);
        cleaned[table] = 0;
        continue;
      }
      
      // Använd DELETE (TRUNCATE kräver direkt SQL-access)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        // Om DELETE misslyckas pga foreign keys, försök med CASCADE via SQL
        // Men vi kan inte köra direkt SQL via Supabase client, så vi loggar felet
        errors.push(`${table}: ${deleteError.message}`);
        log(`⚠️  Kunde inte rensa ${table}: ${deleteError.message}`);
        log(`   Tips: Kör 'TRUNCATE TABLE ${table} CASCADE;' manuellt i Supabase SQL editor om det behövs`);
      } else {
        cleaned[table] = rowCount;
        log(`✓ Rensade ${table}: ${rowCount} rader`);
      }
    } catch (err) {
      errors.push(`${table}: ${err.message}`);
      log(`⚠️  Kunde inte rensa ${table}: ${err.message}`);
    }
  }
  
  if (errors.length > 0) {
    log(`\n⚠️  Varningar vid rensning:`);
    errors.forEach(e => log(`  - ${e}`));
  }
  
  return { cleaned, errors };
}

async function cleanStorage() {
  log('\nRensar storage...');
  
  const prefixesToClean = [
    'docs',
    'generated-docs',
    'tests',
    'tests/e2e',
    'test-reports',
    'reports',
    'llm-debug',
    'bpmn', // BPMN source files
    'dmn',  // DMN source files
  ];
  
  let totalDeleted = 0;
  
  const deleteStorageTree = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .list(path, { limit: 1000 });
      
      if (error) {
        if (error.message?.includes('not found') || error.statusCode === 404) {
          return 0; // Directory doesn't exist, skip
        }
        log(`⚠️  Kunde inte lista ${path}: ${error.message}`);
        return 0;
      }
      
      if (!data || data.length === 0) return 0;
      
      let removed = 0;
      const fileBatch = [];
      
      for (const entry of data) {
        const isDirectory = !entry?.metadata;
        const fullPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (isDirectory) {
          removed += await deleteStorageTree(fullPath);
        } else {
          fileBatch.push(fullPath);
        }
      }
      
      if (fileBatch.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('bpmn-files')
          .remove(fileBatch);
        
        if (deleteError) {
          log(`⚠️  Kunde inte ta bort filer från ${path}: ${deleteError.message}`);
        } else {
          removed += fileBatch.length;
          log(`✓ Tog bort ${fileBatch.length} filer från ${path}`);
        }
      }
      
      return removed;
    } catch (err) {
      log(`⚠️  Fel vid rensning av ${path}: ${err.message}`);
      return 0;
    }
  };
  
  // Ta också bort bpmn-map.json specifikt
  try {
    const { error: mapError } = await supabase.storage
      .from('bpmn-files')
      .remove(['bpmn-map.json']);
    
    if (!mapError) {
      log('✓ Tog bort bpmn-map.json från storage');
      totalDeleted++;
    }
  } catch (err) {
    // Ignorera om filen inte finns
  }
  
  for (const prefix of prefixesToClean) {
    const deleted = await deleteStorageTree(prefix);
    totalDeleted += deleted;
  }
  
  log(`✓ Totalt ${totalDeleted} filer/foldrar borttagna från storage`);
  return totalDeleted;
}

async function createSeedUser() {
  log('\nÅterskapar seed-användare...');
  
  try {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      log(`⚠️  Kunde inte lista användare: ${listError.message}`);
      return;
    }
    
    // Ta bort befintlig seed-användare om den finns
    const existing = users.users.find((user) => user.email === SEED_USER_EMAIL);
    if (existing) {
      log(`Tar bort befintlig seed-användare...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existing.id);
      if (deleteError) {
        log(`⚠️  Kunde inte ta bort befintlig användare: ${deleteError.message}`);
      }
    }
    
    // Skapa ny seed-användare
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
      email_confirm: true,
    });
    
    if (createError || !created?.user) {
      log(`⚠️  Kunde inte skapa seed-användare: ${createError?.message ?? 'Unknown error'}`);
      return;
    }
    
    log(`✅ Seed-användare skapad: ${SEED_USER_EMAIL} (${created.user.id})`);
    log(`   Lösenord: ${SEED_USER_PASSWORD}`);
  } catch (err) {
    log(`⚠️  Oväntat fel vid skapande av seed-användare: ${err.message}`);
  }
}

async function main() {
  log('Startar rensning av databas och storage...');
  log(`Supabase URL: ${SUPABASE_URL}`);
  
  try {
    // 1. Rensa databas
    const { cleaned, errors } = await cleanDatabase();
    
    // 2. Rensa storage
    const storageDeleted = await cleanStorage();
    
    // 3. Återskapa seed-användare
    await createSeedUser();
    
    log('\n✅ Rensning klar!');
    log(`\nSammanfattning:`);
    log(`  - Tabeller rensade: ${Object.keys(cleaned).length}`);
    log(`  - Filer borttagna från storage: ${storageDeleted}`);
    if (errors.length > 0) {
      log(`  - Varningar: ${errors.length}`);
    }
    log(`\nDu kan nu börja ladda upp BPMN-filer från scratch.`);
    log(`Systemet kommer automatiskt generera bpmn-map.json när du laddar upp filer.`);
    
  } catch (err) {
    error(`Oväntat fel: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Kritisk fel: ${err.message}`);
  console.error(err);
  process.exit(1);
});
