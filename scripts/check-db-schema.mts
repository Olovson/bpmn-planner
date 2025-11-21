import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

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

async function checkGenerationJobsModeColumn() {
  try {
    const { error } = await supabase
      .from('generation_jobs')
      .select('mode')
      .limit(1);

    if (error) {
      const isSchemaModeError =
        typeof error.code === 'string' &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes("'mode' column of 'generation_jobs'");

      if (isSchemaModeError) {
        console.error(
          '[DB Schema Check] generation_jobs saknar kolumnen "mode". Detta tyder på att migrationerna inte är körda eller att Supabase kör mot fel databas/volym.\n' +
            'Åtgärd: Kör "supabase db reset" eller "supabase migration up" i projektets rot och starta om Supabase.'
        );
        process.exit(1);
      }

      console.error('[DB Schema Check] Fel vid kontroll av generation_jobs.mode:', error);
      process.exit(1);
    }

    console.log('[DB Schema Check] OK: generation_jobs.mode finns i schema.');
    process.exit(0);
  } catch (err) {
    console.error('[DB Schema Check] Oväntat fel:', err);
    process.exit(1);
  }
}

checkGenerationJobsModeColumn();
