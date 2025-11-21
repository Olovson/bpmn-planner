import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local if it exists
config({ path: resolve(process.cwd(), '.env.local') });

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

async function checkColumn(table: string, column: string) {
  try {
    const { error } = await supabase
      .from(table)
      .select(column)
      .limit(1);

    if (error) {
      const isSchemaModeError =
        typeof error.code === 'string' &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes(`'${column}' column of '${table}'`);

      if (isSchemaModeError) {
        console.error(
          `[DB Schema Check] ${table} saknar kolumnen "${column}". Detta tyder på att migrationerna inte är körda eller att PostgREST schema-cache är utdaterad.\n` +
            'Åtgärd: Kör "supabase db reset" eller "supabase stop && supabase start" i projektets rot för att tvinga PostgREST att uppdatera schema-cache.'
        );
        return false;
      }

      console.error(`[DB Schema Check] Fel vid kontroll av ${table}.${column}:`, error);
      return false;
    }

    console.log(`[DB Schema Check] OK: ${table}.${column} finns i schema.`);
    return true;
  } catch (err) {
    console.error(`[DB Schema Check] Oväntat fel vid kontroll av ${table}.${column}:`, err);
    return false;
  }
}

async function checkAllRequiredColumns() {
  const checks = [
    { table: 'generation_jobs', column: 'mode' },
    { table: 'node_test_links', column: 'mode' },
  ];

  let allPassed = true;
  for (const check of checks) {
    const passed = await checkColumn(check.table, check.column);
    if (!passed) {
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error(
      '\n[DB Schema Check] Schema-validering misslyckades. PostgREST schema-cache är troligen utdaterad.\n' +
        'Lösning: Kör "supabase stop && supabase start" för att tvinga PostgREST att läsa om schemat.'
    );
    process.exit(1);
  }

  console.log('\n[DB Schema Check] Alla schema-kontroller passerade.');
  process.exit(0);
}

checkAllRequiredColumns();
