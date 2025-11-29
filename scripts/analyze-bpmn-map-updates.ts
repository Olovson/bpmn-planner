#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Analyze new BPMN files and compare with bpmn-map.json to identify needed updates
 * 
 * Usage:
 *   npm run analyze:bpmn-map
 */

import { readFile, readdir } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NEW_FILES_DIR = resolve(__dirname, '../tests/fixtures/bpmn/mortgage-se 2025.11.29');
const BPMN_MAP_PATH = resolve(__dirname, '../bpmn-map.json');

interface CallActivity {
  id: string;
  name: string;
  calledElement?: string | null;
}

interface BpmnFileAnalysis {
  fileName: string;
  processId?: string;
  processName?: string;
  callActivities: CallActivity[];
  subProcesses: Array<{ id: string; name: string }>;
}

interface BpmnMapEntry {
  id: string;
  alias: string;
  bpmn_file: string;
  process_id: string;
  description: string;
  call_activities: Array<{
    bpmn_id: string;
    name: string;
    called_element: string | null;
    subprocess_bpmn_file: string | null;
  }>;
}

interface BpmnMap {
  generated_at: string;
  note: string;
  orchestration: {
    root_process: string;
  };
  processes: BpmnMapEntry[];
}

/**
 * Parse BPMN XML to extract callActivities and subProcesses
 */
