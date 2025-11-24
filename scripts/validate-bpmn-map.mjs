import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local env (same pattern as other scripts)
const envPath = resolve(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // optional
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function humanizeId(value) {
  if (!value) return '';
  let base = String(value)
    .replace(/\.bpmn$/i, '')
    .replace(/^\/?public\//, '')
    .replace(/^mortgage-se-/, '')
    .replace(/^mortgage-/, '')
    .replace(/-/g, ' ')
    .trim();
  if (!base) base = String(value);
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function validateBpmnMap() {
  const mapPath = resolve(__dirname, '../bpmn-map.json');
  let mapJson;
  try {
    const raw = readFileSync(mapPath, 'utf-8');
    mapJson = JSON.parse(raw);
  } catch (error) {
    console.error('[validate-bpmn-map] Failed to read bpmn-map.json:', error.message);
    process.exit(1);
  }

  console.log('[validate-bpmn-map] Validating against Supabase BPMN meta...');

  const { data: files, error: filesError } = await supabase
    .from('bpmn_files')
    .select('file_name, meta')
    .eq('file_type', 'bpmn');

  if (filesError) {
    console.error('Failed to fetch bpmn_files:', filesError.message);
    process.exit(1);
  }

  const fileMetaByName = new Map();
  for (const file of files || []) {
    fileMetaByName.set(file.file_name, file.meta || {});
  }

  const mapProcesses = Array.isArray(mapJson.processes) ? mapJson.processes : [];

  const unmappedCallActivities = [];
  const callActivitiesMissingInMap = [];
  const missingSubprocessFiles = [];
  const mapInconsistencies = [];
  const orphanProcesses = [];

  const bpmnFilesSet = new Set((files || []).map((f) => f.file_name));

  // Index map callActivities by (bpmn_file, bpmn_id)
  const mapCallsByKey = new Map();
  for (const proc of mapProcesses) {
    const bpmnFile = proc.bpmn_file;
    const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
    for (const ca of calls) {
      if (!ca || !ca.bpmn_id) continue;
      const key = `${bpmnFile}::${ca.bpmn_id}`;
      mapCallsByKey.set(key, { proc, entry: ca });
    }
  }

  // 1) Validate map entries against BPMN meta
  for (const proc of mapProcesses) {
    const bpmnFile = proc.bpmn_file;
    const meta = fileMetaByName.get(bpmnFile) || {};
    const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

    if (!bpmnFilesSet.has(bpmnFile)) {
      mapInconsistencies.push({
        type: 'bpmn_file_not_found',
        bpmn_file: bpmnFile,
        process_id: proc.process_id,
      });
      continue;
    }

    const metaProcess =
      processesMeta.find((p) => p.id === proc.process_id) ||
      processesMeta[0] ||
      null;

    const metaCallActivities = metaProcess?.callActivities || [];
    const metaSubprocesses = Array.isArray(meta.subprocesses) ? meta.subprocesses : [];
    const metaIds = new Set([
      ...metaCallActivities.map((ca) => ca.id),
      ...metaSubprocesses.map((sp) => sp.id),
    ]);

    const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
    for (const ca of calls) {
      if (!ca || !ca.bpmn_id) continue;

      if (!metaIds.has(ca.bpmn_id)) {
        mapInconsistencies.push({
          type: 'map_bpmn_id_not_in_meta',
          bpmn_file: bpmnFile,
          process_id: proc.process_id,
          bpmn_id: ca.bpmn_id,
        });
      }

      if (ca.subprocess_bpmn_file) {
        if (!bpmnFilesSet.has(ca.subprocess_bpmn_file)) {
          missingSubprocessFiles.push({
            bpmn_file: bpmnFile,
            bpmn_id: ca.bpmn_id,
            subprocess_bpmn_file: ca.subprocess_bpmn_file,
          });
        }
      } else {
        unmappedCallActivities.push({
          bpmn_file: bpmnFile,
          process_id: proc.process_id,
          bpmn_id: ca.bpmn_id,
          name: ca.name || ca.bpmn_id,
          reason: 'subprocess_bpmn_file_missing',
        });
      }
    }
  }

  // 2) Find callActivities in BPMN that are missing in map
  for (const file of files || []) {
    const bpmnFile = file.file_name;
    const meta = file.meta || {};
    const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

    for (const procMeta of processesMeta) {
      const procId = procMeta.id || bpmnFile;
      const callActivities = procMeta.callActivities || [];

      for (const ca of callActivities) {
        const key = `${bpmnFile}::${ca.id}`;
        if (!mapCallsByKey.has(key)) {
          callActivitiesMissingInMap.push({
            bpmn_file: bpmnFile,
            process_id: procId,
            bpmn_id: ca.id,
            name: ca.name || ca.id,
          });
        }
      }
    }
  }

  // 3) Orphan processes (never referenced as subprocess)
  const referencedSubprocessFiles = new Set(
    mapProcesses
      .flatMap((p) => p.call_activities || [])
      .map((ca) => ca?.subprocess_bpmn_file)
      .filter((f) => typeof f === 'string'),
  );

  for (const file of files || []) {
    const bpmnFile = file.file_name;
    if (!referencedSubprocessFiles.has(bpmnFile) && bpmnFile !== 'mortgage.bpmn') {
      orphanProcesses.push({
        bpmn_file: bpmnFile,
        hint: 'Aldrig refererad som subprocess_bpmn_file i bpmn-map.json',
      });
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      unmapped_call_activities: unmappedCallActivities.length,
      call_activities_missing_in_map: callActivitiesMissingInMap.length,
      missing_subprocess_files: missingSubprocessFiles.length,
      map_inconsistencies: mapInconsistencies.length,
      orphan_processes: orphanProcesses.length,
    },
    unmapped_call_activities: unmappedCallActivities,
    call_activities_missing_in_map: callActivitiesMissingInMap,
    missing_subprocess_files: missingSubprocessFiles,
    map_inconsistencies: mapInconsistencies,
    orphan_processes: orphanProcesses,
  };

  const reportPath = resolve(__dirname, '../bpmn-map-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('[validate-bpmn-map] Summary:', report.summary);
  console.log(`[validate-bpmn-map] Wrote detailed report to ${reportPath}`);
}

validateBpmnMap().catch((err) => {
  console.error('Unexpected error while validating BPMN map:', err);
  process.exit(1);
});
