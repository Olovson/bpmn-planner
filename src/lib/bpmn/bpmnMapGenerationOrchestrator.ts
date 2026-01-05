import type { BpmnMap, BpmnMapProcess, BpmnMapCallActivity } from './bpmnMapLoader';
import { loadBpmnMapFromStorage, saveBpmnMapToStorage } from './bpmnMapStorage';
import { generateBpmnMapFromFiles } from './bpmnMapAutoGenerator';
import { refineBpmnMapWithLlm } from './bpmnMapLlmRefinement';

export type BpmnMapMergeSource = 'storage' | 'project' | 'created' | 'none';

export interface BpmnMapGenerationOptions {
  /**
   * Om true körs LLM‑refinementsteget efter heuristiken.
   * Överstyr `noLlm` om båda sätts.
   */
  useLlm?: boolean;
  /**
   * Om true hoppar vi över allt LLM‑relaterat även om useLlm är satt.
   */
  noLlm?: boolean;
  /**
   * Om true skrivs ingen map till storage – endast rapport returneras.
   */
  preview?: boolean;
  /**
   * Om true får befintlig bpmn-map.json i storage overwrite:as.
   * Bör bara användas från explicita adminflöden/CLI.
   */
  forceOverwrite?: boolean;
  /**
   * Om true försöker vi även trigga GitHub‑sync (via befintlig edge‑funktion).
   * Ignoreras om preview är true.
   */
  syncToGitHub?: boolean;
}

export interface BpmnMapConflict {
  bpmn_file: string;
  process_id: string;
  bpmn_id: string;
  previous_subprocess_bpmn_file: string | null;
  heuristic_subprocess_bpmn_file: string | null;
}

export interface BpmnMapMergeStats {
  totalCallActivities: number;
  fromExisting: number;
  fromHeuristic: number;
  manualLocked: number;
  conflicts: number;
}

export interface BpmnMapGenerationReport {
  previousMap: BpmnMap | null;
  heuristicMap: BpmnMap;
  mergedMap: BpmnMap;
  source: BpmnMapMergeSource;
  stats: BpmnMapMergeStats;
  conflicts: BpmnMapConflict[];
  saved: boolean;
  githubSynced?: boolean;
}

type CallActivityKey = string;

function makeCallActivityKey(proc: BpmnMapProcess, ca: BpmnMapCallActivity): CallActivityKey {
  return `${proc.bpmn_file}::${proc.process_id}::${ca.bpmn_id}`;
}

/**
 * Slå ihop befintlig map (om någon) med heuristiskt genererad map enligt
 * designens merge‑regler:
 * - source='manual' vinner alltid
 * - nya entries får source='heuristic'
 */
