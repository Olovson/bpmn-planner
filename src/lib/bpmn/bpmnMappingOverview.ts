import type { BpmnMap } from './bpmnMapLoader';
import type { BpmnMeta } from '@/types/bpmnMeta';
import { collectProcessDefinitionsFromMeta } from './processDefinition';

export type BpmnMappingStatus = 'ok' | 'unclear' | 'missing';

export interface BpmnMappingRow {
  id: string;
  bpmnFile: string;
  processId: string;
  processName?: string;
  callActivityId: string;
  callActivityName?: string;
  calledElement?: string;
  subprocessFile: string | null;
  status: BpmnMappingStatus;
  source?: string;
  matchStatus?: string;
}

export interface BpmnMappingOverviewResult {
  rows: BpmnMappingRow[];
  summary: {
    total: number;
    ok: number;
    unclearOrMissing: number;
  };
  subprocessCandidates: string[];
}

interface FileEntry {
  file_name: string;
  meta: BpmnMeta | null;
  storage_path?: string | null;
}

/**
 * Build a flat overview of all callActivities and their mapping status,
 * based on current bpmn-map.json and BPMN metadata.
 */
export function buildBpmnMappingOverview(
  map: BpmnMap,
  files: FileEntry[],
): BpmnMappingOverviewResult {
  const rows: BpmnMappingRow[] = [];

  const existingBpmnFiles = new Set(files.map((f) => f.file_name));

  const processesByKey = new Map<string, (typeof map.processes)[number]>();
  for (const proc of map.processes) {
    const key = `${proc.bpmn_file}::${proc.process_id}`;
    processesByKey.set(key, proc);
  }

  const subprocessCandidates = Array.from(
    new Set(map.processes.map((p) => p.bpmn_file)),
  ).sort();

  for (const file of files) {
    if (!file.meta) continue;

    const defs = collectProcessDefinitionsFromMeta(
      file.file_name,
      file.meta,
      file.storage_path ?? undefined,
    );

    for (const def of defs) {
      const key = `${def.fileName}::${def.id}`;
      const procFromMap = processesByKey.get(key);
      const callActivitiesFromMap = procFromMap?.call_activities ?? [];

      for (const ca of def.callActivities) {
        const mapped = callActivitiesFromMap.find(
          (entry) => entry.bpmn_id === ca.id,
        );

        const subprocessFile = (mapped as any)?.subprocess_bpmn_file ?? null;
        const hasSubprocess = !!subprocessFile;
        const subprocessExists =
          !subprocessFile || existingBpmnFiles.has(subprocessFile);

        let status: BpmnMappingStatus;
        if (!mapped || !hasSubprocess) {
          // Ingen mappning alls till subprocess-fil
          status = 'missing';
        } else if (!subprocessExists) {
          // Mappning pekar på en fil som inte finns i registret – behandla som problem
          status = 'missing';
        } else if (
          (mapped as any).needs_manual_review ||
          ((mapped as any).match_status &&
            (mapped as any).match_status !== 'matched')
        ) {
          status = 'unclear';
        } else {
          status = 'ok';
        }

        rows.push({
          id: `${def.fileName}::${def.id}::${ca.id}`,
          bpmnFile: def.fileName,
          processId: def.id,
          processName: def.name,
          callActivityId: ca.id,
          callActivityName: ca.name,
          calledElement: ca.calledElement,
          subprocessFile,
          status,
          source: (mapped as any)?.source,
          matchStatus: (mapped as any)?.match_status,
        });
      }
    }
  }

  rows.sort((a, b) => {
    if (a.bpmnFile !== b.bpmnFile) {
      return a.bpmnFile.localeCompare(b.bpmnFile);
    }
    if (a.processId !== b.processId) {
      return a.processId.localeCompare(b.processId);
    }
    return a.callActivityId.localeCompare(b.callActivityId);
  });

  const total = rows.length;
  const ok = rows.filter((r) => r.status === 'ok').length;
  const unclearOrMissing = total - ok;

  return {
    rows,
    summary: {
      total,
      ok,
      unclearOrMissing,
    },
    subprocessCandidates,
  };
}
