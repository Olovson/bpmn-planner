import type { BpmnMeta } from '@/types/bpmnMeta';
import type { ProcessDefinition } from '@/lib/bpmn/types';

export type ProcessRegistryEntry = {
  fileName: string;
  storagePath?: string | null;
  meta?: BpmnMeta | null;
};

/**
 * Normalize BPMN process metadata (from Supabase-stored BpmnMeta) into the shared
 * ProcessDefinition shape that all hierarchy/matcher logic expects.
 */
export function collectProcessDefinitionsFromMeta(
  fileName: string,
  meta?: BpmnMeta | null,
  storagePath?: string | null,
): ProcessDefinition[] {
  const processes: ProcessDefinition[] = [];

  if (meta.processes && meta.processes.length > 0) {
    for (const proc of meta.processes) {
      if (!proc?.id) continue;
      processes.push({
        id: proc.id,
        name: proc.name,
        fileName,
        storagePath: storagePath ?? undefined,
        callActivities:
          proc.callActivities?.map((ca) => ({
            id: ca.id,
            name: ca.name,
            calledElement: ca.calledElement ?? undefined,
          })) ?? [],
        tasks:
          proc.tasks?.map((task) => ({
            id: task.id,
            name: task.name,
            type: task.type,
          })) ?? [],
        parseDiagnostics: proc.parseDiagnostics,
      });
    }
  }

  if (processes.length === 0) {
    const fallbackId = meta.processId || `${fileName}#process`;
    processes.push({
      id: fallbackId,
      name: meta.name || fallbackId,
      fileName,
      storagePath: storagePath ?? undefined,
      callActivities: (meta.callActivities ?? []).map((ca) => ({
        id: ca.id,
        name: ca.name,
        calledElement: ca.calledElement ?? undefined,
      })),
      tasks: (meta.tasks ?? []).map((task) => ({
        id: task.id,
        name: task.name,
        type: task.type,
      })),
      parseDiagnostics: [],
    });
  }

  if (processes.length === 0) {
    processes.push({
      id: `${fileName}#process`,
      name: meta?.name || fileName.replace('.bpmn', ''),
      fileName,
      storagePath: storagePath ?? undefined,
      callActivities:
        meta?.callActivities?.map((ca) => ({
          id: ca.id,
          name: ca.name,
          calledElement: ca.calledElement ?? undefined,
        })) ?? [],
      tasks:
        meta?.tasks?.map((task) => ({
          id: task.id,
          name: task.name,
          type: task.type,
        })) ?? [],
      parseDiagnostics: [],
    });
  }

  return processes;
}

export function buildProcessDefinitionsFromRegistry(
  registry: ProcessRegistryEntry[],
): ProcessDefinition[] {
  return registry.flatMap((entry) =>
    collectProcessDefinitionsFromMeta(entry.fileName, entry.meta, entry.storagePath),
  );
}

