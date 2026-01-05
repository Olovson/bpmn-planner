import type { BpmnMap } from './bpmnMapLoader';
import { loadBpmnMap } from './bpmnMapLoader';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { buildBpmnProcessGraphFromParseResults } from '@/lib/bpmnProcessGraph';

export interface BpmnMapValidationOptions {
  /**
   * Kontrollera att alla refererade BPMN-filer finns (via parseBpmnFile).
   */
  checkFiles?: boolean;
  /**
   * Bygg graf från mapen och returnera grafinfo/missingDependencies.
   */
  buildGraph?: boolean;
  /**
   * Root-fil att använda när grafen byggs. Om inte satt används heuristik:
   * - orchestration.root_process tolkat som filnamn, annars
   * - första processens bpmn_file.
   */
  rootFile?: string;
}

export interface BpmnMapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  graphStats?: {
    rootFound: boolean;
    missingDependencies: { parent: string; childProcess: string }[];
    processCount: number;
  };
}

export async function validateBpmnMap(
  map: BpmnMap,
  options: BpmnMapValidationOptions = {},
): Promise<BpmnMapValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basvalidering via loadBpmnMap (strukturell)
  try {
    loadBpmnMap(map as unknown as BpmnMap);
  } catch (err) {
    errors.push(
      `Strukturvalidering misslyckades: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return { valid: false, errors, warnings };
  }

  // Kontrollera root-process mot mapens processer
  const rootProcessId = map.orchestration?.root_process ?? null;
  if (rootProcessId) {
    const hasRootProcess = map.processes.some(
      (p) =>
        p.id === rootProcessId ||
        p.process_id === rootProcessId ||
        p.bpmn_file === rootProcessId ||
        p.bpmn_file === `${rootProcessId}.bpmn`,
    );
    if (!hasRootProcess) {
      warnings.push(
        `Orchestration.root_process="${rootProcessId}" hittades inte bland processerna i mappen.`,
      );
    }
  } else {
    warnings.push(
      'Orchestration.root_process saknas – grafbygge kommer använda heuristisk root.',
    );
  }

  // checkFiles: verifiera att alla subprocess_bpmn_file verkar rimliga
  if (options.checkFiles) {
    const referencedFiles = new Set<string>();

    for (const proc of map.processes) {
      for (const ca of proc.call_activities || []) {
        if (ca.subprocess_bpmn_file) {
          referencedFiles.add(ca.subprocess_bpmn_file);
        }
      }
    }

    const missingReferencedFiles: string[] = [];
    for (const fileName of referencedFiles) {
      try {
        // parseBpmnFile använder samma mekanism som resten av systemet (Storage / /bpmn/).
        await parseBpmnFile(`/bpmn/${fileName}`);
      } catch {
        missingReferencedFiles.push(fileName);
      }
    }

    if (missingReferencedFiles.length > 0) {
      errors.push(
        `Mapen refererar subprocess_bpmn_file som inte kunde laddas: ${missingReferencedFiles.join(
          ', ',
        )}`,
      );
    }
  }

  // buildGraph: bygg faktisk graf och kolla missingDependencies
  let graphStats: BpmnMapValidationResult['graphStats'];
  if (options.buildGraph) {
    // Bygg parseResults map via parseBpmnFile för alla filer i mapen
    const parseResults = new Map<string, any>();
    for (const proc of map.processes) {
      const fileName = proc.bpmn_file;
      if (parseResults.has(fileName)) continue;
      try {
        const result = await parseBpmnFile(`/bpmn/${fileName}`);
        parseResults.set(fileName, result);
      } catch (err) {
        errors.push(
          `Kunde inte parsa BPMN-fil "${fileName}" vid grafvalidering: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (parseResults.size === 0) {
      errors.push(
        'Inga BPMN-filer kunde parsas för grafvalidering – kontrollera att bpmn_files finns tillgängliga.',
      );
    } else {
      const preferredRootFile =
        options.rootFile ??
        map.processes[0]?.bpmn_file ??
        'mortgage-se-application.bpmn';

      try {
        const graph = await buildBpmnProcessGraphFromParseResults(
          preferredRootFile,
          parseResults,
          map,
        );

        const missingDependencies = graph.missingDependencies || [];

        if (missingDependencies.length > 0) {
          const depsAsText = missingDependencies.map(
            (d) => `${d.parent} -> ${d.childProcess}`,
          );
          errors.push(
            `Grafvalidering: missingDependencies rapporterades: ${depsAsText.join(
              ', ',
            )}`,
          );
        }

        graphStats = {
          rootFound: !!graph.root,
          missingDependencies,
          processCount: graph.fileNodes.size,
        };
      } catch (err) {
        errors.push(
          `Grafvalidering misslyckades: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    graphStats,
  };
}

