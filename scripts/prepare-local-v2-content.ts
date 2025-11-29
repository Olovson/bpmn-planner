#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Prepare local v2 Feature Goal HTML files for use in the app
 * 
 * ⚠️ ENGANGSFÖRETELSE: Detta script behövs bara en gång för att fixa befintliga filer.
 * Framtida generationer kommer automatiskt att ha korrekta filnamn tack vare fixen i
 * src/lib/bpmnGenerators.ts (använder node.subprocessFile för call activities).
 * 
 * This script:
 * 1. Reads improved HTML files from exports/feature-goals/
 * 2. Maps them to correct filenames based on bpmn-map.json
 * 3. Adds "📄 Lokal version" badge to HTML
 * 4. Copies them to public/local-content/feature-goals/
 * 
 * Usage (one-time only):
 *   tsx scripts/prepare-local-v2-content.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { getFeatureGoalDocFileKey } from '../src/lib/nodeArtifactPaths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPORT_DIR = resolve(__dirname, '../exports/feature-goals');
const OUTPUT_DIR = resolve(__dirname, '../public/local-content/feature-goals');
const BPMN_MAP_PATH = resolve(__dirname, '../bpmn-map.json');

interface BpmnMap {
  processes: Array<{
    id: string;
    bpmn_file: string;
    call_activities: Array<{
      bpmn_id: string;
      name: string;
      subprocess_bpmn_file: string;
    }>;
  }>;
}

/**
 * Build explicit mapping from export filename to (bpmnFile, elementId)
 * Based on actual filenames and bpmn-map.json structure
 */
function buildExplicitMapping(bpmnMap: BpmnMap): Map<string, { bpmnFile: string; elementId: string }> {
  const map = new Map<string, { bpmnFile: string; elementId: string }>();
  
  // Build mapping from call activities
  for (const process of bpmnMap.processes) {
    for (const callActivity of process.call_activities) {
      // Pattern: local--{parentBpmnFile}-{elementId}-v2.html
      // But we need to handle both mortgage.bpmn and mortgage-se-*.bpmn
      const parentBase = process.bpmn_file.replace('.bpmn', '');
      const key = `local--${parentBase}-${callActivity.bpmn_id}-v2.html`;
      map.set(key, {
        bpmnFile: callActivity.subprocess_bpmn_file,
        elementId: callActivity.bpmn_id,
      });
    }
  }
  
  // Special cases: subprocesses that are not call activities
  // These are subprocesses within other processes
  const specialCases: Record<string, { bpmnFile: string; elementId: string }> = {
    'local--mortgage-se-credit-evaluation-loop-household-v2.html': {
      bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
      elementId: 'loop-household',
    },
    'local--mortgage-se-manual-credit-evaluation-credit-evaluation-v2.html': {
      bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
      elementId: 'credit-evaluation',
    },
    'local--mortgage-se-manual-credit-evaluation-documentation-assessment-v2.html': {
      bpmnFile: 'mortgage-se-documentation-assessment.bpmn',
      elementId: 'documentation-assessment',
    },
    'local--mortgage-se-mortgage-commitment-credit-evaluation-1-v2.html': {
      bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
      elementId: 'credit-evaluation-1',
    },
    'local--mortgage-se-mortgage-commitment-credit-evaluation-2-v2.html': {
      bpmnFile: 'mortgage-se-credit-evaluation.bpmn',
      elementId: 'credit-evaluation-2',
    },
    'local--mortgage-se-mortgage-commitment-documentation-assessment-v2.html': {
      bpmnFile: 'mortgage-se-documentation-assessment.bpmn',
      elementId: 'documentation-assessment',
    },
    'local--mortgage-se-mortgage-commitment-object-information-v2.html': {
      bpmnFile: 'mortgage-se-object-information.bpmn',
      elementId: 'object-information',
    },
    'local--mortgage-se-object-object-information-v2.html': {
      bpmnFile: 'mortgage-se-object-information.bpmn',
      elementId: 'object-information',
    },
    'local--mortgage-se-offer-credit-decision-v2.html': {
      bpmnFile: 'mortgage-se-credit-decision.bpmn',
      elementId: 'credit-decision',
    },
    'local--mortgage-se-signing-per-digital-document-package-v2.html': {
      bpmnFile: 'mortgage-se-signing.bpmn',
      elementId: 'per-digital-document-package',
    },
    'local--mortgage-se-signing-per-sign-order-v2.html': {
      bpmnFile: 'mortgage-se-signing.bpmn',
      elementId: 'per-sign-order',
    },
    'local--mortgage-se-signing-per-signee-v2.html': {
      bpmnFile: 'mortgage-se-signing.bpmn',
      elementId: 'per-signee',
    },
    'local--mortgage-se-application-household-v2.html': {
      bpmnFile: 'mortgage-se-household.bpmn',
      elementId: 'household',
    },
    'local--mortgage-se-application-internal-data-gathering-v2.html': {
      bpmnFile: 'mortgage-se-internal-data-gathering.bpmn',
      elementId: 'internal-data-gathering',
    },
    'local--mortgage-se-application-object-v2.html': {
      bpmnFile: 'mortgage-se-object.bpmn',
      elementId: 'object',
    },
    'local--mortgage-se-application-stakeholder-v2.html': {
      bpmnFile: 'mortgage-se-stakeholder.bpmn',
      elementId: 'stakeholder',
    },
    'local--mortgage-se-application-stakeholders-v2.html': {
      bpmnFile: 'mortgage-se-stakeholder.bpmn',
      elementId: 'stakeholder',
    },
    'local--mortgage-Activity_17f0nvn-v2.html': {
      bpmnFile: 'mortgage.bpmn',
      elementId: 'Activity_17f0nvn',
    },
  };
  
  for (const [key, value] of Object.entries(specialCases)) {
    map.set(key, value);
  }
  
  return map;
}