function parseBpmnXml(xml: string): BpmnFileAnalysis {
  const getAttr = (element: string, attrName: string): string => {
    const regex = new RegExp(`${attrName}="([^"]+)"`, 'i');
    const match = regex.exec(element);
    return match ? match[1] : '';
  };

  // Extract process info
  const processMatch = /<(?:bpmn:)?process[^>]*>/i.exec(xml);
  const processId = processMatch ? getAttr(processMatch[0], 'id') : undefined;
  const processName = processMatch ? (getAttr(processMatch[0], 'name') || processId) : undefined;

  // Extract callActivities
  const callActivities: CallActivity[] = [];
  const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*>/gi;
  let match;
  while ((match = callActivityRegex.exec(xml)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    const calledElement = getAttr(match[0], 'calledElement') || null;
    if (id) {
      callActivities.push({ id, name, calledElement });
    }
  }

  // Extract subProcesses
  const subProcesses: Array<{ id: string; name: string }> = [];
  const subProcessRegex = /<(?:bpmn:)?subProcess[^>]*>/gi;
  while ((match = subProcessRegex.exec(xml)) !== null) {
    const id = getAttr(match[0], 'id');
    const name = getAttr(match[0], 'name') || id;
    if (id) {
      subProcesses.push({ id, name });
    }
  }

  return {
    fileName: '', // Will be set by caller
    processId,
    processName,
    callActivities,
    subProcesses,
  };
}

/**
 * Read and analyze all BPMN files from the new directory
 */
async function analyzeNewFiles(): Promise<Map<string, BpmnFileAnalysis>> {
  const files = await readdir(NEW_FILES_DIR);
  const bpmnFiles = files.filter((f) => f.endsWith('.bpmn'));

  const analyses = new Map<string, BpmnFileAnalysis>();

  for (const fileName of bpmnFiles) {
    const filePath = join(NEW_FILES_DIR, fileName);
    const content = await readFile(filePath, 'utf-8');
    const analysis = parseBpmnXml(content);
    analysis.fileName = fileName;
    analyses.set(fileName, analysis);
  }

  return analyses;
}

/**
 * Load existing bpmn-map.json
 */
async function loadBpmnMap(): Promise<BpmnMap> {
  const content = await readFile(BPMN_MAP_PATH, 'utf-8');
  return JSON.parse(content) as BpmnMap;
}

/**
 * Find map entry for a file
 */
function findMapEntry(map: BpmnMap, fileName: string): BpmnMapEntry | undefined {
  return map.processes.find((p) => p.bpmn_file === fileName);
}

/**
 * Find call activity in map entry
 */
function findCallActivityInMap(
  mapEntry: BpmnMapEntry,
  callActivityId: string,
  callActivityName: string,
): BpmnMapEntry['call_activities'][0] | undefined {
  return mapEntry.call_activities.find(
    (ca) =>
      ca.bpmn_id === callActivityId ||
      ca.name === callActivityName,
  );
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🔍 Analyzing BPMN files and comparing with bpmn-map.json...\n');

  // Load new files
  console.log(`📂 Reading BPMN files from: ${NEW_FILES_DIR}`);
  const newFiles = await analyzeNewFiles();
  console.log(`✅ Found ${newFiles.size} BPMN file(s)\n`);

  // Load existing map
  console.log(`📄 Loading bpmn-map.json from: ${BPMN_MAP_PATH}`);
  const bpmnMap = await loadBpmnMap();
  console.log(`✅ Loaded map with ${bpmnMap.processes.length} process(es)\n`);

  // Compare
  const issues: Array<{
    type: 'missing_file' | 'missing_call_activity' | 'new_call_activity' | 'mismatch';
    file: string;
    message: string;
    suggestion?: string;
  }> = [];

  console.log('🔍 Comparing files...\n');

  for (const [fileName, analysis] of newFiles.entries()) {
    const mapEntry = findMapEntry(bpmnMap, fileName);

    if (!mapEntry) {
      issues.push({
        type: 'missing_file',
        file: fileName,
        message: `File ${fileName} is not in bpmn-map.json`,
        suggestion: `Add entry for ${fileName} with process_id: ${analysis.processId || 'TBD'}`,
      });
      continue;
    }

    // Check process ID match
    if (analysis.processId && mapEntry.process_id !== analysis.processId) {
      issues.push({
        type: 'mismatch',
        file: fileName,
        message: `Process ID mismatch: map has "${mapEntry.process_id}" but file has "${analysis.processId}"`,
        suggestion: `Update process_id in map to "${analysis.processId}"`,
      });
    }

    // Check call activities
    for (const ca of analysis.callActivities) {
      const mapCa = findCallActivityInMap(mapEntry, ca.id, ca.name);

      if (!mapCa) {
        issues.push({
          type: 'missing_call_activity',
          file: fileName,
          message: `Call activity "${ca.name}" (id: ${ca.id}) in ${fileName} is not in map`,
          suggestion: `Add call activity mapping for "${ca.name}" (id: ${ca.id})`,
        });
      } else {
        // Check if calledElement matches
        if (ca.calledElement && mapCa.called_element !== ca.calledElement) {
          issues.push({
            type: 'mismatch',
            file: fileName,
            message: `Call activity "${ca.name}" calledElement mismatch: map has "${mapCa.called_element}" but file has "${ca.calledElement}"`,
            suggestion: `Update called_element in map to "${ca.calledElement}"`,
          });
        }
      }
    }

    // Check for call activities in map that don't exist in file
    for (const mapCa of mapEntry.call_activities) {
      const fileCa = analysis.callActivities.find(
        (ca) => ca.id === mapCa.bpmn_id || ca.name === mapCa.name,
      );

      if (!fileCa) {
        issues.push({
          type: 'new_call_activity',
          file: fileName,
          message: `Call activity "${mapCa.name}" (id: ${mapCa.bpmn_id}) in map but not found in file`,
          suggestion: `Remove or verify call activity "${mapCa.name}" from map`,
        });
      }
    }
  }

  // Check for files in map that don't exist in new directory
  for (const mapEntry of bpmnMap.processes) {
    if (!newFiles.has(mapEntry.bpmn_file)) {
      issues.push({
        type: 'missing_file',
        file: mapEntry.bpmn_file,
        message: `File ${mapEntry.bpmn_file} is in map but not found in new directory`,
        suggestion: `Verify if file should be removed from map or if file is missing`,
      });
    }
  }

  // Print results
  console.log('='.repeat(80));
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n✅ No issues found! bpmn-map.json appears to be up to date.\n');
  } else {
    console.log(`\n⚠️  Found ${issues.length} potential issue(s):\n`);

    const byType = {
      missing_file: issues.filter((i) => i.type === 'missing_file'),
      missing_call_activity: issues.filter((i) => i.type === 'missing_call_activity'),
      new_call_activity: issues.filter((i) => i.type === 'new_call_activity'),
      mismatch: issues.filter((i) => i.type === 'mismatch'),
    };

    if (byType.missing_file.length > 0) {
      console.log('📁 MISSING FILES IN MAP:');
      byType.missing_file.forEach((issue) => {
        console.log(`   ❌ ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      });
      console.log('');
    }

    if (byType.missing_call_activity.length > 0) {
      console.log('🔗 MISSING CALL ACTIVITIES IN MAP:');
      byType.missing_call_activity.forEach((issue) => {
        console.log(`   ❌ ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      });
      console.log('');
    }

    if (byType.new_call_activity.length > 0) {
      console.log('🔗 CALL ACTIVITIES IN MAP BUT NOT IN FILE:');
      byType.new_call_activity.forEach((issue) => {
        console.log(`   ⚠️  ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      });
      console.log('');
    }

    if (byType.mismatch.length > 0) {
      console.log('⚠️  MISMATCHES:');
      byType.mismatch.forEach((issue) => {
        console.log(`   ⚠️  ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      });
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('💡 NEXT STEPS:');
    console.log('   1. Review the issues above');
    console.log('   2. Update bpmn-map.json manually or use export script');
    console.log('   3. Run validation: npm run validate:bpmn-map');
    console.log('='.repeat(80));
  }

  // Summary statistics
  console.log('\n📈 SUMMARY:');
  console.log(`   Total files analyzed: ${newFiles.size}`);
  console.log(`   Total call activities found: ${Array.from(newFiles.values()).reduce((sum, f) => sum + f.callActivities.length, 0)}`);
  console.log(`   Total subProcesses found: ${Array.from(newFiles.values()).reduce((sum, f) => sum + f.subProcesses.length, 0)}`);
  console.log(`   Issues found: ${issues.length}`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

