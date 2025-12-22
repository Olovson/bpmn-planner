/**
 * Analysera vad som faktiskt finns i Supabase Storage och jämför med förväntat
 * 
 * Detta script:
 * 1. Listar alla dokumentationsfiler i Storage
 * 2. Kategoriserar dem (Feature Goals, Epics, Business Rules)
 * 3. Jämför med vad som förväntas genereras
 * 4. Identifierar problem med namn eller sökvägar
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StorageFile {
  name: string;
  path: string;
  size?: number;
  updated_at?: string;
}

interface DocumentationAnalysis {
  total: number;
  featureGoals: StorageFile[];
  epics: StorageFile[];
  businessRules: StorageFile[];
  other: StorageFile[];
  byBpmnFile: Map<string, StorageFile[]>;
  byPathPattern: Map<string, StorageFile[]>;
  issues: string[];
}

async function listStorageFiles(prefix: string = 'docs/claude'): Promise<StorageFile[]> {
  const files: StorageFile[] = [];
  
  try {
    // List all files in docs/claude directory
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(prefix, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`Error listing ${prefix}:`, error);
      return files;
    }

    if (!data) {
      return files;
    }

    // Process files and subdirectories
    for (const item of data) {
      if (item.name.endsWith('.html')) {
        // It's a file
        files.push({
          name: item.name,
          path: `${prefix}/${item.name}`,
          size: item.metadata?.size,
          updated_at: item.updated_at,
        });
      } else {
        // It's likely a directory (BPMN file name, version hash, or subdirectory)
        // Recursively list files in subdirectories
        const subFiles = await listStorageFiles(`${prefix}/${item.name}`);
        files.push(...subFiles);
      }
    }

    return files;
  } catch (error) {
    console.error(`Error listing storage files:`, error);
    return files;
  }
}

function analyzeDocumentation(files: StorageFile[]): DocumentationAnalysis {
  const analysis: DocumentationAnalysis = {
    total: files.length,
    featureGoals: [],
    epics: [],
    businessRules: [],
    other: [],
    byBpmnFile: new Map(),
    byPathPattern: new Map(),
    issues: [],
  };

  for (const file of files) {
    const path = file.path;
    
    // Categorize by path pattern
    if (path.includes('feature-goals/')) {
      analysis.featureGoals.push(file);
      
      // Extract BPMN file from path
      // Pattern: docs/claude/{bpmnFile}/{versionHash}/feature-goals/... OR docs/claude/feature-goals/...
      const versionedMatch = path.match(/docs\/claude\/([^\/]+)\/([^\/]+)\/feature-goals\/(.+)\.html$/);
      const nonVersionedMatch = path.match(/docs\/claude\/feature-goals\/(.+)\.html$/);
      
      if (versionedMatch) {
        const [, bpmnFile, versionHash, featureGoalName] = versionedMatch;
        const key = `${bpmnFile}/${versionHash}`;
        if (!analysis.byBpmnFile.has(key)) {
          analysis.byBpmnFile.set(key, []);
        }
        analysis.byBpmnFile.get(key)!.push(file);
      } else if (nonVersionedMatch) {
        const [, featureGoalName] = nonVersionedMatch;
        const key = 'non-versioned';
        if (!analysis.byBpmnFile.has(key)) {
          analysis.byBpmnFile.set(key, []);
        }
        analysis.byBpmnFile.get(key)!.push(file);
      }
    } else if (path.includes('nodes/')) {
      analysis.epics.push(file);
      
      // Extract BPMN file from path
      // Pattern: docs/claude/{bpmnFile}/{versionHash}/nodes/{baseName}/{elementId}.html
      const versionedMatch = path.match(/docs\/claude\/([^\/]+)\/([^\/]+)\/nodes\/([^\/]+)\/(.+)\.html$/);
      const nonVersionedMatch = path.match(/docs\/claude\/nodes\/([^\/]+)\/(.+)\.html$/);
      
      if (versionedMatch) {
        const [, bpmnFile, versionHash, baseName, elementId] = versionedMatch;
        const key = `${bpmnFile}/${versionHash}`;
        if (!analysis.byBpmnFile.has(key)) {
          analysis.byBpmnFile.set(key, []);
        }
        analysis.byBpmnFile.get(key)!.push(file);
      } else if (nonVersionedMatch) {
        const [, baseName, elementId] = nonVersionedMatch;
        const key = 'non-versioned';
        if (!analysis.byBpmnFile.has(key)) {
          analysis.byBpmnFile.set(key, []);
        }
        analysis.byBpmnFile.get(key)!.push(file);
      }
    } else {
      analysis.other.push(file);
    }
  }

  return analysis;
}

function compareWithExpected(analysis: DocumentationAnalysis) {
  // Load bpmn-map.json to get expected counts
  const bpmnMapPath = resolve(__dirname, '..', 'bpmn-map.json');
  const bpmnMap = JSON.parse(readFileSync(bpmnMapPath, 'utf-8'));
  
  const expectedFeatureGoals = 54; // 20 subprocess process nodes + 34 call activities
  const expectedEpics = 72; // All tasks
  
  console.log('\n📊 Jämförelse med förväntat:');
  console.log(`  Feature Goals:`);
  console.log(`    Förväntat: ${expectedFeatureGoals}`);
  console.log(`    Faktiskt i Storage: ${analysis.featureGoals.length}`);
  console.log(`    Skillnad: ${analysis.featureGoals.length - expectedFeatureGoals}`);
  
  console.log(`  Epics:`);
  console.log(`    Förväntat: ${expectedEpics}`);
  console.log(`    Faktiskt i Storage: ${analysis.epics.length}`);
  console.log(`    Skillnad: ${analysis.epics.length - expectedEpics}`);
  
  console.log(`  Business Rules:`);
  console.log(`    Faktiskt i Storage: ${analysis.businessRules.length}`);
  
  console.log(`  Andra filer:`);
  console.log(`    Faktiskt i Storage: ${analysis.other.length}`);
  
  // Check for issues
  if (analysis.featureGoals.length !== expectedFeatureGoals) {
    analysis.issues.push(
      `Feature Goals: Förväntat ${expectedFeatureGoals}, men hittade ${analysis.featureGoals.length}`
    );
  }
  
  if (analysis.epics.length !== expectedEpics) {
    analysis.issues.push(
      `Epics: Förväntat ${expectedEpics}, men hittade ${analysis.epics.length}`
    );
  }
  
  // Check for problematic file names
  const problematicFeatureGoals = analysis.featureGoals.filter(f => {
    const fileName = f.path.split('/').pop() || '';
    // Check for task-like names (activity_...)
    return fileName.includes('activity_') || 
           fileName.includes('.bpmn-activity_') ||
           fileName.match(/^se-[^\.]+\.bpmn-[^\.]+\.html$/);
  });
  
  if (problematicFeatureGoals.length > 0) {
    analysis.issues.push(
      `Problematic Feature Goal names: ${problematicFeatureGoals.length} filer med felaktiga namn (t.ex. activity_..., se-*.bpmn-*)`
    );
  }
  
  // Check for non-versioned files (might be from old migration)
  const nonVersionedFeatureGoals = analysis.featureGoals.filter(f => 
    !f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/feature-goals\//)
  );
  const nonVersionedEpics = analysis.epics.filter(f => 
    !f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/nodes\//)
  );
  
  if (nonVersionedFeatureGoals.length > 0) {
    analysis.issues.push(
      `Non-versioned Feature Goals: ${nonVersionedFeatureGoals.length} filer (kan vara från gammal migrering)`
    );
  }
  
  if (nonVersionedEpics.length > 0) {
    analysis.issues.push(
      `Non-versioned Epics: ${nonVersionedEpics.length} filer (kan vara från gammal migrering)`
    );
  }
}

async function main() {
  console.log('🔍 Analyserar dokumentation i Supabase Storage...\n');
  
  const files = await listStorageFiles('docs/claude');
  console.log(`✅ Hittade ${files.length} dokumentationsfiler i Storage\n`);
  
  const analysis = analyzeDocumentation(files);
  
  console.log('📋 Kategorisering:');
  console.log(`  Feature Goals: ${analysis.featureGoals.length}`);
  console.log(`  Epics: ${analysis.epics.length}`);
  console.log(`  Business Rules: ${analysis.businessRules.length}`);
  console.log(`  Andra: ${analysis.other.length}`);
  
  // Show examples
  if (analysis.featureGoals.length > 0) {
    console.log('\n📝 Alla Feature Goals:');
    analysis.featureGoals.forEach(f => {
      console.log(`  - ${f.path}`);
    });
  }
  
  if (analysis.epics.length > 0) {
    console.log('\n📝 Alla Epics:');
    analysis.epics.forEach(f => {
      console.log(`  - ${f.path}`);
    });
  }
  
  if (analysis.other.length > 0) {
    console.log('\n📝 Andra filer:');
    analysis.other.forEach(f => {
      console.log(`  - ${f.path}`);
    });
  }
  
  // Separate versioned and non-versioned
  const versionedFeatureGoals = analysis.featureGoals.filter(f => 
    f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/feature-goals\//)
  );
  const nonVersionedFeatureGoals = analysis.featureGoals.filter(f => 
    !f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/feature-goals\//)
  );
  const versionedEpics = analysis.epics.filter(f => 
    f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/nodes\//)
  );
  const nonVersionedEpics = analysis.epics.filter(f => 
    !f.path.match(/docs\/claude\/[^\/]+\/[^\/]+\/nodes\//)
  );
  
  console.log('\n📊 Versionering:');
  console.log(`  Feature Goals:`);
  console.log(`    Versioned: ${versionedFeatureGoals.length}`);
  console.log(`    Non-versioned: ${nonVersionedFeatureGoals.length}`);
  console.log(`  Epics:`);
  console.log(`    Versioned: ${versionedEpics.length}`);
  console.log(`    Non-versioned: ${nonVersionedEpics.length}`);
  
  // Group by BPMN file
  console.log('\n📁 Grupperat per BPMN-fil (versioned):');
  const sortedBpmnFiles = Array.from(analysis.byBpmnFile.entries())
    .filter(([key]) => key !== 'non-versioned')
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [bpmnFile, fileList] of sortedBpmnFiles.slice(0, 20)) {
    const featureGoals = fileList.filter(f => f.path.includes('feature-goals/')).length;
    const epics = fileList.filter(f => f.path.includes('nodes/')).length;
    console.log(`  ${bpmnFile}: ${fileList.length} filer (${featureGoals} Feature Goals, ${epics} Epics)`);
  }
  
  if (nonVersionedFeatureGoals.length > 0 || nonVersionedEpics.length > 0) {
    console.log('\n📁 Non-versioned filer:');
    if (nonVersionedFeatureGoals.length > 0) {
      console.log(`  Feature Goals: ${nonVersionedFeatureGoals.length} filer`);
      console.log(`    Exempel: ${nonVersionedFeatureGoals.slice(0, 5).map(f => f.path.split('/').pop()).join(', ')}`);
    }
    if (nonVersionedEpics.length > 0) {
      console.log(`  Epics: ${nonVersionedEpics.length} filer`);
      console.log(`    Exempel: ${nonVersionedEpics.slice(0, 5).map(f => f.path.split('/').pop()).join(', ')}`);
    }
  }
  
  // Compare with expected
  compareWithExpected(analysis);
  
  // Report issues
  if (analysis.issues.length > 0) {
    console.log('\n⚠️  Identifierade problem:');
    analysis.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  } else {
    console.log('\n✅ Inga uppenbara problem identifierade!');
  }
}

main().catch(console.error);
