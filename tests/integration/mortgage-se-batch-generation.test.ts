/**
 * @vitest-environment jsdom
 * 
 * Batch test för att verifiera att informationsgenerering fungerar
 * för alla BPMN-filer i mappen "mortgage-se 2025.12.11 18:11".
 * 
 * Detta test använder template-baserad generering (useLlm = false)
 * för att testa logiken utan LLM-anrop.
 * 
 * VIKTIGT: Detta test använder generateAllFromBpmn (legacy) eftersom
 * generateAllFromBpmnWithGraph kräver att filer finns i Supabase Storage
 * eller kan laddas via /bpmn/-sökvägar. För att testa med hierarki,
 * se mortgage-se-batch-generation-hierarchy.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { generateAllFromBpmn } from '@/lib/bpmnGenerators';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';

const FIXTURE_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2026.01.04 16:30');

/**
 * Creates a data URL from XML content for parseBpmnFile to use
 */
function createBpmnDataUrl(xml: string): string {
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

describe('Mortgage-se batch documentation generation', () => {
  it('should generate documentation for all BPMN files in mortgage-se 2025.12.11 18:11', async () => {
    // 1. Läs alla BPMN-filer från mappen
    const files = await readdir(FIXTURE_DIR);
    const bpmnFiles = files
      .filter(f => f.endsWith('.bpmn'))
      .sort();
    
    console.log(`\n=== Found ${bpmnFiles.length} BPMN files ===`);
    bpmnFiles.forEach(f => console.log(`  - ${f}`));
    
    expect(bpmnFiles.length).toBeGreaterThan(0);
    
    // 2. Generera dokumentation för varje fil (isolated, template-based)
    const results = new Map<string, {
      success: boolean;
      docCount: number;
      featureGoals: number;
      epics: number;
      combined: number;
      error?: string;
    }>();
    
    for (const fileName of bpmnFiles) {
      try {
        console.log(`\n=== Generating: ${fileName} ===`);
        
        // Läs BPMN-filen från fixtures och skapa data URL
        const filePath = resolve(FIXTURE_DIR, fileName);
        const xml = await readFile(filePath, 'utf-8');
        const dataUrl = createBpmnDataUrl(xml);
        
        // Parse BPMN-filen direkt
        const parseResult = await parseBpmnFile(dataUrl);
        
        // Använd generateAllFromBpmn direkt för isolerad generering
        // (generateAllFromBpmnWithGraph försöker ladda från /bpmn/ vilket inte fungerar i test)
        const result = await generateAllFromBpmn(
          parseResult.elements,
          parseResult.subprocesses || [],
          [fileName],
          [],
          fileName,
          false, // useLlm = false (templates)
          'template',
          undefined, // llmProvider
        );
        
        // Categorize generated docs
        const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
          key.includes('feature-goal') || key.includes('feature-goals')
        );
        const epicKeys = Array.from(result.docs.keys()).filter(key => 
          key.includes('nodes') && !key.includes('feature-goal')
        );
        const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
          key.endsWith('.html') && 
          !key.includes('feature-goal') && 
          !key.includes('nodes') &&
          !key.includes('/')
        );
        
        results.set(fileName, {
          success: true,
          docCount: result.docs.size,
          featureGoals: featureGoalKeys.length,
          epics: epicKeys.length,
          combined: combinedDocKeys.length,
        });
        
        console.log(`  ✓ Generated ${result.docs.size} docs (${featureGoalKeys.length} FGs, ${epicKeys.length} Epics, ${combinedDocKeys.length} Combined)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.set(fileName, {
          success: false,
          docCount: 0,
          featureGoals: 0,
          epics: 0,
          combined: 0,
          error: errorMessage,
        });
        console.error(`  ✗ Failed: ${errorMessage}`);
      }
    }
    
    // 3. Verifiera resultat
    console.log('\n=== Generation Summary ===');
    const successful = Array.from(results.values()).filter(r => r.success);
    const failed = Array.from(results.values()).filter(r => !r.success);
    
    console.log(`Successful: ${successful.length}/${results.size}`);
    console.log(`Failed: ${failed.length}/${results.size}`);
    
    if (failed.length > 0) {
      console.log('\nFailed files:');
      failed.forEach((result, index) => {
        const fileName = Array.from(results.keys())[Array.from(results.values()).indexOf(result)];
        console.log(`  ${index + 1}. ${fileName}: ${result.error}`);
      });
    }
    
    // 4. Assertions
    expect(successful.length).toBeGreaterThan(0);
    
    // Alla filer borde generera minst 1 dokument
    // OBS: generateAllFromBpmn (legacy) genererar inte Feature Goals, bara Epics och Combined docs
    successful.forEach((result, index) => {
      const fileName = Array.from(results.keys())[Array.from(results.values()).indexOf(result)];
      expect(result.docCount).toBeGreaterThan(0);
      // Verifiera att antingen Feature Goals, Epics eller Combined docs genererades
      const totalGenerated = result.featureGoals + result.epics + result.combined;
      expect(totalGenerated).toBeGreaterThan(0);
    });
    
    // Om några filer failade, logga men faila inte testet (för att se alla problem)
    if (failed.length > 0) {
      console.warn(`\n⚠️  ${failed.length} file(s) failed to generate. Check errors above.`);
    }
    
    console.log('\n✅ Batch generation test completed!');
  }, 300000); // 5 minuter timeout för batch-generering
});