export function mergeBpmnMaps(
  existingMap: BpmnMap | null,
  heuristicMap: BpmnMap,
): { merged: BpmnMap; stats: BpmnMapMergeStats; conflicts: BpmnMapConflict[] } {
  const mergedProcesses: BpmnMapProcess[] = [];
  const conflicts: BpmnMapConflict[] = [];

  const existingByKey = new Map<CallActivityKey, { proc: BpmnMapProcess; ca: BpmnMapCallActivity }>();

  if (existingMap) {
    for (const proc of existingMap.processes) {
      for (const ca of proc.call_activities || []) {
        existingByKey.set(makeCallActivityKey(proc, ca), { proc, ca });
      }
    }
  }

  let totalCallActivities = 0;
  let fromExisting = 0;
  let fromHeuristic = 0;
  let manualLocked = 0;
  let conflictsCount = 0;

  for (const heuristicProc of heuristicMap.processes) {
    const mergedProc: BpmnMapProcess = {
      id: heuristicProc.id,
      alias: (heuristicProc as any).alias,
      bpmn_file: heuristicProc.bpmn_file,
      process_id: heuristicProc.process_id,
      description: (heuristicProc as any).description,
      call_activities: [],
    };

    for (const heuristicCa of heuristicProc.call_activities || []) {
      totalCallActivities++;
      const key = makeCallActivityKey(heuristicProc, heuristicCa);
      const existingEntry = existingByKey.get(key);

      if (!existingEntry) {
        // Ny entry – använd heuristikens värden
        mergedProc.call_activities.push({
          ...heuristicCa,
          source: heuristicCa.source ?? 'heuristic',
        });
        fromHeuristic++;
        continue;
      }

      const existingCa = existingEntry.ca;
      const existingSource = existingCa.source ?? 'manual';

      if (existingSource === 'manual') {
        // Manuell mappning vinner alltid – behåll den, men flagga konflikt om heuristiken föreslår annat
        mergedProc.call_activities.push(existingCa);
        manualLocked++;

        const prevFile = existingCa.subprocess_bpmn_file ?? null;
        const newFile = heuristicCa.subprocess_bpmn_file ?? null;
        if (newFile && prevFile && newFile !== prevFile) {
          conflicts.push({
            bpmn_file: heuristicProc.bpmn_file,
            process_id: heuristicProc.process_id,
            bpmn_id: heuristicCa.bpmn_id,
            previous_subprocess_bpmn_file: prevFile,
            heuristic_subprocess_bpmn_file: newFile,
          });
          conflictsCount++;
        }
      } else {
        // Existerande heuristik/LLM kan uppdateras av ny heuristik
        mergedProc.call_activities.push({
          ...existingCa,
          subprocess_bpmn_file:
            heuristicCa.subprocess_bpmn_file ?? existingCa.subprocess_bpmn_file,
          needs_manual_review:
            heuristicCa.needs_manual_review ?? existingCa.needs_manual_review,
          match_status: (heuristicCa as any).match_status ?? existingCa.match_status,
          source: existingCa.source ?? heuristicCa.source ?? 'heuristic',
        });
      }

      fromExisting++;
    }

    mergedProcesses.push(mergedProc);
  }

  const merged: BpmnMap = {
    orchestration: {
      root_process:
        heuristicMap.orchestration?.root_process ??
        existingMap?.orchestration?.root_process ??
        null,
    },
    processes: mergedProcesses,
  };

  return {
    merged,
    stats: {
      totalCallActivities,
      fromExisting,
      fromHeuristic,
      manualLocked,
      conflicts: conflictsCount,
    },
    conflicts,
  };
}

/**
 * Huvudorchestrator – används från UI/tests/CLI.
 * Hanterar:
 * - befintlig map (om någon)
 * - heuristisk generering
 * - merge‑regler
 * - ev. LLM‑refinement (stub, styrt av flaggor)
 * - ev. persistens (preview vs force)
 */
export async function generateAndMaybeSaveBpmnMap(
  options: BpmnMapGenerationOptions = {},
): Promise<BpmnMapGenerationReport> {
  const { useLlm, noLlm, preview, forceOverwrite, syncToGitHub } = options;

  // 1. Ladda befintlig map från storage/projekt
  const existingResult = await loadBpmnMapFromStorage();
  const existingMap = existingResult.valid && existingResult.map ? existingResult.map : null;
  const source: BpmnMapMergeSource = existingResult.valid
    ? existingResult.source
    : 'none';

  // 2. Kör heuristisk generator
  const heuristicMap = await generateBpmnMapFromFiles();

  // 3. Merge enligt reglerna
  const { merged, stats, conflicts } = mergeBpmnMaps(existingMap, heuristicMap);

  // 4. Ev. LLM‑refinement (kan vara stub/ingen‑op initialt)
  let finalMap = merged;
  const shouldUseLlm = !noLlm && !!useLlm;
  if (shouldUseLlm) {
    finalMap = await refineBpmnMapWithLlm(finalMap);
  }

  // 5. Persistens (preview vs force overwrite)
  let saved = false;
  let githubSynced: boolean | undefined;

  if (!preview) {
    if (forceOverwrite) {
      const saveResult = await saveBpmnMapToStorage(finalMap, !!syncToGitHub);
      saved = saveResult.success;
      githubSynced = saveResult.githubSynced;
    } else {
      // Ingen overwrite – spara ingenting, agera som "preview only"
      saved = false;
    }
  }

  return {
    previousMap: existingMap,
    heuristicMap,
    mergedMap: finalMap,
    source,
    stats,
    conflicts,
    saved,
    githubSynced,
  };
}

