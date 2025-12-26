#!/usr/bin/env tsx
/**
 * Detailed analysis of all BPMN files - reads each file and compares with bpmn-map.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const bpmnMapPath = path.join(projectRoot, 'bpmn-map.json');
const bpmnMap = JSON.parse(fs.readFileSync(bpmnMapPath, 'utf-8'));
const mortgageSePath = '/Users/magnusolovson/Documents/Projects/mortgage-template-main/modules/mortgage-se';

interface CallActivityInfo {
  id: string;
  name: string;
  calledElement?: string | null;
  inSubProcess?: boolean;
  subProcessId?: string;
}

function extractCallActivities(filePath: string): CallActivityInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const callActivities: CallActivityInfo[] = [];
  
  // Find all subProcess elements first to track nesting
  const subProcessMatches = content.matchAll(/<bpmn:subProcess[^>]*id="([^"]+)"[^>]*>/g);
  const subProcessIds = Array.from(subProcessMatches, m => m[1]);
  
  // Find all callActivities
  const callActivityRegex = /<bpmn:callActivity[^>]*>/g;
  let match;
  while ((match = callActivityRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const idMatch = fullMatch.match(/id="([^"]+)"/);
    if (!idMatch) continue;
    
    const id = idMatch[1];
    const nameMatch = fullMatch.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : id;
    const calledElementMatch = fullMatch.match(/calledElement="([^"]+)"/);
    const calledElement = calledElementMatch ? calledElementMatch[1] : null;
    
    // Check if this callActivity is inside a subProcess
    // Find the position of this callActivity in the file
    const callActivityPos = content.indexOf(fullMatch);
    let inSubProcess = false;
    let subProcessId: string | undefined;
    
    // Find the nearest subProcess that contains this callActivity
    for (const spId of subProcessIds) {
      const subProcessStartRegex = new RegExp(`<bpmn:subProcess[^>]*id="${spId}"[^>]*>`, 'g');
      
      let subProcessStart = -1;
      let subProcessEnd = -1;
      let startMatch;
      while ((startMatch = subProcessStartRegex.exec(content)) !== null) {
        subProcessStart = startMatch.index;
        // Find the matching closing tag
        const afterStart = content.substring(startMatch.index);
        const endMatch = afterStart.match(/<\/bpmn:subProcess>/);
        if (endMatch) {
          subProcessEnd = startMatch.index + endMatch.index + endMatch[0].length;
          if (callActivityPos > subProcessStart && callActivityPos < subProcessEnd) {
            inSubProcess = true;
            subProcessId = spId;
            break;
          }
        }
      }
      if (inSubProcess) break;
    }
    
    callActivities.push({
      id,
      name,
      calledElement: calledElement || undefined,
      inSubProcess,
      subProcessId,
    });
  }
  
  return callActivities;
}

function getAllBpmnFiles(dir: string): string[] {
  const files: string[] = [];
  function walkDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.bpmn')) {
        files.push(fullPath);
      }
    }
  }
  walkDir(dir);
  return files;
}

const bpmnFiles = getAllBpmnFiles(mortgageSePath).sort();

console.log('=== DETALJERAD ANALYS AV ALLA BPMN-FILER ===\n');

const allIssues: Array<{file: string, issue: string}> = [];

for (const filePath of bpmnFiles) {
  const fileName = path.basename(filePath);
  const actualCAs = extractCallActivities(filePath);
  const mapProcess = bpmnMap.processes.find(p => p.bpmn_file === fileName);
  
  console.log(`\n📄 ${fileName}`);
  console.log(`   Call activities i filen: ${actualCAs.length}`);
  
  if (actualCAs.length > 0) {
    for (const ca of actualCAs) {
      const location = ca.inSubProcess ? `(i subProcess: ${ca.subProcessId})` : '(root-nivå)';
      const called = ca.calledElement ? ` [calledElement: ${ca.calledElement}]` : '';
      console.log(`   - ${ca.id}: "${ca.name}" ${location}${called}`);
    }
  }
  
  if (!mapProcess) {
    if (actualCAs.length > 0) {
      allIssues.push({file: fileName, issue: `❌ Filen finns INTE i bpmn-map.json men har ${actualCAs.length} call activity/ies`});
    }
    continue;
  }
  
  const mapCAs = mapProcess.call_activities || [];
  console.log(`   Call activities i map: ${mapCAs.length}`);
  
  // Check each actual call activity
  for (const actualCA of actualCAs) {
    const mapCA = mapCAs.find(ca => ca.bpmn_id === actualCA.id);
    if (!mapCA) {
      const location = actualCA.inSubProcess ? ` (i subProcess: ${actualCA.subProcessId})` : '';
      allIssues.push({file: fileName, issue: `❌ Call activity "${actualCA.id}" (${actualCA.name}) finns i filen${location} men INTE i bpmn-map.json`});
    } else {
      // Check if subprocess mapping exists
      if (!mapCA.subprocess_bpmn_file) {
        allIssues.push({file: fileName, issue: `⚠️  Call activity "${actualCA.id}" saknar subprocess-mappning i bpmn-map.json`});
      }
    }
  }
  
  // Check for call activities in map that don't exist in file
  for (const mapCA of mapCAs) {
    const actualCA = actualCAs.find(ca => ca.id === mapCA.bpmn_id);
    if (!actualCA) {
      allIssues.push({file: fileName, issue: `❌ Call activity "${mapCA.bpmn_id}" (${mapCA.name}) finns i bpmn-map.json men INTE i filen`});
    }
  }
}

console.log('\n\n=== SAMMANFATTNING AV PROBLEM ===\n');
if (allIssues.length === 0) {
  console.log('✅ Inga problem hittades!');
} else {
  for (const {file, issue} of allIssues) {
    console.log(`${file}: ${issue}`);
  }
}

