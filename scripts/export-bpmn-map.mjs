import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local env (same pattern as seed scripts)
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

async function exportBpmnMap() {
  console.log('[export-bpmn-map] Fetching BPMN files and dependencies...');

  const { data: files, error: filesError } = await supabase
    .from('bpmn_files')
    .select('file_name, meta')
    .eq('file_type', 'bpmn')
    .order('file_name', { ascending: true });

  if (filesError) {
    console.error('Failed to fetch bpmn_files:', filesError.message);
    process.exit(1);
  }

  const { data: deps, error: depsError } = await supabase
    .from('bpmn_dependencies')
    .select('parent_file, child_process, child_file');

  if (depsError) {
    console.error('Failed to fetch bpmn_dependencies:', depsError.message);
    process.exit(1);
  }

  const dependencies = deps || [];

  // Build a quick lookup: parent_file + child_process -> child_file
  const depMap = new Map();
  for (const dep of dependencies) {
    if (!dep.parent_file || !dep.child_process) continue;
    const key = `${dep.parent_file}::${dep.child_process}`;
    depMap.set(key, dep.child_file || null);
  }

  const processes = [];

  for (const file of files || []) {
    const meta = file.meta || {};
    const fileName = file.file_name;

    const processEntries = Array.isArray(meta.processes) && meta.processes.length > 0
      ? meta.processes
      : [{
          id: meta.processId || `${fileName}#process`,
          name: meta.name || humanizeId(fileName),
          callActivities: meta.callActivities || [],
        }];

    for (const proc of processEntries) {
      if (!proc || !proc.id) continue;

      const callActivities = (proc.callActivities || []).map((ca) => {
        const key = `${fileName}::${ca.id}`;
        const mappedFile = depMap.get(key) || null;
        return {
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: ca.calledElement || null,
          subprocess_bpmn_file: mappedFile,
        };
      });

      processes.push({
        id: proc.id,
        alias: humanizeId(proc.id),
        bpmn_file: fileName,
        process_id: proc.id,
        description: meta.name || humanizeId(fileName),
        call_activities: callActivities,
      });
    }
  }

  const orchestration = {
    root_process: processes.find((p) => p.bpmn_file === 'mortgage.bpmn')?.id || null,
  };

  const mapObject = {
    generated_at: new Date().toISOString(),
    note: 'Initial BPMN map exported from Supabase (bpmn_files + bpmn_dependencies). Review and edit manually.',
    orchestration,
    processes,
  };

  const outputPath = resolve(__dirname, '../bpmn-map.json');
  writeFileSync(outputPath, JSON.stringify(mapObject, null, 2), 'utf-8');
  console.log(`[export-bpmn-map] Wrote ${processes.length} process entries to ${outputPath}`);
}

exportBpmnMap().catch((err) => {
  console.error('Unexpected error while exporting BPMN map:', err);
  process.exit(1);
});

