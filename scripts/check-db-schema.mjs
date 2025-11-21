import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually if it exists
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
} catch (err) {
  // .env.local might not exist, that's ok
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    '[DB Schema Check] VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY saknas. Kontrollera din .env.local.'
  );
  process.exit(1);
}

console.log('[DB Schema Check] Kontrollerar schema mot:', url);

const supabase = createClient(url, key);

// Note: We can't import the TypeScript utility directly in .mjs,
// so we replicate the logic here for the script
async function checkColumn(table, column) {
  try {
    const { error } = await supabase
      .from(table)
      .select(column)
      .limit(1);

    if (error) {
      // Check if it's a connection error (Supabase not running)
      const isConnectionError = 
        error.message && 
        (error.message.includes('fetch failed') || 
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('network'));

      if (isConnectionError) {
        console.error(
          `[DB Schema Check] Kan inte ansluta till Supabase. Supabase körs inte.\n` +
          `Åtgärd: Kör "supabase start" för att starta Supabase lokalt.`
        );
        return {
          table,
          column,
          exists: false,
          error: {
            code: 'CONNECTION_ERROR',
            message: 'fetch failed - Supabase körs inte'
          }
        };
      }

      const isSchemaModeError =
        typeof error.code === 'string' &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes(`'${column}' column of '${table}'`);

      if (isSchemaModeError) {
        console.error(
          `[DB Schema Check] ${table} saknar kolumnen "${column}". Detta tyder på att migrationerna inte är körda eller att PostgREST schema-cache är utdaterad.\n` +
            'Åtgärd: Kör "npm run supabase:reset" eller "supabase stop && supabase start" i projektets rot för att tvinga PostgREST att uppdatera schema-cache.'
        );
        return {
          table,
          column,
          exists: false,
          error: {
            code: 'PGRST204',
            message: error.message || 'Schema cache outdated'
          }
        };
      }

      console.error(`[DB Schema Check] Fel vid kontroll av ${table}.${column}:`, error);
      return {
        table,
        column,
        exists: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Unknown error'
        }
      };
    }

    console.log(`[DB Schema Check] OK: ${table}.${column} finns i schema.`);
    return {
      table,
      column,
      exists: true
    };
  } catch (err) {
    // Check if it's a connection error in the catch block too
    const errMessage = err instanceof Error ? err.message : String(err);
    const isConnectionError = 
      errMessage.includes('fetch failed') || 
      errMessage.includes('ECONNREFUSED') ||
      errMessage.includes('network');

    if (isConnectionError) {
      console.error(
        `[DB Schema Check] Kan inte ansluta till Supabase. Supabase körs inte.\n` +
        `Åtgärd: Kör "supabase start" för att starta Supabase lokalt.`
      );
      return {
        table,
        column,
        exists: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: 'fetch failed - Supabase körs inte'
        }
      };
    } else {
      console.error(`[DB Schema Check] Oväntat fel vid kontroll av ${table}.${column}:`, err);
      return {
        table,
        column,
        exists: false,
        error: {
          code: 'EXCEPTION',
          message: err instanceof Error ? err.message : 'Unknown exception'
        }
      };
    }
  }
}

async function checkAllRequiredColumns() {
  const checks = [
    { table: 'generation_jobs', column: 'mode' },
    { table: 'node_test_links', column: 'mode' },
  ];

  const results = [];
  for (const check of checks) {
    const result = await checkColumn(check.table, check.column);
    results.push(result);
  }

  const allPassed = results.every(result => result.exists);

  if (!allPassed) {
    // Check if it was a connection error
    const hasConnectionError = results.some(result => {
      if (!result.error) return false;
      return result.error.code === 'CONNECTION_ERROR' ||
             (result.error.message && (
               result.error.message.includes('fetch failed') || 
               result.error.message.includes('ECONNREFUSED') ||
               result.error.message.includes('network')
             ));
    });

    if (hasConnectionError) {
      console.error(
        '\n[DB Schema Check] ❌ Supabase körs inte.\n' +
        'Lösning: Kör "supabase start" för att starta Supabase lokalt.\n' +
        'Efter start, kör "npm run check:db-schema" igen för att verifiera schema.'
      );
    } else {
      console.error(
        '\n[DB Schema Check] Schema-validering misslyckades. PostgREST schema-cache är troligen utdaterad.\n' +
        'Lösning: Kör "npm run supabase:reset" för att tvinga PostgREST att läsa om schemat.'
      );
    }
    process.exit(1);
  }

  console.log('\n[DB Schema Check] Alla schema-kontroller passerade.');
  process.exit(0);
}

checkAllRequiredColumns();