/**
 * Add "📄 Lokal version" badge to HTML
 */
function addLocalVersionBadge(html: string): string {
  // Check if badge already exists
  if (html.includes('local-version-badge')) {
    return html;
  }
  
  // Find the first <body> tag and add badge after it
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (!bodyMatch) return html;
  
  const badgeHtml = `
    <div class="local-version-badge" style="background: #e0f2fe; color: #0369a1; padding: 8px 16px; margin: 16px; border-radius: 6px; border-left: 4px solid #0284c7; font-size: 0.9rem; font-weight: 500;">
      📄 Lokal version – Förbättrat innehåll
    </div>
  `;
  
  return html.replace(bodyMatch[0], `${bodyMatch[0]}\n${badgeHtml}`);
}

async function main() {
  console.log('🚀 Preparing local v2 Feature Goal content...\n');
  
  // Load bpmn-map.json
  if (!existsSync(BPMN_MAP_PATH)) {
    console.error('❌ bpmn-map.json not found');
    process.exit(1);
  }
  
  const bpmnMap: BpmnMap = JSON.parse(readFileSync(BPMN_MAP_PATH, 'utf-8'));
  const explicitMapping = buildExplicitMapping(bpmnMap);
  
  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }
  
  // Read all HTML files from export directory
  if (!existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    process.exit(1);
  }
  
  const files = readdirSync(EXPORT_DIR).filter(f => f.endsWith('-v2.html'));
  console.log(`📋 Found ${files.length} v2 HTML file(s)\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  
  for (const filename of files) {
    try {
      const filePath = join(EXPORT_DIR, filename);
      const html = readFileSync(filePath, 'utf-8');
      
      // Find mapping
      let mapping = explicitMapping.get(filename);
      
      // If not found in explicit mapping, try to infer from bpmn-map.json
      if (!mapping) {
        // Try to find in call activities
        for (const process of bpmnMap.processes) {
          for (const callActivity of process.call_activities) {
            const parentBase = process.bpmn_file.replace('.bpmn', '');
            // Try different patterns
            if (filename.includes(parentBase) && filename.includes(callActivity.bpmn_id)) {
              mapping = {
                bpmnFile: callActivity.subprocess_bpmn_file,
                elementId: callActivity.bpmn_id,
              };
              break;
            }
          }
          if (mapping) break;
        }
      }
      
      // If still not found, try to infer from filename pattern
      if (!mapping) {
        // Pattern: local--mortgage-{elementId}-v2.html (from mortgage.bpmn)
        const mortgageMatch = filename.match(/^local--mortgage-([^-]+(?:-[^-]+)*)-v2\.html$/);
        if (mortgageMatch) {
          const elementId = mortgageMatch[1];
          // Look up in bpmn-map.json for mortgage.bpmn call activities
          const mortgageProcess = bpmnMap.processes.find(p => p.bpmn_file === 'mortgage.bpmn');
          if (mortgageProcess) {
            const callActivity = mortgageProcess.call_activities.find(ca => 
              ca.bpmn_id === elementId || 
              elementId.includes(ca.bpmn_id) || 
              ca.bpmn_id.includes(elementId)
            );
            if (callActivity) {
              mapping = {
                bpmnFile: callActivity.subprocess_bpmn_file,
                elementId: callActivity.bpmn_id,
              };
            }
          }
        }
        
        // Pattern: local--mortgage-se-{subprocess}-v2.html (subprocess itself, not call activity)
        const subprocessMatch = filename.match(/^local--mortgage-se-([^-]+(?:-[^-]+)*)-v2\.html$/);
        if (subprocessMatch && !mapping) {
          const subprocessName = subprocessMatch[1];
          // Check if this is a known subprocess
          const subprocess = bpmnMap.processes.find(p => 
            p.bpmn_file === `mortgage-se-${subprocessName}.bpmn` ||
            p.id === `mortgage-se-${subprocessName}`
          );
          if (subprocess) {
            mapping = {
              bpmnFile: subprocess.bpmn_file,
              elementId: subprocessName,
            };
          }
        }
      }
      
      if (!mapping) {
        console.warn(`⚠️  Could not map ${filename} - skipping`);
        skipped.push(filename);
        continue;
      }
      
      // Generate correct filename using getFeatureGoalDocFileKey
      const correctFilename = getFeatureGoalDocFileKey(
        mapping.bpmnFile,
        mapping.elementId,
        'v2',
      );
      
      // Extract just the filename (without feature-goals/ prefix)
      const outputFilename = basename(correctFilename);
      
      // Add badge to HTML
      const htmlWithBadge = addLocalVersionBadge(html);
      
      // Write to output directory
      const outputPath = join(OUTPUT_DIR, outputFilename);
      writeFileSync(outputPath, htmlWithBadge, 'utf-8');
      
      console.log(`✅ ${filename} → ${outputFilename}`);
      console.log(`   Mapped: ${mapping.bpmnFile} / ${mapping.elementId}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully processed: ${successCount} file(s)`);
  if (skipped.length > 0) {
    console.log(`   ⏭️  Skipped (could not map): ${skipped.length} file(s)`);
    skipped.forEach(f => console.log(`      - ${f}`));
  }
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} file(s)`);
  }
  console.log(`   📁 Output directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
