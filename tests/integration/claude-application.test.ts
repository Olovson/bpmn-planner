/**
 * Integration test för Claude-generering av application-processen
 * 
 * Detta test använder samma funktioner som appen för att generera dokumentation
 * med Claude för mortgage-se-application.bpmn
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { generateAllFromBpmnWithGraph } from '../../src/lib/bpmnGenerators';
import type { LlmProvider } from '../../src/lib/llmClientAbstraction';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Ladda .env (försök från projektets root)
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} catch {
  // Ignorera om .env inte finns
}

// Använd process.env först (från npm script), sedan import.meta.env (från Vite)
const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const useLlmEnv = process.env.VITE_USE_LLM || import.meta.env.VITE_USE_LLM;
const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY måste vara satta i .env eller som miljövariabler');
}

if (!useLlmEnv || useLlmEnv !== 'true') {
  throw new Error('VITE_USE_LLM måste vara "true"');
}

if (!anthropicKey) {
  throw new Error('VITE_ANTHROPIC_API_KEY måste vara satt i .env eller som miljövariabel');
}

// Skapa Supabase-klient
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

describe('Claude-generering för application-processen', () => {
  it('genererar dokumentation för mortgage-se-application.bpmn med Claude', async () => {
    // 1. Hämta BPMN-filen från databasen
    const { data: bpmnFile, error: fileError } = await supabase
      .from('bpmn_files')
      .select('*')
      .eq('file_name', 'mortgage-se-application.bpmn')
      .single();

    if (fileError || !bpmnFile) {
      throw new Error(`Kunde inte hitta mortgage-se-application.bpmn: ${fileError?.message || 'Not found'}`);
    }

    // 2. Förbered parametrar för generering
    const fileName = bpmnFile.file_name;
    const graphFiles = [fileName];
    const existingDmnFiles: string[] = [];
    const useHierarchy = false;
    const useLlm = true;
    const handleGeneratorPhase = (phase: string, progress: string, detail?: string) => {
      console.log(`  📊 ${phase}: ${progress}${detail ? ` (${detail})` : ''}`);
    };
    const generationSourceLabel = 'Claude (moln-LLM)';
    const llmProvider: LlmProvider = 'cloud';
    console.log('\n🚀 Startar generering med Claude...');
    console.log(`   Fil: ${fileName}`);
    console.log(`   LLM Provider: ${llmProvider}\n`);

    // 3. Kör generering
    const result = await generateAllFromBpmnWithGraph(
      fileName,
      graphFiles,
      existingDmnFiles,
      useHierarchy,
      useLlm,
      handleGeneratorPhase,
      generationSourceLabel,
      llmProvider,
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      undefined, // isActualRootFile
      false, // forceRegenerate
    );

    // 4. Verifiera resultat
    expect(result.filesAnalyzed.length).toBeGreaterThan(0);
    expect(result.docFiles.length).toBeGreaterThan(0);

    // 5. Verifiera att dokumentation genererades för application-processen
    const applicationDocs = result.docFiles.filter(f => 
      f.includes('mortgage-se-application') && f.includes('mortgage-se-application')
    );

    expect(applicationDocs.length).toBeGreaterThan(0);

    console.log('\n✅ Generering klar!');
    console.log(`   Filer analyserade: ${result.filesAnalyzed.length}`);
    console.log(`   Dokumentationsfiler: ${result.docFiles.length}`);
    // Playwright-testfiler har tagits bort - all testinformation finns nu i E2E scenarios och Feature Goal-test scenarios
    // Testinfo genereras nu via separat "Generera testinfo"-knapp i UI
    console.log(`   Application-dokumentation: ${applicationDocs.length} fil(er)`);
  }, 300000); // 5 minuter timeout för LLM-generering
});

